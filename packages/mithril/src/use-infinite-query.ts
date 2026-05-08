import m from 'mithril';
import type {
  InfiniteData,
  InfiniteQuery,
  InfiniteQueryOptions,
  InfiniteQueryState,
} from '@ts-query/core';
import { getQueryClient } from './query-client-provider';

const cleanupMap = new WeakMap<
  InfiniteQuery<unknown, unknown, unknown>,
  () => void
>();

export interface InfiniteQueryRenderState<
  TPageData,
  TPageParam,
  TError,
> extends InfiniteQueryState<TPageData, TPageParam, TError> {
  fetchNextPage: () => Promise<InfiniteData<TPageData, TPageParam>>;
  fetchPreviousPage: () => Promise<InfiniteData<TPageData, TPageParam>>;
}

/**
 * Mithril component for cursor-paginated queries. Mirrors createQueryComponent
 * but exposes fetchNextPage / fetchPreviousPage to children.
 */
export function createInfiniteQueryComponent<
  TPageData = unknown,
  TPageParam = unknown,
  TError = Error,
>(
  options: InfiniteQueryOptions<TPageData, TPageParam, TError>,
): m.Component<{
  children: (
    state: InfiniteQueryRenderState<TPageData, TPageParam, TError>,
  ) => m.Children;
}> {
  let query: InfiniteQuery<TPageData, TPageParam, TError>;

  return {
    oninit() {
      const client = getQueryClient();
      query = client.getInfiniteQuery(options);

      const unsubscribe = query.subscribe(() => {
        m.redraw();
      });
      cleanupMap.set(
        query as unknown as InfiniteQuery<unknown, unknown, unknown>,
        unsubscribe,
      );

      if (options.enabled !== false && query.state.status === 'idle') {
        query.fetch().catch(() => {});
      }
    },

    onremove() {
      const unsubscribe = cleanupMap.get(
        query as unknown as InfiniteQuery<unknown, unknown, unknown>,
      );
      if (unsubscribe) {
        unsubscribe();
        cleanupMap.delete(
          query as unknown as InfiniteQuery<unknown, unknown, unknown>,
        );
      }
    },

    view(vnode) {
      return vnode.attrs.children({
        ...query.state,
        fetchNextPage: () => query.fetchNextPage(),
        fetchPreviousPage: () => query.fetchPreviousPage(),
      });
    },
  };
}
