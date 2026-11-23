import * as z from 'zod/mini';
import { ForecastSchema, roundCoord, type Forecast } from '@/domain';

const PLACE_KEY = 'vayutula.place';
const FORECAST_KEY = 'vayutula.lastForecast';

/** The place the forecast is shown for. `device` places come from browser location. */
export const SelectedPlaceSchema = z.object({
  kind: z.enum(['search', 'device']),
  name: z.string().check(z.maxLength(200)),
  detail: z.optional(z.string().check(z.maxLength(300))),
  lat: z.number().check(z.gte(-90), z.lte(90)),
  lon: z.number().check(z.gte(-180), z.lte(180)),
});
export type SelectedPlace = z.infer<typeof SelectedPlaceSchema>;

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

/** Last chosen place, or null. */
export function loadPlace(): SelectedPlace | null {
  const parsed = SelectedPlaceSchema.safeParse(read(PLACE_KEY));
  return parsed.success ? parsed.data : null;
}

/** Remembers the chosen place, rounded to 2 decimals. */
export function savePlace(place: SelectedPlace): void {
  write(PLACE_KEY, { ...place, lat: roundCoord(place.lat), lon: roundCoord(place.lon) });
}

/** Keeps the last good forecast on this device for when the network fails. */
export function saveForecast(forecast: Forecast): void {
  write(FORECAST_KEY, forecast);
}

/** Saved forecast for the same rounded location, or null. */
export function loadSavedForecast(lat: number, lon: number): Forecast | null {
  const parsed = ForecastSchema.safeParse(read(FORECAST_KEY));
  if (!parsed.success) return null;
  const same = parsed.data.lat === roundCoord(lat) && parsed.data.lon === roundCoord(lon);
  return same ? parsed.data : null;
}
