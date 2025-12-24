import { describe, expect, it } from 'vitest';
import { QueryClient } from '@ts-query/core';
import {
  __resetQueryClientForTests,
  getQueryClient,
  setQueryClient,
} from '../query-client-provider';

describe('query-client-provider', () => {
  it('throws if getQueryClient is called before setQueryClient', () => {
    __resetQueryClientForTests();

    expect(() => getQueryClient()).toThrowError(
      'QueryClient not set. Call setQueryClient() before using queries.',
    );
  });

  it('returns the client after setQueryClient has been called', () => {
    __resetQueryClientForTests();
    const client = new QueryClient();

    setQueryClient(client);

    expect(getQueryClient()).toBe(client);
  });
});
