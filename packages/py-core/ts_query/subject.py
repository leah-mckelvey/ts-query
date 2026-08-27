"""A dependency-free BehaviorSubject.

The TS core leans on ``rxjs``; the Python core keeps the same "ask once, answer
many" contract in ~60 lines rather than taking a dependency, because the only
operators the core uses are the BehaviorSubject itself. Swap in ``reactivex``
if you later want ``switch_map``/``debounce`` for polling.

The guarantee that matters (see OBSERVABLE_ARCHITECTURE.md): ``next`` emits to
every subscriber *synchronously*, so a second subscriber can never observe the
pre-emission value.
"""

from __future__ import annotations

from typing import Any, Callable, Generic, List, Optional, TypeVar, Union

T = TypeVar("T")


class Observer(Generic[T]):
    """Normalizes the callable-or-object observer forms accepted by ``subscribe``."""

    def __init__(
        self,
        next: Optional[Callable[[T], None]] = None,
        error: Optional[Callable[[BaseException], None]] = None,
        complete: Optional[Callable[[], None]] = None,
    ) -> None:
        self.next = next
        self.error = error
        self.complete = complete

    @staticmethod
    def coerce(observer_or_callback: Union["Observer[T]", Callable[[T], None], dict]) -> "Observer[T]":
        if isinstance(observer_or_callback, Observer):
            return observer_or_callback
        if isinstance(observer_or_callback, dict):
            return Observer(
                next=observer_or_callback.get("next"),
                error=observer_or_callback.get("error"),
                complete=observer_or_callback.get("complete"),
            )
        if callable(observer_or_callback):
            return Observer(next=observer_or_callback)
        raise TypeError(f"Not a valid observer: {observer_or_callback!r}")


class Subscription:
    def __init__(self, unsubscribe: Callable[[], None]) -> None:
        self._unsubscribe = unsubscribe
        self.closed = False

    def unsubscribe(self) -> None:
        if not self.closed:
            self.closed = True
            self._unsubscribe()

    # Allow ``with subject.subscribe(...)`` in tests and short-lived readers.
    def __enter__(self) -> "Subscription":
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.unsubscribe()


class BehaviorSubject(Generic[T]):
    def __init__(self, initial: T) -> None:
        self._value = initial
        self._observers: List[Observer[T]] = []
        self._completed = False

    @property
    def value(self) -> T:
        return self._value

    def subscribe(self, observer_or_callback: Union[Observer[T], Callable[[T], None], dict]) -> Subscription:
        observer = Observer.coerce(observer_or_callback)

        if self._completed:
            if observer.complete:
                observer.complete()
            return Subscription(lambda: None)

        self._observers.append(observer)

        # BehaviorSubject replays the current value to every new subscriber.
        if observer.next:
            observer.next(self._value)

        def _unsubscribe() -> None:
            try:
                self._observers.remove(observer)
            except ValueError:
                pass

        return Subscription(_unsubscribe)

    def next(self, value: T) -> None:
        if self._completed:
            return
        self._value = value
        # Copy first: an observer may unsubscribe from inside its own callback.
        for observer in list(self._observers):
            if observer.next:
                observer.next(value)

    def error(self, err: BaseException) -> None:
        if self._completed:
            return
        self._completed = True
        for observer in list(self._observers):
            if observer.error:
                observer.error(err)
        self._observers.clear()

    def complete(self) -> None:
        if self._completed:
            return
        self._completed = True
        for observer in list(self._observers):
            if observer.complete:
                observer.complete()
        self._observers.clear()

    @property
    def observer_count(self) -> int:
        return len(self._observers)
