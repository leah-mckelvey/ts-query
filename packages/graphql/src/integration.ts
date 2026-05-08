import type { QueryFunctionContext, QueryOptions } from '@ts-query/core';
import type { GraphQLClient } from './client';
import { extractOperationName } from './document';
import type { GraphQLDocument } from './types';

export interface GraphQLQueryExtras<TData> extends Omit<
  QueryOptions<TData>,
  'queryKey' | 'queryFn'
> {
  /** Override the auto-generated queryKey. */
  queryKey?: readonly unknown[];
  /** Override the operation name extracted from the document. */
  operationName?: string;
}

/**
 * Build a `QueryOptions` ready to pass into `useQuery` / `client.getQuery` /
 * `client.prefetchQuery`. Wires up the GraphQL request and forwards the
 * AbortSignal so cancellation propagates to fetch().
 *
 * The default queryKey is `['gql', operationName, variables]`, which means
 * different variables for the same operation are different cache entries,
 * matching the behaviour users expect.
 */
export function graphqlQuery<TData, TVariables = Record<string, unknown>>(
  client: GraphQLClient,
  document: GraphQLDocument<TData, TVariables>,
  variables?: TVariables,
  extras?: GraphQLQueryExtras<TData>,
): QueryOptions<TData> {
  const operationName = extras?.operationName ?? extractOperationName(document);
  const queryKey =
    extras?.queryKey ?? (['gql', operationName, variables ?? null] as const);

  const { queryKey: _omitKey, operationName: _omitOp, ...rest } = extras ?? {};
  void _omitKey;
  void _omitOp;

  return {
    ...rest,
    queryKey,
    queryFn: ({ signal }: QueryFunctionContext) =>
      client.request<TData, TVariables>(document, variables, {
        signal,
        operationName,
      }),
  };
}
