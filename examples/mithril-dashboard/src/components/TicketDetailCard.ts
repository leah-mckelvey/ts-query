import m from 'mithril';
import { Stack, Text, Heading } from '@ts-query/ui-mithril';
import type { Ticket } from '../domain';
import { StatusPill } from './StatusPill';
import { PriorityPill } from './PriorityPill';

export interface TicketDetailCardAttrs {
  ticket: Ticket;
}

export const TicketDetailCard: m.Component<TicketDetailCardAttrs> = {
  view: ({ attrs }) => {
    const ticket = attrs.ticket;

    return m(Stack, { gap: 3 }, [
      m(
        Stack,
        { direction: 'row', justify: 'space-between', align: 'flex-start' },
        [
          m(Stack, { gap: 1.5 }, [
            m(
              Text,
              {
                as: 'span',
                fontSize: '0.75rem',
                style: { color: '#9ca3af' },
              },
              ticket.id,
            ),
            m(Heading, { level: 3 }, ticket.title),
          ]),
          m(Stack, { gap: 1, align: 'flex-end' }, [
            m(StatusPill, { status: ticket.status }),
            m(PriorityPill, { priority: ticket.priority }),
          ]),
        ],
      ),
      m(
        Text,
        {
          fontSize: '0.95rem',
          style: { color: '#d1d5db', lineHeight: 1.5 },
        },
        ticket.description,
      ),
    ]);
  },
};
