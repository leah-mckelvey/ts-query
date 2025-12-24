# ts-query

A framework-agnostic query client for managing async state, inspired by TanStack Query. Works seamlessly with React, Mithril, and potentially any other framework.

## Features

- 🎯 **Framework Agnostic Core** - Pure TypeScript core with zero dependencies
- ⚛️ **React Support** - First-class React hooks integration
- 🔷 **Mithril Support** - Native Mithril integration with automatic redraws
- 📦 **Smart Caching** - Automatic caching with configurable stale times
- 🔄 **Retries & Invalidation** - Configurable retry logic and explicit refetch via invalidation
- 🎨 **TypeScript First** - Full type safety and inference
- 🪶 **Lightweight** - Minimal bundle size with tree-shaking support

## Architecture

```
ts-query/
├── packages/
│   ├── core/           # Framework-agnostic query client
│   ├── react/          # React adapter (hooks)
│   └── mithril/        # Mithril adapter
└── examples/
    ├── react-demo/     # React demo app
    └── mithril-demo/   # Mithril demo app
```

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

## Why ts-query?

This project demonstrates how to build framework-agnostic infrastructure that can work across different UI libraries. The core principles:

1. **Separation of Concerns** - Business logic (core) is completely separate from framework integration (adapters)
2. **Observable Pattern** - Core uses a simple subscriber pattern that any framework can hook into
3. **Type Safety** - Full TypeScript support with proper type inference
4. **Best Practices** - Follows modern JavaScript/TypeScript patterns and conventions

This approach allows teams to:

- Share logic across different frameworks
- Migrate between frameworks without rewriting business logic
- Maintain consistency in data fetching patterns
- Reduce bundle size by sharing core logic

## Comparison with TanStack Query

ts-query is inspired by TanStack Query but simplified for educational purposes:

| Feature                        | ts-query       | TanStack Query                     |
| ------------------------------ | -------------- | ---------------------------------- |
| Framework Support              | React, Mithril | React, Vue, Solid, Svelte, Angular |
| Bundle Size                    | ~5KB           | ~15KB                              |
| Query Invalidation             | ✅             | ✅                                 |
| Automatic Refetching (retries) | ✅             | ✅                                 |
| Optimistic Updates             | ❌             | ✅                                 |
| Infinite Queries               | ❌             | ✅                                 |
| Devtools                       | ❌             | ✅                                 |
| SSR Support                    | ❌             | ✅                                 |

## Future Work

ts-query is intentionally small and focused today. The longer-term goal is to
grow towards practical parity with TanStack Query's major features while
keeping the core implementation understandable.

Some concrete areas that are currently not implemented but would be natural
extensions:

- **Cancellation support** – allow `queryFn` to accept an `AbortSignal` and
  propagate cancellation from the core.
- **Window-focus refetching** – add an optional flag to refetch active queries
  when the window regains focus.
- **Additional refetch triggers** – e.g. refetch on network reconnect or
  simple polling intervals.
- **Infinite & paginated queries** – helpers for cursor- and page-based lists.
- **Optimistic updates & rollback** – first-class patterns for local updates
  around mutations.
- **Devtools / debugging** – lightweight inspector for query cache state.
- **SSR hooks** – APIs for prefetching and hydrating queries in server-
  rendered apps.

## License

MIT

## Author

Built as a demonstration of cross-platform library architecture and modern frontend infrastructure patterns.
