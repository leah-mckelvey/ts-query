/**
 * React Native Demo App
 *
 * Demonstrates 2026 React best practices with React 18.2:
 * - useSyncExternalStore for external store integration
 * - useTransition for non-blocking state updates
 * - useDeferredValue for deprioritizing expensive renders
 * - Error boundaries with recovery
 * - Compound components (Card.Header, Card.Body, etc.)
 * - React.memo with custom comparators
 * - Context splitting pattern
 * - FlatList virtualization
 * - Branded types and discriminated unions
 * - Zustand-like store pattern
 */

import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Modal,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/contexts';
import { ErrorBoundary, Header, TodoList, TodoForm } from './src/components';
import { useTodoActions } from './src/hooks';
import type { TodoFormData } from './src/types';

// ============================================================================
// Main App Content (inside ThemeProvider)
// ============================================================================

function AppContent() {
  const theme = useTheme();
  const { addTodo } = useTodoActions();
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleAddPress = useCallback(() => {
    setShowForm(true);
  }, []);

  const handleFormSubmit = useCallback(
    (data: TodoFormData) => {
      addTodo(data.title, data.description, data.priority);
      setShowForm(false);
    },
    [addTodo],
  );

  const handleFormCancel = useCallback(() => {
    setShowForm(false);
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar style={theme.colorScheme === 'dark' ? 'light' : 'dark'} />

      {/* Header with theme toggle and add button */}
      <Header onAddPress={handleAddPress} />

      {/* Todo List with search, filters, and virtualized list */}
      <TodoList searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      {/* Add Todo Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleFormCancel}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.modalContent}>
            <TodoForm
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              submitLabel="Add Todo"
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// ============================================================================
// Root App Component
// ============================================================================

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
