"""Mirror of packages/core/src/__tests__/query.test.ts.

The TS suite uses vitest fake timers; here the equivalent tests use short real
delays, which keeps the asyncio scheduling honest rather than simulated.
"""

import asyncio

import pytest
from helpers import AsyncSpy, Spy, tick

from ts_query import UNDEFINED, Query, QueryOptions


def make_query(**kwargs) -> Query:
    kwargs.setdefault("query_key", "test")
    kwargs.setdefault("query_fn", AsyncSpy("data"))
    return Query(QueryOptions(**kwargs))


class TestQuery:
    async def test_should_initialize_with_idle_state(self):
        query = make_query()

        assert query.state.status == "idle"
        assert query.state.data is UNDEFINED
        assert query.state.error is None
        assert query.state.is_loading is False
        assert query.state.is_success is False
        assert query.state.is_error is False

    async def test_should_fetch_data_successfully(self):
        query_fn = AsyncSpy("test data")
        query = make_query(query_fn=query_fn)

        future = query.fetch()

        # fetch() is synchronous up to the state transition, so `loading` is
        # observable before yielding to the event loop — the same guarantee the
        # TS version gets from starting a promise.
        assert query.state.status == "loading"
        assert query.state.is_loading is True

        result = await future

        assert result == "test data"
        assert query.state.status == "success"
        assert query.state.data == "test data"
        assert query.state.is_success is True
        assert query.state.is_loading is False
        assert query_fn.call_count == 1

    async def test_should_handle_errors(self):
        error = RuntimeError("Test error")
        query = make_query()

        # Drive the state directly, as the TS test does, to avoid an unretrieved
        # rejection from a real failing fetch.
        query._update_state({"status": "error", "error": error, "is_fetching": False})

        assert query.state.status == "error"
        assert query.state.error is error
        assert query.state.is_error is True
        assert query.state.is_loading is False

    async def test_should_retry_on_failure(self):
        error = RuntimeError("Test error")
        query_fn = AsyncSpy().rejects_once(error).rejects_once(error).resolves("success")

        query = make_query(query_fn=query_fn, retry=2, retry_delay_ms=10)

        result = await query.fetch()

        assert result == "success"
        assert query_fn.call_count == 3
        assert query.state.status == "success"

    async def test_should_stop_retrying_after_the_limit_and_surface_the_error(self):
        error = RuntimeError("always fails")
        query_fn = AsyncSpy(error=error)
        query = make_query(query_fn=query_fn, retry=2, retry_delay_ms=1)

        with pytest.raises(RuntimeError, match="always fails"):
            await query.fetch()

        # 1 initial attempt + 2 retries
        assert query_fn.call_count == 3
        assert query.state.status == "error"
        assert query.state.error is error

    async def test_should_notify_subscribers_on_state_change(self):
        subscriber = Spy()
        query = make_query()

        query.subscribe({"next": subscriber})
        await query.fetch()

        assert subscriber.called
        final = subscriber.last_args[0]
        assert final.status == "success"
        assert final.data == "data"

    async def test_should_unsubscribe_correctly(self):
        subscriber = Spy()
        query = make_query()

        unsubscribe = query.subscribe({"next": subscriber})

        # BehaviorSubject replays the current value ('idle'); the first-subscriber
        # auto-fetch then transitions to 'loading' in the same tick.
        assert subscriber.call_count == 2
        assert subscriber.calls[0][0][0].status == "idle"
        assert subscriber.calls[1][0][0].status == "loading"

        subscriber.reset()
        unsubscribe()

        await query.fetch()

        # After unsubscribe, no further emissions.
        assert not subscriber.called

    async def test_should_call_on_success_callback(self):
        on_success = Spy()
        query = make_query(on_success=on_success)

        await query.fetch()

        assert on_success.last_args == ("data",)

    async def test_should_call_on_error_callback(self):
        error = RuntimeError("Test error")
        on_error = Spy()
        query = make_query(query_fn=AsyncSpy(error=error), on_error=on_error, retry=0)

        with pytest.raises(RuntimeError):
            await query.fetch()

        assert on_error.last_args == (error,)

    async def test_should_invalidate_and_refetch(self):
        query_fn = AsyncSpy().resolves_once("data1").resolves_once("data2")
        query = make_query(query_fn=query_fn)

        await query.fetch()
        assert query.state.data == "data1"

        await query.invalidate()

        assert query_fn.call_count == 2
        assert query.state.data == "data2"

    async def test_should_deduplicate_in_flight_fetches(self):
        gate = asyncio.get_running_loop().create_future()

        async def query_fn():
            return await gate

        spy = AsyncSpy(side_effect=lambda: query_fn())
        query = make_query(query_fn=spy)

        future1 = query.fetch()
        future2 = query.fetch()

        # Both calls resolved to the same in-flight task synchronously; the task
        # body itself only runs once the loop gets a turn.
        await tick()
        assert spy.call_count == 1

        gate.set_result("data")
        result1, result2 = await asyncio.gather(future1, future2)

        assert result1 == "data"
        assert result2 == "data"
        assert query.state.status == "success"

    async def test_should_not_refetch_when_invalidated_during_an_in_flight_fetch(self):
        gate = asyncio.get_running_loop().create_future()

        async def query_fn():
            return await gate

        spy = AsyncSpy(side_effect=lambda: query_fn())
        query = make_query(query_fn=spy)

        future = query.fetch()
        query.invalidate()

        await tick()
        assert spy.call_count == 1

        gate.set_result("data")
        result = await future

        assert result == "data"
        assert spy.call_count == 1

    # ##############################
    # Observable guarantee (OBSERVABLE_ARCHITECTURE.md)
    # ##############################

    async def test_concurrent_subscribers_trigger_exactly_one_fetch(self):
        """The 'ask once, answer many' guarantee, at the Query level.

        Two subscribers arriving in the same tick — the asyncio analogue of
        React's StrictMode double-mount — must produce one query_fn call.
        """
        query_fn = AsyncSpy("data", delay_ms=5)
        query = make_query(query_fn=query_fn)

        states_a, states_b = [], []
        query.subscribe(lambda s: states_a.append(s.status))
        query.subscribe(lambda s: states_b.append(s.status))

        await asyncio.sleep(0.02)

        assert query_fn.call_count == 1
        # The second subscriber never saw 'idle': the first one's fetch had
        # already moved the subject to 'loading'.
        assert states_a[0] == "idle"
        assert states_b[0] == "loading"
        assert states_a[-1] == states_b[-1] == "success"

    async def test_disabled_query_does_not_auto_fetch_on_subscribe(self):
        query_fn = AsyncSpy("data")
        query = make_query(query_fn=query_fn, enabled=False)

        query.subscribe(Spy())
        await tick()

        assert query_fn.call_count == 0
        assert query.state.status == "idle"

    async def test_stale_time_marks_data_stale_after_the_window(self):
        query = make_query(stale_time_ms=20)

        await query.fetch()
        assert query.state.is_stale is False

        await asyncio.sleep(0.04)
        assert query.state.is_stale is True

    async def test_zero_stale_time_marks_data_stale_immediately(self):
        query = make_query(stale_time_ms=0)

        await query.fetch()

        assert query.state.is_stale is True

    async def test_cancelling_one_waiter_does_not_kill_the_shared_fetch(self):
        """Python-specific: an ASGI client disconnect cancels its handler.

        The other waiters on the same key must still get their data.
        """
        query_fn = AsyncSpy("data", delay_ms=20)
        query = make_query(query_fn=query_fn)

        waiter1 = query.fetch()
        waiter2 = query.fetch()

        waiter1.cancel()
        with pytest.raises(asyncio.CancelledError):
            await waiter1

        assert await waiter2 == "data"
        assert query.state.status == "success"
        assert query_fn.call_count == 1

    async def test_unsubscribing_twice_is_a_noop(self):
        """A double-unsubscribe must not corrupt the subscriber count.

        A negative count would mean the last real unsubscribe never schedules
        garbage collection, and the query leaks for the process's lifetime.
        """
        query = make_query()

        unsubscribe = query.subscribe(Spy())
        assert query.subscriber_count == 1

        unsubscribe()
        unsubscribe()

        assert query.subscriber_count == 0
