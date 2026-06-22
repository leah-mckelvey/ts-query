/**
 * Cluster harness for multi-process stampede testing.
 *
 * Orchestrates N worker processes, each running its own QueryClient,
 * all sharing one Redis instance (L2).
 */

import cluster from 'node:cluster';
import { fileURLToPath } from 'node:url';
import Redis from 'ioredis';
import { RedisMemoryServer } from 'redis-memory-server';
import type { AggregatedMetrics } from './metrics-collector';

export interface TestScenario {
  name: string;
  workerCount: number;
  requestsPerWorker: number;
  queryKey: string[];
  withLocking: boolean;
  dbDelayMs: number; // Simulated DB latency to create concurrency window
}

export interface WorkerMessage {
  type: 'ready' | 'metrics' | 'error';
  workerId: number;
  data?: unknown;
}

export interface WorkerConfig {
  workerId: number;
  redisHost: string;
  redisPort: number;
  scenario: TestScenario;
}

export interface TestResult {
  scenario: TestScenario;
  metrics: AggregatedMetrics;
  durationMs: number;
}

export class ClusterHarness {
  private redisServer?: RedisMemoryServer;
  private redis?: Redis;
  private workers: cluster.Worker[] = [];

  async start(): Promise<{ host: string; port: number }> {
    // Start Redis memory server
    this.redisServer = new RedisMemoryServer();
    const host = await this.redisServer.getHost();
    const port = await this.redisServer.getPort();

    // Create Redis client for orchestration (metrics aggregation)
    this.redis = new Redis({
      host,
      port,
      lazyConnect: true,
    });
    await this.redis.connect();

    return { host, port };
  }

  async runScenario(scenario: TestScenario): Promise<TestResult> {
    if (!this.redis) {
      throw new Error('Harness not started');
    }

    const { host, port } = {
      host: await this.redisServer!.getHost(),
      port: await this.redisServer!.getPort(),
    };

    // Reset metrics
    await this.redis.set('metrics:db-calls', '0');

    // Spawn workers with explicit worker script path
    const workerMetrics: Promise<unknown>[] = [];
    const startTime = Date.now();

    // Use tsx to execute TypeScript worker directly
    const workerPath = fileURLToPath(new URL('./worker-entry.ts', import.meta.url));
    cluster.setupPrimary({
      exec: workerPath,
      execArgv: ['--import', 'tsx'],
    });

    for (let i = 0; i < scenario.workerCount; i++) {
      const worker = cluster.fork();
      this.workers.push(worker);

      // Send config to worker
      const config: WorkerConfig = {
        workerId: i,
        redisHost: host,
        redisPort: port,
        scenario,
      };

      // Collect metrics from this worker
      workerMetrics.push(
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Worker ${i} timed out waiting for ready signal`));
          }, 10_000);

          worker.on('message', (msg: WorkerMessage) => {
            if (msg.type === 'ready') {
              clearTimeout(timeout);
              // Send config after worker is ready
              worker.send({ type: 'config', data: config });
            } else if (msg.type === 'metrics') {
              resolve(msg.data);
            } else if (msg.type === 'error') {
              reject(new Error(msg.data as string));
            }
          });

          worker.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });

          worker.on('exit', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
              reject(new Error(`Worker ${i} exited with code ${code}`));
            }
          });
        }),
      );
    }

    // Wait for all workers to complete and send metrics
    const allMetrics = await Promise.all(workerMetrics);
    const durationMs = Date.now() - startTime;

    // Kill workers
    for (const worker of this.workers) {
      worker.kill();
    }
    this.workers = [];

    // Aggregate metrics
    const aggregated = await this.aggregateMetrics(allMetrics as Parameters<typeof this.aggregateMetrics>[0]);

    return {
      scenario,
      metrics: aggregated,
      durationMs,
    };
  }

  private async aggregateMetrics(
    allWorkerMetrics: Array<Omit<AggregatedMetrics, 'dbCalls' | 'fanOut'>>,
  ): Promise<AggregatedMetrics> {
    if (!this.redis) {
      throw new Error('Harness not started');
    }

    // Aggregate counters across workers
    const aggregated = allWorkerMetrics.reduce(
      (acc, metrics) => ({
        l1: {
          hits: acc.l1.hits + metrics.l1.hits,
          misses: acc.l1.misses + metrics.l1.misses,
          latencies: [...acc.l1.latencies, ...metrics.l1.latencies],
          p50: 0,
          p95: 0,
          p99: 0,
        },
        l2: {
          hits: acc.l2.hits + metrics.l2.hits,
          misses: acc.l2.misses + metrics.l2.misses,
          latencies: [...acc.l2.latencies, ...metrics.l2.latencies],
          p50: 0,
          p95: 0,
          p99: 0,
        },
        l3: {
          hits: acc.l3.hits + metrics.l3.hits,
          misses: acc.l3.misses + metrics.l3.misses,
          latencies: [...acc.l3.latencies, ...metrics.l3.latencies],
          p50: 0,
          p95: 0,
          p99: 0,
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
    aggregated.l1 = {
      ...aggregated.l1,
      ...this.calculatePercentiles(aggregated.l1.latencies),
    };
    aggregated.l2 = {
      ...aggregated.l2,
      ...this.calculatePercentiles(aggregated.l2.latencies),
    };
    aggregated.l3 = {
      ...aggregated.l3,
      ...this.calculatePercentiles(aggregated.l3.latencies),
    };

    // Get cross-process DB call count from Redis
    const dbCalls = parseInt(
      (await this.redis.get('metrics:db-calls')) || '0',
      10,
    );

    return {
      ...aggregated,
      dbCalls,
      fanOut: dbCalls, // For single query key, fanOut = dbCalls
    };
  }

  private calculatePercentiles(samples: number[]): {
    p50: number;
    p95: number;
    p99: number;
  } {
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

  async stop(): Promise<void> {
    // Kill any remaining workers
    for (const worker of this.workers) {
      worker.kill();
    }
    this.workers = [];

    // Disconnect Redis
    if (this.redis) {
      await this.redis.quit();
      this.redis = undefined;
    }

    // Stop Redis server
    if (this.redisServer) {
      await this.redisServer.stop();
      this.redisServer = undefined;
    }
  }
}
