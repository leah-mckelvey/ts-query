import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient } from '@ts-query/core';
import { QueryClientProvider } from '../context';
import { useQuery } from '../use-query';

function TestComponent({
  queryKey,
  queryFn,
  retry = 0,
}: {
  queryKey: string;
  queryFn: () => Promise<string>;
  retry?: number;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn,
    retry,
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error?.message}</div>;
  return <div>Data: {data}</div>;
}

describe('useQuery', () => {
  it('should fetch and display data', async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'test data';
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent queryKey="test" queryFn={queryFn} />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('Data: test data')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should display error state when query has failed', async () => {
    const queryClient = new QueryClient();
    const error = new Error('Test error');

    // Pre-create the query in an error state so the hook just reflects it,
    // without actually running a failing async query that would create
    // unhandled rejections at the environment level.
    const baseOptions = {
      queryKey: 'test',
      queryFn: async () => 'unused',
      retry: 0,
    } as const;

    const query = queryClient.getQuery(baseOptions);
    (
      query as unknown as {
        updateState: (partial: Partial<typeof query.state>) => void;
      }
    ).updateState({
      status: 'error',
      error,
      isFetching: false,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent
          queryKey={baseOptions.queryKey}
          queryFn={baseOptions.queryFn}
          retry={baseOptions.retry}
        />
      </QueryClientProvider>,
    );

    await waitFor(
      () => {
        expect(screen.getByText('Error: Test error')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it('should not fetch when enabled is false', async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('test data');

    function DisabledComponent() {
      const { data, isLoading } = useQuery({
        queryKey: 'test',
        queryFn,
        enabled: false,
      });

      if (isLoading) return <div>Loading...</div>;
      return <div>Data: {data || 'none'}</div>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <DisabledComponent />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Data: none')).toBeInTheDocument();
    });

    expect(queryFn).not.toHaveBeenCalled();
  });

  it('should throw error when used outside provider', () => {
    const queryFn = vi.fn().mockResolvedValue('test data');

    // Suppress console.error for this test
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent queryKey="test" queryFn={queryFn} />);
    }).toThrow('useQueryClient must be used within a QueryClientProvider');

    consoleError.mockRestore();
  });

  it('should share data between components with same query key', async () => {
    const queryClient = new QueryClient();
    const queryFn = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'shared data';
    });

    function App() {
      return (
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey="shared" queryFn={queryFn} />
          <TestComponent queryKey="shared" queryFn={queryFn} />
        </QueryClientProvider>
      );
    }

    render(<App />);

    await waitFor(
      () => {
        const elements = screen.getAllByText('Data: shared data');
        expect(elements).toHaveLength(2);
      },
      { timeout: 2000 },
    );

    // Should only fetch once due to caching
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
