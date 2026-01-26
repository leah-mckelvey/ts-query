/**
 * FilterBar Component
 *
 * Demonstrates:
 * - useTransition integration for non-blocking updates
 * - Horizontal scrolling for filter chips
 * - Selection state management
 */

import React, { memo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts';
import { useFilters, useTodoActions } from '../hooks';
import type { StatusFilter, PriorityFilter } from '../types';

// ============================================================================
// Types
// ============================================================================

interface FilterBarProps {
  readonly isPending?: boolean;
}

interface ChipProps {
  readonly label: string;
  readonly selected: boolean;
  readonly onPress: () => void;
}

// ============================================================================
// Chip Component
// ============================================================================

const Chip = memo<ChipProps>(function Chip({ label, selected, onPress }) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected
            ? theme.colors.primary
            : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Text
        style={[
          styles.chipText,
          { color: selected ? theme.colors.primaryText : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
});

// ============================================================================
// FilterBar Component
// ============================================================================

export const FilterBar = memo<FilterBarProps>(function FilterBar({
  isPending = false,
}) {
  const theme = useTheme();
  const filters = useFilters();
  const { setFilters } = useTodoActions();

  const statusOptions: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
  ];

  const priorityOptions: { label: string; value: PriorityFilter }[] = [
    { label: 'All Priority', value: 'all' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  const handleStatusChange = useCallback(
    (status: StatusFilter) => {
      setFilters({ status });
    },
    [setFilters],
  );

  const handlePriorityChange = useCallback(
    (priority: PriorityFilter) => {
      setFilters({ priority });
    },
    [setFilters],
  );

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          Status:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {statusOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.status === option.value}
              onPress={() => handleStatusChange(option.value)}
            />
          ))}
        </ScrollView>
        {isPending && (
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.spinner}
          />
        )}
      </View>

      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
          Priority:
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {priorityOptions.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.priority === option.value}
              onPress={() => handlePriorityChange(option.value)}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  label: { fontSize: 12, fontWeight: '500', marginRight: 8, minWidth: 50 },
  chips: { gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '500' },
  spinner: { marginLeft: 8 },
});
