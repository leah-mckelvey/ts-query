/**
 * Applies random jitter to a base TTL value to desynchronize cache expiries.
 *
 * This prevents cache stampedes when many keys share the same TTL and would
 * otherwise expire simultaneously, causing a synchronized re-fetch spike.
 *
 * Formula: `baseTTL * (1 + jitter * random(-1, 1))`
 *
 * @param baseTTL - The base time-to-live in milliseconds (must be >= 0)
 * @param jitter - The jitter ratio (0-0.5). For example:
 *                 - 0 = no jitter (deterministic)
 *                 - 0.1 = ±10% jitter
 *                 - 0.5 = ±50% jitter (maximum allowed)
 * @returns The jittered TTL in milliseconds (integer, >= 0)
 *
 * @example
 * ```ts
 * // 5 minute TTL with ±10% jitter
 * const ttl = applyJitter(5 * 60 * 1000, 0.1);
 * // Returns: 270000-330000ms (4.5-5.5 minutes)
 * ```
 */
export function applyJitter(baseTTL: number, jitter: number): number {
  // Input validation
  if (!Number.isFinite(baseTTL) || baseTTL < 0) {
    throw new Error(
      `baseTTL must be a finite non-negative number, got: ${baseTTL}`,
    );
  }

  if (!Number.isFinite(jitter) || jitter < 0 || jitter > 0.5) {
    throw new Error(`jitter must be between 0 and 0.5, got: ${jitter}`);
  }

  if (jitter === 0 || baseTTL === 0) {
    return baseTTL;
  }

  // Generate random value in range [-1, 1]
  const randomFactor = Math.random() * 2 - 1;

  // Apply jitter: baseTTL * (1 + jitter * random(-1, 1))
  const jitteredTTL = baseTTL * (1 + jitter * randomFactor);

  // Return integer milliseconds, clamped to non-negative
  return Math.max(0, Math.round(jitteredTTL));
}
