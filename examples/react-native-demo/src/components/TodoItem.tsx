/**
 * TodoItem Component
 *
 * Demonstrates:
 * - React.memo for performance optimization
 * - Render props pattern (optional)
 * - useCallback for stable event handlers
 * - Proper accessibility attributes
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '@ts-query/ui-native';
import type { Todo, TodoId } from '../types';
import { getStatusLabel } from '../types';
import { useTheme } from '../contexts';

// ============================================================================
// Types
// ============================================================================

interface TodoItemProps {
  readonly todo: Todo;
  readonly onToggleStatus: (id: TodoId) => void;
  readonly onDelete: (id: TodoId) => void;
  readonly onEdit?: (todo: Todo) => void;
}

// ============================================================================
// Priority Badge Component
// ============================================================================

const PriorityBadge = memo<{ priority: Todo['priority'] }>(
  function PriorityBadge({ priority }) {
    const theme = useTheme();

    const getColor = (): string => {
      switch (priority) {
        case 'high':
          return theme.colors.error;
        case 'medium':
          return theme.colors.warning;
        case 'low':
          return theme.colors.success;
        default: {
          // Exhaustive check - this should never happen
          const _exhaustive: never = priority;
          return _exhaustive;
        }
      }
    };

    return (
      <View
        style={[
          styles.badge,
          { backgroundColor: getColor() + '20', borderColor: getColor() },
        ]}
      >
        <Text style={[styles.badgeText, { color: getColor() }]}>
          {priority.toUpperCase()}
        </Text>
      </View>
    );
  },
);

// ============================================================================
// TodoItem Component
// ============================================================================

const TodoItemComponent = ({
  todo,
  onToggleStatus,
  onDelete,
  onEdit,
}: TodoItemProps) => {
  const theme = useTheme();

  // useCallback prevents unnecessary re-renders of child components
  const handleToggle = useCallback(() => {
    onToggleStatus(todo.id);
  }, [onToggleStatus, todo.id]);

  const handleDelete = useCallback(() => {
    onDelete(todo.id);
  }, [onDelete, todo.id]);

  const handleEdit = useCallback(() => {
    onEdit?.(todo);
  }, [onEdit, todo]);

  const isCompleted = todo.status.type === 'completed';

  return (
    <Card
      variant="elevated"
      style={styles.card}
      testID={`todo-item-${todo.id}`}
    >
      <Card.Body>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: theme.colors.text },
                isCompleted && styles.completed,
              ]}
              numberOfLines={1}
            >
              {todo.title}
            </Text>
            <PriorityBadge priority={todo.priority} />
          </View>
          <Text style={[styles.status, { color: theme.colors.textSecondary }]}>
            {getStatusLabel(todo.status)}
          </Text>
        </View>

        {todo.description ? (
          <Text
            style={[styles.description, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {todo.description}
          </Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            onPress={handleToggle}
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.primary + '15' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Toggle status of ${todo.title}`}
          >
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {isCompleted ? '↩️ Reopen' : '✓ Complete'}
            </Text>
          </Pressable>

          {onEdit && (
            <Pressable
              onPress={handleEdit}
              style={[
                styles.actionButton,
                { backgroundColor: theme.colors.border },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${todo.title}`}
            >
              <Text style={[styles.actionText, { color: theme.colors.text }]}>
                ✏️ Edit
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={handleDelete}
            style={[
              styles.actionButton,
              { backgroundColor: theme.colors.error + '15' },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Delete ${todo.title}`}
          >
            <Text style={[styles.actionText, { color: theme.colors.error }]}>
              🗑️ Delete
            </Text>
          </Pressable>
        </View>
      </Card.Body>
    </Card>
  );
};

// ============================================================================
// Memoization with custom comparison
// ============================================================================

export const TodoItem = memo(TodoItemComponent, (prev, next) => {
  // Only re-render if the todo itself changed
  // Actions are compared by reference - should be stable from useCallback
  return (
    prev.todo === next.todo &&
    prev.onToggleStatus === next.onToggleStatus &&
    prev.onDelete === next.onDelete &&
    prev.onEdit === next.onEdit
  );
});

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { marginBottom: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 16, fontWeight: '600', flex: 1 },
  completed: { textDecorationLine: 'line-through', opacity: 0.6 },
  status: { fontSize: 12, marginTop: 4 },
  description: { fontSize: 14, marginBottom: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  actionButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  actionText: { fontSize: 12, fontWeight: '500' },
});
