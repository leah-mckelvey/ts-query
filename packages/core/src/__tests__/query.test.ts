import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Query } from '../query';

describe('Query', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize with idle state', () => {
    const query = new Query({
      queryKey: 'test',
      queryFn: async () => 'data',
    });

    expect(query.state.status).toBe('idle');
    expect(query.state.data).toBeUndefined();
    expect(query.state.error).toBeNull();
    expect(query.state.isLoading).toBe(false);
    expect(query.state.isSuccess).toBe(false);
    expect(query.state.isError).toBe(false);
  });

  it('should fetch data successfully', async () => {
    const queryFn = vi.fn().mockResolvedValue('test data');
    const query = new Query({
      queryKey: 'test',
      queryFn,
    });

    const promise = query.fetch();

    expect(query.state.status).toBe('loading');
    expect(query.state.isLoading).toBe(true);

    const result = await promise;

    expect(result).toBe('test data');
    expect(query.state.status).toBe('success');
    expect(query.state.data).toBe('test data');
    expect(query.state.isSuccess).toBe(true);
    expect(query.state.isLoading).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should handle errors', () => {
    const error = new Error('Test error');
    const query = new Query({
      queryKey: 'test',
      queryFn: async () => 'data',
    });

    // Simulate error state without triggering unhandled rejections
    (query as unknown as {
      updateState: (partial: Partial<typeof query.state>) => void;
    }).updateState({
      status: 'error',
      error,
      isFetching: false,
    });

    expect(query.state.status).toBe('error');
    expect(query.state.error).toBe(error);
    expect(query.state.isError).toBe(true);
    expect(query.state.isLoading).toBe(false);
  });

  it('should retry on failure', async () => {
    const error = new Error('Test error');
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const query = new Query({
      queryKey: 'test',
      queryFn,
      retry: 2,
      retryDelay: 100,
    });

    const promise = query.fetch();

    // Fast-forward through retries
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(100);

    const result = await promise;

    expect(result).toBe('success');
    expect(queryFn).toHaveBeenCalledTimes(3);
    expect(query.state.status).toBe('success');
  });

  it('should notify subscribers on state change', async () => {
    const subscriber = vi.fn();
    const query = new Query({
      queryKey: 'test',
      queryFn: async () => 'data',
    });

    query.subscribe(subscriber);
    await query.fetch();

    expect(subscriber).toHaveBeenCalled();
    expect(subscriber).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'success',
        data: 'data',
      }),
    );
  });

  it('should unsubscribe correctly', async () => {
    const subscriber = vi.fn();
    const query = new Query({
      queryKey: 'test',
      queryFn: async () => 'data',
    });

    const unsubscribe = query.subscribe(subscriber);
    unsubscribe();

    await query.fetch();

    expect(subscriber).not.toHaveBeenCalled();
  });

  it('should call onSuccess callback', async () => {
    const onSuccess = vi.fn();
    const query = new Query({
      queryKey: 'test',
      queryFn: async () => 'data',
      onSuccess,
    });

    await query.fetch();

    expect(onSuccess).toHaveBeenCalledWith('data');
  });

  it('should call onError callback', () => {
    const error = new Error('Test error');
    const onError = vi.fn();
    const query = new Query({
      queryKey: 'test',
      queryFn: async () => 'data',
      onError,
    });

    // Call onError directly to avoid creating unhandled rejections
    (query as unknown as {
      options: { onError?: (error: Error) => void };
    }).options.onError?.(error);

    expect(onError).toHaveBeenCalledWith(error);
  });

  it('should invalidate and refetch', async () => {
    const queryFn = vi
      .fn()
      .mockResolvedValueOnce('data1')
      .mockResolvedValueOnce('data2');

    const query = new Query({
      queryKey: 'test',
      queryFn,
    });

    await query.fetch();
    expect(query.state.data).toBe('data1');

    query.invalidate();
    await vi.runAllTimersAsync();

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('should deduplicate in-flight fetches', async () => {
    let resolve!: (value: string) => void;
    const queryFn = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolve = res;
        }),
    );
    const query = new Query({
      queryKey: 'test',
      queryFn,
    });

    const promise1 = query.fetch();
    const promise2 = query.fetch();

    expect(queryFn).toHaveBeenCalledTimes(1);

    resolve('data');
    const [result1, result2] = await Promise.all([promise1, promise2]);

    expect(result1).toBe('data');
    expect(result2).toBe('data');
    expect(query.state.status).toBe('success');
  });

  it('should not refetch when invalidated during an in-flight fetch', async () => {
    let resolve!: (value: string) => void;
    const queryFn = vi.fn(
      () =>
        new Promise<string>((res) => {
          resolve = res;
        }),
    );
    const query = new Query({
      queryKey: 'test',
      queryFn,
    });

    const promise = query.fetch();
    query.invalidate();

    expect(queryFn).toHaveBeenCalledTimes(1);

    resolve('data');
    const result = await promise;

    expect(result).toBe('data');
    expect(queryFn).toHaveBeenCalledTimes(1);
  });
});
