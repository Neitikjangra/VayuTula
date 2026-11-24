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

/** HTTP statuses that mean "try the other model": quota, overload, model not found. */
const TRY_NEXT_MODEL = new Set([404, 429, 503]);

export type AiErrorKind = 'no_key' | 'timeout' | 'unavailable' | 'upstream' | 'empty' | 'parse';

/** Typed AI failure. Never carries the key, the prompt or the user's text. */
export class AiError extends Error {
  readonly kind: AiErrorKind;

  constructor(kind: AiErrorKind) {
    super(`ai ${kind}`);
    this.name = 'AiError';
    this.kind = kind;
  }
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

async function callModel(model: string, request: JsonRequest): Promise<string | undefined> {
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
        thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        abortSignal: signal,
      },
    });
    return response.text;
  } catch (error) {
    if (error instanceof AiError) throw error;
    if (signal.aborted) throw new AiError('timeout');
    const unavailable = error instanceof ApiError && TRY_NEXT_MODEL.has(error.status);
    throw new AiError(unavailable ? 'unavailable' : 'upstream');
  }
}

/** Raw text from the first model that answers; quota or overload moves on to the next model. */
async function firstAnswer(request: JsonRequest): Promise<string | undefined> {
  let last: AiError = new AiError('unavailable');
  for (const model of modelsToTry()) {
    try {
      return await callModel(model, request);
    } catch (error) {
      if (!(error instanceof AiError) || error.kind !== 'unavailable') throw error;
      last = error;
    }
  }
  throw last;
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
