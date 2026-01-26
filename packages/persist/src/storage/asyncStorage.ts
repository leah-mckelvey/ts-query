import type { StorageAdapter } from '../types';

/**
 * Type for AsyncStorage from @react-native-async-storage/async-storage
 * We define this interface to avoid requiring the dependency at compile time
 */
export interface AsyncStorageStatic {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Creates an AsyncStorage adapter for React Native environments
 *
 * @param asyncStorage - The AsyncStorage instance from @react-native-async-storage/async-storage
 *
 * @example
 * ```tsx
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 * import { createAsyncStorageAdapter, persist } from '@ts-query/persist';
 * import { createStore } from '@ts-query/core';
 *
 * const storage = createAsyncStorageAdapter(AsyncStorage);
 *
 * const store = createStore(
 *   persist(
 *     (set) => ({
 *       count: 0,
 *       increment: () => set((s) => ({ count: s.count + 1 })),
 *     }),
 *     { name: 'counter-storage', storage }
 *   )
 * );
 * ```
 */
export function createAsyncStorageAdapter(
  asyncStorage: AsyncStorageStatic,
): StorageAdapter {
  return {
    getItem: async (key: string): Promise<string | null> => {
      try {
        return await asyncStorage.getItem(key);
      } catch (error) {
        console.warn(
          `[persist] Failed to read from AsyncStorage: ${key}`,
          error,
        );
        return null;
      }
    },
    setItem: async (key: string, value: string): Promise<void> => {
      try {
        await asyncStorage.setItem(key, value);
      } catch (error) {
        console.warn(
          `[persist] Failed to write to AsyncStorage: ${key}`,
          error,
        );
      }
    },
    removeItem: async (key: string): Promise<void> => {
      try {
        await asyncStorage.removeItem(key);
      } catch (error) {
        console.warn(
          `[persist] Failed to remove from AsyncStorage: ${key}`,
          error,
        );
      }
    },
  };
}
