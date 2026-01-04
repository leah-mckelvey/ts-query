import m from 'mithril';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '@ts-query/mithril';
import { StatusPill } from '../components/StatusPill';
import { PriorityPill } from '../components/PriorityPill';
import { StatBadge } from '../components/StatBadge';

describe('StatusPill', () => {
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

  it('renders the correct label for open status', () => {
    m.mount(container, { view: () => m(StatusPill, { status: 'open' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('Open');
  });

  it('renders the correct label for blocked status', () => {
    m.mount(container, { view: () => m(StatusPill, { status: 'blocked' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('Blocked');
  });

  it('renders the correct label for in_progress status', () => {
    m.mount(container, {
      view: () => m(StatusPill, { status: 'in_progress' }),
    });
    m.redraw.sync();

    expect(container.textContent).toBe('In progress');
  });

  it('renders the correct label for closed status', () => {
    m.mount(container, { view: () => m(StatusPill, { status: 'closed' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('Closed');
  });

  it('renders the correct label for new status', () => {
    m.mount(container, { view: () => m(StatusPill, { status: 'new' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('New');
  });
});

describe('PriorityPill', () => {
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

  it('renders the correct label for low priority', () => {
    m.mount(container, { view: () => m(PriorityPill, { priority: 'low' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('Low');
  });

  it('renders the correct label for medium priority', () => {
    m.mount(container, { view: () => m(PriorityPill, { priority: 'medium' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('Medium');
  });

  it('renders the correct label for high priority', () => {
    m.mount(container, { view: () => m(PriorityPill, { priority: 'high' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('High');
  });

  it('renders the correct label for urgent priority', () => {
    m.mount(container, { view: () => m(PriorityPill, { priority: 'urgent' }) });
    m.redraw.sync();

    expect(container.textContent).toBe('Urgent');
  });
});

describe('StatBadge', () => {
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

  it('renders the label and value', () => {
    m.mount(container, {
      view: () => m(StatBadge, { label: 'Total', value: 42 }),
    });
    m.redraw.sync();

    expect(container.textContent).toContain('Total');
    expect(container.textContent).toContain('42');
  });

  it('renders zero values correctly', () => {
    m.mount(container, {
      view: () => m(StatBadge, { label: 'Empty', value: 0 }),
    });
    m.redraw.sync();

    expect(container.textContent).toContain('Empty');
    expect(container.textContent).toContain('0');
  });
});
