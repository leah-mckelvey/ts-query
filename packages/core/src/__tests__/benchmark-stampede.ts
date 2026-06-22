#!/usr/bin/env node
/**
 * Standalone benchmark for server-side stampede mitigation.
 *
 * Outputs JSON suitable for Epic #28 benchmark tracking.
 *
 * Usage:
 *   node benchmark-stampede.js [--workers=4] [--requests=100] [--output=results.json]
 */

import cluster from 'node:cluster';
import fs from 'node:fs/promises';
import { ClusterHarness, type TestScenario, type TestResult } from './helpers/cluster-harness';

// Only run in primary
if (!cluster.isPrimary) {
  await import('./helpers/worker.js');
  // Worker exits after handling messages
} else {
  await main();
}

async function main(): Promise<void> {
  // Parse CLI args
  const args = process.argv.slice(2);
  const workerCount = parseInt(
    args.find((a) => a.startsWith('--workers='))?.split('=')[1] || '4',
    10,
  );
  const requestsPerWorker = parseInt(
    args.find((a) => a.startsWith('--requests='))?.split('=')[1] || '100',
    10,
  );
  const outputPath = args.find((a) => a.startsWith('--output='))?.split('=')[1];

  console.log('='.repeat(80));
  console.log('Server-Side Stampede Benchmark');
  console.log('='.repeat(80));
  console.log(`Workers: ${workerCount}`);
  console.log(`Requests per worker: ${requestsPerWorker}`);
  console.log(`Total concurrent requests: ${workerCount * requestsPerWorker}`);
  console.log();

  const harness = new ClusterHarness();
  await harness.start();

  const scenarios: TestScenario[] = [
    {
      name: 'baseline-no-lock',
      workerCount,
      requestsPerWorker,
      queryKey: ['benchmark', 'no-lock'],
      withLocking: false,
      dbDelayMs: 20,
    },
    {
      name: 'optimized-with-lock',
      workerCount,
      requestsPerWorker,
      queryKey: ['benchmark', 'with-lock'],
      withLocking: true,
      dbDelayMs: 20,
    },
  ];

  const results: TestResult[] = [];

  for (const scenario of scenarios) {
    console.log(`\nRunning: ${scenario.name}...`);
    const result = await harness.runScenario(scenario);
    results.push(result);

    console.log(`✓ Completed in ${result.durationMs}ms`);
    console.log(`  Fan-out: ${result.metrics.fanOut}`);
    console.log(`  DB calls: ${result.metrics.dbCalls}`);
    console.log(
      `  L1 hit rate: ${((result.metrics.l1.hits / (result.metrics.l1.hits + result.metrics.l1.misses)) * 100).toFixed(1)}%`,
    );
    console.log(
      `  L2 hit rate: ${((result.metrics.l2.hits / (result.metrics.l2.hits + result.metrics.l2.misses)) * 100).toFixed(1)}%`,
    );
    console.log(
      `  L3 p50/p95/p99: ${result.metrics.l3.p50.toFixed(1)}ms / ${result.metrics.l3.p95.toFixed(1)}ms / ${result.metrics.l3.p99.toFixed(1)}ms`,
    );
  }

  await harness.stop();

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('Summary');
  console.log('='.repeat(80));

  const baseline = results.find((r) => r.scenario.name === 'baseline-no-lock')!;
  const optimized = results.find((r) => r.scenario.name === 'optimized-with-lock')!;

  const improvement = ((baseline.metrics.fanOut - optimized.metrics.fanOut) / baseline.metrics.fanOut) * 100;

  console.log(`\nFan-out reduction:`);
  console.log(`  Baseline (no lock):     ${baseline.metrics.fanOut} DB calls`);
  console.log(`  Optimized (with lock):  ${optimized.metrics.fanOut} DB calls`);
  console.log(`  Improvement:            ${improvement.toFixed(1)}% reduction`);

  console.log(`\nTotal requests: ${baseline.metrics.totalRequests}`);
  console.log(
    `  Without lock: ${baseline.metrics.totalRequests} requests → ${baseline.metrics.fanOut} DB calls (${(baseline.metrics.totalRequests / baseline.metrics.fanOut).toFixed(0)}:1 dedup)`,
  );
  console.log(
    `  With lock:    ${optimized.metrics.totalRequests} requests → ${optimized.metrics.fanOut} DB calls (${(optimized.metrics.totalRequests / optimized.metrics.fanOut).toFixed(0)}:1 dedup)`,
  );

  // Output JSON
  if (outputPath) {
    const output = {
      timestamp: new Date().toISOString(),
      config: {
        workers: workerCount,
        requestsPerWorker,
        totalRequests: workerCount * requestsPerWorker,
      },
      results: results.map((r) => ({
        name: r.scenario.name,
        durationMs: r.durationMs,
        fanOut: r.metrics.fanOut,
        dbCalls: r.metrics.dbCalls,
        totalRequests: r.metrics.totalRequests,
        l1: {
          hits: r.metrics.l1.hits,
          misses: r.metrics.l1.misses,
          hitRate: r.metrics.l1.hits + r.metrics.l1.misses > 0
            ? (r.metrics.l1.hits / (r.metrics.l1.hits + r.metrics.l1.misses)) * 100
            : 0,
          p50: r.metrics.l1.p50,
          p95: r.metrics.l1.p95,
          p99: r.metrics.l1.p99,
        },
        l2: {
          hits: r.metrics.l2.hits,
          misses: r.metrics.l2.misses,
          hitRate: r.metrics.l2.hits + r.metrics.l2.misses > 0
            ? (r.metrics.l2.hits / (r.metrics.l2.hits + r.metrics.l2.misses)) * 100
            : 0,
          p50: r.metrics.l2.p50,
          p95: r.metrics.l2.p95,
          p99: r.metrics.l2.p99,
        },
        l3: {
          calls: r.metrics.l3.hits,
          p50: r.metrics.l3.p50,
          p95: r.metrics.l3.p95,
          p99: r.metrics.l3.p99,
        },
      })),
      summary: {
        improvement: {
          fanOutReduction: improvement,
          baseline: baseline.metrics.fanOut,
          optimized: optimized.metrics.fanOut,
        },
      },
    };

    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✓ Results written to ${outputPath}`);
  }
}
