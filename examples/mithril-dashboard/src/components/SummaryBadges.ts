import m from 'mithril';
import { Stack, Text, Button } from '@ts-query/ui-mithril';
import { getQueryClient } from '@ts-query/mithril';
import type { QueryState } from '@ts-query/core';
import type { SummaryStats } from '../domain';
import { StatBadge } from './StatBadge';

interface SummaryBadgesAttrs {
  state: QueryState<SummaryStats, Error>;
}

export const SummaryBadges: m.Component<SummaryBadgesAttrs> = {
  view: ({ attrs }) => {
    const { state } = attrs;

    if (state.isLoading && !state.data) {
      return m(
        Text,
        { fontSize: '0.85rem', style: { color: '#9ca3af' } },
        'Loading metrics…',
      );
    }

    if (state.isError) {
      const client = getQueryClient();

      return m(Stack, { gap: 1, align: 'flex-end' }, [
        m(
          Text,
          { fontSize: '0.8rem', style: { color: '#f97373' } },
          `Metrics unavailable: ${state.error?.message ?? 'Unknown error'}`,
        ),
        m(
          Button,
          {
            variant: 'outline',
            size: 'sm',
            colorScheme: 'gray',
            onclick: () => client.invalidateQueries('summary'),
          },
          'Retry',
        ),
      ]);
    }

    const summary = state.data;
    if (!summary) {
      return null;
    }

    return m(Stack, { direction: 'row', gap: 2, align: 'center' }, [
      m(StatBadge, { label: 'Total', value: summary.totalTickets }),
      m(StatBadge, { label: 'Open', value: summary.byStatus.open ?? 0 }),
      m(StatBadge, { label: 'Blocked', value: summary.byStatus.blocked ?? 0 }),
      m(StatBadge, { label: 'Urgent', value: summary.byPriority.urgent ?? 0 }),
    ]);
  },
};
