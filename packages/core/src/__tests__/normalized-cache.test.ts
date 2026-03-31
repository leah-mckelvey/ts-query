import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NormalizedCache } from '../normalized-cache';
import { QueryClient } from '../query-client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeUser(id: number, name: string) {
  return { __typename: 'User', id, name };
}

function makePost(id: number, title: string, author: ReturnType<typeof makeUser>) {
  return { __typename: 'Post', id, title, author };
}

// ---------------------------------------------------------------------------
// NormalizedCache unit tests
// ---------------------------------------------------------------------------

describe('NormalizedCache', () => {
  describe('writeQuery / readQuery', () => {
    it('stores and retrieves a flat object', () => {
      const cache = new NormalizedCache();
      const data = makeUser(1, 'Alice');
      cache.writeQuery('users:1', data);
      expect(cache.readQuery('users:1')).toEqual(data);
    });

    it('stores and reconstructs nested entities', () => {
      const cache = new NormalizedCache();
      const post = makePost(10, 'Hello', makeUser(1, 'Alice'));
      cache.writeQuery('post:10', post);
      expect(cache.readQuery('post:10')).toEqual(post);
    });

    it('stores and reconstructs arrays of entities', () => {
      const cache = new NormalizedCache();
      const data = [makeUser(1, 'Alice'), makeUser(2, 'Bob')];
      cache.writeQuery('users', data);
      expect(cache.readQuery('users')).toEqual(data);
    });

    it('returns undefined for unknown query key', () => {
      const cache = new NormalizedCache();
      expect(cache.readQuery('missing')).toBeUndefined();
    });

    it('passes through values without __typename unchanged', () => {
      const cache = new NormalizedCache();
      const data = { foo: 'bar', nested: { baz: 42 } };
      cache.writeQuery('misc', data);
      expect(cache.readQuery('misc')).toEqual(data);
    });
  });

  describe('entity deduplication', () => {
    it('shares entities across queries', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('post:1', makePost(1, 'First', makeUser(42, 'Alice')));
      cache.writeQuery('post:2', makePost(2, 'Second', makeUser(42, 'Alice')));

      // Both posts reference the same User:42 — update it once
      cache.writeFragment('User', 42, { name: 'Alicia' });

      const post1 = cache.readQuery('post:1') as ReturnType<typeof makePost>;
      const post2 = cache.readQuery('post:2') as ReturnType<typeof makePost>;
      expect((post1.author as { name: string }).name).toBe('Alicia');
      expect((post2.author as { name: string }).name).toBe('Alicia');
    });

    it('merges entity fields on subsequent writes', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('u', makeUser(1, 'Alice'));
      cache.writeQuery('u2', { __typename: 'User', id: 1, email: 'alice@example.com' });

      const user = cache.readFragment('User', 1);
      expect(user).toMatchObject({ id: 1, name: 'Alice', email: 'alice@example.com' });
    });
  });

  describe('writeFragment', () => {
    it('updates an entity and reflects in readQuery', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      cache.writeFragment('User', 1, { name: 'Bob' });
      expect((cache.readQuery('user:1') as { name: string }).name).toBe('Bob');
    });

    it('notifies query listeners', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));

      const listener = vi.fn();
      cache.registerQueryListener('user:1', listener);

      cache.writeFragment('User', 1, { name: 'Bob' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('notifies entity listeners', () => {
      const cache = new NormalizedCache();
      const listener = vi.fn();
      cache.subscribeToEntity('User', 1, listener);

      cache.writeFragment('User', 1, { id: 1, name: 'Alice' });
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not notify listeners for unrelated entities', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      cache.writeQuery('user:2', makeUser(2, 'Bob'));

      const listener = vi.fn();
      cache.registerQueryListener('user:1', listener);

      cache.writeFragment('User', 2, { name: 'Robert' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('readFragment', () => {
    it('returns undefined for unknown entity', () => {
      const cache = new NormalizedCache();
      expect(cache.readFragment('User', 99)).toBeUndefined();
    });

    it('returns cached entity after writeQuery', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      expect(cache.readFragment('User', 1)).toMatchObject({ id: 1, name: 'Alice' });
    });
  });

  describe('evict', () => {
    it('removes the entity from the store', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      cache.evict('User', 1);
      expect(cache.readFragment('User', 1)).toBeUndefined();
    });

    it('returns affected query keys', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      cache.writeQuery('post:1', makePost(1, 'Post', makeUser(1, 'Alice')));
      const affected = cache.evict('User', 1);
      expect(affected).toContain('user:1');
      expect(affected).toContain('post:1');
    });

    it('readQuery returns undefined for evicted entities', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      cache.evict('User', 1);
      expect(cache.readQuery('user:1')).toBeUndefined();
    });

    it('notifies entity listeners on evict', () => {
      const cache = new NormalizedCache();
      cache.writeQuery('user:1', makeUser(1, 'Alice'));
      const listener = vi.fn();
      cache.subscribeToEntity('User', 1, listener);
      cache.evict('User', 1);
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('TypePolicy', () => {
    it('supports custom keyFields string', () => {
      const cache = new NormalizedCache({
        typePolicies: { Product: { keyFields: 'sku' } },
      });
      const data = { __typename: 'Product', sku: 'ABC-123', price: 9.99 };
      cache.writeQuery('product', data);
      expect(cache.readFragment('Product', 'ABC-123')).toMatchObject({ sku: 'ABC-123' });
    });

    it('supports composite keyFields array', () => {
      const cache = new NormalizedCache({
        typePolicies: { OrgMember: { keyFields: ['orgId', 'userId'] } },
      });
      const data = { __typename: 'OrgMember', orgId: 'org1', userId: 'user1', role: 'admin' };
      cache.writeQuery('member', data);
      // Internal ref is "OrgMember:org1:user1"
      cache.writeFragment('OrgMember', 'org1:user1', { role: 'owner' });
      expect((cache.readQuery('member') as typeof data).role).toBe('owner');
    });

    it('supports custom merge function', () => {
      const cache = new NormalizedCache({
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
      const feed1 = { __typename: 'Feed', id: '1', items: ['a', 'b'] };
      const feed2 = { __typename: 'Feed', id: '1', items: ['c'] };
      cache.writeQuery('feed', feed1);
      cache.writeQuery('feed2', feed2); // second write merges
      const result = cache.readFragment('Feed', '1') as { items: string[] };
      expect(result.items).toEqual(['a', 'b', 'c']);
    });
  });

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

// ---------------------------------------------------------------------------
// QueryClient integration tests
// ---------------------------------------------------------------------------

describe('QueryClient + normalized cache', () => {
  let client: QueryClient;

  beforeEach(() => {
    client = new QueryClient({
      normalizedCache: {},
    });
  });

  it('writeFragment pushes updated data to subscribed queries', async () => {
    const queryFn = vi.fn().mockResolvedValue(makeUser(1, 'Alice'));
    const query = client.getQuery({ queryKey: 'user:1', queryFn, retry: 0 });
    await query.fetch();

    const updates: unknown[] = [];
    query.subscribe((state) => updates.push(state.data));

    client.writeFragment('User', 1, { name: 'Alicia' });

    const latest = updates.at(-1) as ReturnType<typeof makeUser>;
    expect(latest.name).toBe('Alicia');
    // queryFn should NOT have been called again
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('readFragment returns entity after query fetch', async () => {
    const queryFn = vi.fn().mockResolvedValue(makeUser(7, 'Dave'));
    const query = client.getQuery({ queryKey: 'user:7', queryFn, retry: 0 });
    await query.fetch();

    expect(client.readFragment('User', 7)).toMatchObject({ id: 7, name: 'Dave' });
  });

  it('readFragment returns undefined when normalized cache is not configured', async () => {
    const plainClient = new QueryClient();
    expect(plainClient.readFragment('User', 1)).toBeUndefined();
  });

  it('evict invalidates referencing queries and triggers refetch', async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce(makeUser(1, 'Alice'))
      .mockResolvedValueOnce(makeUser(1, 'Alice (refreshed)'));

    const query = client.getQuery({ queryKey: 'user:1', queryFn, retry: 0 });
    await query.fetch();
    expect(queryFn).toHaveBeenCalledTimes(1);

    client.evict('User', 1);

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(queryFn).toHaveBeenCalledTimes(2);
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

    const q1Updates: unknown[] = [];
    const q2Updates: unknown[] = [];
    q1.subscribe((s) => q1Updates.push(s.data));
    q2.subscribe((s) => q2Updates.push(s.data));

    client.writeFragment('User', 5, { name: 'Evelyn' });

    expect((q1Updates.at(-1) as ReturnType<typeof makeUser>).name).toBe('Evelyn');
    const q2Latest = q2Updates.at(-1) as ReturnType<typeof makePost>;
    expect((q2Latest.author as { name: string }).name).toBe('Evelyn');
  });

  it('queries without normalized cache work unchanged', async () => {
    const plainClient = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue({ value: 42 });
    const query = plainClient.getQuery({ queryKey: 'data', queryFn, retry: 0 });
    const data = await query.fetch();
    expect(data).toEqual({ value: 42 });
  });
});
