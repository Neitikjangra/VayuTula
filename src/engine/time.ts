const MINUTE_MS = 60_000;

/** Whole minutes elapsed since `isoTime` at `nowMs`; 0 if negative or unreadable. */
export function minutesSince(isoTime: string, nowMs: number): number {
  const then = Date.parse(isoTime);
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((nowMs - then) / MINUTE_MS));
}
