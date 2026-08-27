"""Mirror of packages/core/src/__tests__/mutation.test.ts."""

import pytest
from helpers import AsyncSpy, Spy

from ts_query import UNDEFINED, Mutation, MutationOptions


class TestMutation:
    async def test_should_initialize_with_idle_state(self):
        mutation = Mutation(MutationOptions(mutation_fn=AsyncSpy("data")))

        assert mutation.state.status == "idle"
        assert mutation.state.data is UNDEFINED
        assert mutation.state.error is None
        assert mutation.state.is_loading is False
        assert mutation.state.is_success is False
        assert mutation.state.is_error is False

    async def test_should_mutate_successfully(self):
        mutation_fn = AsyncSpy("result")
        mutation = Mutation(MutationOptions(mutation_fn=mutation_fn))

        result = await mutation.mutate("input")

        assert result == "result"
        assert mutation.state.status == "success"
        assert mutation.state.data == "result"
        assert mutation.state.is_success is True
        assert mutation.state.is_loading is False
        assert mutation_fn.last_args == ("input",)

    async def test_should_handle_mutation_errors(self):
        error = RuntimeError("Mutation error")
        mutation = Mutation(MutationOptions(mutation_fn=AsyncSpy(error=error)))

        with pytest.raises(RuntimeError, match="Mutation error"):
            await mutation.mutate("input")

        assert mutation.state.status == "error"
        assert mutation.state.error is error
        assert mutation.state.is_error is True
        assert mutation.state.is_loading is False

    async def test_should_call_on_success_callback(self):
        on_success = Spy()

        async def mutation_fn(data):
            return f"result: {data}"

        mutation = Mutation(MutationOptions(mutation_fn=mutation_fn, on_success=on_success))

        await mutation.mutate("test")

        assert on_success.last_args == ("result: test", "test")

    async def test_should_call_on_error_callback(self):
        error = RuntimeError("Test error")
        on_error = Spy()

        async def mutation_fn(_variables):
            raise error

        mutation = Mutation(MutationOptions(mutation_fn=mutation_fn, on_error=on_error))

        with pytest.raises(RuntimeError):
            await mutation.mutate("input")

        assert on_error.last_args == (error, "input")

    async def test_should_call_on_settled_callback_on_success(self):
        on_settled = Spy()

        async def mutation_fn(data):
            return f"result: {data}"

        mutation = Mutation(MutationOptions(mutation_fn=mutation_fn, on_settled=on_settled))

        await mutation.mutate("test")

        assert on_settled.last_args == ("result: test", None, "test")

    async def test_should_call_on_settled_callback_on_error(self):
        error = RuntimeError("Test error")
        on_settled = Spy()

        async def mutation_fn(_variables):
            raise error

        mutation = Mutation(MutationOptions(mutation_fn=mutation_fn, on_settled=on_settled))

        with pytest.raises(RuntimeError):
            await mutation.mutate("input")

        assert on_settled.last_args == (UNDEFINED, error, "input")

    async def test_should_notify_subscribers_on_state_change(self):
        subscriber = Spy()
        mutation = Mutation(MutationOptions(mutation_fn=AsyncSpy("data")))

        mutation.subscribe({"next": subscriber})
        await mutation.mutate("input")

        assert subscriber.called
        final = subscriber.last_args[0]
        assert final.status == "success"
        assert final.data == "data"

    async def test_should_reset_state(self):
        mutation = Mutation(MutationOptions(mutation_fn=AsyncSpy("data")))

        await mutation.mutate("input")
        assert mutation.state.status == "success"
        assert mutation.state.data == "data"

        mutation.reset()

        assert mutation.state.status == "idle"
        assert mutation.state.data is UNDEFINED
        assert mutation.state.error is None
        assert mutation.state.is_loading is False
        assert mutation.state.is_success is False
        assert mutation.state.is_error is False

    async def test_should_unsubscribe_correctly(self):
        subscriber = Spy()
        mutation = Mutation(MutationOptions(mutation_fn=AsyncSpy("data")))

        unsubscribe = mutation.subscribe({"next": subscriber})

        # BehaviorSubject emits the current value immediately on subscribe.
        assert subscriber.call_count == 1
        assert subscriber.last_args[0].status == "idle"

        subscriber.reset()
        unsubscribe()

        await mutation.mutate("input")

        # After unsubscribe, no further emissions.
        assert not subscriber.called

    async def test_subscriber_sees_the_loading_transition(self):
        """Python-side check that `loading` is emitted, not just the end state."""
        seen = []
        mutation = Mutation(MutationOptions(mutation_fn=AsyncSpy("data")))
        mutation.subscribe(lambda state: seen.append(state.status))

        await mutation.mutate("input")

        assert seen == ["idle", "loading", "success"]
