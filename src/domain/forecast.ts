// zod/mini keeps the browser bundle small; these schemas run on both client and server.
import * as z from 'zod/mini';

/** FR-2: a forecast must cover at least 4 full days counted from local midnight today. */
export const MIN_FORECAST_HOURS = 96;

const Latitude = z.number().check(z.gte(-90), z.lte(90));
const Longitude = z.number().check(z.gte(-180), z.lte(180));

/** One forecast hour: UTC ISO time and outdoor PM2.5 in µg/m³. */
export const ForecastHourSchema = z.object({
  time: z.iso.datetime(),
  pm25: z.number().check(z.gte(0), z.lte(2000)),
});
export type ForecastHour = z.infer<typeof ForecastHourSchema>;

/** Hourly outdoor PM2.5 forecast for one rounded location (PRD 4.1). */
export const ForecastSchema = z.object({
  source: z.string().check(z.minLength(1)),
  fetchedAt: z.iso.datetime(),
  timezone: z.string().check(z.minLength(1)),
  lat: Latitude,
  lon: Longitude,
  hours: z.array(ForecastHourSchema).check(z.minLength(MIN_FORECAST_HOURS)),
});
export type Forecast = z.infer<typeof ForecastSchema>;

/** A geocoding search result. */
export const PlaceSchema = z.object({
  id: z.int(),
  name: z.string().check(z.minLength(1)),
  admin1: z.optional(z.string()),
  country: z.optional(z.string()),
  lat: Latitude,
  lon: Longitude,
});
export type Place = z.infer<typeof PlaceSchema>;

/** Body of GET /api/forecast. `stale` is true when the provider failed and cached data is served. */
export const ForecastResponseSchema = z.object({
  forecast: ForecastSchema,
  stale: z.boolean(),
  ageMinutes: z.int().check(z.gte(0)),
});
export type ForecastResponse = z.infer<typeof ForecastResponseSchema>;

/** Body of GET /api/geocode. */
export const GeocodeResponseSchema = z.object({ places: z.array(PlaceSchema) });
export type GeocodeResponse = z.infer<typeof GeocodeResponseSchema>;
