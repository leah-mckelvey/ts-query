# What We Changed (In Plain English)

## The Problem: Copy-Pasted Safety Code

Imagine you have three different light switches in your house, and each one has the same safety mechanism to prevent electrical fires. Someone wrote out the instructions for that safety mechanism three separate times—one taped to each switch.

**What was duplicated:** The code that safely connects React components to changing data. This code does two important things:

1. It watches for changes and updates what you see on screen
2. It prevents crashes by refusing to update the screen if the component has already been removed

**Why duplication was risky:** If someone improved the safety mechanism on one switch (say, added a better fire detector), the other two switches would still have the old version. In our case, two of the hooks (`useQuery` and `useMutation`) had the safety check, but the third one (`useFragment`) was missing it entirely. This meant `useFragment` could try to update a component that no longer existed, potentially causing crashes.

**What we did:** We wrote the safety mechanism once in a new file called `useSubscription`, and then made all three switches use that same set of instructions. Now if we improve the safety mechanism, all three switches get the improvement automatically. And we fixed the missing safety check in `useFragment` in the process.

## Impact

- **Before:** 127 total lines across three files, with the same ~15 lines of safety code repeated three times (with one incomplete)
- **After:** 114 total lines, with the safety code written once and reused three times
- **Reliability:** Fixed a potential crash bug in `useFragment` that could happen if a user navigated away quickly
- **Maintenance:** Future improvements to how we handle data updates only need to be made in one place instead of three
