/**
 * useTodoStore - Custom hook with useSyncExternalStore (React 18+ pattern)
 *
 * Demonstrates:
 * - useSyncExternalStore for external store integration (the modern, correct way)
 * - Selector pattern for granular subscriptions
 * - Memoized selectors to prevent unnecessary re-renders
 * - Type-safe store access
 *
 * Why useSyncExternalStore over useEffect + useState?
 * - Concurrent-safe: Works correctly with React 18+ concurrent features
 * - Server-rendering compatible: Has getServerSnapshot
 * - Tearing prevention: Guaranteed consistent reads during render
 */

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { todoStore, type TodoState } from '../stores/todoStore';

// Store interface (matches our simple store implementation)
interface Store<T> {
  getState: () => T;
  subscribe: (listener: () => void) => () => void;
}

// ============================================================================
// Generic store hook with useSyncExternalStore
// ============================================================================

/**
 * Generic hook to subscribe to any @ts-query/core store with a selector
 * This is the 2026 best practice for external store integration
 */
export function useStoreWithSelector<TState, TSelected>(
  store: Store<TState>,
  selector: (state: TState) => TSelected,
): TSelected {
  // Subscribe function that returns an unsubscribe function
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return store.subscribe(onStoreChange);
    },
    [store],
  );

  // Get current snapshot
  const getSnapshot = useCallback(() => {
    return selector(store.getState());
  }, [store, selector]);

  // useSyncExternalStore is the React 18+ recommended way for external stores
  // It handles concurrent rendering correctly and prevents tearing
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

// ============================================================================
// Pre-built selectors (memoized for performance)
// ============================================================================

// These selectors are defined outside the component to ensure referential stability
const selectTodos = (state: TodoState) => state.todos;
const selectFilters = (state: TodoState) => state.filters;
const selectSortConfig = (state: TodoState) => state.sortConfig;
const selectIsHydrated = (state: TodoState) => state.isHydrated;
// Actions object - created once and cached for stable reference
// This prevents infinite loops with useSyncExternalStore
let cachedActions: TodoActions | null = null;

interface TodoActions {
  addTodo: TodoState['addTodo'];
  updateTodo: TodoState['updateTodo'];
  deleteTodo: TodoState['deleteTodo'];
  toggleStatus: TodoState['toggleStatus'];
  setFilters: TodoState['setFilters'];
  setSortConfig: TodoState['setSortConfig'];
  clearCompleted: TodoState['clearCompleted'];
}

function getActions(): TodoActions {
  if (!cachedActions) {
    const state = todoStore.getState();
    cachedActions = {
      addTodo: state.addTodo,
      updateTodo: state.updateTodo,
      deleteTodo: state.deleteTodo,
      toggleStatus: state.toggleStatus,
      setFilters: state.setFilters,
      setSortConfig: state.setSortConfig,
      clearCompleted: state.clearCompleted,
    };
  }
  return cachedActions;
}

// ============================================================================
// Specialized hooks for specific parts of state
// ============================================================================

/**
 * Hook to access raw todos array
 */
export function useTodos() {
  return useStoreWithSelector(todoStore, selectTodos);
}

/**
 * Hook to access filter state
 */
export function useFilters() {
  return useStoreWithSelector(todoStore, selectFilters);
}

/**
 * Hook to access sort configuration
 */
export function useSortConfig() {
  return useStoreWithSelector(todoStore, selectSortConfig);
}

/**
 * Hook to check hydration status
 */
export function useIsHydrated() {
  return useStoreWithSelector(todoStore, selectIsHydrated);
}

/**
 * Hook to access all store actions
 * Actions are stable references, so this won't cause re-renders
 *
 * Note: We don't use useSyncExternalStore here because actions never change.
 * Using useSyncExternalStore with a selector that returns a new object
 * would cause infinite re-renders.
 */
export function useTodoActions(): TodoActions {
  return getActions();
}

// ============================================================================
// Derived state hooks (computed from store state)
// ============================================================================

/**
 * Hook that returns filtered and sorted todos
 * Uses useMemo internally for derived state computation
 */
export function useFilteredTodos() {
  const todos = useTodos();
  const filters = useFilters();
  const sortConfig = useSortConfig();

  return useMemo(() => {
    let filtered = [...todos];

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((t) => t.status.type === filters.status);
    }

    // Apply priority filter
    if (filters.priority !== 'all') {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }

    // Apply search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query),
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const field = sortConfig.field;
      const direction = sortConfig.direction === 'asc' ? 1 : -1;

      if (field === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return (
          (priorityOrder[a.priority] - priorityOrder[b.priority]) * direction
        );
      }

      const aVal = a[field];
      const bVal = b[field];

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return aVal.localeCompare(bVal) * direction;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * direction;
      }
      return 0;
    });

    return filtered;
  }, [todos, filters, sortConfig]);
}
