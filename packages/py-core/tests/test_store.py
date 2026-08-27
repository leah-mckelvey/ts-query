"""Mirror of packages/core/src/__tests__/store.test.ts."""

from helpers import Spy

from ts_query import create_store


def counter_store(**extra):
    return create_store(lambda set_state, get_state: {"count": 0, **extra})


class TestCreateStore:
    def test_should_initialize_with_provided_state(self):
        store = create_store(lambda s, g: {"count": 0})

        assert store.get_state() == {"count": 0}

    def test_should_update_state_with_partial_value(self):
        store = create_store(lambda s, g: {"count": 0, "label": "initial"})

        store.set_state({"count": 1})

        assert store.get_state() == {"count": 1, "label": "initial"}

    def test_should_update_state_using_an_updater_function(self):
        store = create_store(lambda s, g: {"count": 0})

        store.set_state(lambda state: {"count": state["count"] + 1})

        assert store.get_state()["count"] == 1

    def test_should_replace_state_when_replace_flag_is_true(self):
        store = create_store(lambda s, g: {"count": 0, "label": "initial"})

        store.set_state({"count": 5}, True)

        assert store.get_state() == {"count": 5}

    def test_should_notify_subscribers_on_state_change(self):
        store = create_store(lambda s, g: {"count": 0})
        listener = Spy()

        store.subscribe(listener)

        store.set_state({"count": 1})

        assert listener.call_count == 1
        assert listener.last_args == ({"count": 1}, {"count": 0})

    def test_should_unsubscribe_correctly(self):
        store = create_store(lambda s, g: {"count": 0})
        listener = Spy()

        unsubscribe = store.subscribe(listener)
        unsubscribe()

        store.set_state({"count": 1})

        assert not listener.called

    def test_should_not_notify_subscribers_when_state_does_not_change(self):
        store = create_store(lambda s, g: {"count": 0})
        listener = Spy()

        store.subscribe(listener)

        # Setting the same state object should not trigger listeners.
        state = store.get_state()
        store.set_state(state, True)

        assert not listener.called

    def test_should_stop_notifying_after_destroy_is_called(self):
        store = create_store(lambda s, g: {"count": 0})
        listener = Spy()

        store.subscribe(listener)
        store.destroy()

        store.set_state({"count": 1})

        assert not listener.called

    def test_set_and_get_are_available_to_the_initializer(self):
        """Python-side check that the (set, get) initializer contract holds."""
        captured = {}

        def initializer(set_state, get_state):
            captured["set"] = set_state
            captured["get"] = get_state
            return {"count": 0}

        store = create_store(initializer)
        captured["set"]({"count": 7})

        assert captured["get"]() == {"count": 7}
        assert store.get_state()["count"] == 7
