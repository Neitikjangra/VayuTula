import type { Forecast } from '@/domain';
import { roundCoord } from '@/domain/geo';
import type { SelectedPlace } from './selectedPlace';

export type { SelectedPlace } from './selectedPlace';

const PLACE_KEY = 'vayutula.place';
const FORECAST_KEY = 'vayutula.lastForecast';

function read(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage blocked or full: the app still works, only offline fallback is lost.
  }
}

/** The stored place before validation (parse it with `parsePlace`). */
export function readPlaceRaw(): unknown {
  return read(PLACE_KEY);
}

/** Last chosen place, validated, or null. The schema loads only when a place is stored. */
export async function loadPlace(): Promise<SelectedPlace | null> {
  const raw = readPlaceRaw();
  if (raw === null) return null;
  const { parsePlace } = await import('./selectedPlace');
  return parsePlace(raw);
}

/** Remembers the chosen place, rounded to 2 decimals. */
export function savePlace(place: SelectedPlace): void {
  write(PLACE_KEY, { ...place, lat: roundCoord(place.lat), lon: roundCoord(place.lon) });
}

/** Keeps the last good forecast on this device for when the network fails. */
export function saveForecast(forecast: Forecast): void {
  write(FORECAST_KEY, forecast);
}

/** Saved forecast for the same rounded location, validated, or null. */
export async function loadSavedForecast(lat: number, lon: number): Promise<Forecast | null> {
  const raw = read(FORECAST_KEY);
  if (raw === null) return null;
  const { ForecastSchema } = await import('@/domain/forecast');
  const parsed = ForecastSchema.safeParse(raw);
  if (!parsed.success) return null;
  const same = parsed.data.lat === roundCoord(lat) && parsed.data.lon === roundCoord(lon);
  return same ? parsed.data : null;
}
