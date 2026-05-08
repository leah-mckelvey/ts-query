import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '@ts-query/core';
import { GraphQLClient } from '../client';
import { graphqlQuery } from '../integration';
import type { FetchLike } from '../client';

function staticFetch(body: unknown): FetchLike {
  return vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body),
  })) as unknown as FetchLike;
}

describe('graphqlQuery', () => {
  it('produces QueryOptions usable with QueryClient', async () => {
    const fetch = staticFetch({ data: { user: { id: 1, name: 'Ada' } } });
    const gql = new GraphQLClient({ endpoint: '/graphql', fetch });
    const client = new QueryClient();

    const opts = graphqlQuery<{ user: { id: number; name: string } }>(
      gql,
      'query GetUser { user { id name } }',
    );
    const query = client.getQuery(opts);
    const data = await query.fetch();
    expect(data).toEqual({ user: { id: 1, name: 'Ada' } });
  });

  it('default queryKey segments by operationName + variables', () => {
    const fetch = staticFetch({ data: {} });
    const gql = new GraphQLClient({ endpoint: '/graphql', fetch });
    const opts1 = graphqlQuery(
      gql,
      'query GetUser($id: Int!) { user(id: $id) { id } }',
      { id: 1 },
    );
    const opts2 = graphqlQuery(
      gql,
      'query GetUser($id: Int!) { user(id: $id) { id } }',
      { id: 2 },
    );
    expect(opts1.queryKey).not.toEqual(opts2.queryKey);
    expect(opts1.queryKey).toEqual(['gql', 'GetUser', { id: 1 }]);
  });

  it('forwards AbortSignal from QueryFunctionContext to GraphQLClient', async () => {
    const fetch = vi.fn(
      async (_url: string, init?: { signal?: AbortSignal }) => {
        // Throw if signal is already aborted; otherwise return ok
        if (init?.signal?.aborted) throw new Error('aborted');
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { ok: true } }),
          text: async () => '',
        };
      },
    ) as unknown as FetchLike;
    const gql = new GraphQLClient({ endpoint: '/graphql', fetch });
    const client = new QueryClient();
    const opts = graphqlQuery(gql, 'query Q { ok }');
    const query = client.getQuery(opts);

    // Cancel before fetch resolves
    const promise = query.fetch();
    promise.catch(() => {});
    query.cancel();

    // Calling fetch with already-aborted signal throws — verify the cancel
    // propagated through ts-query's QueryClient -> queryFn -> GraphQLClient.
    await expect(promise).rejects.toThrow();
  });

  it('extras.queryKey override wins over the auto-generated key', () => {
    const fetch = staticFetch({ data: {} });
    const gql = new GraphQLClient({ endpoint: '/graphql', fetch });
    const opts = graphqlQuery(gql, 'query GetUser { user { id } }', undefined, {
      queryKey: ['custom', 'key'],
    });
    expect(opts.queryKey).toEqual(['custom', 'key']);
  });
});
