import { describe, it, expect, vi } from 'vitest';
import { InfiniteQuery } from '../infinite-query';

interface Page {
  items: number[];
  next: number | null;
  prev: number | null;
}

function fakeApi(pageMap: Record<number, Page>) {
  return vi.fn(async ({ pageParam }: { pageParam: number }) => {
    const page = pageMap[pageParam];
    if (!page) throw new Error(`No page for cursor ${pageParam}`);
    return page;
  });
}

describe('InfiniteQuery', () => {
  it('fetches the initial page using initialPageParam', async () => {
    const queryFn = fakeApi({
      0: { items: [1, 2], next: 1, prev: null },
    });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
    });
    const data = await q.fetch();
    expect(data.pages).toEqual([{ items: [1, 2], next: 1, prev: null }]);
    expect(data.pageParams).toEqual([0]);
    expect(q.state.hasNextPage).toBe(true);
    expect(q.state.hasPreviousPage).toBe(false);
  });

  it('fetchNextPage appends a page using getNextPageParam', async () => {
    const queryFn = fakeApi({
      0: { items: [1], next: 1, prev: null },
      1: { items: [2], next: 2, prev: 0 },
      2: { items: [3], next: null, prev: 1 },
    });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
    });
    await q.fetch();
    await q.fetchNextPage();
    expect(q.state.data!.pages.map((p) => p.items[0])).toEqual([1, 2]);
    expect(q.state.data!.pageParams).toEqual([0, 1]);

    await q.fetchNextPage();
    expect(q.state.data!.pageParams).toEqual([0, 1, 2]);
    expect(q.state.hasNextPage).toBe(false);
  });

  it('fetchNextPage is a noop when hasNextPage is false', async () => {
    const queryFn = fakeApi({
      0: { items: [1], next: null, prev: null },
    });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
    });
    await q.fetch();
    expect(q.state.hasNextPage).toBe(false);
    await q.fetchNextPage();
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('fetchPreviousPage prepends and uses getPreviousPageParam', async () => {
    const queryFn = fakeApi({
      0: { items: [10], next: 1, prev: -1 },
      [-1]: { items: [9], next: 0, prev: null },
    });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
      getPreviousPageParam: (first) => first.prev ?? undefined,
    });
    await q.fetch();
    expect(q.state.hasPreviousPage).toBe(true);
    await q.fetchPreviousPage();
    expect(q.state.data!.pages.map((p) => p.items[0])).toEqual([9, 10]);
    expect(q.state.data!.pageParams).toEqual([-1, 0]);
  });

  it('honors maxPages by sliding the window forward', async () => {
    const queryFn = fakeApi({
      0: { items: [1], next: 1, prev: null },
      1: { items: [2], next: 2, prev: 0 },
      2: { items: [3], next: 3, prev: 1 },
      3: { items: [4], next: null, prev: 2 },
    });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
      maxPages: 2,
    });
    await q.fetch();
    await q.fetchNextPage();
    await q.fetchNextPage();
    expect(q.state.data!.pageParams).toEqual([1, 2]);
    await q.fetchNextPage();
    expect(q.state.data!.pageParams).toEqual([2, 3]);
  });

  it('isFetchingNextPage flips during a forward fetch', async () => {
    let resolveSecond!: (page: Page) => void;
    const queryFn = vi.fn(({ pageParam }: { pageParam: number }) => {
      if (pageParam === 0)
        return Promise.resolve<Page>({ items: [1], next: 1, prev: null });
      return new Promise<Page>((res) => {
        resolveSecond = res;
      });
    });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
    });
    await q.fetch();

    const p = q.fetchNextPage();
    expect(q.state.isFetchingNextPage).toBe(true);
    expect(q.state.isFetchingPreviousPage).toBe(false);

    resolveSecond({ items: [2], next: null, prev: 0 });
    await p;
    expect(q.state.isFetchingNextPage).toBe(false);
  });

  it('surfaces queryFn errors and stays fetchable afterwards', async () => {
    const error = new Error('boom');
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({
        items: [1],
        next: null,
        prev: null,
      });
    const q = new InfiniteQuery<Page, number>({
      queryKey: ['list'],
      queryFn,
      initialPageParam: 0,
      getNextPageParam: (last) => last.next ?? undefined,
    });
    await expect(q.fetch()).rejects.toThrow(error);
    expect(q.state.status).toBe('error');

    const data = await q.fetch();
    expect(data.pages).toHaveLength(1);
    expect(q.state.status).toBe('success');
  });
});
