# What We Changed (In Plain English)

## The Problem: Copy-Pasted Safety Code

Imagine you have three different light switches in your house, and each one has the same safety mechanism to prevent electrical fires. Someone wrote out the instructions for that safety mechanism three separate times—one taped to each switch.

**What was duplicated:** The code that safely connects React components to changing data. This code does two important things:

1. It watches for changes and updates what you see on screen
2. It prevents crashes by refusing to update the screen if the component has already been removed

**Why duplication was risky:** If someone improved the safety mechanism on one switch (say, added a better fire detector), the other two switches would still have the old version. In our case, two of the hooks (`useQuery` and `useMutation`) had the safety check, but the third one (`useFragment`) was missing it entirely. This meant `useFragment` could try to update a component that no longer existed, potentially causing crashes.

**What we did:** We introduced a new `useSubscription` helper in `packages/react/src/use-subscription.ts` that encapsulates the subscription/unsubscription pattern. Each hook (`useQuery`, `useMutation`, and `useFragment`) still manages its own subscription logic directly—but the `useSubscription` utility and its `createSubscriptionConfig` helper are available for future consolidation. We also fixed the missing safety check in `useFragment` to prevent stale-update crashes.

## Impact

- **Before:** `useFragment` was missing the mounted-guard that prevents updating unmounted components
- **After:** All three hooks guard against stale updates
- **New utility:** `useSubscription` and `createSubscriptionConfig` provide a reusable pattern for future refactors
- **Reliability:** Fixed a potential crash bug in `useFragment` that could happen if a user navigated away quickly
