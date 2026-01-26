/**
 * Mock React Native components for testing
 * This allows us to test the component logic without a full RN environment
 */
import React from 'react';

// Extended style type to include RN-specific properties
interface RNStyle extends React.CSSProperties {
  paddingHorizontal?: number;
  paddingVertical?: number;
  marginHorizontal?: number;
  marginVertical?: number;
}

// Style input can be a single style, an array of styles, or undefined
type StyleInput = RNStyle | RNStyle[] | undefined | null;

/**
 * Flatten an array of styles into a single style object (like RN's StyleSheet.flatten)
 */
function flattenStyle(style: StyleInput): RNStyle {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<RNStyle>((acc, s) => ({ ...acc, ...(s || {}) }), {});
  }
  return style;
}

/**
 * Convert React Native-specific style properties to DOM equivalents
 */
function convertRNStyleToDOM(style: StyleInput): React.CSSProperties {
  const flatStyle = flattenStyle(style);
  if (!flatStyle || Object.keys(flatStyle).length === 0) return {};

  const result: React.CSSProperties = { ...flatStyle };

  // Convert paddingHorizontal to paddingLeft + paddingRight
  if ('paddingHorizontal' in result) {
    const value = result.paddingHorizontal as number;
    result.paddingLeft = value;
    result.paddingRight = value;
    delete (result as RNStyle).paddingHorizontal;
  }

  // Convert paddingVertical to paddingTop + paddingBottom
  if ('paddingVertical' in result) {
    const value = result.paddingVertical as number;
    result.paddingTop = value;
    result.paddingBottom = value;
    delete (result as RNStyle).paddingVertical;
  }

  // Convert marginHorizontal to marginLeft + marginRight
  if ('marginHorizontal' in result) {
    const value = result.marginHorizontal as number;
    result.marginLeft = value;
    result.marginRight = value;
    delete (result as RNStyle).marginHorizontal;
  }

  // Convert marginVertical to marginTop + marginBottom
  if ('marginVertical' in result) {
    const value = result.marginVertical as number;
    result.marginTop = value;
    result.marginBottom = value;
    delete (result as RNStyle).marginVertical;
  }

  // Convert RN flex (number) to CSS flex string that won't be expanded
  // Use flexGrow instead which stays as-is in the DOM
  if ('flex' in result && typeof result.flex === 'number') {
    const flexValue = result.flex;
    result.flexGrow = flexValue;
    result.flexShrink = 1;
    result.flexBasis = '0%';
    delete result.flex;
  }

  return result;
}

// Mock View component - accepts style arrays like RN
export const View = React.forwardRef<
  HTMLDivElement,
  React.PropsWithChildren<{ style?: StyleInput; testID?: string }>
>(({ children, style, testID, ...props }, ref) => {
  const domStyle = convertRNStyleToDOM(style);
  return React.createElement(
    'div',
    { ref, style: domStyle, 'data-testid': testID, ...props },
    children,
  );
});
View.displayName = 'View';

// Mock Text component - accepts style arrays like RN
export const Text = React.forwardRef<
  HTMLSpanElement,
  React.PropsWithChildren<{ style?: StyleInput; testID?: string }>
>(({ children, style, testID, ...props }, ref) => {
  const domStyle = convertRNStyleToDOM(style);
  return React.createElement(
    'span',
    { ref, style: domStyle, 'data-testid': testID, ...props },
    children,
  );
});
Text.displayName = 'Text';

// Style callback type for Pressable
type PressableStyleCallback = (state: { pressed: boolean }) => StyleInput;

// Mock Pressable component - accepts style arrays and callbacks like RN
export const Pressable = React.forwardRef<
  HTMLButtonElement,
  React.PropsWithChildren<{
    style?: StyleInput | PressableStyleCallback;
    onPress?: () => void;
    disabled?: boolean;
    testID?: string;
    accessibilityRole?: string;
    accessibilityState?: { disabled?: boolean };
  }>
>(
  (
    {
      children,
      style,
      onPress,
      disabled,
      testID,
      accessibilityRole,
      accessibilityState,
      ...props
    },
    ref,
  ) => {
    const resolvedStyle =
      typeof style === 'function' ? style({ pressed: false }) : style;
    const domStyle = convertRNStyleToDOM(resolvedStyle);
    return React.createElement(
      'button',
      {
        ref,
        style: domStyle,
        onClick: onPress,
        disabled,
        'data-testid': testID,
        role: accessibilityRole,
        'aria-disabled': accessibilityState?.disabled,
        ...props,
      },
      children,
    );
  },
);
Pressable.displayName = 'Pressable';

// Mock StyleSheet
export const StyleSheet = {
  create: <T extends Record<string, React.CSSProperties>>(styles: T): T =>
    styles,
  flatten: (
    style: React.CSSProperties | React.CSSProperties[] | undefined,
  ): React.CSSProperties => {
    if (!style) return {};
    if (Array.isArray(style)) {
      return style.reduce<React.CSSProperties>(
        (acc, s) => ({ ...acc, ...(s || {}) }),
        {},
      );
    }
    return style;
  },
};

// Export types that match RN
export type ViewProps = React.ComponentProps<typeof View>;
export type TextProps = React.ComponentProps<typeof Text>;
export type PressableProps = React.ComponentProps<typeof Pressable>;
export type ViewStyle = React.CSSProperties;
export type TextStyle = React.CSSProperties;
export type DimensionValue = number | 'auto' | `${number}%` | null | undefined;
