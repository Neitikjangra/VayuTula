import * as z from 'zod/mini';
import type { PurifierLogEntry } from '@/engine/nudge';

const LOG_KEY = 'vayutula.purifierLog';
/** Older entries are dropped: only the weekly count is shown. */
const KEEP_ENTRIES = 60;

const LogSchema = z.array(
  z.object({
    date: z.iso.date(),
    roomId: z.string().check(z.maxLength(40)),
    hours: z.number().check(z.gte(0), z.lte(24)),
  }),
);

/** The purifier "done" log saved on this device. */
export function loadLog(): PurifierLogEntry[] {
  try {
    const parsed = LogSchema.safeParse(JSON.parse(window.localStorage.getItem(LOG_KEY) ?? '[]'));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export function saveLog(log: PurifierLogEntry[]): void {
  try {
    window.localStorage.setItem(LOG_KEY, JSON.stringify(log.slice(-KEEP_ENTRIES)));
  } catch {
    // Storage blocked: the banner still works for this visit.
  }
}
