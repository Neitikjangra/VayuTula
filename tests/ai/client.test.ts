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
const {
  AiError,
  DEFAULT_FALLBACK_MODEL,
  COOL_DOWN_MS,
  OVERLOAD_RETRY_MS,
  generateJson,
  modelsToTry,
  resetModelHealth,
} = await import('@/ai/client');

const request = { system: 'sys', user: 'user', schema: { type: 'object' }, maxOutputTokens: 100 };

beforeEach(() => {
  vi.stubEnv('GEMINI_API_KEY', 'test-key');
  vi.stubEnv('GEMINI_MODEL', 'main-model');
  vi.stubEnv('GEMINI_FALLBACK_MODEL', '');
  generateContent.mockReset();
  resetModelHealth();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

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

  it.each([429, 404])('moves to the fallback model on HTTP %i', async (status) => {
    generateContent
      .mockRejectedValueOnce(apiError(status))
      .mockResolvedValueOnce({ text: '{"a":1}' });
    await expect(generateJson(request)).resolves.toEqual({ a: 1 });
    expect(generateContent.mock.calls[1]![0].model).toBe(DEFAULT_FALLBACK_MODEL);
  });

  it('asks the same model once more after a "high demand" 503 (found live: the next call works)', async () => {
    generateContent.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce({ text: '{"a":1}' });
    await expect(generateJson(request)).resolves.toEqual({ a: 1 });
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual(['main-model', 'main-model']);
    expect(OVERLOAD_RETRY_MS).toBeLessThanOrEqual(1000);
  });

  it('moves to the fallback model when the 503 persists', async () => {
    generateContent
      .mockRejectedValueOnce(apiError(503))
      .mockRejectedValueOnce(apiError(503))
      .mockResolvedValueOnce({ text: '{"a":1}' });
    await expect(generateJson(request)).resolves.toEqual({ a: 1 });
    expect(generateContent.mock.calls[2]![0].model).toBe(DEFAULT_FALLBACK_MODEL);
  });

  it('reports "unavailable" when every model is over quota', async () => {
    generateContent.mockRejectedValue(apiError(429));
    await expect(generateJson(request)).rejects.toMatchObject({ kind: 'unavailable' });
  });

  it('asks for low thinking (MINIMAL is rejected by gemini-3.8-flash, found live in R4)', async () => {
    generateContent.mockResolvedValue({ text: '{}' });
    await generateJson(request);
    expect(generateContent.mock.calls[0]![0].config.thinkingConfig).toEqual({
      thinkingLevel: 'LOW',
    });
  });

  it('retries the same model without a thinking setting if the model rejects it', async () => {
    const rejected = new ApiError({
      message: 'Thinking level LOW is not supported for this model.',
      status: 400,
    });
    generateContent.mockRejectedValueOnce(rejected).mockResolvedValueOnce({ text: '{"ok":1}' });
    await expect(generateJson(request)).resolves.toEqual({ ok: 1 });
    const retry = generateContent.mock.calls[1]![0];
    expect(retry.model).toBe('main-model');
    expect(retry.config.thinkingConfig).toBeUndefined();
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

describe('model health (found live: every call waited on an over-quota model first)', () => {
  it('skips a model that just answered "over quota" and goes straight to the fallback', async () => {
    generateContent
      .mockRejectedValueOnce(apiError(429))
      .mockResolvedValueOnce({ text: '{"a":1}' })
      .mockResolvedValueOnce({ text: '{"a":2}' });
    await generateJson(request);
    await expect(generateJson(request)).resolves.toEqual({ a: 2 });
    expect(generateContent.mock.calls.map((c) => c[0].model)).toEqual([
      'main-model',
      DEFAULT_FALLBACK_MODEL,
      DEFAULT_FALLBACK_MODEL,
    ]);
  });

  it('tries the main model again once the cool-down has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    generateContent.mockRejectedValueOnce(apiError(429)).mockResolvedValue({ text: '{}' });
    await generateJson(request);
    vi.setSystemTime(Date.now() + COOL_DOWN_MS.unavailable + 1);
    await generateJson(request);
    expect(generateContent.mock.calls.at(-1)![0].model).toBe('main-model');
  });

  it('still tries the model that recovers first while every model is cooling down (found live)', async () => {
    generateContent.mockRejectedValueOnce(apiError(429)).mockRejectedValueOnce(apiError(429));
    await expect(generateJson(request)).rejects.toMatchObject({ kind: 'unavailable' });
    generateContent.mockClear();
    generateContent.mockResolvedValueOnce({ text: '{"back":true}' });
    await expect(generateJson(request)).resolves.toEqual({ back: true });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it('cools an overloaded model down for less time than an over-quota one', () => {
    expect(COOL_DOWN_MS.overloaded).toBeLessThan(COOL_DOWN_MS.unavailable);
  });

  it('does not cool down a model for other errors', async () => {
    generateContent.mockRejectedValueOnce(apiError(400)).mockResolvedValueOnce({ text: '{}' });
    await expect(generateJson(request)).rejects.toMatchObject({ kind: 'upstream' });
    await generateJson(request);
    expect(generateContent.mock.calls.at(-1)![0].model).toBe('main-model');
  });
});
