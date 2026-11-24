import { IntakeResponseSchema, type IntakeRequest, type IntakeResponse } from '@/domain';

export type IntakeOutcome =
  { kind: 'ok'; value: IntakeResponse } | { kind: 'rateLimited' } | { kind: 'failed' };

/** Longer than the server's two model attempts, so a slow reply still arrives. */
export const INTAKE_CLIENT_TIMEOUT_MS = 25_000;

/** POST /api/intake. Any failure other than the rate limit counts as "the AI did not answer". */
export async function postIntake(body: IntakeRequest): Promise<IntakeOutcome> {
  let response: Response;
  try {
    response = await fetch('/api/intake', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INTAKE_CLIENT_TIMEOUT_MS),
    });
  } catch {
    return { kind: 'failed' };
  }
  if (response.status === 429) return { kind: 'rateLimited' };
  if (!response.ok) return { kind: 'failed' };
  const parsed = IntakeResponseSchema.safeParse(await response.json().catch(() => null));
  return parsed.success ? { kind: 'ok', value: parsed.data } : { kind: 'failed' };
}
