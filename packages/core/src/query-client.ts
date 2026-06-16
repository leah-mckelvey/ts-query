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
   * Invalidate queries, optionally clearing from shared cache as well.
   */
  invalidateQueries(queryKey?: QueryKey): void {
    this.applyQueryOperation(
      queryKey,
      (query) => query.invalidate(),
      (query) => query.invalidate(),
      (key) => {
        // Also invalidate in shared cache (fire-and-forget, errors are swallowed)
        this.sharedCacheConfig?.adapter.delete(key).catch(() => {});
      },
    );
    // Important: We intentionally do NOT clear the entire shared cache (L2) when queryKey is undefined because:
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
