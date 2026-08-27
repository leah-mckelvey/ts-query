"""Port of packages/core/src/normalized-cache.ts.

Pure data-structure work — no async, no framework — so this translates almost
line for line. Entities are stored flat ("User:42" -> fields) and queries hold
refs, so one ``write_fragment`` updates every query that touched the entity.
"""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional, Set, Union

from .types import UNDEFINED, NormalizedCacheConfig, TypePolicy

EntityId = Union[str, int]


def _is_entity_ref(value: Any) -> bool:
    return isinstance(value, dict) and isinstance(value.get("__ref"), str)


def _is_plain_object(value: Any) -> bool:
    return isinstance(value, dict)


class NormalizedCache:
    # ##############################
    # INITIALIZATION
    # ##############################

    def __init__(self, config: Optional[NormalizedCacheConfig] = None) -> None:
        #: Flat entity store: "Type:id" -> merged fields
        self._entities: Dict[str, Dict[str, Any]] = {}
        #: Reverse index: entity ref -> query keys that reference it
        self._entity_to_queries: Dict[str, Set[str]] = {}
        #: Callbacks invoked when a specific entity changes (for use_fragment)
        self._entity_listeners: Dict[str, List[Callable[[], None]]] = {}
        self._config = config or NormalizedCacheConfig()

    # ##############################
    # PUBLIC API: SUBSCRIPTIONS
    # ##############################

    def subscribe_to_entity(
        self, typename: str, id: EntityId, callback: Callable[[], None]
    ) -> Callable[[], None]:
        """Subscribe to changes for one entity. Returns an unsubscribe callable."""
        ref = self._make_ref(typename, id)
        self._entity_listeners.setdefault(ref, []).append(callback)

        def unsubscribe() -> None:
            listeners = self._entity_listeners.get(ref)
            if listeners and callback in listeners:
                listeners.remove(callback)

        return unsubscribe

    # ##############################
    # PUBLIC API: NORMALIZATION
    # ##############################

    def normalize(self, data: Any, query_key: str) -> Any:
        """Store entities and return the normalized shape with entity refs."""
        return self._normalize_value(data, query_key)

    def denormalize(self, shape: Any) -> Any:
        """Reconstruct denormalized data from a normalized shape."""
        return self._denormalize_value(shape)

    # ##############################
    # PUBLIC API: FRAGMENT OPERATIONS
    # ##############################

    def write_fragment(self, typename: str, id: EntityId, data: Dict[str, Any]) -> List[str]:
        """Merge ``data`` into an entity; return query keys referencing it."""
        ref = self._make_ref(typename, id)
        existing = self._entities.get(ref, {})
        merged = self._merge_entity(typename, existing, data)
        self._entities[ref] = merged
        self._notify_entity_listeners(ref)
        return self._get_affected_queries(ref)

    def read_fragment(self, typename: str, id: EntityId) -> Any:
        """Read a raw entity record, or UNDEFINED when not cached."""
        return self._entities.get(self._make_ref(typename, id), UNDEFINED)

    def evict(self, typename: str, id: EntityId) -> List[str]:
        """Remove an entity; return the query keys that were referencing it."""
        ref = self._make_ref(typename, id)
        affected = self._get_affected_queries(ref)
        self._entities.pop(ref, None)
        self._entity_to_queries.pop(ref, None)
        self._notify_entity_listeners(ref)
        return affected

    # ##############################
    # INTERNAL HELPERS: ENTITY REFS
    # ##############################

    def _make_ref(self, typename: str, id: EntityId) -> str:
        return f"{typename}:{id}"

    def _get_entity_ref(self, obj: Dict[str, Any]) -> Optional[str]:
        """Derive an entity ref from __typename + key field(s), or None."""
        typename = obj.get("__typename")
        if not isinstance(typename, str):
            return None

        policy: Optional[TypePolicy] = self._config.type_policies.get(typename)
        key_fields: Union[str, Any] = (policy.key_fields if policy else None) or "id"

        if isinstance(key_fields, str):
            key_value = obj.get(key_fields)
        else:
            parts = [obj.get(f) for f in key_fields]
            if any(p is None for p in parts):
                return None
            key_value = ":".join(str(p) for p in parts)

        if key_value is None:
            return None
        return self._make_ref(typename, key_value)

    # ##############################
    # INTERNAL HELPERS: ENTITY MERGING
    # ##############################

    def _merge_entity(
        self, typename: str, existing: Dict[str, Any], incoming: Dict[str, Any]
    ) -> Dict[str, Any]:
        policy = self._config.type_policies.get(typename)
        if policy and policy.merge:
            return policy.merge(existing, incoming)
        return {**existing, **incoming}

    # ##############################
    # INTERNAL HELPERS: INDEX MANAGEMENT
    # ##############################

    def _get_affected_queries(self, ref: str) -> List[str]:
        return list(self._entity_to_queries.get(ref, ()))

    # ##############################
    # CORE LOGIC: NORMALIZATION
    # ##############################

    def _normalize_value(self, value: Any, query_key: str) -> Any:
        # Handle sequences
        if isinstance(value, (list, tuple)):
            return [self._normalize_value(item, query_key) for item in value]

        # Handle primitives and non-plain objects
        if not _is_plain_object(value):
            return value

        # Normalize nested fields
        normalized = {k: self._normalize_value(v, query_key) for k, v in value.items()}

        # Check if this object is an identifiable entity
        ref = self._get_entity_ref(value)
        if ref is None:
            # Not an identifiable entity — store inline
            return normalized

        # Store entity and build the reverse index
        existing = self._entities.get(ref, {})
        typename = value["__typename"]
        self._entities[ref] = self._merge_entity(typename, existing, normalized)
        self._entity_to_queries.setdefault(ref, set()).add(query_key)

        return {"__ref": ref}

    # ##############################
    # CORE LOGIC: DENORMALIZATION
    # ##############################

    def _denormalize_value(self, value: Any) -> Any:
        if isinstance(value, (list, tuple)):
            return [self._denormalize_value(item) for item in value]

        if not _is_plain_object(value):
            return value

        if _is_entity_ref(value):
            entity = self._entities.get(value["__ref"])
            if entity is None:
                return UNDEFINED  # entity was evicted
            return self._denormalize_value(entity)

        return {k: self._denormalize_value(v) for k, v in value.items()}

    # ##############################
    # INTERNAL HELPERS: NOTIFICATIONS
    # ##############################

    def _notify_entity_listeners(self, ref: str) -> None:
        for callback in list(self._entity_listeners.get(ref, ())):
            callback()
