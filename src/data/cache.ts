import { roundCoord } from '@/domain/geo';

/** A cached value and when it was stored (epoch ms). */
export interface CacheEntry<T> {
  value: T;
  storedAt: number;
}

/**
 * In-memory TTL cache with a size cap. Expired entries stay available through
 * `getStale` so a provider outage can fall back to the last good data.
 * Per server instance only; a shared store is needed for multi-instance production.
 */
export class TtlCache<T> {
  private readonly entries = new Map<string, CacheEntry<T>>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 500,
  ) {}

  get size(): number {
    return this.entries.size;
  }

  /** Entry younger than the TTL, else undefined. */
  getFresh(key: string, now: number): CacheEntry<T> | undefined {
    const entry = this.entries.get(key);
    return entry && now - entry.storedAt < this.ttlMs ? entry : undefined;
  }

  /** Entry of any age. */
  getStale(key: string): CacheEntry<T> | undefined {
    return this.entries.get(key);
  }

  /** Stores a value; evicts the least recently set entry beyond the cap. */
  set(key: string, value: T, now: number): void {
    this.entries.delete(key);
    this.entries.set(key, { value, storedAt: now });
    if (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
  }
}

/** Cache key: location rounded to 2 decimals. */
export function locationKey(lat: number, lon: number): string {
  return `${roundCoord(lat).toFixed(2)},${roundCoord(lon).toFixed(2)}`;
}
