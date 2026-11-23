/**
 * Rounds a coordinate to 2 decimals (about 1.1 km). Used as the cache key and
 * as the only location precision ever sent to the server (privacy, PRD Section 7).
 */
export function roundCoord(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}
