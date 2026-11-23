import { z } from 'zod';
import {
  ForecastSchema,
  MIN_FORECAST_HOURS,
  type Forecast,
  type ForecastHour,
  type Place,
} from '@/domain/forecast';
import { roundCoord } from '@/domain/geo';
import { ProviderError } from '@/lib/errors';
import { fetchJson, type FetchLike } from '@/lib/http';

const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

/** Shown on screen next to every forecast (FR-2). */
export const OPEN_METEO_SOURCE = 'Open-Meteo Air Quality API (CAMS)';

/** 6 days requested so that ≥ 96 valid hours from local midnight remain after the model horizon. */
const FORECAST_DAYS = 6;
const PLACE_RESULTS = 5;
const LOCAL_HOUR = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

const RawAirQualitySchema = z.object({
  timezone: z.string(),
  utc_offset_seconds: z.number(),
  hourly: z.object({
    time: z.array(z.string()),
    pm2_5: z.array(z.number().nullable()),
  }),
});
type RawAirQuality = z.infer<typeof RawAirQualitySchema>;

const RawGeocodeSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
});

export interface ProviderDeps {
  fetchImpl?: FetchLike;
  now?: () => Date;
}

/** Air-quality request URL; coordinates are rounded before leaving the server. */
export function airQualityUrl(lat: number, lon: number): string {
  const params = new URLSearchParams({
    latitude: roundCoord(lat).toFixed(2),
    longitude: roundCoord(lon).toFixed(2),
    hourly: 'pm2_5',
    forecast_days: String(FORECAST_DAYS),
    timezone: 'auto',
  });
  return `${AIR_QUALITY_URL}?${params.toString()}`;
}

/** Converts Open-Meteo local wall time ("2026-11-24T05:30") to a UTC ISO string. */
export function localToUtcIso(local: string, utcOffsetSeconds: number): string {
  if (!LOCAL_HOUR.test(local)) throw new ProviderError('parse');
  const ms = Date.parse(`${local}:00Z`) - utcOffsetSeconds * 1000;
  if (Number.isNaN(ms)) throw new ProviderError('parse');
  return new Date(ms).toISOString();
}

/** Contiguous hours from local midnight up to the first missing value (end of the model horizon). */
function toHours(raw: RawAirQuality): ForecastHour[] {
  const hours: ForecastHour[] = [];
  for (const [index, local] of raw.hourly.time.entries()) {
    const pm25 = raw.hourly.pm2_5[index];
    if (pm25 === null || pm25 === undefined) break;
    hours.push({ time: localToUtcIso(local, raw.utc_offset_seconds), pm25 });
  }
  return hours;
}

/** Fetches the hourly PM2.5 forecast (FR-2). Throws ProviderError on failure or < 96 hours. */
export async function fetchPm25Forecast(
  lat: number,
  lon: number,
  deps: ProviderDeps = {},
): Promise<Forecast> {
  const raw = RawAirQualitySchema.safeParse(await fetchJson(airQualityUrl(lat, lon), deps));
  if (!raw.success) throw new ProviderError('parse');
  const hours = toHours(raw.data);
  if (hours.length < MIN_FORECAST_HOURS) throw new ProviderError('incomplete');
  const forecast = ForecastSchema.safeParse({
    source: OPEN_METEO_SOURCE,
    fetchedAt: (deps.now?.() ?? new Date()).toISOString(),
    timezone: raw.data.timezone,
    lat: roundCoord(lat),
    lon: roundCoord(lon),
    hours,
  });
  if (!forecast.success) throw new ProviderError('parse');
  return forecast.data;
}

/** City search via Open-Meteo geocoding. */
export async function searchPlaces(
  query: string,
  lang: 'en' | 'hi',
  deps: ProviderDeps = {},
): Promise<Place[]> {
  const params = new URLSearchParams({
    name: query,
    count: String(PLACE_RESULTS),
    language: lang,
    format: 'json',
  });
  const raw = RawGeocodeSchema.safeParse(
    await fetchJson(`${GEOCODING_URL}?${params.toString()}`, deps),
  );
  if (!raw.success) throw new ProviderError('parse');
  return (raw.data.results ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    admin1: r.admin1,
    country: r.country,
    lat: r.latitude,
    lon: r.longitude,
  }));
}
