import * as z from 'zod/mini';
import { HourRangeSchema } from './profile';
import { CONFIDENCE_LEVELS } from './tula';

/** FR-6: today's plan shows 3–5 actions, chosen from the engine's top 8. */
export const PLAN_MIN_ITEMS = 3;
export const PLAN_MAX_ITEMS = 5;
export const PLAN_CANDIDATES = 8;
/** The breathe-in pan covers the next 24 h (engine and AI number check share this). */
export const BREATHE_IN_HOURS = 24;

const ActionId = z.string().check(z.regex(/^[a-z0-9-]+$/), z.maxLength(60));
const Count = (max: number) => z.int().check(z.gte(0), z.lte(max));

/** The numbers of one action exactly as the UI shows them (rounded by the engine). */
export const PlanNumbersSchema = z.object({
  inhaledTotal: z.number(),
  pmG: z.number(),
  co2Kg: z.number(),
  rupees: z.number(),
});
export type PlanNumbers = z.infer<typeof PlanNumbersSchema>;

/** One ranked action as sent to the AI: no names, no location. */
export const PlanCandidateSchema = z.object({
  actionId: ActionId,
  title: z.string().check(z.trim(), z.minLength(1), z.maxLength(120)),
  costTier: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  numbers: PlanNumbersSchema,
  confidence: z.enum(CONFIDENCE_LEVELS),
  timeWindow: z.nullable(HourRangeSchema),
});
export type PlanCandidate = z.infer<typeof PlanCandidateSchema>;

/** Anonymous household summary (counts only). */
export const HouseholdSummarySchema = z.object({
  people: Count(12),
  children: Count(12),
  elders: Count(12),
  sensitive: Count(12),
  rooms: Count(8),
  purifiers: Count(8),
});
export type HouseholdSummary = z.infer<typeof HouseholdSummarySchema>;

/** Body of POST /api/plan. */
export const PlanRequestSchema = z.object({
  profileHash: z.string().check(z.regex(/^[a-f0-9]{16,64}$/)),
  /** Local hour of the forecast the plan is for, YYYY-MM-DDTHH (cache key). */
  forecastHour: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}T\d{2}$/)),
  lang: z.enum(['en', 'hi']),
  household: HouseholdSummarySchema,
  outdoorMean: z.number().check(z.gte(0), z.lte(2000)),
  candidates: z.array(PlanCandidateSchema).check(z.minLength(1), z.maxLength(PLAN_CANDIDATES)),
});
export type PlanRequest = z.infer<typeof PlanRequestSchema>;

/** Reply of POST /api/plan. whyText null means "use the built-in reason". */
export const PlanResponseSchema = z.object({
  items: z
    .array(
      z.object({ actionId: ActionId, whyText: z.nullable(z.string().check(z.maxLength(300))) }),
    )
    .check(z.minLength(1), z.maxLength(PLAN_MAX_ITEMS)),
  source: z.enum(['ai', 'template']),
});
export type PlanResponse = z.infer<typeof PlanResponseSchema>;

/**
 * Template plan (PRD 6 fallback): the first ranked actions, already free-first, with whyText null
 * so the UI shows its built-in reason. Shared by the server and the browser's offline fallback.
 */
export function templatePlan(candidates: PlanCandidate[]): PlanResponse {
  return {
    source: 'template',
    items: candidates
      .slice(0, PLAN_MAX_ITEMS)
      .map((c) => ({ actionId: c.actionId, whyText: null })),
  };
}
