import { useEffect, useState, useRef } from 'react';
import type { QueryOptions, QueryState } from '@ts-query/core';
import { useQueryClient } from './context';

export function useQuery<TData = unknown, TError = Error>(
  options: QueryOptions<TData, TError>,
): QueryState<TData, TError> {
  const client = useQueryClient();
  const query = client.getQuery(options);

  const [state, setState] = useState<QueryState<TData, TError>>(query.state);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    // Subscribe to query updates
    const unsubscribe = query.subscribe((newState) => {
      if (isMountedRef.current) {
        setState(newState);
      }
    });

    // Fetch if enabled and no data
    const enabled = options.enabled !== false;
    if (enabled && query.state.status === 'idle') {
      query.fetch().catch(() => {
        // Error already handled by Query class:
        // - State updated (status: 'error', error set)
        // - onError callback invoked
        // - Subscribers notified (component will re-render)
        // Catch here only prevents unhandled promise rejection warning
      });
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [query, options.enabled]);

  return state;
}
