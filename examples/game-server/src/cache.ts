/**
 * Cache setup using ts-query's tiered caching.
 *
 * In production, you'd swap InMemoryAdapter for RedisAdapter.
 * The QueryClient handles L1 (in-process) automatically.
 */

import { QueryClient, type SharedCacheAdapter } from '@ts-query/core';

// ============================================================================
// In-Memory Adapter (for development / single-process)
// ============================================================================

interface CacheEntry {
  value: string;
  expiresAt: number;
}

export class InMemoryAdapter implements SharedCacheAdapter {
  private store = new Map<string, CacheEntry>();
  // Use union type for cross-environment compatibility (Node.js vs browser)
  private cleanupInterval: NodeJS.Timeout | number;

  constructor() {
    // Periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  // --------------------------------------------------------------------------
  // Distributed single-flight (lazy-expiry locks).
  //
  // In a single process this just dedups the (already in-process-deduped)
  // fetch, so it is effectively a no-op here. It matters once this is swapped
  // for the Redis adapter below: then the lock is shared across workers and a
  // cold concurrent burst collapses to ONE source call instead of one-per-
  // worker. See packages/core/src/__tests__/server-stampede.test.ts.
  // --------------------------------------------------------------------------
  private locks = new Map<string, { token: string; expiresAt: number }>();

  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    const cur = this.locks.get(key);
    if (cur && Date.now() < cur.expiresAt) return false;
    this.locks.set(key, { token, expiresAt: Date.now() + ttlMs });
    return true;
  }

  async releaseLock(key: string, token: string): Promise<void> {
    const cur = this.locks.get(key);
    if (cur && cur.token === token) this.locks.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }

  // Debug helper
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys()),
    };
  }
}

// ============================================================================
// Redis Adapter (for production / multi-process)
// ============================================================================

// This is a placeholder showing what a Redis adapter would look like.
// In production, you'd use ioredis or redis package.

/*
import Redis from 'ioredis';

export class RedisAdapter implements SharedCacheAdapter {
  constructor(private redis: Redis) {}

  async get(key: string): Promise<string | null> {
    return this.redis.get(`game:${key}`);
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    // Redis PSETEX takes TTL in milliseconds
    await this.redis.psetex(`game:${key}`, ttlMs, value);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`game:${key}`);
  }

  // Distributed single-flight across workers.
  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    // SET NX PX: succeeds only if no live lock exists for this key.
    const res = await this.redis.set(`lock:${key}`, token, 'PX', ttlMs, 'NX');
    return res === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<void> {
    // Compare-and-delete via Lua so we only release a lock we still own
    // (the token guards against deleting a lock that already expired and was
    // re-acquired by another worker).
    const lua =
      'if redis.call("get", KEYS[1]) == ARGV[1] ' +
      'then return redis.call("del", KEYS[1]) else return 0 end';
    await this.redis.eval(lua, 1, `lock:${key}`, token);
  }
}
*/

// ============================================================================
// Create the QueryClient with tiered caching
// ============================================================================

const sharedCacheAdapter = new InMemoryAdapter();

export const queryClient = new QueryClient({
  sharedCache: {
    adapter: sharedCacheAdapter,
    defaultTtl: 60_000, // 1 minute default
  },
});

// TTL constants for different data types
export const CACHE_TTL = {
  LEADERBOARD: 10_000, // 10 seconds - updates frequently but many reads
  PLAYER_PROFILE: 60_000, // 1 minute - viewed by others, changes slowly
  GLOBAL_EVENTS: 30_000, // 30 seconds - same for everyone
  GAME_CONFIG: 300_000, // 5 minutes - rarely changes
} as const;

// Metrics for monitoring
export function getCacheStats() {
  return sharedCacheAdapter.getStats();
}
