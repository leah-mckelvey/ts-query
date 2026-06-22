import { describe, it, expect } from 'vitest';
import type { CacheEntryMetadata } from '../types';
import { applyJitter } from '../utils/jitter';
import { getCacheEntryState } from '../utils/cache-state';

describe('CacheEntryMetadata', () => {
  describe('type structure', () => {
    it('should be JSON-serializable with data and timing metadata', () => {
      const now = Date.now();
      const entry: CacheEntryMetadata<{ id: number; name: string }> = {
        data: { id: 1, name: 'test' },
        cachedAt: now,
        softExpiry: now + 4 * 60 * 1000, // 4 minutes
        hardExpiry: now + 5 * 60 * 1000, // 5 minutes
      };

      // Should be JSON-serializable
      const json = JSON.stringify(entry);
      const parsed = JSON.parse(json);

      expect(parsed.data).toEqual({ id: 1, name: 'test' });
      expect(parsed.cachedAt).toBe(now);
      expect(parsed.softExpiry).toBe(now + 4 * 60 * 1000);
      expect(parsed.hardExpiry).toBe(now + 5 * 60 * 1000);
    });

    it('should support generic data types', () => {
      const now = Date.now();

      // String data
      const stringEntry: CacheEntryMetadata<string> = {
        data: 'test value',
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };
      expect(stringEntry.data).toBe('test value');

      // Array data
      const arrayEntry: CacheEntryMetadata<number[]> = {
        data: [1, 2, 3],
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };
      expect(arrayEntry.data).toEqual([1, 2, 3]);

      // Complex nested object
      const complexEntry: CacheEntryMetadata<{
        users: Array<{ id: number; name: string }>;
      }> = {
        data: { users: [{ id: 1, name: 'Alice' }] },
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };
      expect(complexEntry.data.users[0].name).toBe('Alice');
    });

    it('should enforce timing constraints at type level', () => {
      const now = Date.now();
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      // All timing fields should be numbers (enforced by TypeScript)
      expect(typeof entry.cachedAt).toBe('number');
      expect(typeof entry.softExpiry).toBe('number');
      expect(typeof entry.hardExpiry).toBe('number');

      // Runtime validation: softExpiry should be between cachedAt and hardExpiry
      expect(entry.softExpiry).toBeGreaterThan(entry.cachedAt);
      expect(entry.softExpiry).toBeLessThanOrEqual(entry.hardExpiry);
      expect(entry.hardExpiry).toBeGreaterThan(entry.cachedAt);
    });
  });

  describe('timing semantics', () => {
    it('should model two-window expiry correctly', () => {
      const now = Date.now();
      const baseTTL = 5 * 60 * 1000; // 5 minutes
      const staleRatio = 0.8; // 80%

      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + baseTTL * staleRatio, // 4 minutes
        hardExpiry: now + baseTTL, // 5 minutes
      };

      // Fresh window: [now, softExpiry)
      const freshWindow = entry.softExpiry - entry.cachedAt;
      expect(freshWindow).toBe(4 * 60 * 1000);

      // Stale window: [softExpiry, hardExpiry)
      const staleWindow = entry.hardExpiry - entry.softExpiry;
      expect(staleWindow).toBe(1 * 60 * 1000);

      // Total TTL: [now, hardExpiry)
      const totalTTL = entry.hardExpiry - entry.cachedAt;
      expect(totalTTL).toBe(5 * 60 * 1000);
    });

    it('should support jittered hard expiry', () => {
      const now = Date.now();
      const baseTTL = 5 * 60 * 1000; // 5 minutes
      const jitter = 0.1; // ±10%

      // Simulate jittered expiry (4.5 to 5.5 minutes)
      const jitteredHardExpiry =
        now + baseTTL * (1 + jitter * (Math.random() * 2 - 1));

      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + baseTTL * 0.8,
        hardExpiry: jitteredHardExpiry,
      };

      // Hard expiry should be within jitter bounds
      const minExpiry = now + baseTTL * (1 - jitter);
      const maxExpiry = now + baseTTL * (1 + jitter);

      expect(entry.hardExpiry).toBeGreaterThanOrEqual(minExpiry);
      expect(entry.hardExpiry).toBeLessThanOrEqual(maxExpiry);
    });
  });

  describe('serialization edge cases', () => {
    it('should handle null data gracefully', () => {
      const now = Date.now();
      const entry: CacheEntryMetadata<null> = {
        data: null,
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      const json = JSON.stringify(entry);
      const parsed = JSON.parse(json);

      expect(parsed.data).toBeNull();
    });

    it('should handle undefined data by omitting it in JSON', () => {
      const now = Date.now();
      const entry: CacheEntryMetadata<undefined> = {
        data: undefined,
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      const json = JSON.stringify(entry);
      const parsed = JSON.parse(json);

      // JSON.stringify omits undefined values
      expect('data' in parsed).toBe(false);
    });

    it('should preserve number precision for timestamps', () => {
      const now = Date.now();
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 123456789,
        hardExpiry: now + 987654321,
      };

      const json = JSON.stringify(entry);
      const parsed = JSON.parse(json);

      // Timestamps should be exact
      expect(parsed.cachedAt).toBe(now);
      expect(parsed.softExpiry).toBe(now + 123456789);
      expect(parsed.hardExpiry).toBe(now + 987654321);
    });
  });
});

describe('applyJitter', () => {
  describe('basic jitter calculation', () => {
    it('should return exact baseTTL when jitter is 0', () => {
      const baseTTL = 5 * 60 * 1000; // 5 minutes
      const result = applyJitter(baseTTL, 0);
      expect(result).toBe(baseTTL);
    });

    it('should apply jitter within bounds for positive jitter', () => {
      const baseTTL = 5 * 60 * 1000; // 5 minutes
      const jitter = 0.1; // ±10%

      // Run multiple times to verify randomness stays in bounds
      for (let i = 0; i < 100; i++) {
        const result = applyJitter(baseTTL, jitter);
        const minTTL = baseTTL * (1 - jitter);
        const maxTTL = baseTTL * (1 + jitter);

        expect(result).toBeGreaterThanOrEqual(minTTL);
        expect(result).toBeLessThanOrEqual(maxTTL);
      }
    });

    it('should handle different jitter ratios correctly', () => {
      const baseTTL = 10000; // 10 seconds

      // 20% jitter: [8000, 12000]
      const result20 = applyJitter(baseTTL, 0.2);
      expect(result20).toBeGreaterThanOrEqual(8000);
      expect(result20).toBeLessThanOrEqual(12000);

      // 50% jitter (max): [5000, 15000]
      const result50 = applyJitter(baseTTL, 0.5);
      expect(result50).toBeGreaterThanOrEqual(5000);
      expect(result50).toBeLessThanOrEqual(15000);

      // 5% jitter: [9500, 10500]
      const result5 = applyJitter(baseTTL, 0.05);
      expect(result5).toBeGreaterThanOrEqual(9500);
      expect(result5).toBeLessThanOrEqual(10500);
    });
  });

  describe('randomness verification', () => {
    it('should produce different values across multiple calls', () => {
      const baseTTL = 5 * 60 * 1000;
      const jitter = 0.1;
      const results = new Set<number>();

      // Generate 50 values - should have variance
      for (let i = 0; i < 50; i++) {
        results.add(applyJitter(baseTTL, jitter));
      }

      // At least 80% should be unique (allowing for some collisions)
      expect(results.size).toBeGreaterThan(40);
    });

    it('should have reasonable distribution across the jitter range', () => {
      const baseTTL = 10000;
      const jitter = 0.2;
      const samples = 1000;
      const results: number[] = [];

      for (let i = 0; i < samples; i++) {
        results.push(applyJitter(baseTTL, jitter));
      }

      // Check distribution: split range into lower/upper halves
      const lowerBound = baseTTL * (1 - jitter);
      const upperBound = baseTTL * (1 + jitter);
      const midpoint = (lowerBound + upperBound) / 2;

      const lowerCount = results.filter((r) => r < midpoint).length;

      // Should be roughly 50/50 (allow 40-60% tolerance for randomness)
      const lowerRatio = lowerCount / samples;
      expect(lowerRatio).toBeGreaterThan(0.4);
      expect(lowerRatio).toBeLessThan(0.6);
    });
  });

  describe('edge cases', () => {
    it('should handle very small TTLs', () => {
      const baseTTL = 100; // 100ms
      const jitter = 0.1;
      const result = applyJitter(baseTTL, jitter);

      expect(result).toBeGreaterThanOrEqual(90);
      expect(result).toBeLessThanOrEqual(110);
    });

    it('should handle very large TTLs', () => {
      const baseTTL = 24 * 60 * 60 * 1000; // 24 hours
      const jitter = 0.1;
      const result = applyJitter(baseTTL, jitter);

      const minTTL = baseTTL * 0.9;
      const maxTTL = baseTTL * 1.1;
      expect(result).toBeGreaterThanOrEqual(minTTL);
      expect(result).toBeLessThanOrEqual(maxTTL);
    });

    it('should return integer milliseconds', () => {
      const baseTTL = 5555; // Odd number
      const jitter = 0.123; // Fractional jitter

      for (let i = 0; i < 20; i++) {
        const result = applyJitter(baseTTL, jitter);
        expect(Number.isInteger(result)).toBe(true);
      }
    });

    it('should handle zero baseTTL', () => {
      const result = applyJitter(0, 0.1);
      expect(result).toBe(0);
    });

    it('should handle maximal jitter (0.5)', () => {
      const baseTTL = 10000;
      const result = applyJitter(baseTTL, 0.5);

      // Range: [5000, 15000]
      expect(result).toBeGreaterThanOrEqual(5000);
      expect(result).toBeLessThanOrEqual(15000);
    });
  });

  describe('desynchronization benefit', () => {
    it('should spread 1000 simultaneous entries across jitter window', () => {
      const baseTTL = 5 * 60 * 1000; // 5 minutes
      const jitter = 0.1; // ±10% = 30 second window
      const numEntries = 1000;

      const expiries = Array.from({ length: numEntries }, () =>
        applyJitter(baseTTL, jitter),
      );

      // Check that entries are spread across the full window
      const minExpiry = Math.min(...expiries);
      const maxExpiry = Math.max(...expiries);
      const spread = maxExpiry - minExpiry;

      // Spread should be significant (at least 75% of theoretical range)
      const theoreticalSpread = baseTTL * jitter * 2; // Full ±jitter range
      expect(spread).toBeGreaterThan(theoreticalSpread * 0.75);

      // No single millisecond should have more than 5% of entries
      const histogram = new Map<number, number>();
      for (const exp of expiries) {
        const rounded = Math.round(exp);
        histogram.set(rounded, (histogram.get(rounded) || 0) + 1);
      }

      const maxBucketSize = Math.max(...histogram.values());
      expect(maxBucketSize).toBeLessThan(numEntries * 0.05);
    });
  });
});

describe('getCacheEntryState', () => {
  describe('state transitions', () => {
    it('should return "fresh" when current time is before soft expiry', () => {
      const now = 1000;
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 5000,
        hardExpiry: now + 10000,
      };

      // Check at various times before softExpiry
      expect(getCacheEntryState(entry, now)).toBe('fresh');
      expect(getCacheEntryState(entry, now + 1000)).toBe('fresh');
      expect(getCacheEntryState(entry, now + 4999)).toBe('fresh');
    });

    it('should return "stale" when current time is at or after soft expiry but before hard expiry', () => {
      const now = 1000;
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 5000,
        hardExpiry: now + 10000,
      };

      // At softExpiry boundary
      expect(getCacheEntryState(entry, now + 5000)).toBe('stale');

      // Within stale window
      expect(getCacheEntryState(entry, now + 6000)).toBe('stale');
      expect(getCacheEntryState(entry, now + 9999)).toBe('stale');
    });

    it('should return "expired" when current time is at or after hard expiry', () => {
      const now = 1000;
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 5000,
        hardExpiry: now + 10000,
      };

      // At hardExpiry boundary
      expect(getCacheEntryState(entry, now + 10000)).toBe('expired');

      // After hardExpiry
      expect(getCacheEntryState(entry, now + 15000)).toBe('expired');
      expect(getCacheEntryState(entry, now + 1000000)).toBe('expired');
    });
  });

  describe('boundary conditions', () => {
    it('should handle exact boundary times correctly', () => {
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: 0,
        softExpiry: 1000,
        hardExpiry: 2000,
      };

      // Just before softExpiry
      expect(getCacheEntryState(entry, 999)).toBe('fresh');
      // Exactly at softExpiry
      expect(getCacheEntryState(entry, 1000)).toBe('stale');

      // Just before hardExpiry
      expect(getCacheEntryState(entry, 1999)).toBe('stale');
      // Exactly at hardExpiry
      expect(getCacheEntryState(entry, 2000)).toBe('expired');
    });

    it('should handle zero-length stale window', () => {
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: 0,
        softExpiry: 1000,
        hardExpiry: 1000, // Same as softExpiry
      };

      expect(getCacheEntryState(entry, 500)).toBe('fresh');
      expect(getCacheEntryState(entry, 1000)).toBe('expired');
      expect(getCacheEntryState(entry, 1500)).toBe('expired');
    });

    it('should handle entry queried at cachedAt time', () => {
      const now = Date.now();
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      // Immediately after caching
      expect(getCacheEntryState(entry, now)).toBe('fresh');
    });
  });

  describe('real-world timing scenarios', () => {
    it('should correctly model typical 5-minute TTL with 80% stale ratio', () => {
      const now = Date.now();
      const baseTTL = 5 * 60 * 1000; // 5 minutes
      const staleRatio = 0.8;

      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + baseTTL * staleRatio, // 4 minutes
        hardExpiry: now + baseTTL, // 5 minutes
      };

      // Fresh for first 4 minutes
      expect(getCacheEntryState(entry, now + 3 * 60 * 1000)).toBe('fresh');

      // Stale from 4-5 minutes
      expect(getCacheEntryState(entry, now + 4.5 * 60 * 1000)).toBe('stale');

      // Expired after 5 minutes
      expect(getCacheEntryState(entry, now + 6 * 60 * 1000)).toBe('expired');
    });

    it('should handle entries with jittered hard expiry', () => {
      const now = Date.now();
      const baseTTL = 5 * 60 * 1000;
      const jitteredHardExpiry = now + baseTTL * 1.1; // +10% jitter

      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + baseTTL * 0.8,
        hardExpiry: jitteredHardExpiry,
      };

      // Should be stale between soft and jittered hard expiry
      expect(getCacheEntryState(entry, now + baseTTL * 0.9)).toBe('stale');
      expect(getCacheEntryState(entry, jitteredHardExpiry - 1)).toBe('stale');

      // Expired at jittered boundary
      expect(getCacheEntryState(entry, jitteredHardExpiry)).toBe('expired');
    });
  });

  describe('edge cases', () => {
    it('should handle very old entries', () => {
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: 0,
        softExpiry: 1000,
        hardExpiry: 2000,
      };

      const veryFarFuture = Date.now() + 365 * 24 * 60 * 60 * 1000; // 1 year
      expect(getCacheEntryState(entry, veryFarFuture)).toBe('expired');
    });

    it('should handle entries with millisecond precision', () => {
      const now = 123456789.123; // Fractional milliseconds
      const entry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: Math.floor(now),
        softExpiry: Math.floor(now) + 100,
        hardExpiry: Math.floor(now) + 200,
      };

      expect(getCacheEntryState(entry, Math.floor(now) + 50)).toBe('fresh');
      expect(getCacheEntryState(entry, Math.floor(now) + 150)).toBe('stale');
    });
  });

  describe('type safety', () => {
    it('should work with different data types', () => {
      const now = Date.now();

      const stringEntry: CacheEntryMetadata<string> = {
        data: 'test',
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      const objectEntry: CacheEntryMetadata<{ id: number }> = {
        data: { id: 123 },
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      const arrayEntry: CacheEntryMetadata<number[]> = {
        data: [1, 2, 3],
        cachedAt: now,
        softExpiry: now + 1000,
        hardExpiry: now + 2000,
      };

      expect(getCacheEntryState(stringEntry, now + 500)).toBe('fresh');
      expect(getCacheEntryState(objectEntry, now + 500)).toBe('fresh');
      expect(getCacheEntryState(stringEntry, now + 500)).toBe('fresh');
      expect(getCacheEntryState(objectEntry, now + 500)).toBe('fresh');
      expect(getCacheEntryState(arrayEntry, now + 500)).toBe('fresh');
    });
  });
});

describe('SWR integration: synchronized expiry prevention', () => {
  // Helper to create a mock shared cache adapter
  const createMockAdapter = () => {
    const store = new Map<string, { value: string; expiresAt: number }>();
    return {
      store, // Export for inspection
      adapter: {
        get: async (key: string) => {
          const entry = store.get(key);
          if (entry && Date.now() < entry.expiresAt) {
            return entry.value;
          }
          return null;
        },
        set: async (key: string, value: string, ttlMs: number) => {
          store.set(key, {
            value,
            expiresAt: Date.now() + ttlMs,
          });
        },
        delete: async (key: string) => {
          store.delete(key);
        },
        clear: async () => {
          store.clear();
        },
      },
    };
  };

  it('should spread cache expiries across jitter window for 1000 simultaneous keys', () => {
    const baseTTL = 5 * 60 * 1000; // 5 minutes
    const jitter = 0.1; // ±10%
    const numKeys = 1000;

    // Simulate 1000 keys being cached at the same moment
    const now = Date.now();
    const entries: Array<CacheEntryMetadata<string>> = [];

    for (let i = 0; i < numKeys; i++) {
      const jitteredHardExpiry = now + applyJitter(baseTTL, jitter);
      const softExpiry = now + baseTTL * 0.8;

      entries.push({
        data: `value-${i}`,
        cachedAt: now,
        softExpiry: Math.round(softExpiry),
        hardExpiry: Math.round(jitteredHardExpiry),
      });
    }

    // Collect hard expiry times
    const hardExpiries = entries.map((e) => e.hardExpiry);

    // Verify spread across jitter window
    const minExpiry = Math.min(...hardExpiries);
    const maxExpiry = Math.max(...hardExpiries);
    const spread = maxExpiry - minExpiry;

    // Theoretical jitter range: ±10% of 5min = 60 seconds total spread
    const theoreticalSpread = baseTTL * jitter * 2; // 60000ms
    expect(spread).toBeGreaterThan(theoreticalSpread * 0.75); // At least 75% coverage

    // No single millisecond bucket should have more than 5% of keys
    const histogram = new Map<number, number>();
    for (const exp of hardExpiries) {
      histogram.set(exp, (histogram.get(exp) || 0) + 1);
    }

    const maxBucketSize = Math.max(...histogram.values());
    expect(maxBucketSize).toBeLessThan(numKeys * 0.05);

    // Distribution check: split into 10 buckets and verify evenness
    const bucketSize = spread / 10;
    const buckets = Array(10).fill(0);
    for (const exp of hardExpiries) {
      const bucketIndex = Math.min(
        9,
        Math.floor((exp - minExpiry) / bucketSize),
      );
      buckets[bucketIndex]++;
    }

    // Each bucket should have roughly 10% of keys (allow 5-15% tolerance)
    for (const count of buckets) {
      const ratio = count / numKeys;
      expect(ratio).toBeGreaterThan(0.05);
      expect(ratio).toBeLessThan(0.15);
    }
  });

  it('should prevent fan-out spike: stale entries do not all refetch at once', async () => {
    // Simulate scenario:
    // 1. 100 keys cached at time T with same TTL
    // 2. All reach soft expiry around the same time
    // 3. With SWR: serve stale + background refresh (no spike)
    // 4. Without SWR: all refetch immediately (spike)

    const numKeys = 100;
    const baseTTL = 1000; // 1 second for fast test
    const staleRatio = 0.8; // Stale after 800ms

    const { adapter, store } = createMockAdapter();

    // Pre-populate cache with 100 keys at time T
    const baseTime = Date.now();
    const promises: Promise<void>[] = [];

    for (let i = 0; i < numKeys; i++) {
      const metadata: CacheEntryMetadata<string> = {
        data: `value-${i}`,
        cachedAt: baseTime,
        softExpiry: baseTime + baseTTL * staleRatio, // 800ms
        hardExpiry: baseTime + baseTTL, // 1000ms (no jitter for this test)
      };

      promises.push(adapter.set(`key-${i}`, JSON.stringify(metadata), baseTTL));
    }

    await Promise.all(promises);

    // Verify all keys are in cache
    expect(store.size).toBe(numKeys);

    // Fast-forward to soft expiry point (all keys now stale)
    const staleCheckTime = baseTime + baseTTL * staleRatio + 10; // Just past soft expiry

    let staleCount = 0;
    let freshCount = 0;

    for (let i = 0; i < numKeys; i++) {
      const cached = await adapter.get(`key-${i}`);
      if (cached) {
        const metadata = JSON.parse(cached) as CacheEntryMetadata<string>;
        const state = getCacheEntryState(metadata, staleCheckTime);

        if (state === 'stale') staleCount++;
        if (state === 'fresh') freshCount++;
      }
    }

    // All keys should be stale (not expired yet)
    expect(staleCount).toBe(numKeys);
    expect(freshCount).toBe(0);

    // KEY INSIGHT: With SWR, these stale reads return data immediately.
    // In a real system, background revalidation would be triggered,
    // but the requests are spread over time by the caller's access pattern,
    // NOT synchronized to the expiry moment.
    // This test verifies that stale data is still available to serve.
  });

  it('should demonstrate SWR benefit: serve stale immediately while refreshing', () => {
    // This test documents the SWR behavior at a conceptual level
    const now = Date.now();

    const metadata: CacheEntryMetadata<string> = {
      data: 'stale-but-usable',
      cachedAt: now - 4500, // Cached 4.5s ago
      softExpiry: now - 500, // Became stale 500ms ago
      hardExpiry: now + 500, // Will expire in 500ms
    };

    const state = getCacheEntryState(metadata, now);

    // Data is stale but not expired
    expect(state).toBe('stale');

    // With SWR: this data is served immediately to the user
    expect(metadata.data).toBe('stale-but-usable');

    // Background revalidation would be triggered (tested separately in integration tests)
    // but the user gets instant response with slightly stale data
  });
});
