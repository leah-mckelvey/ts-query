# Normalized Cache Testing Checklist

Use this checklist to verify all critical behaviors before deploying to production.

## 🎯 Critical Path: Normalized Cache

### ✓ Multi-Query Update (Server Authority)

- [ ] Mount 3+ queries that all contain the same entity (e.g., User #1)
- [ ] Run a mutation that updates that entity
- [ ] **Verify:** All queries update instantly
- [ ] **Verify:** Request log shows ZERO additional GET requests
- [ ] **Verify:** Fragment (useFragment) also updates instantly
- [ ] **Verify:** Data is identical across all queries

**Why This Matters:** This is the core value of normalized cache. If mutations don't update all queries instantly, users see stale data and the cache loses server authority.

---

## 🏁 Race Conditions (Production Killers)

### ✓ Request Deduplication (Double Mount)

- [ ] Mount same query twice in quick succession
- [ ] **Verify:** Only 1 network request fires
- [ ] **Verify:** Both components get same data
- [ ] **Verify:** No duplicate requests in Request Log

**Why This Matters:** Fast navigation or component remounting can trigger duplicate requests, wasting bandwidth and causing state inconsistencies.

---

### ✓ Mutation During Fetch

- [ ] Start a query fetch
- [ ] Fire mutation before fetch completes
- [ ] **Verify:** No errors or crashes
- [ ] **Verify:** Mutation data is visible in final state
- [ ] **Verify:** Query doesn't clobber mutation data

**Why This Matters:** In production, mutations and fetches overlap constantly. If mutation data gets clobbered, optimistic updates break.

---

### ✓ Rapid Invalidation

- [ ] Invalidate same query 3+ times rapidly
- [ ] **Verify:** Requests are deduplicated (≤ 2 total)
- [ ] **Verify:** No request storms
- [ ] **Verify:** Final data is correct

**Why This Matters:** User interactions (typing, clicking) can trigger rapid invalidations. Without deduplication, you DOS your own API.

---

## 🗑️ Eviction & Garbage Collection

### ✓ Eviction Cascade

- [ ] Mount multiple queries referencing same entity
- [ ] Call `client.evict('Type', id)`
- [ ] **Verify:** All fragments return `undefined` immediately
- [ ] **Verify:** All queries are invalidated
- [ ] **Verify:** Next access triggers refetch

**Why This Matters:** Eviction is how you clear stale data. If it doesn't cascade properly, fragments and queries show inconsistent state.

---

## 🔄 Fragment Reactivity

### ✓ Fragment Synchronization

- [ ] Mount `useFragment('User', 1)` and `useQuery(['user', 1])`
- [ ] Mutation updates User #1
- [ ] **Verify:** Both fragment and query update together
- [ ] **Verify:** They show identical data
- [ ] **Verify:** No timing mismatches

**Why This Matters:** Fragments are read-only views into the cache. If they don't stay in sync with queries, you have a consistency bug.

---

## 🎮 Interactive Controls

### ✓ Network Delay Slider

- [ ] Test with 0ms delay (instant)
- [ ] Test with 500ms delay (default)
- [ ] Test with 2000ms delay (slow motion)
- [ ] **Verify:** All behaviors still correct at all speeds

**Why This Matters:** Production networks are unpredictable. Your code must handle both fast and slow connections gracefully.

---

## 📊 Request Log Validation

For each test, check the Request Log:

- [ ] Count matches expected requests
- [ ] No unexpected duplicate requests
- [ ] Timing makes sense (mutations don't block queries)
- [ ] Can clear log and re-run test for clean slate

---

## 🚨 Failure Scenarios

Test what happens when things go wrong:

### Network Errors

- [ ] TODO: Add "simulate network failure" button
- [ ] Verify mutation failures don't corrupt cache
- [ ] Verify retry logic works

### Optimistic Updates

- [ ] TODO: Add optimistic update test
- [ ] Verify optimistic data shows immediately
- [ ] Verify rollback on error

---

## Sign-Off

Before pushing to production:

- [ ] All ✓ items above are verified
- [ ] No console errors or warnings
- [ ] Request log shows expected behavior
- [ ] Tested on slow network (2000ms+ delay)
- [ ] Tested rapid user interactions

**Tested by:** **\*\*\*\***\_**\*\*\*\***
**Date:** **\*\*\*\***\_**\*\*\*\***
**Notes:** **\*\*\*\***\_**\*\*\*\***
