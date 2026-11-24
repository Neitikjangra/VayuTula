import type * as GenAI from '@google/genai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const generateContent = vi.fn();

vi.mock('@google/genai', async (importOriginal) => {
  const real = await importOriginal<typeof GenAI>();
  class GoogleGenAI {
    models = { generateContent };
  }
  return { ...real, GoogleGenAI };
});

const { ApiError } = await import('@google/genai');
const { AiError, DEFAULT_FALLBACK_MODEL, generateJson, modelsToTry } = await import('@/ai/client');

const request = { system: 'sys', user: 'user', schema: { type: 'object' }, maxOutputTokens: 100 };

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', 'main-model');
  vi.stubEnv('GEMINI_FALLBACK_MODEL', '');
  generateContent.mockReset();
});

afterEach(() => vi.unstubAllEnvs());

const apiError = (status: number) => new ApiError({ message: 'upstream', status });

describe('generateJson()', () => {
  it('sends a JSON-schema request with low temperature and a token cap', async () => {
    generateContent.mockResolvedValue({ text: '{"ok":true}' });
    await expect(generateJson(request)).resolves.toEqual({ ok: true });
    const call = generateContent.mock.calls[0]![0];
    expect(call.model).toBe('main-model');
    expect(call.config).toMatchObject({
      systemInstruction: 'sys',
      responseMimeType: 'application/json',
      responseJsonSchema: { type: 'object' },
      maxOutputTokens: 100,
    });
    expect(call.config.temperature).toBeLessThanOrEqual(0.3);
    expect(call.config.abortSignal).toBeInstanceOf(AbortSignal);
  });

  it.each([429, 503, 404])('moves to the fallback model on HTTP %i', async (status) => {
    generateContent
      .mockRejectedValueOnce(apiError(status))
      .mockResolvedValueOnce({ text: '{"a":1}' });
    await expect(generateJson(request)).resolves.toEqual({ a: 1 });
    expect(generateContent.mock.calls[1]![0].model).toBe(DEFAULT_FALLBACK_MODEL);
  });

  it('reports "unavailable" when every model is over quota', async () => {
    generateContent.mockRejectedValue(apiError(429));
    await expect(generateJson(request)).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('does not try another model on other errors (e.g. a bad request)', async () => {
    generateContent.mockRejectedValue(apiError(400));
    await expect(generateJson(request)).rejects.toMatchObject({ kind: 'upstream' });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('fails without a key, before any call', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    await expect(generateJson(request)).rejects.toBeInstanceOf(AiError);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it.each([
    ['empty', { text: '' }],
    ['parse', { text: 'not json' }],
  ])('maps a %s reply to a typed error', async (kind, reply) => {
    generateContent.mockResolvedValue(reply);
    await expect(generateJson(request)).rejects.toMatchObject({ kind });
  });

  it('lists each model once', () => {
    vi.stubEnv('GEMINI_FALLBACK_MODEL', 'main-model');
    expect(modelsToTry()).toEqual(['main-model']);
  });
});
