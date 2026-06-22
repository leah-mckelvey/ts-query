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

  it('should schedule garbage collection when last subscriber unsubscribes after cacheTime has passed', async () => {
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

    // Advance time past the initial cacheTime while the query is still subscribed.
    await vi.advanceTimersByTimeAsync(1000);

    // Query should not have been garbage collected yet because it still has a subscriber.
    const sameQuery = client.getQuery({
      queryKey: 'test',
      queryFn,
    });
    expect(sameQuery).toBe(query);

    // Now unsubscribe the last subscriber, which should schedule a new GC timer.
    unsubscribe();

    // Advance time again to trigger GC after the unsubscribe.
    await vi.advanceTimersByTimeAsync(1000);

    const newQuery = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    expect(newQuery).not.toBe(query);
    vi.useRealTimers();
  });
});

describe('QueryClient with SharedCache (L2)', () => {
  function createMockSharedCache() {
    const store = new Map<string, { value: string; expiry: number }>();
    return {
      store,
      adapter: {
        get: vi.fn(async (key: string) => {
          const entry = store.get(key);
          if (!entry) return null;
          if (Date.now() > entry.expiry) {
            store.delete(key);
            return null;
          }
          return entry.value;
        }),
        set: vi.fn(async (key: string, value: string, ttlMs: number) => {
          store.set(key, { value, expiry: Date.now() + ttlMs });
        }),
        delete: vi.fn(async (key: string) => {
          store.delete(key);
        }),
      },
    };
  }

  it('should fetch from L3 (queryFn) when L2 cache is empty', async () => {
    const { adapter } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

    const query = client.getQuery({
      queryKey: ['user', 1],
      queryFn,
    });

    const result = await query.fetch();

    expect(result).toEqual({ id: 1, name: 'Test' });
    expect(queryFn).toHaveBeenCalledTimes(1);
    expect(adapter.get).toHaveBeenCalledTimes(1);
    expect(adapter.set).toHaveBeenCalledTimes(1);
  });

  it('should return from L2 cache and skip L3 when data exists in shared cache', async () => {
    const { adapter, store } = createMockSharedCache();

    // Pre-populate the shared cache
    store.set('["user",1]', {
      value: JSON.stringify({ id: 1, name: 'Cached User' }),
      expiry: Date.now() + 60000,
    });

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'Fresh User' });

    const query = client.getQuery({
      queryKey: ['user', 1],
      queryFn,
    });

    const result = await query.fetch();

    expect(result).toEqual({ id: 1, name: 'Cached User' });
    expect(queryFn).not.toHaveBeenCalled(); // L3 should be skipped
    expect(adapter.get).toHaveBeenCalledTimes(1);
    expect(adapter.set).not.toHaveBeenCalled(); // No need to re-set
  });

  it('should populate L2 cache after fetching from L3', async () => {
    const { adapter, store } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter, defaultTtl: 30000 },
    });

    const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'Test' });

    const query = client.getQuery({
      queryKey: 'test-key',
      queryFn,
    });

    await query.fetch();

    expect(adapter.set).toHaveBeenCalledWith(
      'test-key',
      JSON.stringify({ id: 1, name: 'Test' }),
      30000,
    );
    expect(store.has('test-key')).toBe(true);
  });

  it('should use query-level sharedCacheTtl over client default', async () => {
    const { adapter } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter, defaultTtl: 30000 },
    });

    const queryFn = vi.fn().mockResolvedValue('data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
      sharedCacheTtl: 5000, // Override
    });

    await query.fetch();

    expect(adapter.set).toHaveBeenCalledWith('test', '"data"', 5000);
  });

  it('should skip shared cache when skipSharedCache is true', async () => {
    const { adapter } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
      skipSharedCache: true,
    });

    await query.fetch();

    expect(adapter.get).not.toHaveBeenCalled();
    expect(adapter.set).not.toHaveBeenCalled();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should delete from shared cache on invalidateQueries', async () => {
    const { adapter } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    await query.fetch();

    client.invalidateQueries('test');

    expect(adapter.delete).toHaveBeenCalledWith('test');
  });

  it('should delete from shared cache on removeQueries', async () => {
    const { adapter } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');

    client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    client.removeQueries('test');

    expect(adapter.delete).toHaveBeenCalledWith('test');
  });

  it('should gracefully handle shared cache get errors', async () => {
    const adapter = {
      get: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('fallback data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    // Should not throw, should fall through to L3
    const result = await query.fetch();

    expect(result).toBe('fallback data');
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('should gracefully handle shared cache set errors', async () => {
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockRejectedValue(new Error('Redis connection failed')),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    // Should not throw, should still return data
    const result = await query.fetch();

    expect(result).toBe('data');
    expect(query.state.data).toBe('data');
  });

  it('should deduplicate concurrent requests with shared cache', async () => {
    const { adapter } = createMockSharedCache();
    const client = new QueryClient({
      sharedCache: { adapter },
    });

    let callCount = 0;
    const queryFn = vi.fn().mockImplementation(async () => {
      callCount++;
      await new Promise((resolve) => setTimeout(resolve, 50));
      return `result-${callCount}`;
    });

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    // Fire 5 concurrent requests
    const results = await Promise.all([
      query.fetch(),
      query.fetch(),
      query.fetch(),
      query.fetch(),
      query.fetch(),
    ]);

    // All should get the same result
    expect(results).toEqual([
      'result-1',
      'result-1',
      'result-1',
      'result-1',
      'result-1',
    ]);

    // L3 should only be called once
    expect(queryFn).toHaveBeenCalledTimes(1);

    // L2 should only be set once
    expect(adapter.set).toHaveBeenCalledTimes(1);
  });

  it('should gracefully handle malformed JSON in shared cache and fall back to L3', async () => {
    const adapter = {
      get: vi.fn().mockResolvedValue('not valid json {{{'),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue({ id: 1, name: 'Fresh Data' });

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    // Should not throw, should fall through to L3 when JSON.parse fails
    const result = await query.fetch();

    expect(result).toEqual({ id: 1, name: 'Fresh Data' });
    expect(adapter.get).toHaveBeenCalledTimes(1);
    expect(queryFn).toHaveBeenCalledTimes(1);
    // Should still try to cache the fresh data
    expect(adapter.set).toHaveBeenCalledTimes(1);
  });

  it('should gracefully handle non-serializable data (circular refs) and skip L2 write', async () => {
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    // Create circular reference that cannot be JSON.stringify'd
    interface CircularData {
      name: string;
      self?: CircularData;
    }
    const circularData: CircularData = { name: 'test' };
    circularData.self = circularData;

    const queryFn = vi.fn().mockResolvedValue(circularData);

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    // Should not throw, should return data even though it can't be cached
    const result = await query.fetch();

    expect(result).toBe(circularData);
    expect(result.name).toBe('test');
    expect(result.self).toBe(circularData);
    expect(queryFn).toHaveBeenCalledTimes(1);
    // L2 set should NOT be called because data can't be serialized
    expect(adapter.set).not.toHaveBeenCalled();
  });

  it('should gracefully handle BigInt data and skip L2 write', async () => {
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    // BigInt cannot be JSON.stringify'd
    const dataWithBigInt = { value: BigInt(9007199254740991) };

    const queryFn = vi.fn().mockResolvedValue(dataWithBigInt);

    const query = client.getQuery({
      queryKey: 'test',
      queryFn,
    });

    // Should not throw, should return data even though it can't be cached
    const result = await query.fetch();

    expect(result).toBe(dataWithBigInt);
    expect(result.value).toBe(BigInt(9007199254740991));
    expect(queryFn).toHaveBeenCalledTimes(1);
    // L2 set should NOT be called because BigInt can't be serialized
    expect(adapter.set).not.toHaveBeenCalled();
  });

  it('should clear L1 queries when clear() is called', async () => {
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({
      queryKey: 'test1',
      queryFn,
    });

    const query2 = client.getQuery({
      queryKey: 'test2',
      queryFn,
    });

    await query1.fetch();
    await query2.fetch();

    await client.clear();

    // After clear, getting the same queries should return new instances
    const newQuery1 = client.getQuery({
      queryKey: 'test1',
      queryFn,
    });

    const newQuery2 = client.getQuery({
      queryKey: 'test2',
      queryFn,
    });

    expect(newQuery1).not.toBe(query1);
    expect(newQuery2).not.toBe(query2);
  });

  it('should clear L2 shared cache when adapter has clear method', async () => {
    const clearFn = vi.fn().mockResolvedValue(undefined);
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: clearFn,
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    await client.clear();

    expect(clearFn).toHaveBeenCalledTimes(1);
  });

  it('should work without L2 clear when adapter does not have clear method', async () => {
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      // No clear method
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');
    client.getQuery({ queryKey: 'test', queryFn });

    // Should not throw even without clear method
    await expect(client.clear()).resolves.toBeUndefined();
  });

  it('should silently ignore L2 clear errors', async () => {
    const clearFn = vi.fn().mockRejectedValue(new Error('Cache clear failed'));
    const adapter = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      clear: clearFn,
    };

    const client = new QueryClient({
      sharedCache: { adapter },
    });

    const queryFn = vi.fn().mockResolvedValue('data');
    const query = client.getQuery({ queryKey: 'test', queryFn });
    await query.fetch();

    // Should not throw even when clear fails
    await expect(client.clear()).resolves.toBeUndefined();
    expect(clearFn).toHaveBeenCalledTimes(1);

    // L1 should still be cleared
    const newQuery = client.getQuery({ queryKey: 'test', queryFn });
    expect(newQuery).not.toBe(query);
  });
});

describe('QueryClient LRU Eviction', () => {
  it('should not evict queries when under maxQueries limit', () => {
    const client = new QueryClient({ maxQueries: 3 });
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({ queryKey: 'key1', queryFn });
    const query2 = client.getQuery({ queryKey: 'key2', queryFn });
    const query3 = client.getQuery({ queryKey: 'key3', queryFn });

    // All queries should still be cached
    expect(client.getQuery({ queryKey: 'key1', queryFn })).toBe(query1);
    expect(client.getQuery({ queryKey: 'key2', queryFn })).toBe(query2);
    expect(client.getQuery({ queryKey: 'key3', queryFn })).toBe(query3);
  });

  it('should evict LRU query when maxQueries is exceeded', async () => {
    const client = new QueryClient({ maxQueries: 3 });
    const queryFn = vi.fn().mockResolvedValue('data');

    // Create 3 queries - at this point LRU order is: query3, query2, query1
    const query1 = client.getQuery({ queryKey: 'key1', queryFn });
    const query2 = client.getQuery({ queryKey: 'key2', queryFn });
    const query3 = client.getQuery({ queryKey: 'key3', queryFn });

    // Fetch all to ensure they complete and have subscriberCount = 0
    await query1.fetch();
    await query2.fetch();
    await query3.fetch();

    // Wait a bit to ensure garbage collection timers don't interfere
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Add 4th query - should evict key1 (least recently used)
    // After this, LRU order should be: query4, query3, query2
    const query4 = client.getQuery({ queryKey: 'key4', queryFn });

    // key2, key3, key4 should still be cached
    expect(client.getQuery({ queryKey: 'key2', queryFn })).toBe(query2);
    expect(client.getQuery({ queryKey: 'key3', queryFn })).toBe(query3);
    expect(client.getQuery({ queryKey: 'key4', queryFn })).toBe(query4);

    // key1 should be evicted (new instance created)
    // Note: This creates a 5th query, which evicts key2 (now LRU after previous gets)
    const newQuery1 = client.getQuery({ queryKey: 'key1', queryFn });
    expect(newQuery1).not.toBe(query1);
  });

  it('should update LRU order when accessing queries', async () => {
    const client = new QueryClient({ maxQueries: 3 });
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({ queryKey: 'key1', queryFn });
    const query2 = client.getQuery({ queryKey: 'key2', queryFn });
    const query3 = client.getQuery({ queryKey: 'key3', queryFn });

    await query1.fetch();
    await query2.fetch();
    await query3.fetch();

    // Access key1 to make it recently used
    // LRU order now: key1 (most recent), key3, key2 (least recent)
    client.getQuery({ queryKey: 'key1', queryFn });

    // Add key4 - should evict key2 (now least recently used)
    // LRU order becomes: key4, key1, key3
    const query4 = client.getQuery({ queryKey: 'key4', queryFn });

    // key1, key3, and key4 should still be cached
    expect(client.getQuery({ queryKey: 'key1', queryFn })).toBe(query1);
    expect(client.getQuery({ queryKey: 'key3', queryFn })).toBe(query3);
    expect(client.getQuery({ queryKey: 'key4', queryFn })).toBe(query4);

    // key2 should have been evicted
    const newQuery2 = client.getQuery({ queryKey: 'key2', queryFn });
    expect(newQuery2).not.toBe(query2);
  });

  it('should never evict queries with active subscribers', async () => {
    const client = new QueryClient({ maxQueries: 2 });
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({ queryKey: 'key1', queryFn });
    const query2 = client.getQuery({ queryKey: 'key2', queryFn });

    // Subscribe to query1 (active subscriber)
    const unsubscribe = query1.subscribe(() => {});

    await query1.fetch();
    await query2.fetch();

    // Try to add more queries
    // query1 has an active subscriber, so it's not evictable
    // query2 has no subscribers, so it should be evicted when adding query3
    const query3 = client.getQuery({ queryKey: 'key3', queryFn });

    // Adding query4 will evict query3 (since query1 is still protected)
    const query4 = client.getQuery({ queryKey: 'key4', queryFn });

    // query1 should NOT be evicted (has active subscriber)
    expect(client.getQuery({ queryKey: 'key1', queryFn })).toBe(query1);

    // Clean up
    unsubscribe();

    // Verify queries were created successfully
    expect(query3).toBeDefined();
    expect(query4).toBeDefined();
  });

  it('should work with unbounded cache (default behavior)', async () => {
    const client = new QueryClient(); // No maxQueries specified (Infinity)
    const queryFn = vi.fn().mockResolvedValue('data');

    // Create many queries
    const queries = [];
    for (let i = 0; i < 100; i++) {
      const query = client.getQuery({ queryKey: `key${i}`, queryFn });
      queries.push(query);
      await query.fetch();
    }

    // All queries should still be cached (no eviction)
    for (let i = 0; i < 100; i++) {
      expect(client.getQuery({ queryKey: `key${i}`, queryFn })).toBe(
        queries[i],
      );
    }
  });

  it('should handle maxQueries=0 edge case', () => {
    const client = new QueryClient({ maxQueries: 0 });
    const queryFn = vi.fn().mockResolvedValue('data');

    // Should not cache anything
    const query1 = client.getQuery({ queryKey: 'key1', queryFn });
    const query2 = client.getQuery({ queryKey: 'key1', queryFn });

    // Each call should return a new instance
    expect(query1).not.toBe(query2);
  });

  it('should evict queries after subscribers unsubscribe', async () => {
    const client = new QueryClient({ maxQueries: 2 });
    const queryFn = vi.fn().mockResolvedValue('data');

    const query1 = client.getQuery({ queryKey: 'key1', queryFn });
    const query2 = client.getQuery({ queryKey: 'key2', queryFn });

    // Subscribe to both
    const unsub1 = query1.subscribe(() => {});
    const unsub2 = query2.subscribe(() => {});

    await query1.fetch();
    await query2.fetch();

    // Add key3 - should allow overflow (both have subscribers)
    const query3 = client.getQuery({ queryKey: 'key3', queryFn });

    // Unsubscribe from query1
    unsub1();

    // Add key4 - should evict query1 (now has no subscribers)
    const query4 = client.getQuery({ queryKey: 'key4', queryFn });

    // query1 should be evicted
    const newQuery1 = client.getQuery({ queryKey: 'key1', queryFn });
    expect(newQuery1).not.toBe(query1);

    // Clean up
    unsub2();
  });
});
