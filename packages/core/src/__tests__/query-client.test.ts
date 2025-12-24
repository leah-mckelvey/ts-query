import { describe, it, expect, vi } from 'vitest';
import { QueryClient } from '../query-client';

describe('QueryClient', () => {
  it('should create and cache queries', () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    const query2 = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    expect(query1).toBe(query2);
  });

  it('should create different queries for different keys', () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: 'test1',
      queryFn,
    });

    const query2 = client.getQuery({
      queryKey: 'test2',
      queryFn,
    });

    expect(query1).not.toBe(query2);
  });

  it('should handle array query keys', () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: ['user', 1],
      queryFn,
    });

    const query2 = client.getQuery({
      queryKey: ['user', 1],
      queryFn,
    });

    const query3 = client.getQuery({
      queryKey: ['user', 2],
      queryFn,
    });

    expect(query1).toBe(query2);
    expect(query1).not.toBe(query3);
  });

  it('should invalidate specific query', async () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    await query.fetch();
    expect(queryFn).toHaveBeenCalledTimes(1);

    client.invalidateQueries('test');

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('should invalidate all queries', async () => {
    const client = new QueryClient();
    const queryFn1 = vi.fn().mockResolvedValue('data1');
    const queryFn2 = vi.fn().mockResolvedValue('data2');

    const query1 = client.getQuery({
      queryKey: 'test1',
      queryFn: queryFn1,
    });

    const query2 = client.getQuery({
      queryKey: 'test2',
      queryFn: queryFn2,
    });

    await query1.fetch();
    await query2.fetch();

    expect(queryFn1).toHaveBeenCalledTimes(1);
    expect(queryFn2).toHaveBeenCalledTimes(1);

    client.invalidateQueries();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(queryFn1).toHaveBeenCalledTimes(2);
    expect(queryFn2).toHaveBeenCalledTimes(2);
  });

  it('should remove specific query', () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    client.removeQueries('test');

    const query2 = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    expect(query1).not.toBe(query2);
  });

  it('should clear all queries', () => {
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: 'test1',
      queryFn,
    });

    const query2 = client.getQuery({
      queryKey: 'test2',
      queryFn,
    });

    client.clear();

    const query3 = client.getQuery({
      queryKey: 'test1',
      queryFn,
    });

    const query4 = client.getQuery({
      queryKey: 'test2',
      queryFn,
    });

    expect(query1).not.toBe(query3);
    expect(query2).not.toBe(query4);
  });

  it('should garbage collect unused queries after cacheTime', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: 'test',
      queryFn,
      cacheTime: 1000,
    });

    await query1.fetch();

    const unsubscribe = query1.subscribe(() => {});
    unsubscribe();

    await vi.advanceTimersByTimeAsync(1000);

    const query2 = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    expect(query2).not.toBe(query1);
    vi.useRealTimers();
  });

  it('should not garbage collect queries that still have subscribers', async () => {
    vi.useFakeTimers();
    const client = new QueryClient();
    const queryFn = vi.fn().mockResolvedValue('data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
      cacheTime: 1000,
    });

    await query.fetch();
    const unsubscribe = query.subscribe(() => {});

    await vi.advanceTimersByTimeAsync(1000);

    const sameQuery = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    expect(sameQuery).toBe(query);
    unsubscribe();
    vi.useRealTimers();
  });
});
