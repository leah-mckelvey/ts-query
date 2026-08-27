"""Cross-process request coalescing.

No TypeScript counterpart: Node's single-process model makes the in-process
dedup in query.py sufficient, while a forked Python worker pool does not. These
tests simulate N workers as N QueryClients sharing one L2 adapter — each with its
own L1 and its own DistributedSingleFlight, exactly as separate interpreters
would have.
"""

import asyncio

import pytest
from helpers import AsyncSpy

from ts_query import (
    DistributedSingleFlight,
    InMemorySharedCacheAdapter,
    QueryClient,
    QueryClientConfig,
    QueryOptions,
    SharedCacheConfig,
)

WORKERS = 10


def make_workers(adapter, *, single_flight: bool, count: int = WORKERS):
    """N independent QueryClients over one shared L2 — the worker pool."""
    return [
        QueryClient(
            QueryClientConfig(
                shared_cache=SharedCacheConfig(
                    adapter=adapter, single_flight=single_flight, single_flight_wait_ms=2000
                )
            )
        )
        for _ in range(count)
    ]


class SharedSource:
    """Stands in for L3 (the database), counting how often it is actually hit."""

    def __init__(self, delay_ms: int = 50, value=None):
        self.calls = 0
        self._delay_ms = delay_ms
        self._value = value if value is not None else {"id": 1, "name": "Test"}

    async def __call__(self):
        self.calls += 1
        await asyncio.sleep(self._delay_ms / 1000)
        return self._value


class TestDistributedSingleFlight:
    async def test_concurrent_workers_hit_l3_exactly_once(self):
        """The headline claim: 10 workers, 10 concurrent requests, 1 DB call."""
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource()
        workers = make_workers(adapter, single_flight=True)

        results = await asyncio.gather(
            *(
                worker.get_query(
                    QueryOptions(query_key=["user", 1], query_fn=source, retry=0)
                ).fetch()
                for worker in workers
            )
        )

        assert source.calls == 1
        assert results == [{"id": 1, "name": "Test"}] * WORKERS

    async def test_without_single_flight_every_worker_hits_l3(self):
        """The contrast that motivates the feature.

        In-process dedup cannot see across interpreters, so each worker's empty
        L1 produces its own L3 call — the stampeding herd, back again.
        """
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource()
        workers = make_workers(adapter, single_flight=False)

        await asyncio.gather(
            *(
                worker.get_query(
                    QueryOptions(query_key=["user", 1], query_fn=source, retry=0)
                ).fetch()
                for worker in workers
            )
        )

        assert source.calls == WORKERS

    async def test_in_process_dedup_still_applies_within_one_worker(self):
        """Single-flight layers on top of the L1 guarantee, it does not replace it."""
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource()
        [worker] = make_workers(adapter, single_flight=True, count=1)

        query = worker.get_query(QueryOptions(query_key="k", query_fn=source, retry=0))
        await asyncio.gather(*(query.fetch() for _ in range(5)))

        assert source.calls == 1

    async def test_second_wave_of_workers_is_served_from_l2(self):
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource()
        first = make_workers(adapter, single_flight=True, count=3)
        second = make_workers(adapter, single_flight=True, count=3)

        await asyncio.gather(
            *(w.get_query(QueryOptions(query_key="k", query_fn=source, retry=0)).fetch() for w in first)
        )
        assert source.calls == 1

        # These arrive after the value has landed in L2: no lock, no L3.
        await asyncio.gather(
            *(w.get_query(QueryOptions(query_key="k", query_fn=source, retry=0)).fetch() for w in second)
        )
        assert source.calls == 1

    async def test_lock_is_released_after_a_successful_fetch(self):
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource(delay_ms=1)
        [worker] = make_workers(adapter, single_flight=True, count=1)

        await worker.get_query(QueryOptions(query_key="k", query_fn=source, retry=0)).fetch()

        single_flight = DistributedSingleFlight(adapter)
        assert await adapter.get(single_flight.lock_key("k")) is None

    async def test_lock_is_released_when_the_holder_fails(self):
        adapter = InMemorySharedCacheAdapter()
        [worker] = make_workers(adapter, single_flight=True, count=1)
        query_fn = AsyncSpy(error=RuntimeError("db down"))

        with pytest.raises(RuntimeError, match="db down"):
            await worker.get_query(
                QueryOptions(query_key="k", query_fn=query_fn, retry=0)
            ).fetch()

        single_flight = DistributedSingleFlight(adapter)
        assert await adapter.get(single_flight.lock_key("k")) is None

    async def test_a_waiter_takes_over_when_the_holder_fails(self):
        """A crashed holder must not leave the other workers hanging.

        The waiter sees the lock disappear with no value published and does the
        work itself: a duplicated L3 call is better than a failed request.
        """
        adapter = InMemorySharedCacheAdapter()
        holder, waiter = make_workers(adapter, single_flight=True, count=2)

        # The delay matters: the holder must still be holding the lock when the
        # waiter arrives, or the waiter would simply acquire it and the takeover
        # path would never run.
        query_fn = AsyncSpy(delay_ms=30).rejects_once(RuntimeError("db down")).resolves("recovered")

        holder_query = holder.get_query(
            QueryOptions(query_key="k", query_fn=query_fn, retry=0)
        )
        holder_task = holder_query.fetch()
        # Let the holder win the lock before the waiter arrives.
        await asyncio.sleep(0.005)

        single_flight = DistributedSingleFlight(adapter)
        assert await adapter.get(single_flight.lock_key("k")) is not None

        waiter_task = waiter.get_query(
            QueryOptions(query_key="k", query_fn=query_fn, retry=0)
        ).fetch()

        with pytest.raises(RuntimeError, match="db down"):
            await holder_task

        assert await waiter_task == "recovered"
        assert query_fn.call_count == 2
        # The waiter genuinely waited and then took over, rather than winning
        # the lock outright.
        assert waiter._single_flight.fallbacks == 1
        assert holder._single_flight.fallbacks == 0

    async def test_waiter_falls_back_after_the_wait_budget_expires(self):
        """A holder that hangs past single_flight_wait_ms must not block a request."""
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource(delay_ms=1)

        # Simulate a holder that acquired the lock and then died without
        # releasing it — the lock outlives the wait budget.
        single_flight = DistributedSingleFlight(adapter)
        await adapter.set(single_flight.lock_key("k"), "stale-holder", 60000)

        client = QueryClient(
            QueryClientConfig(
                shared_cache=SharedCacheConfig(
                    adapter=adapter, single_flight=True, single_flight_wait_ms=30
                )
            )
        )

        result = await client.get_query(
            QueryOptions(query_key="k", query_fn=source, retry=0)
        ).fetch()

        assert result == {"id": 1, "name": "Test"}
        assert source.calls == 1
        assert client._single_flight.fallbacks == 1

    async def test_single_flight_requires_an_adapter_that_can_lock(self):
        class LockLessAdapter:
            async def get(self, key):
                return None

            async def set(self, key, value, ttl_ms):
                return None

            async def delete(self, key):
                return None

        with pytest.raises(TypeError, match="try_acquire"):
            QueryClient(
                QueryClientConfig(
                    shared_cache=SharedCacheConfig(adapter=LockLessAdapter(), single_flight=True)
                )
            )

    async def test_only_one_worker_writes_l2(self):
        adapter = InMemorySharedCacheAdapter()
        source = SharedSource()
        writes = {"n": 0}

        original_set = adapter.set

        async def counting_set(key, value, ttl_ms):
            # The lock itself goes through set(); count only the data key.
            if not key.endswith(":__sf"):
                writes["n"] += 1
            await original_set(key, value, ttl_ms)

        adapter.set = counting_set  # type: ignore[assignment]

        workers = make_workers(adapter, single_flight=True)
        await asyncio.gather(
            *(w.get_query(QueryOptions(query_key="k", query_fn=source, retry=0)).fetch() for w in workers)
        )

        assert writes["n"] == 1
