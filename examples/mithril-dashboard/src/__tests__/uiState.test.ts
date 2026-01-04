import { describe, it, expect, beforeEach, vi } from 'vitest';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '@ts-query/mithril';
import { dashboardStore, dashboardActions } from '../uiState';

describe('dashboardStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    dashboardStore.setState({
      statusFilter: 'open',
      search: '',
      selectedTicketId: null,
      activeView: 'tickets',
    });

    // Set up a mock query client
    const queryClient = new QueryClient();
    setQueryClient(queryClient);
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = dashboardStore.getState();

      expect(state.statusFilter).toBe('open');
      expect(state.search).toBe('');
      expect(state.selectedTicketId).toBeNull();
      expect(state.activeView).toBe('tickets');
    });
  });

  describe('setStatusFilter', () => {
    it('updates the status filter', () => {
      dashboardActions.setStatusFilter('blocked');

      expect(dashboardStore.getState().statusFilter).toBe('blocked');
    });

    it('can set filter to all', () => {
      dashboardActions.setStatusFilter('all');

      expect(dashboardStore.getState().statusFilter).toBe('all');
    });

    it('invalidates tickets query', () => {
      const queryClient = new QueryClient();
      const spy = vi.spyOn(queryClient, 'invalidateQueries');
      setQueryClient(queryClient);

      dashboardActions.setStatusFilter('closed');

      expect(spy).toHaveBeenCalledWith('tickets');
    });
  });

  describe('setSearch', () => {
    it('updates the search term', () => {
      dashboardActions.setSearch('login bug');

      expect(dashboardStore.getState().search).toBe('login bug');
    });

    it('invalidates tickets query', () => {
      const queryClient = new QueryClient();
      const spy = vi.spyOn(queryClient, 'invalidateQueries');
      setQueryClient(queryClient);

      dashboardActions.setSearch('test');

      expect(spy).toHaveBeenCalledWith('tickets');
    });
  });

  describe('selectTicket', () => {
    it('updates the selected ticket id', () => {
      dashboardActions.selectTicket('TCK-1001');

      expect(dashboardStore.getState().selectedTicketId).toBe('TCK-1001');
    });

    it('can deselect by passing null', () => {
      dashboardActions.selectTicket('TCK-1001');
      dashboardActions.selectTicket(null);

      expect(dashboardStore.getState().selectedTicketId).toBeNull();
    });

    it('invalidates ticketComments query', () => {
      const queryClient = new QueryClient();
      const spy = vi.spyOn(queryClient, 'invalidateQueries');
      setQueryClient(queryClient);

      dashboardActions.selectTicket('TCK-1001');

      expect(spy).toHaveBeenCalledWith('ticketComments');
    });
  });

  describe('setActiveView', () => {
    it('updates the active view', () => {
      dashboardActions.setActiveView('summary');

      expect(dashboardStore.getState().activeView).toBe('summary');
    });
  });

  describe('subscriptions', () => {
    it('notifies subscribers on state change', () => {
      const listener = vi.fn();
      const unsubscribe = dashboardStore.subscribe(listener);

      dashboardActions.setSearch('test');

      expect(listener).toHaveBeenCalled();

      unsubscribe();
    });

    it('stops notifying after unsubscribe', () => {
      const listener = vi.fn();
      const unsubscribe = dashboardStore.subscribe(listener);

      unsubscribe();
      dashboardActions.setSearch('test');

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
