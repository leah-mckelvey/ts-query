import React from 'react';
import type { SpaceValue } from './Box';
import { Box } from './Box';

export type StackDirection = 'row' | 'column';

export interface StackProps extends React.HTMLAttributes<HTMLElement> {
  direction?: StackDirection;
  gap?: SpaceValue;
  align?: React.CSSProperties['alignItems'];
  justify?: React.CSSProperties['justifyContent'];
}

const spaceToCss = (value: SpaceValue): string | number => {
  if (typeof value === 'number') {
    return `${value * 4}px`;
  }
  return value;
};

export const Stack: React.FC<StackProps> = ({
  direction = 'column',
  gap,
  align,
  justify,
  style,
  children,
  ...rest
}) => {
  const resolvedStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction,
    alignItems: align,
    justifyContent: justify,
    ...(style as React.CSSProperties),
  };

  if (gap != null) {
    resolvedStyle.gap = spaceToCss(gap);
  }

  return (
    <Box as="div" style={resolvedStyle} {...(rest as any)}>
      {children}
    </Box>
  );
};

