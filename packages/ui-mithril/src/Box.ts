import m from 'mithril';

export type SpaceValue = number | string;

export interface BoxAttrs extends m.Attributes {
  as?: string;
  p?: SpaceValue;
  px?: SpaceValue;
  py?: SpaceValue;
  pt?: SpaceValue;
  pr?: SpaceValue;
  pb?: SpaceValue;
  pl?: SpaceValue;
  m?: SpaceValue;
  mx?: SpaceValue;
  my?: SpaceValue;
  mt?: SpaceValue;
  mr?: SpaceValue;
  mb?: SpaceValue;
  ml?: SpaceValue;
  bg?: string;
  color?: string;
  rounded?: number | string;
}

export const spaceToCss = (value: SpaceValue): string | number => {
  if (typeof value === 'number') {
    return `${value * 4}px`;
  }
  return value;
};

export const Box: m.Component<BoxAttrs> = {
  view: ({ attrs, children }) => {
    const {
      as = 'div',
      p,
      px,
      py,
      pt,
      pr,
      pb,
      pl,
      m: margin,
      mx,
      my,
      mt,
      mr,
      mb,
      ml,
      bg,
      color,
      rounded,
      style,
      ...rest
    } = attrs;

    const resolvedStyle: Record<string, string | number> = {
      ...(style as Record<string, string | number>),
    };

    const applySpace = (key: string, value?: SpaceValue) => {
      if (value == null) return;
      resolvedStyle[key] = spaceToCss(value);
    };

    applySpace('padding', p);
    applySpace('paddingLeft', px);
    applySpace('paddingRight', px);
    applySpace('paddingTop', py);
    applySpace('paddingBottom', py);
    applySpace('paddingTop', pt);
    applySpace('paddingRight', pr);
    applySpace('paddingBottom', pb);
    applySpace('paddingLeft', pl);

    applySpace('margin', margin);
    applySpace('marginLeft', mx);
    applySpace('marginRight', mx);
    applySpace('marginTop', my);
    applySpace('marginBottom', my);
    applySpace('marginTop', mt);
    applySpace('marginRight', mr);
    applySpace('marginBottom', mb);
    applySpace('marginLeft', ml);

    if (bg) {
      resolvedStyle.backgroundColor = bg;
    }
    if (color) {
      resolvedStyle.color = color;
    }
    if (rounded != null) {
      resolvedStyle.borderRadius =
        typeof rounded === 'number' ? `${rounded}px` : rounded;
    }

    return m(as, { ...rest, style: resolvedStyle }, children);
  },
};
