/**
 * Cross-process metrics collection for stampede testing.
 *
 * Tracks cache hit/miss rates and latency across L1/L2/L3 tiers.
 * Uses Redis for atomic counters shared across worker processes.
 */

import type Redis from 'ioredis';

export interface TierMetrics {
  hits: number;
  misses: number;
  latencies: number[]; // Raw latency samples for percentile calculation
}

export interface AggregatedMetrics {
  l1: TierMetrics & { p50: number; p95: number; p99: number };
  l2: TierMetrics & { p50: number; p95: number; p99: number };
  l3: TierMetrics & { p50: number; p95: number; p99: number };
  dbCalls: number;
  totalRequests: number;
  fanOut: number; // dbCalls / unique query keys
}

export class MetricsCollector {
  private l1Hits = 0;
  private l1Misses = 0;
  private l1Latencies: number[] = [];

  private l2Hits = 0;
  private l2Misses = 0;
  private l2Latencies: number[] = [];

  private l3Hits = 0;
  private l3Misses = 0;
  private l3Latencies: number[] = [];

  private requestCount = 0;

  constructor(private redis: Redis | null = null) {}

  // L1 (in-process cache) tracking
  recordL1Hit(latencyMs: number): void {
    this.l1Hits++;
    this.l1Latencies.push(latencyMs);
  }

  recordL1Miss(latencyMs: number): void {
    this.l1Misses++;
    this.l1Latencies.push(latencyMs);
  }

  // L2 (shared cache) tracking
  recordL2Hit(latencyMs: number): void {
    this.l2Hits++;
    this.l2Latencies.push(latencyMs);
  }

  recordL2Miss(latencyMs: number): void {
    this.l2Misses++;
    this.l2Latencies.push(latencyMs);
  }

  // L3 (database) tracking
  async recordL3Call(latencyMs: number): Promise<void> {
    this.l3Hits++; // L3 is always a "hit" from DB perspective
    this.l3Latencies.push(latencyMs);

    // Atomic cross-process counter
    if (this.redis) {
      await this.redis.incr('metrics:db-calls');
    }
  }

  recordRequest(): void {
    this.requestCount++;
  }

  // Get local metrics (from this process only)
  getLocalMetrics(): Omit<AggregatedMetrics, 'dbCalls' | 'fanOut'> {
    return {
      l1: {
        hits: this.l1Hits,
        misses: this.l1Misses,
        latencies: [...this.l1Latencies],
        ...this.calculatePercentiles(this.l1Latencies),
      },
      l2: {
        hits: this.l2Hits,
        misses: this.l2Misses,
        latencies: [...this.l2Latencies],
        ...this.calculatePercentiles(this.l2Latencies),
      },
      l3: {
        hits: this.l3Hits,
        misses: this.l3Misses,
        latencies: [...this.l3Latencies],
        ...this.calculatePercentiles(this.l3Latencies),
      },
      totalRequests: this.requestCount,
    };
  }

  // Get aggregated metrics across all processes
  async getAggregatedMetrics(allWorkerMetrics: Omit<AggregatedMetrics, 'dbCalls' | 'fanOut'>[]): Promise<AggregatedMetrics> {
    // Aggregate counters across workers
    const aggregated = allWorkerMetrics.reduce(
      (acc, metrics) => ({
        l1: {
          hits: acc.l1.hits + metrics.l1.hits,
          misses: acc.l1.misses + metrics.l1.misses,
          latencies: [...acc.l1.latencies, ...metrics.l1.latencies],
          p50: 0, p95: 0, p99: 0, // Recalculated below
        },
        l2: {
          hits: acc.l2.hits + metrics.l2.hits,
          misses: acc.l2.misses + metrics.l2.misses,
          latencies: [...acc.l2.latencies, ...metrics.l2.latencies],
          p50: 0, p95: 0, p99: 0,
        },
        l3: {
          hits: acc.l3.hits + metrics.l3.hits,
          misses: acc.l3.misses + metrics.l3.misses,
          latencies: [...acc.l3.latencies, ...metrics.l3.latencies],
          p50: 0, p95: 0, p99: 0,
        },
        totalRequests: acc.totalRequests + metrics.totalRequests,
      }),
      {
        l1: { hits: 0, misses: 0, latencies: [], p50: 0, p95: 0, p99: 0 },
        l2: { hits: 0, misses: 0, latencies: [], p50: 0, p95: 0, p99: 0 },
        l3: { hits: 0, misses: 0, latencies: [], p50: 0, p95: 0, p99: 0 },
        totalRequests: 0,
      },
    );

    // Recalculate percentiles across all samples
    aggregated.l1 = { ...aggregated.l1, ...this.calculatePercentiles(aggregated.l1.latencies) };
    aggregated.l2 = { ...aggregated.l2, ...this.calculatePercentiles(aggregated.l2.latencies) };
    aggregated.l3 = { ...aggregated.l3, ...this.calculatePercentiles(aggregated.l3.latencies) };

    // Get cross-process DB call count from Redis
    const dbCalls = this.redis
      ? parseInt((await this.redis.get('metrics:db-calls')) || '0', 10)
      : aggregated.l3.hits; // Fallback to L3 hits if no Redis

    return {
      ...aggregated,
      dbCalls,
      fanOut: dbCalls, // For single query key, fanOut = dbCalls
    };
  }

  reset(): void {
    this.l1Hits = 0;
    this.l1Misses = 0;
    this.l1Latencies = [];
    this.l2Hits = 0;
    this.l2Misses = 0;
    this.l2Latencies = [];
    this.l3Hits = 0;
    this.l3Misses = 0;
    this.l3Latencies = [];
    this.requestCount = 0;
  }

  async resetRedis(): Promise<void> {
    if (this.redis) {
      await this.redis.set('metrics:db-calls', '0');
    }
  }

  private calculatePercentiles(samples: number[]): { p50: number; p95: number; p99: number } {
    if (samples.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...samples].sort((a, b) => a - b);
    return {
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  private percentile(sorted: number[], p: number): number {
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }
}
