import {
  MAX_INTAKE_QUESTIONS,
  fieldsIn,
  missingFields,
  type IntakeFacts,
  type IntakeRequest,
  type NextField,
} from '@/domain';
import { generateJson, isUnavailable, type GenerateJson } from './client';
import { INTAKE_JSON_SCHEMA, INTAKE_SYSTEM, buildIntakePrompt, retryNote } from './prompts/intake';
import { validateIntakeOutput, type IntakeModelOutput } from './validators';

const MAX_OUTPUT_TOKENS = 1200;
const DEVANAGARI = /[ऀ-ॿ]/;
const HAS_LETTER = /\p{L}/u;

export interface IntakeReply {
  profileDelta: IntakeFacts;
  nextField: NextField;
  question: string | null;
  lang: 'en' | 'hi';
}

export type IntakeResult = { ok: true; value: IntakeReply } | { ok: false; error: unknown };

/** Text in Devanagari means Hindi, whatever the UI language. */
function replyLang(req: IntakeRequest): 'en' | 'hi' {
  return DEVANAGARI.test(req.message) ? 'hi' : req.lang;
}

/** Chooses the next topic in code: never one this reply answered, never beyond 6 questions. */
function finalize(out: IntakeModelOutput, req: IntakeRequest, lang: 'en' | 'hi'): IntakeReply {
  const remaining = missingFields([...req.answered, ...fieldsIn(out.profileDelta)]);
  let nextField: NextField = remaining[0] ?? 'done';
  if (out.nextField !== 'done' && remaining.includes(out.nextField)) nextField = out.nextField;
  if (req.asked >= MAX_INTAKE_QUESTIONS) nextField = 'done';
  const question = nextField !== 'done' && nextField === out.nextField ? out.question : null;
  return { profileDelta: out.profileDelta, nextField, question, lang };
}

/**
 * FR-1: one intake turn. The model only extracts facts and picks a question; every reply is
 * schema- and guardrail-checked, retried once with the errors, then reported as a failure so
 * the UI falls back to the manual form.
 */
export async function runIntake(
  req: IntakeRequest,
  generate: GenerateJson = generateJson,
): Promise<IntakeResult> {
  const lang = replyLang(req);
  const missing = missingFields(req.answered);
  // No words at all (e.g. "???"): nothing to extract, and models may invent facts. Ask instead.
  if (!HAS_LETTER.test(req.message)) {
    return {
      ok: true,
      value: { profileDelta: {}, nextField: missing[0] ?? 'done', question: null, lang },
    };
  }
  const ctx = { missing, lang, knownRooms: (req.facts.rooms ?? []).map((r) => r.name) };
  const prompt = buildIntakePrompt({ message: req.message, facts: req.facts, missing, lang });
  let note = '';
  let lastError: unknown = new Error('no attempt');
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await generate({
        system: INTAKE_SYSTEM,
        user: prompt + note,
        schema: INTAKE_JSON_SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      });
      const checked = validateIntakeOutput(raw, ctx);
      if (checked.ok) return { ok: true, value: finalize(checked.value, req, lang) };
      note = retryNote(checked.errors);
      lastError = new Error('invalid model output');
    } catch (error) {
      lastError = error;
      if (isUnavailable(error)) break;
    }
  }
  return { ok: false, error: lastError };
}
