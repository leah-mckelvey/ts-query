import m from 'mithril';
import { Box, spaceToCss, type SpaceValue } from './Box';

export type StackDirection = 'row' | 'column';

export interface StackAttrs extends m.Attributes {
  direction?: StackDirection;
  gap?: SpaceValue;
  align?: string;
  justify?: string;
}

export const Stack: m.Component<StackAttrs> = {
  view: ({ attrs, children }) => {
    const { direction = 'column', gap, align, justify, style, ...rest } = attrs;

    const resolvedStyle: Record<string, string | number> = {
      display: 'flex',
      flexDirection: direction,
      ...(style as Record<string, string | number>),
    };

    if (align) {
      resolvedStyle.alignItems = align;
    }

    if (justify) {
      resolvedStyle.justifyContent = justify;
    }

    if (gap != null) {
      resolvedStyle.gap = spaceToCss(gap);
    }

    return m(Box, { ...rest, as: 'div', style: resolvedStyle }, children);
  },
};
