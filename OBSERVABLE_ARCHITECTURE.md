# Observable Architecture: Why RxJS is Critical

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
**With observables**: First request triggers DB query, other 9 wait on same observable = **1 DB call**

This is the stampeding herd problem - observables solve it at the architectural level.

## Bundle Size Trade-off

- **RxJS cost**: ~10KB gzipped (rxjs@7.8.1)
- **What you get**:
  - Bulletproof request deduplication
  - Battle-tested observable semantics
  - Hot/cold observable patterns
  - Full operator ecosystem (if needed later)
  - Proper backpressure handling

The alternative is reimplementing these patterns yourself, which:

1. Adds complexity
2. May have subtle bugs (like the race condition we just fixed)
3. Still costs bundle size (just in your own code)

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

## Architectural Decision: Why Not a Lighter Alternative?

You might ask: "Do we need full RxJS? Could we use a simpler BehaviorSubject implementation?"

**Answer**: RxJS is the right choice because:

1. **Battle-tested**: Millions of production apps use it
2. **Future-proof**: Already has operators if you need advanced patterns later (e.g., `debounceTime`, `switchMap` for typeahead queries)
3. **Standard**: Developers know RxJS, reduces onboarding friction
4. **Server-side**: Works in Node.js for backend caching (no DOM dependencies)
5. **Only 10KB**: Smaller than many state management libraries

The alternative (custom observable implementation) would:

- Still cost bundle size (~5-7KB for a good implementation)
- Risk subtle bugs (like the one we just fixed)
- Require ongoing maintenance
- Lack advanced operators if needed

## Conclusion

**Observables aren't optional for this architecture - they're fundamental.**

The "ask once, answer many" guarantee requires:

- Hot observable streams
- Synchronous state updates
- Proper subscriber management

Callbacks alone can't provide this without introducing race conditions.

Your original instinct to build this with observables was correct. The temporary detour into callback-based state was an architectural regression that broke request deduplication.

---

**TL;DR**: RxJS fixes a critical race condition in query deduplication by ensuring state changes happen synchronously in the observable stream. This prevents stampeding herd on the backend and duplicate requests on the frontend. The 10KB cost is worth it for production-grade correctness.
