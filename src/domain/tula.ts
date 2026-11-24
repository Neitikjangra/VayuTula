import * as z from 'zod/mini';
import { HourRangeSchema } from './profile';

export const CONFIDENCE_LEVELS = ['high', 'med', 'low'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * The three Tula pans for one action (FR-5, FR-13).
 * Breathe in: over the next 24 h. Emit out and ₹: per month. ₹ positive = saves.
 */
export const TulaScoreSchema = z.object({
  /** µg·h/m³ avoided over the next 24 h, keyed by member id. */
  inhaledAvoided: z.record(z.string(), z.number()),
  pmEmittedAvoidedG: z.number(),
  co2AvoidedKg: z.number(),
  rupeesPerMonth: z.number(),
  confidence: z.enum(CONFIDENCE_LEVELS),
  /** Config keys (e.g. "factors.airExchange.leaky") the numbers depend on. */
  assumptions: z.array(z.string()),
});
export type TulaScore = z.infer<typeof TulaScoreSchema>;

/** Today's plan (PRD 4.1). Filled by the AI from engine numbers in R4. */
export const PlanSchema = z.object({
  date: z.iso.date(),
  items: z.array(
    z.object({
      actionId: z.string(),
      tula: TulaScoreSchema,
      whyText: z.string(),
      timeWindow: z.nullable(HourRangeSchema),
    }),
  ),
  forecastSource: z.string(),
  generatedAt: z.iso.datetime(),
  version: z.string(),
});
export type Plan = z.infer<typeof PlanSchema>;
