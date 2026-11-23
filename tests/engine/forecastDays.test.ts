import { describe, expect, it } from 'vitest';
import type { Forecast } from '@/domain/forecast';
import {
  FORECAST_VIEW_DAYS,
  forecastPeak,
  groupForecastByDay,
  localDate,
} from '@/engine/forecastDays';

const HOUR_MS = 3_600_000;

/** Hourly forecast starting at local midnight 24 Nov in India (18:30 UTC on 23 Nov). */
function makeForecast(
  values: number[],
  timezone = 'Asia/Kolkata',
  startIso = '2026-11-23T18:30:00.000Z',
): Forecast {
  const start = Date.parse(startIso);
  return {
    source: 'test',
    fetchedAt: startIso,
    timezone,
    lat: 28.54,
    lon: 77.39,
    hours: values.map((pm25, i) => ({ time: new Date(start + i * HOUR_MS).toISOString(), pm25 })),
  };
}

describe('localDate()', () => {
  it('uses the forecast time zone, not UTC', () => {
    expect(localDate('2026-11-23T18:30:00.000Z', 'Asia/Kolkata')).toBe('2026-11-24');
    expect(localDate('2026-11-23T18:30:00.000Z', 'UTC')).toBe('2026-11-23');
  });
});

describe('groupForecastByDay()', () => {
  const values = Array.from({ length: 102 }, (_, i) => 40 + i + 0.4);
  const days = groupForecastByDay(makeForecast(values));

  it('returns 4 local calendar days of 24 hours each', () => {
    expect(days).toHaveLength(FORECAST_VIEW_DAYS);
    expect(days.map((d) => d.date)).toEqual([
      '2026-11-24',
      '2026-11-25',
      '2026-11-26',
      '2026-11-27',
    ]);
    expect(days.every((d) => d.hours.length === 24)).toBe(true);
  });

  it('rounds PM2.5 to whole µg/m³ as displayed', () => {
    expect(days[0]?.hours[0]).toEqual({ time: '2026-11-23T18:30:00.000Z', pm25: 40 });
    expect(
      groupForecastByDay(makeForecast(Array.from({ length: 24 }, () => 12.5)))[0]?.hours[0]?.pm25,
    ).toBe(13);
  });

  it('reports each day’s min and max from the displayed (rounded) values', () => {
    expect(days[0]).toMatchObject({ min: 40, max: 63 });
    expect(days[3]).toMatchObject({ min: 112, max: 135 });
  });

  it('keeps every hour in exactly one day, in order', () => {
    const flat = days.flatMap((d) => d.hours.map((h) => h.time));
    expect(flat).toEqual([...flat].sort());
    expect(new Set(flat).size).toBe(96);
  });

  it('returns fewer days when the forecast is shorter', () => {
    expect(groupForecastByDay(makeForecast(Array.from({ length: 30 }, () => 50)))).toHaveLength(2);
  });

  it('honours a custom number of days', () => {
    expect(groupForecastByDay(makeForecast(values), 2)).toHaveLength(2);
  });
});

describe('forecastPeak()', () => {
  it('is the highest displayed value across the shown days', () => {
    const days = groupForecastByDay(
      makeForecast([10, 250.6, 30, ...Array.from({ length: 100 }, () => 5)]),
    );
    expect(forecastPeak(days)).toBe(251);
  });

  it('is 0 for no days', () => {
    expect(forecastPeak([])).toBe(0);
  });
});
