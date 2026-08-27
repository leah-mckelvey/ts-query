"""Wire-compatible serialization shared with the TypeScript core.

The Python service and the TypeScript ``QueryClient`` must agree byte-for-byte on
two things or a shared L2 (Redis) is useless: how a query key becomes a cache
key, and how a payload becomes a cached string. Both mirror ``JSON.stringify``.
"""

from __future__ import annotations

import json
from typing import Any, Sequence, Union

QueryKey = Union[str, Sequence[Any]]


def dumps(value: Any) -> str:
    """``JSON.stringify`` equivalent: no spaces, no ASCII escaping."""
    return json.dumps(value, separators=(",", ":"), ensure_ascii=False)


def serialize_query_key(key: QueryKey) -> str:
    """Mirror of ``QueryClient.getQueryKey`` in query-client.ts.

    Strings pass through untouched; everything else is JSON-encoded, so
    ``["user", 1]`` becomes ``["user",1]`` on both sides of the bridge.
    """
    if isinstance(key, str):
        return key
    return dumps(list(key))
