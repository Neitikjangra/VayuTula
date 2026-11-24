import { createHash } from 'node:crypto';
import { runPlanWithReason } from '@/ai/plan';
import { TtlCache } from '@/data';
import { PlanRequestSchema, type PlanRequest, type PlanResponse } from '@/domain';
import { NO_STORE, aiRateLimiter, jsonError, logFailure, rateLimited, readJsonBody } from '@/lib';

const MAX_BODY_BYTES = 16_384;
const PLAN_TTL_MS = 60 * 60 * 1000;
/** PRD 6, guardrail 5: one model call per plan, cached per profile hash + forecast hour. */
const planCache = new TtlCache<PlanResponse>(PLAN_TTL_MS, 2000);

function cacheKey(req: PlanRequest): string {
  return createHash('sha256').update(JSON.stringify(req)).digest('hex');
}

/** POST /api/plan — the AI picks 3–5 of the engine's top 8 and writes one reason each (FR-6). */
export async function POST(request: Request): Promise<Response> {
  const limited = rateLimited(aiRateLimiter, request);
  if (limited) return limited;
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const parsed = PlanRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError(400, 'invalid_request');
  const key = cacheKey(parsed.data);
  const hit = planCache.getFresh(key, Date.now());
  if (hit) return Response.json(hit.value, { headers: { ...NO_STORE, 'x-plan-cache': 'hit' } });
  const { plan, error } = await runPlanWithReason(parsed.data);
  if (plan.source === 'ai') planCache.set(key, plan, Date.now());
  else logFailure('plan', error);
  return Response.json(plan, { headers: NO_STORE });
}
