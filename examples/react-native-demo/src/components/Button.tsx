/**
 * Button Component
 *
 * Demonstrates:
 * - React.memo with custom comparison for performance
 * - Variant and size props with TypeScript
 * - Loading and disabled states
 * - Proper accessibility attributes
 */

import React, { memo, useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../contexts';

// ============================================================================
// Types
// ============================================================================

type ButtonVariant = 'solid' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  readonly children: string;
  readonly onPress: () => void;
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly fullWidth?: boolean;
  readonly testID?: string;
}

// ============================================================================
// Button Component
// ============================================================================

const ButtonComponent = ({
  children,
  onPress,
  variant = 'solid',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  testID,
}: ButtonProps) => {
  const theme = useTheme();

  const isDisabled = disabled || loading;

  // Size configurations
  const sizeConfig = {
    sm: { paddingH: 12, paddingV: 6, fontSize: 14 },
    md: { paddingH: 16, paddingV: 10, fontSize: 16 },
    lg: { paddingH: 24, paddingV: 14, fontSize: 18 },
  }[size];

  // Get styles based on variant and pressed state
  const getContainerStyle = (pressed: boolean): ViewStyle => {
    const baseStyle: ViewStyle = {
      paddingHorizontal: sizeConfig.paddingH,
      paddingVertical: sizeConfig.paddingV,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
      ...(fullWidth && { width: '100%' }),
    };

    switch (variant) {
      case 'solid':
        return {
          ...baseStyle,
          backgroundColor: theme.colors.primary,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: theme.colors.primary,
        };
      case 'ghost':
        return {
          ...baseStyle,
          backgroundColor: pressed ? theme.colors.border : 'transparent',
        };
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontSize: sizeConfig.fontSize,
      fontWeight: '600',
    };

    switch (variant) {
      case 'solid':
        return { ...baseStyle, color: theme.colors.primaryText };
      case 'outline':
      case 'ghost':
        return { ...baseStyle, color: theme.colors.primary };
    }
  };

  // useCallback to prevent unnecessary re-renders of child components
  const handlePress = useCallback(() => {
    if (!isDisabled) {
      onPress();
    }
  }, [isDisabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => getContainerStyle(pressed)}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={
            variant === 'solid'
              ? theme.colors.primaryText
              : theme.colors.primary
          }
          style={{ marginRight: 8 }}
        />
      )}
      <Text style={getTextStyle()}>{children}</Text>
    </Pressable>
  );
};

// Custom memo comparison - only re-render if meaningful props change
const arePropsEqual = (prev: ButtonProps, next: ButtonProps): boolean => {
  return (
    prev.children === next.children &&
    prev.variant === next.variant &&
    prev.size === next.size &&
    prev.disabled === next.disabled &&
    prev.loading === next.loading &&
    prev.fullWidth === next.fullWidth &&
    // Note: We don't compare onPress because it's often a new function reference
    // In real apps, you'd use useCallback at the call site
    prev.onPress === next.onPress
  );
};

export const Button = memo(ButtonComponent, arePropsEqual);
