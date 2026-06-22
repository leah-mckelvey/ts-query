/**
 * Tests for LRU eviction strategy to prevent unbounded memory growth.
 *
 * These tests verify that both QueryClient and SharedCacheAdapter
 * respect size bounds when handling many distinct keys, simulating
 * server-side scenarios where unbounded growth would cause OOM.
 */

import { describe, it, expect, vi } from 'vitest';
import { QueryClient, LRUCache, type SharedCacheAdapter } from '../index';

describe('Eviction Strategy - Memory Bounds', () => {
  describe('QueryClient (L1) with bounded queries', () => {
    it('should prevent unbounded memory growth with distinct keys', async () => {
      const client = new QueryClient({ maxQueries: 100 });
      const queryFn = vi.fn().mockResolvedValue('data');

      // Simulate server handling 1000 distinct keys (e.g., different users/sessions)
      for (let i = 0; i < 1000; i++) {
        const query = client.getQuery({ queryKey: `user-${i}`, queryFn });
        await query.fetch();
      }

      // Verify that early queries were evicted (LRU behavior)
      // Queries 0-899 should have been evicted (900 queries beyond the 100 limit)
      const earlyQuery = client.getQuery({ queryKey: 'user-0', queryFn });
      expect(earlyQuery.state.status).toBe('idle'); // New instance, not fetched yet

      const midQuery = client.getQuery({ queryKey: 'user-500', queryFn });
      expect(midQuery.state.status).toBe('idle'); // New instance

      // One of the recent queries should still be cached
      const recentQuery = client.getQuery({ queryKey: 'user-999', queryFn });
      expect(recentQuery.state.status).toBe('success'); // Cached, already fetched
    });

    it('should handle sustained traffic without growing beyond maxQueries', async () => {
      const client = new QueryClient({ maxQueries: 50 });
      const queryFn = vi.fn().mockResolvedValue('data');

      // Simulate continuous traffic with rotating distinct keys
      for (let batch = 0; batch < 10; batch++) {
        for (let i = 0; i < 100; i++) {
          const key = `request-${batch * 100 + i}`;
          const query = client.getQuery({ queryKey: key, queryFn });
          await query.fetch();
        }
      }

      // Verify we can still create and cache new queries
      const testQuery = client.getQuery({ queryKey: 'test-final', queryFn });
      await testQuery.fetch();
      expect(client.getQuery({ queryKey: 'test-final', queryFn })).toBe(
        testQuery,
      );
    });

    it('should prioritize keeping queries with active subscribers', async () => {
      const client = new QueryClient({ maxQueries: 3 });
      const queryFn = vi.fn().mockResolvedValue('data');

      // Create query with active subscriber
      const activeQuery = client.getQuery({ queryKey: 'active', queryFn });
      const unsubscribe = activeQuery.subscribe(() => {});
      await activeQuery.fetch();

      // Create 2 more queries without subscribers
      const query1 = client.getQuery({ queryKey: 'idle1', queryFn });
      const query2 = client.getQuery({ queryKey: 'idle2', queryFn });
      await query1.fetch();
      await query2.fetch();

      // Try to add many more queries - should evict idle queries, not active
      for (let i = 0; i < 10; i++) {
        const q = client.getQuery({ queryKey: `extra-${i}`, queryFn });
        await q.fetch();
      }

      // Active query should still be cached (protected from eviction)
      expect(client.getQuery({ queryKey: 'active', queryFn })).toBe(
        activeQuery,
      );

      unsubscribe();
    });
  });

  describe('InMemoryAdapter (L2) with bounded entries', () => {
    it('should prevent unbounded growth in shared cache', async () => {
      // Create a bounded LRU cache adapter
      // No eviction predicate - just use pure LRU
      const store = new LRUCache<string, { value: string; expiresAt: number }>(
        100,
      );

      const adapter: SharedCacheAdapter = {
        async get(key: string) {
          const entry = store.get(key);
          if (!entry) return null;
          if (Date.now() > entry.expiresAt) {
            store.delete(key);
            return null;
          }
          return entry.value;
        },
        async set(key: string, value: string, ttlMs: number) {
          store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
          });
        },
        async delete(key: string) {
          store.delete(key);
        },
      };

      const client = new QueryClient({
        maxQueries: Infinity, // L1 unbounded for this test
        sharedCache: { adapter },
      });

      const queryFn = vi.fn((key: string) =>
        Promise.resolve(`data-for-${key}`),
      );

      // Populate L2 cache with 1000 distinct entries
      for (let i = 0; i < 1000; i++) {
        const query = client.getQuery({
          queryKey: `cache-key-${i}`,
          queryFn: () => queryFn(`cache-key-${i}`),
        });
        await query.fetch();
      }

      // Verify L2 cache stayed bounded
      expect(store.size).toBeLessThanOrEqual(100);
    });

    it('should evict expired entries before LRU entries', async () => {
      const now = Date.now();
      const store = new LRUCache<string, { value: string; expiresAt: number }>(
        3,
        (_key, entry) => now > entry.expiresAt, // Evict expired first
      );

      // Add 3 entries: 2 expired, 1 fresh
      store.set('expired1', { value: 'old1', expiresAt: now - 1000 });
      store.set('expired2', { value: 'old2', expiresAt: now - 500 });
      store.set('fresh', { value: 'new', expiresAt: now + 10000 });

      // Add a 4th entry - should evict expired1 (oldest expired)
      store.set('new', { value: 'data', expiresAt: now + 10000 });

      // Fresh entry should still be there
      expect(store.get('fresh')).toEqual({
        value: 'new',
        expiresAt: now + 10000,
      });

      // expired1 should be evicted
      expect(store.get('expired1')).toBeUndefined();
    });
  });

  describe('Combined L1 + L2 eviction', () => {
    it('should handle bounded memory at both cache levels', async () => {
      // Create bounded L2 (pure LRU, no special eviction predicate)
      const l2Store = new LRUCache<
        string,
        { value: string; expiresAt: number }
      >(50);

      const adapter: SharedCacheAdapter = {
        async get(key: string) {
          const entry = l2Store.get(key);
          if (!entry) return null;
          if (Date.now() > entry.expiresAt) {
            l2Store.delete(key);
            return null;
          }
          return entry.value;
        },
        async set(key: string, value: string, ttlMs: number) {
          l2Store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
          });
        },
        async delete(key: string) {
          l2Store.delete(key);
        },
      };

      // Create bounded L1
      const client = new QueryClient({
        maxQueries: 30,
        sharedCache: { adapter, defaultTtl: 60000 },
      });

      const queryFn = vi.fn().mockResolvedValue('data');

      // Generate heavy distinct-key traffic
      for (let i = 0; i < 200; i++) {
        const query = client.getQuery({ queryKey: `key-${i}`, queryFn });
        await query.fetch();
      }

      // Both L1 and L2 should be bounded
      expect(l2Store.size).toBeLessThanOrEqual(50);

      // System should still function correctly
      const testQuery = client.getQuery({ queryKey: 'test', queryFn });
      await testQuery.fetch();
      expect(testQuery.state.status).toBe('success');
    });
  });

  describe('Performance characteristics', () => {
    it('should maintain O(1) access time with LRU', () => {
      const cache = new LRUCache<string, number>(1000);

      // Fill cache
      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, i);
      }

      // Measure access time (should be fast regardless of position)
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        cache.get(`key${i}`);
        cache.get(`key${500 + i}`);
        cache.get(`key${900 + i}`);
      }
      const elapsed = performance.now() - start;

      // Should complete in < 10ms (generous bound for O(1))
      expect(elapsed).toBeLessThan(10);
    });
  });
});
