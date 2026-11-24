import type { AppConfig } from '@/config';
import {
  numberValue,
  type HourRange,
  type Modifies,
  type Occupancy,
  type Profile,
  type RoomKind,
  type WindowType,
} from '@/domain';
import { inHourRange } from './timeline';

export interface ScenarioPurifier {
  id: string;
  cadr: number;
  watts: number;
  /** True when the model was unknown and a default CADR is used. */
  defaulted: boolean;
}

export interface ScenarioRoom {
  id: string;
  kind: RoomKind;
  volumeM3: number;
  windowType: WindowType;
  windowDefaulted: boolean;
  purifier: ScenarioPurifier | null;
  baseHours: HourRange | null;
  runWhenOccupied: boolean;
  occupancy: Occupancy[];
}

/** Today's habits, or habits after one action. Everything the engine needs, already resolved. */
export interface Scenario {
  rooms: ScenarioRoom[];
  cooking: {
    fuel: Profile['cooking']['fuel'];
    mealsPerDay: number;
    mealHours: number[];
    chimney: boolean;
    kitchenDoor: boolean;
    /** Multiplier on cooking PM2.5 and fuel (1 = unchanged). */
    scale: number;
  };
  incensePerDay: number;
  coilNightsPerWeek: number;
  vaporiser: boolean;
  smokerIndoors: boolean;
  commute: Profile['commute'];
  airing: { cleanestHour: boolean; kitchenAfterMeals: boolean };
  addedPurifier: ScenarioPurifier | null;
}

/** Purifier settings from purifiers.json; unknown ids use the "unknown" defaults. */
export function purifierFor(id: string, cfg: AppConfig): ScenarioPurifier {
  const known = cfg.purifiers.find((p) => p.id === id);
  const entry = known ?? cfg.purifiers.find((p) => p.id === 'unknown');
  if (!entry) throw new Error('purifiers.json must contain an "unknown" entry');
  const defaulted = !known || id === 'unknown';
  return {
    id: entry.id,
    cadr: numberValue(entry.cadr),
    watts: numberValue(entry.watts),
    defaulted,
  };
}

/** Occupied by anyone at this local hour. */
export function isOccupied(room: ScenarioRoom, hour: number): boolean {
  return room.occupancy.some((o) => inHourRange(hour, o));
}

/** Member-hours per day spent in the room. */
export function memberHours(room: ScenarioRoom): number {
  let total = 0;
  for (let h = 0; h < 24; h++) total += room.occupancy.filter((o) => inHourRange(h, o)).length;
  return total;
}

/** Scenario for today's habits (the baseline every action is compared with). */
export function baselineScenario(profile: Profile, cfg: AppConfig): Scenario {
  const { cooking, sources } = profile;
  return {
    rooms: profile.rooms.map((r) => ({
      id: r.id,
      kind: r.kind,
      volumeM3: r.areaM2 * r.heightM,
      windowType: r.windowType ?? 'average',
      windowDefaulted: r.windowType === undefined,
      purifier: r.purifierId ? purifierFor(r.purifierId, cfg) : null,
      baseHours: r.purifierHours ?? null,
      runWhenOccupied: false,
      occupancy: r.occupancy,
    })),
    cooking: { ...cooking, mealHours: cooking.mealHours.slice(0, cooking.mealsPerDay), scale: 1 },
    incensePerDay: sources.incensePerDay,
    coilNightsPerWeek: sources.coilNightsPerWeek,
    vaporiser: false,
    smokerIndoors: sources.smokerIndoors,
    commute: profile.commute,
    airing: { cleanestHour: false, kitchenAfterMeals: false },
    addedPurifier: null,
  };
}

function addPurifier(s: Scenario, purifier: ScenarioPurifier, kind: RoomKind): Scenario {
  const candidates = s.rooms.filter((r) => r.kind === kind && !r.purifier);
  const target = [...candidates].sort((a, b) => memberHours(b) - memberHours(a))[0];
  if (!target) return s;
  const rooms = s.rooms.map((r) => (r === target ? { ...r, purifier, runWhenOccupied: true } : r));
  return { ...s, rooms, addedPurifier: purifier };
}

function runPurifier(s: Scenario, kind: RoomKind | undefined): Scenario {
  const rooms = s.rooms.map((r) =>
    r.purifier && (!kind || r.kind === kind) ? { ...r, runWhenOccupied: true } : r,
  );
  return { ...s, rooms };
}

function applyIndoor(s: Scenario, m: Modifies, cfg: AppConfig): Scenario | null {
  switch (m.type) {
    case 'runPurifier':
      return runPurifier(s, m.roomKind);
    case 'addPurifier':
      return addPurifier(s, purifierFor(m.purifierId, cfg), m.roomKind);
    case 'airAtCleanestHour':
      return { ...s, airing: { ...s.airing, cleanestHour: true } };
    case 'airKitchenAfterMeals':
      return { ...s, airing: { ...s.airing, kitchenAfterMeals: true } };
    case 'sealWindows':
      return {
        ...s,
        rooms: s.rooms.map((r) => (r.windowType === 'leaky' ? { ...r, windowType: 'average' } : r)),
      };
    default:
      return null;
  }
}

function applyHabits(s: Scenario, m: Modifies, cfg: AppConfig): Scenario {
  switch (m.type) {
    case 'closeKitchenDoor':
      return { ...s, cooking: { ...s.cooking, kitchenDoor: true } };
    case 'addChimney':
      return { ...s, cooking: { ...s.cooking, chimney: true } };
    case 'scaleCooking':
      return {
        ...s,
        cooking: {
          ...s.cooking,
          scale: s.cooking.scale * cfg.factors.behaviour[m.factorKey].value,
        },
      };
    case 'setFuel':
      return { ...s, cooking: { ...s.cooking, fuel: m.fuel } };
    case 'setIncense':
      return { ...s, incensePerDay: Math.min(s.incensePerDay, m.perDay) };
    case 'replaceCoil':
      return { ...s, vaporiser: true };
    case 'smokeOutside':
      return { ...s, smokerIndoors: false };
    case 'setCommuteMode':
      return { ...s, commute: { ...s.commute, mode: m.mode } };
    case 'scaleCommute': {
      const { kmPerDay, daysPerWeek } = s.commute;
      return {
        ...s,
        commute: {
          ...s.commute,
          kmPerDay: kmPerDay * m.kmFactor,
          daysPerWeek: Math.max(0, daysPerWeek - m.daysLess),
        },
      };
    }
    default:
      return s;
  }
}

/** The scenario after one action's change (pure). */
export function applyModifies(s: Scenario, m: Modifies, cfg: AppConfig): Scenario {
  return applyIndoor(s, m, cfg) ?? applyHabits(s, m, cfg);
}
