import { appConfig, type AppConfig } from '@/config';
import type { ActionDef, Forecast, Profile, TulaScore } from '@/domain';
import { isApplicable, withinBudget } from './applicability';
import { displayTula } from './display';
import { baselineScenario } from './scenario';
import { buildTimeline } from './timeline';
import { evaluateAction, evaluateScenario, totalInhaled } from './tula';

export { isApplicable, withinBudget } from './applicability';

/** Amount on each pan that counts as one score point (config/ranking.json references). */
export interface ScoreReferences {
  breatheIn: number;
  pmG: number;
  co2Kg: number;
  rupees: number;
}

export interface ScoreWeights {
  breatheIn: number;
  emitOut: number;
  rupees: number;
  effortPenalty: number;
  refs: ScoreReferences;
}

export interface RankedAction {
  action: ActionDef;
  tula: TulaScore;
  score: number;
}

/** PRD 4.4: breathe-in weight doubles if any member is a child, an elder or sensitive. */
export function scoreWeights(profile: Profile, cfg: AppConfig): ScoreWeights {
  const { weights: w, references: r } = cfg.ranking;
  const vulnerable = profile.members.some((m) => m.ageGroup !== 'adult' || m.sensitive);
  return {
    breatheIn: vulnerable ? w.breatheInVulnerable.value : w.breatheIn.value,
    emitOut: w.emitOut.value,
    rupees: w.rupees.value,
    effortPenalty: w.effortPenalty.value,
    refs: {
      breatheIn: r.breatheIn.value,
      pmG: r.pmG.value,
      co2Kg: r.co2Kg.value,
      rupees: r.rupees.value,
    },
  };
}

/** Worth showing only if at least one pan improves by a visible amount. */
export function isUseful(tula: TulaScore): boolean {
  return (
    totalInhaled(tula) >= 1 ||
    tula.pmEmittedAvoidedG >= 1 ||
    tula.co2AvoidedKg >= 0.1 ||
    tula.rupeesPerMonth >= 1
  );
}

function per(value: number, reference: number): number {
  return reference > 0 ? value / reference : 0;
}

/**
 * Score = Σ weight × (pan ÷ its fixed reference amount) − penalty × effort.
 * Fixed references (not the largest candidate) keep a small cost from cancelling a big gain.
 */
export function scoreCandidates(
  candidates: { action: ActionDef; tula: TulaScore }[],
  w: ScoreWeights,
): RankedAction[] {
  const { refs } = w;
  return candidates.map(({ action, tula }) => {
    const emit = (per(tula.pmEmittedAvoidedG, refs.pmG) + per(tula.co2AvoidedKg, refs.co2Kg)) / 2;
    const score =
      w.breatheIn * per(totalInhaled(tula), refs.breatheIn) +
      w.emitOut * emit +
      w.rupees * per(tula.rupeesPerMonth, refs.rupees) -
      w.effortPenalty * action.effort;
    return { action, tula, score };
  });
}

/** Free-first, enforced in code (FR-14): cost tier ascending, then score descending, then id. */
export function freeFirst(a: RankedAction, b: RankedAction): number {
  return (
    a.action.costTier - b.action.costTier ||
    b.score - a.score ||
    a.action.id.localeCompare(b.action.id)
  );
}

/** Applicable, affordable, useful actions for this home, ranked free-first (PRD 4.4). */
export function rankActions(
  profile: Profile,
  forecast: Forecast,
  startIso: string,
  cfg: AppConfig = appConfig,
): RankedAction[] {
  const timeline = buildTimeline(forecast, startIso);
  const baseline = evaluateScenario(profile, baselineScenario(profile, cfg), timeline, cfg);
  const candidates = cfg.actions
    .filter((a) => isApplicable(a, profile) && withinBudget(a, profile.budgetTier))
    .map((action) => ({ action, tula: evaluateAction(profile, action, timeline, cfg, baseline) }))
    .filter((c) => isUseful(c.tula));
  return dropDuplicates(scoreCandidates(candidates, scoreWeights(profile, cfg)).sort(freeFirst));
}

/** Keeps the first of actions whose displayed Tula numbers are identical (same effect here). */
export function dropDuplicates(ranked: RankedAction[]): RankedAction[] {
  const seen = new Set<string>();
  return ranked.filter((r) => {
    const key = JSON.stringify(displayTula(r.tula));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
