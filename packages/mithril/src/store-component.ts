import m from 'mithril';
import type { Store } from '@ts-query/core';

export function createStoreComponent<TState, TSelected = TState>(
  store: Store<TState>,
  selector?: (state: TState) => TSelected,
  equalityFn: (a: TSelected, b: TSelected) => boolean = Object.is,
): m.Component<{ children: (selected: TSelected) => m.Children }> {
  const select = selector ?? ((state: TState) => state as unknown as TSelected);

  type LocalState = {
    selected: TSelected;
    unsubscribe?: () => void;
  };

  return {
    oninit(vnode) {
      const localState = vnode.state as LocalState;

      const initialSelected = select(store.getState());
      localState.selected = initialSelected;

      localState.unsubscribe = store.subscribe((nextState) => {
        const nextSelected = select(nextState);

        if (!equalityFn(localState.selected, nextSelected)) {
          localState.selected = nextSelected;
          m.redraw();
        }
      });
    },

    onremove(vnode) {
      const localState = vnode.state as LocalState;

      if (localState.unsubscribe) {
        localState.unsubscribe();
        localState.unsubscribe = undefined;
      }
    },

    view(vnode) {
      const localState = vnode.state as LocalState;
      return vnode.attrs.children(localState.selected);
    },
  };
}
