/**
 * Server-side stampede / fetch fan-out probe.
 *
 * Question under test: does "one abstraction, both sides of the stack" hold
 * when the server runs as MORE THAN ONE process?
 *
 * "Fetch fan-out" = number of times the source-of-truth queryFn (the L3/DB
 * call) runs for a single logical cache miss. The "ask once, answer many"
 * guarantee says this should be ~1.
 *
 * We model N Node workers faithfully: each process has its own in-memory
 * state (its own QueryClient => its own `queries` map and `currentFetchPromise`
 * single-flight), and they share exactly one L2 adapter -- the same way N
 * workers share one Redis. The queryFn counter stands in for "DB calls",
 * which is the real shared resource we care about protecting.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { QueryClient } from '../query-client';
import type { SharedCacheAdapter } from '../types';

/** Minimal shared L2 (models Redis): one instance handed to every "worker". */
class SharedL2 implements SharedCacheAdapter {
  private store = new Map<string, { value: string; expiresAt: number }>();
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
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async clear(): Promise<void> {
    this.store.clear();
  }
}

/** A "DB" whose call count is the thing we are trying to keep at 1. */
function makeDb(delayMs: number) {
  let calls = 0;
  const queryFn = async () => {
    calls += 1;
    // A real fetch isn't instant. The delay is what creates the concurrency
    // window: every caller that arrives before the first result lands is a
    // caller that might stampede.
    await new Promise((r) => setTimeout(r, delayMs));
    return { value: 42 };
  };
  return {
    queryFn,
    get calls() {
      return calls;
    },
  };
}

const settle = () => new Promise((r) => setTimeout(r, 25));

describe('server-side fetch fan-out (the leak probe)', () => {
  let l2: SharedL2;
  beforeEach(() => {
    l2 = new SharedL2();
  });

  function makeWorker() {
    return new QueryClient({
      sharedCache: { adapter: l2, defaultTtl: 60_000 },
    });
  }

  it('SINGLE process: concurrent same-key requests fan out to 1 (single-flight works in-process)', async () => {
    const db = makeDb(20);
    const worker = makeWorker();

    // 50 concurrent requests hit one process for one cold key.
    await Promise.all(
      Array.from({ length: 50 }, () =>
        worker.getQuery({ queryKey: ['user', 1], queryFn: db.queryFn }).fetch(),
      ),
    );

    // eslint-disable-next-line no-console
    console.log(`[1 process,  50 concurrent] fan-out = ${db.calls} (want 1)`);
    expect(db.calls).toBe(1); // currentFetchPromise dedups within the process
  });

  it('MANY processes, cold burst: fan-out = number of processes, NOT 1 (the leak)', async () => {
    const db = makeDb(20);
    const WORKERS = 4;
    const workers = Array.from({ length: WORKERS }, makeWorker);

    // Each of the 4 processes gets 25 concurrent requests for the same cold
    // key, all at once -- the realistic "cache is cold, traffic spikes" moment.
    await Promise.all(
      workers.flatMap((w) =>
        Array.from({ length: 25 }, () =>
          w.getQuery({ queryKey: ['user', 1], queryFn: db.queryFn }).fetch(),
        ),
      ),
    );

    // eslint-disable-next-line no-console
    console.log(
      `[${WORKERS} processes, cold burst] fan-out = ${db.calls} (want 1, leaks to ${WORKERS})`,
    );

    // The honest result: a SHARED CACHE IS NOT A SHARED LOCK. All 4 processes
    // read L2, all miss (nothing written yet), all hit the DB. The shared
    // adapter only dedups AFTER the first result is written -- it cannot
    // single-flight a concurrent cold burst across processes.
    expect(db.calls).toBe(WORKERS);
  });

  it('MANY processes, warm: shared L2 does prevent re-fetch once populated', async () => {
    const db = makeDb(20);
    const workers = Array.from({ length: 4 }, makeWorker);

    // Process 0 warms the cache first and we let the fire-and-forget L2 write
    // settle.
    await workers[0]
      .getQuery({ queryKey: ['user', 1], queryFn: db.queryFn })
      .fetch();
    await settle();

    // Now the other three processes read sequentially -> all L2 hits.
    for (const w of workers.slice(1)) {
      await w.getQuery({ queryKey: ['user', 1], queryFn: db.queryFn }).fetch();
    }

    // eslint-disable-next-line no-console
    console.log(`[4 processes, warm] fan-out = ${db.calls} (want 1)`);
    expect(db.calls).toBe(1); // L2 carries the value across processes once warm
  });
});
