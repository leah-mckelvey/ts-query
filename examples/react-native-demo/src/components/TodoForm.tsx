/**
 * TodoForm Component
 *
 * Demonstrates:
 * - Controlled form pattern
 * - Real-time validation with debouncing
 * - useReducer for complex form state
 * - Proper keyboard handling
 */

import React, { useReducer, useCallback, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native';
import { Button } from '@ts-query/ui-native';
import type { Priority, TodoFormData } from '../types';
import { PRIORITIES } from '../types';
import { useTheme } from '../contexts';
import { useFormValidation } from '../hooks';

// ============================================================================
// Form State Reducer
// ============================================================================

type FormAction =
  | { type: 'SET_FIELD'; field: keyof TodoFormData; value: string }
  | { type: 'SET_PRIORITY'; priority: Priority }
  | { type: 'RESET' };

const initialFormState: TodoFormData = {
  title: '',
  description: '',
  priority: 'medium',
};

function formReducer(state: TodoFormData, action: FormAction): TodoFormData {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_PRIORITY':
      return { ...state, priority: action.priority };
    case 'RESET':
      return initialFormState;
    default:
      return state;
  }
}

// ============================================================================
// Types
// ============================================================================

interface TodoFormProps {
  readonly onSubmit: (data: TodoFormData) => void;
  readonly onCancel?: () => void;
  readonly initialData?: Partial<TodoFormData>;
  readonly submitLabel?: string;
  readonly isSubmitting?: boolean;
}

// ============================================================================
// TodoForm Component
// ============================================================================

export function TodoForm({
  onSubmit,
  onCancel,
  initialData,
  submitLabel = 'Add Todo',
  isSubmitting = false,
}: TodoFormProps) {
  const theme = useTheme();
  const { errors, validate, validateDebounced, clearErrors } =
    useFormValidation();

  // useReducer for complex form state management
  const [formData, dispatch] = useReducer(
    formReducer,
    initialData ? { ...initialFormState, ...initialData } : initialFormState,
  );

  // Validate on change with debouncing
  useEffect(() => {
    if (formData.title || formData.description) {
      validateDebounced(formData);
    }
  }, [formData, validateDebounced]);

  const handleSubmit = useCallback(() => {
    const result = validate(formData);
    if (result.valid) {
      onSubmit(result.data);
      dispatch({ type: 'RESET' });
      clearErrors();
    }
  }, [formData, validate, onSubmit, clearErrors]);

  const handleCancel = useCallback(() => {
    dispatch({ type: 'RESET' });
    clearErrors();
    onCancel?.();
  }, [clearErrors, onCancel]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Title Input */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Title *
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: errors.title
                ? theme.colors.error
                : theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
            },
          ]}
          value={formData.title}
          onChangeText={(text) =>
            dispatch({ type: 'SET_FIELD', field: 'title', value: text })
          }
          placeholder="Enter todo title"
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={100}
          testID="todo-title-input"
        />
        {errors.title && (
          <Text style={[styles.error, { color: theme.colors.error }]}>
            {errors.title}
          </Text>
        )}
      </View>

      {/* Description Input */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Description
        </Text>
        <TextInput
          style={[
            styles.input,
            styles.textArea,
            {
              borderColor: errors.description
                ? theme.colors.error
                : theme.colors.border,
              color: theme.colors.text,
              backgroundColor: theme.colors.background,
            },
          ]}
          value={formData.description}
          onChangeText={(text) =>
            dispatch({ type: 'SET_FIELD', field: 'description', value: text })
          }
          placeholder="Enter description (optional)"
          placeholderTextColor={theme.colors.textSecondary}
          multiline
          numberOfLines={3}
          maxLength={500}
          testID="todo-description-input"
        />
      </View>

      {/* Priority Selector */}
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.colors.text }]}>
          Priority
        </Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map((p) => (
            <Pressable
              key={p}
              onPress={() => dispatch({ type: 'SET_PRIORITY', priority: p })}
              style={[
                styles.priorityButton,
                {
                  borderColor:
                    formData.priority === p
                      ? theme.colors.primary
                      : theme.colors.border,
                  backgroundColor:
                    formData.priority === p
                      ? theme.colors.primary + '15'
                      : 'transparent',
                },
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  {
                    color:
                      formData.priority === p
                        ? theme.colors.primary
                        : theme.colors.textSecondary,
                  },
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {onCancel && (
          <Button variant="ghost" onPress={handleCancel}>
            Cancel
          </Button>
        )}
        <Button
          onPress={handleSubmit}
          loading={isSubmitting}
          disabled={!formData.title.trim()}
          testID="todo-submit-button"
        >
          {submitLabel}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, borderRadius: 12 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  error: { fontSize: 12, marginTop: 4 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityText: { fontSize: 14, fontWeight: '500' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
