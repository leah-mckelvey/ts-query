import m from 'mithril';
import { spaceToCss } from './Box';

export type ButtonVariant = 'solid' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonColorScheme = 'blue' | 'gray' | 'red' | 'green';

export interface ButtonAttrs extends m.Attributes {
  variant?: ButtonVariant;
  size?: ButtonSize;
  colorScheme?: ButtonColorScheme;
}

const BUTTON_SIZES: Record<
  ButtonSize,
  { fontSize: string; px: number; py: number }
> = {
  sm: { fontSize: '0.875rem', px: 3, py: 1.5 },
  md: { fontSize: '1rem', px: 4, py: 2 },
  lg: { fontSize: '1.125rem', px: 5, py: 2.5 },
};

const BUTTON_COLOR_SCHEMES: Record<
  ButtonColorScheme,
  { bg: string; border: string; text: string; contrastText: string }
> = {
  blue: {
    bg: '#3182ce',
    border: '#3182ce',
    text: '#3182ce',
    contrastText: '#ffffff',
  },
  gray: {
    bg: '#4a5568',
    border: '#4a5568',
    text: '#4a5568',
    contrastText: '#ffffff',
  },
  red: {
    bg: '#e53e3e',
    border: '#e53e3e',
    text: '#e53e3e',
    contrastText: '#ffffff',
  },
  green: {
    bg: '#38a169',
    border: '#38a169',
    text: '#38a169',
    contrastText: '#ffffff',
  },
};

const getButtonStyles = (options: {
  variant: ButtonVariant;
  size: ButtonSize;
  colorScheme: ButtonColorScheme;
}): Record<string, string | number> => {
  const sizeDef = BUTTON_SIZES[options.size];
  const colorDef = BUTTON_COLOR_SCHEMES[options.colorScheme];

  const base: Record<string, string | number> = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 600,
    borderRadius: '0.375rem',
    cursor: 'pointer',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'transparent',
    fontSize: sizeDef.fontSize,
    padding: `${spaceToCss(sizeDef.py)} ${spaceToCss(sizeDef.px)}`,
    backgroundColor: 'transparent',
    color: 'inherit',
  };

  if (options.variant === 'outline') {
    return {
      ...base,
      borderColor: colorDef.border,
      color: colorDef.text,
      backgroundColor: 'transparent',
    };
  }

  if (options.variant === 'ghost') {
    return {
      ...base,
      color: colorDef.text,
      backgroundColor: 'transparent',
    };
  }

  return {
    ...base,
    backgroundColor: colorDef.bg,
    color: colorDef.contrastText,
  };
};

export const Button: m.Component<ButtonAttrs> = {
  view: ({ attrs, children }) => {
    const {
      variant = 'solid',
      size = 'md',
      colorScheme = 'blue',
      style,
      ...rest
    } = attrs;

    const variantStyles = getButtonStyles({ variant, size, colorScheme });
    const mergedStyle: Record<string, string | number> = {
      ...variantStyles,
      ...(style as Record<string, string | number>),
    };

    return m('button', { ...rest, style: mergedStyle }, children);
  },
};
