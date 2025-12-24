import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { createStore } from '../../../core/src/store';
import { useStore } from '../use-store';

interface CounterState {
  count: number;
  increment: () => void;
}

function createCounterStore() {
  return createStore<CounterState>((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }));
}

describe('useStore', () => {
  it('should render initial state and respond to store updates', () => {
    const counterStore = createCounterStore();

    function Counter() {
      const count = useStore(counterStore, (state) => state.count);
      return <div>Count: {count}</div>;
    }

    render(<Counter />);

    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    act(() => {
      counterStore.getState().increment();
    });

    expect(screen.getByText('Count: 1')).toBeInTheDocument();
  });

  it('should allow multiple components to share the same store', () => {
    const counterStore = createCounterStore();

    function Counter() {
      const count = useStore(counterStore, (state) => state.count);
      return <div>Count: {count}</div>;
    }

    function App() {
      return (
        <div>
          <Counter />
          <Counter />
        </div>
      );
    }

    render(<App />);

    expect(screen.getAllByText('Count: 0')).toHaveLength(2);

    act(() => {
      counterStore.getState().increment();
    });

    expect(screen.getAllByText('Count: 1')).toHaveLength(2);
  });

  it('should support custom equalityFn to prevent unnecessary re-renders', () => {
    const counterStore = createCounterStore();

    function Counter() {
      const count = useStore(
        counterStore,
        (state) => state.count,
        // Equality function that always treats values as equal
        () => true,
      );
      return <div>Count: {count}</div>;
    }

    render(<Counter />);

    expect(screen.getByText('Count: 0')).toBeInTheDocument();

    act(() => {
      counterStore.getState().increment();
    });

    // Because equalityFn always returns true, the component should not re-render
    expect(screen.getByText('Count: 0')).toBeInTheDocument();
  });
});
