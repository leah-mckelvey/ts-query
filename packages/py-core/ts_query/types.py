"""Port of packages/core/src/types.ts.

Field names are snake_case and every duration is suffixed ``_ms`` so the
TypeScript millisecond semantics survive the translation unambiguously.
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from typing import (
    Any,
    Awaitable,
    Callable,
    Dict,
    List,
    Literal,
    Optional,
    Protocol,
    Sequence,
    Union,
    runtime_checkable,
)

from .keys import QueryKey

# #######################################
# FOUNDATIONAL TYPES
# #######################################

QueryStatus = Literal["idle", "loading", "success", "error"]

#: Sentinel distinguishing "no data" from a legitimately cached ``None``.
#: The TS core uses ``undefined`` for this; Python has only ``None``.
class _Undefined:
    _instance: Optional["_Undefined"] = None

    def __new__(cls) -> "_Undefined":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return "UNDEFINED"

    def __bool__(self) -> bool:
        return False


UNDEFINED = _Undefined()


# #######################################
# OPERATION STATE SYSTEM
# #######################################


@dataclass(frozen=True)
class QueryState:
    """core + derived flags + query-specific extensions."""

    status: QueryStatus = "idle"
    data: Any = UNDEFINED
    error: Optional[BaseException] = None
    is_loading: bool = False
    is_success: bool = False
    is_error: bool = False
    is_fetching: bool = False
    is_stale: bool = False


@dataclass(frozen=True)
class MutationState:
    """core + derived flags (no query-specific extensions)."""

    status: QueryStatus = "idle"
    data: Any = UNDEFINED
    error: Optional[BaseException] = None
    is_loading: bool = False
    is_success: bool = False
    is_error: bool = False


def derive_status_flags(status: QueryStatus) -> Dict[str, bool]:
    """Single source of truth for the status -> booleans relationship."""
    return {
        "is_loading": status == "loading",
        "is_success": status == "success",
        "is_error": status == "error",
    }


def create_initial_query_state() -> QueryState:
    return QueryState(status="idle", data=UNDEFINED, error=None, **derive_status_flags("idle"))


def create_initial_mutation_state() -> MutationState:
    return MutationState(status="idle", data=UNDEFINED, error=None, **derive_status_flags("idle"))


def _merge_state(state: Any, partial: Dict[str, Any]) -> Any:
    """Apply a partial update, re-deriving the status flags (see updateState)."""
    new_status = partial.get("status", state.status)
    return replace(state, **{**partial, "status": new_status, **derive_status_flags(new_status)})


# #######################################
# CACHING SYSTEM
# #######################################


@runtime_checkable
class SharedCacheAdapter(Protocol):
    """L2 backend (Redis, Memcached, ...) in the L1 -> L2 -> L3 hierarchy."""

    async def get(self, key: str) -> Optional[str]:
        """Return the cached value, or None when absent."""
        ...

    async def set(self, key: str, value: str, ttl_ms: int) -> None:
        """Store a value with a TTL in milliseconds."""
        ...

    async def delete(self, key: str) -> None:
        """Remove a value."""
        ...

    # ``clear`` is optional, mirroring the optional method in the TS interface.


@dataclass
class SharedCacheConfig:
    adapter: SharedCacheAdapter
    #: Default TTL for shared cache entries in milliseconds. Defaults to 5 minutes.
    default_ttl_ms: int = 5 * 60 * 1000
    #: Coordinate L3 calls across *processes* via the adapter, not just within
    #: one event loop. See single_flight.py for why Python needs this and Node
    #: does not.
    single_flight: bool = False
    #: How long a waiter will wait for the lock holder before doing the work
    #: itself. Guards against a holder that crashed mid-fetch.
    single_flight_wait_ms: int = 5000


MergeFn = Callable[[Dict[str, Any], Dict[str, Any]], Dict[str, Any]]


@dataclass
class TypePolicy:
    """Per-type normalization policy for the normalized cache."""

    #: Field name(s) used to derive the entity's cache key. Defaults to ``id``.
    key_fields: Optional[Union[str, Sequence[str]]] = None
    #: Custom merge for this type; shallow merge when omitted.
    merge: Optional[MergeFn] = None


@dataclass
class NormalizedCacheConfig:
    type_policies: Dict[str, TypePolicy] = field(default_factory=dict)


@dataclass
class QueryClientConfig:
    shared_cache: Optional[SharedCacheConfig] = None
    normalized_cache: Optional[NormalizedCacheConfig] = None


# #######################################
# OPERATION OPTIONS
# #######################################


@dataclass
class QueryOptions:
    query_key: QueryKey
    query_fn: Callable[[], Awaitable[Any]]
    stale_time_ms: int = 0
    cache_time_ms: int = 5 * 60 * 1000
    #: TTL for shared cache (L2). Overrides the client-level default.
    shared_cache_ttl_ms: Optional[int] = None
    skip_shared_cache: bool = False
    retry: int = 3
    retry_delay_ms: Optional[int] = None
    enabled: bool = True
    on_success: Optional[Callable[[Any], None]] = None
    on_error: Optional[Callable[[BaseException], None]] = None


@dataclass
class MutationOptions:
    mutation_fn: Callable[[Any], Awaitable[Any]]
    on_success: Optional[Callable[[Any, Any], None]] = None
    on_error: Optional[Callable[[BaseException, Any], None]] = None
    on_settled: Optional[Callable[[Any, Optional[BaseException], Any], None]] = None


__all__: List[str] = [
    "QueryKey",
    "QueryStatus",
    "QueryState",
    "MutationState",
    "UNDEFINED",
    "derive_status_flags",
    "create_initial_query_state",
    "create_initial_mutation_state",
    "SharedCacheAdapter",
    "SharedCacheConfig",
    "TypePolicy",
    "NormalizedCacheConfig",
    "QueryClientConfig",
    "QueryOptions",
    "MutationOptions",
]
