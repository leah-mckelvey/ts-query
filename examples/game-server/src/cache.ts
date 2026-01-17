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
