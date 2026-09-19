import { describe, it, expect, vi } from 'vitest';
import { Mutation } from '../mutation';

describe('Mutation', () => {
  it('should initialize with idle state', () => {
    const mutation = new Mutation({
      mutationFn: async () => 'data',
    });

    expect(mutation.state.status).toBe('idle');
    expect(mutation.state.data).toBeUndefined();
    expect(mutation.state.error).toBeNull();
    expect(mutation.state.isLoading).toBe(false);
    expect(mutation.state.isSuccess).toBe(false);
    expect(mutation.state.isError).toBe(false);
  });

  it('should mutate successfully', async () => {
    const mutationFn = vi.fn().mockResolvedValue('result');
    const mutation = new Mutation({
      mutationFn,
    });

    const result = await mutation.mutate('input');

    expect(result).toBe('result');
    expect(mutation.state.status).toBe('success');
    expect(mutation.state.data).toBe('result');
    expect(mutation.state.isSuccess).toBe(true);
    expect(mutation.state.isLoading).toBe(false);
    expect(mutationFn).toHaveBeenCalledWith('input');
  });

  it('should not fail when mergeResult throws after a successful mutation', async () => {
    const mutationFn = vi.fn().mockResolvedValue('result');
    const onSuccess = vi.fn();
    const onError = vi.fn();
    const onSettled = vi.fn();
    const mergeResult = vi.fn(() => {
      throw new Error('merge failed');
    });
    const mutation = new Mutation(
      {
        mutationFn,
        onSuccess,
        onError,
        onSettled,
      },
      mergeResult,
    );

    const result = await mutation.mutate('input');

    expect(result).toBe('result');
    expect(mergeResult).toHaveBeenCalledWith('result');
    expect(mutation.state.status).toBe('success');
    expect(mutation.state.data).toBe('result');
    expect(onSuccess).toHaveBeenCalledWith('result', 'input');
    expect(onSettled).toHaveBeenCalledWith('result', null, 'input');
    expect(onError).not.toHaveBeenCalled();
  });

  it('should handle mutation errors', async () => {
    const error = new Error('Mutation error');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const mutation = new Mutation({
      mutationFn,
    });

    await expect(mutation.mutate('input')).rejects.toThrow('Mutation error');

    expect(mutation.state.status).toBe('error');
    expect(mutation.state.error).toBe(error);
    expect(mutation.state.isError).toBe(true);
    expect(mutation.state.isLoading).toBe(false);
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const mutation = new Mutation({
      mutationFn: async (data: string) => `result: ${data}`,
      onSuccess,
    });

    await mutation.mutate('test');

    expect(onSuccess).toHaveBeenCalledWith('result: test', 'test');
  });

  it('should call onError callback', async () => {
    const error = new Error('Test error');
    const onError = vi.fn();
    const mutation = new Mutation({
      mutationFn: async () => {
        throw error;
      },
      onError,
    });

    await expect(mutation.mutate('input')).rejects.toThrow();

    expect(onError).toHaveBeenCalledWith(error, 'input');
  });

  it('should call onSettled callback on success', async () => {
    const onSettled = vi.fn();
    const mutation = new Mutation({
      mutationFn: async (data: string) => `result: ${data}`,
      onSettled,
    });

    await mutation.mutate('test');

    expect(onSettled).toHaveBeenCalledWith('result: test', null, 'test');
  });

  it('should call onSettled callback on error', async () => {
    const error = new Error('Test error');
    const onSettled = vi.fn();
    const mutation = new Mutation({
      mutationFn: async () => {
        throw error;
      },
      onSettled,
    });

    await expect(mutation.mutate('input')).rejects.toThrow();

    expect(onSettled).toHaveBeenCalledWith(undefined, error, 'input');
  });

  it('should notify subscribers on state change', async () => {
    const subscriber = vi.fn();
    const mutation = new Mutation({
      mutationFn: async () => 'data',
    });

    mutation.subscribe({ next: subscriber });
    await mutation.mutate('input');

    expect(subscriber).toHaveBeenCalled();
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: 'data',
      }),
    );
  });

  it('should reset state', async () => {
    const mutation = new Mutation({
      mutationFn: async () => 'data',
    });

    await mutation.mutate('input');
    expect(mutation.state.status).toBe('success');
    expect(mutation.state.data).toBe('data');

    mutation.reset();

    expect(mutation.state.status).toBe('idle');
    expect(mutation.state.data).toBeUndefined();
    expect(mutation.state.error).toBeNull();
    expect(mutation.state.isLoading).toBe(false);
    expect(mutation.state.isSuccess).toBe(false);
    expect(mutation.state.isError).toBe(false);
  });

  it('should unsubscribe correctly', async () => {
    const subscriber = vi.fn();
    const mutation = new Mutation({
      mutationFn: async () => 'data',
    });

    const unsubscribe = mutation.subscribe({ next: subscriber });

    // BehaviorSubject emits current value immediately on subscribe
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'idle' }),
    );

    subscriber.mockClear();
    unsubscribe();

    await mutation.mutate('input');

    // After unsubscribe, should not receive any more emissions
    expect(subscriber).not.toHaveBeenCalled();
  });
});
