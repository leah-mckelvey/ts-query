import { describe, it, expect } from 'vitest';
import { LRUCache } from '../lru-cache';

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should set and get values', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('should return undefined for missing keys', () => {
      const cache = new LRUCache<string, number>(3);
      expect(cache.get('nonexistent')).toBeUndefined();
    });

    it('should update existing values', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('a', 10);

      expect(cache.get('a')).toBe(10);
      expect(cache.size).toBe(1);
    });

    it('should track size correctly', () => {
      const cache = new LRUCache<string, number>(5);
      expect(cache.size).toBe(0);

      cache.set('a', 1);
      expect(cache.size).toBe(1);

      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.size).toBe(3);

      cache.delete('b');
      expect(cache.size).toBe(2);
    });

    it('should check if keys exist', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);

      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.delete('a')).toBe(true);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.has('a')).toBe(false);
      expect(cache.size).toBe(1);

      expect(cache.delete('nonexistent')).toBe(false);
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      cache.clear();

      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBeUndefined();
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used entry when at capacity', () => {
      const cache = new LRUCache<string, number>(3);

      // Fill cache
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Add new entry - should evict 'a' (least recently used)
      cache.set('d', 4);

      expect(cache.size).toBe(3);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on get', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it recently used
      cache.get('a');

      // Add new entry - should evict 'b' (now least recently used)
      cache.set('d', 4);

      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should update LRU order on set (update)', () => {
      const cache = new LRUCache<string, number>(3);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Update 'a' to make it recently used
      cache.set('a', 10);

      // Add new entry - should evict 'b' (now least recently used)
      cache.set('d', 4);

      expect(cache.get('a')).toBe(10);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should handle eviction with single entry', () => {
      const cache = new LRUCache<string, number>(1);

      cache.set('a', 1);
      cache.set('b', 2);

      expect(cache.size).toBe(1);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
    });

    it('should handle multiple evictions in sequence', () => {
      const cache = new LRUCache<string, number>(2);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3); // evicts 'a'
      cache.set('d', 4); // evicts 'b'

      expect(cache.size).toBe(2);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });
  });

  describe('eviction predicate', () => {
    it('should skip non-evictable entries and find an evictable one', () => {
      // Only evict even numbers
      const canEvict = (_key: string, value: number) => value % 2 === 0;
      const cache = new LRUCache<string, number>(3, canEvict);

      cache.set('a', 1); // odd - not evictable
      cache.set('b', 2); // even - evictable
      cache.set('c', 3); // odd - not evictable

      // Add new entry - should evict 'b' (the only evictable entry) and stay at maxSize
      cache.set('d', 4);

      expect(cache.size).toBe(3); // Evicted 'b', so we stay at maxSize
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBeUndefined(); // Evicted
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should allow overflow when no entries are evictable', () => {
      // Never evict
      const canEvict = () => false;
      const cache = new LRUCache<string, number>(2, canEvict);

      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // All entries protected - should allow overflow
      expect(cache.size).toBe(3);
      expect(cache.get('a')).toBe(1);
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
    });

    it('should walk backwards to find evictable entry', () => {
      // Only evict entries with value > 5
      const canEvict = (_key: string, value: number) => value > 5;
      const cache = new LRUCache<string, number>(4, canEvict);

      cache.set('a', 10); // evictable
      cache.set('b', 2); // not evictable
      cache.set('c', 3); // not evictable
      cache.set('d', 4); // not evictable

      // Add new entry - should evict 'a' (the only evictable entry)
      cache.set('e', 5);

      expect(cache.size).toBe(4);
      expect(cache.get('a')).toBeUndefined(); // Evicted
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
      expect(cache.get('e')).toBe(5);
    });
  });

  describe('iteration', () => {
    it('should iterate over entries in LRU order', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const entries = Array.from(cache.entries());
      expect(entries).toEqual([
        ['c', 3], // most recently used
        ['b', 2],
        ['a', 1], // least recently used
      ]);
    });

    it('should iterate over keys in LRU order', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const keys = Array.from(cache.keys());
      expect(keys).toEqual(['c', 'b', 'a']);
    });

    it('should iterate over values in LRU order', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      const values = Array.from(cache.values());
      expect(values).toEqual([3, 2, 1]);
    });

    it('should update iteration order when accessing entries', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);

      // Access 'a' to make it most recently used
      cache.get('a');

      const keys = Array.from(cache.keys());
      expect(keys).toEqual(['a', 'c', 'b']);
    });
  });

  describe('edge cases', () => {
    it('should handle maxSize of 0', () => {
      const cache = new LRUCache<string, number>(0);
      cache.set('a', 1);

      // Should not store anything
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should handle large maxSize', () => {
      const cache = new LRUCache<string, number>(10000);

      for (let i = 0; i < 1000; i++) {
        cache.set(`key${i}`, i);
      }

      expect(cache.size).toBe(1000);

      for (let i = 0; i < 1000; i++) {
        expect(cache.get(`key${i}`)).toBe(i);
      }
    });

    it('should handle non-string keys', () => {
      const cache = new LRUCache<number, string>(3);
      cache.set(1, 'one');
      cache.set(2, 'two');
      cache.set(3, 'three');

      expect(cache.get(1)).toBe('one');
      expect(cache.get(2)).toBe('two');
      expect(cache.get(3)).toBe('three');
    });

    it('should handle object values', () => {
      const cache = new LRUCache<string, { value: number }>(3);
      const obj1 = { value: 1 };
      const obj2 = { value: 2 };

      cache.set('a', obj1);
      cache.set('b', obj2);

      expect(cache.get('a')).toBe(obj1);
      expect(cache.get('b')).toBe(obj2);
    });
  });
});
