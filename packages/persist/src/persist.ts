import type { SetState, GetState } from '@ts-query/core';
import { createStore } from '@ts-query/core';
import type { PersistOptions, PersistedState, PersistStore } from './types';

/**
 * Creates a persisted store with automatic hydration and persistence
 *
 * @example
 * ```ts
 * import { createPersistStore } from '@ts-query/persist';
 * import { createAsyncStorageAdapter } from '@ts-query/persist/storage/asyncStorage';
 * import AsyncStorage from '@react-native-async-storage/async-storage';
 *
 * const store = createPersistStore(
 *   (set) => ({
 *     count: 0,
 *     increment: () => set((s) => ({ count: s.count + 1 })),
 *   }),
 *   {
 *     name: 'counter-storage',
 *     storage: createAsyncStorageAdapter(AsyncStorage),
 *   }
 * );
 * ```
 */
export function createPersistStore<TState>(
  initializer: (set: SetState<TState>, get: GetState<TState>) => TState,
  options: PersistOptions<TState>,
): PersistStore<TState> {
  const {
    name,
    storage,
    partialize = (state) => state,
    merge = (persisted, current) => ({ ...current, ...persisted }),
    version = 0,
    migrate,
    onRehydrateStorage,
    skipHydration = false,
  } = options;

  let hasHydrated = false;
  let isHydrating = false;
  let writePromise: Promise<void> = Promise.resolve();

  // Serialize state for storage
  const serialize = (state: TState): string => {
    const persistedState: PersistedState<TState> = {
      state: partialize(state),
      version,
    };
    return JSON.stringify(persistedState);
  };

  // Deserialize state from storage
  const deserialize = (str: string): PersistedState<TState> | null => {
    try {
      return JSON.parse(str) as PersistedState<TState>;
    } catch {
      return null;
    }
  };

  // Clear persisted state
  const clearStorage = async (): Promise<void> => {
    await storage.removeItem(name);
  };

  // Persist current state to storage (hoisted function for circular reference)
  // Uses a write queue to ensure writes complete in order
  // Catches errors inside the queue so one bad write doesn't break persistence permanently
  async function persistState(): Promise<void> {
    // Chain writes to ensure ordering - each write waits for the previous
    writePromise = writePromise
      .then(async () => {
        const state = baseStore.getState();
        const serialized = serialize(state);
        await storage.setItem(name, serialized);
      })
      .catch((error) => {
        // Log error but don't let it break the queue
        console.warn('[persist] Failed to persist state:', error);
      });
    await writePromise;
  }

  // Rehydrate state from storage (hoisted function for circular reference)
  async function rehydrate(): Promise<void> {
    // Mark hydration as in progress to prevent persistence during rehydration
    isHydrating = true;

    // Pass current state to onRehydrateStorage so users can observe pre-hydration state
    const onRehydrateCallback = onRehydrateStorage?.(baseStore.getState());

    try {
      const stored = await storage.getItem(name);

      if (stored === null) {
        hasHydrated = true;
        isHydrating = false;
        onRehydrateCallback?.(baseStore.getState());
        return;
      }

      const parsed = deserialize(stored);

      if (parsed === null) {
        hasHydrated = true;
        isHydrating = false;
        onRehydrateCallback?.(baseStore.getState());
        return;
      }

      let persistedState = parsed.state;

      // Handle migrations if version changed
      const didMigrate = parsed.version !== version && migrate;
      if (didMigrate) {
        persistedState = await migrate(parsed.state, parsed.version);
      }

      // Merge persisted state with current state
      const currentState = baseStore.getState();
      const mergedState = merge(persistedState, currentState);

      baseStore.setState(mergedState, true);
      hasHydrated = true;
      isHydrating = false;

      // If we migrated, persist the new state with the updated version
      if (didMigrate) {
        await persistState();
      }

      onRehydrateCallback?.(mergedState);
    } catch (error) {
      hasHydrated = true;
      isHydrating = false;
      onRehydrateCallback?.(undefined, error as Error);
    }
  }

  // Create the base store
  const baseStore = createStore<TState>((set, get) => {
    // Wrap setState to persist on every change
    const persistingSet: SetState<TState> = (partial, replace) => {
      set(partial, replace);
      // Persist after state update (fire and forget)
      // Skip automatic persistence while hydrating to prevent data loss
      // (we might overwrite stored state before it's read/merged)
      if (!isHydrating) {
        void persistState();
      }
    };

    return initializer(persistingSet, get);
  });

  // Start hydration unless skipped
  if (!skipHydration) {
    void rehydrate();
  }

  return {
    ...baseStore,
    persist: persistState,
    rehydrate,
    clearStorage,
    hasHydrated: () => hasHydrated,
  };
}
