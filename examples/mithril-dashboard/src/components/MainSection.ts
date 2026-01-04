import m from 'mithril';
import { Box, Stack } from '@ts-query/ui-mithril';
import type { DashboardState } from '../uiState';
import type { Ticket } from '../domain';
import type { QueryState } from '@ts-query/core';
import { TicketsQuery } from './TicketsQuery';
import { FiltersPanel } from './FiltersPanel';
import { TicketsPanel } from './TicketsPanel';
import { TicketDetailShell } from './TicketDetailShell';

export interface MainSectionAttrs {
  ui: DashboardState;
}

export const MainSection: m.Component<MainSectionAttrs> = {
  view: ({ attrs }) =>
    m(TicketsQuery, {
      children: (ticketsState: QueryState<Ticket[], Error>) =>
        m(
          Stack,
          {
            direction: 'row',
            gap: 4,
            align: 'flex-start',
            style: { marginTop: '1.5rem' },
          },
          [
            m(Box, { style: { width: '340px' } }, [
              m(FiltersPanel, { ui: attrs.ui }),
              m(Box, { mt: 3 }, [
                m(TicketsPanel, { ui: attrs.ui, ticketsState }),
              ]),
            ]),
            m(Box, { style: { flex: '1 1 0', minWidth: 0 } }, [
              m(TicketDetailShell, { ui: attrs.ui, ticketsState }),
            ]),
          ],
        ),
    }),
};
