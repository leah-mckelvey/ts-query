"""ts-query for Python — an asyncio port of the @ts-query/core concept.

The same tiered client the TypeScript core provides on a Node backend, for a
Python one: L1 in-process state, L2 shared cache, L3 source, with request
coalescing that also works across worker processes.
"""

from .adapters import InMemorySharedCacheAdapter, RedisSharedCacheAdapter
from .keys import QueryKey, dumps, serialize_query_key
from .mutation import Mutation
from .normalized_cache import NormalizedCache
from .query import NormalizedCacheContext, Query, SharedCacheContext
from .query_client import QueryClient
from .single_flight import CACHE_MISS, DistributedSingleFlight, SingleFlightAdapter
from .store import Store, create_store
from .subject import BehaviorSubject, Observer, Subscription
from .types import (
    UNDEFINED,
    MutationOptions,
    MutationState,
    NormalizedCacheConfig,
    QueryClientConfig,
    QueryOptions,
    QueryState,
    QueryStatus,
    SharedCacheAdapter,
    SharedCacheConfig,
    TypePolicy,
    create_initial_mutation_state,
    create_initial_query_state,
    derive_status_flags,
)

__version__ = "0.1.0"

__all__ = [
    "BehaviorSubject",
    "CACHE_MISS",
    "DistributedSingleFlight",
    "InMemorySharedCacheAdapter",
    "Mutation",
    "MutationOptions",
    "MutationState",
    "NormalizedCache",
    "NormalizedCacheConfig",
    "NormalizedCacheContext",
    "Observer",
    "Query",
    "QueryClient",
    "QueryClientConfig",
    "QueryKey",
    "QueryOptions",
    "QueryState",
    "QueryStatus",
    "RedisSharedCacheAdapter",
    "SharedCacheAdapter",
    "SharedCacheConfig",
    "SharedCacheContext",
    "SingleFlightAdapter",
    "Store",
    "Subscription",
    "TypePolicy",
    "UNDEFINED",
    "create_initial_mutation_state",
    "create_initial_query_state",
    "create_store",
    "derive_status_flags",
    "dumps",
    "serialize_query_key",
]
