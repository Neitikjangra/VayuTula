import { describe, expect, it, vi } from 'vitest';
import { ProviderError } from '@/lib/errors';
import { fetchJson, type FetchLike } from '@/lib/http';

function respond(body: string, status: number): FetchLike {
  // statusText left empty on purpose, as over HTTP/2.
  return vi.fn(async () => new Response(body, { status, statusText: '' }));
}

async function failure(promise: Promise<unknown>): Promise<ProviderError> {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error).toBeInstanceOf(ProviderError);
  return error as ProviderError;
}

describe('fetchJson()', () => {
  it('returns parsed JSON when response.ok', async () => {
    await expect(
      fetchJson('https://x.test', { fetchImpl: respond('{"a":1}', 200) }),
    ).resolves.toEqual({ a: 1 });
  });

  it('judges failure by status, not statusText (HTTP/2)', async () => {
    const error = await failure(fetchJson('https://x.test', { fetchImpl: respond('{}', 503) }));
    expect(error.kind).toBe('http');
    expect(error.status).toBe(503);
  });

  it('maps a rejected fetch to a network error', async () => {
    const fetchImpl: FetchLike = () => Promise.reject(new TypeError('fetch failed'));
    expect((await failure(fetchJson('https://x.test', { fetchImpl }))).kind).toBe('network');
  });

  it('times out a hanging request', async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
      });
    const error = await failure(fetchJson('https://x.test', { fetchImpl, timeoutMs: 20 }));
    expect(error.kind).toBe('timeout');
  });

  it('maps invalid JSON to a parse error', async () => {
    const error = await failure(
      fetchJson('https://x.test', { fetchImpl: respond('not json', 200) }),
    );
    expect(error.kind).toBe('parse');
  });
});
