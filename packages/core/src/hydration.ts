import type { QueryClient } from './query-client';
import type { QueryKey } from './types';

/**
 * Serialised snapshot of a single query's data. Mirrors the TanStack
 * dehydrated-query shape so existing tooling and patterns transfer.
 */
export interface DehydratedQuery {
  queryKey: QueryKey;
  state: {
    data: unknown;
    dataUpdatedAt: number;
  };
}

export interface DehydratedState {
  queries: DehydratedQuery[];
}

/**
 * Walk the client's cache and produce a JSON-safe snapshot of every
 * successfully-fetched query. By default we skip queries that errored,
 * are still loading, or have no data yet — there's nothing useful to
 * ship to the client for those.
 *
 * Pass `shouldDehydrateQuery` to override per-query (e.g. include only
 * queries with a particular key prefix, or include errored queries to
 * surface their messages on the client).
 */
export function dehydrate(
  client: QueryClient,
  options: {
    shouldDehydrateQuery?: (q: {
      queryKey: QueryKey;
      state: unknown;
    }) => boolean;
  } = {},
): DehydratedState {
  // Reach into the private map. dehydrate() is fundamentally a serialisation
  // concern for the cache it lives next to; exposing the queries Map publicly
  // would be a bigger API leak than this single cast.
  const queries = (
    client as unknown as {
      queries: Map<
        string,
        {
          state: { status: string; data: unknown };
          // Each Query stores its options.queryKey; recover it through state below.
        }
      >;
    }
  ).queries;

  const dehydrated: DehydratedQuery[] = [];

  queries.forEach((query, key) => {
    const state = query.state as {
      status: string;
      data: unknown;
    };
    // Recover the original queryKey: the map key is a JSON-stringified form,
    // but the original may have been a plain string. Try parsing; on failure
    // fall back to the string form.
    let queryKey: QueryKey;
    try {
      queryKey = JSON.parse(key) as QueryKey;
    } catch {
      queryKey = key;
    }

    const candidate = { queryKey, state };
    const include = options.shouldDehydrateQuery
      ? options.shouldDehydrateQuery(candidate)
      : state.status === 'success' && state.data !== undefined;
    if (!include) return;

    dehydrated.push({
      queryKey,
      state: {
        data: state.data,
        dataUpdatedAt: Date.now(),
      },
    });
  });

  return { queries: dehydrated };
}

/**
 * Restore a previously-dehydrated snapshot into the given client. Each query
 * is primed via setQueryData, so subsequent useQuery / getQuery calls with a
 * real queryFn will see the hydrated data immediately and (depending on
 * staleTime) skip the initial fetch.
 *
 * Existing queries are not overwritten if they already have fresher data —
 * the typical SSR -> CSR handoff pattern, where the client may have already
 * started its own fetch by the time hydrate runs.
 */
export function hydrate(client: QueryClient, state: DehydratedState): void {
  if (!state || !Array.isArray(state.queries)) return;
  for (const dehydrated of state.queries) {
    const existing = client.getQueryData(dehydrated.queryKey);
    if (existing !== undefined) {
      // Client already populated this key (e.g. from a parallel fetch).
      // Don't clobber it.
      continue;
    }
    client.setQueryData(dehydrated.queryKey, dehydrated.state.data);
  }
}
