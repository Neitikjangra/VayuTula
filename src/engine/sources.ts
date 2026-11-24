import type { AppConfig } from '@/config';
import type { Fuel, RoomKind } from '@/domain';
import type { Scenario } from './scenario';
import type { Timeline } from './timeline';

type EmissionKey = keyof AppConfig['factors']['emission'];

const COOKING_EMISSION: Record<Fuel, EmissionKey> = {
  lpg: 'cookingLpgPerMeal',
  png: 'cookingPngPerMeal',
  induction: 'cookingInductionPerMeal',
  biomass: 'cookingBiomassPerMeal',
};

/** Config key of the indoor PM2.5 emitted per meal for a fuel. */
export function cookingEmissionKey(fuel: Fuel): EmissionKey {
  return COOKING_EMISSION[fuel];
}

function roomIndex(s: Scenario, kind: RoomKind): number {
  return s.rooms.findIndex((r) => r.kind === kind);
}

/** How many of `count` daily events fall on `hour`, cycling through the schedule. */
export function eventsAt(hour: number, count: number, schedule: number[]): number {
  if (schedule.length === 0) return 0;
  let n = 0;
  for (let i = 0; i < count; i++) if (schedule[i % schedule.length] === hour) n++;
  return n;
}

function addCooking(s: Scenario, timeline: Timeline, cfg: AppConfig, out: number[][]): void {
  const f = cfg.factors;
  const chimney = s.cooking.chimney ? 1 - f.behaviour.chimneyCapture.value : 1;
  const perMeal = f.emission[cookingEmissionKey(s.cooking.fuel)].value * s.cooking.scale * chimney;
  const kitchen = roomIndex(s, 'kitchen');
  const living = roomIndex(s, 'living');
  const leak =
    kitchen >= 0 && living >= 0 && !s.cooking.kitchenDoor ? f.behaviour.kitchenLeakShare.value : 0;
  const main = kitchen >= 0 ? kitchen : Math.max(living, 0);
  timeline.localHours.forEach((hour, t) => {
    const meals = s.cooking.mealHours.filter((h) => h === hour).length;
    if (meals === 0) return;
    out[main]![t]! += meals * perMeal * (1 - leak);
    if (leak > 0) out[living]![t]! += meals * perMeal * leak;
  });
}

function addScheduled(
  target: number,
  perEvent: number,
  count: number,
  schedule: number[],
  timeline: Timeline,
  out: number[][],
): void {
  timeline.localHours.forEach((hour, t) => {
    out[target]![t]! += eventsAt(hour, count, schedule) * perEvent;
  });
}

function addCoils(s: Scenario, timeline: Timeline, cfg: AppConfig, out: number[][]): void {
  if (s.vaporiser || s.coilNightsPerWeek === 0) return;
  const hours = cfg.factors.schedules.coilHours.value;
  const perHour =
    (cfg.factors.emission.coilPerNight.value * (s.coilNightsPerWeek / 7)) / hours.length;
  const bedrooms = s.rooms.flatMap((r, i) => (r.kind === 'bedroom' ? [i] : []));
  const targets = bedrooms.length > 0 ? bedrooms : [0];
  timeline.localHours.forEach((hour, t) => {
    if (!hours.includes(hour)) return;
    for (const r of targets) out[r]![t]! += perHour;
  });
}

/** Indoor PM2.5 emitted in each room each hour (µg/h), indexed [room][hour]. */
export function sourceSeries(s: Scenario, timeline: Timeline, cfg: AppConfig): number[][] {
  const out = s.rooms.map(() => timeline.cOut.map(() => 0));
  const living = Math.max(roomIndex(s, 'living'), 0);
  const f = cfg.factors;
  addCooking(s, timeline, cfg, out);
  addScheduled(
    living,
    f.emission.incensePerStick.value,
    s.incensePerDay,
    f.schedules.incenseHours.value,
    timeline,
    out,
  );
  addCoils(s, timeline, cfg, out);
  if (s.smokerIndoors) {
    const count = f.behaviour.cigarettesPerDayIndoors.value;
    addScheduled(
      living,
      f.emission.cigarette.value,
      count,
      f.schedules.smokingHours.value,
      timeline,
      out,
    );
  }
  return out;
}
