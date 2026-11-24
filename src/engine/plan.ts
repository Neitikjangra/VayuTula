import type { AppConfig } from '@/config';
import {
  PLAN_CANDIDATES,
  type ActionDef,
  type HourRange,
  type HouseholdSummary,
  type PlanCandidate,
  type Profile,
} from '@/domain';
import { displayTula } from './display';
import type { RankedAction } from './rank';
import { cleanestHours } from './roomInputs';
import { applyModifies, baselineScenario, type Scenario } from './scenario';
import { EXPOSURE_HOURS, type Timeline } from './timeline';

/** Hours in a range, wrapping past midnight. */
export function rangeHours({ fromHour, toHour }: HourRange): number {
  return toHour > fromHour ? toHour - fromHour : 24 - fromHour + toHour;
}

const oneHour = (h: number): HourRange => ({ fromHour: h % 24, toHour: (h + 1) % 24 });

/** First hour in `hours` at or after `now` (local), else the earliest one. */
function nextOf(hours: number[], now: number): number | null {
  const sorted = [...hours].sort((a, b) => a - b);
  return sorted.find((h) => h >= now) ?? sorted[0] ?? null;
}

/** Longest occupied range among rooms whose purifier the scenario runs when occupied. */
function purifierWindow(s: Scenario): HourRange | null {
  const ranges = s.rooms.filter((r) => r.purifier && r.runWhenOccupied).flatMap((r) => r.occupancy);
  const longest = [...ranges].sort((a, b) => rangeHours(b) - rangeHours(a))[0];
  return longest ? { fromHour: longest.fromHour, toHour: longest.toHour } : null;
}

function cookingWindow(s: Scenario, now: number, offset: number): HourRange | null {
  const meal = nextOf(s.cooking.mealHours, now);
  return meal === null ? null : oneHour(meal + offset);
}

function cleanestWindow(timeline: Timeline, cfg: AppConfig): HourRange | null {
  const [first] = [...cleanestHours(timeline, cfg.factors.schedules.airingWindow.value)];
  return first === undefined ? null : oneHour(timeline.localHours[first] ?? 0);
}

/** When to do an action today (FR-6). Null for all-day or one-off actions. */
export function timeWindowFor(
  profile: Profile,
  action: ActionDef,
  timeline: Timeline,
  cfg: AppConfig,
): HourRange | null {
  const now = timeline.localHours[0] ?? 0;
  const s = applyModifies(baselineScenario(profile, cfg), action.modifies, cfg);
  const schedules = cfg.factors.schedules;
  switch (action.modifies.type) {
    case 'runPurifier':
    case 'addPurifier':
      return purifierWindow(s);
    case 'airAtCleanestHour':
      return cleanestWindow(timeline, cfg);
    case 'airKitchenAfterMeals':
      return cookingWindow(s, now, 1);
    case 'closeKitchenDoor':
    case 'addChimney':
    case 'scaleCooking':
      return cookingWindow(s, now, 0);
    case 'setIncense': {
      const hour = nextOf(schedules.incenseHours.value, now);
      return hour === null ? null : oneHour(hour);
    }
    case 'replaceCoil': {
      const hours = schedules.coilHours.value;
      return { fromHour: hours[0] ?? 21, toHour: ((hours.at(-1) ?? 4) + 1) % 24 };
    }
    default:
      return null;
  }
}

/** Keeps the best-ranked action of each choice group (bus vs metro, skip vs one incense stick). */
export function onePerGroup(ranked: RankedAction[]): RankedAction[] {
  const seen = new Set<string>();
  return ranked.filter(({ action }) => {
    if (!action.group) return true;
    if (seen.has(action.group)) return false;
    seen.add(action.group);
    return true;
  });
}

/** The engine's top 8, with displayed numbers and time windows, for the plan writer (no names). */
export function planCandidates(
  profile: Profile,
  ranked: RankedAction[],
  timeline: Timeline,
  titleOf: (actionId: string) => string,
  cfg: AppConfig,
): PlanCandidate[] {
  return onePerGroup(ranked)
    .slice(0, PLAN_CANDIDATES)
    .map(({ action, tula }) => {
      const d = displayTula(tula);
      return {
        actionId: action.id,
        title: titleOf(action.id),
        costTier: action.costTier,
        numbers: { inhaledTotal: d.inhaledTotal, pmG: d.pmG, co2Kg: d.co2Kg, rupees: d.rupees },
        confidence: d.confidence,
        timeWindow: timeWindowFor(profile, action, timeline, cfg),
      };
    });
}

/** Counts only: what the AI may know about the household. */
export function householdSummary(profile: Profile): HouseholdSummary {
  const m = profile.members;
  return {
    people: m.length,
    children: m.filter((x) => x.ageGroup === 'child').length,
    elders: m.filter((x) => x.ageGroup === 'elder').length,
    sensitive: m.filter((x) => x.sensitive).length,
    rooms: profile.rooms.length,
    purifiers: profile.rooms.filter((r) => r.purifierId).length,
  };
}

/** Average outdoor PM2.5 over the next 24 h, rounded to whole µg/m³ as displayed. */
export function outdoorMean(timeline: Timeline): number {
  const next = timeline.cOut.slice(0, EXPOSURE_HOURS);
  return next.length === 0 ? 0 : Math.round(next.reduce((s, v) => s + v, 0) / next.length);
}
