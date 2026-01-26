/**
 * Card Compound Component
 *
 * Demonstrates:
 * - Compound components pattern (Card.Header, Card.Body, Card.Footer)
 * - forwardRef for ref forwarding
 * - React.memo with custom comparator
 * - Context for implicit parent-child communication
 * - Controlled component pattern
 */

import React, { createContext, forwardRef, memo, type ReactNode } from 'react';
import { View, type ViewStyle, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../contexts';

// ============================================================================
// Card Context (for compound component communication)
// ============================================================================

interface CardContextValue {
  readonly variant: 'default' | 'elevated' | 'outlined';
  readonly isPressed: boolean;
}

const CardContext = createContext<CardContextValue>({
  variant: 'default',
  isPressed: false,
});

// ============================================================================
// Card Root Component
// ============================================================================

interface CardRootProps {
  readonly children: ReactNode;
  readonly variant?: CardContextValue['variant'];
  readonly onPress?: () => void;
  readonly style?: ViewStyle;
  readonly testID?: string;
}

const CardRoot = forwardRef<View, CardRootProps>(function CardRoot(
  { children, variant = 'default', onPress, style, testID },
  ref,
) {
  const theme = useTheme();

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 4,
        };
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.border,
        };
      default:
        return {};
    }
  };

  const baseStyle: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    ...getVariantStyle(),
  };

  // If onPress provided, render as Pressable (controlled behavior)
  if (onPress) {
    return (
      <Pressable
        ref={ref as React.Ref<View>}
        onPress={onPress}
        testID={testID}
        style={({ pressed }) => [
          baseStyle,
          { opacity: pressed ? 0.9 : 1 },
          style,
        ]}
      >
        {({ pressed }) => (
          <CardContext.Provider value={{ variant, isPressed: pressed }}>
            {children}
          </CardContext.Provider>
        )}
      </Pressable>
    );
  }

  return (
    <View ref={ref} style={[baseStyle, style]} testID={testID}>
      <CardContext.Provider value={{ variant, isPressed: false }}>
        {children}
      </CardContext.Provider>
    </View>
  );
});

// ============================================================================
// Card.Header
// ============================================================================

interface CardHeaderProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}

const CardHeader = memo<CardHeaderProps>(function CardHeader({
  children,
  style,
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          padding: theme.spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

// ============================================================================
// Card.Body
// ============================================================================

interface CardBodyProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}

const CardBody = memo<CardBodyProps>(function CardBody({ children, style }) {
  const theme = useTheme();

  return <View style={[{ padding: theme.spacing.md }, style]}>{children}</View>;
});

// ============================================================================
// Card.Footer
// ============================================================================

interface CardFooterProps {
  readonly children: ReactNode;
  readonly style?: ViewStyle;
}

const CardFooter = memo<CardFooterProps>(function CardFooter({
  children,
  style,
}) {
  const theme = useTheme();

  return (
    <View
      style={[
        {
          padding: theme.spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: theme.spacing.sm,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

// ============================================================================
// Compound Component Export
// ============================================================================

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export type { CardRootProps, CardHeaderProps, CardBodyProps, CardFooterProps };
