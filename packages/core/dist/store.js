export function createStore(initializer) {
    let state;
    const listeners = new Set();
    const getState = () => state;
    const setState = (partial, replace) => {
        const prevState = state;
        const nextStateValue = typeof partial === 'function'
            ? partial(prevState)
            : partial;
        if (nextStateValue === prevState) {
            return;
        }
        let nextState;
        if (replace || typeof nextStateValue !== 'object' || nextStateValue === null) {
            nextState = nextStateValue;
        }
        else {
            // Shallow merge for object states when not replacing
            nextState = {
                ...prevState,
                ...nextStateValue,
            };
        }
        state = nextState;
        listeners.forEach((listener) => listener(state, prevState));
    };
    const subscribe = (listener) => {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    };
    const destroy = () => {
        listeners.clear();
    };
    state = initializer(setState, getState);
    return {
        getState,
        setState,
        subscribe,
        destroy,
    };
}
//# sourceMappingURL=store.js.map