import m from 'mithril';
import { getQueryClient } from './query-client-provider';
// WeakMap to store cleanup functions for queries
// This avoids memory leaks and type safety issues with attaching to objects
const cleanupMap = new WeakMap();
/**
 * Creates a Mithril component that manages a query with proper lifecycle.
 *
 * In Mithril, hooks should NOT be called in view functions (unlike React).
 * Instead, use this function to create a component with lifecycle methods.
 *
 * @example
 * const UserQuery = createQueryComponent({
 *   queryKey: ['user', userId],
 *   queryFn: () => fetchUser(userId),
 * });
 *
 * // In your view:
 * m(UserQuery, {
 *   children: (state) => m('div', state.data?.name)
 * })
 */
export function createQueryComponent(options) {
    let query;
    return {
        oninit() {
            const client = getQueryClient();
            query = client.getQuery(options);
            // Subscribe to query updates and trigger Mithril redraw
            const unsubscribe = query.subscribe(() => {
                m.redraw();
            });
            // Store cleanup function in WeakMap (avoids memory leaks and type issues)
            cleanupMap.set(query, unsubscribe);
            // Fetch if enabled and no data
            const enabled = options.enabled !== false;
            if (enabled && query.state.status === 'idle') {
                query.fetch().catch(() => {
                    // Error already handled by Query class:
                    // - State updated (status: 'error', error set)
                    // - onError callback invoked
                    // - Subscribers notified (m.redraw() will be called)
                    // Catch here only prevents unhandled promise rejection warning
                });
            }
        },
        onremove() {
            // Clean up subscription when component is removed
            const unsubscribe = cleanupMap.get(query);
            if (unsubscribe) {
                unsubscribe();
                cleanupMap.delete(query);
            }
        },
        view(vnode) {
            return vnode.attrs.children(query.state);
        },
    };
}
/**
 * Legacy hook-style API for backward compatibility.
 *
 * WARNING: This should NOT be called in view functions!
 * It will create memory leaks because subscriptions are never cleaned up.
 *
 * Use createQueryComponent() instead for proper lifecycle management.
 *
 * @deprecated Use createQueryComponent() instead
 */
export function useQuery(options) {
    const client = getQueryClient();
    const query = client.getQuery(options);
    // Subscribe to query updates and trigger Mithril redraw
    const unsubscribe = query.subscribe(() => {
        m.redraw();
    });
    // Store cleanup function in WeakMap
    cleanupMap.set(query, unsubscribe);
    // Fetch if enabled and no data
    const enabled = options.enabled !== false;
    if (enabled && query.state.status === 'idle') {
        query.fetch().catch(() => {
            // Error already handled by Query class:
            // - State updated (status: 'error', error set)
            // - onError callback invoked
            // - Subscribers notified (m.redraw() will be called)
            // Catch here only prevents unhandled promise rejection warning
        });
    }
    return query.state;
}
//# sourceMappingURL=use-query.js.map