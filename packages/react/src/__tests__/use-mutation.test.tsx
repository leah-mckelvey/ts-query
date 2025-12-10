import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient } from '@ts-query/core';
import { QueryClientProvider } from '../context';
import { useMutation } from '../use-mutation';

function TestComponent({ mutationFn }: { mutationFn: (data: string) => Promise<string> }) {
  const { mutate, state } = useMutation({
    mutationFn,
  });

  const handleMutate = () => {
    mutate('test input').catch(() => {
      // Error is handled in mutation state, no need to do anything here
    });
  };

  return (
    <div>
      <button onClick={handleMutate}>Mutate</button>
      {state.isLoading && <div>Loading...</div>}
      {state.isError && <div>Error: {state.error?.message}</div>}
      {state.isSuccess && <div>Success: {state.data}</div>}
    </div>
  );
}

describe('useMutation', () => {
  it('should execute mutation on button click', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const mutationFn = vi.fn(async (data: string) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      return 'mutation result';
    });

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent mutationFn={mutationFn} />
      </QueryClientProvider>
    );

    const button = screen.getByText('Mutate');
    await user.click(button);

    // Check for loading state (might be too fast, so we'll just check for success)
    await waitFor(() => {
      expect(screen.getByText('Success: mutation result')).toBeInTheDocument();
    }, { timeout: 2000 });

    expect(mutationFn).toHaveBeenCalledWith('test input');
  });

  it('should handle mutation errors', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const mutationFn = vi.fn().mockRejectedValue(new Error('Mutation failed'));

    render(
      <QueryClientProvider client={queryClient}>
        <TestComponent mutationFn={mutationFn} />
      </QueryClientProvider>
    );

    const button = screen.getByText('Mutate');
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText('Error: Mutation failed')).toBeInTheDocument();
    });
  });

  it('should call onSuccess callback', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const mutationFn = vi.fn().mockResolvedValue('result');
    const onSuccess = vi.fn();

    function ComponentWithCallback() {
      const { mutate } = useMutation({
        mutationFn,
        onSuccess,
      });

      return <button onClick={() => mutate('input').catch(() => {})}>Mutate</button>;
    }

    render(
      <QueryClientProvider client={queryClient}>
        <ComponentWithCallback />
      </QueryClientProvider>
    );

    const button = screen.getByText('Mutate');
    await user.click(button);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith('result', 'input');
    });
  });

  it('should reset mutation state', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient();
    const mutationFn = vi.fn().mockResolvedValue('result');

    function ComponentWithReset() {
      const { mutate, reset, state } = useMutation({
        mutationFn,
      });

      return (
        <div>
          <button onClick={() => mutate('input').catch(() => {})}>Mutate</button>
          <button onClick={reset}>Reset</button>
          {state.isSuccess && <div>Success: {state.data}</div>}
          {state.status === 'idle' && <div>Idle</div>}
        </div>
      );
    }

    render(
      <QueryClientProvider client={queryClient}>
        <ComponentWithReset />
      </QueryClientProvider>
    );

    // Execute mutation
    const mutateButton = screen.getByText('Mutate');
    await user.click(mutateButton);

    await waitFor(() => {
      expect(screen.getByText('Success: result')).toBeInTheDocument();
    });

    // Reset
    const resetButton = screen.getByText('Reset');
    await user.click(resetButton);

    await waitFor(() => {
      expect(screen.getByText('Idle')).toBeInTheDocument();
    });
  });

  it('should throw error when used outside provider', () => {
    const mutationFn = vi.fn().mockResolvedValue('result');

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent mutationFn={mutationFn} />);
    }).toThrow('useQueryClient must be used within a QueryClientProvider');

    consoleError.mockRestore();
  });
});

