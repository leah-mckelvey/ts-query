/**
 * Header Component
 *
 * Demonstrates:
 * - Context consumption (theme)
 * - Theme toggle functionality
 * - Safe area handling
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, useThemeActions } from '../contexts';
import { useTodos } from '../hooks';

interface HeaderProps {
  readonly onAddPress: () => void;
}

export const Header = memo<HeaderProps>(function Header({ onAddPress }) {
  const theme = useTheme();
  const { toggleTheme } = useThemeActions();
  const todos = useTodos();

  const completedCount = todos.filter(
    (t) => t.status.type === 'completed',
  ).length;
  const totalCount = todos.length;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            📋 My Todos
          </Text>
          <Text
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {completedCount} of {totalCount} completed
          </Text>
        </View>

        <View style={styles.actions}>
          {/* Theme Toggle */}
          <Pressable
            onPress={toggleTheme}
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.background },
            ]}
            accessibilityLabel="Toggle theme"
          >
            <Text style={styles.icon}>
              {theme.colorScheme === 'light' ? '🌙' : '☀️'}
            </Text>
          </Pressable>

          {/* Add Button */}
          <Pressable
            onPress={onAddPress}
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
            ]}
            accessibilityLabel="Add new todo"
          >
            <Text
              style={[
                styles.addButtonText,
                { color: theme.colors.primaryText },
              ]}
            >
              + Add
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  addButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
