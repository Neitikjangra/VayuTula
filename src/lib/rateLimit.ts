/**
 * Sliding-window rate limiter kept in memory per server instance. Production with several
 * instances needs a shared store (e.g. Redis); this is noted in the README.
 */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
  /** Most clients remembered at once; the oldest are dropped first. */
  maxKeys?: number;
}

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
  maxKeys = 10_000,
}: RateLimitOptions): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    check(key) {
      const t = now();
      const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? t;
        return {
          allowed: false,
          retryAfterSec: Math.max(1, Math.ceil((oldest + windowMs - t) / 1000)),
        };
      }
      hits.delete(key);
      hits.set(key, [...recent, t]);
      if (hits.size > maxKeys) hits.delete(hits.keys().next().value ?? key);
      return { allowed: true, retryAfterSec: 0 };
    },
  };
}

/** Client address from the host's proxy headers; unknown clients share one bucket. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown';
}
