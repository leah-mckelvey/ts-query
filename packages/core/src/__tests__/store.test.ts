import { describe, it, expect, vi } from 'vitest';
import { createStore, type Store } from '../store';

interface CounterState {
  count: number;
  label?: string;
}

describe('createStore', () => {
  it('should initialize with provided state', () => {
    const store = createStore<CounterState>(() => ({ count: 0 }));

    expect(store.getState()).toEqual({ count: 0 });
  });

  it('should update state with partial value', () => {
    const store = createStore<CounterState>(() => ({ count: 0, label: 'initial' }));

    store.setState({ count: 1 });

    expect(store.getState()).toEqual({ count: 1, label: 'initial' });
  });

  it('should update state using an updater function', () => {
    const store = createStore<CounterState>(() => ({ count: 0 }));

    store.setState((state) => ({ count: state.count + 1 }));

    expect(store.getState().count).toBe(1);
  });

  it('should replace state when replace flag is true', () => {
    const store = createStore<CounterState>(() => ({ count: 0, label: 'initial' }));

    store.setState({ count: 5 }, true);

    expect(store.getState()).toEqual({ count: 5 });
  });

  it('should notify subscribers on state change', () => {
    const store = createStore<CounterState>(() => ({ count: 0 }));
    const listener = vi.fn();

    store.subscribe(listener);

    store.setState({ count: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      { count: 1 },
      { count: 0 }
    );
  });

  it('should unsubscribe correctly', () => {
    const store = createStore<CounterState>(() => ({ count: 0 }));
    const listener = vi.fn();

    const unsubscribe = store.subscribe(listener);
    unsubscribe();

    store.setState({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should not notify subscribers when state does not change', () => {
    const store = createStore<CounterState>(() => ({ count: 0 }));
    const listener = vi.fn();

    store.subscribe(listener);

    // Setting the same state object should not trigger listeners
    const state = store.getState();
    store.setState(state, true);

    expect(listener).not.toHaveBeenCalled();
  });

  it('should stop notifying after destroy is called', () => {
    const store = createStore<CounterState>(() => ({ count: 0 }));
    const listener = vi.fn();

    store.subscribe(listener);
    store.destroy();

    store.setState({ count: 1 });

    expect(listener).not.toHaveBeenCalled();
  });
});
