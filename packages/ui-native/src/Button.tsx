import React, { useCallback } from 'react';
import { Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import type { PressableProps, ViewStyle, TextStyle } from 'react-native';
import { Text } from './Text';
import { colors, radius, space, fontSize } from './tokens';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonColorScheme = 'blue' | 'gray' | 'red' | 'green';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  /** Button variant */
  variant?: ButtonVariant;
  /** Button size */
  size?: ButtonSize;
  /** Color scheme */
  colorScheme?: ButtonColorScheme;
  /** Button label */
  children: string;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state - shows spinner and disables button */
  loading?: boolean;
  /** Full width */
  fullWidth?: boolean;
  /** Custom style */
  style?: ViewStyle;
}

interface SizeConfig {
  paddingVertical: number;
  paddingHorizontal: number;
  fontSize: number;
  borderRadius: number;
}

const SIZE_CONFIG: Record<ButtonSize, SizeConfig> = {
  sm: {
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    fontSize: fontSize.sm,
    borderRadius: radius.sm,
  },
  md: {
    paddingVertical: space[2.5],
    paddingHorizontal: space[4],
    fontSize: fontSize.md,
    borderRadius: radius.md,
  },
  lg: {
    paddingVertical: space[3],
    paddingHorizontal: space[6],
    fontSize: fontSize.lg,
    borderRadius: radius.md,
  },
};

interface ColorConfig {
  bg: string;
  bgPressed: string;
  border: string;
  text: string;
  textContrast: string;
}

const COLOR_CONFIG: Record<ButtonColorScheme, ColorConfig> = {
  blue: {
    bg: colors.blue600,
    bgPressed: colors.blue700,
    border: colors.blue600,
    text: colors.blue600,
    textContrast: colors.white,
  },
  gray: {
    bg: colors.gray600,
    bgPressed: colors.gray700,
    border: colors.gray600,
    text: colors.gray600,
    textContrast: colors.white,
  },
  red: {
    bg: colors.red600,
    bgPressed: colors.red700,
    border: colors.red600,
    text: colors.red600,
    textContrast: colors.white,
  },
  green: {
    bg: colors.green600,
    bgPressed: colors.green700,
    border: colors.green600,
    text: colors.green600,
    textContrast: colors.white,
  },
};

/**
 * Button component with variants, sizes, and color schemes
 *
 * @example
 * ```tsx
 * <Button onPress={handlePress}>Click Me</Button>
 * <Button variant="outline" colorScheme="red">Delete</Button>
 * <Button size="lg" fullWidth loading>Submit</Button>
 * ```
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'solid',
  size = 'md',
  colorScheme = 'blue',
  children,
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  ...rest
}) => {
  const sizeConfig = SIZE_CONFIG[size];
  const colorConfig = COLOR_CONFIG[colorScheme];
  const isDisabled = disabled || loading;

  const getButtonStyle = useCallback(
    (pressed: boolean): ViewStyle => {
      const base: ViewStyle = {
        paddingVertical: sizeConfig.paddingVertical,
        paddingHorizontal: sizeConfig.paddingHorizontal,
        borderRadius: sizeConfig.borderRadius,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        opacity: isDisabled ? 0.5 : 1,
        borderWidth: variant === 'outline' ? 1 : 0,
        borderColor: variant === 'outline' ? colorConfig.border : 'transparent',
      };

      if (fullWidth) {
        base.width = '100%';
      }

      if (variant === 'solid') {
        base.backgroundColor = pressed ? colorConfig.bgPressed : colorConfig.bg;
      } else if (variant === 'outline' || variant === 'ghost') {
        base.backgroundColor = pressed ? colors.gray100 : colors.transparent;
      }

      return StyleSheet.flatten([base, style]);
    },
    [variant, sizeConfig, colorConfig, isDisabled, fullWidth, style],
  );

  const textStyle: TextStyle = {
    fontSize: sizeConfig.fontSize,
    fontWeight: '600',
    color: variant === 'solid' ? colorConfig.textContrast : colorConfig.text,
  };

  const spinnerColor =
    variant === 'solid' ? colorConfig.textContrast : colorConfig.text;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => getButtonStyle(pressed)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...rest}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={spinnerColor}
          style={{ marginRight: space[2] }}
        />
      )}
      <Text style={textStyle}>{children}</Text>
    </Pressable>
  );
};
