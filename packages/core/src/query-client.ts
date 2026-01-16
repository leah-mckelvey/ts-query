import { Query } from './query';
import { Mutation } from './mutation';
import type {
  QueryKey,
  QueryOptions,
  MutationOptions,
  QueryClientConfig,
  SharedCacheConfig,
} from './types';

const DEFAULT_SHARED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class QueryClient {
  private queries = new Map<string, Query<unknown, unknown>>();
  private sharedCacheConfig?: SharedCacheConfig;

  constructor(config?: QueryClientConfig) {
    this.sharedCacheConfig = config?.sharedCache;
  }

  private getQueryKey(key: QueryKey): string {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

  getQuery<TData = unknown, TError = Error>(
    options: QueryOptions<TData, TError>,
  ): Query<TData, TError> {
    const key = this.getQueryKey(options.queryKey);

    let query = this.queries.get(key) as Query<TData, TError> | undefined;

    if (!query) {
      // Determine shared cache TTL: query-level override > client-level default > global default
      const sharedCacheTtl =
        options.sharedCacheTtl ??
        this.sharedCacheConfig?.defaultTtl ??
        DEFAULT_SHARED_CACHE_TTL;

      query = new Query<TData, TError>(
        options,
        () => {
          // Only remove if this is still the active instance for this key.
          const current = this.queries.get(key);
          if (current === (query as unknown as Query<unknown, unknown>)) {
            this.queries.delete(key);
          }
        },
        // Pass shared cache context if configured and not skipped
        options.skipSharedCache
          ? undefined
          : this.sharedCacheConfig?.adapter
            ? {
                adapter: this.sharedCacheConfig.adapter,
                key,
                ttl: sharedCacheTtl,
              }
            : undefined,
      );
      this.queries.set(key, query as unknown as Query<unknown, unknown>);
    }

    return query;
  }

  /**
   * Invalidate queries, optionally clearing from shared cache as well.
   */
  invalidateQueries(queryKey?: QueryKey): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      const query = this.queries.get(key);
      query?.invalidate();
      // Also invalidate in shared cache
      this.sharedCacheConfig?.adapter.delete(key);
    } else {
      // Invalidate all queries
      this.queries.forEach((query) => query.invalidate());
      // Note: We don't clear entire shared cache here as it may be shared with other clients
    }
  }

  removeQueries(queryKey?: QueryKey): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      const query = this.queries.get(key);
      query?.destroy();
      this.queries.delete(key);
      // Also remove from shared cache
      this.sharedCacheConfig?.adapter.delete(key);
    } else {
      // Remove all queries
      this.queries.forEach((query) => query.destroy());
      this.queries.clear();
    }
  }

  createMutation<TData = unknown, TVariables = unknown, TError = Error>(
    options: MutationOptions<TData, TVariables, TError>,
  ): Mutation<TData, TVariables, TError> {
    return new Mutation<TData, TVariables, TError>(options);
  }

  clear(): void {
    this.removeQueries();
  }
}
