import * as z from 'zod/mini';

/** The place the forecast is shown for. `device` places come from browser location. */
export const SelectedPlaceSchema = z.object({
  kind: z.enum(['search', 'device']),
  name: z.string().check(z.maxLength(200)),
  detail: z.optional(z.string().check(z.maxLength(300))),
  lat: z.number().check(z.gte(-90), z.lte(90)),
  lon: z.number().check(z.gte(-180), z.lte(180)),
});
export type SelectedPlace = z.infer<typeof SelectedPlaceSchema>;

/** A validated place from untrusted stored data, or null. */
export function parsePlace(raw: unknown): SelectedPlace | null {
  const parsed = SelectedPlaceSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
