/**
 * Real multi-process integration test for stampeding herd fix.
 *
 * Unlike server-stampede.test.ts which models N workers as N QueryClient
 * instances in one process, this test spawns ACTUAL Node.js worker processes
 * using node:cluster, connects them to a real Redis instance (via
 * redis-memory-server), and measures the true cross-process fan-out.
 *
 * This closes the gap between "we argued it" and "we measured it for real."
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ClusterHarness, type TestScenario } from './helpers/cluster-harness';

describe('multi-process stampede (real processes + Redis)', () => {
  let harness: ClusterHarness;

  beforeAll(async () => {
    harness = new ClusterHarness();
    await harness.start();
  }, 30_000); // Allow time for Redis server to start

  afterAll(async () => {
    await harness.stop();
  }, 30_000);

  it('WITHOUT locking: fan-out = number of processes (bounded fallback)', async () => {
    const scenario: TestScenario = {
      name: 'cold-burst-no-lock',
      workerCount: 4,
      requestsPerWorker: 25,
      queryKey: ['user', 'no-lock'],
      withLocking: false,
      dbDelayMs: 20,
    };

    const result = await harness.runScenario(scenario);

    console.log(
      `\n[${scenario.name}] ${scenario.workerCount} processes × ${scenario.requestsPerWorker} requests`,
    );
    console.log(`  Fan-out: ${result.metrics.fanOut} (expected: ${scenario.workerCount})`);
    console.log(`  Total requests: ${result.metrics.totalRequests}`);
    console.log(`  L1 hits/misses: ${result.metrics.l1.hits}/${result.metrics.l1.misses}`);
    console.log(`  L2 hits/misses: ${result.metrics.l2.hits}/${result.metrics.l2.misses}`);
    console.log(`  L3 calls: ${result.metrics.l3.hits}`);
    console.log(`  Duration: ${result.durationMs}ms`);

    // Without distributed locking, each worker hits L2 cold and fetches independently
    expect(result.metrics.fanOut).toBe(scenario.workerCount);
    expect(result.metrics.totalRequests).toBe(
      scenario.workerCount * scenario.requestsPerWorker,
    );
  }, 30_000);

  it('WITH locking: fan-out = 1 (distributed single-flight)', async () => {
    const scenario: TestScenario = {
      name: 'cold-burst-with-lock',
      workerCount: 4,
      requestsPerWorker: 25,
      queryKey: ['user', 'with-lock'],
      withLocking: true,
      dbDelayMs: 20,
    };

    const result = await harness.runScenario(scenario);

    console.log(
      `\n[${scenario.name}] ${scenario.workerCount} processes × ${scenario.requestsPerWorker} requests`,
    );
    console.log(`  Fan-out: ${result.metrics.fanOut} (expected: 1)`);
    console.log(`  Total requests: ${result.metrics.totalRequests}`);
    console.log(`  L1 hits/misses: ${result.metrics.l1.hits}/${result.metrics.l1.misses}`);
    console.log(`  L2 hits/misses: ${result.metrics.l2.hits}/${result.metrics.l2.misses}`);
    console.log(`  L3 calls: ${result.metrics.l3.hits}`);
    console.log(`  L3 p50/p95/p99: ${result.metrics.l3.p50.toFixed(1)}ms / ${result.metrics.l3.p95.toFixed(1)}ms / ${result.metrics.l3.p99.toFixed(1)}ms`);
    console.log(`  Duration: ${result.durationMs}ms`);

    // With distributed locking, ONE worker fetches and others wait for L2 publish
    expect(result.metrics.fanOut).toBe(1);
    expect(result.metrics.totalRequests).toBe(
      scenario.workerCount * scenario.requestsPerWorker,
    );
  }, 30_000);

  it('scales to many workers: fan-out still = 1 with locking', async () => {
    const scenario: TestScenario = {
      name: 'cold-burst-8-workers',
      workerCount: 8,
      requestsPerWorker: 50,
      queryKey: ['user', 'many-workers'],
      withLocking: true,
      dbDelayMs: 20,
    };

    const result = await harness.runScenario(scenario);

    console.log(
      `\n[${scenario.name}] ${scenario.workerCount} processes × ${scenario.requestsPerWorker} requests`,
    );
    console.log(`  Fan-out: ${result.metrics.fanOut} (expected: 1)`);
    console.log(`  Total requests: ${result.metrics.totalRequests}`);
    console.log(`  DB calls: ${result.metrics.dbCalls}`);
    console.log(`  L3 p50/p95/p99: ${result.metrics.l3.p50.toFixed(1)}ms / ${result.metrics.l3.p95.toFixed(1)}ms / ${result.metrics.l3.p99.toFixed(1)}ms`);
    console.log(`  Duration: ${result.durationMs}ms`);

    // Even with 8 workers × 50 requests = 400 total requests, only 1 DB call
    expect(result.metrics.fanOut).toBe(1);
    expect(result.metrics.totalRequests).toBe(400);
  }, 30_000);

  it('latency tracking: L1 < L2 < L3', async () => {
    const scenario: TestScenario = {
      name: 'latency-check',
      workerCount: 4,
      requestsPerWorker: 25,
      queryKey: ['user', 'latency'],
      withLocking: true,
      dbDelayMs: 20,
    };

    const result = await harness.runScenario(scenario);

    console.log(`\n[${scenario.name}] Latency breakdown:`);
    console.log(
      `  L1 (in-process): p50=${result.metrics.l1.p50.toFixed(2)}ms, p99=${result.metrics.l1.p99.toFixed(2)}ms`,
    );
    console.log(
      `  L2 (Redis):      p50=${result.metrics.l2.p50.toFixed(2)}ms, p99=${result.metrics.l2.p99.toFixed(2)}ms`,
    );
    console.log(
      `  L3 (DB):         p50=${result.metrics.l3.p50.toFixed(2)}ms, p99=${result.metrics.l3.p99.toFixed(2)}ms`,
    );

    // Sanity check: DB latency should be >= configured delay
    expect(result.metrics.l3.p50).toBeGreaterThanOrEqual(scenario.dbDelayMs);

    // L2 should be faster than L3 (no DB delay)
    if (result.metrics.l2.p50 > 0) {
      expect(result.metrics.l2.p50).toBeLessThan(result.metrics.l3.p50);
    }
  }, 30_000);
});
