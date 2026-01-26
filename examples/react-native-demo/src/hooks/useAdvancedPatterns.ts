/**
 * Advanced React 18+ Hooks Patterns
 *
 * Demonstrates:
 * - useTransition for non-blocking UI updates
 * - useDeferredValue for deprioritizing expensive renders
 * - Custom hooks with proper cleanup
 *
 * All patterns here work with React 18.2.0+ (production-stable)
 */

import {
  useTransition,
  useDeferredValue,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type {
  TodoFormData,
  ValidationResult,
  ValidationErrors,
} from '../types';
import { useTodoActions } from './useTodoStore';

// ============================================================================
// useTransition - Non-blocking state updates
// ============================================================================

/**
 * Hook that wraps filter updates in a transition for smooth UI
 *
 * useTransition marks state updates as non-urgent, allowing React to:
 * - Keep the UI responsive during expensive updates
 * - Interrupt the update if more urgent updates come in
 * - Show pending state while the update is processing
 */
export function useFilterTransition() {
  const [isPending, startTransition] = useTransition();
  const { setFilters } = useTodoActions();

  const updateFiltersWithTransition = useCallback(
    (updates: Parameters<typeof setFilters>[0]) => {
      // Wrap the state update in a transition
      // This tells React this update is not urgent and can be interrupted
      startTransition(() => {
        setFilters(updates);
      });
    },
    [setFilters],
  );

  return {
    isPending,
    updateFilters: updateFiltersWithTransition,
  };
}

// ============================================================================
// useDeferredValue - Deprioritize expensive renders
// ============================================================================

/**
 * Hook that defers a search query to prevent UI jank during typing
 *
 * useDeferredValue returns a "stale" version of the value during urgent updates.
 * This prevents expensive filtering/rendering from blocking the input.
 */
export function useDeferredSearch(searchQuery: string) {
  // The deferred value will lag behind during rapid updates
  const deferredQuery = useDeferredValue(searchQuery);

  // Can detect if we're showing stale data
  const isStale = searchQuery !== deferredQuery;

  return {
    deferredQuery,
    isStale,
  };
}

// ============================================================================
// Form Validation Hook with proper cleanup
// ============================================================================

/**
 * Hook for form validation with debouncing and cleanup
 *
 * Demonstrates:
 * - Proper cleanup of timers
 * - Refs to avoid stale closures
 * - Validation logic separation
 */
export function useFormValidation() {
  const [errors, setErrors] = useState<ValidationErrors>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate form data
  const validate = useCallback(
    (data: TodoFormData): ValidationResult<TodoFormData> => {
      const newErrors: ValidationErrors = {};

      if (!data.title.trim()) {
        newErrors.title = 'Title is required';
      } else if (data.title.length > 100) {
        newErrors.title = 'Title must be 100 characters or less';
      }

      if (data.description.length > 500) {
        newErrors.description = 'Description must be 500 characters or less';
      }

      const hasErrors = Object.keys(newErrors).length > 0;

      setErrors(newErrors);

      return hasErrors
        ? { valid: false, errors: newErrors }
        : { valid: true, data };
    },
    [],
  );

  // Debounced validation for real-time feedback
  const validateDebounced = useCallback(
    (data: TodoFormData) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        validate(data);
      }, 300);
    },
    [validate],
  );

  // Proper cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  return {
    errors,
    validate,
    validateDebounced,
    clearErrors,
  };
}
