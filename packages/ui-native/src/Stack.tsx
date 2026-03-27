import React from 'react';
import { StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { Box } from './Box';
import type { BoxProps, SpaceValue } from './Box';
import { resolveSpace } from './tokens';

export type StackDirection =
  | 'row'
  | 'column'
  | 'row-reverse'
  | 'column-reverse';

export interface StackProps extends BoxProps {
  /** Stack direction */
  direction?: StackDirection;
  /** Gap between children */
  gap?: SpaceValue;
  /** Align items (cross axis) */
  align?: ViewStyle['alignItems'];
  /** Justify content (main axis) */
  justify?: ViewStyle['justifyContent'];
  /** Wrap children */
  wrap?: ViewStyle['flexWrap'];
}

/**
 * Stack component - Flexbox layout with gap support
 *
 * @example
 * ```tsx
 * <Stack direction="row" gap={4} align="center">
 *   <Box bg="blue500" p={4} />
 *   <Box bg="green500" p={4} />
 * </Stack>
 * ```
 */
export const Stack: React.FC<StackProps> = ({
  direction = 'column',
  gap,
  align,
  justify,
  wrap,
  style,
  children,
  ...rest
}) => {
  const stackStyle: ViewStyle = {
    flexDirection: direction,
  };

  if (gap !== undefined) {
    stackStyle.gap = resolveSpace(gap);
  }

  if (align !== undefined) {
    stackStyle.alignItems = align;
  }

  if (justify !== undefined) {
    stackStyle.justifyContent = justify;
  }

  if (wrap !== undefined) {
    stackStyle.flexWrap = wrap;
  }

  const flatStyle = StyleSheet.flatten([stackStyle, style]);

  return (
    <Box style={flatStyle} {...rest}>
      {children}
    </Box>
  );
};

/**
 * Horizontal stack (row direction)
 */
export const HStack: React.FC<Omit<StackProps, 'direction'>> = (props) => (
  <Stack direction="row" {...props} />
);

/**
 * Vertical stack (column direction)
 */
export const VStack: React.FC<Omit<StackProps, 'direction'>> = (props) => (
  <Stack direction="column" {...props} />
);
