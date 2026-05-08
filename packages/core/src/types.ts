export type QueryKey = string | readonly unknown[];

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

export interface QueryState<TData = unknown, TError = Error> {
  status: QueryStatus;
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Adapter interface for shared cache backends (Redis, Memcached, etc.)
 * Used as L2 cache in the tiered caching hierarchy: L1 (in-process) → L2 (shared) → L3 (source)
 */
export interface SharedCacheAdapter {
  /** Get a value from the shared cache. Returns null if not found. */
  get: (key: string) => Promise<string | null>;
  /** Set a value in the shared cache with a TTL in milliseconds. */
  set: (key: string, value: string, ttlMs: number) => Promise<void>;
  /** Delete a value from the shared cache. */
  delete: (key: string) => Promise<void>;
  /**
   * Clear all entries from the shared cache.
   * Optional - primarily used for testing to reset state between tests.
   */
  clear?: () => Promise<void>;
}

/**
 * Configuration for the shared cache (L2) layer.
 */
export interface SharedCacheConfig {
  /** The adapter implementation (Redis, Memcached, etc.) */
  adapter: SharedCacheAdapter;
  /** Default TTL for shared cache entries in milliseconds. Defaults to 5 minutes. */
  defaultTtl?: number;
}

/**
 * Configuration options for QueryClient.
 */
export interface QueryClientConfig {
  /** Optional shared cache (L2) configuration for multi-tier caching. */
  sharedCache?: SharedCacheConfig;
}

/**
 * Context passed to every queryFn invocation. Mirrors the TanStack Query shape.
 * `signal` is aborted when the query is cancelled (via QueryClient.cancelQueries,
 * Query.cancel, or invalidation while a fetch is in flight). queryFn implementations
 * should forward this signal to fetch() / XHR / GraphQL clients to short-circuit
 * in-flight network requests.
 */
export interface QueryFunctionContext {
  queryKey: QueryKey;
  signal: AbortSignal;
}

export type QueryFunction<TData = unknown> = (
  context: QueryFunctionContext,
) => Promise<TData>;

export interface QueryOptions<TData = unknown, TError = Error> {
  queryKey: QueryKey;
  queryFn: QueryFunction<TData>;
  staleTime?: number;
  cacheTime?: number;
  /** TTL for shared cache (L2) in milliseconds. Overrides the client-level default. */
  sharedCacheTtl?: number;
  /** Whether to skip the shared cache for this query. Defaults to false. */
  skipSharedCache?: boolean;
  retry?: number;
  retryDelay?: number;
  enabled?: boolean;
  /**
   * Refetch on this interval (ms). Pauses while there are no subscribers
   * and (by default) while the tab is backgrounded. Set 0 / undefined to disable.
   */
  refetchInterval?: number;
  /**
   * If true, refetchInterval keeps ticking when the tab is hidden. Defaults
   * to false to match TanStack — most apps don't want background polling.
   */
  refetchIntervalInBackground?: boolean;
  /** Refetch when the window/tab regains focus and data is stale. Defaults to true. */
  refetchOnWindowFocus?: boolean;
  /** Refetch when the network reconnects and data is stale. Defaults to true. */
  refetchOnReconnect?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
}

export interface MutationOptions<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
  ) => void;
}

export interface MutationState<TData = unknown, TError = Error> {
  status: QueryStatus;
  data: TData | undefined;
  error: TError | null;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

export type Subscriber<T> = (state: T) => void;

export interface Query<TData = unknown, TError = Error> {
  state: QueryState<TData, TError>;
  subscribe: (subscriber: Subscriber<QueryState<TData, TError>>) => () => void;
  fetch: () => Promise<TData>;
  invalidate: () => void;
}
