import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLocalStorageAdapter } from '../storage/localStorage';
import { createAsyncStorageAdapter } from '../storage/asyncStorage';
import type { AsyncStorageStatic } from '../storage/asyncStorage';

describe('createLocalStorageAdapter', () => {
  const originalWindow = global.window;
  const originalLocalStorage = global.localStorage;

  afterEach(() => {
    // Restore original values
    if (originalWindow) {
      global.window = originalWindow;
    }
    if (originalLocalStorage) {
      global.localStorage = originalLocalStorage;
    }
  });

  describe('with localStorage available', () => {
    let mockLocalStorage: Storage;

    beforeEach(() => {
      const store = new Map<string, string>();
      mockLocalStorage = {
        getItem: vi.fn((key: string) => store.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          store.set(key, value);
        }),
        removeItem: vi.fn((key: string) => {
          store.delete(key);
        }),
        clear: vi.fn(() => store.clear()),
        key: vi.fn(() => null),
        length: 0,
      };

      Object.defineProperty(global, 'window', {
        value: { localStorage: mockLocalStorage },
        writable: true,
      });
      Object.defineProperty(global, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });
    });

    it('should get item from localStorage', () => {
      mockLocalStorage.setItem('test-key', 'test-value');
      const adapter = createLocalStorageAdapter();

      const result = adapter.getItem('test-key');

      expect(result).toBe('test-value');
    });

    it('should set item in localStorage', () => {
      const adapter = createLocalStorageAdapter();

      adapter.setItem('test-key', 'test-value');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        'test-value',
      );
    });

    it('should remove item from localStorage', () => {
      const adapter = createLocalStorageAdapter();

      adapter.removeItem('test-key');

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('test-key');
    });

    it('should return null for non-existent keys', () => {
      const adapter = createLocalStorageAdapter();

      const result = adapter.getItem('non-existent');

      expect(result).toBeNull();
    });
  });
});

describe('createAsyncStorageAdapter', () => {
  let mockAsyncStorage: AsyncStorageStatic;
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map<string, string>();
    mockAsyncStorage = {
      getItem: vi.fn(async (key: string) => store.get(key) ?? null),
      setItem: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      removeItem: vi.fn(async (key: string) => {
        store.delete(key);
      }),
    };
  });

  it('should get item from AsyncStorage', async () => {
    store.set('test-key', 'test-value');
    const adapter = createAsyncStorageAdapter(mockAsyncStorage);

    const result = await adapter.getItem('test-key');

    expect(result).toBe('test-value');
  });

  it('should set item in AsyncStorage', async () => {
    const adapter = createAsyncStorageAdapter(mockAsyncStorage);

    await adapter.setItem('test-key', 'test-value');

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      'test-key',
      'test-value',
    );
    expect(store.get('test-key')).toBe('test-value');
  });

  it('should remove item from AsyncStorage', async () => {
    store.set('test-key', 'test-value');
    const adapter = createAsyncStorageAdapter(mockAsyncStorage);

    await adapter.removeItem('test-key');

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
    expect(store.has('test-key')).toBe(false);
  });

  it('should return null for non-existent keys', async () => {
    const adapter = createAsyncStorageAdapter(mockAsyncStorage);

    const result = await adapter.getItem('non-existent');

    expect(result).toBeNull();
  });

  it('should handle errors gracefully', async () => {
    const errorStorage: AsyncStorageStatic = {
      getItem: vi.fn().mockRejectedValue(new Error('Storage error')),
      setItem: vi.fn().mockRejectedValue(new Error('Storage error')),
      removeItem: vi.fn().mockRejectedValue(new Error('Storage error')),
    };

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const adapter = createAsyncStorageAdapter(errorStorage);

    const result = await adapter.getItem('test-key');
    expect(result).toBeNull();

    await adapter.setItem('test-key', 'value');
    await adapter.removeItem('test-key');

    expect(consoleSpy).toHaveBeenCalledTimes(3);
    consoleSpy.mockRestore();
  });
});
