// ########################################
// IMPORTS
// ########################################

import { useMemo } from 'react';
import { useQueryClient } from './context';
import { useSubscription } from './use-subscription';

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

  // Adapt the entity-based fragment API to the shared subscription helper:
  // read the current entity synchronously, and re-read it on every change
  // notification. This shares the mounted-guard logic with useQuery/useMutation.
  const config = useMemo(
    () => ({
      getCurrentState: () => client.readFragment<T>(typename, id),
      subscribe: (callback: (data: T | undefined) => void) =>
        client.subscribeFragment(typename, id, () => {
          callback(client.readFragment<T>(typename, id));
        }),
    }),
    [client, typename, id],
  );

  return useSubscription(config);
}
