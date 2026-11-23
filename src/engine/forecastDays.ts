import type { Forecast } from '@/domain/forecast';

/** FR-2 view: today plus the next three days. */
export const FORECAST_VIEW_DAYS = 4;

/** One displayed hour. `pm25` is rounded to whole µg/m³, exactly as shown. */
export interface DayHour {
  time: string;
  pm25: number;
}

/** One local calendar day of the forecast. */
export interface ForecastDay {
  /** Local date in the forecast's time zone, YYYY-MM-DD. */
  date: string;
  hours: DayHour[];
  min: number;
  max: number;
}

function dateFormatter(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/** Local calendar date (YYYY-MM-DD) of a UTC ISO time in `timeZone`. */
export function localDate(isoTime: string, timeZone: string): string {
  return dateFormatter(timeZone).format(new Date(isoTime));
}

function summarise(date: string, hours: DayHour[]): ForecastDay {
  const values = hours.map((h) => h.pm25);
  return { date, hours, min: Math.min(...values), max: Math.max(...values) };
}

/**
 * Groups forecast hours into local calendar days (forecast time zone) and rounds
 * PM2.5 for display. Returns at most `days` days, in time order.
 */
export function groupForecastByDay(forecast: Forecast, days = FORECAST_VIEW_DAYS): ForecastDay[] {
  const format = dateFormatter(forecast.timezone);
  const byDate = new Map<string, DayHour[]>();
  for (const hour of forecast.hours) {
    const date = format.format(new Date(hour.time));
    if (!byDate.has(date) && byDate.size === days) break;
    const bucket = byDate.get(date) ?? [];
    bucket.push({ time: hour.time, pm25: Math.round(hour.pm25) });
    byDate.set(date, bucket);
  }
  return [...byDate].map(([date, hours]) => summarise(date, hours));
}

/** Highest displayed PM2.5 across days; scales the hourly bars. 0 when empty. */
export function forecastPeak(days: ForecastDay[]): number {
  return days.reduce((peak, day) => Math.max(peak, day.max), 0);
}
