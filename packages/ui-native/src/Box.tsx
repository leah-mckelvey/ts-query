import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewProps, ViewStyle, DimensionValue } from 'react-native';
import { resolveSpace, resolveColor } from './tokens';
import type { SpaceToken, ColorToken, RadiusToken } from './tokens';
import { radius as radiusTokens } from './tokens';

export type SpaceValue = SpaceToken | number;

export interface BoxProps extends ViewProps {
  /** Padding all sides */
  p?: SpaceValue;
  /** Padding horizontal */
  px?: SpaceValue;
  /** Padding vertical */
  py?: SpaceValue;
  /** Padding top */
  pt?: SpaceValue;
  /** Padding right */
  pr?: SpaceValue;
  /** Padding bottom */
  pb?: SpaceValue;
  /** Padding left */
  pl?: SpaceValue;

  /** Margin all sides */
  m?: SpaceValue;
  /** Margin horizontal */
  mx?: SpaceValue;
  /** Margin vertical */
  my?: SpaceValue;
  /** Margin top */
  mt?: SpaceValue;
  /** Margin right */
  mr?: SpaceValue;
  /** Margin bottom */
  mb?: SpaceValue;
  /** Margin left */
  ml?: SpaceValue;

  /** Background color */
  bg?: ColorToken | string;

  /** Border radius */
  rounded?: RadiusToken | number;

  /** Width */
  w?: DimensionValue;
  /** Height */
  h?: DimensionValue;

  /** Flex value */
  flex?: number;

  /** Align items */
  alignItems?: ViewStyle['alignItems'];
  /** Justify content */
  justifyContent?: ViewStyle['justifyContent'];
}

export const Box: React.FC<BoxProps> = ({
  p,
  px,
  py,
  pt,
  pr,
  pb,
  pl,
  m,
  mx,
  my,
  mt,
  mr,
  mb,
  ml,
  bg,
  rounded,
  w,
  h,
  flex,
  alignItems,
  justifyContent,
  style,
  children,
  ...rest
}) => {
  const computedStyle: ViewStyle = {};

  // Padding
  if (p !== undefined) computedStyle.padding = resolveSpace(p);
  if (px !== undefined) {
    computedStyle.paddingHorizontal = resolveSpace(px);
  }
  if (py !== undefined) {
    computedStyle.paddingVertical = resolveSpace(py);
  }
  if (pt !== undefined) computedStyle.paddingTop = resolveSpace(pt);
  if (pr !== undefined) computedStyle.paddingRight = resolveSpace(pr);
  if (pb !== undefined) computedStyle.paddingBottom = resolveSpace(pb);
  if (pl !== undefined) computedStyle.paddingLeft = resolveSpace(pl);

  // Margin
  if (m !== undefined) computedStyle.margin = resolveSpace(m);
  if (mx !== undefined) {
    computedStyle.marginHorizontal = resolveSpace(mx);
  }
  if (my !== undefined) {
    computedStyle.marginVertical = resolveSpace(my);
  }
  if (mt !== undefined) computedStyle.marginTop = resolveSpace(mt);
  if (mr !== undefined) computedStyle.marginRight = resolveSpace(mr);
  if (mb !== undefined) computedStyle.marginBottom = resolveSpace(mb);
  if (ml !== undefined) computedStyle.marginLeft = resolveSpace(ml);

  // Background
  if (bg !== undefined) computedStyle.backgroundColor = resolveColor(bg);

  // Border radius
  if (rounded !== undefined) {
    computedStyle.borderRadius =
      typeof rounded === 'number' ? rounded : radiusTokens[rounded];
  }

  // Dimensions
  if (w !== undefined) computedStyle.width = w;
  if (h !== undefined) computedStyle.height = h;

  // Flex
  if (flex !== undefined) computedStyle.flex = flex;
  if (alignItems !== undefined) computedStyle.alignItems = alignItems;
  if (justifyContent !== undefined)
    computedStyle.justifyContent = justifyContent;

  const flatStyle = StyleSheet.flatten([computedStyle, style]);

  return (
    <View style={flatStyle} {...rest}>
      {children}
    </View>
  );
};
