import type { MutationOptions, MutationState, Subscriber } from './types';

export class Mutation<TData = unknown, TVariables = unknown, TError = Error> {
  private subscribers = new Set<Subscriber<MutationState<TData, TError>>>();
  private options: MutationOptions<TData, TVariables, TError>;

  state: MutationState<TData, TError> = {
    status: 'idle',
    data: undefined,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  };

  constructor(options: MutationOptions<TData, TVariables, TError>) {
    this.options = options;
  }

  subscribe(subscriber: Subscriber<MutationState<TData, TError>>): () => void {
    this.subscribers.add(subscriber);
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  private notify(): void {
    this.subscribers.forEach((subscriber) => subscriber(this.state));
  }

  private updateState(partial: Partial<MutationState<TData, TError>>): void {
    // Use newStatus to handle cases where status is not in partial
    // This ensures boolean flags are always correct
    const newStatus = partial.status ?? this.state.status;
    this.state = {
      ...this.state,
      ...partial,
      status: newStatus,
      isLoading: newStatus === 'loading',
      isSuccess: newStatus === 'success',
      isError: newStatus === 'error',
    };
    this.notify();
  }

  async mutate(variables: TVariables): Promise<TData> {
    this.updateState({ status: 'loading' });

    try {
      const data = await this.options.mutationFn(variables);
      this.updateState({
        status: 'success',
        data,
        error: null,
      });

      this.options.onSuccess?.(data, variables);
      this.options.onSettled?.(data, null, variables);

      return data;
    } catch (error) {
      const err = error as TError;
      this.updateState({
        status: 'error',
        error: err,
      });

      this.options.onError?.(err, variables);
      this.options.onSettled?.(undefined, err, variables);

      throw err;
    }
  }

  reset(): void {
    this.state = {
      status: 'idle',
      data: undefined,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false,
    };
    this.notify();
  }
}

