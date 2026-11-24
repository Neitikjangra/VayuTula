import { isProviderError } from './errors';

function describe(error: unknown): string {
  if (isProviderError(error)) return `${error.kind}${error.status ? ` ${error.status}` : ''}`;
  const kind = (error as { kind?: unknown } | null)?.kind;
  return typeof kind === 'string' ? kind : 'unexpected';
}

/**
 * Logs a server-side failure by category only. Never pass user input, locations
 * or secrets here (PRD Section 7: no user data in logs).
 */
export function logFailure(scope: string, error: unknown): void {
  console.error(`[${scope}] failure: ${describe(error)}`);
}

export const NO_STORE = { 'Cache-Control': 'no-store' };

/** JSON error body with a generic code and no internal details. */
export function jsonError(
  status: number,
  code: string,
  headers: Record<string, string> = {},
): Response {
  return Response.json({ error: code }, { status, headers: { ...NO_STORE, ...headers } });
}
