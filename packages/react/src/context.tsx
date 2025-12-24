import React, { createContext, useContext, ReactNode } from 'react';
import { QueryClient } from '@ts-query/core';

const QueryClientContext = createContext<QueryClient | undefined>(undefined);

export interface QueryClientProviderProps {
  client: QueryClient;
  children: ReactNode;
}

export function QueryClientProvider({
  client,
  children,
}: QueryClientProviderProps) {
  return (
    <QueryClientContext.Provider value={client}>
      {children}
    </QueryClientContext.Provider>
  );
}

export function useQueryClient(): QueryClient {
  const client = useContext(QueryClientContext);
  if (!client) {
    throw new Error('useQueryClient must be used within a QueryClientProvider');
  }
  return client;
}
