"""Port of packages/core/src/store.ts — the Zustand-equivalent store."""

from __future__ import annotations

from typing import Any, Callable, Dict, Generic, List, Optional, TypeVar, Union

TState = TypeVar("TState")

StoreListener = Callable[[Any, Any], None]


class Store(Generic[TState]):
    def __init__(self, initializer: Callable[[Callable[..., None], Callable[[], TState]], TState]) -> None:
        self._listeners: List[StoreListener] = []
        self._destroyed = False
        self._state: TState = initializer(self.set_state, self.get_state)

    def get_state(self) -> TState:
        return self._state

    def set_state(
        self,
        partial: Union[TState, Dict[str, Any], Callable[[TState], Any]],
        replace: bool = False,
    ) -> None:
        prev_state = self._state

        next_state_value = partial(prev_state) if callable(partial) else partial

        # Identity check mirrors the TS early-return: setting the same object
        # is a no-op, listeners are not notified.
        if next_state_value is prev_state:
            return

        if replace or not isinstance(next_state_value, dict):
            next_state = next_state_value
        elif isinstance(prev_state, dict):
            # Shallow merge for dict states when not replacing.
            next_state = {**prev_state, **next_state_value}
        else:
            next_state = next_state_value

        self._state = next_state  # type: ignore[assignment]

        for listener in list(self._listeners):
            listener(self._state, prev_state)

    def subscribe(self, listener: StoreListener) -> Callable[[], None]:
        self._listeners.append(listener)

        def unsubscribe() -> None:
            try:
                self._listeners.remove(listener)
            except ValueError:
                pass

        return unsubscribe

    def destroy(self) -> None:
        self._listeners.clear()
        self._destroyed = True


def create_store(
    initializer: Callable[[Callable[..., None], Callable[[], TState]], TState],
) -> Store[TState]:
    """Create a store from an initializer receiving ``(set, get)``."""
    return Store(initializer)
