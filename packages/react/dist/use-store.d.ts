import type { Store } from '@ts-query/core';
export declare function useStore<TState, TSelected = TState>(store: Store<TState>, selector?: (state: TState) => TSelected, equalityFn?: (a: TSelected, b: TSelected) => boolean): TSelected;
//# sourceMappingURL=use-store.d.ts.map