import type {
  QueryOptions,
  QueryState,
  Subscriber,
  SharedCacheAdapter,
} from './types';
import { focusManager } from './focus-manager';
import { onlineManager } from './online-manager';

/**
 * Unique sentinel symbol to distinguish "cache miss" from "cache returned null".
 * This ensures that legitimate null values in the cache are not treated as misses.
 */
const CACHE_MISS = Symbol('CACHE_MISS');
type CacheMiss = typeof CACHE_MISS;

/**
 * Context for shared cache (L2) operations, passed from QueryClient.
 */
export interface SharedCacheContext {
  adapter: SharedCacheAdapter;
  key: string;
  ttl: number;
}

/**
 * Error thrown when a Query fetch is cancelled via Query.cancel() or
 * QueryClient.cancelQueries(). DOMException with name 'AbortError' is the
 * web-standard convention; we mirror it so user code can interop with fetch().
 */
export class QueryCancelledError extends Error {
  readonly name = 'AbortError';
  constructor(message = 'Query was cancelled') {
    super(message);
  }
}

export class Query<TData = unknown, TError = Error> {
  private subscribers = new Set<Subscriber<QueryState<TData, TError>>>();
  private options: QueryOptions<TData, TError>;
  private staleTimeout: ReturnType<typeof setTimeout> | null = null;
  private cacheTimeout: ReturnType<typeof setTimeout> | null = null;
  private refetchIntervalId: ReturnType<typeof setInterval> | null = null;
  private retryCount = 0;
  private currentFetchPromise: Promise<TData> | null = null;
  private abortController: AbortController | null = null;
  private onGarbageCollection?: () => void;
  private sharedCacheContext?: SharedCacheContext;
  private skipSharedCacheOnNextFetch = false;
  private unsubscribeFocus: (() => void) | null = null;
  private unsubscribeOnline: (() => void) | null = null;

  state: QueryState<TData, TError> = {
    status: 'idle',
    data: undefined,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isFetching: false,
    isStale: false,
  };

  constructor(
    options: QueryOptions<TData, TError>,
    onGarbageCollection?: () => void,
    sharedCacheContext?: SharedCacheContext,
  ) {
    this.options = options;
    this.onGarbageCollection = onGarbageCollection;
    this.sharedCacheContext = sharedCacheContext;
  }

  subscribe(subscriber: Subscriber<QueryState<TData, TError>>): () => void {
    this.subscribers.add(subscriber);

    // While there is at least one subscriber, the query is considered "in use",
    // so ensure any pending garbage-collection timer is cleared.
    this.clearCacheTimeout();

    if (this.subscribers.size === 1) {
      this.attachAutoRefetch();
      this.scheduleRefetchInterval();
    }

    return () => {
      this.subscribers.delete(subscriber);

      // When the last subscriber unsubscribes, (re)schedule garbage collection so
      // the query can be collected once it truly becomes unused. Auto-refetch
      // and polling stop too — no point ticking for nobody.
      if (this.subscribers.size === 0) {
        this.detachAutoRefetch();
        this.clearRefetchInterval();
        this.scheduleGarbageCollection();
      }
    };
  }

  /**
   * Subscribe to focus and online managers so this query refetches when the
   * tab regains focus or the network reconnects, provided the data is stale.
   * Wired up only while there are subscribers — otherwise we'd be keeping
   * orphan queries alive across visibility/connectivity events.
   */
  private attachAutoRefetch(): void {
    if (this.options.refetchOnWindowFocus !== false) {
      this.unsubscribeFocus = focusManager.subscribe(() => {
        if (this.subscribers.size > 0 && this.shouldAutoRefetch()) {
          this.fetch().catch(() => {});
        }
      });
    }
    if (this.options.refetchOnReconnect !== false) {
      this.unsubscribeOnline = onlineManager.subscribe(() => {
        if (this.subscribers.size > 0 && this.shouldAutoRefetch()) {
          this.fetch().catch(() => {});
        }
      });
    }
  }

  private detachAutoRefetch(): void {
    this.unsubscribeFocus?.();
    this.unsubscribeFocus = null;
    this.unsubscribeOnline?.();
    this.unsubscribeOnline = null;
  }

  /**
   * Auto-refetch only fires when the data is stale (or there's no data yet).
   * If the user has staleTime: Infinity, focus/reconnect won't trigger noisy
   * refetches.
   */
  private shouldAutoRefetch(): boolean {
    return this.state.status !== 'success' || this.state.isStale;
  }

  private scheduleRefetchInterval(): void {
    this.clearRefetchInterval();
    const interval = this.options.refetchInterval;
    if (!interval || interval <= 0) return;

    this.refetchIntervalId = setInterval(() => {
      if (this.subscribers.size === 0) return;
      // Pause polling while the tab is hidden unless the user opts into
      // background polling. Saves battery and avoids API waste.
      if (
        !this.options.refetchIntervalInBackground &&
        !focusManager.isFocused()
      ) {
        return;
      }
      this.fetch().catch(() => {});
    }, interval);
  }

  private clearRefetchInterval(): void {
    if (this.refetchIntervalId) {
      clearInterval(this.refetchIntervalId);
      this.refetchIntervalId = null;
    }
  }

  private notify(): void {
    this.subscribers.forEach((subscriber) => subscriber(this.state));
  }

  private updateState(partial: Partial<QueryState<TData, TError>>): void {
    const newStatus = partial.status ?? this.state.status;
    this.state = {
      ...this.state,
      ...partial,
      status: newStatus,
      isLoading: newStatus === 'loading',
      isSuccess: newStatus === 'success',
      isError: newStatus === 'error',
      isFetching: partial.isFetching ?? this.state.isFetching,
      isStale: partial.isStale ?? this.state.isStale,
    };
    this.notify();
  }

  async fetch(): Promise<TData> {
    // Deduplicate in-flight fetches so that multiple callers share the same
    // underlying request and retry cycle.
    if (this.currentFetchPromise) {
      return this.currentFetchPromise;
    }

    // New fetch cycle: reset retry count and mark as loading/fetching.
    this.retryCount = 0;
    this.abortController = new AbortController();
    this.updateState({ status: 'loading', isFetching: true });

    const signal = this.abortController.signal;
    const promise = this.executeFetch(signal);
    this.currentFetchPromise = promise;

    // Use a no-op catch to prevent unhandled rejection warnings from this
    // bookkeeping path; callers attach their own .catch.
    promise
      .catch(() => {})
      .finally(() => {
        if (this.currentFetchPromise === promise) {
          this.currentFetchPromise = null;
          this.abortController = null;
        }
      });

    return promise;
  }

  /**
   * Cancel an in-flight fetch. Aborts the AbortSignal passed to queryFn so
   * downstream fetch()/XHR/GraphQL calls can short-circuit. State is reset
   * to whatever it was before the fetch started — we don't surface the cancel
   * as an error to subscribers because cancellation is a control-flow concern,
   * not a data-fetching failure.
   */
  cancel(reason?: string): void {
    if (this.abortController) {
      this.abortController.abort(reason ?? 'Query cancelled');
      this.abortController = null;
    }
    this.currentFetchPromise = null;
    if (this.state.isFetching) {
      this.updateState({ isFetching: false });
    }
  }

  /**
   * Imperatively set the query's data, transitioning it to a success state.
   * Used by QueryClient.setQueryData and by optimistic-update flows.
   * Cancels any in-flight fetch so the new data isn't immediately overwritten.
   */
  setData(data: TData): void {
    this.cancel();
    this.updateState({
      status: 'success',
      data,
      error: null,
      isFetching: false,
    });
    this.scheduleStale();
  }

  /**
   * Invalidate the query, bypassing L2 shared cache on refetch.
   * This ensures fresh data is fetched from L3 (source) after invalidation.
   * Cancels any in-flight fetch so retries from the previous cycle don't
   * race with the fresh fetch.
   */
  invalidate(): void {
    this.clearStaleTimeout();
    this.cancel();
    // Skip L2 on next fetch to avoid race condition where delete hasn't completed
    this.skipSharedCacheOnNextFetch = true;
    this.fetch();
  }

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
          // Malformed or corrupted cache entry - log separately for diagnosis
          // This could indicate data corruption, version mismatch, or tampering
          if (
            typeof process !== 'undefined' &&
            process.env?.NODE_ENV !== 'production'
          ) {
            console.warn(
              `[ts-query] Shared cache parse failed for key "${this.sharedCacheContext.key}": ` +
                `cached data is malformed or corrupted`,
              parseError,
            );
          }
          // Fall through to L3 (source) to get fresh data
        }
      }
    } catch (adapterError) {
      // Shared cache adapter errors (network, connection, etc.) should not break the fetch flow
      if (
        typeof process !== 'undefined' &&
        process.env?.NODE_ENV !== 'production'
      ) {
        console.warn(
          `[ts-query] Shared cache read failed for key "${this.sharedCacheContext.key}":`,
          adapterError,
        );
      }
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
      // Data cannot be serialized (circular refs, BigInt, etc.)
      // Skip writing to shared cache - will fall back to L3 on next fetch
      if (
        typeof process !== 'undefined' &&
        process.env?.NODE_ENV !== 'production'
      ) {
        console.warn(
          `[ts-query] Shared cache write skipped for key "${this.sharedCacheContext.key}": ` +
            `data cannot be JSON-serialized`,
          serializationError,
        );
      }
      return;
    }

    try {
      await this.sharedCacheContext.adapter.set(
        this.sharedCacheContext.key,
        serialized,
        this.sharedCacheContext.ttl,
      );
    } catch (cacheError) {
      // Shared cache errors should not break the fetch flow
      // Log in non-production for debugging
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[ts-query] Shared cache write failed for key "${this.sharedCacheContext.key}":`,
          cacheError,
        );
      }
    }
  }

  private async executeFetch(signal: AbortSignal): Promise<TData> {
    // Check if we should skip L2 (e.g., after invalidation)
    const shouldSkipSharedCache = this.skipSharedCacheOnNextFetch;
    this.skipSharedCacheOnNextFetch = false; // Reset flag

    try {
      // L2: Check shared cache first (only if configured and not skipped)
      if (this.sharedCacheContext && !shouldSkipSharedCache) {
        const cachedData = await this.getFromSharedCache();
        if (signal.aborted) throw new QueryCancelledError();
        if (cachedData !== CACHE_MISS) {
          // L2 hit: populate L1 and return
          this.retryCount = 0;
          this.updateState({
            status: 'success',
            data: cachedData,
            error: null,
            isFetching: false,
          });

          this.options.onSuccess?.(cachedData);
          this.scheduleStale();
          this.scheduleGarbageCollection();

          return cachedData;
        }
      }

      // L3: Fetch from source (queryFn)
      const data = await this.options.queryFn({
        queryKey: this.options.queryKey,
        signal,
      });
      // Discard the result if the fetch was cancelled while queryFn was running.
      if (signal.aborted) throw new QueryCancelledError();
      this.retryCount = 0;

      // Populate L2 (shared cache) - fire and forget to avoid blocking
      if (this.sharedCacheContext) {
        this.setInSharedCache(data);
      }

      // Populate L1 (in-process cache via state)
      this.updateState({
        status: 'success',
        data,
        error: null,
        isFetching: false,
      });

      this.options.onSuccess?.(data);
      this.scheduleStale();
      this.scheduleGarbageCollection();

      return data;
    } catch (error) {
      // Cancellation is control flow, not a data-fetch failure: don't retry,
      // don't transition to error state, just propagate so callers awaiting
      // fetch() see the abort.
      if (
        signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        throw error;
      }

      const err = error as TError;

      // Retry logic (only for L3 failures, not L2)
      const maxRetries = this.options.retry ?? 3;
      if (this.retryCount < maxRetries) {
        this.retryCount++;
        const delay =
          this.options.retryDelay ??
          Math.min(1000 * 2 ** this.retryCount, 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        if (signal.aborted) throw new QueryCancelledError();
        return this.executeFetch(signal);
      }

      this.updateState({
        status: 'error',
        error: err,
        isFetching: false,
      });

      this.options.onError?.(err);
      this.scheduleGarbageCollection();
      throw err;
    }
  }

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
      if (this.subscribers.size === 0) {
        this.onGarbageCollection?.();
        this.destroy();
      }
    }, cacheTime);
  }

  private clearStaleTimeout(): void {
    if (this.staleTimeout) {
      clearTimeout(this.staleTimeout);
      this.staleTimeout = null;
    }
  }

  private clearCacheTimeout(): void {
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = null;
    }
  }

  destroy(): void {
    this.cancel('Query destroyed');
    this.clearStaleTimeout();
    this.clearCacheTimeout();
    this.clearRefetchInterval();
    this.detachAutoRefetch();
    this.subscribers.clear();
    this.onGarbageCollection = undefined;
  }
}
