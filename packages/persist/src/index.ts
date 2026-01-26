// Main persist function
export { createPersistStore } from './persist';

// Storage adapters
export {
  createLocalStorageAdapter,
  localStorageAdapter,
} from './storage/localStorage';
export {
  createAsyncStorageAdapter,
  type AsyncStorageStatic,
} from './storage/asyncStorage';

// Types
export type {
  StorageAdapter,
  PersistOptions,
  PersistedState,
  PersistStore,
} from './types';
