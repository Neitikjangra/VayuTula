/** A single HTTP response header. */
export interface Header {
  key: string;
  value: string;
}

/**
 * Builds the Content-Security-Policy string.
 * Dev mode needs 'unsafe-eval' for React Refresh; production does not.
 * 'unsafe-inline' for scripts is required by Next.js inline bootstrap without nonces.
 */
export function buildCsp(isDev: boolean): string {
  const scriptSrc = ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])];
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': scriptSrc,
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:'],
    'font-src': ["'self'"],
    'connect-src': ["'self'"],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}

/** Security headers applied to every route (PRD Section 7, Security). */
export function securityHeaders(isDev: boolean): Header[] {
  return [
    { key: 'Content-Security-Policy', value: buildCsp(isDev) },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), payment=(), usb=(), geolocation=(self)',
    },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}
