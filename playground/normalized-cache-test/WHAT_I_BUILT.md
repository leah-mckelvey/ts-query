# What I Built: Normalized Cache Test Playground

## Overview

A comprehensive interactive testing playground for validating the normalized GraphQL cache implementation, focusing on production-critical behaviors and edge cases.

## File Structure

```
playground/normalized-cache-test/
├── src/
│   ├── main.tsx                    # Entry point with QueryClient setup
│   ├── App.tsx                     # Main app with tabs and controls
│   ├── mockApi.ts                  # Mock API with controllable delays
│   ├── RequestLog.tsx              # Network request log component
│   ├── styles.css                  # UI styling
│   └── scenarios/
│       ├── MultiQueryUpdate.tsx    # Tab 1: The money shot
│       ├── RaceConditions.tsx      # Tab 2: Production edge cases
│       └── EvictionCascade.tsx     # Tab 3: Cache eviction behavior
├── QUICKSTART.md                   # How to run and what to test
├── TESTING_CHECKLIST.md            # Pre-production verification checklist
├── README.md                       # Technical documentation
└── package.json                    # Dependencies and scripts

Root:
└── RUN_PLAYGROUND.sh               # One-command launcher script
```

## Test Scenarios Implemented

### 1. Multi-Query Update (The Money Shot)

**What it tests:**

- Multiple queries (single user, user list, team) all containing User #1
- Mutation updates User #1 via `writeFragment`
- All queries + fragment update instantly without refetch

**Why it matters:**
This is THE feature that makes normalized cache valuable. Proves that mutations have server authority and update all dependent queries automatically.

**How to verify:**

1. Mount all queries
2. Run mutation with new name
3. Check Request Log: should show ZERO GET requests after mutation
4. All 4 components (3 queries + 1 fragment) show new data instantly

---

### 2. Race Conditions

**2.1: Double Mount (Request Deduplication)**

- Same query mounted twice before first fetch completes
- Only 1 network request should fire
- Both components get same data

**2.2: Mutation During Fetch**

- Query starts fetching
- Mutation fires before fetch completes
- Mutation data should be visible in final state (no clobber)

**2.3: Rapid Invalidation**

- Invalidate same query 3 times rapidly
- Requests should be deduplicated (≤ 2 total)
- Prevents request storms

**Why it matters:**
These are production killers. Fast navigation, overlapping operations, and user spam break apps that don't handle concurrency properly.

---

### 3. Eviction Cascade

**What it tests:**

- Multiple queries and fragments referencing User #1
- Call `client.evict('User', 1)`
- Fragments return `undefined` immediately
- Queries are invalidated

**Why it matters:**
Eviction is how you clear stale data. If it doesn't cascade properly, you get inconsistent state across the app.

---

## Interactive Features

### Global Controls

- **Network Delay Slider:** 0-3000ms
  - Use 1000-2000ms for "slow motion" race condition visualization
  - Tests behavior under variable network conditions

### Request Log

- Real-time tracking of all mock API calls
- Shows endpoint, timestamp, and duration
- Auto-refresh mode
- Clear button for fresh test runs
- **Critical for verifying deduplication and zero-refetch behavior**

### Tab Navigation

- Clean separation of test scenarios
- Each tab can be tested independently
- Allows focused testing of specific behaviors

---

## Mock API Features

Implemented in `mockApi.ts`:

- **Controllable network delay** (via slider)
- **Request logging** with timestamps
- **In-memory database** (users, teams, posts)
- **Simulated failures** (for future optimistic update tests)
- **TypeScript types** matching real GraphQL schema

All entities have `__typename` field for normalized cache compatibility.

---

## Success Criteria (What to Look For)

### Multi-Query Update ✅

- Request Log shows: 3 initial GETs + 1 PATCH + **0 GETs after mutation**
- All queries update with new data
- Fragment updates in sync

### Double Mount ✅

- Request Log shows: **1 GET only** (not 2)
- Both components receive data

### Mutation During Fetch ✅

- No errors or crashes
- Mutation data wins (visible in final state)

### Rapid Invalidation ✅

- Request Log shows: ≤ 2 GETs total (not 3+)

### Eviction ✅

- Fragment returns `undefined`
- Queries show "No data" or refetch

---

## How to Run

**Easiest way:**

```bash
./RUN_PLAYGROUND.sh
```

**Manual way:**

```bash
# From repo root
npm run build
cd playground/normalized-cache-test
npm run dev
```

Then open http://localhost:5173

---

## What This Proves

If all tests pass, you've verified:

1. ✅ **Normalized cache works** - mutations update all dependent queries
2. ✅ **Request deduplication works** - no duplicate fetches for same query
3. ✅ **Concurrency is safe** - overlapping operations don't corrupt state
4. ✅ **Eviction cascades** - cache invalidation is consistent
5. ✅ **Production-ready** - handles edge cases that break real apps

---

## Next Steps / Future Enhancements

Could add:

- [ ] Optimistic update + rollback test
- [ ] Network failure simulation
- [ ] Retry logic visualization
- [ ] Cache size monitoring
- [ ] Query dependency graph visualization
- [ ] Performance metrics (render counts, cache hits/misses)

---

## Usage Tips

1. **Start with Tab 1** (Multi-Query Update) - this is the core feature
2. **Use the Request Log religiously** - it's your source of truth
3. **Increase network delay** to see race conditions clearly
4. **Clear the log** between test runs for clean results
5. **Open browser DevTools** for additional debugging

---

## Known Limitations

- Mock API is in-memory only (resets on refresh)
- No actual GraphQL server (using mock data)
- Optimistic updates not yet tested (TODO)
- No persistence between page reloads

These are intentional - the focus is on testing **ts-query behavior**, not building a full backend.
