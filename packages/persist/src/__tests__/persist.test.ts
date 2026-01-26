import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPersistStore } from '../persist';
import type { StorageAdapter } from '../types';

interface CounterState {
  count: number;
  increment: () => void;
}

// Create a mock storage adapter for testing
function createMockStorage(): StorageAdapter & {
  data: Map<string, string>;
  getItemCalls: string[];
  setItemCalls: Array<{ key: string; value: string }>;
} {
  const data = new Map<string, string>();
  const getItemCalls: string[] = [];
  const setItemCalls: Array<{ key: string; value: string }> = [];

  return {
    data,
    getItemCalls,
    setItemCalls,
    getItem: vi.fn((key: string) => {
      getItemCalls.push(key);
      return data.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      setItemCalls.push({ key, value });
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}

describe('createPersistStore', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  it('should create a store with initial state', () => {
    const store = createPersistStore<CounterState>(
      (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'test-store', storage: mockStorage },
    );

    expect(store.getState().count).toBe(0);
  });

  it('should persist state on setState', async () => {
    const store = createPersistStore<CounterState>(
      (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'test-store', storage: mockStorage },
    );

    // Wait for hydration to complete before making changes
    // (persistence is skipped during hydration to prevent data loss)
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(store.hasHydrated()).toBe(true);

    store.getState().increment();

    // Wait for async persistence
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(mockStorage.setItem).toHaveBeenCalled();
    const stored = mockStorage.data.get('test-store');
    expect(stored).toBeDefined();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.count).toBe(1);
  });

  it('should rehydrate state from storage', async () => {
    // Pre-populate storage
    mockStorage.data.set(
      'test-store',
      JSON.stringify({ state: { count: 42 }, version: 0 }),
    );

    const store = createPersistStore<CounterState>(
      (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'test-store', storage: mockStorage },
    );

    // Wait for hydration
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(store.getState().count).toBe(42);
    expect(store.hasHydrated()).toBe(true);
  });

  it('should skip hydration when skipHydration is true', async () => {
    mockStorage.data.set(
      'test-store',
      JSON.stringify({ state: { count: 42 }, version: 0 }),
    );

    const store = createPersistStore<CounterState>(
      (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'test-store', storage: mockStorage, skipHydration: true },
    );

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(store.getState().count).toBe(0);
    expect(store.hasHydrated()).toBe(false);
  });

  it('should manually rehydrate when called', async () => {
    mockStorage.data.set(
      'test-store',
      JSON.stringify({ state: { count: 99 }, version: 0 }),
    );

    const store = createPersistStore<CounterState>(
      (set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'test-store', storage: mockStorage, skipHydration: true },
    );

    expect(store.getState().count).toBe(0);

    await store.rehydrate();

    expect(store.getState().count).toBe(99);
    expect(store.hasHydrated()).toBe(true);
  });

  it('should clear storage when clearStorage is called', async () => {
    const store = createPersistStore<CounterState>(
      (set) => ({
        count: 5,
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      { name: 'test-store', storage: mockStorage },
    );

    await store.persist();
    expect(mockStorage.data.has('test-store')).toBe(true);

    await store.clearStorage();
    expect(mockStorage.data.has('test-store')).toBe(false);
  });
});
