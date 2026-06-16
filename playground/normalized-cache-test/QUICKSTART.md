# Quick Start Guide

## Running the Playground

From the **root of the ts-query repo**:

```bash
# Start the dev server
cd playground/normalized-cache-test
npm run dev
```

Then open http://localhost:5173 in your browser.

## What to Test

### Tab 1: Multi-Query Update (THE MONEY SHOT)

This is the core feature that makes the normalized cache valuable.

**Steps:**

1. Click "Mount All Queries"
2. You'll see 3 different queries + 1 fragment, all showing User #1 data
3. Enter a new name in the mutation panel (e.g., "Jane Doe")
4. Click "Update User #1"
5. **Watch the Request Log** - it should show only the mutation request
6. **All 4 components should update instantly** with the new name

**Success Criteria:**

- ✅ Mutation completes
- ✅ All 3 queries + fragment show the new name
- ✅ **Zero additional GET requests** after mutation (check the Request Log)

**What This Proves:**
The normalized cache is working. One mutation updates all queries that reference that entity, without refetching.

---

### Tab 2: Race Conditions

**Test 2.1: Double Mount**

- Simulates fast navigation (mounting same query twice before fetch completes)
- Should only make **1 network request**
- Both components get the same data

**Test 2.2: Mutation During Fetch**

- Query starts fetching
- Mutation fires before fetch completes
- Mutation data should win (be visible in final state)

**Test 2.3: Rapid Invalidation**

- Invalidate query 3 times in quick succession
- Should deduplicate requests (≤ 2 requests total)

---

### Tab 3: Eviction Cascade

**Steps:**

1. Click "Mount All"
2. Wait for all queries to load
3. Click "Evict User #1" (red button)
4. **All fragments should immediately show "undefined"**
5. **All queries should be invalidated**

**What This Proves:**
Eviction properly cascades through the cache, removing the entity from all queries and fragments.

---

## Debugging Tips

### Network Delay Slider

- Default: 500ms
- Increase to 1000-2000ms to see race conditions in "slow motion"
- Useful for verifying timing-dependent behavior

### Request Log

- Shows all mock API calls
- Look for duplicate requests (indicates deduplication failure)
- After mutation in Tab 1, should see ZERO GET requests

### Browser Console

- Open DevTools console for additional debugging
- Shows React strict mode double-mounting behavior
- Shows any errors or warnings

---

## Expected Behavior Summary

| Test                  | Expected Requests | Expected Behavior                               |
| --------------------- | ----------------- | ----------------------------------------------- |
| Multi-Query Update    | 3 GET + 1 PATCH   | All queries update with zero additional GETs    |
| Double Mount          | 1 GET             | Request deduplication works                     |
| Mutation During Fetch | 1 GET + 1 PATCH   | Mutation data visible after both complete       |
| Rapid Invalidation    | ≤ 2 GETs          | Requests deduplicated/cancelled                 |
| Eviction              | 3 GET (initial)   | Fragments return undefined, queries invalidated |

---

## Common Issues

**"Module not found" errors:**

```bash
# Build packages first
cd ../..
npm run build
cd playground/normalized-cache-test
npm run dev
```

**Port 5173 already in use:**

```bash
# Kill existing Vite server or use different port
npm run dev -- --port 5174
```

**Stale data showing:**

- Click "Clear" on Request Log
- Refresh the browser
- Unmount/remount components
