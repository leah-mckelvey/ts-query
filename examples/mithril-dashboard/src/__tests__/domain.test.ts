import { describe, it, expect } from 'vitest';
import { computeSummary, type Ticket } from '../domain';

describe('computeSummary', () => {
  it('returns zero counts for empty array', () => {
    const result = computeSummary([]);

    expect(result.totalTickets).toBe(0);
    expect(result.byStatus.open).toBe(0);
    expect(result.byStatus.closed).toBe(0);
    expect(result.byPriority.urgent).toBe(0);
  });

  it('correctly counts tickets by status', () => {
    const tickets: Ticket[] = [
      createTicket({ status: 'open' }),
      createTicket({ status: 'open' }),
      createTicket({ status: 'closed' }),
      createTicket({ status: 'blocked' }),
    ];

    const result = computeSummary(tickets);

    expect(result.totalTickets).toBe(4);
    expect(result.byStatus.open).toBe(2);
    expect(result.byStatus.closed).toBe(1);
    expect(result.byStatus.blocked).toBe(1);
    expect(result.byStatus.new).toBe(0);
    expect(result.byStatus.in_progress).toBe(0);
  });

  it('correctly counts tickets by priority', () => {
    const tickets: Ticket[] = [
      createTicket({ priority: 'urgent' }),
      createTicket({ priority: 'urgent' }),
      createTicket({ priority: 'high' }),
      createTicket({ priority: 'low' }),
    ];

    const result = computeSummary(tickets);

    expect(result.byPriority.urgent).toBe(2);
    expect(result.byPriority.high).toBe(1);
    expect(result.byPriority.low).toBe(1);
    expect(result.byPriority.medium).toBe(0);
  });

  it('handles all status types', () => {
    const tickets: Ticket[] = [
      createTicket({ status: 'new' }),
      createTicket({ status: 'open' }),
      createTicket({ status: 'in_progress' }),
      createTicket({ status: 'blocked' }),
      createTicket({ status: 'closed' }),
    ];

    const result = computeSummary(tickets);

    expect(result.totalTickets).toBe(5);
    expect(result.byStatus.new).toBe(1);
    expect(result.byStatus.open).toBe(1);
    expect(result.byStatus.in_progress).toBe(1);
    expect(result.byStatus.blocked).toBe(1);
    expect(result.byStatus.closed).toBe(1);
  });
});

function createTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: `TCK-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Test ticket',
    description: 'Test description',
    status: 'open',
    priority: 'medium',
    assigneeId: null,
    requesterId: 'u1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [],
    ...overrides,
  };
}
