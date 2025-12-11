import React from 'react';

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  as?: React.ElementType;
  fontSize?: string;
  fontWeight?: React.CSSProperties['fontWeight'];
}

export const Text: React.FC<TextProps> = ({
  as: Component = 'p',
  fontSize,
  fontWeight,
  style,
  ...rest
}) => {
  const resolvedStyle: React.CSSProperties = {
    margin: 0,
    ...(fontSize ? { fontSize } : {}),
    ...(fontWeight ? { fontWeight } : {}),
    ...(style as React.CSSProperties),
  };

  return <Component style={resolvedStyle} {...rest} />;
};

export interface HeadingProps extends TextProps {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const HEADING_SIZES: Record<NonNullable<HeadingProps['level']>, string> = {
  1: '2.25rem',
  2: '1.875rem',
  3: '1.5rem',
  4: '1.25rem',
  5: '1.125rem',
  6: '1rem',
};

export const Heading: React.FC<HeadingProps> = ({
  as,
  level = 2,
  fontSize,
  fontWeight = 700,
  style,
  ...rest
}) => {
  const Component = as ?? (`h${level}` as React.ElementType);

  const resolvedStyle: React.CSSProperties = {
    margin: 0,
    fontSize: fontSize ?? HEADING_SIZES[level],
    fontWeight,
    ...(style as React.CSSProperties),
  };

  return <Component style={resolvedStyle} {...rest} />;
};

