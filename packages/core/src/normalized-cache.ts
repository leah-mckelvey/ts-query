import type { QueryOptions } from './types';

export type EntityId = string | number;

export interface NormalizedEntity<T> {
  id: EntityId;
  value: T;
}

/**
 * A minimal, framework-agnostic normalized cache for entity objects.
 *
 * It stores entities by a string "type" and id, and lets callers keep
 * separate collections of ids (e.g. for different query keys) that point
 * at the same underlying entities.
 */
export interface NormalizedCache<
  TType extends string = string,
  TEntity = unknown,
> {
  /** Insert or update many entities of a given type. */
  upsertMany(type: TType, entities: readonly NormalizedEntity<TEntity>[]): void;

  /** Insert or update a single entity of a given type. */
  upsertOne(type: TType, entity: NormalizedEntity<TEntity>): void;

  /** Get a single entity by type and id. */
  get(type: TType, id: EntityId): TEntity | undefined;

  /** Get many entities by type and ids, preserving id order. */
  getMany(type: TType, ids: readonly EntityId[]): (TEntity | undefined)[];

  /**
   * Store a named collection of ids (for example, the result of a query
   * that returns a list of entities).
   */
  setCollection(
    collectionKey: string,
    type: TType,
    ids: readonly EntityId[],
  ): void;

  /**
   * Read back a collection as fully denormalized entities. Missing
   * entities are returned as `undefined` in-place to preserve order.
   */
  getCollection(collectionKey: string): (TEntity | undefined)[] | undefined;

  /**
   * Remove an entity by type and id. Collections that referenced this id
   * will still contain the id, but `getCollection` will return `undefined`
   * in its place.
   */
  remove(type: TType, id: EntityId): void;

  /** Clear all entities and collections. */
  clear(): void;
}

export function createNormalizedCache<
  TType extends string = string,
  TEntity = unknown,
>(): NormalizedCache<TType, TEntity> {
  const entities = new Map<TType, Map<EntityId, TEntity>>();
  const collections = new Map<string, { type: TType; ids: EntityId[] }>();

  const getTypeMap = (type: TType): Map<EntityId, TEntity> => {
    let map = entities.get(type);
    if (!map) {
      map = new Map<EntityId, TEntity>();
      entities.set(type, map);
    }
    return map;
  };

  return {
    upsertMany(type, items) {
      const map = getTypeMap(type);
      for (const { id, value } of items) {
        map.set(id, value);
      }
    },

    upsertOne(type, item) {
      const map = getTypeMap(type);
      map.set(item.id, item.value);
    },

    get(type, id) {
      const map = entities.get(type);
      return map?.get(id);
    },

    getMany(type, ids) {
      const map = entities.get(type);
      if (!map) return ids.map(() => undefined);
      return ids.map((id) => map.get(id));
    },

    setCollection(collectionKey, type, ids) {
      collections.set(collectionKey, { type, ids: [...ids] });
    },

    getCollection(collectionKey) {
      const entry = collections.get(collectionKey);
      if (!entry) return undefined;
      const map = entities.get(entry.type);
      if (!map) return entry.ids.map(() => undefined);
      return entry.ids.map((id) => map.get(id));
    },

    remove(type, id) {
      const map = entities.get(type);
      map?.delete(id);
    },

    clear() {
      entities.clear();
      collections.clear();
    },
  };
}

export interface NormalizedEntityQueryConfig<
  TItem,
  TType extends string = string,
> {
  cache: NormalizedCache<TType, TItem>;
  type: TType;
  getId: (item: TItem) => EntityId;
}

export function createNormalizedEntityQueryOptions<
  TItem,
  TError = Error,
  TType extends string = string,
>(
  base: QueryOptions<TItem, TError>,
  config: NormalizedEntityQueryConfig<TItem, TType>,
): QueryOptions<TItem, TError> {
  const userOnSuccess = base.onSuccess;
  const { cache, type, getId } = config;

  return {
    ...base,
    onSuccess(data) {
      cache.upsertOne(type, {
        id: getId(data),
        value: data,
      });
      userOnSuccess?.(data);
    },
  };
}

export interface NormalizedListQueryConfig<
  TItem,
  TType extends string = string,
> {
  cache: NormalizedCache<TType, TItem>;
  type: TType;
  getId: (item: TItem) => EntityId;
  /** Optional explicit collection key; defaults to the serialized queryKey. */
  collectionKey?: string;
}

export function createNormalizedListQueryOptions<
  TItem,
  TError = Error,
  TType extends string = string,
>(
  base: QueryOptions<TItem[], TError>,
  config: NormalizedListQueryConfig<TItem, TType>,
): QueryOptions<TItem[], TError> {
  const { cache, type, getId, collectionKey } = config;
  const userOnSuccess = base.onSuccess;

  const resolvedCollectionKey =
    collectionKey ??
    (typeof base.queryKey === 'string'
      ? base.queryKey
      : JSON.stringify(base.queryKey));

  return {
    ...base,
    onSuccess(data) {
      const entities = data.map((item) => ({
        id: getId(item),
        value: item,
      }));

      cache.upsertMany(type, entities);
      cache.setCollection(
        resolvedCollectionKey,
        type,
        entities.map((entity) => entity.id),
      );

      userOnSuccess?.(data);
    },
  };
}
