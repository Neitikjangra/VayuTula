import { isProviderError } from './errors';

/**
 * Logs a server-side failure by category only. Never pass user input, locations
 * or secrets here (PRD Section 7: no user data in logs).
 */
export function logFailure(scope: string, error: unknown): void {
  const kind = isProviderError(error)
    ? `${error.kind}${error.status ? ` ${error.status}` : ''}`
    : 'unexpected';
  console.error(`[${scope}] failure: ${kind}`);
}

/** JSON error body with a generic code and no internal details. */
export function jsonError(status: number, code: string): Response {
  return Response.json({ error: code }, { status, headers: { 'Cache-Control': 'no-store' } });
}
