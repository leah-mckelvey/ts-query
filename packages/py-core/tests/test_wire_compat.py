"""The bridge contract: Python and the TypeScript core must agree byte-for-byte.

A shared Redis is only useful if both sides derive the same cache key from the
same query key, and encode payloads identically. These tests run the *actual*
expressions from packages/core/src through node and compare:

  - query-client.ts:53  `typeof key === 'string' ? key : JSON.stringify(key)`
  - query.ts            `JSON.stringify(data)` on write, `JSON.parse` on read

They are skipped when node is unavailable, so the suite still runs standalone.
"""

import json
import shutil
import subprocess

import pytest

from ts_query import dumps, serialize_query_key

node = shutil.which("node")
requires_node = pytest.mark.skipif(node is None, reason="node is not installed")

# (python value, equivalent JS source)
PAYLOAD_CASES = [
    ({"id": 1, "name": "Test"}, '{"id": 1, "name": "Test"}'),
    ("data", '"data"'),
    (42, "42"),
    (9.99, "9.99"),
    (True, "true"),
    (False, "false"),
    (None, "null"),
    ([], "[]"),
    ({}, "{}"),
    ([1, "two", None, True], '[1, "two", null, true]'),
    ({"nested": {"deep": ["a", {"b": 2}]}}, '{"nested": {"deep": ["a", {"b": 2}]}}'),
    ({"name": "café", "emoji": "🎯"}, '{"name": "café", "emoji": "🎯"}'),
    ({"__typename": "User", "id": 42, "name": "Alice"}, '{"__typename": "User", "id": 42, "name": "Alice"}'),
    ({"a": "quote\"and\\slash"}, '{"a": "quote\\"and\\\\slash"}'),
    ({"tab": "a\tb\nc"}, '{"tab": "a\\tb\\nc"}'),
]

KEY_CASES = [
    ("users", '"users"'),
    (["users"], '["users"]'),
    (["user", 1], '["user", 1]'),
    (["user", 2], '["user", 2]'),
    (["posts", {"page": 2, "limit": 10}], '["posts", {"page": 2, "limit": 10}]'),
    (["user", 1, "posts", None], '["user", 1, "posts", null]'),
    (["search", "café"], '["search", "café"]'),
]


def run_node(script: str) -> list:
    result = subprocess.run(
        [node, "-e", script], capture_output=True, text=True, timeout=30, check=True
    )
    return json.loads(result.stdout)


@requires_node
def test_payload_encoding_matches_json_stringify():
    """What Python writes to L2 is exactly what Node would have written."""
    sources = ", ".join(src for _value, src in PAYLOAD_CASES)
    expected = run_node(
        f"const cases = [{sources}];"
        "console.log(JSON.stringify(cases.map((c) => JSON.stringify(c))));"
    )

    actual = [dumps(value) for value, _src in PAYLOAD_CASES]

    assert actual == expected


@requires_node
def test_query_key_serialization_matches_the_ts_client():
    """Same query key -> same L2 cache key on both sides of the bridge."""
    sources = ", ".join(src for _value, src in KEY_CASES)
    expected = run_node(
        f"const cases = [{sources}];"
        # Verbatim from QueryClient.getQueryKey in query-client.ts.
        "const getQueryKey = (key) => (typeof key === 'string' ? key : JSON.stringify(key));"
        "console.log(JSON.stringify(cases.map(getQueryKey)));"
    )

    actual = [serialize_query_key(value) for value, _src in KEY_CASES]

    assert actual == expected


@requires_node
def test_node_can_parse_what_python_wrote():
    """Round trip: Python -> L2 -> Node's JSON.parse."""
    payloads = [dumps(value) for value, _src in PAYLOAD_CASES]
    encoded = json.dumps(payloads)

    reparsed = run_node(
        f"const written = {encoded};"
        "console.log(JSON.stringify(written.map((s) => JSON.parse(s))));"
    )

    assert reparsed == [value for value, _src in PAYLOAD_CASES]


@requires_node
def test_python_can_parse_what_node_wrote():
    """Round trip: Node -> L2 -> Python's json.loads."""
    sources = ", ".join(src for _value, src in PAYLOAD_CASES)
    written = run_node(
        f"const cases = [{sources}];"
        "console.log(JSON.stringify(cases.map((c) => JSON.stringify(c))));"
    )

    assert [json.loads(s) for s in written] == [value for value, _src in PAYLOAD_CASES]


def test_array_and_string_keys_follow_the_ts_branch():
    """Runs without node: string keys pass through, everything else is JSON."""
    assert serialize_query_key("users") == "users"  # not '"users"'
    assert serialize_query_key(["user", 1]) == '["user",1]'
    assert serialize_query_key(("user", 1)) == '["user",1]'  # tuples too


def test_encoding_has_no_incidental_whitespace():
    """`JSON.stringify` emits no spaces; a separator slip would silently break L2."""
    assert dumps({"a": 1, "b": [1, 2]}) == '{"a":1,"b":[1,2]}'


def test_non_ascii_is_not_escaped():
    """Python's default `ensure_ascii=True` would produce \\u00e9 and miss the cache."""
    assert dumps("café") == '"café"'
