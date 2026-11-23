import { describe, expect, it } from 'vitest';
import { TtlCache, locationKey } from '@/data/cache';
import { roundCoord } from '@/domain/geo';

const HOUR = 60 * 60 * 1000;

describe('TtlCache', () => {
  it('returns a fresh entry within the TTL', () => {
    const cache = new TtlCache<string>(HOUR);
    cache.set('k', 'v', 0);
    expect(cache.getFresh('k', HOUR - 1)?.value).toBe('v');
  });

  it('expires after the TTL but keeps the entry as stale', () => {
    const cache = new TtlCache<string>(HOUR);
    cache.set('k', 'v', 0);
    expect(cache.getFresh('k', HOUR)).toBeUndefined();
    expect(cache.getStale('k')).toEqual({ value: 'v', storedAt: 0 });
  });

  it('evicts the oldest entry beyond maxEntries', () => {
    const cache = new TtlCache<number>(HOUR, 2);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.set('c', 3, 0);
    expect(cache.getStale('a')).toBeUndefined();
    expect(cache.size).toBe(2);
  });

  it('refreshes recency when a key is set again', () => {
    const cache = new TtlCache<number>(HOUR, 2);
    cache.set('a', 1, 0);
    cache.set('b', 2, 0);
    cache.set('a', 9, 1);
    cache.set('c', 3, 2);
    expect(cache.getStale('a')?.value).toBe(9);
    expect(cache.getStale('b')).toBeUndefined();
  });
});

describe('location rounding', () => {
  it('rounds to 2 decimals for the cache key', () => {
    expect(locationKey(28.5449, 77.3921)).toBe('28.54,77.39');
    expect(locationKey(28.541, 77.394)).toBe(locationKey(28.5449, 77.3899));
  });

  it('never produces -0', () => {
    expect(Object.is(roundCoord(-0.001), 0)).toBe(true);
    expect(locationKey(-0.001, 0.004)).toBe('0.00,0.00');
  });
});
