"""Mirror of packages/core/src/__tests__/normalized-cache.test.ts."""

import asyncio

from helpers import AsyncSpy, Spy, tick

from ts_query import (
    UNDEFINED,
    NormalizedCache,
    NormalizedCacheConfig,
    QueryClient,
    QueryClientConfig,
    QueryOptions,
    TypePolicy,
)

# ########################################
# TEST INFRASTRUCTURE
# ########################################


def make_user(id, name):
    return {"__typename": "User", "id": id, "name": name}


def make_post(id, title, author):
    return {"__typename": "Post", "id": id, "title": title, "author": author}


def setup_cache_with(data, key, config=None):
    """Returns (cache, shape, data) — the CacheScenario builder."""
    cache = NormalizedCache(config)
    shape = cache.normalize(data, key)
    return cache, shape, data


async def setup_query_with(query_key, data):
    """Returns (client, query, query_fn, expected_data) — the QueryScenario builder."""
    client = QueryClient(QueryClientConfig(normalized_cache=NormalizedCacheConfig()))

    if isinstance(data, list):
        query_fn = AsyncSpy()
        for value in data:
            query_fn.resolves_once(value)
        expected = data[0]
    else:
        query_fn = AsyncSpy(data)
        expected = data

    query = client.get_query(QueryOptions(query_key=query_key, query_fn=query_fn, retry=0))
    await query.fetch()
    return client, query, query_fn, expected


class UpdateCollector:
    def __init__(self):
        self.updates = []

    def subscribe(self, query):
        query.subscribe({"next": lambda state: self.updates.append(state.data)})

    @property
    def latest(self):
        return self.updates[-1]

    @property
    def all(self):
        return list(self.updates)


def expect_affected_keys(actual, includes, excludes=None):
    for key in includes:
        assert key in actual
    for key in excludes or ():
        assert key not in actual
    if excludes is None:
        assert len(actual) == len(includes)


# ########################################
# NORMALIZEDCACHE UNIT TESTS
# ########################################


class TestNormalizeDenormalize:
    def test_normalizes_and_denormalizes_a_flat_object(self):
        cache, shape, data = setup_cache_with(make_user(1, "Alice"), "users:1")
        assert cache.denormalize(shape) == data

    def test_normalizes_and_reconstructs_nested_entities(self):
        post = make_post(10, "Hello", make_user(1, "Alice"))
        cache, shape, _ = setup_cache_with(post, "post:10")
        assert cache.denormalize(shape) == post

    def test_normalizes_and_reconstructs_arrays_of_entities(self):
        data = [make_user(1, "Alice"), make_user(2, "Bob")]
        cache, shape, _ = setup_cache_with(data, "users")
        assert cache.denormalize(shape) == data

    def test_returns_denormalized_value_for_any_shape(self):
        cache = NormalizedCache()
        plain_data = {"foo": "bar"}
        assert cache.denormalize(plain_data) == plain_data

    def test_passes_through_values_without_typename_unchanged(self):
        data = {"foo": "bar", "nested": {"baz": 42}}
        cache, shape, _ = setup_cache_with(data, "misc")
        assert cache.denormalize(shape) == data


class TestEntityDeduplication:
    def test_shares_entities_across_queries(self):
        cache = NormalizedCache()
        shape1 = cache.normalize(make_post(1, "First", make_user(42, "Alice")), "post:1")
        shape2 = cache.normalize(make_post(2, "Second", make_user(42, "Alice")), "post:2")

        # Both posts reference the same User:42 — update it once.
        cache.write_fragment("User", 42, {"name": "Alicia"})

        post1 = cache.denormalize(shape1)
        post2 = cache.denormalize(shape2)
        assert post1["author"]["name"] == "Alicia"
        assert post2["author"]["name"] == "Alicia"

    def test_merges_entity_fields_on_subsequent_writes(self):
        cache = NormalizedCache()
        cache.normalize(make_user(1, "Alice"), "u")
        cache.normalize({"__typename": "User", "id": 1, "email": "alice@example.com"}, "u2")

        user = cache.read_fragment("User", 1)
        assert user["id"] == 1
        assert user["name"] == "Alice"
        assert user["email"] == "alice@example.com"


class TestWriteFragment:
    def test_updates_an_entity_and_reflects_in_denormalization(self):
        cache, shape, _ = setup_cache_with(make_user(1, "Alice"), "user:1")
        cache.write_fragment("User", 1, {"name": "Bob"})
        assert cache.denormalize(shape)["name"] == "Bob"

    def test_returns_affected_query_keys(self):
        cache = NormalizedCache()
        cache.normalize(make_user(1, "Alice"), "user:1")
        cache.normalize(make_post(1, "Post", make_user(1, "Alice")), "post:1")

        affected_keys = cache.write_fragment("User", 1, {"name": "Bob"})
        expect_affected_keys(affected_keys, ["user:1", "post:1"])

    def test_notifies_entity_listeners(self):
        cache = NormalizedCache()
        listener = Spy()
        cache.subscribe_to_entity("User", 1, listener)

        cache.write_fragment("User", 1, {"id": 1, "name": "Alice"})
        assert listener.call_count == 1

    def test_does_not_return_keys_for_unrelated_entities(self):
        cache = NormalizedCache()
        cache.normalize(make_user(1, "Alice"), "user:1")
        cache.normalize(make_user(2, "Bob"), "user:2")

        affected_keys = cache.write_fragment("User", 2, {"name": "Robert"})
        expect_affected_keys(affected_keys, includes=["user:2"], excludes=["user:1"])


class TestReadFragment:
    def test_returns_undefined_for_unknown_entity(self):
        cache = NormalizedCache()
        assert cache.read_fragment("User", 99) is UNDEFINED

    def test_returns_cached_entity_after_normalize(self):
        cache = NormalizedCache()
        cache.normalize(make_user(1, "Alice"), "user:1")
        entity = cache.read_fragment("User", 1)
        assert entity["id"] == 1
        assert entity["name"] == "Alice"


class TestEvict:
    def test_removes_the_entity_from_the_store(self):
        cache, _shape, _ = setup_cache_with(make_user(1, "Alice"), "user:1")
        cache.evict("User", 1)
        assert cache.read_fragment("User", 1) is UNDEFINED

    def test_returns_affected_query_keys(self):
        cache = NormalizedCache()
        cache.normalize(make_user(1, "Alice"), "user:1")
        cache.normalize(make_post(1, "Post", make_user(1, "Alice")), "post:1")
        affected = cache.evict("User", 1)
        expect_affected_keys(affected, ["user:1", "post:1"])

    def test_denormalize_returns_undefined_for_evicted_entities(self):
        cache, shape, _ = setup_cache_with(make_user(1, "Alice"), "user:1")
        cache.evict("User", 1)
        assert cache.denormalize(shape) is UNDEFINED

    def test_notifies_entity_listeners_on_evict(self):
        cache = NormalizedCache()
        cache.normalize(make_user(1, "Alice"), "user:1")
        listener = Spy()
        cache.subscribe_to_entity("User", 1, listener)
        cache.evict("User", 1)
        assert listener.call_count == 1


class TestTypePolicy:
    def test_supports_custom_key_fields_string(self):
        data = {"__typename": "Product", "sku": "ABC-123", "price": 9.99}
        cache, _shape, _ = setup_cache_with(
            data,
            "product",
            NormalizedCacheConfig(type_policies={"Product": TypePolicy(key_fields="sku")}),
        )
        assert cache.read_fragment("Product", "ABC-123")["sku"] == "ABC-123"

    def test_supports_composite_key_fields_array(self):
        data = {
            "__typename": "OrgMember",
            "orgId": "org1",
            "userId": "user1",
            "role": "admin",
        }
        cache, shape, _ = setup_cache_with(
            data,
            "member",
            NormalizedCacheConfig(
                type_policies={"OrgMember": TypePolicy(key_fields=["orgId", "userId"])}
            ),
        )
        # Internal ref is "OrgMember:org1:user1".
        cache.write_fragment("OrgMember", "org1:user1", {"role": "owner"})
        assert cache.denormalize(shape)["role"] == "owner"

    def test_supports_custom_merge_function(self):
        feed1 = {"__typename": "Feed", "id": "1", "items": ["a", "b"]}
        cache, _shape, _ = setup_cache_with(
            feed1,
            "feed",
            NormalizedCacheConfig(
                type_policies={
                    "Feed": TypePolicy(
                        merge=lambda existing, incoming: {
                            **incoming,
                            "items": [*existing.get("items", []), *incoming.get("items", [])],
                        }
                    )
                }
            ),
        )
        feed2 = {"__typename": "Feed", "id": "1", "items": ["c"]}
        cache.normalize(feed2, "feed2")  # second write merges
        assert cache.read_fragment("Feed", "1")["items"] == ["a", "b", "c"]


class TestSubscribeToEntity:
    def test_unsubscribe_stops_notifications(self):
        cache = NormalizedCache()
        listener = Spy()
        unsub = cache.subscribe_to_entity("User", 1, listener)
        unsub()
        cache.write_fragment("User", 1, {"id": 1, "name": "Alice"})
        assert not listener.called


# ########################################
# QUERYCLIENT INTEGRATION TESTS
# ########################################


class TestQueryClientNormalizedCache:
    def make_client(self):
        return QueryClient(QueryClientConfig(normalized_cache=NormalizedCacheConfig()))

    async def test_write_fragment_pushes_updated_data_to_subscribed_queries(self):
        client, query, query_fn, _ = await setup_query_with("user:1", make_user(1, "Alice"))

        updates = UpdateCollector()
        updates.subscribe(query)

        client.write_fragment("User", 1, {"name": "Alicia"})

        assert updates.latest["name"] == "Alicia"
        # query_fn should NOT have been called again.
        assert query_fn.call_count == 1

    async def test_multiple_queries_sharing_an_entity_all_update_on_write_fragment(self):
        client = self.make_client()
        user = make_user(5, "Eve")

        q1 = client.get_query(
            QueryOptions(query_key="user:5:profile", query_fn=AsyncSpy(user), retry=0)
        )
        q2 = client.get_query(
            QueryOptions(
                query_key="post:1:author",
                query_fn=AsyncSpy(make_post(1, "Post", user)),
                retry=0,
            )
        )

        await asyncio.gather(q1.fetch(), q2.fetch())

        q1_updates = UpdateCollector()
        q2_updates = UpdateCollector()
        q1_updates.subscribe(q1)
        q2_updates.subscribe(q2)

        client.write_fragment("User", 5, {"name": "Evelyn"})

        assert q1_updates.latest["name"] == "Evelyn"
        assert q2_updates.latest["author"]["name"] == "Evelyn"

    async def test_read_fragment_returns_entity_after_query_fetch(self):
        client, _query, _fn, _ = await setup_query_with("user:7", make_user(7, "Dave"))
        entity = client.read_fragment("User", 7)
        assert entity["id"] == 7
        assert entity["name"] == "Dave"

    async def test_read_fragment_returns_undefined_when_not_configured(self):
        plain_client = QueryClient()
        assert plain_client.read_fragment("User", 1) is UNDEFINED

    async def test_evict_invalidates_referencing_queries_and_triggers_refetch(self):
        client, _query, query_fn, _ = await setup_query_with(
            "user:1", [make_user(1, "Alice"), make_user(1, "Alice (refreshed)")]
        )
        assert query_fn.call_count == 1

        client.evict("User", 1)
        await tick(5)

        assert query_fn.call_count == 2

    async def test_queries_without_normalized_cache_work_unchanged(self):
        plain_client = QueryClient()
        query_fn = AsyncSpy({"value": 42})
        query = plain_client.get_query(
            QueryOptions(query_key="data", query_fn=query_fn, retry=0)
        )
        data = await query.fetch()
        assert data == {"value": 42}

    async def test_subscribe_fragment_fires_on_write(self):
        """Python-side check of the useFragment hook's client-level entry point."""
        client, _query, _fn, _ = await setup_query_with("user:1", make_user(1, "Alice"))
        listener = Spy()

        unsubscribe = client.subscribe_fragment("User", 1, listener)
        client.write_fragment("User", 1, {"name": "Alicia"})
        assert listener.call_count == 1

        unsubscribe()
        client.write_fragment("User", 1, {"name": "Alice again"})
        assert listener.call_count == 1

    async def test_subscribe_fragment_is_a_noop_without_normalized_cache(self):
        plain_client = QueryClient()
        unsubscribe = plain_client.subscribe_fragment("User", 1, Spy())
        assert unsubscribe() is None
