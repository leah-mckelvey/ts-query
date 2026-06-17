import { BehaviorSubject, type Observable } from 'rxjs';
import type { MutationOptions, MutationState } from './types';
import { deriveStatusFlags, createInitialMutationState } from './types';

export class Mutation<TData = unknown, TVariables = unknown, TError = Error> {
  private state$: BehaviorSubject<MutationState<TData, TError>>;
  private options: MutationOptions<TData, TVariables, TError>;

  get state(): MutationState<TData, TError> {
    return this.state$.value;
  }

  get state$Observable(): Observable<MutationState<TData, TError>> {
    return this.state$.asObservable();
  }

  constructor(options: MutationOptions<TData, TVariables, TError>) {
    this.options = options;

    // Initialize BehaviorSubject with default state
    this.state$ = new BehaviorSubject<MutationState<TData, TError>>(
      createInitialMutationState<TData, TError>(),
    );
  }

  subscribe(
    observerOrCallback:
      | {
          next: (state: MutationState<TData, TError>) => void;
          error?: (err: unknown) => void;
          complete?: () => void;
        }
      | ((state: MutationState<TData, TError>) => void),
  ): () => void {
    const observer =
      typeof observerOrCallback === 'function'
        ? { next: observerOrCallback }
        : observerOrCallback;
    const subscription = this.state$.subscribe(observer);
    return () => subscription.unsubscribe();
  }

  private updateState(partial: Partial<MutationState<TData, TError>>): void {
    const prevState = this.state$.value;
    const newStatus = partial.status ?? prevState.status;
    const nextState = {
      ...prevState,
      ...partial,
      status: newStatus,
      ...deriveStatusFlags(newStatus),
    };
    this.state$.next(nextState);
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
    this.state$.next(createInitialMutationState<TData, TError>());
  }
}
