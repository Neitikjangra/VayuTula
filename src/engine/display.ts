import { isKeyProvisional } from '@/config';
import type { Confidence, TulaScore } from '@/domain';
import { totalInhaled } from './tula';

/** Tula numbers exactly as the UI shows them. The AI validator in R4 compares against these. */
export interface DisplayTula {
  inhaledByMember: Record<string, number>;
  inhaledTotal: number;
  pmG: number;
  co2Kg: number;
  rupees: number;
  confidence: Confidence;
  /** True when any number depends on an unverified config value. */
  provisional: boolean;
}

/** Rounds to `decimals` places, never returning -0. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** µg·h/m³ and g as whole numbers, kg CO₂ to one decimal, ₹ as whole rupees. */
export function displayTula(tula: TulaScore): DisplayTula {
  return {
    inhaledByMember: Object.fromEntries(
      Object.entries(tula.inhaledAvoided).map(([id, v]) => [id, roundTo(v, 0)]),
    ),
    inhaledTotal: roundTo(totalInhaled(tula), 0),
    pmG: roundTo(tula.pmEmittedAvoidedG, 0),
    co2Kg: roundTo(tula.co2AvoidedKg, 1),
    rupees: roundTo(tula.rupeesPerMonth, 0),
    confidence: tula.confidence,
    provisional: tula.assumptions.some(isKeyProvisional),
  };
}
