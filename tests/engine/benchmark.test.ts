import { describe, expect, it } from 'vitest';
import { rankActions } from '@/engine/rank';
import { START_ISO, constantForecast, twoBhk } from '../fixtures/engine';

describe('engine speed (PRD Section 7, Efficiency)', () => {
  it('ranks every action for a 6-room home over 48 h in under 50 ms', () => {
    const base = twoBhk();
    const rooms = [
      ...base.rooms,
      { ...base.rooms[0]!, id: 'study', name: 'Study' },
      { ...base.rooms[2]!, id: 'dining', name: 'Dining' },
    ];
    const profile = { ...base, rooms };
    const forecast = constantForecast(180);
    rankActions(profile, forecast, START_ISO); // warm-up
    const runs = Array.from({ length: 5 }, () => {
      const t0 = performance.now();
      rankActions(profile, forecast, START_ISO);
      return performance.now() - t0;
    });
    expect(profile.rooms).toHaveLength(6);
    expect(Math.min(...runs)).toBeLessThan(50);
  });
});
