import m from 'mithril';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient } from '@ts-query/core';
import { setQueryClient } from '../query-client-provider';
import { createQueryComponent } from '../use-query';

describe('Mithril useQuery', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    m.mount(container, null);
    document.body.removeChild(container);
  });

  it('should fetch and display data', async () => {
    const queryClient = new QueryClient();
    setQueryClient(queryClient);

    const queryFn = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'test data';
    });

    const QueryComponent = createQueryComponent({
      queryKey: 'test',
      queryFn,
      retry: 0,
    });

    const App: m.Component = {
      view: () => m(QueryComponent, {
        children: (state) => {
          if (state.isLoading) return m('div', 'Loading...');
          if (state.isError) return m('div', `Error: ${state.error?.message}`);
          return m('div', `Data: ${state.data}`);
        },
      }),
    };

    m.mount(container, App);

    // Initially should show loading
    expect(container.textContent).toBe('Loading...');

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 50));
    m.redraw.sync();

    expect(container.textContent).toBe('Data: test data');
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', async () => {
    const queryClient = new QueryClient();
    setQueryClient(queryClient);

    const queryFn = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      throw new Error('Test error');
    });

    const QueryComponent = createQueryComponent({
      queryKey: 'test-error',
      queryFn,
      retry: 0,
    });

    const App: m.Component = {
      view: () => m(QueryComponent, {
        children: (state) => {
          if (state.isLoading) return m('div', 'Loading...');
          if (state.isError) return m('div', `Error: ${state.error?.message}`);
          return m('div', `Data: ${state.data}`);
        },
      }),
    };

    m.mount(container, App);

    // Initially should show loading
    expect(container.textContent).toBe('Loading...');

    // Wait for error
    await new Promise(resolve => setTimeout(resolve, 50));
    m.redraw.sync();

    expect(container.textContent).toBe('Error: Test error');
  });

  it('should not fetch when enabled is false', async () => {
    const queryClient = new QueryClient();
    setQueryClient(queryClient);

    const queryFn = vi.fn().mockResolvedValue('test data');

    const QueryComponent = createQueryComponent({
      queryKey: 'test-disabled',
      queryFn,
      enabled: false,
    });

    const App: m.Component = {
      view: () => m(QueryComponent, {
        children: (state) => {
          if (state.isLoading) return m('div', 'Loading...');
          return m('div', `Data: ${state.data || 'none'}`);
        },
      }),
    };

    m.mount(container, App);

    await new Promise(resolve => setTimeout(resolve, 50));
    m.redraw.sync();

    expect(container.textContent).toBe('Data: none');
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should share data between components with same query key', async () => {
    const queryClient = new QueryClient();
    setQueryClient(queryClient);

    const queryFn = vi.fn(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return 'shared data';
    });

    const QueryComponent = createQueryComponent({
      queryKey: 'shared',
      queryFn,
      retry: 0,
    });

    const App: m.Component = {
      view: () => m('div', [
        m(QueryComponent, {
          children: (state) => m('div.first', state.data || 'loading'),
        }),
        m(QueryComponent, {
          children: (state) => m('div.second', state.data || 'loading'),
        }),
      ]),
    };

    m.mount(container, App);

    // Wait for data to load
    await new Promise(resolve => setTimeout(resolve, 50));
    m.redraw.sync();

    const firstDiv = container.querySelector('.first');
    const secondDiv = container.querySelector('.second');

    expect(firstDiv?.textContent).toBe('shared data');
    expect(secondDiv?.textContent).toBe('shared data');

    // Should only fetch once due to caching
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});

