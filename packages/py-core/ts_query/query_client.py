"""Port of packages/core/src/query-client.ts.

Deviation from the TypeScript: ``invalidate_queries``, ``remove_queries`` and
``clear`` are coroutines. The TS versions fire the L2 delete and forget it, which
is fine in a long-lived Node process; in an ASGI worker a detached task can be
dropped when the request finishes, leaving a stale L2 entry. Awaiting makes the
L2 side effect deterministic — and callers here are already inside async
handlers. The refetch each invalidation triggers stays fire-and-forget, as in TS.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Union

from .keys import QueryKey, serialize_query_key
from .mutation import Mutation
from .normalized_cache import EntityId, NormalizedCache
from .query import NormalizedCacheContext, Query, SharedCacheContext
from .single_flight import make_single_flight
from .types import (
    UNDEFINED,
    MutationOptions,
    QueryClientConfig,
    QueryOptions,
)


class QueryClient:
    # ##############################
    # Initialization
    # ##############################

    def __init__(self, config: Optional[QueryClientConfig] = None) -> None:
        self._queries: Dict[str, Query] = {}
        self._shared_cache_config = config.shared_cache if config else None
        self._normalized_cache: Optional[NormalizedCache] = None
        self._single_flight = (
            make_single_flight(self._shared_cache_config) if self._shared_cache_config else None
        )

        if config and config.normalized_cache is not None:
            self._normalized_cache = NormalizedCache(config.normalized_cache)

    # ##############################
    # Query Management
    # ##############################

    def _get_query_key(self, key: QueryKey) -> str:
        return serialize_query_key(key)

    def get_query(self, options: QueryOptions) -> Query:
        key = self._get_query_key(options.query_key)

        query = self._queries.get(key)
        if query is not None:
            return query

        # TTL precedence: query-level override > client-level default.
        shared_cache_ttl_ms = options.shared_cache_ttl_ms
        if shared_cache_ttl_ms is None:
            shared_cache_ttl_ms = (
                self._shared_cache_config.default_ttl_ms if self._shared_cache_config else 0
            )

        shared_context: Optional[SharedCacheContext] = None
        if self._shared_cache_config and not options.skip_shared_cache:
            shared_context = SharedCacheContext(
                adapter=self._shared_cache_config.adapter,
                key=key,
                ttl_ms=shared_cache_ttl_ms,
                single_flight=self._single_flight,
            )

        normalized_context: Optional[NormalizedCacheContext] = None
        if self._normalized_cache is not None:
            normalized_context = NormalizedCacheContext(cache=self._normalized_cache, key=key)

        def on_garbage_collection() -> None:
            # Only remove if this is still the active instance for this key.
            if self._queries.get(key) is query:
                del self._queries[key]

        query = Query(options, on_garbage_collection, shared_context, normalized_context)
        self._queries[key] = query
        return query

    # ####################
    # Query Operations
    # ####################

    async def invalidate_queries(self, query_key: Optional[QueryKey] = None) -> None:
        """Invalidate one query or all of them, clearing L2 for a named key."""
        if query_key is not None:
            key = self._get_query_key(query_key)
            query = self._queries.get(key)
            if query is not None:
                query.invalidate()
            await self._delete_from_shared_cache(key)
        else:
            for query in list(self._queries.values()):
                query.invalidate()
        # We intentionally do NOT clear the whole shared cache (L2) when
        # query_key is None because:
        # 1. The shared cache may be used by several QueryClients across processes.
        # 2. A "clear all" from one client could evict data other clients rely on.
        # 3. Each Query's invalidate() already skips L2 on refetch.
        # Global L2 eviction should go through the adapter directly.

    async def remove_queries(self, query_key: Optional[QueryKey] = None) -> None:
        if query_key is not None:
            key = self._get_query_key(query_key)
            query = self._queries.get(key)
            if query is not None:
                query.destroy()
                del self._queries[key]
            await self._delete_from_shared_cache(key)
        else:
            for query in list(self._queries.values()):
                query.destroy()
            self._queries.clear()

    async def _delete_from_shared_cache(self, key: str) -> None:
        if not self._shared_cache_config:
            return
        try:
            await self._shared_cache_config.adapter.delete(key)
        except Exception:  # noqa: BLE001 - matches the swallowed .catch() in TS
            pass

    # ##############################
    # Normalized Cache Operations
    # ##############################

    def _notify_affected_queries(
        self, affected_keys: List[str], notify: Callable[[Query], None]
    ) -> None:
        for key in affected_keys:
            query = self._queries.get(key)
            if query is not None:
                notify(query)

    # ####################
    # Fragment API
    # ####################

    def write_fragment(self, typename: str, id: EntityId, data: Dict[str, Any]) -> None:
        """Update an entity and push the new data to every subscribed query that
        referenced it — no refetch.

        Requires the client to be configured with ``normalized_cache``.
        """
        if self._normalized_cache is None:
            return

        affected_keys = self._normalized_cache.write_fragment(typename, id, data)
        self._notify_affected_queries(
            affected_keys, lambda query: query.recompute_from_normalized_cache()
        )

    def read_fragment(self, typename: str, id: EntityId) -> Any:
        """Read a raw entity record; UNDEFINED when absent or not configured."""
        if self._normalized_cache is None:
            return UNDEFINED
        return self._normalized_cache.read_fragment(typename, id)

    def subscribe_fragment(
        self, typename: str, id: EntityId, callback: Callable[[], None]
    ) -> Callable[[], None]:
        """Subscribe to one entity's changes. Returns an unsubscribe callable."""
        if self._normalized_cache is None:
            return lambda: None
        return self._normalized_cache.subscribe_to_entity(typename, id, callback)

    # ####################
    # Cache Eviction
    # ####################

    def evict(self, typename: str, id: EntityId) -> None:
        """Remove an entity and invalidate every query that referenced it."""
        if self._normalized_cache is None:
            return
        affected_keys = self._normalized_cache.evict(typename, id)
        self._notify_affected_queries(affected_keys, lambda query: query.invalidate())

    # ##############################
    # Mutation Management
    # ##############################

    def create_mutation(self, options: MutationOptions) -> Mutation:
        return Mutation(options)

    # ##############################
    # Cache Clearing
    # ##############################

    async def clear(self) -> None:
        """Clear L1, and L2 too when the adapter supports it."""
        await self.remove_queries()

        adapter = self._shared_cache_config.adapter if self._shared_cache_config else None
        clear = getattr(adapter, "clear", None)
        if clear is not None:
            try:
                await clear()
            except Exception:  # noqa: BLE001 - silently ignore L2 clear errors
                pass
