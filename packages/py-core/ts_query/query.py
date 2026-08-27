"""Port of packages/core/src/query.ts.

Two deliberate deviations from the TypeScript, both noted inline:

1. ``fetch()`` is a *synchronous* method returning an awaitable, not an ``async
   def``. That is what preserves the TS guarantee: the dedup check and the
   ``loading`` transition happen before the caller can yield to the event loop,
   so two ``query.fetch()`` calls in the same tick share one fetch.
2. The L2 write is awaited rather than fire-and-forget. A detached task can be
   dropped when an ASGI worker finishes a request, which would silently lose the
   cache fill.
"""

from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Any, Callable, Dict, Optional, Union

from .keys import dumps
from .normalized_cache import NormalizedCache
from .single_flight import CACHE_MISS, DistributedSingleFlight
from .subject import BehaviorSubject, Observer, Subscription
from .types import (
    UNDEFINED,
    QueryOptions,
    QueryState,
    SharedCacheAdapter,
    _merge_state,
    create_initial_query_state,
)

logger = logging.getLogger("ts_query.query")


@dataclass
class SharedCacheContext:
    """Context for shared cache (L2) operations, passed from QueryClient."""

    adapter: SharedCacheAdapter
    key: str
    ttl_ms: int
    single_flight: Optional[DistributedSingleFlight] = None


@dataclass
class NormalizedCacheContext:
    """Context for normalized cache operations, passed from QueryClient."""

    cache: NormalizedCache
    #: The serialized query key used as the identity within the normalized cache.
    key: str


class Query:
    # ##############################
    # Fields
    # ##############################

    def __init__(
        self,
        options: QueryOptions,
        on_garbage_collection: Optional[Callable[[], None]] = None,
        shared_cache_context: Optional[SharedCacheContext] = None,
        normalized_cache_context: Optional[NormalizedCacheContext] = None,
    ) -> None:
        self._options = options
        self._on_garbage_collection = on_garbage_collection
        self._shared = shared_cache_context
        self._normalized = normalized_cache_context

        self._state: BehaviorSubject[QueryState] = BehaviorSubject(create_initial_query_state())
        self._stale_timeout: Optional[asyncio.TimerHandle] = None
        self._cache_timeout: Optional[asyncio.TimerHandle] = None
        self._retry_count = 0
        self._current_fetch: Optional[asyncio.Future] = None
        self._skip_shared_cache_on_next_fetch = False
        self._normalized_shape: Any = None
        self._subscriber_count = 0
        self._destroyed = False

    # ##############################
    # Public API
    # ##############################

    @property
    def state(self) -> QueryState:
        return self._state.value

    @property
    def state_observable(self) -> BehaviorSubject:
        return self._state

    @property
    def subscriber_count(self) -> int:
        return self._subscriber_count

    def subscribe(
        self, observer_or_callback: Union[Observer, Callable[[QueryState], None], Dict[str, Any]]
    ) -> Callable[[], None]:
        # While there is at least one subscriber the query is "in use", so any
        # pending garbage-collection timer is cleared.
        is_first_subscriber = self._subscriber_count == 0
        self._subscriber_count += 1
        self._clear_cache_timeout()

        # Subscribe first so the observer gets the current state.
        subscription: Subscription = self._state.subscribe(observer_or_callback)

        # Auto-fetch on the first subscriber only. This check and the state
        # transition inside fetch() both run without an await, so a second
        # subscriber in the same tick cannot also see 'idle'.
        if is_first_subscriber and self.state.status == "idle" and self._options.enabled:
            self.fetch()

        def unsubscribe() -> None:
            # Guarded: a second call must not drive the count negative and
            # suppress garbage collection forever. Cleanup paths double-fire
            # more readily here than in the TS adapters.
            if subscription.closed:
                return
            subscription.unsubscribe()
            self._subscriber_count -= 1

            # When the last subscriber leaves, (re)schedule garbage collection so
            # the query is collected once it is truly unused.
            if self._subscriber_count == 0:
                self._schedule_garbage_collection()

        return unsubscribe

    def fetch(self) -> "asyncio.Future[Any]":
        """Start (or join) the fetch for this query.

        Synchronous by design — see the module docstring. Returns a future per
        caller so that one caller's cancellation cannot kill the shared work.
        """
        task = self._start_fetch()
        waiter = asyncio.ensure_future(_shielded(task))
        _suppress_never_retrieved(waiter)
        return waiter

    def invalidate(self) -> "asyncio.Future[Any]":
        """Invalidate the query, bypassing the L2 shared cache on refetch.

        This ensures fresh data is fetched from L3 after invalidation.
        """
        self._clear_stale_timeout()
        # Skip L2 on the next fetch to avoid the race where the delete has not
        # yet landed.
        self._skip_shared_cache_on_next_fetch = True
        return self.fetch()

    def recompute_from_normalized_cache(self) -> None:
        """Recompute state.data from the normalized shape without refetching."""
        if self._normalized and self._normalized_shape is not None:
            fresh = self._normalized.cache.denormalize(self._normalized_shape)
            if fresh is not UNDEFINED:
                self._update_state({"data": fresh})

    def destroy(self) -> None:
        self._clear_stale_timeout()
        self._clear_cache_timeout()
        self._state.complete()
        self._on_garbage_collection = None
        self._destroyed = True

    # ##############################
    # State Management
    # ##############################

    def _update_state(self, partial: Dict[str, Any]) -> None:
        self._state.next(_merge_state(self._state.value, partial))

    # ##############################
    # Fetch Lifecycle
    # ##############################

    def _start_fetch(self) -> "asyncio.Future[Any]":
        # Deduplicate in-flight fetches so multiple callers share the same
        # underlying request and retry cycle. No await between the check and the
        # assignment: the event loop cannot interleave another caller here.
        if self._current_fetch is not None and not self._current_fetch.done():
            return self._current_fetch

        # New fetch cycle: reset retry count and mark as loading/fetching.
        self._retry_count = 0
        self._update_state({"status": "loading", "is_fetching": True})

        task = asyncio.ensure_future(self._execute_fetch())
        self._current_fetch = task
        task.add_done_callback(self._on_fetch_settled)
        return task

    def _on_fetch_settled(self, task: "asyncio.Future[Any]") -> None:
        if self._current_fetch is task:
            self._current_fetch = None

    async def _execute_fetch(self) -> Any:
        # Check whether we should skip L2 (e.g. after invalidation).
        should_skip_shared_cache = self._skip_shared_cache_on_next_fetch
        self._skip_shared_cache_on_next_fetch = False

        try:
            # L2: check the shared cache first (only if configured and not skipped).
            if self._shared and not should_skip_shared_cache:
                cached_data = await self._get_from_shared_cache()
                if cached_data is not CACHE_MISS:
                    # L2 hit: populate L1 and return.
                    self._complete_fetch_success(cached_data)
                    return cached_data

            # L3: fetch from source (query_fn), coalescing across processes when
            # single-flight is enabled.
            if self._shared and self._shared.single_flight:
                data = await self._shared.single_flight.run(
                    self._shared.key,
                    self._options.query_fn,
                    read=self._get_from_shared_cache,
                    write=self._set_in_shared_cache,
                )
            else:
                data = await self._options.query_fn()
                if self._shared:
                    await self._set_in_shared_cache(data)

            # Normalize into the entity store (if configured).
            if self._normalized:
                self._normalized_shape = self._normalized.cache.normalize(
                    data, self._normalized.key
                )

            # Populate L1 (in-process cache via state).
            self._complete_fetch_success(data)
            return data

        except Exception as error:
            # Retry logic (only for L3 failures, not L2 — cache errors are
            # swallowed inside the helpers below).
            max_retries = self._options.retry
            if self._retry_count < max_retries:
                self._retry_count += 1
                delay_ms = self._options.retry_delay_ms
                if delay_ms is None:
                    delay_ms = min(1000 * 2**self._retry_count, 30000)
                await asyncio.sleep(delay_ms / 1000)
                return await self._execute_fetch()

            self._complete_fetch_error(error)
            raise

    # ####################
    # Fetch Completion
    # ####################

    def _complete_fetch_success(self, data: Any) -> None:
        self._retry_count = 0
        self._update_state(
            {"status": "success", "data": data, "error": None, "is_fetching": False}
        )

        if self._options.on_success:
            self._options.on_success(data)
        self._schedule_stale()
        self._schedule_garbage_collection()

    def _complete_fetch_error(self, err: BaseException) -> None:
        self._update_state({"status": "error", "error": err, "is_fetching": False})

        if self._options.on_error:
            self._options.on_error(err)
        self._schedule_garbage_collection()

    # ##############################
    # Shared Cache Operations (L2)
    # ##############################

    async def _get_from_shared_cache(self) -> Any:
        """Return the parsed value, or CACHE_MISS on absence, error, or bad JSON."""
        if not self._shared:
            return CACHE_MISS

        try:
            cached = await self._shared.adapter.get(self._shared.key)
        except Exception:  # noqa: BLE001 - a cache outage is a miss, not a failure
            self._log_cache_warning("Shared cache read failed")
            return CACHE_MISS

        if cached is not None:
            try:
                return json.loads(cached)
            except (ValueError, TypeError):
                self._log_cache_warning(
                    "Shared cache parse failed - cached data is malformed or corrupted"
                )
                # Fall through to L3 (source) to get fresh data.
        return CACHE_MISS

    async def _set_in_shared_cache(self, data: Any) -> None:
        """Store data in L2.

        Only JSON-serializable values are stored; anything else (circular
        references, sets, arbitrary objects) is skipped and will fall back to L3
        on the next fetch.
        """
        if not self._shared:
            return

        try:
            serialized = dumps(data)
        except (TypeError, ValueError, RecursionError):
            self._log_cache_warning(
                "Shared cache write skipped - data cannot be JSON-serialized"
            )
            return

        try:
            await self._shared.adapter.set(self._shared.key, serialized, self._shared.ttl_ms)
        except Exception:  # noqa: BLE001 - cache failures never break the query
            self._log_cache_warning("Shared cache write failed")

    def _log_cache_warning(self, message: str) -> None:
        key = self._shared.key if self._shared else "unknown"
        logger.warning("[ts-query] %s for key %r", message, key, exc_info=True)

    # ##############################
    # Timer Management
    # ##############################

    def _schedule_stale(self) -> None:
        self._clear_stale_timeout()
        stale_time_ms = self._options.stale_time_ms

        # Mark data as fresh immediately.
        self._update_state({"is_stale": False})

        if stale_time_ms > 0:
            self._stale_timeout = self._call_later(
                stale_time_ms, lambda: self._update_state({"is_stale": True})
            )
        else:
            # stale_time_ms of 0 means data is immediately stale.
            self._update_state({"is_stale": True})

    def _schedule_garbage_collection(self) -> None:
        self._clear_cache_timeout()
        self._cache_timeout = self._call_later(self._options.cache_time_ms, self._garbage_collect)

    def _garbage_collect(self) -> None:
        if self._subscriber_count == 0:
            if self._on_garbage_collection:
                self._on_garbage_collection()
            self.destroy()

    def _call_later(self, delay_ms: int, callback: Callable[[], None]) -> Optional[asyncio.TimerHandle]:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            # No loop (e.g. constructed in sync setup code): timers are a no-op
            # until the query is next touched from inside one.
            return None
        return loop.call_later(delay_ms / 1000, callback)

    def _clear_stale_timeout(self) -> None:
        if self._stale_timeout:
            self._stale_timeout.cancel()
        self._stale_timeout = None

    def _clear_cache_timeout(self) -> None:
        if self._cache_timeout:
            self._cache_timeout.cancel()
        self._cache_timeout = None


# ##############################
# Awaitable helpers
# ##############################


async def _shielded(task: "asyncio.Future[Any]") -> Any:
    """Await shared work without letting this caller's cancellation kill it."""
    return await asyncio.shield(task)


def _suppress_never_retrieved(future: "asyncio.Future[Any]") -> None:
    """Mark a future's exception retrieved so fire-and-forget calls stay quiet.

    Retrieving here does not consume it: a caller awaiting the future still sees
    the exception raised.
    """

    def _retrieve(fut: "asyncio.Future[Any]") -> None:
        if not fut.cancelled():
            fut.exception()

    future.add_done_callback(_retrieve)
