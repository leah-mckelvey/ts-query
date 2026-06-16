// ########################################
// IMPORTS
// ########################################

import { BehaviorSubject, type Observable } from 'rxjs';
import type { QueryOptions, QueryState, SharedCacheAdapter } from './types';
import { deriveStatusFlags, createInitialQueryState } from './types';
import type { NormalizedCache } from './normalized-cache';

// ########################################
// TYPE DEFINITIONS
// ########################################

// ##############################
// Cache Sentinel
// ##############################

/**
 * Unique sentinel symbol to distinguish "cache miss" from "cache returned null".
 * This ensures that legitimate null values in the cache are not treated as misses.
 */
const CACHE_MISS = Symbol('CACHE_MISS');
type CacheMiss = typeof CACHE_MISS;

// ##############################
// Cache Context Types
// ##############################

/**
 * Context for shared cache (L2) operations, passed from QueryClient.
 */
export interface SharedCacheContext {
  adapter: SharedCacheAdapter;
  key: string;
  ttl: number;
}

/**
 * Context for normalized cache operations, passed from QueryClient.
 */
export interface NormalizedCacheContext {
  cache: NormalizedCache;
  /** The serialized query key used as the identity within the normalized cache. */
  key: string;
}

// ########################################
// QUERY CLASS
// ########################################

export class Query<TData = unknown, TError = Error> {
  // ##############################
  // Fields
  // ##############################
  private state$: BehaviorSubject<QueryState<TData, TError>>;
  private options: QueryOptions<TData, TError>;
  private staleTimeout: ReturnType<typeof setTimeout> | null = null;
  private cacheTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private currentFetchPromise: Promise<TData> | null = null;
  private onGarbageCollection?: () => void;
  private sharedCacheContext?: SharedCacheContext;
  private skipSharedCacheOnNextFetch = false;
  private normalizedCacheContext?: NormalizedCacheContext;
  private normalizedShape?: unknown;
  private subscriberCount = 0;

  // ##############################
  // Public API
  // ##############################

  get state(): QueryState<TData, TError> {
    return this.state$.value;
  }

  get state$Observable(): Observable<QueryState<TData, TError>> {
    return this.state$.asObservable();
  }

  constructor(
    options: QueryOptions<TData, TError>,
    onGarbageCollection?: () => void,
    sharedCacheContext?: SharedCacheContext,
    normalizedCacheContext?: NormalizedCacheContext,
  ) {
    this.options = options;
    this.onGarbageCollection = onGarbageCollection;
    this.sharedCacheContext = sharedCacheContext;
    this.normalizedCacheContext = normalizedCacheContext;

    // Initialize BehaviorSubject with initial state
    this.state$ = new BehaviorSubject<QueryState<TData, TError>>(
      createInitialQueryState<TData, TError>(),
    );
  }

  subscribe(observer: {
    next: (state: QueryState<TData, TError>) => void;
    error?: (err: unknown) => void;
    complete?: () => void;
  }): () => void {
    // While there is at least one subscriber, the query is considered "in use",
    // so ensure any pending garbage-collection timer is cleared.
    const isFirstSubscriber = this.subscriberCount === 0;
    this.subscriberCount++;
    this.clearCacheTimeout();

    // Subscribe first so observer gets the current state via BehaviorSubject
    const subscription = this.state$.subscribe(observer);

    // Auto-fetch on first subscriber if query is idle
    // This guarantees only ONE fetch happens, even with concurrent subscriptions
    if (
      isFirstSubscriber &&
      this.state.status === 'idle' &&
      this.options.enabled !== false
    ) {
      this.fetch().catch(() => {
        // Error already handled by Query class
      });
    }

    return () => {
      subscription.unsubscribe();
      this.subscriberCount--;

      // When the last subscriber unsubscribes, (re)schedule garbage collection so
      // the query can be collected once it truly becomes unused.
      if (this.subscriberCount === 0) {
        this.scheduleGarbageCollection();
      }
    };
  }

  async fetch(): Promise<TData> {
    // Deduplicate in-flight fetches so that multiple callers share the same
    // underlying request and retry cycle.
    if (this.currentFetchPromise) {
      return this.currentFetchPromise;
    }

    // New fetch cycle: reset retry count and mark as loading/fetching.
    this.retryCount = 0;
    this.updateState({ status: 'loading', isFetching: true });

    const promise = this.executeFetch();
    this.currentFetchPromise = promise;

    promise.finally(() => {
      this.currentFetchPromise = null;
    });

    return promise;
  }

  /**
   * Invalidate the query, bypassing L2 shared cache on refetch.
   * This ensures fresh data is fetched from L3 (source) after invalidation.
   */
  invalidate(): void {
    this.clearStaleTimeout();
    // Skip L2 on next fetch to avoid race condition where delete hasn't completed
    this.skipSharedCacheOnNextFetch = true;
    this.fetch();
  }

  /**
   * Called by QueryClient when an entity referenced by this query changes.
   * Recomputes state.data from the normalized shape without refetching.
   */
  recomputeFromNormalizedCache(): void {
    if (this.normalizedCacheContext && this.normalizedShape) {
      const fresh = this.normalizedCacheContext.cache.denormalize(
        this.normalizedShape,
      ) as TData;
      if (fresh !== undefined) {
        this.updateState({ data: fresh });
      }
    }
  }

  destroy(): void {
    this.clearStaleTimeout();
    this.clearCacheTimeout();
    this.state$.complete();
    this.onGarbageCollection = undefined;
  }

  // ##############################
  // State Management
  // ##############################

  private updateState(partial: Partial<QueryState<TData, TError>>): void {
    const prevState = this.state$.value;
    const newStatus = partial.status ?? prevState.status;
    const nextState = {
      ...prevState,
      ...partial,
      status: newStatus,
      ...deriveStatusFlags(newStatus),
      isFetching: partial.isFetching ?? prevState.isFetching,
      isStale: partial.isStale ?? prevState.isStale,
    };
    this.state$.next(nextState);
  }

  // ##############################
  // Fetch Lifecycle
  // ##############################

  // ####################
  // Main Fetch Execution
  // ####################

  private async executeFetch(): Promise<TData> {
    // Check if we should skip L2 (e.g., after invalidation)
    const shouldSkipSharedCache = this.skipSharedCacheOnNextFetch;
    this.skipSharedCacheOnNextFetch = false; // Reset flag

    try {
      // L2: Check shared cache first (only if configured and not skipped)
      if (this.sharedCacheContext && !shouldSkipSharedCache) {
        const cachedData = await this.getFromSharedCache();
        if (cachedData !== CACHE_MISS) {
          // L2 hit: populate L1 and return
          this.completeFetchSuccess(cachedData);
          return cachedData;
        }
      }

      // L3: Fetch from source (queryFn)
      const data = await this.options.queryFn();

      // Populate L2 (shared cache) - fire and forget to avoid blocking
      if (this.sharedCacheContext) {
        this.setInSharedCache(data);
      }

      // Normalize into the entity store (if configured)
      if (this.normalizedCacheContext) {
        this.normalizedShape = this.normalizedCacheContext.cache.normalize(
          data,
          this.normalizedCacheContext.key,
        );
      }

      // Populate L1 (in-process cache via state)
      this.completeFetchSuccess(data);
      return data;
    } catch (error) {
      const err = error as TError;

      // Retry logic (only for L3 failures, not L2)
      const maxRetries = this.options.retry ?? 3;
      if (this.retryCount < maxRetries) {
        this.retryCount++;
        const delay =
          this.options.retryDelay ??
          Math.min(1000 * 2 ** this.retryCount, 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.executeFetch();
      }

      this.completeFetchError(err);
      throw err;
    }
  }

  // ####################
  // Fetch Completion
  // ####################

  /**
   * Complete a successful fetch by updating state, calling callbacks, and scheduling timers.
   * Encapsulates the common success path for both L2 cache hits and L3 source fetches.
   */
  private completeFetchSuccess(data: TData): void {
    this.retryCount = 0;
    this.updateState({
      status: 'success',
      data,
      error: null,
      isFetching: false,
    });

    this.options.onSuccess?.(data);
    this.scheduleStale();
    this.scheduleGarbageCollection();
  }

  /**
   * Complete a failed fetch by updating state, calling callbacks, and scheduling cleanup.
   */
  private completeFetchError(err: TError): void {
    this.updateState({
      status: 'error',
      error: err,
      isFetching: false,
    });

    this.options.onError?.(err);
    this.scheduleGarbageCollection();
  }

  // ##############################
  // Shared Cache Operations (L2)
  // ##############################

  /**
   * Try to get data from the shared cache (L2).
   * Returns the parsed data if found, or CACHE_MISS sentinel if not found or on error.
   * Using a unique symbol ensures that legitimate null/undefined values are not
   * confused with cache misses.
   */
  private async getFromSharedCache(): Promise<TData | CacheMiss> {
    if (!this.sharedCacheContext) return CACHE_MISS;

    try {
      const cached = await this.sharedCacheContext.adapter.get(
        this.sharedCacheContext.key,
      );
      if (cached != null) {
        try {
          return JSON.parse(cached) as TData;
        } catch (parseError) {
          this.logCacheWarning(
            'Shared cache parse failed - cached data is malformed or corrupted',
            parseError,
          );
          // Fall through to L3 (source) to get fresh data
        }
      }
    } catch (adapterError) {
      this.logCacheWarning('Shared cache read failed', adapterError);
    }
    return CACHE_MISS;
  }

  /**
   * Store data in the shared cache (L2).
   *
   * Note: Only values that can be safely JSON-serialized will be stored.
   * Data containing circular references, BigInt, or other non-JSON-safe types
   * will not be stored and will fall back to L3 on next fetch.
   */
  private async setInSharedCache(data: TData): Promise<void> {
    if (!this.sharedCacheContext) return;

    // Pre-validate JSON serialization to catch circular refs, BigInt, etc.
    let serialized: string;
    try {
      serialized = JSON.stringify(data);
    } catch (serializationError) {
      this.logCacheWarning(
        'Shared cache write skipped - data cannot be JSON-serialized',
        serializationError,
      );
      return;
    }

    try {
      await this.sharedCacheContext.adapter.set(
        this.sharedCacheContext.key,
        serialized,
        this.sharedCacheContext.ttl,
      );
    } catch (cacheError) {
      this.logCacheWarning('Shared cache write failed', cacheError);
    }
  }

  /**
   * Execute a cache operation with graceful error handling.
   * Cache failures should never break the query flow - they just result in cache misses.
   */
  private logCacheWarning(message: string, error?: unknown): void {
    if (
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV !== 'production'
    ) {
      const key = this.sharedCacheContext?.key ?? 'unknown';
      console.warn(`[ts-query] ${message} for key "${key}":`, error);
    }
  }

  // ##############################
  // Timer Management
  // ##############################

  // ####################
  // Scheduling
  // ####################

  private scheduleStale(): void {
    this.clearStaleTimeout();
    const staleTime = this.options.staleTime ?? 0;

    // Mark data as fresh immediately
    this.updateState({ isStale: false });

    // Schedule marking as stale after staleTime
    if (staleTime > 0) {
      this.staleTimeout = setTimeout(() => {
        this.updateState({ isStale: true });
      }, staleTime);
    } else {
      // If staleTime is 0, data is immediately stale
      this.updateState({ isStale: true });
    }
  }

  private scheduleGarbageCollection(): void {
    this.clearCacheTimeout();
    const cacheTime = this.options.cacheTime ?? 5 * 60 * 1000; // 5 minutes default
    this.cacheTimeout = setTimeout(() => {
      if (this.subscriberCount === 0) {
        this.onGarbageCollection?.();
        this.destroy();
      }
    }, cacheTime);
  }

  // ####################
  // Timer Cleanup
  // ####################

  /**
   * Clear a timeout reference if it exists and reset to null.
   * Encapsulates the nullable resource cleanup pattern.
   */
  private clearTimer(timer: ReturnType<typeof setTimeout> | null): null {
    if (timer) {
      clearTimeout(timer);
    }
    return null;
  }

  private clearStaleTimeout(): void {
    this.staleTimeout = this.clearTimer(this.staleTimeout);
  }

  private clearCacheTimeout(): void {
    this.cacheTimeout = this.clearTimer(this.cacheTimeout);
  }
}
