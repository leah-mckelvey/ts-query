import m from 'mithril';

export interface TextAttrs extends m.Attributes {
  as?: string;
  fontSize?: string;
  fontWeight?: string | number;
}

export const Text: m.Component<TextAttrs> = {
  view: ({ attrs, children }) => {
    const { as = 'p', fontSize, fontWeight, style, ...rest } = attrs;

    const resolvedStyle: Record<string, string | number> = {
      margin: 0,
      ...(fontSize ? { fontSize } : {}),
      ...(fontWeight ? { fontWeight } : {}),
      ...(style as Record<string, string | number>),
    };

    return m(as, { ...rest, style: resolvedStyle }, children);
  },
};

export interface HeadingAttrs extends TextAttrs {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const HEADING_SIZES: Record<NonNullable<HeadingAttrs['level']>, string> = {
  1: '2.25rem',
  2: '1.875rem',
  3: '1.5rem',
  4: '1.25rem',
  5: '1.125rem',
  6: '1rem',
};

export const Heading: m.Component<HeadingAttrs> = {
  view: ({ attrs, children }) => {
    const { as, level = 2, fontSize, fontWeight = 700, style, ...rest } = attrs;

    const tag = as ?? (`h${level}` as string);

    const resolvedStyle: Record<string, string | number> = {
      margin: 0,
      fontSize: fontSize ?? HEADING_SIZES[level],
      fontWeight,
      ...(style as Record<string, string | number>),
    };

    return m(tag, { ...rest, style: resolvedStyle }, children);
  },
};
