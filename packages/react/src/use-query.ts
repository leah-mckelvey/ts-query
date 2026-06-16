import { useEffect, useState, useRef } from 'react';
import type { QueryOptions, QueryState } from '@ts-query/core';
import { useQueryClient } from './context';

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

  const [state, setState] = useState<QueryState<TData, TError>>(query.state);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to query observable
    // The Query class handles auto-fetching on first subscriber
    const unsubscribe = query.subscribe({
      next: (newState) => {
        if (isMountedRef.current) {
          setState(newState);
        }
      },
      error: (err) => {
        console.error('Query observable error:', err);
      },
    });

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [query, options.enabled]);

  return state;
}
