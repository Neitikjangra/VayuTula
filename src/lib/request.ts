import { jsonError } from './logger';
import { createRateLimiter, clientIp, type RateLimiter } from './rateLimit';

/** PRD 7: 20 AI requests per minute per IP. */
export const aiRateLimiter = createRateLimiter({ limit: 20, windowMs: 60_000 });
/** Looser limit for the forecast and geocode proxies, so they cannot be abused as free relays. */
export const dataRateLimiter = createRateLimiter({ limit: 60, windowMs: 60_000 });

/** A 429 response when the client is over the limit, else null. */
export function rateLimited(limiter: RateLimiter, request: Request): Response | null {
  const { allowed, retryAfterSec } = limiter.check(clientIp(request));
  return allowed ? null : jsonError(429, 'rate_limited', { 'Retry-After': String(retryAfterSec) });
}

export type BodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

/** Reads a JSON body of at most `maxBytes`; 413 when too large, 400 when not JSON. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<BodyResult> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return { ok: false, response: jsonError(413, 'too_large') };
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) {
    return { ok: false, response: jsonError(413, 'too_large') };
  }
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, response: jsonError(400, 'invalid_request') };
  }
}
