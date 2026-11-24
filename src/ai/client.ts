import 'server-only';
import { ApiError, GoogleGenAI, ThinkingLevel } from '@google/genai';

/** Flash-class default; override with GEMINI_MODEL. */
export const DEFAULT_MODEL = 'gemini-3.8-flash';
/** Tried when the main model is over quota or overloaded; override with GEMINI_FALLBACK_MODEL. */
export const DEFAULT_FALLBACK_MODEL = 'gemini-3.5-flash-lite';
/** Every external call times out after 8 s (PRD Section 7). */
export const AI_TIMEOUT_MS = 8000;
/** Low temperature for repeatable extraction (PRD 6: ≤ 0.3). */
export const AI_TEMPERATURE = 0.2;

/** HTTP statuses that mean "try the other model": quota or model not found. */
const TRY_NEXT_MODEL = new Set([404, 429]);
/** "High demand": usually gone a moment later, so the same model is asked once more. */
const OVERLOADED = 503;
export const OVERLOAD_RETRY_MS = 600;

export type AiErrorKind =
  | 'no_key'
  | 'timeout'
  | 'unavailable'
  | 'overloaded'
  | 'thinking_unsupported'
  | 'upstream'
  | 'empty'
  | 'parse';

/** Typed AI failure. Never carries the key, the prompt or the user's text. */
export class AiError extends Error {
  readonly kind: AiErrorKind;

  constructor(kind: AiErrorKind) {
    super(`ai ${kind}`);
    this.name = 'AiError';
    this.kind = kind;
  }
}

/** True when the AI cannot answer now (no key, over quota, overloaded, slow): retrying won't help. */
export function isUnavailable(error: unknown): boolean {
  return (
    error instanceof AiError &&
    ['no_key', 'unavailable', 'overloaded', 'timeout'].includes(error.kind)
  );
}

export interface JsonRequest {
  system: string;
  user: string;
  /** JSON Schema the reply must follow. */
  schema: Record<string, unknown>;
  maxOutputTokens: number;
}

/** Calls the model and returns parsed JSON; injectable so tests never call the network. */
export type GenerateJson = (request: JsonRequest) => Promise<unknown>;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError('no_key');
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

/** Main model first, then the fallback (deduplicated). */
export function modelsToTry(): string[] {
  const main = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallback = process.env.GEMINI_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  return [...new Set([main, fallback])];
}

/** How long a failing model is skipped (per server instance): quota lasts, overload passes. */
export const COOL_DOWN_MS: Record<'unavailable' | 'overloaded' | 'timeout', number> = {
  unavailable: 5 * 60_000,
  timeout: 60_000,
  overloaded: 15_000,
};
const coolingUntil = new Map<string, number>();

/**
 * Models worth calling now, in preference order. When every model is cooling down, the one
 * that recovers first is still tried: one blip must never block every request for minutes.
 */
export function healthyModels(now: number = Date.now()): string[] {
  const models = modelsToTry();
  const healthy = models.filter((model) => (coolingUntil.get(model) ?? 0) <= now);
  if (healthy.length > 0) return healthy;
  const soonest = [...models].sort((a, b) => coolingUntil.get(a)! - coolingUntil.get(b)!)[0];
  return soonest ? [soonest] : [];
}

function coolDown(model: string, kind: keyof typeof COOL_DOWN_MS): void {
  coolingUntil.set(model, Date.now() + COOL_DOWN_MS[kind]);
}

/** Test helper: forget which models were cooling down. */
export function resetModelHealth(): void {
  coolingUntil.clear();
}

/** Maps SDK failures to typed errors; a rejected thinking setting is reported separately. */
function toAiError(error: unknown, signal: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  if (signal.aborted) return new AiError('timeout');
  if (!(error instanceof ApiError)) return new AiError('upstream');
  if (error.status === 400 && /thinking/i.test(error.message))
    return new AiError('thinking_unsupported');
  if (error.status === OVERLOADED) return new AiError('overloaded');
  return new AiError(TRY_NEXT_MODEL.has(error.status) ? 'unavailable' : 'upstream');
}

async function callModel(
  model: string,
  request: JsonRequest,
  thinking: boolean,
): Promise<string | undefined> {
  const signal = AbortSignal.timeout(AI_TIMEOUT_MS);
  try {
    const response = await getClient().models.generateContent({
      model,
      contents: request.user,
      config: {
        systemInstruction: request.system,
        responseMimeType: 'application/json',
        responseJsonSchema: request.schema,
        temperature: AI_TEMPERATURE,
        maxOutputTokens: request.maxOutputTokens,
        ...(thinking ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } } : {}),
        abortSignal: signal,
      },
    });
    return response.text;
  } catch (error) {
    throw toAiError(error, signal);
  }
}

/** One model: low thinking first; if the model rejects that setting, once more without it. */
async function askModel(model: string, request: JsonRequest): Promise<string | undefined> {
  try {
    return await callModel(model, request, true);
  } catch (error) {
    if (error instanceof AiError && error.kind === 'thinking_unsupported')
      return callModel(model, request, false);
    throw error;
  }
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One model; a "high demand" reply is retried once after a short pause. */
async function askWithRetry(model: string, request: JsonRequest): Promise<string | undefined> {
  try {
    return await askModel(model, request);
  } catch (error) {
    if (!(error instanceof AiError && error.kind === 'overloaded')) throw error;
    await pause(OVERLOAD_RETRY_MS);
    return askModel(model, request);
  }
}

/** Raw text from the first model that answers; quota, overload or slowness moves on. */
async function firstAnswer(request: JsonRequest): Promise<string | undefined> {
  if (!process.env.GEMINI_API_KEY) throw new AiError('no_key');
  for (const model of healthyModels()) {
    try {
      return await askWithRetry(model, request);
    } catch (error) {
      if (!(error instanceof AiError) || !(error.kind in COOL_DOWN_MS)) throw error;
      coolDown(model, error.kind as keyof typeof COOL_DOWN_MS);
    }
  }
  throw new AiError('unavailable');
}

/** Server-only Gemini call: JSON-schema output, temperature 0.2, token cap, 8 s timeout per model. */
export const generateJson: GenerateJson = async (request) => {
  const text = await firstAnswer(request);
  if (!text) throw new AiError('empty');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new AiError('parse');
  }
};
