# Observable Architecture: Request Deduplication

## The Problem We Fixed

The library had a **critical race condition** in query deduplication that manifested in:

1. **Frontend**: React StrictMode double-mounting causing duplicate fetches
2. **Frontend**: Multiple components mounting simultaneously triggering duplicate requests
3. **Backend**: Stampeding herd problem - multiple simultaneous requests for same data hitting the database multiple times

## Root Cause: Callback-Based State Management

The previous implementation used a simple callback pattern:

```typescript
// OLD: Callback-based (BROKEN)
class Query {
  private store: Store<QueryState>; // Custom Zustand-like store

  subscribe(callback: (state) => void) {
    this.store.subscribe(callback);
  }
}

// In React hook:
useEffect(() => {
  if (query.state.status === 'idle') {
    // ❌ RACE CONDITION
    query.fetch();
  }
}, [query]);
```

**The Race:**

1. Component 1 effect runs: checks `status === 'idle'` → true → calls `fetch()`
2. Component 2 effect runs **microseconds later**: checks `status === 'idle'` → **still true!** → calls `fetch()` again
3. Both fetches start before the state updates to 'loading'

Even though `fetch()` had deduplication logic (`currentFetchPromise` check), the **decision to call fetch** happened in each component independently, creating a timing window where both could see 'idle' status.

## Solution: RxJS BehaviorSubject

With observables, the state change happens **synchronously** in the stream:

```typescript
// NEW: Observable-based (CORRECT)
class Query {
  private state$: BehaviorSubject<QueryState>;

  subscribe(observer: { next: (state) => void }) {
    const isFirstSubscriber = this.subscriberCount === 0;
    this.subscriberCount++;

    // Auto-fetch on FIRST subscriber only
    // This check happens synchronously, before second subscriber can run
    if (isFirstSubscriber && this.state.status === 'idle') {
      this.fetch(); // Immediately emits { status: 'loading' }
    }

    return this.state$.subscribe(observer);
  }
}
```

**How It Works:**

1. First subscriber: `isFirstSubscriber === true` → triggers fetch → `state$.next({ status: 'loading' })` **immediately**
2. Second subscriber (even microseconds later): `isFirstSubscriber === false` → **doesn't trigger fetch** → receives current 'loading' state from observable

## The Observable Guarantee: "Ask Once, Answer Many"

This is the core architectural principle:

- **One source of truth**: BehaviorSubject holds current state
- **Hot observable**: All subscribers see the same stream
- **Synchronous state updates**: `state$.next()` emits immediately to all subscribers
- **No timing windows**: Second subscriber can't see stale state because the observable value changes before it subscribes

## Why This Matters for Production

### Frontend: React Double-Mount

React 18+ StrictMode intentionally double-mounts components in development:

```tsx
// Component mounts → useEffect runs → subscribes to query
// Component unmounts (StrictMode)
// Component re-mounts → useEffect runs again → subscribes to query
```

**Without observables**: Both subscriptions check `status === 'idle'`, both trigger fetch
**With observables**: First subscription triggers fetch and sets 'loading', second subscription sees 'loading', doesn't trigger

### Backend: Stampeding Herd

On the server side, the same QueryClient is used for caching:

```typescript
// 10 simultaneous requests come in for the same user data
app.get('/api/users/:id', async (req, res) => {
  const data = await queryClient.getQuery({
    queryKey: ['user', req.params.id],
    queryFn: () => db.users.findById(req.params.id),
  });
  res.json(data);
});
```

**Without observables**: All 10 requests see 'idle', all trigger database query = **10 DB calls**
**With observables (single process)**: First request triggers DB query, other 9 wait on same observable = **1 DB call**

This collapses the stampeding herd **within one process** — `currentFetchPromise`
single-flights all concurrent callers that share the same `Query` instance.

### Measured limit: this does NOT hold across processes

The observable lives in one process's memory. Run the server as a cluster of
`N` workers (the normal production setup) and each worker has its own
`QueryClient`, its own `Query`, its own `currentFetchPromise`. On a **cold**
key, all `N` workers miss the shared L2 cache simultaneously — the L2 write is
fire-and-forget and hasn't landed yet — and all `N` call the source.

A shared cache is not a shared lock. The measured fan-out (see
`packages/core/src/__tests__/server-stampede.test.ts`):

| Scenario | Fan-out |
| --- | --- |
| 1 process, 50 concurrent (cold) | **1** ✅ |
| 4 processes, concurrent burst (cold) | **4** ❌ (one DB call per worker) |
| 4 processes (warm L2) | **1** ✅ |

So per-process coalescing caps fan-out at the **number of workers**, not at 1.
Driving it to 1 across processes requires distributed single-flight (a Redis
lease/lock), tracked in issue #28. Until then, the honest claim is: *concurrent
requests within a worker collapse to one source call; a cold burst across `N`
workers costs up to `N`.*

## Trade-off

Full RxJS is ~10KB gzipped (rxjs@7.8.1), and right now I'm using a small
slice of it — a `BehaviorSubject` plus subscriber tracking. That cost is
accepted deliberately: the operator ecosystem (`switchMap`, `debounceTime`)
is on the roadmap for typeahead and polling, and RxJS is battle-tested in
both Node and the browser.

## Migration Notes

### Breaking Changes

**Query/Mutation subscribe() signature changed:**

```typescript
// OLD
query.subscribe((state) => {
  console.log('New state:', state);
});

// NEW
query.subscribe({
  next: (state) => {
    console.log('New state:', state);
  },
  error: (err) => console.error(err),
});
```

### React Hooks

No breaking changes - `useQuery`, `useMutation`, `useFragment` all have the same API.
The observable subscription happens internally.

### Custom Hooks

If you were using `useSubscription` helper:

```typescript
// Still works! useSubscription is still exported
import { useSubscription, createSubscriptionConfig } from '@ts-query/react';

const state = useSubscription(createSubscriptionConfig(query));
```

But you can also subscribe directly to the observable:

```typescript
import { useEffect, useState } from 'react';

function useCustomQuery() {
  const [state, setState] = useState(query.state);

  useEffect(() => {
    const unsubscribe = query.subscribe({
      next: setState,
    });
    return unsubscribe;
  }, [query]);

  return state;
}
```

## Testing the Fix

Run the playground:

```bash
./RUN_PLAYGROUND.sh
# Or:
cd playground/normalized-cache-test && npm run dev
```

**Test 2.1: Double Mount (Request Deduplication)**

1. Open browser DevTools Network tab
2. Click "Run Double Mount Test"
3. **Expected**: Only 1 GET request for `/users/1`
4. **Result**: ✅ SUCCESS - observables deduplicate correctly

**Before RxJS**: Test showed 2-3 requests (race condition)
**After RxJS**: Test shows 1 request (correct)

## Conclusion

**Observables aren't optional for this architecture - they're fundamental.**

The "ask once, answer many" guarantee requires:

- Hot observable streams
- Synchronous state updates
- Proper subscriber management

Callbacks alone can't provide this without introducing race conditions.

---

**TL;DR**: RxJS fixes a critical race condition in query deduplication by ensuring state changes happen synchronously in the observable stream. This collapses duplicate requests on the frontend and stampeding herd **within a single server process**. It does **not** prevent stampede across a multi-process cluster on a cold key — that needs distributed single-flight (#28), and the fan-out is measured in `packages/core/src/__tests__/server-stampede.test.ts`. The 10KB cost is worth it for the in-process correctness it does buy.
