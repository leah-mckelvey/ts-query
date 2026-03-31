import type { TypePolicy, NormalizedCacheConfig } from './types';

/**
 * A reference to a normalized entity in the cache.
 * Format: "TypeName:id"
 */
export interface EntityRef {
  __ref: string;
}

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

/**
 * Normalized entity store for GraphQL responses.
 *
 * Entities are identified by their __typename + key field(s) and stored in a
 * flat map ("User:42" → fields). Query results are stored as normalized shapes
 * (entity refs in place of inline objects) so that a single writeFragment call
 * propagates to every query that referenced that entity.
 *
 * Objects that lack __typename (or whose type has no resolvable key) pass
 * through unchanged, so non-GraphQL queries are unaffected.
 */
export class NormalizedCache {
  /** Flat entity store: "Type:id" → merged fields */
  private entities = new Map<string, Record<string, unknown>>();

  /** Normalized query shapes: queryKey → shape with EntityRefs */
  private shapes = new Map<string, unknown>();

  /** Reverse index: entity ref → query keys that reference it */
  private entityToQueries = new Map<string, Set<string>>();

  /** Callbacks invoked when any entity referenced by a query changes */
  private queryListeners = new Map<string, () => void>();

  /** Callbacks invoked when a specific entity changes (for useFragment) */
  private entityListeners = new Map<string, Set<() => void>>();

  private config: NormalizedCacheConfig;

  constructor(config: NormalizedCacheConfig = {}) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Entity-level subscription (for useFragment)
  // ---------------------------------------------------------------------------

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
    if (!this.entityListeners.has(ref)) {
      this.entityListeners.set(ref, new Set());
    }
    this.entityListeners.get(ref)!.add(callback);
    return () => {
      this.entityListeners.get(ref)?.delete(callback);
    };
  }

  // ---------------------------------------------------------------------------
  // Query-level API
  // ---------------------------------------------------------------------------

  /**
   * Register a callback to be invoked when any entity referenced by this
   * query is updated via writeFragment or evict.
   * Returns an unsubscribe function.
   */
  registerQueryListener(queryKey: string, callback: () => void): () => void {
    this.queryListeners.set(queryKey, callback);
    return () => {
      this.queryListeners.delete(queryKey);
    };
  }

  /**
   * Normalize a query result and store it.
   * The original data is NOT mutated; entity refs replace nested entity objects
   * in the stored shape only.
   */
  writeQuery(queryKey: string, data: unknown): void {
    const shape = this.normalizeValue(data, queryKey);
    this.shapes.set(queryKey, shape);
  }

  /**
   * Reconstruct the full denormalized data for a query from the current
   * entity store. Returns undefined if the query has never been written.
   */
  readQuery(queryKey: string): unknown {
    const shape = this.shapes.get(queryKey);
    if (shape === undefined) return undefined;
    return this.denormalizeValue(shape);
  }

  // ---------------------------------------------------------------------------
  // Fragment / entity API
  // ---------------------------------------------------------------------------

  /**
   * Update a specific entity. Merges `data` into the existing record (shallow
   * merge of top-level fields) and notifies all queries that reference it.
   */
  writeFragment(
    typename: string,
    id: string | number,
    data: Record<string, unknown>,
  ): void {
    const ref = this.makeRef(typename, id);
    const existing = this.entities.get(ref) ?? {};
    const policy = this.config.typePolicies?.[typename];
    const merged = policy?.merge
      ? policy.merge(existing, data)
      : { ...existing, ...data };
    this.entities.set(ref, merged);
    this.notifyQueries(ref);
    this.notifyEntityListeners(ref);
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
    this.entities.delete(ref);
    const affected = [...(this.entityToQueries.get(ref) ?? [])];
    this.entityToQueries.delete(ref);
    this.notifyEntityListeners(ref);
    return affected;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

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

  /** Recursively normalize a value, registering entity refs under queryKey. */
  private normalizeValue(value: unknown, queryKey: string): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.normalizeValue(item, queryKey));
    }

    if (!isPlainObject(value)) return value;

    // Recursively normalize nested fields first
    const normalized: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      normalized[k] = this.normalizeValue(v, queryKey);
    }

    const ref = this.getEntityRef(value);
    if (ref === null) {
      // Not an identifiable entity — store inline
      return normalized;
    }

    // Merge into entity store
    const existing = this.entities.get(ref) ?? {};
    const typename = value.__typename as string;
    const policy = this.config.typePolicies?.[typename];
    const merged = policy?.merge
      ? policy.merge(existing, normalized)
      : { ...existing, ...normalized };
    this.entities.set(ref, merged);

    // Track which query references this entity
    if (!this.entityToQueries.has(ref)) {
      this.entityToQueries.set(ref, new Set());
    }
    this.entityToQueries.get(ref)!.add(queryKey);

    return { __ref: ref } satisfies EntityRef;
  }

  /** Recursively reconstruct a value by resolving entity refs. */
  private denormalizeValue(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.denormalizeValue(item));
    }

    if (!isPlainObject(value)) return value;

    if (isEntityRef(value)) {
      const entity = this.entities.get(value.__ref);
      if (entity === undefined) return undefined; // entity was evicted
      return this.denormalizeValue(entity);
    }

    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      result[k] = this.denormalizeValue(v);
    }
    return result;
  }

  /** Invoke listeners for all queries that reference the given entity ref. */
  private notifyQueries(ref: string): void {
    const affected = this.entityToQueries.get(ref);
    if (!affected) return;
    for (const queryKey of affected) {
      this.queryListeners.get(queryKey)?.();
    }
  }

  /** Invoke direct entity listeners (e.g. useFragment subscribers). */
  private notifyEntityListeners(ref: string): void {
    const listeners = this.entityListeners.get(ref);
    if (!listeners) return;
    for (const cb of listeners) cb();
  }
}
