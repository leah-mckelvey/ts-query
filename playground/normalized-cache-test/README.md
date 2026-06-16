# Normalized Cache Test Playground

Interactive playground for testing the normalized GraphQL cache implementation.

## What This Tests

This playground is designed to verify production-critical behaviors:

1. **Multi-Query Updates (The Money Shot)**
   - Multiple queries containing the same entity
   - Mutation updates one entity
   - All queries update instantly without refetch
   - Zero network requests after mutation

2. **Race Conditions**
   - Double mount: Same query mounted twice before first fetch completes
   - Mutation during fetch: Mutation fires while query is in-flight
   - Rapid invalidation: Multiple invalidations in quick succession
   - Verifies request deduplication and proper state resolution

3. **Eviction Cascade**
   - Evict entity from cache
   - All fragments return undefined
   - All queries referencing entity are invalidated

## Running the Playground

```bash
# From the playground directory
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

## Usage Tips

- **Network Delay Slider**: Increase to 1000-2000ms to see race conditions in slow motion
- **Request Log**: Watch the network request log to verify deduplication
- **Console**: Open browser console for additional debugging info

## Success Criteria

### Multi-Query Update

- ✅ All queries update instantly after mutation
- ✅ Zero additional network requests
- ✅ Fragment updates in sync with queries

### Race Conditions

- ✅ Only 1 network request for concurrent mounts
- ✅ Mutation data wins when overlapping with fetch
- ✅ Rapid invalidations don't create request storms

### Eviction

- ✅ Fragments return undefined after eviction
- ✅ Queries refetch when accessed after eviction
