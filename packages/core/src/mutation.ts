import type { MutationOptions, MutationState, Subscriber } from './types';

export class Mutation<
  TData = unknown,
  TVariables = unknown,
  TError = Error,
  TContext = unknown,
> {
  private subscribers = new Set<Subscriber<MutationState<TData, TError>>>();
  private options: MutationOptions<TData, TVariables, TError, TContext>;

  state: MutationState<TData, TError> = {
    status: 'idle',
    data: undefined,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  };

  constructor(options: MutationOptions<TData, TVariables, TError, TContext>) {
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

    // onMutate runs before the network call. Whatever it returns is the
    // context that lifecycle callbacks receive — used to roll back optimistic
    // updates on error.
    let context: TContext | undefined;
    if (this.options.onMutate) {
      try {
        context = await this.options.onMutate(variables);
      } catch (onMutateError) {
        // onMutate failed before we even called mutationFn. Treat the same
        // as a mutationFn failure: surface the error, fire onError/onSettled
        // with no context (since onMutate didn't complete).
        const err = onMutateError as TError;
        this.updateState({ status: 'error', error: err });
        await this.options.onError?.(err, variables, undefined);
        await this.options.onSettled?.(undefined, err, variables, undefined);
        throw err;
      }
    }

    try {
      const data = await this.options.mutationFn(variables);
      this.updateState({
        status: 'success',
        data,
        error: null,
      });

      await this.options.onSuccess?.(data, variables, context);
      await this.options.onSettled?.(data, null, variables, context);

      return data;
    } catch (error) {
      const err = error as TError;
      this.updateState({
        status: 'error',
        error: err,
      });

      await this.options.onError?.(err, variables, context);
      await this.options.onSettled?.(undefined, err, variables, context);

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
