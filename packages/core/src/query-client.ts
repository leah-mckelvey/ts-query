// ########################################
// IMPORTS
// ########################################

import { Query } from './query';
import { Mutation } from './mutation';
import { NormalizedCache } from './normalized-cache';
import type {
  QueryKey,
  QueryOptions,
  MutationOptions,
  QueryClientConfig,
  SharedCacheConfig,
  DehydratedState,
  DehydratedQuery,
  QueryFilters,
} from './types';

// ########################################
// CONSTANTS
// ########################################

const DEFAULT_SHARED_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ########################################
// QUERY CLIENT
// ########################################

export class QueryClient {
  // ##############################
  // State
  // ##############################
  private queries = new Map<string, Query<unknown, unknown>>();
  private sharedCacheConfig?: SharedCacheConfig;
  private normalizedCache?: NormalizedCache;

  // ##############################
  // Initialization
  // ##############################

  constructor(config?: QueryClientConfig) {
    this.sharedCacheConfig = config?.sharedCache;
    if (config?.normalizedCache) {
      this.normalizedCache = new NormalizedCache(config.normalizedCache);
    }
  }

  // ##############################
  // Query Management
  // ##############################

  // ####################
  // Key Utilities
  // ####################

  private getQueryKey(key: QueryKey): string {
    return typeof key === 'string' ? key : JSON.stringify(key);
  }

  /**
   * Parse a serialized query key back into its original form.
   * Inverse of getQueryKey().
   */
  private parseQueryKey(key: string): QueryKey {
    try {
      // Try to parse as JSON array
      const parsed = JSON.parse(key);
      return Array.isArray(parsed) ? parsed : key;
    } catch {
      // If parsing fails, it's a string key
      return key;
    }
  }

  /**
   * Normalize filters from various input formats to a standard QueryFilters object.
   */
  private normalizeFilters(
    filters?: QueryKey | QueryFilters,
  ): QueryFilters | undefined {
    if (!filters) return undefined;

    // If filters is a QueryKey (string or array), convert to QueryFilters
    if (typeof filters === 'string' || Array.isArray(filters)) {
      return { queryKey: filters as QueryKey, exact: false };
    }

    return filters as QueryFilters;
  }

  /**
   * Get all query keys that match the given filters.
   */
  private getMatchingQueryKeys(filters?: QueryFilters): string[] {
    // If no filters, return all keys
    if (!filters) {
      return Array.from(this.queries.keys());
    }

    const keys: string[] = [];

    this.queries.forEach((_, key) => {
      if (this.matchesFilters(key, filters)) {
        keys.push(key);
      }
    });

    return keys;
  }

  /**
   * Check if a query key matches the given filters.
   */
  private matchesFilters(key: string, filters: QueryFilters): boolean {
    // Custom predicate takes precedence
    if (filters.predicate) {
      return filters.predicate(key);
    }

    // If no queryKey filter, match all
    if (!filters.queryKey) {
      return true;
    }

    const filterKey = this.getQueryKey(filters.queryKey);

    // Exact match
    if (filters.exact === true) {
      return key === filterKey;
    }

    // Prefix match (default)
    // For array keys, we need to check if the filter is a prefix
    try {
      const parsedKey = this.parseQueryKey(key);
      const parsedFilter = this.parseQueryKey(filterKey);

      // Both are arrays - check prefix
      if (Array.isArray(parsedKey) && Array.isArray(parsedFilter)) {
        return this.arrayStartsWith(parsedKey, parsedFilter);
      }

      // String comparison fallback
      return key.startsWith(filterKey);
    } catch {
      // Fallback to string comparison
      return key.startsWith(filterKey);
    }
  }

  /**
   * Check if an array starts with another array (prefix match).
   */
  private arrayStartsWith(arr: unknown[], prefix: unknown[]): boolean {
    if (prefix.length > arr.length) return false;

    for (let i = 0; i < prefix.length; i++) {
      if (JSON.stringify(arr[i]) !== JSON.stringify(prefix[i])) {
        return false;
      }
    }

    return true;
  }

  // ####################
  // Query Lifecycle
  // ####################

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
        // Pass normalized cache context if configured
        this.normalizedCache ? { cache: this.normalizedCache, key } : undefined,
      );
      this.queries.set(key, query as unknown as Query<unknown, unknown>);
    }

    return query;
  }

  // ####################
  // Query Operations
  // ####################

  /**
   * Apply an operation to either a specific query or all queries, with optional
   * shared cache synchronization.
   */
  private applyQueryOperation(
    queryKey: QueryKey | undefined,
    singleOp: (query: Query<unknown, unknown>) => void,
    allOp: (query: Query<unknown, unknown>) => void,
    syncSharedCache: (key: string) => void,
  ): void {
    if (queryKey) {
      const key = this.getQueryKey(queryKey);
      const query = this.queries.get(key);
      if (query) singleOp(query);
      syncSharedCache(key);
    } else {
      this.queries.forEach((query) => allOp(query));
    }
  }

  /**
   * Invalidate queries based on filters, optionally clearing from shared cache as well.
   *
   * @example
   * // Invalidate exact query
   * client.invalidateQueries({ queryKey: ['users', 1], exact: true });
   *
   * @example
   * // Invalidate all queries starting with ['users']
   * client.invalidateQueries({ queryKey: ['users'] });
   *
   * @example
   * // Invalidate with custom predicate
   * client.invalidateQueries({
   *   predicate: (key) => key.includes('user')
   * });
   *
   * @example
   * // Legacy: invalidate by key only (prefix match)
   * client.invalidateQueries(['users']);
   */
  invalidateQueries(filters?: QueryKey | QueryFilters): void {
    const normalizedFilters = this.normalizeFilters(filters);
    const matchingKeys = this.getMatchingQueryKeys(normalizedFilters);

    matchingKeys.forEach((key) => {
      const query = this.queries.get(key);
      if (query) {
        query.invalidate();
      }

      // Also invalidate in shared cache (fire-and-forget, errors are swallowed)
      this.sharedCacheConfig?.adapter.delete(key).catch(() => {});
    });

    // Important: We intentionally do NOT clear the entire shared cache (L2) when no filters are provided because:
    // 1. The shared cache may be used by multiple QueryClient instances across processes/services
    // 2. A "clear all" from a single client could unexpectedly evict data other clients rely on
    // 3. Each Query's invalidate() already skips L2 on refetch via skipSharedCacheOnNextFetch
    // If global L2 eviction is needed, it should be done via direct adapter access or an
    // explicit higher-level operation that coordinates across all affected clients.
  }

  removeQueries(queryKey?: QueryKey): void {
    this.applyQueryOperation(
      queryKey,
      (query) => {
        query.destroy();
        this.queries.delete(this.getQueryKey(queryKey!));
      },
      (query) => query.destroy(),
      (key) => {
        // Also remove from shared cache (fire-and-forget, errors are swallowed)
        this.sharedCacheConfig?.adapter.delete(key).catch(() => {});
      },
    );
    if (!queryKey) {
      this.queries.clear();
    }
  }

  // ##############################
  // Normalized Cache Operations
  // ##############################

  // ####################
  // Internal Helpers
  // ####################

  /**
   * Notify all queries affected by a normalized cache operation.
   */
  private notifyAffectedQueries(
    affectedKeys: string[],
    notify: (query: Query<unknown, unknown>) => void,
  ): void {
    for (const key of affectedKeys) {
      const query = this.queries.get(key);
      if (query) notify(query);
    }
  }

  // ####################
  // Fragment API
  // ####################

  /**
   * Update a specific entity in the normalized cache and immediately push the
   * new data to all subscribed queries that referenced it — no refetch needed.
   *
   * Requires the QueryClient to be configured with `normalizedCache`.
   *
   * @example
   * // After a mutation that renamed a user:
   * client.writeFragment('User', userId, { name: 'New Name' });
   */
  writeFragment<T extends Record<string, unknown>>(
    typename: string,
    id: string | number,
    data: Partial<T>,
  ): void {
    if (!this.normalizedCache) return;

    const affectedKeys = this.normalizedCache.writeFragment(
      typename,
      id,
      data as Record<string, unknown>,
    );

    // Notify all affected queries to recompute their data from the normalized cache
    this.notifyAffectedQueries(affectedKeys, (query) => {
      if ('recomputeFromNormalizedCache' in query) {
        (
          query as Query<unknown, unknown> & {
            recomputeFromNormalizedCache(): void;
          }
        ).recomputeFromNormalizedCache();
      }
    });
  }

  /**
   * Read a raw entity record directly from the normalized cache without going
   * through any query. Returns undefined if not cached or if the normalized
   * cache is not configured.
   */
  readFragment<T extends Record<string, unknown> = Record<string, unknown>>(
    typename: string,
    id: string | number,
  ): T | undefined {
    return this.normalizedCache?.readFragment<T>(typename, id);
  }

  /**
   * Subscribe to changes for a specific entity in the normalized cache.
   * The callback is invoked whenever `writeFragment` or `evict` touches this entity.
   * Returns an unsubscribe function.
   *
   * Primarily used by `useFragment` in framework adapters.
   */
  subscribeFragment(
    typename: string,
    id: string | number,
    callback: () => void,
  ): () => void {
    if (!this.normalizedCache) return () => {};
    return this.normalizedCache.subscribeToEntity(typename, id, callback);
  }

  // ####################
  // Cache Eviction
  // ####################

  /**
   * Remove an entity from the normalized cache and invalidate every query that
   * referenced it so they refetch fresh data.
   *
   * @example
   * // After deleting a post:
   * client.evict('Post', postId);
   */
  evict(typename: string, id: string | number): void {
    if (!this.normalizedCache) return;
    const affectedKeys = this.normalizedCache.evict(typename, id);
    this.notifyAffectedQueries(affectedKeys, (query) => query.invalidate());
  }

  // ##############################
  // Mutation Management
  // ##############################

  createMutation<TData = unknown, TVariables = unknown, TError = Error>(
    options: MutationOptions<TData, TVariables, TError>,
  ): Mutation<TData, TVariables, TError> {
    return new Mutation<TData, TVariables, TError>(options);
  }

  // ##############################
  // Manual Cache Control
  // ##############################

  /**
   * Manually set data for a query key. This populates the cache as if the query
   * had successfully fetched and can be used for optimistic updates or seeding
   * the cache with known data.
   *
   * @example
   * // After a mutation, update the list cache optimistically
   * client.setQueryData(['users'], (old) => [...old, newUser]);
   *
   * @example
   * // Seed cache with initial data
   * client.setQueryData(['user', id], userData);
   */
  setQueryData<TData = unknown>(
    queryKey: QueryKey,
    updater: TData | ((old: TData | undefined) => TData),
  ): void {
    const key = this.getQueryKey(queryKey);
    const query = this.queries.get(key) as Query<TData, unknown> | undefined;

    if (!query) {
      // Query doesn't exist yet - we can't set data without a Query instance
      // This matches TanStack Query behavior - data is only set if query exists
      return;
    }

    const currentData = query.state.data;
    const newData =
      typeof updater === 'function'
        ? (updater as (old: TData | undefined) => TData)(currentData)
        : updater;

    // Use Query's public setData method
    query.setData(newData);
  }

  /**
   * Get the cached data for a query key without subscribing to updates.
   *
   * @example
   * const user = client.getQueryData(['user', id]);
   * if (user) {
   *   console.log('User is cached:', user);
   * }
   */
  getQueryData<TData = unknown>(queryKey: QueryKey): TData | undefined {
    const key = this.getQueryKey(queryKey);
    const query = this.queries.get(key) as Query<TData, unknown> | undefined;
    return query?.state.data;
  }

  /**
   * Prefetch a query and populate the cache. Unlike regular queries, this doesn't
   * create a subscription, so the query will be garbage collected after cacheTime.
   *
   * This is especially useful for:
   * - SSR: prefetch queries on the server before rendering
   * - Hover prefetching: prefetch data when user hovers over a link
   * - Route prefetching: prefetch data for the next page before navigation
   *
   * @example
   * // Prefetch user data on hover
   * <Link onMouseEnter={() => client.prefetchQuery({
   *   queryKey: ['user', userId],
   *   queryFn: () => fetchUser(userId)
   * })}>
   *
   * @example
   * // SSR prefetch
   * await client.prefetchQuery({
   *   queryKey: ['posts'],
   *   queryFn: fetchPosts
   * });
   * const dehydratedState = client.dehydrate();
   */
  async prefetchQuery<TData = unknown, TError = Error>(
    options: QueryOptions<TData, TError>,
  ): Promise<void> {
    const query = this.getQuery(options);

    // Only fetch if data is stale or doesn't exist
    if (query.state.isStale || query.state.data === undefined) {
      await query.fetch();
    }
  }

  // ##############################
  // SSR / Hydration
  // ##############################

  /**
   * Dehydrate the current query cache into a serializable state for SSR.
   * This captures all successful queries that have data.
   *
   * @example
   * // On the server (Next.js)
   * export async function getServerSideProps() {
   *   const queryClient = new QueryClient();
   *   await queryClient.prefetchQuery({
   *     queryKey: ['posts'],
   *     queryFn: fetchPosts
   *   });
   *   return {
   *     props: {
   *       dehydratedState: queryClient.dehydrate()
   *     }
   *   };
   * }
   */
  dehydrate(): DehydratedState {
    const queries: DehydratedQuery[] = [];

    this.queries.forEach((query, key) => {
      // Only dehydrate successful queries with data
      if (query.state.status === 'success' && query.state.data !== undefined) {
        queries.push({
          queryKey: this.parseQueryKey(key),
          data: query.state.data,
          status: query.state.status,
          error: query.state.error,
        });
      }
    });

    return { queries };
  }

  /**
   * Hydrate the query cache from a dehydrated state (typically from SSR).
   * This populates the cache with pre-fetched data from the server.
   *
   * @example
   * // On the client (Next.js)
   * function App({ dehydratedState }) {
   *   const [queryClient] = useState(() => {
   *     const client = new QueryClient();
   *     client.hydrate(dehydratedState);
   *     return client;
   *   });
   *   // ...
   * }
   */
  hydrate(dehydratedState: DehydratedState): void {
    dehydratedState.queries.forEach((dehydratedQuery) => {
      const query = this.getQuery({
        queryKey: dehydratedQuery.queryKey,
        // Hydrated queries don't need a queryFn since they already have data
        queryFn: () => Promise.resolve(dehydratedQuery.data),
      });

      // Set the hydrated data without fetching
      query.setData(dehydratedQuery.data);
    });
  }

  // ##############################
  // Cache Clearing
  // ##############################

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
