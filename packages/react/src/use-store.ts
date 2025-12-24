import { useEffect, useMemo, useState } from 'react';
import type { Store } from '@ts-query/core';

export function useStore<TState, TSelected = TState>(
  store: Store<TState>,
  selector?: (state: TState) => TSelected,
  equalityFn: (a: TSelected, b: TSelected) => boolean = Object.is,
): TSelected {
  const select = useMemo(
    () => selector ?? ((state: TState) => state as unknown as TSelected),
    [selector],
  );

  const [selectedState, setSelectedState] = useState<TSelected>(() =>
    select(store.getState()),
  );

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
