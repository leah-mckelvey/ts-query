/**
 * Domain Types
 *
 * Demonstrates:
 * - Branded types for type-safe IDs (prevents mixing TodoId with UserId)
 * - Discriminated unions for exhaustive pattern matching
 * - Readonly properties for immutability
 * - Const assertions for literal types
 */

// ============================================================================
// Branded Types - Compile-time safety for IDs
// ============================================================================

declare const __brand: unique symbol;
type Brand<T, B> = T & { readonly [__brand]: B };

export type TodoId = Brand<string, 'TodoId'>;

// Type-safe ID creation
export const createTodoId = (id: string): TodoId => id as TodoId;
export const generateTodoId = (): TodoId =>
  createTodoId(`todo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`);

// ============================================================================
// Discriminated Union for Todo Status - Enables exhaustive pattern matching
// ============================================================================

export type TodoStatus =
  | { readonly type: 'pending' }
  | { readonly type: 'in_progress'; readonly startedAt: number }
  | { readonly type: 'completed'; readonly completedAt: number };

// Exhaustive pattern matching helper - will error if case is missed
export const assertNever = (x: never): never => {
  throw new Error(`Unexpected value: ${x}`);
};

// Status display helper with exhaustive matching
export const getStatusLabel = (status: TodoStatus): string => {
  switch (status.type) {
    case 'pending':
      return 'Pending';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    default:
      return assertNever(status);
  }
};

// ============================================================================
// Todo Entity - Immutable by design
// ============================================================================

export type Priority = 'low' | 'medium' | 'high';

export const PRIORITIES = [
  'low',
  'medium',
  'high',
] as const satisfies readonly Priority[];

export interface Todo {
  readonly id: TodoId;
  readonly title: string;
  readonly description: string;
  readonly status: TodoStatus;
  readonly priority: Priority;
  readonly createdAt: number;
  readonly updatedAt: number;
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export type StatusFilter = TodoStatus['type'] | 'all';
export type PriorityFilter = Priority | 'all';

export interface TodoFilters {
  readonly status: StatusFilter;
  readonly priority: PriorityFilter;
  readonly searchQuery: string;
}

export type SortField = 'title' | 'priority' | 'createdAt' | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  readonly field: SortField;
  readonly direction: SortDirection;
}

// ============================================================================
// Form Types with Validation
// ============================================================================

export interface TodoFormData {
  title: string;
  description: string;
  priority: Priority;
}

export type ValidationErrors = Partial<Record<keyof TodoFormData, string>>;

export type ValidationResult<T> =
  | { readonly valid: true; readonly data: T }
  | { readonly valid: false; readonly errors: ValidationErrors };

// ============================================================================
// Action Types for useReducer / useActionState
// ============================================================================

export type TodoAction =
  | { type: 'ADD_TODO'; payload: Todo }
  | { type: 'UPDATE_TODO'; payload: { id: TodoId; updates: Partial<Todo> } }
  | { type: 'DELETE_TODO'; payload: { id: TodoId } }
  | { type: 'TOGGLE_STATUS'; payload: { id: TodoId } }
  | { type: 'SET_TODOS'; payload: Todo[] }
  | { type: 'OPTIMISTIC_ADD'; payload: Todo }
  | { type: 'REVERT_OPTIMISTIC'; payload: { id: TodoId } };
