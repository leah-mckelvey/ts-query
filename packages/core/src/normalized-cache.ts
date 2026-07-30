import type { TypePolicy, NormalizedCacheConfig } from './types';

// #######################################
// CONSTANTS
// #######################################

/** Default upper bound on the number of stored entities before LRU eviction. */
const DEFAULT_MAX_ENTITIES = 5000;

// #######################################
// TYPE DEFINITIONS
// #######################################

/**
 * A reference to a normalized entity in the cache.
 * Format: "TypeName:id"
 */
export interface EntityRef {
  __ref: string;
}

// #######################################
// TYPE GUARDS
// #######################################

function isEntityRef(value: unknown): value is EntityRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    '__ref' in value &&
    typeof (value as EntityRef).__ref === 'string'
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// #######################################
// NORMALIZED CACHE
// #######################################

/**
 * Normalized entity store for GraphQL responses.
 *
 * Entities are identified by their __typename + key field(s) and stored in a
 * flat map ("User:42" → fields). This simplified entity store focuses solely on
 * entity management, with query coordination handled by QueryClient.
 *
 * Objects that lack __typename (or whose type has no resolvable key) pass
 * through unchanged, so non-GraphQL queries are unaffected.
 */
export class NormalizedCache {
  // ##############################
  // STATE
  // ##############################

  /** Flat entity store: "Type:id" → merged fields */
  private entities = new Map<string, Record<string, unknown>>();

  /** Reverse index: entity ref → query keys that reference it */
  private entityToQueries = new Map<string, Set<string>>();

  /** Callbacks invoked when a specific entity changes (for useFragment) */
  private entityListeners = new Map<string, Set<() => void>>();

  private config: NormalizedCacheConfig;

  /** Soft upper bound on stored entities; LRU eviction keeps us at or below it. */
  private maxEntities: number;

  /**
   * Wired up by QueryClient: reports whether a query key currently has active
   * subscribers. Used to "pin" entities that a live view depends on so LRU
   * eviction never pulls data out from under a mounted component.
   */
  isQueryKeyActive?: (queryKey: string) => boolean;

  // ##############################
  // INITIALIZATION
  // ##############################

  constructor(config: NormalizedCacheConfig = {}) {
    this.config = config;
    // A non-positive or NaN cap is meaningless (it would evict everything or
    // nothing coherently), so fall back to the default. `Infinity` is a valid
    // opt-out and survives this check.
    this.maxEntities =
      typeof config.maxEntities === 'number' && config.maxEntities > 0
        ? config.maxEntities
        : DEFAULT_MAX_ENTITIES;
  }

  // ##############################
  // PUBLIC API: SUBSCRIPTIONS
  // ##############################

  /**
   * Subscribe to changes for a specific entity.
   * The callback is invoked whenever `writeFragment` or `evict` touches this entity.
   * Returns an unsubscribe function.
   */
  subscribeToEntity(
    typename: string,
    id: string | number,
    callback: () => void,
  ): () => void {
    const ref = this.makeRef(typename, id);
    this.ensureSet(this.entityListeners as Map<string, Set<unknown>>, ref).add(
      callback,
    );
    return () => {
      this.entityListeners.get(ref)?.delete(callback);
    };
  }

  // ##############################
  // PUBLIC API: NORMALIZATION
  // ##############################

  /**
   * Normalize a value and store entities in the entity store.
   * Returns the normalized shape with entity refs.
   * The queryKey is used to build the reverse index (entity → queries).
   */
  normalize(data: unknown, queryKey: string): unknown {
    const shape = this.normalizeValue(data, queryKey);
    this.enforceCapacity();
    return shape;
  }

  /** Current number of entities held in the store. */
  size(): number {
    return this.entities.size;
  }

  /**
   * Reconstruct denormalized data from a normalized shape.
   */
  denormalize(shape: unknown): unknown {
    return this.denormalizeValue(shape);
  }

  // ##############################
  // PUBLIC API: FRAGMENT OPERATIONS
  // ##############################

  /**
   * Update a specific entity. Merges `data` into the existing record (shallow
   * merge of top-level fields) and returns the query keys that reference it.
   * The caller (QueryClient) is responsible for notifying affected queries.
   */
  writeFragment(
    typename: string,
    id: string | number,
    data: Record<string, unknown>,
  ): string[] {
    const ref = this.makeRef(typename, id);
    const existing = this.entities.get(ref) ?? {};
    const merged = this.mergeEntity(typename, existing, data);
    this.setEntity(ref, merged);
    this.notifyEntityListeners(ref);
    const affected = this.getAffectedQueries(ref);
    this.enforceCapacity();
    return affected;
  }

  /**
   * Read a raw (non-denormalized) entity record from the store.
   * Returns undefined if the entity is not cached.
   */
  readFragment<T extends Record<string, unknown> = Record<string, unknown>>(
    typename: string,
    id: string | number,
  ): T | undefined {
    return this.entities.get(this.makeRef(typename, id)) as T | undefined;
  }

  /**
   * Remove an entity from the store and return the query keys that were
   * referencing it (so the caller can invalidate them).
   */
  evict(typename: string, id: string | number): string[] {
    const ref = this.makeRef(typename, id);
    const affected = this.getAffectedQueries(ref);
    this.entities.delete(ref);
    this.entityToQueries.delete(ref);
    this.notifyEntityListeners(ref);
    return affected;
  }

  // ##############################
  // INTERNAL HELPERS: ENTITY REFS
  // ##############################

  private makeRef(typename: string, id: string | number): string {
    return `${typename}:${id}`;
  }

  /**
   * Derive the entity ref for an object using its __typename and key field(s).
   * Returns null if the object cannot be identified (no __typename, no key).
   */
  private getEntityRef(obj: Record<string, unknown>): string | null {
    const typename = obj.__typename;
    if (typeof typename !== 'string') return null;

    const policy: TypePolicy | undefined = this.config.typePolicies?.[typename];
    const keyFields = policy?.keyFields ?? 'id';

    let keyValue: unknown;
    if (Array.isArray(keyFields)) {
      const parts = keyFields.map((f) => obj[f]);
      if (parts.some((p) => p == null)) return null;
      keyValue = parts.join(':');
    } else {
      keyValue = obj[keyFields as string];
    }

    if (keyValue == null) return null;
    return this.makeRef(typename, keyValue as string | number);
  }

  // ##############################
  // INTERNAL HELPERS: ENTITY MERGING
  // ##############################

  /**
   * Merge new data into an existing entity using the type's merge policy.
   * Falls back to shallow merge if no custom merge function is defined.
   */
  private mergeEntity(
    typename: string,
    existing: Record<string, unknown>,
    incoming: Record<string, unknown>,
  ): Record<string, unknown> {
    const policy = this.config.typePolicies?.[typename];
    return policy?.merge
      ? policy.merge(existing, incoming)
      : { ...existing, ...incoming };
  }

  // ##############################
  // INTERNAL HELPERS: INDEX MANAGEMENT
  // ##############################

  /**
   * Ensure a Set exists at the given key in a Map, creating it if needed.
   * Returns the Set for chaining.
   */
  private ensureSet<K>(map: Map<K, Set<unknown>>, key: K): Set<unknown> {
    if (!map.has(key)) {
      map.set(key, new Set());
    }
    return map.get(key)!;
  }

  /**
   * Get the list of query keys that reference a specific entity.
   * Returns an empty array if the entity has no references.
   */
  private getAffectedQueries(ref: string): string[] {
    return Array.from(this.entityToQueries.get(ref) ?? []);
  }

  // ##############################
  // INTERNAL HELPERS: LRU EVICTION
  // ##############################

  /**
   * Insert or update an entity, marking it most-recently-used.
   *
   * A JS `Map` preserves insertion order and `set` on an existing key leaves
   * its position untouched, so we delete-then-set to move the entry to the
   * "newest" end. That gives us an O(1) LRU ordering straight from the Map:
   * the hashmap + doubly-linked-list you'd hand-roll for an LRU cache, except
   * the linked list is the engine's own.
   */
  private setEntity(ref: string, value: Record<string, unknown>): void {
    this.entities.delete(ref);
    this.entities.set(ref, value);
  }

  /** Mark an already-stored entity as most-recently-used (no-op if absent). */
  private touch(ref: string): void {
    const value = this.entities.get(ref);
    if (value !== undefined) {
      this.entities.delete(ref);
      this.entities.set(ref, value);
    }
  }

  /**
   * An entity is "pinned" — never eligible for eviction — when a live view
   * depends on it: either a query with active subscribers references it, or a
   * `useFragment`-style entity listener is subscribed directly to it. Evicting a
   * pinned entity would blank out mounted UI, so we keep it even over the cap.
   *
   * We deliberately do NOT invalidate/refetch on eviction: every query retains
   * its own complete `state.data` snapshot, so an inactive query whose entity is
   * evicted still renders correct cached data and simply repopulates the shared
   * store on its next fetch. Refetching here would be wasted work and, when the
   * cap is saturated by pinned entities, could loop.
   */
  private isPinned(ref: string): boolean {
    if ((this.entityListeners.get(ref)?.size ?? 0) > 0) return true;
    if (!this.isQueryKeyActive) return false;
    const queries = this.entityToQueries.get(ref);
    if (!queries) return false;
    for (const key of queries) {
      if (this.isQueryKeyActive(key)) return true;
    }
    return false;
  }

  /**
   * Evict least-recently-used, unpinned entities until the store is back within
   * `maxEntities`. If every over-cap entity is pinned the store stays above the
   * cap (soft limit) rather than break a live view.
   */
  private enforceCapacity(): void {
    if (this.entities.size <= this.maxEntities) return;

    // `keys()` yields least-recently-used first. Deleting the current/visited
    // key mid-iteration is well-defined for Map, so evicting in place is safe.
    for (const ref of this.entities.keys()) {
      if (this.entities.size <= this.maxEntities) break;
      if (this.isPinned(ref)) continue;
      this.entities.delete(ref);
      this.entityToQueries.delete(ref);
    }
  }

  // ##############################
  // INTERNAL HELPERS: OBJECT TRANSFORMATION
  // ##############################

  /**
   * Transform all values in an object using the given transformation function.
   * Returns a new object with the same keys but transformed values.
   */
  private transformObjectValues(
    obj: Record<string, unknown>,
    transform: (value: unknown) => unknown,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = transform(v);
    }
    return result;
  }

  // ##############################
  // CORE LOGIC: NORMALIZATION
  // ##############################

  /** Recursively normalize a value, registering entity refs under queryKey. */
  private normalizeValue(value: unknown, queryKey: string): unknown {
    // ####################
    // Handle arrays
    // ####################

    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item, queryKey));
    }

    // ####################
    // Handle primitives and non-plain objects
    // ####################

    if (!isPlainObject(value)) return value;

    // ####################
    // Normalize nested fields
    // ####################

    const normalized = this.transformObjectValues(value, (v) =>
      this.normalizeValue(v, queryKey),
    );

    // ####################
    // Check if this object is an identifiable entity
    // ####################

    const ref = this.getEntityRef(value);
    if (ref === null) {
      // Not an identifiable entity — store inline
      return normalized;
    }

    // ####################
    // Store entity and build reverse index
    // ####################

    const existing = this.entities.get(ref) ?? {};
    const typename = value.__typename as string;
    const merged = this.mergeEntity(typename, existing, normalized);
    this.setEntity(ref, merged);

    // Track which query references this entity
    this.ensureSet(this.entityToQueries as Map<string, Set<unknown>>, ref).add(
      queryKey,
    );

    return { __ref: ref } satisfies EntityRef;
  }

  // ##############################
  // CORE LOGIC: DENORMALIZATION
  // ##############################

  /** Recursively reconstruct a value by resolving entity refs. */
  private denormalizeValue(value: unknown): unknown {
    // ####################
    // Handle arrays
    // ####################

    if (Array.isArray(value)) {
      return value.map((item) => this.denormalizeValue(item));
    }

    // ####################
    // Handle primitives and non-plain objects
    // ####################

    if (!isPlainObject(value)) return value;

    // ####################
    // Resolve entity references
    // ####################

    if (isEntityRef(value)) {
      const entity = this.entities.get(value.__ref);
      if (entity === undefined) return undefined; // entity was evicted
      // Reading an entity counts as "using" it, so refresh its LRU recency.
      this.touch(value.__ref);
      return this.denormalizeValue(entity);
    }

    // ####################
    // Recursively denormalize nested objects
    // ####################

    return this.transformObjectValues(value, (v) => this.denormalizeValue(v));
  }

  // ##############################
  // INTERNAL HELPERS: NOTIFICATIONS
  // ##############################

  /** Invoke direct entity listeners (e.g. useFragment subscribers). */
  private notifyEntityListeners(ref: string): void {
    const listeners = this.entityListeners.get(ref);
    if (!listeners) return;
    for (const cb of listeners) cb();
  }
}
