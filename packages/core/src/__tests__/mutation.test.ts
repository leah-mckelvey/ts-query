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

  it('should queue a second mutate call while the first is in flight', async () => {
    let resolveFirst!: (value: string) => void;
    const firstStarted = new Promise<void>((res) => {
      resolveFirst = (v) => { res(); firstResolve(v); };
    });
    let firstResolve!: (value: string) => void;
    const firstPromise = new Promise<string>((res) => { firstResolve = res; });

    const mutationFn = vi.fn()
      .mockImplementationOnce(() => { resolveFirst('first'); return firstPromise; })
      .mockResolvedValueOnce('second');

    const mutation = new Mutation({ mutationFn });

    const p1 = mutation.mutate('a');
    // While first is in flight, queue a second call
    const p2 = mutation.mutate('b');

    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toBe('first');
    expect(r2).toBe('second');
    expect(mutationFn).toHaveBeenCalledTimes(2);
    expect(mutationFn).toHaveBeenNthCalledWith(1, 'a');
    expect(mutationFn).toHaveBeenNthCalledWith(2, 'b');
  });

  it('should process multiple queued calls in order', async () => {
    const order: string[] = [];
    const mutationFn = vi.fn().mockImplementation(async (v: string) => {
      order.push(v);
      return v;
    });

    const mutation = new Mutation({ mutationFn });

    // Fire three calls — only the first executes immediately; the other two queue
    const results = await Promise.all([
      mutation.mutate('a'),
      mutation.mutate('b'),
      mutation.mutate('c'),
    ]);

    expect(results).toEqual(['a', 'b', 'c']);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('should clear the queue on reset', async () => {
    let blockResolve!: () => void;
    const blocked = new Promise<string>((res) => {
      blockResolve = () => res('first');
    });
    const mutationFn = vi.fn().mockReturnValueOnce(blocked).mockResolvedValue('later');

    const mutation = new Mutation({ mutationFn });

    mutation.mutate('a'); // starts in-flight
    const p2 = mutation.mutate('b'); // queued

    // Reset immediately clears the queue and resets state
    mutation.reset();
    expect(mutation.state.status).toBe('idle');

    blockResolve();

    // p2 should never resolve since the queue was cleared before it ran
    const timeout = new Promise<string>((_, rej) => setTimeout(() => rej(new Error('timeout')), 50));
    await expect(Promise.race([p2, timeout])).rejects.toThrow('timeout');

    // mutationFn was only called once (for 'a'), never for 'b'
    expect(mutationFn).toHaveBeenCalledTimes(1);
  });
});
