import { detectSymptoms } from '@/ai/health';
import { runIntake } from '@/ai/intake';
import { IntakeRequestSchema } from '@/domain';
import { NO_STORE, aiRateLimiter, jsonError, logFailure, rateLimited, readJsonBody } from '@/lib';

const MAX_BODY_BYTES = 32_768;

/** POST /api/intake — one conversational setup turn (FR-1). */
export async function POST(request: Request): Promise<Response> {
  const limited = rateLimited(aiRateLimiter, request);
  if (limited) return limited;
  const body = await readJsonBody(request, MAX_BODY_BYTES);
  if (!body.ok) return body.response;
  const parsed = IntakeRequestSchema.safeParse(body.value);
  if (!parsed.success) return jsonError(400, 'invalid_request');
  const symptomNotice = detectSymptoms(parsed.data.message);
  const result = await runIntake(parsed.data);
  if (!result.ok) {
    logFailure('intake', result.error);
    return Response.json(
      { error: 'ai_unavailable', symptomNotice },
      { status: 503, headers: NO_STORE },
    );
  }
  return Response.json({ ...result.value, symptomNotice }, { headers: NO_STORE });
}
