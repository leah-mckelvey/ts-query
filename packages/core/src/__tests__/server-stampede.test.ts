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

/** Shared L2 (models Redis) WITHOUT distributed locking. */
class SharedL2 implements SharedCacheAdapter {
  protected store = new Map<string, { value: string; expiresAt: number }>();
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

/**
 * Shared L2 WITH distributed single-flight (models Redis SET NX PX + a
 * token-checked release). Lazy TTL expiry, no timers -- mirrors how Redis PX
 * expiry behaves semantically and keeps the test free of open handles.
 */
class LockingSharedL2 extends SharedL2 {
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

function worker(l2: SharedCacheAdapter) {
  return new QueryClient({ sharedCache: { adapter: l2, defaultTtl: 60_000 } });
}

/** Fire `perWorker` concurrent same-key requests on each of `count` workers. */
async function coldBurst(l2: SharedCacheAdapter, count: number, perWorker: number) {
  const db = makeDb(20);
  const workers = Array.from({ length: count }, () => worker(l2));
  await Promise.all(
    workers.flatMap((w) =>
      Array.from({ length: perWorker }, () =>
        w.getQuery({ queryKey: ['user', 1], queryFn: db.queryFn }).fetch(),
      ),
    ),
  );
  return db.calls;
}

describe('server-side fetch fan-out', () => {
  describe('single process', () => {
    it('concurrent same-key requests fan out to 1 (in-process single-flight)', async () => {
      const fanOut = await coldBurst(new SharedL2(), 1, 50);
      // eslint-disable-next-line no-console
      console.log(`[1 process, 50 concurrent] fan-out = ${fanOut} (want 1)`);
      expect(fanOut).toBe(1); // currentFetchPromise dedups within the process
    });
  });

  describe('many processes, cold burst', () => {
    it('WITHOUT a lock-capable adapter, fan-out = number of processes (bounded fallback)', async () => {
      const fanOut = await coldBurst(new SharedL2(), 4, 25);
      // eslint-disable-next-line no-console
      console.log(`[4 processes, no lock] fan-out = ${fanOut} (bounded to #workers)`);
      // A shared cache is not a shared lock: all 4 workers miss L2 and hit the
      // source. Still bounded by #workers (not by total request count).
      expect(fanOut).toBe(4);
    });

    it('WITH distributed single-flight, fan-out = 1 (the fix)', async () => {
      const fanOut = await coldBurst(new LockingSharedL2(), 4, 25);
      // eslint-disable-next-line no-console
      console.log(`[4 processes, locking] fan-out = ${fanOut} (want 1)`);
      // One worker wins the lock and fetches; the other three wait for it to
      // publish to L2. Cross-process coalescing -> a single source call.
      expect(fanOut).toBe(1);
    });
  });

  describe('many processes, warm L2', () => {
    it('shared L2 prevents re-fetch once populated', async () => {
      const l2 = new LockingSharedL2();
      const db = makeDb(20);
      const workers = Array.from({ length: 4 }, () => worker(l2));

      await workers[0]
        .getQuery({ queryKey: ['user', 1], queryFn: db.queryFn })
        .fetch();
      await settle();

      for (const w of workers.slice(1)) {
        await w.getQuery({ queryKey: ['user', 1], queryFn: db.queryFn }).fetch();
      }

      // eslint-disable-next-line no-console
      console.log(`[4 processes, warm] fan-out = ${db.calls} (want 1)`);
      expect(db.calls).toBe(1);
    });
  });
});
