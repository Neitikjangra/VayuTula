import { describe, expect, it } from 'vitest';
import { buildCsp, securityHeaders } from '@/lib/securityHeaders';

function headerMap(isDev: boolean): Map<string, string> {
  return new Map(securityHeaders(isDev).map((h) => [h.key, h.value]));
}

describe('securityHeaders()', () => {
  it('sets every header required by PRD Section 7', () => {
    const headers = headerMap(false);
    for (const key of [
      'Content-Security-Policy',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(headers.has(key)).toBe(true);
    }
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
  });

  it('allows geolocation only for this origin (optional browser location in FR-2)', () => {
    expect(headerMap(false).get('Permissions-Policy')).toContain('geolocation=(self)');
  });
});

describe('buildCsp()', () => {
  it('blocks framing, plugins and third-party connections in production', () => {
    const csp = buildCsp(false);
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain('unsafe-eval');
  });

  it('adds unsafe-eval only in development', () => {
    expect(buildCsp(true)).toContain("'unsafe-eval'");
  });
});
