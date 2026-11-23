import {
  ForecastResponseSchema,
  GeocodeResponseSchema,
  roundCoord,
  type ForecastResponse,
  type Place,
} from '@/domain';
import type { Lang } from '@/i18n';

/** Failure calling our own API. `status` is 0 for a network error. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`api ${status}`);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { accept: 'application/json' } });
  } catch {
    throw new ApiError(0);
  }
  if (!response.ok) throw new ApiError(response.status);
  return (await response.json()) as unknown;
}

/** GET /api/forecast with the location rounded to 2 decimals before it leaves the browser. */
export async function fetchForecast(lat: number, lon: number): Promise<ForecastResponse> {
  const params = new URLSearchParams({
    lat: roundCoord(lat).toFixed(2),
    lon: roundCoord(lon).toFixed(2),
  });
  return ForecastResponseSchema.parse(await getJson(`/api/forecast?${params.toString()}`));
}

/** GET /api/geocode. */
export async function fetchPlaces(query: string, lang: Lang): Promise<Place[]> {
  const params = new URLSearchParams({ q: query, lang });
  return GeocodeResponseSchema.parse(await getJson(`/api/geocode?${params.toString()}`)).places;
}
