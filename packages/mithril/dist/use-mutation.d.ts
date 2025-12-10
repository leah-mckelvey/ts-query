import m from 'mithril';
import type { MutationOptions, MutationState } from '@ts-query/core';
export interface UseMutationResult<TData = unknown, TVariables = unknown, TError = Error> {
    mutate: (variables: TVariables) => Promise<TData>;
    mutateAsync: (variables: TVariables) => Promise<TData>;
    reset: () => void;
    state: MutationState<TData, TError>;
}
/**
 * Creates a Mithril component that manages a mutation with proper lifecycle.
 *
 * In Mithril, hooks should NOT be called in view functions (unlike React).
 * Instead, use this function to create a component with lifecycle methods.
 *
 * @example
 * const CreatePostMutation = createMutationComponent({
 *   mutationFn: createPost,
 *   onSuccess: (data) => console.log('Created:', data),
 * });
 *
 * // In your view:
 * m(CreatePostMutation, {
 *   children: (result) => m('button', {
 *     onclick: () => result.mutate({ title: 'Hello' })
 *   }, 'Create Post')
 * })
 */
export declare function createMutationComponent<TData = unknown, TVariables = unknown, TError = Error>(options: MutationOptions<TData, TVariables, TError>): m.Component<{
    children: (result: UseMutationResult<TData, TVariables, TError>) => m.Children;
}>;
/**
 * Legacy hook-style API for backward compatibility.
 *
 * WARNING: This should NOT be called in view functions!
 * It will create memory leaks because subscriptions are never cleaned up.
 *
 * Use createMutationComponent() instead for proper lifecycle management.
 *
 * @deprecated Use createMutationComponent() instead
 */
export declare function useMutation<TData = unknown, TVariables = unknown, TError = Error>(options: MutationOptions<TData, TVariables, TError>): UseMutationResult<TData, TVariables, TError>;
//# sourceMappingURL=use-mutation.d.ts.map