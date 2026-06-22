# Multi-Process Stampeding Herd Testing

This directory contains infrastructure for testing the distributed single-flight stampede mitigation across **real Node.js processes** with a **real Redis instance**.

## What We Built

### 1. In-Process Logical Test (✅ Working)
**File**: `server-stampede.test.ts`

Models N workers as N QueryClient instances sharing one L2 adapter. This is a fast, deterministic test that proves the locking logic works correctly.

```bash
npm test -- server-stampede
```

**Results**:
- ✅ Single process: fan-out = 1 (in-process single-flight)
- ✅ 4 processes without locking: fan-out = 4 (bounded fallback)
- ✅ 4 processes with locking: fan-out = 1 (distributed single-flight)
- ✅ Warm L2 cache: fan-out = 1 across all processes

### 2. Real Multi-Process Infrastructure (🚧 In Progress)

#### Components

**`helpers/metrics-collector.ts`**
- Tracks L1/L2/L3 hit/miss rates
- Calculates p50/p95/p99 latency percentiles
- Uses Redis for cross-process atomic counters

**`helpers/redis-adapter.ts`**
- Production-ready Redis adapter with distributed locking
- Implements `SET NX PX` for lock acquisition
- Token-based lock release (compare-and-delete via Lua)
- Integrated metrics tracking

**`helpers/cluster-harness.ts`**
- Orchestrates N worker processes via `node:cluster`
- Manages Redis lifecycle (via `redis-memory-server`)
- Aggregates metrics from all workers
- Coordinates test scenarios

**`helpers/worker.ts`**
- Worker process logic
- Runs QueryClient with shared Redis L2
- Simulates concurrent requests
- Reports metrics back to primary

**`benchmark-stampede.ts`**
- Standalone benchmark script
- Outputs JSON for Epic #28 tracking
- Compares baseline (no-lock) vs optimized (with-lock)

#### Usage (Once Complete)

```bash
# Run benchmark with default settings (4 workers, 100 requests/worker)
node packages/core/src/__tests__/benchmark-stampede.js

# Custom configuration
node packages/core/src/__tests__/benchmark-stampede.js \\
  --workers=8 \\
  --requests=200 \\
  --output=results.json

# Integration test (via vitest)
npm test -- server-stampede-integration
```

## Current Status

### ✅ Completed
- [x] Stampeding herd fix merged from `origin/claude/ports-framework-support-wmf2aj`
- [x] Metrics collector with cross-process tracking
- [x] Instrumented Redis adapter
- [x] Cluster harness orchestration logic
- [x] Worker process implementation
- [x] Benchmark script structure
- [x] Integration test structure

### 🚧 Remaining Work
- [ ] Resolve vitest + cluster.fork() + TypeScript integration
  - **Issue**: `cluster.fork()` in vitest environment has module resolution issues
  - **Options**:
    1. Use `child_process.fork()` with compiled JS instead of `node:cluster`
    2. Run benchmark as standalone script (not through vitest)
    3. Use a different test runner for multi-process tests
- [ ] Wire benchmark output into Epic #28 tracking
- [ ] Add CI integration for multi-process tests

## Why This Matters

The in-process test (`server-stampede.test.ts`) **models** multi-process behavior accurately, but running with **actual OS processes** and **real Redis** closes the gap between "we argued it works" and "we measured it in production-like conditions."

Key differences:
- **Real network latency** to Redis
- **Real process isolation** (no shared memory)
- **Real lock contention** across processes
- **Real p50/p95/p99 latency** under load

## Architecture

```
┌─────────────┐
│   Primary   │  Spawns N workers, aggregates metrics
│   Process   │
└──────┬──────┘
       │
       ├─> Worker 1 ─┐
       ├─> Worker 2 ─┤
       ├─> Worker 3 ─┼──> Shared Redis (L2) ──> DB (L3)
       └─> Worker N ─┘     - Locks
                            - Cache
                            - Metrics counters
```

Each worker:
- Has its own L1 (in-process QueryClient cache)
- Shares L2 (Redis) with all workers
- Shares L3 (DB) call counter via Redis INCR

## Test Scenarios

1. **Cold burst without locking**
   - N workers × M requests hit cold L2 simultaneously
   - Expected: fan-out = N (one DB call per worker)

2. **Cold burst with locking**
   - N workers × M requests, one acquires lock
   - Expected: fan-out = 1 (distributed single-flight)

3. **Warm cache**
   - First worker populates L2, others read
   - Expected: fan-out = 1

4. **Latency tracking**
   - Measure L1 < L2 < L3 latency hierarchy
   - Output p50/p95/p99 for each tier

## Next Steps

1. **Short-term**: Use the working in-process test for CI/validation
2. **Medium-term**: Complete the multi-process integration (resolve the cluster+vitest issue)
3. **Long-term**: Add to Epic #28 benchmark suite for performance tracking

## References

- Original feature PR: #28
- In-process proof: `server-stampede.test.ts`
- Architecture doc: `OBSERVABLE_ARCHITECTURE.md`
