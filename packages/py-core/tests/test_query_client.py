"""Mirror of packages/core/src/__tests__/query-client.test.ts.

Timer-dependent tests use short real delays instead of vitest fake timers.
"""

import asyncio

import pytest
from helpers import AsyncSpy, make_spy_adapter, tick

from ts_query import (
    InMemorySharedCacheAdapter,
    QueryClient,
    QueryClientConfig,
    QueryOptions,
    SharedCacheConfig,
)

GC_MS = 50
GC_WAIT = 0.09


class TestQueryClient:
    async def test_should_create_and_cache_queries(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query1 = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))
        query2 = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        assert query1 is query2

    async def test_should_create_different_queries_for_different_keys(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query1 = client.get_query(QueryOptions(query_key="test1", query_fn=query_fn))
        query2 = client.get_query(QueryOptions(query_key="test2", query_fn=query_fn))

        assert query1 is not query2

    async def test_should_handle_array_query_keys(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query1 = client.get_query(QueryOptions(query_key=["user", 1], query_fn=query_fn))
        query2 = client.get_query(QueryOptions(query_key=["user", 1], query_fn=query_fn))
        query3 = client.get_query(QueryOptions(query_key=["user", 2], query_fn=query_fn))

        assert query1 is query2
        assert query1 is not query3

    async def test_should_invalidate_specific_query(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        await query.fetch()
        assert query_fn.call_count == 1

        await client.invalidate_queries("test")
        await tick()

        assert query_fn.call_count == 2

    async def test_should_invalidate_all_queries(self):
        client = QueryClient()
        query_fn1 = AsyncSpy("data1")
        query_fn2 = AsyncSpy("data2")

        query1 = client.get_query(QueryOptions(query_key="test1", query_fn=query_fn1))
        query2 = client.get_query(QueryOptions(query_key="test2", query_fn=query_fn2))

        await query1.fetch()
        await query2.fetch()

        assert query_fn1.call_count == 1
        assert query_fn2.call_count == 1

        await client.invalidate_queries()
        await tick()

        assert query_fn1.call_count == 2
        assert query_fn2.call_count == 2

    async def test_should_remove_specific_query(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query1 = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        await client.remove_queries("test")

        query2 = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        assert query1 is not query2

    async def test_should_clear_all_queries(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query1 = client.get_query(QueryOptions(query_key="test1", query_fn=query_fn))
        query2 = client.get_query(QueryOptions(query_key="test2", query_fn=query_fn))

        await client.clear()

        query3 = client.get_query(QueryOptions(query_key="test1", query_fn=query_fn))
        query4 = client.get_query(QueryOptions(query_key="test2", query_fn=query_fn))

        assert query1 is not query3
        assert query2 is not query4

    async def test_should_garbage_collect_unused_queries_after_cache_time(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query1 = client.get_query(
            QueryOptions(query_key="test", query_fn=query_fn, cache_time_ms=GC_MS)
        )

        await query1.fetch()

        unsubscribe = query1.subscribe(lambda _state: None)
        unsubscribe()

        await asyncio.sleep(GC_WAIT)

        query2 = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        assert query2 is not query1

    async def test_should_not_garbage_collect_queries_that_still_have_subscribers(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query = client.get_query(
            QueryOptions(query_key="test", query_fn=query_fn, cache_time_ms=GC_MS)
        )

        await query.fetch()
        unsubscribe = query.subscribe(lambda _state: None)

        await asyncio.sleep(GC_WAIT)

        same_query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        assert same_query is query
        unsubscribe()

    async def test_should_schedule_gc_when_last_subscriber_unsubscribes_after_cache_time(self):
        client = QueryClient()
        query_fn = AsyncSpy("data")

        query = client.get_query(
            QueryOptions(query_key="test", query_fn=query_fn, cache_time_ms=GC_MS)
        )

        await query.fetch()

        unsubscribe = query.subscribe(lambda _state: None)

        # Pass the original cacheTime while the query is still subscribed.
        await asyncio.sleep(GC_WAIT)

        # Not collected: it still has a subscriber.
        assert client.get_query(QueryOptions(query_key="test", query_fn=query_fn)) is query

        # Dropping the last subscriber schedules a fresh GC timer.
        unsubscribe()

        await asyncio.sleep(GC_WAIT)

        new_query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        assert new_query is not query


class TestQueryClientWithSharedCache:
    """Mirror of `QueryClient with SharedCache (L2)`."""

    @staticmethod
    def make_client(**config_kwargs):
        adapter = make_spy_adapter(InMemorySharedCacheAdapter())
        client = QueryClient(
            QueryClientConfig(shared_cache=SharedCacheConfig(adapter=adapter, **config_kwargs))
        )
        return client, adapter

    async def test_should_fetch_from_l3_when_l2_cache_is_empty(self):
        client, adapter = self.make_client()

        query_fn = AsyncSpy({"id": 1, "name": "Test"})
        query = client.get_query(QueryOptions(query_key=["user", 1], query_fn=query_fn))

        result = await query.fetch()

        assert result == {"id": 1, "name": "Test"}
        assert query_fn.call_count == 1
        assert adapter.get_spy.call_count == 1
        assert adapter.set_spy.call_count == 1

    async def test_should_return_from_l2_and_skip_l3(self):
        client, adapter = self.make_client()

        # Pre-populate the shared cache under the serialized key.
        await adapter.set('["user",1]', '{"id":1,"name":"Cached User"}', 60000)
        adapter.set_spy.reset()

        query_fn = AsyncSpy({"id": 1, "name": "Fresh User"})
        query = client.get_query(QueryOptions(query_key=["user", 1], query_fn=query_fn))

        result = await query.fetch()

        assert result == {"id": 1, "name": "Cached User"}
        assert query_fn.call_count == 0  # L3 skipped
        assert adapter.get_spy.call_count == 1
        assert adapter.set_spy.call_count == 0  # no need to re-set

    async def test_should_populate_l2_after_fetching_from_l3(self):
        client, adapter = self.make_client(default_ttl_ms=30000)

        query_fn = AsyncSpy({"id": 1, "name": "Test"})
        query = client.get_query(QueryOptions(query_key="test-key", query_fn=query_fn))

        await query.fetch()

        assert adapter.set_spy.last_args == ("test-key", '{"id":1,"name":"Test"}', 30000)
        assert await adapter.get("test-key") is not None

    async def test_should_use_query_level_ttl_over_client_default(self):
        client, adapter = self.make_client(default_ttl_ms=30000)

        query = client.get_query(
            QueryOptions(query_key="test", query_fn=AsyncSpy("data"), shared_cache_ttl_ms=5000)
        )

        await query.fetch()

        assert adapter.set_spy.last_args == ("test", '"data"', 5000)

    async def test_should_skip_shared_cache_when_skip_flag_is_true(self):
        client, adapter = self.make_client()

        query_fn = AsyncSpy("data")
        query = client.get_query(
            QueryOptions(query_key="test", query_fn=query_fn, skip_shared_cache=True)
        )

        await query.fetch()

        assert adapter.get_spy.call_count == 0
        assert adapter.set_spy.call_count == 0
        assert query_fn.call_count == 1

    async def test_should_delete_from_shared_cache_on_invalidate_queries(self):
        client, adapter = self.make_client()

        query = client.get_query(QueryOptions(query_key="test", query_fn=AsyncSpy("data")))
        await query.fetch()

        await client.invalidate_queries("test")

        assert adapter.delete_spy.last_args == ("test",)

    async def test_should_delete_from_shared_cache_on_remove_queries(self):
        client, adapter = self.make_client()

        client.get_query(QueryOptions(query_key="test", query_fn=AsyncSpy("data")))

        await client.remove_queries("test")

        assert adapter.delete_spy.last_args == ("test",)

    async def test_should_gracefully_handle_shared_cache_get_errors(self):
        client, adapter = self.make_client()
        adapter.control.get_error = RuntimeError("Redis connection failed")

        query_fn = AsyncSpy("fallback data")
        query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        # Should not raise; should fall through to L3.
        result = await query.fetch()

        assert result == "fallback data"
        assert query_fn.call_count == 1

    async def test_should_gracefully_handle_shared_cache_set_errors(self):
        client, adapter = self.make_client()
        adapter.control.set_error = RuntimeError("Redis connection failed")

        query = client.get_query(QueryOptions(query_key="test", query_fn=AsyncSpy("data")))

        result = await query.fetch()

        assert result == "data"
        assert query.state.data == "data"

    async def test_should_deduplicate_concurrent_requests_with_shared_cache(self):
        client, adapter = self.make_client()

        call_count = {"n": 0}

        async def query_fn():
            call_count["n"] += 1
            await asyncio.sleep(0.05)
            return f"result-{call_count['n']}"

        spy = AsyncSpy(side_effect=query_fn)
        query = client.get_query(QueryOptions(query_key="test", query_fn=spy))

        # Fire 5 concurrent requests.
        results = await asyncio.gather(*(query.fetch() for _ in range(5)))

        assert results == ["result-1"] * 5
        assert spy.call_count == 1  # L3 called once
        assert adapter.set_spy.call_count == 1  # L2 written once

    async def test_should_gracefully_handle_malformed_json_and_fall_back_to_l3(self):
        client, adapter = self.make_client()
        adapter.control.get_override = "not valid json {{{"

        query_fn = AsyncSpy({"id": 1, "name": "Fresh Data"})
        query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        result = await query.fetch()

        assert result == {"id": 1, "name": "Fresh Data"}
        assert adapter.get_spy.call_count == 1
        assert query_fn.call_count == 1
        # The fresh data is still cached.
        assert adapter.set_spy.call_count == 1

    async def test_should_handle_circular_references_and_skip_l2_write(self):
        client, adapter = self.make_client()

        # Circular reference that cannot be JSON-encoded.
        circular_data = {"name": "test"}
        circular_data["self"] = circular_data

        query_fn = AsyncSpy(circular_data)
        query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        result = await query.fetch()

        assert result is circular_data
        assert result["name"] == "test"
        assert result["self"] is circular_data
        assert query_fn.call_count == 1
        # L2 set skipped: the value cannot be serialized.
        assert adapter.set_spy.call_count == 0

    async def test_should_handle_non_serializable_values_and_skip_l2_write(self):
        """Python analogue of the TS BigInt test: a set has no JSON encoding."""
        client, adapter = self.make_client()

        data_with_set = {"value": {1, 2, 3}}
        query_fn = AsyncSpy(data_with_set)
        query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        result = await query.fetch()

        assert result is data_with_set
        assert result["value"] == {1, 2, 3}
        assert query_fn.call_count == 1
        assert adapter.set_spy.call_count == 0

    async def test_should_clear_l1_queries_when_clear_is_called(self):
        client, _adapter = self.make_client()

        query1 = client.get_query(QueryOptions(query_key="test1", query_fn=AsyncSpy("data")))
        query2 = client.get_query(QueryOptions(query_key="test2", query_fn=AsyncSpy("data")))

        await query1.fetch()
        await query2.fetch()

        await client.clear()

        assert client.get_query(QueryOptions(query_key="test1", query_fn=AsyncSpy("data"))) is not query1
        assert client.get_query(QueryOptions(query_key="test2", query_fn=AsyncSpy("data"))) is not query2

    async def test_should_clear_l2_when_adapter_has_clear(self):
        client, adapter = self.make_client()

        await client.clear()

        assert adapter.clear_spy.call_count == 1

    async def test_should_work_without_l2_clear_when_adapter_lacks_it(self):
        adapter = make_spy_adapter(InMemorySharedCacheAdapter(), with_clear=False)
        client = QueryClient(QueryClientConfig(shared_cache=SharedCacheConfig(adapter=adapter)))

        client.get_query(QueryOptions(query_key="test", query_fn=AsyncSpy("data")))

        # Should not raise even without a clear method.
        assert await client.clear() is None

    async def test_should_silently_ignore_l2_clear_errors(self):
        client, adapter = self.make_client()
        adapter.control.clear_error = RuntimeError("Cache clear failed")

        query = client.get_query(QueryOptions(query_key="test", query_fn=AsyncSpy("data")))
        await query.fetch()

        assert await client.clear() is None
        assert adapter.clear_spy.call_count == 1

        # L1 is still cleared.
        new_query = client.get_query(QueryOptions(query_key="test", query_fn=AsyncSpy("data")))
        assert new_query is not query

    async def test_invalidate_bypasses_l2_on_the_refetch(self):
        """Python-side check of skip_shared_cache_on_next_fetch.

        Without it, invalidation would race the L2 delete and re-read the stale
        value it just evicted.
        """
        client, adapter = self.make_client()

        query_fn = AsyncSpy().resolves_once("v1").resolves_once("v2")
        query = client.get_query(QueryOptions(query_key="test", query_fn=query_fn))

        await query.fetch()
        assert query.state.data == "v1"

        await client.invalidate_queries("test")
        await tick(5)

        assert query_fn.call_count == 2
        assert query.state.data == "v2"
