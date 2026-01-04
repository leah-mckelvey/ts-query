import m from 'mithril';
import { Box, Text } from '@ts-query/ui-mithril';

interface StatBadgeAttrs {
  label: string;
  value: number;
}

export const StatBadge: m.Component<StatBadgeAttrs> = {
  view: ({ attrs }) =>
    m(
      Box,
      {
        p: 2,
        rounded: 999,
        style: {
          background:
            'radial-gradient(circle at top left, rgba(56, 189, 248, 0.45), rgba(15, 23, 42, 0.95))',
          border: '1px solid rgba(148, 163, 184, 0.6)',
          minWidth: '4.25rem',
          textAlign: 'center',
        },
      },
      [
        m(
          Text,
          {
            fontSize: '0.7rem',
            style: { textTransform: 'uppercase', color: '#d1d5db' },
          },
          attrs.label,
        ),
        m(
          Text,
          {
            as: 'span',
            fontSize: '1.2rem',
            fontWeight: 600,
          },
          String(attrs.value),
        ),
      ],
    ),
};
