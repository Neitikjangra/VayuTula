import { describe, expect, it } from 'vitest';
import { clientIp, createRateLimiter } from '@/lib/rateLimit';

function limiter(limit = 3) {
  let now = 0;
  const rl = createRateLimiter({ limit, windowMs: 60_000, now: () => now });
  return { rl, at: (ms: number) => (now = ms) };
}

describe('createRateLimiter() (PRD 7: 20 AI requests per minute per IP)', () => {
  it('allows up to the limit in a window, then blocks with Retry-After', () => {
    const { rl, at } = limiter(3);
    expect([rl.check('a'), rl.check('a'), rl.check('a')].every((r) => r.allowed)).toBe(true);
    at(10_000);
    expect(rl.check('a')).toEqual({ allowed: false, retryAfterSec: 50 });
  });

  it('counts each client separately', () => {
    const { rl } = limiter(1);
    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('b').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
  });

  it('lets requests through again once old ones leave the window', () => {
    const { rl, at } = limiter(2);
    rl.check('a');
    at(30_000);
    rl.check('a');
    at(60_001);
    expect(rl.check('a').allowed).toBe(true);
    expect(rl.check('a').allowed).toBe(false);
  });

  it('does not count blocked requests against the client', () => {
    const { rl, at } = limiter(1);
    rl.check('a');
    rl.check('a');
    rl.check('a');
    at(60_001);
    expect(rl.check('a').allowed).toBe(true);
  });

  it('forgets the oldest clients beyond its memory cap', () => {
    let now = 0;
    const rl = createRateLimiter({ limit: 1, windowMs: 60_000, now: () => now, maxKeys: 2 });
    rl.check('a');
    rl.check('b');
    rl.check('c');
    now = 1;
    expect(rl.check('a').allowed).toBe(true);
  });
});

describe('clientIp()', () => {
  const req = (headers: Record<string, string>) => new Request('http://x.test', { headers });

  it('uses the first x-forwarded-for address (set by the host)', () => {
    expect(clientIp(req({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then to a shared bucket', () => {
    expect(clientIp(req({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(req({}))).toBe('unknown');
  });
});
