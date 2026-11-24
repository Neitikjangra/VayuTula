import { roundTo, type DisplayTula } from './display';

/** Today's running totals from the plan steps ticked "Done" (today only; resets daily). */
export interface MeterTotals {
  done: number;
  total: number;
  inhaledByMember: Record<string, number>;
  inhaledTotal: number;
  pmG: number;
  co2Kg: number;
  rupees: number;
}

function addMembers(into: Record<string, number>, add: Record<string, number>): void {
  for (const [id, value] of Object.entries(add)) into[id] = (into[id] ?? 0) + value;
}

/**
 * Sums the displayed (already rounded) numbers of the ticked steps, so the meter always equals
 * the sum of what the step cards show. CO₂ keeps one decimal like the cards.
 */
export function todayTotals(
  steps: { actionId: string; tula: DisplayTula }[],
  doneIds: string[],
): MeterTotals {
  const done = steps.filter((s) => doneIds.includes(s.actionId));
  const inhaledByMember: Record<string, number> = {};
  for (const s of done) addMembers(inhaledByMember, s.tula.inhaledByMember);
  const sum = (pick: (t: DisplayTula) => number) =>
    done.reduce((total, s) => total + pick(s.tula), 0);
  return {
    done: done.length,
    total: steps.length,
    inhaledByMember,
    inhaledTotal: sum((t) => t.inhaledTotal),
    pmG: sum((t) => t.pmG),
    co2Kg: roundTo(
      sum((t) => t.co2Kg),
      1,
    ),
    rupees: sum((t) => t.rupees),
  };
}

/** How far the balance tips: 0 (nothing done) to 1 (every step done). Visual only. */
export function meterTilt({ done, total }: Pick<MeterTotals, 'done' | 'total'>): number {
  return total > 0 ? done / total : 0;
}
