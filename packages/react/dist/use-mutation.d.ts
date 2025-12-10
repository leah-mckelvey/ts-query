import type { MutationOptions, MutationState } from '@ts-query/core';
export interface UseMutationResult<TData = unknown, TVariables = unknown, TError = Error> {
    mutate: (variables: TVariables) => Promise<TData>;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    reset: () => void;
    state: MutationState<TData, TError>;
}
export declare function useMutation<TData = unknown, TVariables = unknown, TError = Error>(options: MutationOptions<TData, TVariables, TError>): UseMutationResult<TData, TVariables, TError>;
//# sourceMappingURL=use-mutation.d.ts.map