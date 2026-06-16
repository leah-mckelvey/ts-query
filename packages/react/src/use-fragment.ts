// ########################################
// IMPORTS
// ########################################

import { useState, useEffect } from 'react';
import { useQueryClient } from './context';

// ########################################
// FRAGMENT HOOK
// ########################################

/**
 * Subscribe to a single normalized entity in the cache.
 *
 * Re-renders whenever the entity is updated via `QueryClient.writeFragment`
 * or removed via `QueryClient.evict`. Returns `undefined` if the entity is
 * not yet cached or has been evicted.
 *
 * Requires the QueryClient to be configured with `normalizedCache`.
 *
 * @example
 * function UserCard({ userId }: { userId: string }) {
 *   const user = useFragment<User>('User', userId);
 *   if (!user) return null;
 *   return <div>{user.name}</div>;
 * }
 */
export function useFragment<
  T extends Record<string, unknown> = Record<string, unknown>,
>(typename: string, id: string | number): T | undefined {
  const client = useQueryClient();
  const [data, setData] = useState<T | undefined>(() =>
    client.readFragment<T>(typename, id),
  );

  useEffect(() => {
    // Subscribe to fragment changes
    const unsubscribe = client.subscribeFragment(typename, id, () => {
      setData(client.readFragment<T>(typename, id));
    });

    // Sync initial state in case it changed between render and effect
    setData(client.readFragment<T>(typename, id));

    return unsubscribe;
  }, [client, typename, id]);

  return data;
}
