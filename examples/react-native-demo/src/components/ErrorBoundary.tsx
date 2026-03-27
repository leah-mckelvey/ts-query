/**
 * Error Boundary Component
 *
 * Demonstrates:
 * - Class component for error boundaries (still required in React 19)
 * - Proper error recovery patterns
 * - Error reporting integration point
 * - Fallback UI rendering
 *
 * Note: As of React 19, error boundaries still require class components.
 * The React team has discussed adding hooks-based error boundaries,
 * but they're not available yet.
 */

import React, { Component, type ReactNode, type ErrorInfo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

// ============================================================================
// Types
// ============================================================================

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?:
    | ReactNode
    | ((error: Error, reset: () => void) => ReactNode);
  readonly onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly error: Error | null;
}

// ============================================================================
// Error Boundary Class Component
// ============================================================================

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Static method to derive state from error
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  // Lifecycle method for error logging/reporting
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to error reporting service (e.g., Sentry, Bugsnag)
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  // Reset the error boundary
  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Render custom fallback if provided
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error.message || 'An unexpected error occurred'}
          </Text>
          <Pressable style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

// ============================================================================
// Utility HOC for wrapping components with error boundary
// ============================================================================

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ErrorBoundaryProps['fallback'],
): React.FC<P> {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  };
}
