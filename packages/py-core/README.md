# ts-query-py

An asyncio port of `@ts-query/core` for Python backends — proof of concept.

The TypeScript core already works server-side: the `game-server` example uses one
`QueryClient` as an L1/L2/L3 tiered cache behind Express. This package is the same
concept for a Python service, and is wire-compatible with the TypeScript core so
the two can share one Redis.

```python
from ts_query import QueryClient, QueryClientConfig, QueryOptions, SharedCacheConfig
from ts_query import RedisSharedCacheAdapter
import redis.asyncio as aioredis

client = QueryClient(
    QueryClientConfig(
        shared_cache=SharedCacheConfig(
            adapter=RedisSharedCacheAdapter(aioredis.from_url("redis://localhost")),
            default_ttl_ms=30_000,
            single_flight=True,
        )
    )
)


async def get_user(user_id: int):
    query = client.get_query(
        QueryOptions(
            query_key=["user", user_id],
            query_fn=lambda: db.fetch_user(user_id),
        )
    )
    return await query.fetch()
```

Ten concurrent requests for `["user", 1]` produce **one** database call — across
worker processes, not just within one.

## What is ported

| Piece               | TypeScript               | Here                                  |
| ------------------- | ------------------------ | ------------------------------------- |
| Query lifecycle     | `query.ts`               | `ts_query/query.py`                   |
| Client + tiering    | `query-client.ts`        | `ts_query/query_client.py`            |
| Mutations           | `mutation.ts`            | `ts_query/mutation.py`                |
| Normalized cache    | `normalized-cache.ts`    | `ts_query/normalized_cache.py`        |
| `createStore`       | `store.ts`               | `ts_query/store.py`                   |
| Hot observable      | `rxjs` `BehaviorSubject` | `ts_query/subject.py` (no dependency) |
| Cross-process dedup | —                        | `ts_query/single_flight.py`           |

The package has **zero runtime dependencies**, mirroring the TS core. `redis` is
an optional extra, needed only for `RedisSharedCacheAdapter`.

## The three deliberate deviations

Everything else is a line-for-line translation. These are not:

**1. `fetch()` is a synchronous method returning an awaitable, not `async def`.**

This is what preserves the guarantee `OBSERVABLE_ARCHITECTURE.md` is about. An
`async def fetch()` does not run until the loop schedules it, so two callers in
the same tick would both observe `idle` — the exact race the observable rewrite
removed. Making `fetch()` synchronous up to the `loading` transition restores the
TS behaviour: the dedup check and the state change happen before anyone can
yield.

```python
future_a = query.fetch()   # starts the fetch, state is already 'loading'
future_b = query.fetch()   # joins it — query_fn is called once
```

**2. `invalidate_queries`, `remove_queries` and `clear` are coroutines.**

The TS versions fire the L2 delete and forget it. In an ASGI worker a detached
task can be dropped when the request completes, leaving a stale L2 entry.
Awaiting makes the eviction deterministic; the refetch each invalidation triggers
stays fire-and-forget, as in TS.

**3. In-process dedup is not enough, so there is a distributed single-flight.**

Node runs one process per instance. Gunicorn/uvicorn fork N workers, so N
concurrent requests for one key land in N interpreters, each with its own event
loop and its own empty L1 — and the stampeding herd is back. The fix has to live
where workers actually share state: one worker wins a `SET NX PX` lock and does
the work, the others poll L2 for the result it publishes. Enable it with
`single_flight=True`; a holder that dies or exceeds `single_flight_wait_ms` is
taken over by a waiter rather than hanging the request.

`DistributedSingleFlight.fallbacks` counts those takeovers. A nonzero rate in
production means holders are dying and the herd is getting through — worth an
alert.

## Wire compatibility

Both sides must derive the same cache key from the same query key and encode
payloads identically, or a shared Redis is useless:

|           | TypeScript                                            | Python                |
| --------- | ----------------------------------------------------- | --------------------- |
| Query key | `typeof key === 'string' ? key : JSON.stringify(key)` | `serialize_query_key` |
| Payload   | `JSON.stringify(data)`                                | `dumps(data)`         |

`tests/test_wire_compat.py` runs the TypeScript expressions through `node` and
asserts the outputs match — including non-ASCII (Python's default
`ensure_ascii=True` would emit `é` and silently miss every cached key) and
separator whitespace. Those tests skip when node is unavailable.

Note that `RedisSharedCacheAdapter` writes unprefixed keys by default for exactly
this reason. If you set `namespace=`, set the same prefix on the Node side.

## Running the tests

```bash
cd packages/py-core
pip install -e ".[dev]"
pytest
```

The suite mirrors `packages/core/src/__tests__` test for test:

| TypeScript file            | Python file                | TS  | Py  |
| -------------------------- | -------------------------- | --- | --- |
| `store.test.ts`            | `test_store.py`            | 8   | 9   |
| `mutation.test.ts`         | `test_mutation.py`         | 10  | 11  |
| `query.test.ts`            | `test_query.py`            | 11  | 17  |
| `query-client.test.ts`     | `test_query_client.py`     | 27  | 28  |
| `normalized-cache.test.ts` | `test_normalized_cache.py` | 27  | 29  |
| —                          | `test_single_flight.py`    | —   | 10  |
| —                          | `test_wire_compat.py`      | —   | 7   |
| **Total**                  |                            | 83  | 111 |

Every TypeScript test has a counterpart with the same name and assertions. The
extras cover behaviour that has no TS equivalent: the cross-process cases, the
wire contract, cancellation safety (an ASGI client disconnect must not kill a
fetch other waiters are joined to), and the concurrent-subscriber guarantee the
architecture doc argues for but does not test at the `Query` level.

Timer-dependent tests use short real delays rather than vitest's fake timers, so
asyncio's scheduling is exercised rather than simulated.

## Demo

```bash
python examples/stampede_demo.py
```

Runs ten simulated workers against one shared cache, with and without
single-flight, and prints the resulting L3 call counts.

## What this does not do

- No framework adapters. The TS repo's value is `useQuery`/`m()` glue; the Python
  equivalent (a FastAPI dependency, a Django cache backend) is not written yet.
- No `persist` layer, no devtools.
- `RedisSharedCacheAdapter` is exercised only through the in-memory adapter's
  identical interface — there is no integration test against a live Redis.
- The invalidation bridge (Python publishing invalidation events that a browser
  `QueryClient` subscribes to) is not built. That is the piece that would make
  the two clients coherent at runtime rather than merely compatible at rest.
