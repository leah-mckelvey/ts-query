import m from 'mithril';
import { Box, Text } from '@ts-query/ui-mithril';
import type { QueryState } from '@ts-query/core';
import type { Ticket } from '../domain';
import type { DashboardState } from '../uiState';
import { CommentsQuery } from './CommentsQuery';
import { TicketDetailCard } from './TicketDetailCard';
import { CommentsPanel } from './CommentsPanel';

export interface TicketDetailShellAttrs {
  ui: DashboardState;
  ticketsState: QueryState<Ticket[], Error>;
}

export const TicketDetailShell: m.Component<TicketDetailShellAttrs> = {
  view: ({ attrs }) => {
    const tickets = attrs.ticketsState.data ?? [];
    const ticket =
      tickets.find((t) => t.id === attrs.ui.selectedTicketId) ?? null;

    return m(
      Box,
      {
        p: 4,
        rounded: 12,
        bg: '#020617',
        style: {
          border: '1px solid rgba(55, 65, 81, 0.9)',
          minHeight: '20rem',
        },
      },
      [
        ticket
          ? m(TicketDetailCard, { ticket })
          : m(
              Text,
              { fontSize: '0.95rem', style: { color: '#9ca3af' } },
              'Select a ticket from the left to see details.',
            ),
        ticket &&
          m(Box, { mt: 4 }, [
            m(CommentsQuery, {
              children: (commentsState) =>
                m(CommentsPanel, { ticket, commentsState }),
            }),
          ]),
      ],
    );
  },
};
