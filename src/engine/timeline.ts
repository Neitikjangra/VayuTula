import { BREATHE_IN_HOURS, type Forecast, type HourRange } from '@/domain';

const HOUR_MS = 3_600_000;
/** FR-3: indoor levels are simulated 48 h ahead. */
export const HORIZON_HOURS = 48;
/** Breathe-in pan: exposure over the next 24 h. */
export const EXPOSURE_HOURS = BREATHE_IN_HOURS;

/** The simulated hours: UTC times, outdoor PM2.5 and local clock hour for each. */
export interface Timeline {
  times: string[];
  cOut: number[];
  localHours: number[];
}

/** True if `hour` falls in [fromHour, toHour); wraps past midnight when toHour <= fromHour. */
export function inHourRange(hour: number, range: HourRange): boolean {
  const { fromHour, toHour } = range;
  if (toHour > fromHour) return hour >= fromHour && hour < toHour;
  return hour >= fromHour || hour < toHour;
}

/** Local clock hours (0–23) of UTC times in `timeZone`. */
export function localHoursOf(times: string[], timeZone: string): number[] {
  const format = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone });
  return times.map((time) => Number(format.format(new Date(time))) % 24);
}

/**
 * Takes `hours` forecast hours starting with the hour that contains `startIso`.
 * Throws RangeError if the forecast does not reach that far.
 */
export function buildTimeline(
  forecast: Forecast,
  startIso: string,
  hours = HORIZON_HOURS,
): Timeline {
  const startMs = Date.parse(startIso);
  const first = forecast.hours.findIndex((h) => Date.parse(h.time) + HOUR_MS > startMs);
  if (Number.isNaN(startMs) || first < 0 || first + hours > forecast.hours.length) {
    throw new RangeError('forecast does not cover the simulation horizon');
  }
  const slice = forecast.hours.slice(first, first + hours);
  const times = slice.map((h) => h.time);
  return {
    times,
    cOut: slice.map((h) => h.pm25),
    localHours: localHoursOf(times, forecast.timezone),
  };
}
