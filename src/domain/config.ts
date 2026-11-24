import * as z from 'zod/mini';

/**
 * Every config number carries its unit, source and verification date (CLAUDE.md).
 * Unverified values keep `source: "TODO"` and `verifiedOn: null` and show as provisional.
 */
export const ConfigValueSchema = z.object({
  value: z.union([z.number(), z.array(z.number())]),
  unit: z.string().check(z.minLength(1)),
  source: z.string().check(z.minLength(1)),
  verifiedOn: z.nullable(z.iso.date()),
});
export type ConfigValue = z.infer<typeof ConfigValueSchema>;

/** A citation for an action or health sentence. */
export const CitationSchema = z.object({
  source: z.string().check(z.minLength(1)),
  verifiedOn: z.nullable(z.iso.date()),
});
export type Citation = z.infer<typeof CitationSchema>;

/** The number in a scalar config value; throws if the value is a list. */
export function numberValue(entry: ConfigValue): number {
  if (typeof entry.value !== 'number')
    throw new TypeError(`expected a number, got a list (${entry.unit})`);
  return entry.value;
}

/** True when a value or citation has not been checked by a person. */
export function isProvisional(entry: { source: string; verifiedOn: string | null }): boolean {
  return entry.verifiedOn === null || entry.source === 'TODO';
}
