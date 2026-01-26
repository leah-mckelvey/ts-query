import type { StorageAdapter } from '../types';

/**
 * Creates a localStorage adapter for web environments
 * Falls back to in-memory storage if localStorage is not available (SSR)
 */
export function createLocalStorageAdapter(): StorageAdapter {
  // Check if we're in a browser environment with localStorage
  const hasLocalStorage =
    typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

  if (!hasLocalStorage) {
    // In-memory fallback for SSR or environments without localStorage
    const memoryStorage = new Map<string, string>();

    return {
      getItem: (key: string): string | null => {
        return memoryStorage.get(key) ?? null;
      },
      setItem: (key: string, value: string): void => {
        memoryStorage.set(key, value);
      },
      removeItem: (key: string): void => {
        memoryStorage.delete(key);
      },
    };
  }

  return {
    getItem: (key: string): string | null => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Handle quota exceeded or security errors
        console.warn(`[persist] Failed to read from localStorage: ${key}`);
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Handle quota exceeded or security errors
        console.warn(`[persist] Failed to write to localStorage: ${key}`);
      }
    },
    removeItem: (key: string): void => {
      try {
        window.localStorage.removeItem(key);
      } catch {
        console.warn(`[persist] Failed to remove from localStorage: ${key}`);
      }
    },
  };
}

/**
 * Default localStorage adapter instance
 */
export const localStorageAdapter = createLocalStorageAdapter();
