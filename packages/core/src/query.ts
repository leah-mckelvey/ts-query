import type {
  QueryOptions,
  QueryState,
  Subscriber,
  SharedCacheAdapter,
} from './types';

/**
 * Context for shared cache (L2) operations, passed from QueryClient.
 */
export interface SharedCacheContext {
  adapter: SharedCacheAdapter;
  key: string;
  ttl: number;
}

export class Query<TData = unknown, TError = Error> {
  private subscribers = new Set<Subscriber<QueryState<TData, TError>>>();
  private options: QueryOptions<TData, TError>;
  private staleTimeout: ReturnType<typeof setTimeout> | null = null;
  private cacheTimeout: ReturnType<typeof setTimeout> | null = null;
  private retryCount = 0;
  private currentFetchPromise: Promise<TData> | null = null;
  private onGarbageCollection?: () => void;
  private sharedCacheContext?: SharedCacheContext;

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

    return () => {
      this.subscribers.delete(subscriber);

      // When the last subscriber unsubscribes, (re)schedule garbage collection so
      // the query can be collected once it truly becomes unused.
      if (this.subscribers.size === 0) {
        this.scheduleGarbageCollection();
      }
    };
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
    this.updateState({ status: 'loading', isFetching: true });

    const promise = this.executeFetch();
    this.currentFetchPromise = promise;

    promise.finally(() => {
      this.currentFetchPromise = null;
    });

    return promise;
  }

  invalidate(): void {
    this.clearStaleTimeout();
    this.fetch();
  }

  /**
   * Try to get data from the shared cache (L2).
   * Returns the parsed data if found, or null if not found or on error.
   */
  private async getFromSharedCache(): Promise<TData | null> {
    if (!this.sharedCacheContext) return null;

    try {
      const cached = await this.sharedCacheContext.adapter.get(
        this.sharedCacheContext.key,
      );
      if (cached != null) {
        return JSON.parse(cached) as TData;
      }
    } catch {
      // Shared cache errors should not break the fetch flow
      // Silently fall through to L3
    }
    return null;
  }

  /**
   * Store data in the shared cache (L2).
   */
  private async setInSharedCache(data: TData): Promise<void> {
    if (!this.sharedCacheContext) return;

    try {
      await this.sharedCacheContext.adapter.set(
        this.sharedCacheContext.key,
        JSON.stringify(data),
        this.sharedCacheContext.ttl,
      );
    } catch {
      // Shared cache errors should not break the fetch flow
      // Silently ignore
    }
  }

  private async executeFetch(): Promise<TData> {
    try {
      // L2: Check shared cache first (only if configured)
      if (this.sharedCacheContext) {
        const cachedData = await this.getFromSharedCache();
        if (cachedData !== null) {
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
      const data = await this.options.queryFn();
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
    this.clearStaleTimeout();
    this.clearCacheTimeout();
    this.subscribers.clear();
    this.onGarbageCollection = undefined;
  }
}
