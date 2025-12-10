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

export interface QueryOptions<TData = unknown, TError = Error> {
  queryKey: QueryKey;
  queryFn: () => Promise<TData>;
  staleTime?: number;
  cacheTime?: number;
  retry?: number;
  retryDelay?: number;
  enabled?: boolean;
  onSuccess?: (data: TData) => void;
  onError?: (error: TError) => void;
}

export interface MutationOptions<TData = unknown, TVariables = unknown, TError = Error> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
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

