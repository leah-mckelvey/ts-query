import type { CacheEntryMetadata } from '../types';

/**
 * The freshness state of a cached entry.
 *
 * - `fresh`: Data is valid and does not need revalidation
 * - `stale`: Data can be served but should trigger background revalidation
 * - `expired`: Data has exceeded hard TTL and should not be served
 */
export type CacheEntryState = 'fresh' | 'stale' | 'expired';

/**
 * Determines the freshness state of a cache entry at a given time.
 *
 * This implements the two-window expiry model:
 * - Fresh window: [cachedAt, softExpiry) — serve immediately
 * - Stale window: [softExpiry, hardExpiry) — serve + revalidate
 * - Expired: [hardExpiry, ∞) — do not serve
 *
 * @param entry - The cache entry with timing metadata
 * @param currentTime - The current timestamp in milliseconds (typically Date.now())
 * @returns The freshness state of the entry
 *
 * @example
 * ```ts
 * const entry = {
 *   data: 'value',
 *   cachedAt: 1000,
 *   softExpiry: 5000,
 *   hardExpiry: 10000,
 * };
 *
 * getCacheEntryState(entry, 3000); // 'fresh'
 * getCacheEntryState(entry, 7000); // 'stale'
 * getCacheEntryState(entry, 15000); // 'expired'
 * ```
 */
export function getCacheEntryState<TData>(
  entry: CacheEntryMetadata<TData>,
  currentTime: number,
): CacheEntryState {
  if (currentTime >= entry.hardExpiry) {
    return 'expired';
  }

  if (currentTime >= entry.softExpiry) {
    return 'stale';
  }

  return 'fresh';
}
