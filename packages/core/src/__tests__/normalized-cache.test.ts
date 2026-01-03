import { describe, it, expect, vi } from 'vitest';
import {
  createNormalizedCache,
  createNormalizedEntityQueryOptions,
  createNormalizedListQueryOptions,
  type EntityId,
  type NormalizedEntity,
} from '../normalized-cache';

import { Query } from '../query';

type User = { id: EntityId; name: string };

describe('createNormalizedCache', () => {
  it('stores and retrieves single entities', () => {
    const cache = createNormalizedCache<'user', User>();
    const user: NormalizedEntity<User> = {
      id: 1,
      value: { id: 1, name: 'Alice' },
    };

    cache.upsertOne('user', user);

    expect(cache.get('user', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(cache.get('user', 2)).toBeUndefined();
  });

  it('upserts many entities and preserves last write', () => {
    const cache = createNormalizedCache<'user', User>();

    cache.upsertMany('user', [
      { id: 1, value: { id: 1, name: 'Alice' } },
      { id: 2, value: { id: 2, name: 'Bob' } },
    ]);

    cache.upsertOne('user', {
      id: 1,
      value: { id: 1, name: 'Alice Updated' },
    });

    expect(cache.get('user', 1)).toEqual({ id: 1, name: 'Alice Updated' });
    expect(cache.get('user', 2)).toEqual({ id: 2, name: 'Bob' });
  });

  it('gets many entities in the same order as the ids array', () => {
    const cache = createNormalizedCache<'user', User>();

    cache.upsertMany('user', [
      { id: 1, value: { id: 1, name: 'Alice' } },
      { id: 2, value: { id: 2, name: 'Bob' } },
    ]);

    const result = cache.getMany('user', [2, 1, 3]);

    expect(result).toEqual([
      { id: 2, name: 'Bob' },
      { id: 1, name: 'Alice' },
      undefined,
    ]);
  });

  it('stores and reads named collections as denormalized entities', () => {
    const cache = createNormalizedCache<'user', User>();

    cache.upsertMany('user', [
      { id: 1, value: { id: 1, name: 'Alice' } },
      { id: 2, value: { id: 2, name: 'Bob' } },
    ]);

    cache.setCollection('users:all', 'user', [1, 2]);

    expect(cache.getCollection('users:all')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });

  it('returns undefined for missing collections', () => {
    const cache = createNormalizedCache<'user', User>();

    expect(cache.getCollection('missing')).toBeUndefined();
  });

  it('returns undefined entries in collections when entities are missing', () => {
    const cache = createNormalizedCache<'user', User>();

    cache.setCollection('users:all', 'user', [1, 2]);

    expect(cache.getCollection('users:all')).toEqual([undefined, undefined]);

    cache.upsertOne('user', { id: 1, value: { id: 1, name: 'Alice' } });

    expect(cache.getCollection('users:all')).toEqual([
      { id: 1, name: 'Alice' },
      undefined,
    ]);
  });

  it('removes entities but keeps collections structure stable', () => {
    const cache = createNormalizedCache<'user', User>();

    cache.upsertMany('user', [
      { id: 1, value: { id: 1, name: 'Alice' } },
      { id: 2, value: { id: 2, name: 'Bob' } },
    ]);

    cache.setCollection('users:all', 'user', [1, 2]);

    cache.remove('user', 1);

    expect(cache.get('user', 1)).toBeUndefined();
    expect(cache.get('user', 2)).toEqual({ id: 2, name: 'Bob' });

    expect(cache.getCollection('users:all')).toEqual([
      undefined,
      { id: 2, name: 'Bob' },
    ]);
  });

  it('clears all entities and collections', () => {
    const cache = createNormalizedCache<'user', User>();

    cache.upsertOne('user', { id: 1, value: { id: 1, name: 'Alice' } });
    cache.setCollection('users:all', 'user', [1]);

    cache.clear();

    expect(cache.get('user', 1)).toBeUndefined();
    expect(cache.getCollection('users:all')).toBeUndefined();
  });

  it('wires a single-entity query into the normalized cache', async () => {
    const cache = createNormalizedCache<'user', User>();
    const onSuccess = vi.fn();

    const options = createNormalizedEntityQueryOptions<User>(
      {
        queryKey: 'user:1',
        queryFn: async () => ({ id: 1, name: 'Alice' }),
        onSuccess,
      },
      {
        cache,
        type: 'user',
        getId: (user) => user.id,
      },
    );

    const query = new Query(options);
    await query.fetch();

    expect(cache.get('user', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(onSuccess).toHaveBeenCalledWith({ id: 1, name: 'Alice' });
  });

  it('wires a list query into the normalized cache and collections', async () => {
    const cache = createNormalizedCache<'user', User>();
    const onSuccess = vi.fn();

    const options = createNormalizedListQueryOptions<User>(
      {
        queryKey: 'users',
        queryFn: async () => [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        onSuccess,
      },
      {
        cache,
        type: 'user',
        getId: (user) => user.id,
      },
    );

    const query = new Query(options);
    await query.fetch();

    expect(cache.get('user', 1)).toEqual({ id: 1, name: 'Alice' });
    expect(cache.get('user', 2)).toEqual({ id: 2, name: 'Bob' });

    // Default collection key mirrors the string queryKey
    expect(cache.getCollection('users')).toEqual([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
    expect(onSuccess).toHaveBeenCalledWith([
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ]);
  });
});
