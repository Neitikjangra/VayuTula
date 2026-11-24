import { describe, expect, it } from 'vitest';
import type { TulaScore } from '@/domain';
import { displayTula, roundTo } from '@/engine/display';

const tula: TulaScore = {
  inhaledAvoided: { a: 100.4, b: 50.6 },
  pmEmittedAvoidedG: -3.5,
  co2AvoidedKg: 12.345,
  rupeesPerMonth: -87.75,
  confidence: 'med',
  assumptions: ['factors.deposition'],
};

describe('displayTula()', () => {
  const d = displayTula(tula);

  it('rounds each pan as shown: µg·h and g whole, kg CO₂ to 0.1, ₹ whole', () => {
    expect(d.inhaledByMember).toEqual({ a: 100, b: 51 });
    expect(d.pmG).toBe(-3);
    expect(d.co2Kg).toBe(12.3);
    expect(d.rupees).toBe(-88);
  });

  it('rounds the total from raw values, not from rounded parts', () => {
    expect(d.inhaledTotal).toBe(151);
  });

  it('is provisional while any assumption is unverified', () => {
    expect(d.provisional).toBe(true);
    expect(displayTula({ ...tula, assumptions: [] }).provisional).toBe(false);
  });
});

describe('roundTo()', () => {
  it('never returns -0', () => {
    expect(Object.is(roundTo(-0.04, 1), 0)).toBe(true);
  });
});
