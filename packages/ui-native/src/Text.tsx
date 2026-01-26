import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import type { TextProps as RNTextProps, TextStyle } from 'react-native';
import {
  fontSize as fontSizeTokens,
  fontWeight as fontWeightTokens,
  resolveColor,
  resolveSpace,
} from './tokens';
import type {
  FontSizeToken,
  FontWeightToken,
  ColorToken,
  SpaceToken,
} from './tokens';

export interface TextProps extends RNTextProps {
  /** Font size token or number */
  size?: FontSizeToken | number;
  /** Font weight token */
  weight?: FontWeightToken;
  /** Text color */
  color?: ColorToken | string;
  /** Text alignment */
  align?: TextStyle['textAlign'];
  /** Line height */
  lineHeight?: number;
  /** Letter spacing */
  letterSpacing?: number;
  /** Margin top */
  mt?: SpaceToken | number;
  /** Margin bottom */
  mb?: SpaceToken | number;
}

/**
 * Text component with typography tokens
 *
 * @example
 * ```tsx
 * <Text size="lg" weight="bold" color="gray900">
 *   Hello World
 * </Text>
 * ```
 */
export const Text: React.FC<TextProps> = ({
  size = 'md',
  weight = 'normal',
  color = 'gray900',
  align,
  lineHeight,
  letterSpacing,
  mt,
  mb,
  style,
  children,
  ...rest
}) => {
  const textStyle: TextStyle = {
    fontSize: typeof size === 'number' ? size : fontSizeTokens[size],
    fontWeight: fontWeightTokens[weight],
    color: resolveColor(color),
  };

  if (align !== undefined) textStyle.textAlign = align;
  if (lineHeight !== undefined) textStyle.lineHeight = lineHeight;
  if (letterSpacing !== undefined) textStyle.letterSpacing = letterSpacing;
  if (mt !== undefined) textStyle.marginTop = resolveSpace(mt);
  if (mb !== undefined) textStyle.marginBottom = resolveSpace(mb);

  const flatStyle = StyleSheet.flatten([textStyle, style]);

  return (
    <RNText style={flatStyle} {...rest}>
      {children}
    </RNText>
  );
};

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const HEADING_SIZES: Record<HeadingLevel, FontSizeToken> = {
  1: '5xl',
  2: '4xl',
  3: '3xl',
  4: '2xl',
  5: 'xl',
  6: 'lg',
};

export interface HeadingProps extends Omit<TextProps, 'size'> {
  /** Heading level (1-6) */
  level?: HeadingLevel;
  /** Override size token */
  size?: FontSizeToken | number;
}

/**
 * Heading component with semantic sizing
 *
 * @example
 * ```tsx
 * <Heading level={1}>Page Title</Heading>
 * <Heading level={2} color="blue600">Section</Heading>
 * ```
 */
export const Heading: React.FC<HeadingProps> = ({
  level = 2,
  size,
  weight = 'bold',
  ...rest
}) => {
  const resolvedSize = size ?? HEADING_SIZES[level];

  return <Text size={resolvedSize} weight={weight} {...rest} />;
};
