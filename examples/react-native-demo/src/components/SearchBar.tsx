/**
 * SearchBar Component
 *
 * Demonstrates:
 * - Controlled input pattern
 * - Proper TextInput styling for React Native
 * - Clear button functionality
 */

import React, { memo } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts';

interface SearchBarProps {
  readonly value: string;
  readonly onChangeText: (text: string) => void;
  readonly placeholder?: string;
}

export const SearchBar = memo<SearchBarProps>(function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search todos...',
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Text style={styles.icon}>🔍</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        testID="search-input"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          style={styles.clearButton}
          accessibilityLabel="Clear search"
        >
          <Text
            style={[styles.clearIcon, { color: theme.colors.textSecondary }]}
          >
            ✕
          </Text>
        </Pressable>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    height: 44,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    fontSize: 16,
    fontWeight: '600',
  },
});
