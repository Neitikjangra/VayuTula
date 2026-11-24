import type { PlanRequest, PlanResponse } from '@/domain';
import { generateJson, isUnavailable, type GenerateJson } from './client';
import { templatePlan } from './fallback';
import { retryNote } from './prompts/intake';
import { PLAN_JSON_SCHEMA, PLAN_SYSTEM, buildPlanPrompt } from './prompts/plan';
import { validatePlanOutput } from './validators';

const MAX_OUTPUT_TOKENS = 900;

export interface PlanOutcome {
  plan: PlanResponse;
  /** Why the template was used, for logging (never shown or sent to the client). */
  error: unknown;
}

/**
 * FR-6: the model chooses 3–5 of the top 8 and writes one reason each. Every reply passes the
 * number, action, free-first and health checks; one retry with the errors, then the template.
 */
export async function runPlanWithReason(
  req: PlanRequest,
  generate: GenerateJson = generateJson,
): Promise<PlanOutcome> {
  const prompt = buildPlanPrompt(req);
  const ctx = { candidates: req.candidates, lang: req.lang };
  let note = '';
  let error: unknown = new Error('no attempt');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generate({
        system: PLAN_SYSTEM,
        user: prompt + note,
        schema: PLAN_JSON_SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      const checked = validatePlanOutput(raw, ctx);
      if (checked.ok) return { plan: { source: 'ai', items: checked.value.items }, error: null };
      note = retryNote(checked.errors);
      error = new Error('invalid model output');
    } catch (caught) {
      error = caught;
      if (isUnavailable(caught)) break;
    }
  }
  return { plan: templatePlan(req.candidates), error };
}

/** The plan only (see runPlanWithReason). */
export async function runPlan(
  req: PlanRequest,
  generate: GenerateJson = generateJson,
): Promise<PlanResponse> {
  return (await runPlanWithReason(req, generate)).plan;
}
