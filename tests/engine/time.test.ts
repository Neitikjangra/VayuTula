import { describe, expect, it } from 'vitest';
import { minutesSince } from '@/engine/time';

describe('minutesSince()', () => {
  const saved = '2026-11-24T10:00:00.000Z';

  it('returns whole elapsed minutes, rounded down', () => {
    expect(minutesSince(saved, Date.parse('2026-11-24T10:45:59.000Z'))).toBe(45);
  });

  it('never goes negative when the clock is behind', () => {
    expect(minutesSince(saved, Date.parse('2026-11-24T09:00:00.000Z'))).toBe(0);
  });

  it('returns 0 for an unreadable time', () => {
    expect(minutesSince('not a date', Date.parse(saved))).toBe(0);
  });
});
