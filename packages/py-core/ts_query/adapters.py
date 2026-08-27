"""Shared cache (L2) adapters.

Both implement ``try_acquire`` so they can back the distributed single-flight in
single_flight.py, and both store raw ``JSON.stringify``-compatible strings under
raw query keys, so a Node ``QueryClient`` and this one can share one Redis.
"""

from __future__ import annotations

import time
import uuid
from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class _Entry:
    value: str
    expires_at_ms: float


class InMemorySharedCacheAdapter:
    """Process-local L2. Useful for tests, single-worker deployments, and dev.

    It cannot coalesce across processes — that is the whole point of using Redis
    in production — but it makes the single-flight logic exercisable without one.
    """

    def __init__(self) -> None:
        self._store: Dict[str, _Entry] = {}

    def _now_ms(self) -> float:
        return time.monotonic() * 1000

    async def get(self, key: str) -> Optional[str]:
        entry = self._store.get(key)
        if entry is None:
            return None
        if self._now_ms() > entry.expires_at_ms:
            self._store.pop(key, None)
            return None
        return entry.value

    async def set(self, key: str, value: str, ttl_ms: int) -> None:
        self._store[key] = _Entry(value=value, expires_at_ms=self._now_ms() + ttl_ms)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def clear(self) -> None:
        self._store.clear()

    async def try_acquire(self, key: str, ttl_ms: int) -> bool:
        # Single-threaded event loop + no await inside == atomic.
        if await self.get(key) is not None:
            return False
        await self.set(key, uuid.uuid4().hex, ttl_ms)
        return True

    # Test/debug helper.
    @property
    def store(self) -> Dict[str, _Entry]:
        return self._store


class RedisSharedCacheAdapter:
    """L2 backed by ``redis.asyncio``.

    ``redis`` is not a dependency of this package; pass a client you own::

        import redis.asyncio as aioredis
        adapter = RedisSharedCacheAdapter(aioredis.from_url("redis://localhost"))

    Keys are written unprefixed by default so they line up with the TypeScript
    ``QueryClient``. If you set ``namespace``, set the same prefix on the Node
    side or the two will not share entries.
    """

    def __init__(self, client: Any, *, namespace: str = "") -> None:
        self._client = client
        self._namespace = namespace

    def _k(self, key: str) -> str:
        return f"{self._namespace}{key}"

    @staticmethod
    def _decode(value: Any) -> Optional[str]:
        if value is None:
            return None
        return value.decode("utf-8") if isinstance(value, (bytes, bytearray)) else str(value)

    async def get(self, key: str) -> Optional[str]:
        return self._decode(await self._client.get(self._k(key)))

    async def set(self, key: str, value: str, ttl_ms: int) -> None:
        await self._client.set(self._k(key), value, px=ttl_ms)

    async def delete(self, key: str) -> None:
        await self._client.delete(self._k(key))

    async def clear(self) -> None:
        """Delete this namespace's keys. Refuses to run unnamespaced."""
        if not self._namespace:
            raise RuntimeError(
                "clear() without a namespace would FLUSHDB the shared Redis. "
                "Construct the adapter with namespace=... to enable it."
            )
        pattern = f"{self._namespace}*"
        async for key in self._client.scan_iter(match=pattern):
            await self._client.delete(key)

    async def try_acquire(self, key: str, ttl_ms: int) -> bool:
        """``SET key <token> NX PX ttl`` — the atomic primitive the whole
        cross-process coalescing rests on."""
        acquired = await self._client.set(self._k(key), uuid.uuid4().hex, nx=True, px=ttl_ms)
        return bool(acquired)
