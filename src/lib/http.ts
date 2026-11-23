import { ProviderError } from './errors';

/** Minimal fetch signature so tests can inject a fake. */
export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Every external call times out after 8 s (PRD Section 7, Reliability). */
export const DEFAULT_TIMEOUT_MS = 8000;

export interface FetchJsonOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
}

const globalFetch: FetchLike = (input, init) => fetch(input, init);

function isTimeout(error: unknown): boolean {
  return error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
}

/**
 * GETs JSON with a timeout. Success is judged only by `response.ok` / `response.status`
 * (statusText is empty over HTTP/2). Throws ProviderError on any failure.
 */
export async function fetchJson(url: string, options: FetchJsonOptions = {}): Promise<unknown> {
  const { fetchImpl = globalFetch, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { accept: 'application/json' },
    });
  } catch (error) {
    throw new ProviderError(isTimeout(error) ? 'timeout' : 'network');
  }
  if (!response.ok) throw new ProviderError('http', response.status);
  try {
    return (await response.json()) as unknown;
  } catch {
    throw new ProviderError('parse');
  }
}
