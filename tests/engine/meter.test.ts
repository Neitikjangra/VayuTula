import { describe, expect, it } from 'vitest';
import type { DisplayTula } from '@/engine/display';
import { meterTilt, todayTotals } from '@/engine/meter';

const tula = (over: Partial<DisplayTula>): DisplayTula => ({
  inhaledByMember: {},
  inhaledTotal: 0,
  pmG: 0,
  co2Kg: 0,
  rupees: 0,
  confidence: 'high',
  provisional: true,
  ...over,
});

const steps = [
  {
    actionId: 'run-purifier',
    tula: tula({
      inhaledByMember: { a: 900, b: 905 },
      inhaledTotal: 1805,
      pmG: -4,
      co2Kg: -10.1,
      rupees: -92,
    }),
  },
  {
    actionId: 'skip-incense',
    tula: tula({ inhaledByMember: { a: 500, b: 583 }, inhaledTotal: 1083, rupees: 60 }),
  },
  { actionId: 'bus', tula: tula({ pmG: 11, co2Kg: 60.2, rupees: 2065 }) },
];

describe("todayTotals() (Today's Tula meter)", () => {
  it('is zero with nothing ticked', () => {
    expect(todayTotals(steps, [])).toEqual({
      done: 0,
      total: 3,
      inhaledByMember: {},
      inhaledTotal: 0,
      pmG: 0,
      co2Kg: 0,
      rupees: 0,
    });
  });

  it('adds up exactly the numbers shown on the ticked steps', () => {
    expect(todayTotals(steps, ['run-purifier', 'bus'])).toEqual({
      done: 2,
      total: 3,
      inhaledByMember: { a: 900, b: 905 },
      inhaledTotal: 1805,
      pmG: 7,
      co2Kg: 50.1,
      rupees: 1973,
    });
  });

  it('sums per person across steps', () => {
    expect(todayTotals(steps, ['run-purifier', 'skip-incense']).inhaledByMember).toEqual({
      a: 1400,
      b: 1488,
    });
  });

  it('ignores ticks for steps that are no longer in the plan', () => {
    expect(todayTotals(steps, ['gone', 'bus']).done).toBe(1);
  });
});

describe('meterTilt()', () => {
  it('goes from level (0) to fully tipped (1) as steps are done', () => {
    expect(meterTilt({ done: 0, total: 4 })).toBe(0);
    expect(meterTilt({ done: 2, total: 4 })).toBe(0.5);
    expect(meterTilt({ done: 4, total: 4 })).toBe(1);
    expect(meterTilt({ done: 0, total: 0 })).toBe(0);
  });
});
