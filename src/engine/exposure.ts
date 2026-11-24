import type { Member } from '@/domain';
import type { ScenarioRoom } from './scenario';
import { EXPOSURE_HOURS, inHourRange } from './timeline';

/** Room a member is in at a local hour (first matching occupancy), or -1 when away. */
export function roomOf(memberId: string, hour: number, rooms: ScenarioRoom[]): number {
  return rooms.findIndex((r) =>
    r.occupancy.some((o) => o.memberId === memberId && inHourRange(hour, o)),
  );
}

/**
 * Breathe-in pan: Σ indoor C over the hours each member spends in each room,
 * for the first `hours` simulated hours (µg·h/m³). Hours away from home count 0.
 */
export function memberExposure(
  members: Member[],
  rooms: ScenarioRoom[],
  series: number[][],
  localHours: number[],
  hours = EXPOSURE_HOURS,
): Record<string, number> {
  const span = Math.min(hours, localHours.length);
  return Object.fromEntries(
    members.map((m) => {
      let sum = 0;
      for (let t = 0; t < span; t++) {
        const r = roomOf(m.id, localHours[t] ?? 0, rooms);
        if (r >= 0) sum += series[r]?.[t] ?? 0;
      }
      return [m.id, sum];
    }),
  );
}
