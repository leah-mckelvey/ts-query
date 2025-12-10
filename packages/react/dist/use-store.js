import { useEffect, useState } from 'react';
export function useStore(store, selector, equalityFn = Object.is) {
    const select = selector ?? ((state) => state);
    const [selectedState, setSelectedState] = useState(() => select(store.getState()));
    useEffect(() => {
        let currentSelected = select(store.getState());
        // Ensure local state is in sync in case the store changed before effect ran
        setSelectedState(currentSelected);
        const unsubscribe = store.subscribe((state) => {
            const newSelected = select(state);
            if (!equalityFn(currentSelected, newSelected)) {
                currentSelected = newSelected;
                setSelectedState(newSelected);
            }
        });
        return () => {
            unsubscribe();
        };
    }, [store, select, equalityFn]);
    return selectedState;
}
//# sourceMappingURL=use-store.js.map