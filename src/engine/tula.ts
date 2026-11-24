import type { AppConfig } from '@/config';
import {
  numberValue,
  type ActionDef,
  type Confidence,
  type Profile,
  type TulaScore,
} from '@/domain';
import { assumptionKeys } from './assumptions';
import { filterRupeesPerMonth, monthlyCost } from './cost';
import { monthlyEmissions } from './emissions';
import { memberExposure } from './exposure';
import { simulateRoom } from './indoor';
import { buildRoomInputs } from './roomInputs';
import { applyModifies, baselineScenario, type Scenario } from './scenario';
import type { Timeline } from './timeline';
import { monthlyUse } from './usage';

const MONTHS_TO_SPREAD_PURCHASE = 12;

/** Breathe-in exposure per member (next 24 h), monthly emissions and monthly cost of a scenario. */
export interface Evaluation {
  exposure: Record<string, number>;
  pmG: number;
  co2Kg: number;
  rupees: number;
}

/** Runs the indoor model for every room and totals the three pans for one scenario. */
export function evaluateScenario(
  profile: Profile,
  s: Scenario,
  timeline: Timeline,
  cfg: AppConfig,
): Evaluation {
  const inputs = buildRoomInputs(s, timeline, cfg);
  const series = inputs.map((room) => simulateRoom(timeline.cOut, room));
  const use = monthlyUse(s, inputs, cfg);
  const { pmG, co2Kg } = monthlyEmissions(use, cfg);
  const exposure = memberExposure(profile.members, s.rooms, series, timeline.localHours);
  return { exposure, pmG, co2Kg, rupees: monthlyCost(use, cfg) };
}

/** PRD 4.3: high if window type and purifier CADR are known, medium if one is defaulted, low if both. */
export function confidenceOf(s: Scenario): Confidence {
  const windowDefaulted = s.rooms.some((r) => r.windowDefaulted);
  const cadrDefaulted = s.rooms.some((r) => r.purifier?.defaulted === true);
  if (windowDefaulted && cadrDefaulted) return 'low';
  return windowDefaulted || cadrDefaulted ? 'med' : 'high';
}

/**
 * Tula score for one action: baseline (today's habits) minus the action's scenario.
 * Positive values are improvements; ₹ positive = saves (one-off spread over 12 months).
 */
export function evaluateAction(
  profile: Profile,
  action: ActionDef,
  timeline: Timeline,
  cfg: AppConfig,
  baseline?: Evaluation,
): TulaScore {
  const base = baselineScenario(profile, cfg);
  const before = baseline ?? evaluateScenario(profile, base, timeline, cfg);
  const scenario = applyModifies(base, action.modifies, cfg);
  const after = evaluateScenario(profile, scenario, timeline, cfg);
  const purchase = numberValue(action.oneOffRupees) / MONTHS_TO_SPREAD_PURCHASE;
  const filters = scenario.addedPurifier ? filterRupeesPerMonth(scenario.addedPurifier.id, cfg) : 0;
  return {
    inhaledAvoided: Object.fromEntries(
      profile.members.map((m) => [
        m.id,
        (before.exposure[m.id] ?? 0) - (after.exposure[m.id] ?? 0),
      ]),
    ),
    pmEmittedAvoidedG: before.pmG - after.pmG,
    co2AvoidedKg: before.co2Kg - after.co2Kg,
    rupeesPerMonth: before.rupees - after.rupees - purchase - filters,
    confidence: confidenceOf(scenario),
    assumptions: assumptionKeys(action, base, scenario),
  };
}

/** Breathe-in avoided summed over all members. */
export function totalInhaled(tula: TulaScore): number {
  return Object.values(tula.inhaledAvoided).reduce((sum, v) => sum + v, 0);
}
