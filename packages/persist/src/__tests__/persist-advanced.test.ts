import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPersistStore } from '../persist';
import type { StorageAdapter } from '../types';

interface UserState {
  name: string;
  email: string;
  token: string; // Should not be persisted
  setUser: (name: string, email: string) => void;
}

function createMockStorage(): StorageAdapter & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: vi.fn((key: string) => data.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      data.delete(key);
    }),
  };
}

describe('createPersistStore - advanced features', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('partialize', () => {
    it('should only persist selected state', async () => {
      const store = createPersistStore<UserState>(
        (set) => ({
          name: 'John',
          email: 'john@example.com',
          token: 'secret-token',
          setUser: (name, email) => set({ name, email }),
        }),
        {
          name: 'user-store',
          storage: mockStorage,
          partialize: (state) => ({ name: state.name, email: state.email }),
        },
      );

      await store.persist();

      const stored = JSON.parse(mockStorage.data.get('user-store')!);
      expect(stored.state.name).toBe('John');
      expect(stored.state.email).toBe('john@example.com');
      expect(stored.state.token).toBeUndefined();
    });
  });

  describe('merge', () => {
    it('should use custom merge function', async () => {
      mockStorage.data.set(
        'user-store',
        JSON.stringify({ state: { name: 'Jane' }, version: 0 }),
      );

      const store = createPersistStore<UserState>(
        (set) => ({
          name: 'Default',
          email: 'default@example.com',
          token: 'new-token',
          setUser: (name, email) => set({ name, email }),
        }),
        {
          name: 'user-store',
          storage: mockStorage,
          merge: (persisted, current) => ({
            ...current,
            ...persisted,
            // Always use current token
            token: current.token,
          }),
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.getState().name).toBe('Jane');
      expect(store.getState().email).toBe('default@example.com');
      expect(store.getState().token).toBe('new-token');
    });
  });

  describe('migrations', () => {
    it('should migrate state when version changes', async () => {
      // Old version in storage
      mockStorage.data.set(
        'user-store',
        JSON.stringify({
          state: { fullName: 'John Doe', email: 'john@example.com' },
          version: 0,
        }),
      );

      interface OldState {
        fullName?: string;
        name?: string;
        email: string;
      }

      const store = createPersistStore<UserState>(
        (set) => ({
          name: '',
          email: '',
          token: '',
          setUser: (name, email) => set({ name, email }),
        }),
        {
          name: 'user-store',
          storage: mockStorage,
          version: 1,
          migrate: (persisted, version) => {
            const old = persisted as OldState;
            if (version === 0) {
              return {
                name: old.fullName ?? old.name ?? '',
                email: old.email,
              };
            }
            return persisted as Partial<UserState>;
          },
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(store.getState().name).toBe('John Doe');
      expect(store.getState().email).toBe('john@example.com');
    });
  });

  describe('onRehydrateStorage', () => {
    it('should call callback after rehydration', async () => {
      mockStorage.data.set(
        'user-store',
        JSON.stringify({ state: { name: 'Jane' }, version: 0 }),
      );

      const onRehydrate = vi.fn();

      createPersistStore<UserState>(
        (set) => ({
          name: '',
          email: '',
          token: '',
          setUser: (name, email) => set({ name, email }),
        }),
        {
          name: 'user-store',
          storage: mockStorage,
          onRehydrateStorage: () => onRehydrate,
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onRehydrate).toHaveBeenCalledTimes(1);
      expect(onRehydrate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Jane' }),
      );
    });
  });
});
