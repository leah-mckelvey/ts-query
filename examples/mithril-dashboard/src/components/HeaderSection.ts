import m from 'mithril';
import { Box, Stack, Heading, Text } from '@ts-query/ui-mithril';
import { SummaryQuery } from './SummaryQuery';
import { SummaryBadges } from './SummaryBadges';

export const HeaderSection: m.Component = {
  view: () =>
    m(
      Box,
      {
        p: 4,
        rounded: 16,
        bg: '#020617',
        style: {
          border: '1px solid rgba(148, 163, 184, 0.28)',
          boxShadow: '0 24px 80px rgba(15, 23, 42, 0.9)',
        },
      },
      [
        m(
          Stack,
          {
            direction: 'row',
            align: 'center',
            justify: 'space-between',
            gap: 4,
          },
          [
            m(Stack, { gap: 2 }, [
              m(
                Text,
                {
                  as: 'span',
                  fontSize: '0.75rem',
                  style: {
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: '#9ca3af',
                  },
                },
                'ts-query · Mithril',
              ),
              m(Heading, { level: 2 }, 'Ticket Operations Dashboard'),
              m(
                Text,
                {
                  fontSize: '0.95rem',
                  style: { color: '#9ca3af', maxWidth: '36rem' },
                },
                'A modern, data-driven dashboard powered by ts-query instead of hand-rolled model caches.',
              ),
            ]),
            m(SummaryQuery, {
              children: (state) => m(SummaryBadges, { state }),
            }),
          ],
        ),
      ],
    ),
};
