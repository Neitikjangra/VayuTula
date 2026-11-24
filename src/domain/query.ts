import * as z from 'zod/mini';
import { GEOCODE_MAX_CHARS, GEOCODE_MIN_CHARS } from './limits';

const DECIMAL = /^-?\d{1,3}(\.\d{1,8})?$/;

function coordinate(min: number, max: number) {
  return z.pipe(
    z.pipe(z.string().check(z.regex(DECIMAL)), z.transform(Number)),
    z.number().check(z.gte(min), z.lte(max)),
  );
}

/** Query for GET /api/forecast. Strings only, so "" or "abc" never coerce to 0. */
export const ForecastQuerySchema = z.object({
  lat: coordinate(-90, 90),
  lon: coordinate(-180, 180),
});
export type ForecastQuery = z.infer<typeof ForecastQuerySchema>;

export { GEOCODE_MAX_CHARS, GEOCODE_MIN_CHARS } from './limits';

/** Query for GET /api/geocode. The query is trimmed before its length is checked. */
export const GeocodeQuerySchema = z.object({
  q: z.string().check(z.trim(), z.minLength(GEOCODE_MIN_CHARS), z.maxLength(GEOCODE_MAX_CHARS)),
  lang: z._default(z.enum(['en', 'hi']), 'en'),
});
export type GeocodeQuery = z.infer<typeof GeocodeQuerySchema>;
