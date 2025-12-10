import { QueryClient } from '@ts-query/core';

let globalQueryClient: QueryClient | undefined;

export function setQueryClient(client: QueryClient): void {
  globalQueryClient = client;
}

export function getQueryClient(): QueryClient {
  if (!globalQueryClient) {
    throw new Error('QueryClient not set. Call setQueryClient() before using queries.');
  }
  return globalQueryClient;
}

