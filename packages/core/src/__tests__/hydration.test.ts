import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '../query-client';
import { dehydrate, hydrate } from '../hydration';

describe('hydration', () => {
  it('dehydrates only successful queries with data', async () => {
    const client = new QueryClient();

    const successFn = vi.fn().mockResolvedValue({ id: 1, name: 'Ada' });
    const failFn = vi.fn().mockRejectedValue(new Error('boom'));

    await client
      .getQuery({ queryKey: ['user', 1], queryFn: successFn })
      .fetch();
    // Failed query — should be excluded.
    await client
      .getQuery({ queryKey: ['user', 2], queryFn: failFn, retry: 0 })
      .fetch()
      .catch(() => {});

    const snapshot = dehydrate(client);
    expect(snapshot.queries).toHaveLength(1);
    expect(snapshot.queries[0].queryKey).toEqual(['user', 1]);
    expect(snapshot.queries[0].state.data).toEqual({ id: 1, name: 'Ada' });
  });

  it('dehydrate is JSON-safe and round-trips', async () => {
    const client = new QueryClient();
    await client
      .getQuery({
        queryKey: ['todo', 1],
        queryFn: async () => ({ id: 1, text: 'hi' }),
      })
      .fetch();

    const snapshot = dehydrate(client);
    const transferred = JSON.parse(JSON.stringify(snapshot));

    const fresh = new QueryClient();
    hydrate(fresh, transferred);
    expect(fresh.getQueryData(['todo', 1])).toEqual({ id: 1, text: 'hi' });
  });

  it('hydrate primes data so getQueryData returns it immediately', () => {
    const client = new QueryClient();
    hydrate(client, {
      queries: [
        {
          queryKey: ['user', 1],
          state: { data: { id: 1, name: 'Hydrated' }, dataUpdatedAt: 0 },
        },
      ],
    });

    expect(client.getQueryData(['user', 1])).toEqual({
      id: 1,
      name: 'Hydrated',
    });
  });

  it('hydrate does not overwrite existing client data', async () => {
    const client = new QueryClient();
    client.setQueryData(['user', 1], { id: 1, name: 'Local' });

    hydrate(client, {
      queries: [
        {
          queryKey: ['user', 1],
          state: { data: { id: 1, name: 'Server' }, dataUpdatedAt: 0 },
        },
      ],
    });

    expect(client.getQueryData(['user', 1])).toEqual({
      id: 1,
      name: 'Local',
    });
  });

  it('shouldDehydrateQuery override can include errored queries', async () => {
    const client = new QueryClient();
    await client
      .getQuery({
        queryKey: ['user', 2],
        queryFn: async () => {
          throw new Error('nope');
        },
        retry: 0,
      })
      .fetch()
      .catch(() => {});

    const snapshot = dehydrate(client, {
      shouldDehydrateQuery: () => true,
    });
    // Both queries (one errored, one with no data) get included when the
    // user explicitly opts in.
    expect(snapshot.queries.length).toBeGreaterThan(0);
  });

  it('hydrate handles malformed input gracefully', () => {
    const client = new QueryClient();
    expect(() =>
      hydrate(client, undefined as unknown as { queries: [] }),
    ).not.toThrow();
    expect(() =>
      hydrate(client, { queries: undefined as unknown as [] }),
    ).not.toThrow();
  });
});
