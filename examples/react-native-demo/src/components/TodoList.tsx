/**
 * TodoList Component
 *
 * Demonstrates:
 * - FlatList for efficient list rendering (React Native virtualization)
 * - useDeferredValue for search optimization
 * - useTransition for filter changes
 * - Empty state handling
 * - Pull-to-refresh pattern
 */

import React, { useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  type ListRenderItem,
} from 'react-native';
import type { Todo } from '../types';
import {
  useFilteredTodos,
  useTodoActions,
  useIsHydrated,
  useDeferredSearch,
  useFilterTransition,
} from '../hooks';
import { useTheme } from '../contexts';
import { TodoItem } from './TodoItem';
import { SearchBar } from './SearchBar';
import { FilterBar } from './FilterBar';

// ============================================================================
// Empty State Component
// ============================================================================

const EmptyState = () => {
  const theme = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyEmoji]}>📝</Text>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        No todos yet
      </Text>
      <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
        Add your first todo to get started
      </Text>
    </View>
  );
};

// ============================================================================
// Loading State Component
// ============================================================================

const LoadingState = () => {
  const theme = useTheme();

  return (
    <View style={styles.emptyContainer}>
      <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
        Loading...
      </Text>
    </View>
  );
};

// ============================================================================
// TodoList Component
// ============================================================================

interface TodoListProps {
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
}

export function TodoList({ searchQuery, onSearchChange }: TodoListProps) {
  const theme = useTheme();
  const todos = useFilteredTodos();
  const { toggleStatus, deleteTodo } = useTodoActions();
  const isHydrated = useIsHydrated();
  const [refreshing, setRefreshing] = useState(false);

  // useDeferredValue - prevents UI jank during rapid search typing
  const { deferredQuery, isStale } = useDeferredSearch(searchQuery);

  // useTransition for filter changes
  const { isPending } = useFilterTransition();

  // Filter by deferred search query for smoother UX
  const displayTodos = useMemo(() => {
    if (!deferredQuery) return todos;
    const query = deferredQuery.toLowerCase();
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query),
    );
  }, [todos, deferredQuery]);

  // Stable callbacks for TodoItem
  const handleToggleStatus = useCallback(
    (id: Todo['id']) => {
      toggleStatus(id);
    },
    [toggleStatus],
  );

  const handleDelete = useCallback(
    (id: Todo['id']) => {
      deleteTodo(id);
    },
    [deleteTodo],
  );

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    // In a real app, this would refetch from an API
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  // Render item with memoized TodoItem
  const renderItem: ListRenderItem<Todo> = useCallback(
    ({ item }) => (
      <TodoItem
        todo={item}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
      />
    ),
    [handleToggleStatus, handleDelete],
  );

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Todo) => item.id, []);

  if (!isHydrated) {
    return <LoadingState />;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar value={searchQuery} onChangeText={onSearchChange} />
        {isStale && (
          <Text
            style={[
              styles.staleIndicator,
              { color: theme.colors.textSecondary },
            ]}
          >
            Searching...
          </Text>
        )}
      </View>

      {/* Filter Bar */}
      <FilterBar isPending={isPending} />

      {/* Todo List */}
      <FlatList
        data={displayTodos}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={[
          styles.listContent,
          displayTodos.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        // Performance optimizations
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={5}
        getItemLayout={(_, index) => ({
          length: 120, // Approximate item height
          offset: 120 * index,
          index,
        })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 16, paddingTop: 16 },
  staleIndicator: { fontSize: 12, marginTop: 4 },
  listContent: { padding: 16 },
  emptyList: { flexGrow: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '600', marginBottom: 8 },
  emptyText: { fontSize: 14, textAlign: 'center' },
});
