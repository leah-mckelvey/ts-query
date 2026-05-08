import type {
  InfiniteData,
  InfiniteQueryOptions,
  InfiniteQueryState,
  Subscriber,
} from './types';
import { QueryCancelledError } from './query';

/**
 * Cursor-paginated query: holds an ordered list of pages plus the cursor
 * (pageParam) that was used to fetch each. Mirrors TanStack's shape so
 * existing render patterns (data.pages.flatMap(...) etc.) transfer 1:1.
 *
 * Kept as a separate class from Query rather than a subclass: their state
 * shapes differ enough that sharing inheritance produced more "as unknown"
 * casts than it saved. They both use the same focus/online/cancellation
 * managers though.
 */
export class InfiniteQuery<
  TPageData = unknown,
  TPageParam = unknown,
  TError = Error,
> {
  private subscribers = new Set<
    Subscriber<InfiniteQueryState<TPageData, TPageParam, TError>>
  >();
  private options: InfiniteQueryOptions<TPageData, TPageParam, TError>;
  private abortController: AbortController | null = null;
  private cacheTimeout: ReturnType<typeof setTimeout> | null = null;
  private staleTimeout: ReturnType<typeof setTimeout> | null = null;
  private onGarbageCollection?: () => void;

  state: InfiniteQueryState<TPageData, TPageParam, TError> = {
    status: 'idle',
    data: undefined,
    error: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isFetching: false,
    isFetchingNextPage: false,
    isFetchingPreviousPage: false,
    hasNextPage: false,
    hasPreviousPage: false,
    isStale: false,
  };

  constructor(
    options: InfiniteQueryOptions<TPageData, TPageParam, TError>,
    onGarbageCollection?: () => void,
  ) {
    this.options = options;
    this.onGarbageCollection = onGarbageCollection;
  }

  subscribe(
    subscriber: Subscriber<InfiniteQueryState<TPageData, TPageParam, TError>>,
  ): () => void {
    this.subscribers.add(subscriber);
    if (this.cacheTimeout) {
      clearTimeout(this.cacheTimeout);
      this.cacheTimeout = null;
    }
    return () => {
      this.subscribers.delete(subscriber);
      if (this.subscribers.size === 0) {
        this.scheduleGarbageCollection();
      }
    };
  }

  private notify(): void {
    this.subscribers.forEach((s) => s(this.state));
  }

  private updateState(
    partial: Partial<InfiniteQueryState<TPageData, TPageParam, TError>>,
  ): void {
    const newStatus = partial.status ?? this.state.status;
    this.state = {
      ...this.state,
      ...partial,
      status: newStatus,
      isLoading: newStatus === 'loading' && !this.state.data,
      isSuccess: newStatus === 'success',
      isError: newStatus === 'error',
    };
    this.notify();
  }

  /**
   * Initial fetch — loads the first page using `initialPageParam`. Subsequent
   * calls re-run from scratch; use fetchNextPage/fetchPreviousPage to extend.
   */
  async fetch(): Promise<InfiniteData<TPageData, TPageParam>> {
    this.cancel();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.updateState({ status: 'loading', isFetching: true });

    try {
      const page = await this.options.queryFn({
        queryKey: this.options.queryKey,
        signal,
        pageParam: this.options.initialPageParam,
        direction: 'forward',
      });
      if (signal.aborted) throw new QueryCancelledError();

      const data: InfiniteData<TPageData, TPageParam> = {
        pages: [page],
        pageParams: [this.options.initialPageParam],
      };
      this.commit(data);
      return data;
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        throw error;
      }
      this.updateState({
        status: 'error',
        error: error as TError,
        isFetching: false,
      });
      throw error;
    }
  }

  async fetchNextPage(): Promise<InfiniteData<TPageData, TPageParam>> {
    if (!this.state.data) {
      // No pages yet: a fetchNextPage before any subscriber fetches is the
      // same as the initial fetch.
      return this.fetch();
    }
    if (!this.state.hasNextPage) {
      return this.state.data;
    }
    return this.fetchPage('forward');
  }

  async fetchPreviousPage(): Promise<InfiniteData<TPageData, TPageParam>> {
    if (!this.state.data) return this.fetch();
    if (!this.state.hasPreviousPage) return this.state.data;
    return this.fetchPage('backward');
  }

  private async fetchPage(
    direction: 'forward' | 'backward',
  ): Promise<InfiniteData<TPageData, TPageParam>> {
    const data = this.state.data!;
    const pageParam =
      direction === 'forward'
        ? this.options.getNextPageParam(
            data.pages[data.pages.length - 1],
            data.pages,
            data.pageParams[data.pageParams.length - 1],
            data.pageParams,
          )
        : this.options.getPreviousPageParam?.(
            data.pages[0],
            data.pages,
            data.pageParams[0],
            data.pageParams,
          );

    if (pageParam == null) {
      // No more pages in this direction; surface the current data unchanged.
      return data;
    }

    this.cancel();
    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.updateState({
      isFetching: true,
      isFetchingNextPage: direction === 'forward',
      isFetchingPreviousPage: direction === 'backward',
    });

    try {
      const page = await this.options.queryFn({
        queryKey: this.options.queryKey,
        signal,
        pageParam: pageParam as TPageParam,
        direction,
      });
      if (signal.aborted) throw new QueryCancelledError();

      let pages =
        direction === 'forward' ? [...data.pages, page] : [page, ...data.pages];
      let pageParams =
        direction === 'forward'
          ? [...data.pageParams, pageParam as TPageParam]
          : [pageParam as TPageParam, ...data.pageParams];

      // Honor maxPages by dropping from the opposite end so the user keeps
      // a sliding window of the most recently-fetched pages in their
      // direction of travel.
      if (this.options.maxPages && pages.length > this.options.maxPages) {
        if (direction === 'forward') {
          pages = pages.slice(pages.length - this.options.maxPages);
          pageParams = pageParams.slice(
            pageParams.length - this.options.maxPages,
          );
        } else {
          pages = pages.slice(0, this.options.maxPages);
          pageParams = pageParams.slice(0, this.options.maxPages);
        }
      }

      const next: InfiniteData<TPageData, TPageParam> = { pages, pageParams };
      this.commit(next);
      return next;
    } catch (error) {
      if (
        signal.aborted ||
        (error instanceof Error && error.name === 'AbortError')
      ) {
        throw error;
      }
      this.updateState({
        status: 'error',
        error: error as TError,
        isFetching: false,
        isFetchingNextPage: false,
        isFetchingPreviousPage: false,
      });
      throw error;
    }
  }

  private commit(data: InfiniteData<TPageData, TPageParam>): void {
    const lastIdx = data.pages.length - 1;
    const hasNextPage =
      this.options.getNextPageParam(
        data.pages[lastIdx],
        data.pages,
        data.pageParams[lastIdx],
        data.pageParams,
      ) != null;
    const hasPreviousPage =
      this.options.getPreviousPageParam != null &&
      this.options.getPreviousPageParam(
        data.pages[0],
        data.pages,
        data.pageParams[0],
        data.pageParams,
      ) != null;

    this.updateState({
      status: 'success',
      data,
      error: null,
      isFetching: false,
      isFetchingNextPage: false,
      isFetchingPreviousPage: false,
      hasNextPage,
      hasPreviousPage,
    });
    this.scheduleStale();
  }

  cancel(reason?: string): void {
    if (this.abortController) {
      this.abortController.abort(reason ?? 'InfiniteQuery cancelled');
      this.abortController = null;
    }
    if (this.state.isFetching) {
      this.updateState({
        isFetching: false,
        isFetchingNextPage: false,
        isFetchingPreviousPage: false,
      });
    }
  }

  invalidate(): void {
    this.cancel();
    this.fetch().catch(() => {});
  }

  private scheduleStale(): void {
    if (this.staleTimeout) clearTimeout(this.staleTimeout);
    const staleTime = this.options.staleTime ?? 0;
    this.updateState({ isStale: false });
    if (staleTime > 0) {
      this.staleTimeout = setTimeout(() => {
        this.updateState({ isStale: true });
      }, staleTime);
    } else {
      this.updateState({ isStale: true });
    }
  }

  private scheduleGarbageCollection(): void {
    if (this.cacheTimeout) clearTimeout(this.cacheTimeout);
    const cacheTime = this.options.cacheTime ?? 5 * 60 * 1000;
    this.cacheTimeout = setTimeout(() => {
      if (this.subscribers.size === 0) {
        this.onGarbageCollection?.();
        this.destroy();
      }
    }, cacheTime);
  }

  destroy(): void {
    this.cancel();
    if (this.staleTimeout) clearTimeout(this.staleTimeout);
    if (this.cacheTimeout) clearTimeout(this.cacheTimeout);
    this.subscribers.clear();
    this.onGarbageCollection = undefined;
  }
}
