import type { HourRange, Profile } from '@/domain';
import { rangeHours } from './plan';
import { inHourRange } from './timeline';

/** When to run a room's purifier: while the room is occupied (FR-16). */
export interface PurifierSlot {
  roomId: string;
  roomName: string;
  range: HourRange;
  hours: number;
}

/** A "done" tap: the purifier ran for a slot on a local date (YYYY-MM-DD). */
export interface PurifierLogEntry {
  date: string;
  roomId: string;
  hours: number;
}

/** One slot per room with a purifier: its longest occupied range. */
export function purifierSlots(profile: Profile): PurifierSlot[] {
  return profile.rooms.flatMap((room) => {
    if (!room.purifierId) return [];
    const longest = [...room.occupancy].sort((a, b) => rangeHours(b) - rangeHours(a))[0];
    if (!longest) return [];
    const range = { fromHour: longest.fromHour, toHour: longest.toHour };
    return [{ roomId: room.id, roomName: room.name, range, hours: rangeHours(range) }];
  });
}

/** The slot to nudge about at this local hour, if any. */
export function activeSlot(slots: PurifierSlot[], localHour: number): PurifierSlot | null {
  return slots.find((s) => inHourRange(localHour, s.range)) ?? null;
}

export function isDone(log: PurifierLogEntry[], slot: PurifierSlot, date: string): boolean {
  return log.some((e) => e.date === date && e.roomId === slot.roomId);
}

/** Adds a "done" entry (once per room per day). */
export function logDone(
  log: PurifierLogEntry[],
  slot: PurifierSlot,
  date: string,
): PurifierLogEntry[] {
  if (isDone(log, slot, date)) return log;
  return [...log, { date, roomId: slot.roomId, hours: slot.hours }];
}

const DAY_MS = 86_400_000;

/** Purifier hours logged over the 7 days ending on `today` (YYYY-MM-DD), today included. */
export function weeklyHours(log: PurifierLogEntry[], today: string): number {
  const end = Date.parse(`${today}T00:00:00Z`);
  return log
    .filter((e) => {
      const day = Date.parse(`${e.date}T00:00:00Z`);
      return day <= end && day > end - 7 * DAY_MS;
    })
    .reduce((sum, e) => sum + e.hours, 0);
}
