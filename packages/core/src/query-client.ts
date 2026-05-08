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
      // Also invalidate in shared cache (fire-and-forget, errors are swallowed)
      this.sharedCacheConfig?.adapter.delete(key).catch(() => {});
    } else {
      // Invalidate all in-memory queries for this client instance (L1 cache).
      this.queries.forEach((query) => query.invalidate());
      // Important: We intentionally do NOT clear the entire shared cache (L2) here because:
      // 1. The shared cache may be used by multiple QueryClient instances across processes/services
      // 2. A "clear all" from a single client could unexpectedly evict data other clients rely on
      // 3. Each Query's invalidate() already skips L2 on refetch via skipSharedCacheOnNextFetch
      // If global L2 eviction is needed, it should be done via direct adapter access or an
      // explicit higher-level operation that coordinates across all affected clients.
    }
  }

  /**
   * Read the current data for a cached query without subscribing to it.
   * Returns undefined if the query doesn't exist or has no data yet.
   */
  getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined {
    const key = this.getQueryKey(queryKey);
    const query = this.queries.get(key) as Query<TData, unknown> | undefined;
    return query?.state.data;
  }

  /**
   * Imperatively set the data for a cached query. Pass either the new value
   * directly, or a function that receives the previous value and returns the
   * next one (matching TanStack Query's setQueryData updater shape).
   *
   * If no query exists for the given key, a placeholder is created so that
   * subsequent useQuery / getQuery calls with a real queryFn will pick up the
   * primed data instead of starting from idle. This is the primitive that
   * optimistic updates and SSR hydration build on.
   *
   * Returns the resolved next value.
   */
  setQueryData<TData = unknown>(
    queryKey: QueryKey,
    updater: TData | ((previous: TData | undefined) => TData),
  ): TData {
    const key = this.getQueryKey(queryKey);
    let query = this.queries.get(key) as Query<TData, unknown> | undefined;

    if (!query) {
      // Placeholder query — no real queryFn. If the consumer later calls
      // getQuery() with a real queryFn, they will reuse this instance and
      // its primed data, so the queryFn we install here only fires if
      // someone tries to fetch() before that happens.
      query = new Query<TData, unknown>(
        {
          queryKey,
          queryFn: async () => {
            throw new Error(
              `[ts-query] No queryFn registered for key ${key}. ` +
                `setQueryData created a placeholder; call useQuery / getQuery with a queryFn before fetching.`,
            );
          },
        },
        () => {
          const current = this.queries.get(key);
          if (current === (query as unknown as Query<unknown, unknown>)) {
            this.queries.delete(key);
          }
        },
      );
      this.queries.set(key, query as unknown as Query<unknown, unknown>);
    }

    const previous = query.state.data;
    const next =
      typeof updater === 'function'
        ? (updater as (p: TData | undefined) => TData)(previous)
        : updater;
    query.setData(next);
    return next;
  }

  /**
   * Pre-populate the cache for `queryKey` by running its queryFn now, but
   * without forcing a subscriber. Useful for route-level prefetch on hover
   * or for SSR. Errors are swallowed — prefetching is best-effort.
   */
  async prefetchQuery<TData = unknown, TError = Error>(
    options: QueryOptions<TData, TError>,
  ): Promise<void> {
    const query = this.getQuery(options);
    if (query.state.status === 'success' && !query.state.isStale) {
      return;
    }
    try {
      await query.fetch();
    } catch {
      // Best-effort: errors surface again on the next subscription.
    }
  }

  /**
   * Return cached data if fresh, otherwise fetch and return it. Equivalent to
   * TanStack's ensureQueryData — handy in route loaders where you want a
   * promise that always resolves with data (or rejects).
   */
  async ensureQueryData<TData = unknown, TError = Error>(
    options: QueryOptions<TData, TError>,
  ): Promise<TData> {
    const query = this.getQuery(options);
    if (
      query.state.status === 'success' &&
      query.state.data !== undefined &&
      !query.state.isStale
    ) {
      return query.state.data;
    }
    return query.fetch();
  }

  /**
   * Abort the in-flight fetch for a query (or all queries when no key is
   * given). Cancellation surfaces as an aborted AbortSignal inside queryFn
   * and is treated as control flow — query state is left in whatever it was
   * before the fetch started.
   */
  cancelQueries(queryKey?: QueryKey): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      this.queries.get(key)?.cancel();
    } else {
      this.queries.forEach((q) => q.cancel());
    }
  }

  removeQueries(queryKey?: QueryKey): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      const query = this.queries.get(key);
      query?.destroy();
      this.queries.delete(key);
      // Also remove from shared cache (fire-and-forget, errors are swallowed)
      this.sharedCacheConfig?.adapter.delete(key).catch(() => {});
    } else {
      // Remove all queries
      this.queries.forEach((query) => query.destroy());
      this.queries.clear();
    }
  }

  createMutation<
    TData = unknown,
    TVariables = unknown,
    TError = Error,
    TContext = unknown,
  >(
    options: MutationOptions<TData, TVariables, TError, TContext>,
  ): Mutation<TData, TVariables, TError, TContext> {
    return new Mutation<TData, TVariables, TError, TContext>(options);
  }

  /**
   * Clear all queries from the in-memory cache (L1) and optionally clear the shared cache (L2).
   * This is primarily useful for testing to reset state between tests.
   *
   * @returns A promise that resolves when the clear operation is complete.
   *          If the shared cache adapter doesn't support clear, only L1 is cleared.
   */
  async clear(): Promise<void> {
    this.removeQueries();

    // Clear L2 shared cache if adapter supports it
    if (this.sharedCacheConfig?.adapter.clear) {
      try {
        await this.sharedCacheConfig.adapter.clear();
      } catch {
        // Silently ignore shared cache clear errors
      }
    }
  }
}
