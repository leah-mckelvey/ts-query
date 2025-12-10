import type { MutationOptions, MutationState, Subscriber } from './types';
export declare class Mutation<TData = unknown, TVariables = unknown, TError = Error> {
    private subscribers;
    private options;
    state: MutationState<TData, TError>;
    constructor(options: MutationOptions<TData, TVariables, TError>);
    subscribe(subscriber: Subscriber<MutationState<TData, TError>>): () => void;
    private notify;
    private updateState;
    mutate(variables: TVariables): Promise<TData>;
    reset(): void;
}
//# sourceMappingURL=mutation.d.ts.map