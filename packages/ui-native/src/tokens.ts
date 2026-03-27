/**
 * Design tokens for the UI kit - Tamagui-style spacing and sizing
 */

/** Space scale - multiply by 4 for pixel values */
export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

export type SpaceToken = keyof typeof space;

/** Font sizes */
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
} as const;

export type FontSizeToken = keyof typeof fontSize;

/** Font weights */
export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
} as const;

export type FontWeightToken = keyof typeof fontWeight;

/** Border radius */
export const radius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;

/** Color palette */
export const colors = {
  // Neutrals
  transparent: 'transparent',
  black: '#000000',
  white: '#ffffff',

  // Gray scale
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',

  // Primary (Blue)
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue300: '#93c5fd',
  blue400: '#60a5fa',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue800: '#1e40af',
  blue900: '#1e3a8a',

  // Success (Green)
  green50: '#f0fdf4',
  green500: '#22c55e',
  green600: '#16a34a',
  green700: '#15803d',

  // Error (Red)
  red50: '#fef2f2',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',

  // Warning (Yellow/Amber)
  amber50: '#fffbeb',
  amber500: '#f59e0b',
  amber600: '#d97706',
} as const;

export type ColorToken = keyof typeof colors;

/**
 * Resolve a space value to pixels
 */
export function resolveSpace(value: SpaceToken | number): number {
  if (typeof value === 'number' && !(value in space)) {
    return value * 4; // Treat raw numbers as multipliers
  }
  return space[value as SpaceToken] ?? 0;
}

/**
 * Resolve a color token or pass through raw color
 */
export function resolveColor(value: ColorToken | string): string {
  return colors[value as ColorToken] ?? value;
}
