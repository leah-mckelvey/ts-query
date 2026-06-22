/**
 * Redis adapter with metrics tracking for stampede testing.
 *
 * Implements SharedCacheAdapter with distributed locking (SET NX PX)
 * and tracks L2 hit/miss rates + latency.
 */

import Redis from 'ioredis';
import type { SharedCacheAdapter } from '../../types';
import type { MetricsCollector } from './metrics-collector';

export class InstrumentedRedisAdapter implements SharedCacheAdapter {
  constructor(
    private redis: Redis,
    private metrics?: MetricsCollector,
    private keyPrefix: string = 'game',
  ) {}

  async get(key: string): Promise<string | null> {
    const start = performance.now();
    const result = await this.redis.get(`${this.keyPrefix}:${key}`);
    const latency = performance.now() - start;

    if (this.metrics) {
      if (result !== null) {
        this.metrics.recordL2Hit(latency);
      } else {
        this.metrics.recordL2Miss(latency);
      }
    }

    return result;
  }

  async set(key: string, value: string, ttlMs: number): Promise<void> {
    const start = performance.now();
    // Redis PSETEX takes TTL in milliseconds
    await this.redis.psetex(`${this.keyPrefix}:${key}`, ttlMs, value);
    const latency = performance.now() - start;

    // Set operations don't affect hit/miss, but we could track latency separately if needed
    void latency; // unused for now
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(`${this.keyPrefix}:${key}`);
  }

  // Distributed single-flight across workers
  async acquireLock(key: string, token: string, ttlMs: number): Promise<boolean> {
    // SET NX PX: succeeds only if no live lock exists for this key
    const result = await this.redis.set(
      `lock:${key}`,
      token,
      'PX',
      ttlMs,
      'NX',
    );
    return result === 'OK';
  }

  async releaseLock(key: string, token: string): Promise<void> {
    // Compare-and-delete via Lua so we only release a lock we still own
    // (the token guards against deleting a lock that already expired and was
    // re-acquired by another worker)
    const lua =
      'if redis.call("get", KEYS[1]) == ARGV[1] ' +
      'then return redis.call("del", KEYS[1]) else return 0 end';
    await this.redis.eval(lua, 1, `lock:${key}`, token);
  }

  // Test helper: clear all data
  async clear(): Promise<void> {
    const keys = await this.redis.keys(`${this.keyPrefix}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Test helper: clear all locks
  async clearLocks(): Promise<void> {
    const keys = await this.redis.keys('lock:*');
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Disconnect
  disconnect(): void {
    this.redis.disconnect();
  }
}
