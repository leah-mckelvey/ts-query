import m from 'mithril';
export function createStoreComponent(store, selector, equalityFn = Object.is) {
    const select = selector ?? ((state) => state);
    return {
        oninit(vnode) {
            const localState = vnode.state;
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
            const localState = vnode.state;
            if (localState.unsubscribe) {
                localState.unsubscribe();
                localState.unsubscribe = undefined;
            }
        },
        view(vnode) {
            const localState = vnode.state;
            return vnode.attrs.children(localState.selected);
        },
    };
}
//# sourceMappingURL=store-component.js.map