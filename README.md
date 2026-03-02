# ts-query

A from-scratch query client and state management library in pure TypeScript.
Framework-agnostic core with adapters for React, Mithril, and React Native.
Used isomorphically — the same `QueryClient` manages L1/L2/L3 tiered caching
on an Express backend and drives UI state on the frontend.

## What's in Here

This is a monorepo containing **7 packages** and **5 example apps** that
dogfood every package:

```
packages/
├── core/            # QueryClient, Query, Mutation, createStore (zero deps)
├── react/           # React adapter — useQuery, useMutation, useStore hooks
├── mithril/         # Mithril adapter — lifecycle-safe components
├── ui-react/        # Design-token-driven React component library
├── ui-mithril/      # Design-token-driven Mithril component library
├── ui-native/       # React Native component library
└── persist/         # Persistence layer (WIP)

examples/
├── react-demo/          # React app — data fetching + mutations + store
├── react-native-demo/   # React Native app — full incremental game client
├── mithril-demo/        # Mithril app — queries, mutations, store
├── mithril-dashboard/   # Production-style Mithril dashboard with MSW mocks
└── game-server/         # Express API using QueryClient for server-side
                         # L1/L2/L3 tiered caching (same core as frontend)
```

### Key Design Decisions

- **The core has zero framework dependencies.** All caching, retry,
  invalidation, subscription, and state management logic is pure TypeScript.
  Adding a new framework adapter is ~50 lines of glue code.
- **`createStore` is a Zustand-equivalent** built into the core. Same
  `set`/`get`/`subscribe` API, same selector + equality patterns — works with
  any adapter.
- **The `QueryClient` works on the server too.** The game server uses it as a
  tiered cache (in-process L1 → shared L2 → database L3) with the same API
  the frontend uses for data fetching. One abstraction, both sides of the
  stack.
- **UI component libraries use design tokens directly**, not theme context.
  Same component API across React, Mithril, and React Native.

## Installation

### For React

```bash
npm install @ts-query/core @ts-query/react
```

### For Mithril

```bash
npm install @ts-query/core @ts-query/mithril
```

## Quick Start

### React

```tsx
import { QueryClient } from '@ts-query/core';
import { QueryClientProvider, useQuery } from '@ts-query/react';

// Create a client
const queryClient = new QueryClient();

// Wrap your app
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Users />
    </QueryClientProvider>
  );
}

// Use in components
function Users() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await fetch('/api/users');
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Mithril

```typescript
import m from 'mithril';
import { QueryClient } from '@ts-query/core';
import { setQueryClient, createQueryComponent } from '@ts-query/mithril';

// Create and set the client
const queryClient = new QueryClient();
setQueryClient(queryClient);

const UsersQuery = createQueryComponent({
  queryKey: ['users'],
  queryFn: async () => {
    const res = await fetch('/api/users');
    return res.json();
  },
});

// Use in components
const Users: m.Component = {
  view: () =>
    m(UsersQuery, {
      children: ({ data, isLoading, isError, error }) => {
        if (isLoading) return m('div', 'Loading...');
        if (isError) return m('div', `Error: ${error.message}`);

        return m(
          'ul',
          data.map((user) => m('li', { key: user.id }, user.name)),
        );
      },
    }),
};
```

## API Reference

### QueryClient

The core client that manages queries and mutations.

```typescript
const queryClient = new QueryClient();

// Invalidate queries to refetch
queryClient.invalidateQueries(['users']);

// Remove queries from cache
queryClient.removeQueries(['users']);

// Clear all queries
queryClient.clear();
```

### useQuery

Fetch and cache data with automatic state management.

```typescript
const query = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
  staleTime: 5000, // Time before data is considered stale (ms)
  cacheTime: 300000, // Time before unused data is garbage collected (ms)
  retry: 3, // Number of retry attempts on failure
  retryDelay: 1000, // Delay between retries (ms)
  enabled: true, // Whether query should run automatically
  onSuccess: (data) => {}, // Callback on successful fetch
  onError: (error) => {}, // Callback on error
});

// Query state
query.status; // 'idle' | 'loading' | 'success' | 'error'
query.data; // The fetched data
query.error; // Error object if failed
query.isLoading; // Boolean loading state
query.isSuccess; // Boolean success state
query.isError; // Boolean error state
query.isFetching; // Boolean fetching state
```

### useMutation

Handle mutations (POST, PUT, DELETE operations).

```typescript
const mutation = useMutation({
  mutationFn: (data) => createUser(data),
  onSuccess: (data, variables) => {
    // Invalidate and refetch
    queryClient.invalidateQueries(['users']);
  },
  onError: (error, variables) => {},
  onSettled: (data, error, variables) => {},
});

// Trigger mutation
await mutation.mutate({ name: 'John' });

// Mutation state
mutation.state.status; // 'idle' | 'loading' | 'success' | 'error'
mutation.state.data; // The mutation result
mutation.state.error; // Error object if failed
mutation.state.isLoading; // Boolean loading state
mutation.state.isSuccess; // Boolean success state
mutation.state.isError; // Boolean error state

// Reset mutation state
mutation.reset();
```

## Running the Examples

### React Demo

```bash
cd examples/react-demo
npm install
npm run dev
```

Visit http://localhost:5173

### Mithril Demo

```bash
cd examples/mithril-demo
npm install
npm run dev
```

Visit http://localhost:5174

## Development

### Build all packages

```bash
npm install
npm run build
```

### Watch mode for development

```bash
npm run dev
```

## Why Build This?

At my last role we ran Mithril — a fast, minimal framework with a
chronically undersupported ecosystem. Every time we needed async state
management or a component library, the options were either nonexistent or
tightly coupled to React. I kept writing one-off solutions and realized the
actual fix was an architecture where the framework doesn't matter.

That's what ts-query is. The core owns all the hard problems — caching,
retries, invalidation, subscriptions, state management — in pure TypeScript
with zero deps. Adding a new framework means writing a thin adapter, not
forking a library. The same pattern extends to the server: plug in a
`SharedCacheAdapter` and the `QueryClient` becomes a tiered cache for any
backend. Your frontend stack literally doesn't matter. I will have it
running with production-grade infrastructure inside a day.

## Roadmap

- **Cancellation support** — `AbortSignal` propagation from the core to `queryFn`
- **Window-focus & network-reconnect refetching**
- **Polling intervals**
- **Infinite & paginated queries**
- **Optimistic updates & rollback**
- **Devtools**
- **SSR prefetch & hydration**

## License

MIT
