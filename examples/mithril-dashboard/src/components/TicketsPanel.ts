import m from 'mithril';
import { Box, Stack, Text, Button } from '@ts-query/ui-mithril';
import { getQueryClient } from '@ts-query/mithril';
import type { QueryState } from '@ts-query/core';
import type { Ticket } from '../domain';
import { dashboardActions, type DashboardState } from '../uiState';
import { StatusPill } from './StatusPill';
import { PriorityPill } from './PriorityPill';

export interface TicketsPanelAttrs {
  ui: DashboardState;
  ticketsState: QueryState<Ticket[], Error>;
}

export const TicketsPanel: m.Component<TicketsPanelAttrs> = {
  view: ({ attrs }) => {
    const { ticketsState, ui } = attrs;
    const client = getQueryClient();

    if (ticketsState.isLoading && !ticketsState.data) {
      return m(
        Box,
        {
          p: 3,
          rounded: 12,
          bg: '#020617',
          style: { border: '1px solid rgba(55, 65, 81, 0.9)' },
        },
        [
          m(
            Text,
            { fontSize: '0.9rem', style: { color: '#9ca3af' } },
            'Loading tickets…',
          ),
        ],
      );
    }

    if (ticketsState.isError) {
      return m(
        Box,
        {
          p: 3,
          rounded: 12,
          bg: '#020617',
          style: { border: '1px solid rgba(75, 85, 99, 1)' },
        },
        [
          m(
            Text,
            { fontSize: '0.85rem', style: { color: '#f97373' } },
            `Could not load tickets: ${
              ticketsState.error?.message ?? 'Unknown error'
            }`,
          ),
          m(Box, { mt: 2 }, [
            m(
              Button,
              {
                size: 'sm',
                variant: 'outline',
                colorScheme: 'gray',
                onclick: () => client.invalidateQueries('tickets'),
              },
              'Retry',
            ),
          ]),
        ],
      );
    }

    const tickets = ticketsState.data ?? [];

    if (tickets.length === 0) {
      return m(
        Box,
        {
          p: 3,
          rounded: 12,
          bg: '#020617',
          style: { border: '1px solid rgba(55, 65, 81, 0.9)' },
        },
        [
          m(
            Text,
            { fontSize: '0.9rem', style: { color: '#9ca3af' } },
            'No tickets match the current filters.',
          ),
        ],
      );
    }

    return m(
      Box,
      {
        p: 2,
        rounded: 12,
        bg: '#020617',
        style: {
          border: '1px solid rgba(55, 65, 81, 0.9)',
          maxHeight: '32rem',
          overflowY: 'auto',
        },
      },
      tickets.map((ticket) => {
        const isSelected = ui.selectedTicketId === ticket.id;

        return m(
          Box,
          {
            key: ticket.id,
            p: 3,
            rounded: 10,
            style: {
              cursor: 'pointer',
              border: isSelected
                ? '1px solid #60a5fa'
                : '1px solid rgba(75, 85, 99, 1)',
              backgroundColor: isSelected
                ? 'rgba(37, 99, 235, 0.18)'
                : 'rgba(15, 23, 42, 0.98)',
              marginBottom: '0.5rem',
            },
            onclick: () => dashboardActions.selectTicket(ticket.id),
          },
          [
            m(
              Text,
              { as: 'span', fontSize: '0.75rem', style: { color: '#9ca3af' } },
              ticket.id,
            ),
            m(
              Text,
              {
                as: 'div',
                fontSize: '0.95rem',
                fontWeight: 600,
                style: { marginTop: '0.15rem', marginBottom: '0.35rem' },
              },
              ticket.title,
            ),
            m(Stack, { direction: 'row', gap: 2, align: 'center' }, [
              m(StatusPill, { status: ticket.status }),
              m(PriorityPill, { priority: ticket.priority }),
            ]),
          ],
        );
      }),
    );
  },
};
