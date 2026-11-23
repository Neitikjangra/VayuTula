/** lib/: small cross-cutting helpers (security headers, HTTP, errors, logging). */
export { buildCsp, securityHeaders, type Header } from './securityHeaders';
export { ProviderError, isProviderError, type ProviderErrorKind } from './errors';
export { DEFAULT_TIMEOUT_MS, fetchJson, type FetchJsonOptions, type FetchLike } from './http';
export { jsonError, logFailure } from './logger';
