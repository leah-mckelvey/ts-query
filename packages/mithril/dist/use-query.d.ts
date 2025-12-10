import m from 'mithril';
import type { QueryOptions, QueryState } from '@ts-query/core';
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
export declare function createQueryComponent<TData = unknown, TError = Error>(options: QueryOptions<TData, TError>): m.Component<{
    children: (state: QueryState<TData, TError>) => m.Children;
}>;
//# sourceMappingURL=use-query.d.ts.map