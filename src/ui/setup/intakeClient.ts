import { IntakeResponseSchema, type IntakeRequest, type IntakeResponse } from '@/domain';

export type IntakeOutcome =
  { kind: 'ok'; value: IntakeResponse } | { kind: 'rateLimited' } | { kind: 'failed' };

/** POST /api/intake. Any failure other than the rate limit means "fall back to the form". */
export async function postIntake(body: IntakeRequest): Promise<IntakeOutcome> {
  let response: Response;
  try {
    response = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: 'failed' };
  }
  if (response.status === 429) return { kind: 'rateLimited' };
  if (!response.ok) return { kind: 'failed' };
  const parsed = IntakeResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? { kind: 'ok', value: parsed.data } : { kind: 'failed' };
}
