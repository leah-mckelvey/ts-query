"""Cross-process request coalescing.

Node runs one process per instance, so the in-process ``_current_fetch`` check in
query.py is a complete answer to the stampeding herd. A Python service almost
never does: gunicorn/uvicorn fork N workers, so N concurrent requests for the
same key land in N separate interpreters, each with its own event loop and its
own empty L1. In-process dedup then gives you N L3 calls — exactly the problem
OBSERVABLE_ARCHITECTURE.md says observables solve.

The fix has to live where the workers actually share state: L2. One worker wins a
``SET NX PX`` lock and does the work; the others poll L2 for the result it
publishes. This is the one piece of the port that is not a translation of
existing TypeScript.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Awaitable, Callable, Optional, Protocol, runtime_checkable

from .types import SharedCacheAdapter

logger = logging.getLogger("ts_query.single_flight")

#: Sentinel for "L2 had nothing", so a cached ``None`` is not read as a miss.
CACHE_MISS = object()


@runtime_checkable
class SingleFlightAdapter(SharedCacheAdapter, Protocol):
    """A shared cache that can also hand out a short-lived exclusive lock."""

    async def try_acquire(self, key: str, ttl_ms: int) -> bool:
        """Atomically claim ``key``. True if this caller won the race.

        Redis: ``SET key <token> NX PX ttl_ms``.
        """
        ...


class DistributedSingleFlight:
    def __init__(
        self,
        adapter: SingleFlightAdapter,
        *,
        wait_ms: int = 5000,
        poll_interval_ms: int = 10,
        lock_ttl_ms: int = 30000,
        lock_suffix: str = ":__sf",
    ) -> None:
        self._adapter = adapter
        self._wait_ms = wait_ms
        self._poll_interval_ms = poll_interval_ms
        self._lock_ttl_ms = lock_ttl_ms
        self._lock_suffix = lock_suffix
        #: Observability hooks. ``fallbacks`` is worth alerting on: a nonzero
        #: rate means holders are dying or exceeding wait_ms, so the herd is
        #: getting through.
        self.executions = 0
        self.fallbacks = 0

    def lock_key(self, key: str) -> str:
        return f"{key}{self._lock_suffix}"

    async def run(
        self,
        key: str,
        fn: Callable[[], Awaitable[Any]],
        *,
        read: Callable[[], Awaitable[Any]],
        write: Callable[[Any], Awaitable[None]],
    ) -> Any:
        """Run ``fn`` at most once across all processes sharing this L2.

        ``read``/``write`` are supplied by the Query so that JSON handling and
        its error tolerance stay in one place.
        """
        lock_key = self.lock_key(key)

        if await self._try_acquire(lock_key):
            return await self._execute_as_holder(lock_key, fn, write)

        waited = await self._wait_for_holder(lock_key, read)
        if waited is not CACHE_MISS:
            return waited

        # The holder crashed, or was slower than wait_ms. Falling back to doing
        # the work ourselves is the right trade: a duplicated L3 call beats
        # failing the request.
        self.fallbacks += 1
        logger.warning("single-flight fallback for key %r; doing the work locally", key)
        return await self._execute_as_holder(lock_key, fn, write, acquired=False)

    # ##############################
    # INTERNAL
    # ##############################

    async def _try_acquire(self, lock_key: str) -> bool:
        try:
            return await self._adapter.try_acquire(lock_key, self._lock_ttl_ms)
        except Exception:  # noqa: BLE001 - a broken lock must not fail the query
            logger.warning("single-flight lock acquire failed for %r", lock_key, exc_info=True)
            return False

    async def _execute_as_holder(
        self,
        lock_key: str,
        fn: Callable[[], Awaitable[Any]],
        write: Callable[[Any], Awaitable[None]],
        acquired: bool = True,
    ) -> Any:
        self.executions += 1
        try:
            data = await fn()
        except Exception:
            if acquired:
                await self._release(lock_key)
            raise

        # Publish to L2 *before* releasing, so a waiter that sees the lock
        # disappear is guaranteed to find the value.
        await write(data)
        if acquired:
            await self._release(lock_key)
        return data

    async def _release(self, lock_key: str) -> None:
        try:
            await self._adapter.delete(lock_key)
        except Exception:  # noqa: BLE001 - lock expires on its own via TTL
            logger.warning("single-flight lock release failed for %r", lock_key, exc_info=True)

    async def _wait_for_holder(
        self, lock_key: str, read: Callable[[], Awaitable[Any]]
    ) -> Any:
        loop = asyncio.get_running_loop()
        deadline = loop.time() + self._wait_ms / 1000
        poll = self._poll_interval_ms / 1000

        while loop.time() < deadline:
            await asyncio.sleep(poll)

            cached = await read()
            if cached is not CACHE_MISS:
                return cached

            # Lock gone but no value: the holder died. Re-read once to close the
            # race where it wrote and released between our two checks.
            if not await self._lock_held(lock_key):
                return await read()

        return CACHE_MISS

    async def _lock_held(self, lock_key: str) -> bool:
        try:
            return await self._adapter.get(lock_key) is not None
        except Exception:  # noqa: BLE001
            return False


def _ensure_single_flight_capable(adapter: Any) -> SingleFlightAdapter:
    """Fail loudly at construction rather than mysteriously at fetch time."""
    if not hasattr(adapter, "try_acquire"):
        raise TypeError(
            "single_flight=True requires a shared cache adapter with an async "
            "try_acquire(key, ttl_ms) -> bool method (see RedisSharedCacheAdapter). "
            f"{type(adapter).__name__} does not implement it."
        )
    return adapter


def make_single_flight(config: Any) -> Optional[DistributedSingleFlight]:
    if not getattr(config, "single_flight", False):
        return None
    adapter = _ensure_single_flight_capable(config.adapter)
    return DistributedSingleFlight(adapter, wait_ms=config.single_flight_wait_ms)
