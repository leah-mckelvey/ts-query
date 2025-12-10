import m from 'mithril';
import type { Store } from '@ts-query/core';
export declare function createStoreComponent<TState, TSelected = TState>(store: Store<TState>, selector?: (state: TState) => TSelected, equalityFn?: (a: TSelected, b: TSelected) => boolean): m.Component<{
    children: (selected: TSelected) => m.Children;
}>;
//# sourceMappingURL=store-component.d.ts.map