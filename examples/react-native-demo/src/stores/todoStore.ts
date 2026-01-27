/**
 * Todo Store - Simple In-Memory Implementation
 *
 * Demonstrates:
 * - Zustand-like store pattern (without external dependencies)
 * - Type-safe state management
 * - Actions as part of state
 * - Derived state computations
 *
 * This demo uses a simplified in-memory store to keep the example focused on
 * demonstrating the @ts-query/ui-native components and React Native patterns.
 * For persistence with AsyncStorage, see the @ts-query/persist package which
 * provides createPersistStore() and createAsyncStorageAdapter().
 *
 * Example with persistence:
 * @example
 * ```ts
 * import { createPersistStore, createAsyncStorageAdapter } from '@ts-query/persist';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 *
 * const todoStore = createPersistStore<TodoState>(
 *   (set) => ({ ... }),
 *   {
 *     name: 'todo-storage',
 *     storage: createAsyncStorageAdapter(AsyncStorage),
 *   }
 * );
 * ```
 */

import type {
  Todo,
  TodoId,
  TodoFilters,
  SortConfig,
  Priority,
  TodoStatus,
} from '../types';
import { generateTodoId } from '../types';

// ============================================================================
// Simple Store Implementation (zustand-like pattern)
// ============================================================================

type SetState<T> = (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
type GetState<T> = () => T;
type Listener = () => void;

interface Store<T> {
  getState: GetState<T>;
  setState: SetState<T>;
  subscribe: (listener: Listener) => () => void;
}

function createStore<T>(
  initializer: (set: SetState<T>, get: GetState<T>) => T,
): Store<T> {
  let state: T;
  const listeners = new Set<Listener>();

  const getState: GetState<T> = () => state;

  const setState: SetState<T> = (partial) => {
    const nextPartial =
      typeof partial === 'function' ? partial(state) : partial;
    state = { ...state, ...nextPartial };
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: Listener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  state = initializer(setState, getState);

  return { getState, setState, subscribe };
}

// ============================================================================
// Store State Type
// ============================================================================

export interface TodoState {
  // Data
  readonly todos: readonly Todo[];

  // UI state
  readonly filters: TodoFilters;
  readonly sortConfig: SortConfig;
  readonly isHydrated: boolean;

  // Actions
  readonly addTodo: (
    title: string,
    description: string,
    priority: Priority,
  ) => Todo;
  readonly updateTodo: (
    id: TodoId,
    updates: Partial<Omit<Todo, 'id' | 'createdAt'>>,
  ) => void;
  readonly deleteTodo: (id: TodoId) => void;
  readonly toggleStatus: (id: TodoId) => void;
  readonly setFilters: (filters: Partial<TodoFilters>) => void;
  readonly setSortConfig: (config: Partial<SortConfig>) => void;
  readonly clearCompleted: () => void;
}

// ============================================================================
// Status transition logic
// ============================================================================

const getNextStatus = (current: TodoStatus): TodoStatus => {
  switch (current.type) {
    case 'pending':
      return { type: 'in_progress', startedAt: Date.now() };
    case 'in_progress':
      return { type: 'completed', completedAt: Date.now() };
    case 'completed':
      return { type: 'pending' };
  }
};

// ============================================================================
// Create the store
// ============================================================================

export const todoStore = createStore<TodoState>((set) => ({
  // Initial state
  todos: [],
  filters: {
    status: 'all',
    priority: 'all',
    searchQuery: '',
  },
  sortConfig: {
    field: 'createdAt',
    direction: 'desc',
  },
  isHydrated: true, // No async hydration in this simple version

  // Actions
  addTodo: (title, description, priority) => {
    const now = Date.now();
    const newTodo: Todo = {
      id: generateTodoId(),
      title: title.trim(),
      description: description.trim(),
      priority,
      status: { type: 'pending' },
      createdAt: now,
      updatedAt: now,
    };

    set((state) => ({
      todos: [newTodo, ...state.todos],
    }));

    return newTodo;
  },

  updateTodo: (id, updates) => {
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id ? { ...todo, ...updates, updatedAt: Date.now() } : todo,
      ),
    }));
  },

  deleteTodo: (id) => {
    set((state) => ({
      todos: state.todos.filter((todo) => todo.id !== id),
    }));
  },

  toggleStatus: (id) => {
    set((state) => ({
      todos: state.todos.map((todo) =>
        todo.id === id
          ? {
              ...todo,
              status: getNextStatus(todo.status),
              updatedAt: Date.now(),
            }
          : todo,
      ),
    }));
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  setSortConfig: (config) => {
    set((state) => ({
      sortConfig: { ...state.sortConfig, ...config },
    }));
  },

  clearCompleted: () => {
    set((state) => ({
      todos: state.todos.filter((todo) => todo.status.type !== 'completed'),
    }));
  },
}));
