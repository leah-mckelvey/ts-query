import React, { forwardRef, memo, type ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import type { ViewStyle, PressableProps } from 'react-native';
import { colors, radius, space } from './tokens';

export type CardVariant = 'default' | 'elevated' | 'outlined';

export interface CardRootProps extends Omit<PressableProps, 'style'> {
  /** Card content */
  readonly children: ReactNode;
  /** Card variant */
  readonly variant?: CardVariant;
  /** Press handler - if provided, card becomes pressable */
  readonly onPress?: () => void;
  /** Custom style */
  readonly style?: ViewStyle;
  /** Test ID */
  readonly testID?: string;
}

export interface CardSectionProps {
  /** Section content */
  readonly children: ReactNode;
  /** Custom style */
  readonly style?: ViewStyle;
}

const getVariantStyle = (variant: CardVariant): ViewStyle => {
  switch (variant) {
    case 'elevated':
      return {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      };
    case 'outlined':
      return {
        borderWidth: 1,
        borderColor: colors.gray200,
      };
    default:
      return {};
  }
};

const CardRoot = forwardRef<View, CardRootProps>(function CardRoot(
  { children, variant = 'default', onPress, style, testID, ...rest },
  ref,
) {
  const baseStyle: ViewStyle = {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...getVariantStyle(variant),
  };

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
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View ref={ref} style={[baseStyle, style]} testID={testID}>
      {children}
    </View>
  );
});

const CardHeader = memo<CardSectionProps>(function CardHeader({
  children,
  style,
}) {
  return (
    <View
      style={[
        {
          padding: space[4],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.gray200,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

const CardBody = memo<CardSectionProps>(function CardBody({ children, style }) {
  return <View style={[{ padding: space[4] }, style]}>{children}</View>;
});

const CardFooter = memo<CardSectionProps>(function CardFooter({
  children,
  style,
}) {
  return (
    <View
      style={[
        {
          padding: space[4],
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.gray200,
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: space[2],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

/**
 * Card compound component with Header, Body, and Footer sections
 *
 * @example
 * ```tsx
 * <Card variant="elevated">
 *   <Card.Header>
 *     <Text>Title</Text>
 *   </Card.Header>
 *   <Card.Body>
 *     <Text>Content</Text>
 *   </Card.Body>
 *   <Card.Footer>
 *     <Button onPress={handleAction}>Action</Button>
 *   </Card.Footer>
 * </Card>
 * ```
 */
export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});

export type { CardSectionProps as CardHeaderProps };
export type { CardSectionProps as CardBodyProps };
export type { CardSectionProps as CardFooterProps };
