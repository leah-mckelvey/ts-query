"""Test doubles mirroring the vitest `vi.fn()` affordances the TS suite uses."""

from __future__ import annotations

import asyncio
from typing import Any, List, Optional, Tuple

_UNSET = object()


class Spy:
    """Synchronous call recorder — the equivalent of `vi.fn()` for callbacks."""

    def __init__(self, return_value: Any = None) -> None:
        self.calls: List[Tuple[tuple, dict]] = []
        self.return_value = return_value

    def __call__(self, *args: Any, **kwargs: Any) -> Any:
        self.calls.append((args, kwargs))
        return self.return_value

    @property
    def call_count(self) -> int:
        return len(self.calls)

    @property
    def called(self) -> bool:
        return bool(self.calls)

    def args_of(self, n: int = 0) -> tuple:
        return self.calls[n][0]

    @property
    def last_args(self) -> tuple:
        return self.calls[-1][0]

    def reset(self) -> None:
        self.calls.clear()


class AsyncSpy(Spy):
    """`vi.fn().mockResolvedValue(...)` and friends, as an awaitable."""

    def __init__(
        self,
        result: Any = _UNSET,
        *,
        error: Optional[BaseException] = None,
        side_effect: Any = None,
        delay_ms: int = 0,
    ) -> None:
        super().__init__()
        self._result = result
        self._error = error
        self._side_effect = side_effect
        self._delay_ms = delay_ms
        self._queue: List[Tuple[str, Any]] = []

    # Chainable, like the vitest builders.
    def resolves_once(self, value: Any) -> "AsyncSpy":
        self._queue.append(("value", value))
        return self

    def rejects_once(self, err: BaseException) -> "AsyncSpy":
        self._queue.append(("error", err))
        return self

    def resolves(self, value: Any) -> "AsyncSpy":
        self._result = value
        return self

    async def __call__(self, *args: Any, **kwargs: Any) -> Any:  # type: ignore[override]
        self.calls.append((args, kwargs))

        if self._delay_ms:
            await asyncio.sleep(self._delay_ms / 1000)

        if self._queue:
            kind, payload = self._queue.pop(0)
            if kind == "error":
                raise payload
            return payload

        if self._side_effect is not None:
            result = self._side_effect(*args, **kwargs)
            if asyncio.iscoroutine(result):
                result = await result
            return result

        if self._error is not None:
            raise self._error

        if self._result is _UNSET:
            return None
        return self._result


class SpyAdapter:
    """Wraps a shared cache adapter and records every call, like the TS mock."""

    def __init__(self, inner: Any) -> None:
        self._inner = inner
        self.get = Spy()
        self.set = Spy()
        self.delete = Spy()
        self.clear_spy = Spy()
        #: Set to an exception to make that method fail, as in the TS
        #: "gracefully handle ... errors" tests.
        self.get_error: Optional[BaseException] = None
        self.set_error: Optional[BaseException] = None
        self.clear_error: Optional[BaseException] = None
        #: Force a canned value out of get() without touching the inner store.
        self.get_override: Any = _UNSET
        self.supports_clear = True

    async def __call__(self) -> None:  # pragma: no cover - not used
        raise NotImplementedError

    async def get_impl(self, key: str) -> Any:
        self.get(key)
        if self.get_error:
            raise self.get_error
        if self.get_override is not _UNSET:
            return self.get_override
        return await self._inner.get(key)

    async def set_impl(self, key: str, value: str, ttl_ms: int) -> None:
        self.set(key, value, ttl_ms)
        if self.set_error:
            raise self.set_error
        await self._inner.set(key, value, ttl_ms)

    async def delete_impl(self, key: str) -> None:
        self.delete(key)
        await self._inner.delete(key)

    async def clear_impl(self) -> None:
        self.clear_spy()
        if self.clear_error:
            raise self.clear_error
        await self._inner.clear()

    async def try_acquire(self, key: str, ttl_ms: int) -> bool:
        return await self._inner.try_acquire(key, ttl_ms)


def make_spy_adapter(inner: Any, *, with_clear: bool = True) -> Any:
    """Build an adapter object whose get/set/delete are recording Spies.

    Returned object satisfies the SharedCacheAdapter protocol; the Spy for each
    method is reachable as ``adapter.get_spy`` etc.
    """
    spy = SpyAdapter(inner)

    class _Adapter:
        get_spy = spy.get
        set_spy = spy.set
        delete_spy = spy.delete
        clear_spy = spy.clear_spy
        control = spy

        async def get(self, key: str) -> Any:
            return await spy.get_impl(key)

        async def set(self, key: str, value: str, ttl_ms: int) -> None:
            await spy.set_impl(key, value, ttl_ms)

        async def delete(self, key: str) -> None:
            await spy.delete_impl(key)

        async def try_acquire(self, key: str, ttl_ms: int) -> bool:
            return await spy.try_acquire(key, ttl_ms)

    if with_clear:
        async def clear(self: Any) -> None:
            await spy.clear_impl()

        _Adapter.clear = clear  # type: ignore[attr-defined]

    return _Adapter()


async def tick(times: int = 3) -> None:
    """Let pending tasks make progress — the equivalent of `await setTimeout(0)`."""
    for _ in range(times):
        await asyncio.sleep(0)
