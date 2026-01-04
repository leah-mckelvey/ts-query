import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '@ts-query/mithril';
import { SummaryBadges } from '../components/SummaryBadges';
import { TicketsPanel } from '../components/TicketsPanel';
import { dashboardStore } from '../uiState';
import type { SummaryStats, Ticket } from '../domain';
import type { QueryState } from '@ts-query/core';

describe('SummaryBadges integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setQueryClient(new QueryClient());
  });

  afterEach(() => {
    m.mount(container, null);
    document.body.removeChild(container);
  });

  it('shows loading state', () => {
    const state: QueryState<SummaryStats, Error> = {
      data: undefined,
      error: null,
      status: 'loading',
      isLoading: true,
      isError: false,
      isSuccess: false,
      isFetching: true,
      isStale: false,
    };

    m.mount(container, { view: () => m(SummaryBadges, { state }) });
    m.redraw.sync();

    expect(container.textContent).toContain('Loading metrics');
  });

  it('shows error state with retry button', () => {
    const state: QueryState<SummaryStats, Error> = {
      data: undefined,
      error: new Error('Network error'),
      status: 'error',
      isLoading: false,
      isError: true,
      isSuccess: false,
      isFetching: false,
      isStale: false,
    };

    m.mount(container, { view: () => m(SummaryBadges, { state }) });
    m.redraw.sync();

    expect(container.textContent).toContain('Metrics unavailable');
    expect(container.textContent).toContain('Network error');
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('shows summary data when loaded', () => {
    const state: QueryState<SummaryStats, Error> = {
      data: {
        totalTickets: 100,
        byStatus: {
          new: 10,
          open: 30,
          in_progress: 20,
          blocked: 5,
          closed: 35,
        },
        byPriority: { low: 20, medium: 40, high: 25, urgent: 15 },
      },
      error: null,
      status: 'success',
      isLoading: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      isStale: false,
    };

    m.mount(container, { view: () => m(SummaryBadges, { state }) });
    m.redraw.sync();

    expect(container.textContent).toContain('Total');
    expect(container.textContent).toContain('100');
    expect(container.textContent).toContain('Open');
    expect(container.textContent).toContain('30');
    expect(container.textContent).toContain('Blocked');
    expect(container.textContent).toContain('5');
    expect(container.textContent).toContain('Urgent');
    expect(container.textContent).toContain('15');
  });
});

describe('TicketsPanel integration', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    setQueryClient(new QueryClient());
    dashboardStore.setState({
      statusFilter: 'all',
      search: '',
      selectedTicketId: null,
      activeView: 'tickets',
    });
  });

  afterEach(() => {
    m.mount(container, null);
    document.body.removeChild(container);
  });

  it('shows loading state', () => {
    const ticketsState: QueryState<Ticket[], Error> = {
      data: undefined,
      error: null,
      status: 'loading',
      isLoading: true,
      isError: false,
      isSuccess: false,
      isFetching: true,
      isStale: false,
    };

    m.mount(container, {
      view: () =>
        m(TicketsPanel, { ui: dashboardStore.getState(), ticketsState }),
    });
    m.redraw.sync();

    expect(container.textContent).toContain('Loading tickets');
  });

  it('shows empty state when no tickets match', () => {
    const ticketsState: QueryState<Ticket[], Error> = {
      data: [],
      error: null,
      status: 'success',
      isLoading: false,
      isError: false,
      isSuccess: true,
      isFetching: false,
      isStale: false,
    };

    m.mount(container, {
      view: () =>
        m(TicketsPanel, { ui: dashboardStore.getState(), ticketsState }),
    });
    m.redraw.sync();

    expect(container.textContent).toContain('No tickets match');
  });
});
