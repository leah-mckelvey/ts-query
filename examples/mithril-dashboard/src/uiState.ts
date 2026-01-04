import { createStore } from '@ts-query/core';
import { getQueryClient } from '@ts-query/mithril';
import type { TicketStatus } from './domain';

export type DashboardView = 'tickets' | 'summary';

export interface DashboardState {
  statusFilter: 'all' | TicketStatus;
  search: string;
  selectedTicketId: string | null;
  activeView: DashboardView;
}

export const dashboardStore = createStore<DashboardState>(() => ({
  statusFilter: 'open',
  search: '',
  selectedTicketId: null,
  activeView: 'tickets',
}));

export const dashboardActions = {
  setStatusFilter(status: DashboardState['statusFilter']) {
    dashboardStore.setState({ statusFilter: status });
    const client = getQueryClient();
    client.invalidateQueries('tickets');
  },

  setSearch(search: string) {
    dashboardStore.setState({ search });
    const client = getQueryClient();
    client.invalidateQueries('tickets');
  },

  setActiveView(view: DashboardView) {
    dashboardStore.setState({ activeView: view });
  },

  selectTicket(id: string | null) {
    dashboardStore.setState({ selectedTicketId: id });
    const client = getQueryClient();
    client.invalidateQueries('ticketComments');
  },
};
