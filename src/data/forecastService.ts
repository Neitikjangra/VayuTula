import type { Forecast, ForecastResponse, Place } from '@/domain/forecast';
import { roundCoord } from '@/domain/geo';
import type { FetchLike } from '@/lib/http';
import { TtlCache, locationKey } from './cache';
import { fetchPm25Forecast, searchPlaces as searchOpenMeteo } from './openMeteo';

const MINUTE_MS = 60 * 1000;
/** FR-2: forecast cached 1 hour per rounded location. */
export const FORECAST_TTL_MS = 60 * MINUTE_MS;
const PLACES_TTL_MS = 24 * 60 * MINUTE_MS;

export interface ForecastServiceDeps {
  fetchImpl?: FetchLike;
  now?: () => number;
}

export interface ForecastService {
  getForecast(lat: number, lon: number): Promise<ForecastResponse>;
  searchPlaces(query: string, lang: 'en' | 'hi'): Promise<Place[]>;
}

function minutesBetween(from: number, to: number): number {
  return Math.max(0, Math.floor((to - from) / MINUTE_MS));
}

/** Forecast and place lookups with caching and stale-on-error fallback. */
export function createForecastService(deps: ForecastServiceDeps = {}): ForecastService {
  const now = deps.now ?? Date.now;
  const forecasts = new TtlCache<Forecast>(FORECAST_TTL_MS);
  const places = new TtlCache<Place[]>(PLACES_TTL_MS);

  async function getForecast(lat: number, lon: number): Promise<ForecastResponse> {
    const key = locationKey(lat, lon);
    const t = now();
    const hit = forecasts.getFresh(key, t);
    if (hit)
      return { forecast: hit.value, stale: false, ageMinutes: minutesBetween(hit.storedAt, t) };
    try {
      const providerDeps = { fetchImpl: deps.fetchImpl, now: () => new Date(t) };
      const forecast = await fetchPm25Forecast(roundCoord(lat), roundCoord(lon), providerDeps);
      forecasts.set(key, forecast, t);
      return { forecast, stale: false, ageMinutes: 0 };
    } catch (error) {
      const old = forecasts.getStale(key);
      if (!old) throw error;
      return { forecast: old.value, stale: true, ageMinutes: minutesBetween(old.storedAt, t) };
    }
  }

  async function searchPlaces(query: string, lang: 'en' | 'hi'): Promise<Place[]> {
    const key = `${lang}:${query.trim().toLowerCase()}`;
    const hit = places.getFresh(key, now());
    if (hit) return hit.value;
    const result = await searchOpenMeteo(query.trim(), lang, { fetchImpl: deps.fetchImpl });
    places.set(key, result, now());
    return result;
  }

  return { getForecast, searchPlaces };
}
