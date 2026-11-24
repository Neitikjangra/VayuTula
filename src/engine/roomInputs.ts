import type { AppConfig } from '@/config';
import type { RoomHourly } from './indoor';
import { isOccupied, type Scenario, type ScenarioRoom } from './scenario';
import { sourceSeries } from './sources';
import { inHourRange, type Timeline } from './timeline';

/** Index of the cleanest daytime hour in each 24-hour block of the timeline. */
export function cleanestHours(timeline: Timeline, window: number[]): Set<number> {
  const [first = 7, last = 18] = window;
  const picks = new Set<number>();
  for (let block = 0; block < timeline.cOut.length; block += 24) {
    let best = -1;
    for (let t = block; t < Math.min(block + 24, timeline.cOut.length); t++) {
      const hour = timeline.localHours[t] ?? -1;
      if (hour < first || hour > last) continue;
      if (best < 0 || (timeline.cOut[t] ?? Infinity) < (timeline.cOut[best] ?? Infinity)) best = t;
    }
    if (best >= 0) picks.add(best);
  }
  return picks;
}

function airingHours(
  s: Scenario,
  room: ScenarioRoom,
  timeline: Timeline,
  cleanest: Set<number>,
): Set<number> {
  const hours = new Set(s.airing.cleanestHour ? cleanest : []);
  if (s.airing.kitchenAfterMeals && room.kind === 'kitchen') {
    const after = s.cooking.mealHours.map((h) => (h + 1) % 24);
    timeline.localHours.forEach((hour, t) => {
      if (after.includes(hour)) hours.add(t);
    });
  }
  return hours;
}

function purifierOn(room: ScenarioRoom, hour: number): number {
  if (!room.purifier) return 0;
  const scheduled = room.baseHours !== null && inHourRange(hour, room.baseHours);
  return scheduled || (room.runWhenOccupied && isOccupied(room, hour)) ? 1 : 0;
}

/** Hourly model inputs for every room in the scenario, in room order. */
export function buildRoomInputs(s: Scenario, timeline: Timeline, cfg: AppConfig): RoomHourly[] {
  const f = cfg.factors;
  const sources = sourceSeries(s, timeline, cfg);
  const cleanest = cleanestHours(timeline, f.schedules.airingWindow.value);
  return s.rooms.map((room, i) => {
    const airing = airingHours(s, room, timeline, cleanest);
    const a = f.airExchange[room.windowType].value;
    const p = f.penetration[room.windowType].value;
    return {
      volumeM3: room.volumeM3,
      deposition: f.deposition.value,
      airExchange: timeline.cOut.map((_, t) => (airing.has(t) ? f.airExchange.airing.value : a)),
      penetration: timeline.cOut.map((_, t) => (airing.has(t) ? f.penetration.airing.value : p)),
      purifierCadr: room.purifier?.cadr ?? 0,
      purifierFraction: timeline.localHours.map((hour) => purifierOn(room, hour)),
      sourceUgPerHour: sources[i] ?? timeline.cOut.map(() => 0),
    };
  });
}
