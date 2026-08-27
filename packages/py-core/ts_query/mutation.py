"""Port of packages/core/src/mutation.ts."""

from __future__ import annotations

from typing import Any, Callable, Dict, Union

from .subject import BehaviorSubject, Observer, Subscription
from .types import (
    UNDEFINED,
    MutationOptions,
    MutationState,
    _merge_state,
    create_initial_mutation_state,
)


class Mutation:
    def __init__(self, options: MutationOptions) -> None:
        self._options = options
        self._state = BehaviorSubject(create_initial_mutation_state())

    @property
    def state(self) -> MutationState:
        return self._state.value

    @property
    def state_observable(self) -> BehaviorSubject:
        return self._state

    def subscribe(
        self, observer_or_callback: Union[Observer, Callable[[MutationState], None], Dict[str, Any]]
    ) -> Callable[[], None]:
        subscription: Subscription = self._state.subscribe(observer_or_callback)
        return subscription.unsubscribe

    def _update_state(self, partial: Dict[str, Any]) -> None:
        self._state.next(_merge_state(self._state.value, partial))

    async def mutate(self, variables: Any = None) -> Any:
        self._update_state({"status": "loading"})

        try:
            data = await self._options.mutation_fn(variables)
        except BaseException as err:  # noqa: BLE001 - re-raised below
            self._update_state({"status": "error", "error": err})

            if self._options.on_error:
                self._options.on_error(err, variables)
            if self._options.on_settled:
                self._options.on_settled(UNDEFINED, err, variables)

            raise

        self._update_state({"status": "success", "data": data, "error": None})

        if self._options.on_success:
            self._options.on_success(data, variables)
        if self._options.on_settled:
            self._options.on_settled(data, None, variables)

        return data

    def reset(self) -> None:
        self._state.next(create_initial_mutation_state())
