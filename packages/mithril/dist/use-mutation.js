import m from 'mithril';
import { getQueryClient } from './query-client-provider';
// WeakMap to store cleanup functions for mutations
// This avoids memory leaks and type safety issues with attaching to objects
const cleanupMap = new WeakMap();
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
export function createMutationComponent(options) {
    let mutation;
    return {
        oninit() {
            const client = getQueryClient();
            mutation = client.createMutation(options);
            // Subscribe to mutation updates and trigger Mithril redraw
            const unsubscribe = mutation.subscribe(() => {
                m.redraw();
            });
            // Store cleanup function in WeakMap (avoids memory leaks and type issues)
            cleanupMap.set(mutation, unsubscribe);
        },
        onremove() {
            // Clean up subscription when component is removed
            const unsubscribe = cleanupMap.get(mutation);
            if (unsubscribe) {
                unsubscribe();
                cleanupMap.delete(mutation);
            }
        },
        view(vnode) {
            // Create result object on each render to get fresh state
            const result = {
                mutate: (variables) => mutation.mutate(variables),
                mutateAsync: (variables) => mutation.mutate(variables),
                reset: () => mutation.reset(),
                state: mutation.state,
            };
            return vnode.attrs.children(result);
        },
    };
}
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
export function useMutation(options) {
    const client = getQueryClient();
    const mutation = client.createMutation(options);
    // Subscribe to mutation updates and trigger Mithril redraw
    const unsubscribe = mutation.subscribe(() => {
        m.redraw();
    });
    // Store cleanup function in WeakMap
    cleanupMap.set(mutation, unsubscribe);
    const mutate = async (variables) => {
        return mutation.mutate(variables);
    };
    const reset = () => {
        mutation.reset();
    };
    return {
        mutate,
        mutateAsync: mutate,
        reset,
        state: mutation.state,
    };
}
//# sourceMappingURL=use-mutation.js.map