"""Ten workers, one key: with and without cross-process coalescing.

    python examples/stampede_demo.py

Simulates a forked worker pool as N QueryClients sharing one L2 adapter — each
with its own L1, exactly as separate interpreters would have.
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ts_query import (  # noqa: E402
    InMemorySharedCacheAdapter,
    QueryClient,
    QueryClientConfig,
    QueryOptions,
    SharedCacheConfig,
)

WORKERS = 10


class Database:
    """L3. Counts how often it is actually hit."""

    def __init__(self) -> None:
        self.calls = 0

    async def fetch_user(self):
        self.calls += 1
        await asyncio.sleep(0.05)  # a slow-ish query
        return {"__typename": "User", "id": 1, "name": "Alice"}


async def run(single_flight: bool) -> int:
    adapter = InMemorySharedCacheAdapter()
    db = Database()

    workers = [
        QueryClient(
            QueryClientConfig(
                shared_cache=SharedCacheConfig(adapter=adapter, single_flight=single_flight)
            )
        )
        for _ in range(WORKERS)
    ]

    await asyncio.gather(
        *(
            worker.get_query(
                QueryOptions(query_key=["user", 1], query_fn=db.fetch_user)
            ).fetch()
            for worker in workers
        )
    )
    return db.calls


async def main() -> None:
    without = await run(single_flight=False)
    with_sf = await run(single_flight=True)

    print(f"{WORKERS} workers, {WORKERS} concurrent requests for the same key\n")
    print(f"  in-process dedup only      : {without:>2} database calls")
    print(f"  + distributed single-flight: {with_sf:>2} database call")
    print(
        "\nEach worker has its own L1, so in-process dedup cannot see across them."
        "\nThe SET NX lock in L2 is what collapses the herd."
    )


if __name__ == "__main__":
    asyncio.run(main())
