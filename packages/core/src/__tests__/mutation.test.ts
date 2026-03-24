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

    mutation.subscribe(subscriber);
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

    const unsubscribe = mutation.subscribe(subscriber);
    unsubscribe();

    await mutation.mutate('input');

    expect(subscriber).not.toHaveBeenCalled();
  });
});
