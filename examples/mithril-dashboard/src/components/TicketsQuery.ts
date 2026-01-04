import { createQueryComponent } from '@ts-query/mithril';
import type { Ticket } from '../domain';
import { dashboardStore } from '../uiState';
import { fetchTickets } from '../api';

export const TicketsQuery = createQueryComponent<Ticket[]>({
  queryKey: 'tickets',
  queryFn: () => {
    const { statusFilter, search } = dashboardStore.getState();
    const status = statusFilter === 'all' ? undefined : statusFilter;
    const q = search.trim() || undefined;
    return fetchTickets({ status, q });
  },
});
