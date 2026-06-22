/**
 * Worker process for multi-process stampede testing.
 *
 * Each worker runs its own QueryClient instance with:
 * - L1: In-process cache (per worker)
 * - L2: Shared Redis cache (across all workers)
 * - L3: Database (simulated with instrumented queryFn)
 */

import Redis from 'ioredis';
import { QueryClient } from '../../query-client';
import { MetricsCollector } from './metrics-collector';
import { InstrumentedRedisAdapter } from './redis-adapter';
import type { WorkerConfig, WorkerMessage } from './cluster-harness';

let config: WorkerConfig;
let redis: Redis;
let metrics: MetricsCollector;
let queryClient: QueryClient;
let dbCallCounter = 0;

// Send ready signal immediately
if (process.send) {
  const readyMsg: WorkerMessage = {
    type: 'ready',
    workerId: -1, // Will be set properly after receiving config
  };
  process.send(readyMsg);
}

// Listen for config from primary
process.on('message', async (msg: { type: string; data: unknown }) => {
  if (msg.type === 'config') {
    config = msg.data as WorkerConfig;
    await initWorker();
    await runTest();
  }
});

async function initWorker(): Promise<void> {
  try {
    // Connect to Redis
    redis = new Redis({
      host: config.redisHost,
      port: config.redisPort,
      lazyConnect: true,
    });
    await redis.connect();

    // Create metrics collector
    metrics = new MetricsCollector(redis);

    // Create Redis adapter (with or without locking)
    const adapter = config.scenario.withLocking
      ? new InstrumentedRedisAdapter(redis, metrics)
      : new InstrumentedRedisAdapter(redis, metrics);

    // If no locking, remove the lock methods to fall back to bounded fan-out
    const sharedCacheAdapter = config.scenario.withLocking
      ? adapter
      : {
          get: adapter.get.bind(adapter),
          set: adapter.set.bind(adapter),
          delete: adapter.delete.bind(adapter),
          // No acquireLock/releaseLock
        };

    // Create QueryClient
    queryClient = new QueryClient({
      sharedCache: {
        adapter: sharedCacheAdapter,
        defaultTtl: 60_000,
      },
    });
  } catch (error) {
    const errorMsg: WorkerMessage = {
      type: 'error',
      workerId: config.workerId,
      data: error instanceof Error ? error.message : String(error),
    };
    process.send!(errorMsg);
  }
}

async function runTest(): Promise<void> {
  try {
    // Simulated database call with latency tracking
    const queryFn = async () => {
      const start = performance.now();

      // Simulate DB latency
      await new Promise((resolve) =>
        setTimeout(resolve, config.scenario.dbDelayMs),
      );

      // Track this as an L3 call
      const latency = performance.now() - start;
      await metrics.recordL3Call(latency);

      dbCallCounter++;

      return { value: 42 };
    };

    // Fire concurrent requests
    const requests = Array.from(
      { length: config.scenario.requestsPerWorker },
      async () => {
        metrics.recordRequest();
        const query = queryClient.getQuery({
          queryKey: config.scenario.queryKey,
          queryFn,
        });
        return query.fetch();
      },
    );

    await Promise.all(requests);

    // Small delay to ensure all metrics are recorded
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Send metrics back to primary
    const localMetrics = metrics.getLocalMetrics();
    const metricsMsg: WorkerMessage = {
      type: 'metrics',
      workerId: config.workerId,
      data: localMetrics,
    };
    process.send!(metricsMsg);

    // Clean up
    await redis.quit();
  } catch (error) {
    const errorMsg: WorkerMessage = {
      type: 'error',
      workerId: config.workerId,
      data: error instanceof Error ? error.message : String(error),
    };
    process.send!(errorMsg);
  }
}
