import type { Store } from '@ts-query/core';

/**
 * Storage adapter interface - works with both sync (localStorage) and async (AsyncStorage) storage
 */
export interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

/**
 * Options for the persist middleware
 */
export interface PersistOptions<TState> {
  /** Unique key for storage */
  name: string;

  /** Storage adapter to use (localStorage, AsyncStorage, etc.) */
  storage: StorageAdapter;

  /**
   * Optional function to select which parts of state to persist
   * @default (state) => state
   */
  partialize?: (state: TState) => Partial<TState>;

  /**
   * Optional function to merge persisted state with initial state
   * @default (persisted, current) => ({ ...current, ...persisted })
   */
  merge?: (persistedState: Partial<TState>, currentState: TState) => TState;

  /**
   * Version number for migrations
   * @default 0
   */
  version?: number;

  /**
   * Migration function to handle version changes
   */
  migrate?: (
    persistedState: unknown,
    version: number,
  ) => Partial<TState> | Promise<Partial<TState>>;

  /**
   * Called when hydration is complete
   */
  onRehydrateStorage?: (
    state: TState | undefined,
    error?: Error,
  ) => void | ((state?: TState, error?: Error) => void);

  /**
   * Skip hydration on initialization (useful for SSR)
   * @default false
   */
  skipHydration?: boolean;
}

/**
 * Persisted state wrapper with version info
 */
export interface PersistedState<TState> {
  state: Partial<TState>;
  version: number;
}

/**
 * Extended store with persist-specific methods
 */
export interface PersistStore<TState> extends Store<TState> {
  /** Manually trigger persistence */
  persist: () => Promise<void>;

  /** Manually trigger rehydration from storage */
  rehydrate: () => Promise<void>;

  /** Clear persisted state from storage */
  clearStorage: () => Promise<void>;

  /** Check if store has been hydrated */
  hasHydrated: () => boolean;
}
