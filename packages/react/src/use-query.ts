import { useEffect, useMemo } from 'react';
import type { QueryOptions, QueryState } from '@ts-query/core';
import { useQueryClient } from './context';
import { createSubscriptionConfig, useSubscription } from './use-subscription';

// ########################################
// PUBLIC HOOK
// ########################################

/**
 * React hook for subscribing to a query.
 *
 * Uses RxJS observables under the hood for proper request deduplication:
 * - First subscriber triggers fetch (if idle and enabled)
 * - Subsequent subscribers receive the same observable stream
 * - Prevents stampeding herd / duplicate requests
 */
export function useQuery<TData = unknown, TError = Error>(
  options: QueryOptions<TData, TError>,
): QueryState<TData, TError> {
  const client = useQueryClient();
  const query = client.getQuery(options);
  const enabled = options.enabled !== false;

  // Shared subscription/mounted-guard logic (also used by useMutation/useFragment).
  const state = useSubscription(
    useMemo(() => createSubscriptionConfig(query), [query]),
  );

  // The Query instance is shared by queryKey and keeps the options it was first
  // created with, so its own first-subscriber auto-fetch can't see a later
  // `enabled` flip. When `enabled` transitions false -> true (or the query is
  // otherwise still idle), trigger the fetch explicitly. Query.fetch()
  // deduplicates in-flight requests, so this never causes a double fetch.
  useEffect(() => {
    if (enabled && query.state.status === 'idle') {
      query.fetch().catch(() => {
        // Error already handled by Query class / surfaced via state.
      });
    }
  }, [query, enabled]);

  // Handle refetchOnMount
  // This effect runs when the query instance changes (e.g., queryKey change)
  // or when enabled flips from false to true
  useEffect(() => {
    const refetchOnMount = options.refetchOnMount ?? 'stale-only';

    if (!enabled) return;

    // Always refetch when this query becomes active
    if (refetchOnMount === true) {
      query.fetch().catch(() => {
        // Error already handled by Query class / surfaced via state.
      });
    }
    // Refetch only if stale (default behavior)
    else if (refetchOnMount === 'stale-only' && query.state.isStale) {
      query.fetch().catch(() => {
        // Error already handled by Query class / surfaced via state.
      });
    }
    // false: never refetch on mount
  }, [query, enabled, options.refetchOnMount]);

  return state;
}
