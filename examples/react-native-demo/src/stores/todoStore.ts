/**
 * Todo Store
 *
 * Demonstrates using @ts-query/core's createStore for state management.
 * For persistence with AsyncStorage, use @ts-query/persist's createPersistStore.
 */

import { createStore } from '@ts-query/core';
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
