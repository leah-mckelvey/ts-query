import { describe, it, expect, vi } from 'vitest';
import { GraphQLClient } from '../client';
import { GraphQLClientError } from '../types';
import type { FetchLike } from '../client';

function mockFetch(
  responses:
    | { ok?: boolean; status?: number; body: unknown }
    | { ok?: boolean; status?: number; body: unknown }[],
): FetchLike & { calls: { url: string; init: object }[] } {
  const queue = Array.isArray(responses) ? [...responses] : [responses];
  const calls: { url: string; init: object }[] = [];
  const fn = vi.fn(async (url: string, init?: object) => {
    calls.push({ url, init: init ?? {} });
    const next = queue.shift() ?? queue[0];
    return {
      ok: next.ok ?? true,
      status: next.status ?? 200,
      json: async () => next.body,
      text: async () => JSON.stringify(next.body),
    };
  }) as unknown as FetchLike & { calls: typeof calls };
  (fn as unknown as { calls: typeof calls }).calls = calls;
  return fn;
}

describe('GraphQLClient', () => {
  it('POSTs to endpoint with query/variables and returns data', async () => {
    const fetch = mockFetch({ body: { data: { user: { id: 1 } } } });
    const client = new GraphQLClient({ endpoint: '/graphql', fetch });

    const result = await client.request<{ user: { id: number } }>(
      'query GetUser($id: Int!) { user(id: $id) { id } }',
      { id: 1 },
    );

    expect(result).toEqual({ user: { id: 1 } });
    const call = (
      fetch as unknown as {
        calls: {
          url: string;
          init: {
            method: string;
            headers: Record<string, string>;
            body: string;
          };
        }[];
      }
    ).calls[0];
    expect(call.url).toBe('/graphql');
    expect(call.init.method).toBe('POST');
    expect(call.init.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(call.init.body);
    expect(body.query).toContain('query GetUser');
    expect(body.variables).toEqual({ id: 1 });
  });

  it('propagates Authorization headers from a thunk', async () => {
    const fetch = mockFetch({ body: { data: { ok: true } } });
    const headers = vi.fn(() => ({ Authorization: 'Bearer xyz' }));
    const client = new GraphQLClient({
      endpoint: '/graphql',
      fetch,
      headers,
    });

    await client.request('query Q { ok }');
    expect(headers).toHaveBeenCalledTimes(1);
    const call = (
      fetch as unknown as {
        calls: { init: { headers: Record<string, string> } }[];
      }
    ).calls[0];
    expect(call.init.headers.Authorization).toBe('Bearer xyz');
  });

  it('throws GraphQLClientError when response has errors', async () => {
    const fetch = mockFetch({
      body: {
        errors: [{ message: 'boom' }, { message: 'kaboom' }],
      },
    });
    const client = new GraphQLClient({ endpoint: '/graphql', fetch });

    await expect(client.request('query Q { ok }')).rejects.toMatchObject({
      name: 'GraphQLClientError',
      message: 'boom; kaboom',
    });
  });

  it('throws on transport errors with no GraphQL body', async () => {
    const fetch = mockFetch({
      ok: false,
      status: 500,
      body: 'oh no' as unknown,
    });
    const client = new GraphQLClient({ endpoint: '/graphql', fetch });

    await expect(client.request('query Q { ok }')).rejects.toBeInstanceOf(
      GraphQLClientError,
    );
  });

  it('forwards AbortSignal to fetch', async () => {
    const fetch = mockFetch({ body: { data: { ok: true } } });
    const client = new GraphQLClient({ endpoint: '/graphql', fetch });
    const controller = new AbortController();

    await client.request('query Q { ok }', undefined, {
      signal: controller.signal,
    });
    const call = (
      fetch as unknown as { calls: { init: { signal?: AbortSignal } }[] }
    ).calls[0];
    expect(call.init.signal).toBe(controller.signal);
  });

  describe('APQ', () => {
    it('sends hash-only first; falls back to full query on PersistedQueryNotFound', async () => {
      const fetch = mockFetch([
        { body: { errors: [{ message: 'PersistedQueryNotFound' }] } },
        { body: { data: { user: { id: 1 } } } },
      ]);
      const client = new GraphQLClient({
        endpoint: '/graphql',
        fetch,
        enableAPQ: true,
        // Deterministic hash so we can assert exactly.
        hashQuery: async (q) => `hash-of:${q.length}`,
      });

      const result = await client.request<{ user: { id: number } }>(
        'query GetUser { user { id } }',
      );
      expect(result).toEqual({ user: { id: 1 } });

      const calls = (
        fetch as unknown as { calls: { init: { body: string } }[] }
      ).calls;
      expect(calls).toHaveLength(2);

      const first = JSON.parse(calls[0].init.body);
      expect(first.query).toBeUndefined();
      expect(first.extensions.persistedQuery.sha256Hash).toBe('hash-of:29');

      const second = JSON.parse(calls[1].init.body);
      expect(second.query).toContain('query GetUser');
      expect(second.extensions.persistedQuery.sha256Hash).toBe('hash-of:29');
    });

    it('skips fallback when hash-only succeeds (server already had it)', async () => {
      const fetch = mockFetch({ body: { data: { user: { id: 1 } } } });
      const client = new GraphQLClient({
        endpoint: '/graphql',
        fetch,
        enableAPQ: true,
        hashQuery: async () => 'abc',
      });

      await client.request('query GetUser { user { id } }');
      const calls = (
        fetch as unknown as { calls: { init: { body: string } }[] }
      ).calls;
      expect(calls).toHaveLength(1);
      const body = JSON.parse(calls[0].init.body);
      expect(body.query).toBeUndefined();
      expect(body.extensions.persistedQuery).toBeDefined();
    });

    it('detects PersistedQueryNotFound by extensions.code as well', async () => {
      const fetch = mockFetch([
        {
          body: {
            errors: [
              {
                message: 'something else',
                extensions: { code: 'PERSISTED_QUERY_NOT_FOUND' },
              },
            ],
          },
        },
        { body: { data: { ok: true } } },
      ]);
      const client = new GraphQLClient({
        endpoint: '/graphql',
        fetch,
        enableAPQ: true,
        hashQuery: async () => 'abc',
      });

      const result = await client.request<{ ok: boolean }>('query Q { ok }');
      expect(result).toEqual({ ok: true });
      expect((fetch as unknown as { calls: unknown[] }).calls).toHaveLength(2);
    });
  });
});
