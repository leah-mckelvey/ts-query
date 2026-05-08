import { useEffect, useState, useRef, useCallback } from 'react';
import type {
  InfiniteQueryOptions,
  InfiniteQueryState,
  InfiniteData,
} from '@ts-query/core';
import { useQueryClient } from './context';

export interface UseInfiniteQueryResult<
  TPageData = unknown,
  TPageParam = unknown,
  TError = Error,
> extends InfiniteQueryState<TPageData, TPageParam, TError> {
  fetchNextPage: () => Promise<InfiniteData<TPageData, TPageParam>>;
  fetchPreviousPage: () => Promise<InfiniteData<TPageData, TPageParam>>;
}

export function useInfiniteQuery<
  TPageData = unknown,
  TPageParam = unknown,
  TError = Error,
>(
  options: InfiniteQueryOptions<TPageData, TPageParam, TError>,
): UseInfiniteQueryResult<TPageData, TPageParam, TError> {
  const client = useQueryClient();
  const query = client.getInfiniteQuery(options);

  const [state, setState] = useState<
    InfiniteQueryState<TPageData, TPageParam, TError>
  >(query.state);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    const unsubscribe = query.subscribe((s) => {
      if (isMountedRef.current) setState(s);
    });

    if (options.enabled !== false && query.state.status === 'idle') {
      query.fetch().catch(() => {});
    }

    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [query, options.enabled]);

  const fetchNextPage = useCallback(() => query.fetchNextPage(), [query]);
  const fetchPreviousPage = useCallback(
    () => query.fetchPreviousPage(),
    [query],
  );

  return { ...state, fetchNextPage, fetchPreviousPage };
}
