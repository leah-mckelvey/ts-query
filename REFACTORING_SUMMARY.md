# What We Changed (In Plain English)

## The Problem: Copy-Pasted Safety Code

Imagine you have three different light switches in your house, and each one has the same safety mechanism to prevent electrical fires. Someone wrote out the instructions for that safety mechanism three separate times—one taped to each switch.

**What was duplicated:** The code that safely connects React components to changing data. This code does two important things:

1. It watches for changes and updates what you see on screen
2. It prevents crashes by refusing to update the screen if the component has already been removed

**Why duplication was risky:** If someone improved the safety mechanism on one switch (say, added a better fire detector), the other two switches would still have the old version. In our case, two of the hooks (`useQuery` and `useMutation`) had the safety check, but the third one (`useFragment`) was missing it entirely. This meant `useFragment` could try to update a component that no longer existed, potentially causing crashes.

**What we did:** We introduced a new `useSubscription` helper in `packages/react/src/use-subscription.ts` that encapsulates the subscription/unsubscription pattern, and we routed **all three** hooks (`useQuery`, `useMutation`, and `useFragment`) through it. There is now exactly one copy of the "watch for changes and don't update an unmounted component" logic, and every hook—including `useFragment`, which previously had no such guard—inherits it. The light switches now share a single safety mechanism.

While wiring this up we also fixed a separate correctness bug in `useQuery`: because a query instance is shared by `queryKey` and remembers the options it was first created with, toggling `enabled` from `false` to `true` never triggered a fetch. `useQuery` now explicitly kicks off the fetch when `enabled` becomes true and the query is still idle (and `Query.fetch()` deduplicates, so this can't cause a double request).

## Impact

- **Before:** `useFragment` was missing the mounted-guard, and the same subscription boilerplate was copy-pasted across all three hooks
- **After:** All three hooks share a single `useSubscription` implementation, so the mounted-guard exists in exactly one place
- **Bug fix:** `useQuery` now fetches when `enabled` flips `false` → `true` (previously stuck in `idle`)
- **Reliability:** Eliminated the duplicated stale-update guard and the `useFragment` crash path it left open
