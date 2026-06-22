// ########################################
// LRU CACHE UTILITY
// ########################################

/**
 * A simple LRU (Least Recently Used) cache with a maximum size bound.
 * When the cache reaches maxSize, the least recently used entry is evicted.
 *
 * This utility is used by both QueryClient (for query retention) and
 * InMemoryAdapter (for shared cache entries) to prevent unbounded memory growth.
 */

// ##############################
// Node Structure
// ##############################

/**
 * Doubly-linked list node for LRU tracking.
 */
class LRUNode<K> {
  constructor(
    public key: K,
    public prev: LRUNode<K> | null = null,
    public next: LRUNode<K> | null = null,
  ) {}
}

// ##############################
// Eviction Predicate
// ##############################

/**
 * Optional predicate to determine if an entry can be evicted.
 * Returns true if the entry is evictable, false to skip it.
 */
export type EvictionPredicate<K, V> = (key: K, value: V) => boolean;

/**
 * Optional callback called when an entry is evicted from the cache.
 */
export type EvictionCallback<K, V> = (key: K, value: V) => void;

// ##############################
// LRU Cache
// ##############################

export class LRUCache<K, V> {
  private map = new Map<K, { value: V; node: LRUNode<K> }>();
  private head: LRUNode<K> | null = null; // Most recently used
  private tail: LRUNode<K> | null = null; // Least recently used

  constructor(
    private maxSize: number,
    private canEvict?: EvictionPredicate<K, V>,
    private onEvict?: EvictionCallback<K, V>,
  ) {}

  /**
   * Get a value from the cache and mark it as recently used.
   */
  get(key: K): V | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;

    // Move to head (most recently used)
    this.moveToHead(entry.node);
    return entry.value;
  }

  /**
   * Set a value in the cache. If the cache is full, evict the LRU entry.
   * If a canEvict predicate is provided, only evict entries that pass the predicate.
   */
  set(key: K, value: V): void {
    const existing = this.map.get(key);

    if (existing) {
      // Update existing entry and move to head
      existing.value = value;
      this.moveToHead(existing.node);
      return;
    }

    // Edge case: maxSize of 0 means never store anything
    if (this.maxSize === 0) {
      return;
    }

    // New entry: check if we need to evict
    if (this.map.size >= this.maxSize) {
      this.evictLRU();
    }

    // Create new node and add to head
    const node = new LRUNode(key);
    this.map.set(key, { value, node });
    this.addToHead(node);
  }

  /**
   * Check if a key exists in the cache without updating access order.
   */
  has(key: K): boolean {
    return this.map.has(key);
  }

  /**
   * Delete a key from the cache.
   */
  delete(key: K): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;

    this.removeNode(entry.node);
    this.map.delete(key);
    return true;
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * Get the current size of the cache.
   */
  get size(): number {
    return this.map.size;
  }

  /**
   * Iterate over all entries in the cache (from most to least recently used).
   */
  *entries(): IterableIterator<[K, V]> {
    let node = this.head;
    while (node) {
      const entry = this.map.get(node.key);
      if (entry) {
        yield [node.key, entry.value];
      }
      node = node.next;
    }
  }

  /**
   * Iterate over all keys in the cache (from most to least recently used).
   */
  *keys(): IterableIterator<K> {
    let node = this.head;
    while (node) {
      yield node.key;
      node = node.next;
    }
  }

  /**
   * Iterate over all values in the cache (from most to least recently used).
   */
  *values(): IterableIterator<V> {
    let node = this.head;
    while (node) {
      const entry = this.map.get(node.key);
      if (entry) {
        yield entry.value;
      }
      node = node.next;
    }
  }

  /**
   * Execute a callback for each entry in the cache.
   * Similar to Map.forEach for compatibility.
   */
  forEach(callback: (value: V, key: K, cache: this) => void): void {
    let node = this.head;
    while (node) {
      const entry = this.map.get(node.key);
      if (entry) {
        callback(entry.value, node.key, this);
      }
      node = node.next;
    }
  }

  // ##############################
  // Private: Linked List Operations
  // ##############################

  /**
   * Move a node to the head (most recently used position).
   */
  private moveToHead(node: LRUNode<K>): void {
    if (this.head === node) return; // Already at head

    // Remove from current position
    this.removeNode(node);

    // Add to head
    this.addToHead(node);
  }

  /**
   * Add a node to the head of the list.
   */
  private addToHead(node: LRUNode<K>): void {
    node.prev = null;
    node.next = this.head;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * Remove a node from the list.
   */
  private removeNode(node: LRUNode<K>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * Evict the least recently used entry.
   * If a canEvict predicate is provided, walk backwards from tail
   * to find the first evictable entry.
   */
  private evictLRU(): void {
    if (!this.tail) return;

    // If no predicate, evict the tail immediately
    if (!this.canEvict) {
      const key = this.tail.key;
      const entry = this.map.get(key);
      this.removeNode(this.tail);
      this.map.delete(key);
      if (entry && this.onEvict) {
        this.onEvict(key, entry.value);
      }
      return;
    }

    // Walk backwards from tail to find an evictable entry
    let node: LRUNode<K> | null = this.tail;
    while (node) {
      const entry = this.map.get(node.key);
      if (entry && this.canEvict(node.key, entry.value)) {
        const key = node.key;
        this.removeNode(node);
        this.map.delete(key);
        if (this.onEvict) {
          this.onEvict(key, entry.value);
        }
        return;
      }
      node = node.prev;
    }

    // No evictable entries found - allow overflow rather than evicting protected entries
    // This is intentional for QueryClient (protects queries with active subscribers)
    // For hard bounds without overflow, don't use an eviction predicate
  }
}
