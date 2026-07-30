import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NormalizedCache } from '../normalized-cache';
import { QueryClient } from '../query-client';

// ########################################
// TEST INFRASTRUCTURE
// ########################################

// ##############################
// Test Data Factories
// ##############################

function makeUser(id: number, name: string) {
  return { __typename: 'User', id, name };
}

function makePost(
  id: number,
  title: string,
  author: ReturnType<typeof makeUser>,
) {
  return { __typename: 'Post', id, title, author };
}

// ##############################
// Test Scenario Builders
// ##############################

// ####################
// Cache Scenarios
// ####################

type CacheScenario<T> = {
  cache: NormalizedCache;
  shape: unknown;
  data: T;
};

function setupCacheWith<T>(
  data: T,
  key: string,
  config?: ConstructorParameters<typeof NormalizedCache>[0],
): CacheScenario<T> {
  const cache = new NormalizedCache(config);
  const shape = cache.normalize(data, key);
  return { cache, shape, data };
}

// ####################
// Query Scenarios
// ####################

type QueryScenario<T> = {
  client: QueryClient;
  query: ReturnType<QueryClient['getQuery']>;
  queryFn: ReturnType<typeof vi.fn>;
  expectedData: T;
};

async function setupQueryWith<T>(
  queryKey: string,
  data: T | T[],
): Promise<QueryScenario<T>> {
  const client = new QueryClient({ normalizedCache: {} });
  const queryFn = Array.isArray(data)
    ? vi.fn()
    : vi.fn().mockResolvedValue(data);

  if (Array.isArray(data)) {
    data.forEach((value) => queryFn.mockResolvedValueOnce(value));
  }

  const query = client.getQuery({ queryKey, queryFn, retry: 0 });
  await query.fetch();
  return {
    client,
    query,
    queryFn,
    expectedData: Array.isArray(data) ? data[0] : data,
  };
}

// ##############################
// Test Utilities
// ##############################

class UpdateCollector<T> {
  private updates: T[] = [];

  subscribe(query: ReturnType<QueryClient['getQuery']>) {
    query.subscribe({ next: (state) => this.updates.push(state.data as T) });
  }

  get latest(): T {
    return this.updates.at(-1)!;
  }

  get all(): readonly T[] {
    return this.updates;
  }
}

function expectAffectedKeys(
  actual: string[],
  expected: { includes: string[]; excludes?: string[] },
) {
  expected.includes.forEach((key) => expect(actual).toContain(key));
  expected.excludes?.forEach((key) => expect(actual).not.toContain(key));
  if (expected.excludes === undefined) {
    expect(actual).toHaveLength(expected.includes.length);
  }
}

// ########################################
// NORMALIZEDCACHE UNIT TESTS
// ########################################

describe('NormalizedCache', () => {
  // ##############################
  // Core Normalization/Denormalization
  // ##############################

  describe('normalize / denormalize', () => {
    it('normalizes and denormalizes a flat object', () => {
      const { cache, shape, data } = setupCacheWith(
        makeUser(1, 'Alice'),
        'users:1',
      );
      expect(cache.denormalize(shape)).toEqual(data);
    });

    it('normalizes and reconstructs nested entities', () => {
      const post = makePost(10, 'Hello', makeUser(1, 'Alice'));
      const { cache, shape } = setupCacheWith(post, 'post:10');
      expect(cache.denormalize(shape)).toEqual(post);
    });

    it('normalizes and reconstructs arrays of entities', () => {
      const data = [makeUser(1, 'Alice'), makeUser(2, 'Bob')];
      const { cache, shape } = setupCacheWith(data, 'users');
      expect(cache.denormalize(shape)).toEqual(data);
    });

    it('returns denormalized value for any shape', () => {
      const cache = new NormalizedCache();
      const plainData = { foo: 'bar' };
      expect(cache.denormalize(plainData)).toEqual(plainData);
    });

    it('passes through values without __typename unchanged', () => {
      const data = { foo: 'bar', nested: { baz: 42 } };
      const { cache, shape } = setupCacheWith(data, 'misc');
      expect(cache.denormalize(shape)).toEqual(data);
    });
  });

  // ##############################
  // Entity Deduplication & Merging
  // ##############################

  describe('entity deduplication', () => {
    it('shares entities across queries', () => {
      const cache = new NormalizedCache();
      const shape1 = cache.normalize(
        makePost(1, 'First', makeUser(42, 'Alice')),
        'post:1',
      );
      const shape2 = cache.normalize(
        makePost(2, 'Second', makeUser(42, 'Alice')),
        'post:2',
      );

      // Both posts reference the same User:42 — update it once
      cache.writeFragment('User', 42, { name: 'Alicia' });

      const post1 = cache.denormalize(shape1) as ReturnType<typeof makePost>;
      const post2 = cache.denormalize(shape2) as ReturnType<typeof makePost>;
      expect((post1.author as { name: string }).name).toBe('Alicia');
      expect((post2.author as { name: string }).name).toBe('Alicia');
    });

    it('merges entity fields on subsequent writes', () => {
      const cache = new NormalizedCache();
      cache.normalize(makeUser(1, 'Alice'), 'u');
      cache.normalize(
        { __typename: 'User', id: 1, email: 'alice@example.com' },
        'u2',
      );

      const user = cache.readFragment('User', 1);
      expect(user).toMatchObject({
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
      });
    });
  });

  // ##############################
  // Fragment Operations
  // ##############################

  // ####################
  // writeFragment
  // ####################

  describe('writeFragment', () => {
    it('updates an entity and reflects in denormalization', () => {
      const { cache, shape } = setupCacheWith(makeUser(1, 'Alice'), 'user:1');
      cache.writeFragment('User', 1, { name: 'Bob' });
      expect((cache.denormalize(shape) as { name: string }).name).toBe('Bob');
    });

    it('returns affected query keys', () => {
      const cache = new NormalizedCache();
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makePost(1, 'Post', makeUser(1, 'Alice')), 'post:1');

      const affectedKeys = cache.writeFragment('User', 1, { name: 'Bob' });
      expectAffectedKeys(affectedKeys, { includes: ['user:1', 'post:1'] });
    });

    it('notifies entity listeners', () => {
      const cache = new NormalizedCache();
      const listener = vi.fn();
      cache.subscribeToEntity('User', 1, listener);

      cache.writeFragment('User', 1, { id: 1, name: 'Alice' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not return keys for unrelated entities', () => {
      const cache = new NormalizedCache();
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makeUser(2, 'Bob'), 'user:2');

      const affectedKeys = cache.writeFragment('User', 2, { name: 'Robert' });
      expectAffectedKeys(affectedKeys, {
        includes: ['user:2'],
        excludes: ['user:1'],
      });
    });
  });

  // ####################
  // readFragment
  // ####################

  describe('readFragment', () => {
    it('returns undefined for unknown entity', () => {
      const cache = new NormalizedCache();
      expect(cache.readFragment('User', 99)).toBeUndefined();
    });

    it('returns cached entity after normalize', () => {
      const cache = new NormalizedCache();
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      expect(cache.readFragment('User', 1)).toMatchObject({
        id: 1,
        name: 'Alice',
      });
    });
  });

  // ##############################
  // Entity Eviction
  // ##############################

  describe('evict', () => {
    it('removes the entity from the store', () => {
      const { cache } = setupCacheWith(makeUser(1, 'Alice'), 'user:1');
      cache.evict('User', 1);
      expect(cache.readFragment('User', 1)).toBeUndefined();
    });

    it('returns affected query keys', () => {
      const cache = new NormalizedCache();
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makePost(1, 'Post', makeUser(1, 'Alice')), 'post:1');
      const affected = cache.evict('User', 1);
      expectAffectedKeys(affected, { includes: ['user:1', 'post:1'] });
    });

    it('denormalize returns undefined for evicted entities', () => {
      const { cache, shape } = setupCacheWith(makeUser(1, 'Alice'), 'user:1');
      cache.evict('User', 1);
      expect(cache.denormalize(shape)).toBeUndefined();
    });

    it('notifies entity listeners on evict', () => {
      const cache = new NormalizedCache();
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      const listener = vi.fn();
      cache.subscribeToEntity('User', 1, listener);
      cache.evict('User', 1);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // ##############################
  // Type Policies
  // ##############################

  describe('TypePolicy', () => {
    it('supports custom keyFields string', () => {
      const data = { __typename: 'Product', sku: 'ABC-123', price: 9.99 };
      const { cache } = setupCacheWith(data, 'product', {
        typePolicies: { Product: { keyFields: 'sku' } },
      });
      expect(cache.readFragment('Product', 'ABC-123')).toMatchObject({
        sku: 'ABC-123',
      });
    });

    it('supports composite keyFields array', () => {
      const data = {
        __typename: 'OrgMember',
        orgId: 'org1',
        userId: 'user1',
        role: 'admin',
      };
      const { cache, shape } = setupCacheWith(data, 'member', {
        typePolicies: { OrgMember: { keyFields: ['orgId', 'userId'] } },
      });
      // Internal ref is "OrgMember:org1:user1"
      cache.writeFragment('OrgMember', 'org1:user1', { role: 'owner' });
      expect((cache.denormalize(shape) as typeof data).role).toBe('owner');
    });

    it('supports custom merge function', () => {
      const feed1 = { __typename: 'Feed', id: '1', items: ['a', 'b'] };
      const { cache } = setupCacheWith(feed1, 'feed', {
        typePolicies: {
          Feed: {
            merge: (existing, incoming) => ({
              ...incoming,
              items: [
                ...((existing.items as unknown[]) ?? []),
                ...((incoming.items as unknown[]) ?? []),
              ],
            }),
          },
        },
      });
      const feed2 = { __typename: 'Feed', id: '1', items: ['c'] };
      cache.normalize(feed2, 'feed2'); // second write merges
      const result = cache.readFragment('Feed', '1') as { items: string[] };
      expect(result.items).toEqual(['a', 'b', 'c']);
    });
  });

  // ##############################
  // Entity Subscriptions
  // ##############################

  describe('subscribeToEntity', () => {
    it('unsubscribe stops notifications', () => {
      const cache = new NormalizedCache();
      const listener = vi.fn();
      const unsub = cache.subscribeToEntity('User', 1, listener);
      unsub();
      cache.writeFragment('User', 1, { id: 1, name: 'Alice' });
      expect(listener).not.toHaveBeenCalled();
    });
  });
});

// ########################################
// QUERYCLIENT INTEGRATION TESTS
// ########################################

describe('QueryClient + normalized cache', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      normalizedCache: {},
    });
  });

  // ##############################
  // Fragment Operations Integration
  // ##############################

  // ####################
  // writeFragment
  // ####################

  it('writeFragment pushes updated data to subscribed queries', async () => {
    const { client, query, queryFn } = await setupQueryWith(
      'user:1',
      makeUser(1, 'Alice'),
    );

    const updates = new UpdateCollector<ReturnType<typeof makeUser>>();
    updates.subscribe(query);

    client.writeFragment('User', 1, { name: 'Alicia' });

    expect(updates.latest.name).toBe('Alicia');
    // queryFn should NOT have been called again
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('multiple queries sharing an entity all update on writeFragment', async () => {
    const user = makeUser(5, 'Eve');
    const q1 = client.getQuery({
      queryKey: 'user:5:profile',
      queryFn: vi.fn().mockResolvedValue(user),
      retry: 0,
    });
    const q2 = client.getQuery({
      queryKey: 'post:1:author',
      queryFn: vi.fn().mockResolvedValue(makePost(1, 'Post', user)),
      retry: 0,
    });

    await Promise.all([q1.fetch(), q2.fetch()]);

    const q1Updates = new UpdateCollector<ReturnType<typeof makeUser>>();
    const q2Updates = new UpdateCollector<ReturnType<typeof makePost>>();
    q1Updates.subscribe(q1);
    q2Updates.subscribe(q2);

    client.writeFragment('User', 5, { name: 'Evelyn' });

    expect(q1Updates.latest.name).toBe('Evelyn');
    expect((q2Updates.latest.author as { name: string }).name).toBe('Evelyn');
  });

  // ####################
  // readFragment
  // ####################

  it('readFragment returns entity after query fetch', async () => {
    const { client } = await setupQueryWith('user:7', makeUser(7, 'Dave'));
    expect(client.readFragment('User', 7)).toMatchObject({
      id: 7,
      name: 'Dave',
    });
  });

  it('readFragment returns undefined when normalized cache is not configured', async () => {
    const plainClient = new QueryClient();
    expect(plainClient.readFragment('User', 1)).toBeUndefined();
  });

  // ##############################
  // Eviction & Cache Invalidation
  // ##############################

  it('evict invalidates referencing queries and triggers refetch', async () => {
    const { client, queryFn } = await setupQueryWith('user:1', [
      makeUser(1, 'Alice'),
      makeUser(1, 'Alice (refreshed)'),
    ]);
    expect(queryFn).toHaveBeenCalledTimes(1);

    client.evict('User', 1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  // ##############################
  // LRU Eviction (memory bound)
  // ##############################

  describe('LRU eviction', () => {
    it('evicts the least-recently-used entity once maxEntities is exceeded', () => {
      const cache = new NormalizedCache({ maxEntities: 2 });
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makeUser(2, 'Bob'), 'user:2');
      cache.normalize(makeUser(3, 'Carol'), 'user:3'); // over cap -> evict User:1

      expect(cache.size()).toBe(2);
      expect(cache.readFragment('User', 1)).toBeUndefined();
      expect(cache.readFragment('User', 2)).toBeDefined();
      expect(cache.readFragment('User', 3)).toBeDefined();
    });

    it('spares an entity that was recently read (denormalize refreshes recency)', () => {
      const cache = new NormalizedCache({ maxEntities: 2 });
      const shape1 = cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makeUser(2, 'Bob'), 'user:2');

      // Re-read User:1 so it becomes most-recently-used, ahead of User:2.
      cache.denormalize(shape1);

      cache.normalize(makeUser(3, 'Carol'), 'user:3'); // evict LRU -> User:2

      expect(cache.readFragment('User', 1)).toBeDefined();
      expect(cache.readFragment('User', 2)).toBeUndefined();
      expect(cache.readFragment('User', 3)).toBeDefined();
    });

    it('refreshes recency on write, sparing a re-written entity', () => {
      const cache = new NormalizedCache({ maxEntities: 2 });
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makeUser(2, 'Bob'), 'user:2');
      cache.writeFragment('User', 1, { name: 'Alice II' }); // touch User:1
      cache.normalize(makeUser(3, 'Carol'), 'user:3'); // evict LRU -> User:2

      expect(cache.readFragment('User', 1)).toBeDefined();
      expect(cache.readFragment('User', 2)).toBeUndefined();
    });

    it('denormalize returns undefined for an LRU-evicted entity', () => {
      const cache = new NormalizedCache({ maxEntities: 1 });
      const shape1 = cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.normalize(makeUser(2, 'Bob'), 'user:2'); // evicts User:1
      expect(cache.denormalize(shape1)).toBeUndefined();
    });

    it('treats Infinity as unbounded (never evicts)', () => {
      const cache = new NormalizedCache({ maxEntities: Infinity });
      for (let i = 0; i < 50; i++) {
        cache.normalize(makeUser(i, `U${i}`), `user:${i}`);
      }
      expect(cache.size()).toBe(50);
    });

    it('falls back to the default cap for a non-positive maxEntities', () => {
      // 0 is a meaningless cap; the cache must not evict everything.
      const cache = new NormalizedCache({ maxEntities: 0 });
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      expect(cache.size()).toBe(1);
    });

    it('never evicts an entity pinned by an active query', async () => {
      const client = new QueryClient({ normalizedCache: { maxEntities: 1 } });

      const activeFn = vi.fn().mockResolvedValue(makeUser(1, 'Alice'));
      const active = client.getQuery({
        queryKey: 'user:1',
        queryFn: activeFn,
        retry: 0,
      });
      await active.fetch();
      active.subscribe(() => {}); // mount -> User:1 is pinned

      // A second query normalizes User:2, pushing us over the cap of 1.
      const otherFn = vi.fn().mockResolvedValue(makeUser(2, 'Bob'));
      const other = client.getQuery({
        queryKey: 'user:2',
        queryFn: otherFn,
        retry: 0,
      });
      await other.fetch();

      // User:1 is pinned by its active subscriber, so the (unpinned) User:2 is
      // evicted instead even though User:1 is older.
      expect(client.readFragment('User', 1)).toBeDefined();
      expect(client.readFragment('User', 2)).toBeUndefined();
    });

    it('exceeds the cap rather than evict when every over-cap entity is pinned (soft limit)', async () => {
      const client = new QueryClient({ normalizedCache: { maxEntities: 1 } });

      // Subscribe *before* awaiting the fetch — this mirrors how the framework
      // adapters drive a query (subscribing auto-triggers the fetch), so the
      // query has an active subscriber at the moment its data is normalized and
      // its entity is therefore pinned during capacity enforcement.
      const fnA = vi.fn().mockResolvedValue(makeUser(1, 'Alice'));
      const a = client.getQuery({ queryKey: 'user:1', queryFn: fnA, retry: 0 });
      a.subscribe(() => {});
      await a.fetch();

      const fnB = vi.fn().mockResolvedValue(makeUser(2, 'Bob'));
      const b = client.getQuery({ queryKey: 'user:2', queryFn: fnB, retry: 0 });
      b.subscribe(() => {});
      await b.fetch(); // normalizes User:2 over the cap while both queries are active

      // Both entities are pinned by active subscribers, so neither may be
      // evicted; the store holds two despite the cap of one.
      expect(client.readFragment('User', 1)).toBeDefined();
      expect(client.readFragment('User', 2)).toBeDefined();
    });

    it('never evicts an entity with a live fragment listener', () => {
      const cache = new NormalizedCache({ maxEntities: 1 });
      cache.normalize(makeUser(1, 'Alice'), 'user:1');
      cache.subscribeToEntity('User', 1, () => {}); // useFragment-style pin
      cache.normalize(makeUser(2, 'Bob'), 'user:2'); // over cap

      // User:1 is pinned by its listener; User:2 is evicted despite being newer.
      expect(cache.readFragment('User', 1)).toBeDefined();
      expect(cache.readFragment('User', 2)).toBeUndefined();
    });

    it('does not corrupt an inactive query snapshot when a shared entity is evicted then a co-referenced entity is written', async () => {
      const client = new QueryClient({ normalizedCache: { maxEntities: 2 } });

      // Inactive query holds Post:1 { author: User:1 }. Normalization inserts the
      // nested User:1 first, then Post:1 — so User:1 is the least-recently-used.
      const postFn = vi
        .fn()
        .mockResolvedValue(makePost(1, 'Hello', makeUser(1, 'Alice')));
      const postQuery = client.getQuery({
        queryKey: 'post:1',
        queryFn: postFn,
        retry: 0,
      });
      await postQuery.fetch(); // inactive — no subscribers

      // Push over the cap of 2 → LRU evicts the unpinned User:1; Post:1 survives.
      await client
        .getQuery({
          queryKey: 'user:2',
          queryFn: vi.fn().mockResolvedValue(makeUser(2, 'Bob')),
          retry: 0,
        })
        .fetch();
      expect(client.readFragment('User', 1)).toBeUndefined(); // confirm eviction

      // Writing the surviving, co-referenced Post:1 must NOT recompute the
      // inactive query through the now-dangling User:1 ref and blank its author.
      client.writeFragment('Post', 1, { title: 'Updated' });

      const data = postQuery.state.data as ReturnType<typeof makePost>;
      // The inactive query keeps its intact snapshot (no hole)…
      expect(data.author).toEqual(makeUser(1, 'Alice'));
      // …and is not live-updated while unsubscribed (it revalidates on next fetch).
      expect(data.title).toBe('Hello');
    });

    it('does not refetch inactive queries when their entity is evicted', async () => {
      const client = new QueryClient({ normalizedCache: { maxEntities: 1 } });

      const firstFn = vi.fn().mockResolvedValue(makeUser(1, 'Alice'));
      const first = client.getQuery({
        queryKey: 'user:1',
        queryFn: firstFn,
        retry: 0,
      });
      await first.fetch(); // inactive (no subscribers) after this

      const secondFn = vi.fn().mockResolvedValue(makeUser(2, 'Bob'));
      const second = client.getQuery({
        queryKey: 'user:2',
        queryFn: secondFn,
        retry: 0,
      });
      await second.fetch(); // evicts User:1 from the shared store

      // Eviction must not trigger a background refetch of the inactive query;
      // its own state.data snapshot remains intact.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(firstFn).toHaveBeenCalledTimes(1);
      expect(first.state.data).toEqual(makeUser(1, 'Alice'));
    });
  });

  // ##############################
  // Backwards Compatibility
  // ##############################

  it('queries without normalized cache work unchanged', async () => {
    const plainClient = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue({ value: 42 });
    const query = plainClient.getQuery({ queryKey: 'data', queryFn, retry: 0 });
    const data = await query.fetch();
    expect(data).toEqual({ value: 42 });
  });
});
