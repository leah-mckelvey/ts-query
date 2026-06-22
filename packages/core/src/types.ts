// #######################################
// FOUNDATIONAL TYPES
// #######################################

export type QueryKey = string | readonly unknown[];

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error';

// #######################################
// OPERATION STATE SYSTEM
// #######################################

// ##############################
// Core State Types
// ##############################

/**
 * Core data for an asynchronous operation, without derived flags.
 * This is the irreducible state—everything else can be computed from these fields.
 */
export interface OperationCore<TData = unknown, TError = Error> {
  status: QueryStatus;
  data: TData | undefined;
  error: TError | null;
}

/**
 * Derives boolean flags from a status value.
 * This embeds the design concept that isLoading/isSuccess/isError
 * are pure projections of the status field.
 */
export interface StatusFlags {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

/**
 * Query-specific state extensions beyond the core operation state.
 */
export interface QueryExtensions {
  isFetching: boolean;
  isStale: boolean;
}

// ##############################
// State Composition
// ##############################

/**
 * Complete query state: core + derived flags + query-specific extensions.
 */
export type QueryState<TData = unknown, TError = Error> = OperationCore<
  TData,
  TError
> &
  StatusFlags &
  QueryExtensions;

/**
 * Complete mutation state: core + derived flags (no query-specific extensions).
 */
export type MutationState<TData = unknown, TError = Error> = OperationCore<
  TData,
  TError
> &
  StatusFlags;

// ##############################
// State Derivation Utilities
// ##############################

/**
 * Computes status-derived boolean flags from a QueryStatus value.
 * Single source of truth for the status → booleans relationship.
 */
export function deriveStatusFlags(status: QueryStatus): StatusFlags {
  return {
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
}

/**
 * Creates the initial idle state for a query.
 * Single source of truth for what "idle" means across all query instances.
 */
export function createInitialQueryState<
  TData = unknown,
  TError = Error,
>(): QueryState<TData, TError> {
  return {
    status: 'idle',
    data: undefined,
    error: null,
    ...deriveStatusFlags('idle'),
    isFetching: false,
    isStale: false,
  };
}

/**
 * Creates the initial idle state for a mutation.
 * Single source of truth for what "idle" means across all mutation instances.
 */
export function createInitialMutationState<
  TData = unknown,
  TError = Error,
>(): MutationState<TData, TError> {
  return {
    status: 'idle',
    data: undefined,
    error: null,
    ...deriveStatusFlags('idle'),
  };
}

// #######################################
// CACHING SYSTEM
// #######################################

// ##############################
// Shared Cache (L2)
// ##############################

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

// ##############################
// Normalized Cache (GraphQL)
// ##############################

/**
 * Per-type normalization policy for the normalized cache.
 *
 * @example
 * // Use a composite key
 * { keyFields: ['orgId', 'userId'] }
 *
 * @example
 * // Custom merge: append instead of replace for a list field
 * { merge: (existing, incoming) => ({ ...incoming, items: [...(existing.items ?? []), ...incoming.items] }) }
 */
export interface TypePolicy {
  /**
   * Field name(s) used to derive the entity's cache key.
   * Defaults to `'id'` when omitted.
   */
  keyFields?: string | string[];
  /**
   * Custom merge function for this type.
   * Receives the existing cached record and the incoming record;
   * returns the merged record to store.
   * When omitted a shallow merge (`{ ...existing, ...incoming }`) is used.
   */
  merge?: (
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
  ) => Record<string, unknown>;
}

/**
 * Configuration for the in-process normalized entity cache.
 *
 * When provided to QueryClient, query results containing objects with
 * `__typename` are automatically normalized into a flat entity store.
 * Calling `writeFragment` on a type updates every query that referenced
 * that entity — no refetch required.
 */
export interface NormalizedCacheConfig {
  /**
   * Per-type normalization policies.
   * Types not listed here use the default policy (`keyFields: 'id'`).
   */
  typePolicies?: Record<string, TypePolicy>;
}

// #######################################
// CLIENT CONFIGURATION
// #######################################

/**
 * Configuration options for QueryClient.
 */
export interface QueryClientConfig {
  /** Optional shared cache (L2) configuration for multi-tier caching. */
  sharedCache?: SharedCacheConfig;
  /** Optional normalized entity cache for GraphQL responses. */
  normalizedCache?: NormalizedCacheConfig;
  /**
   * Maximum number of queries to retain in the in-process cache (L1).
   * When this limit is reached, the least recently used query with zero subscribers
   * will be evicted. Queries with active subscribers are never evicted.
   *
   * **Note:** This is a best-effort bound. If all queries have active subscribers,
   * the cache may temporarily exceed `maxQueries` to avoid breaking active subscriptions.
   * This overflow is expected and safe - once subscribers are removed, eviction resumes.
   *
   * @default Infinity (unbounded - suitable for client-side with component-based GC)
   *
   * For server-side deployments handling many distinct keys across multiple users,
   * set this to a reasonable bound (e.g., 1000) to prevent unbounded memory growth.
   */
  maxQueries?: number;
}

// #######################################
// LIFECYCLE CALLBACKS
// #######################################

/**
 * Lifecycle callbacks for asynchronous operations.
 * Generic over TContext to allow different operations to pass different context.
 */
export interface LifecycleCallbacks<
  TData = unknown,
  TError = Error,
  TContext = void,
> {
  /** Called when the operation succeeds. */
  onSuccess?: (data: TData, context: TContext) => void;
  /** Called when the operation fails. */
  onError?: (error: TError, context: TContext) => void;
}

/**
 * Mutation lifecycle callbacks with an additional settled hook.
 * Settled is called regardless of success or failure.
 */
export interface MutationLifecycleCallbacks<
  TData = unknown,
  TError = Error,
  TVariables = unknown,
> extends LifecycleCallbacks<TData, TError, TVariables> {
  /** Called when the operation completes, whether success or error. */
  onSettled?: (
    data: TData | undefined,
    error: TError | null,
    variables: TVariables,
  ) => void;
}

/**
 * Query-specific lifecycle callbacks (no context needed).
 */
type QueryLifecycleCallbacks<TData = unknown, TError = Error> = {
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
};

// #######################################
// OPERATION OPTIONS
// #######################################

export interface QueryOptions<
  TData = unknown,
  TError = Error,
> extends QueryLifecycleCallbacks<TData, TError> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  staleTime?: number;
  cacheTime?: number;
  /** TTL for shared cache (L2) in milliseconds. Overrides the client-level default. */
  sharedCacheTtl?: number;
  /** Whether to skip the shared cache for this query. Defaults to false. */
  skipSharedCache?: boolean;
  retry?: number;
  retryDelay?: number;
  enabled?: boolean;
}

export interface MutationOptions<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
> extends MutationLifecycleCallbacks<TData, TError, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
}

// #######################################
// OBSERVER PATTERN
// #######################################

export type Subscriber<T> = (state: T) => void;

export interface Query<TData = unknown, TError = Error> {
  state: QueryState<TData, TError>;
  subscribe: (subscriber: Subscriber<QueryState<TData, TError>>) => () => void;
  fetch: () => Promise<TData>;
  invalidate: () => void;
}
