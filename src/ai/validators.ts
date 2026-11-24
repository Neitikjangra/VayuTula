import * as z from 'zod/mini';
import {
  INTAKE_FIELDS,
  IntakeFactsSchema,
  type IntakeFacts,
  type IntakeField,
  type NextField,
} from '@/domain';
import { containsHealthAdvice } from './health';

/** Every AI output passes a Zod schema and these checks (PRD 6); failures trigger one retry. */
export type Validation<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const MAX_QUESTION_CHARS = 200;
const DEVANAGARI = /[ऀ-ॿ]/;

const IntakeModelOutputSchema = z.object({
  profileDelta: IntakeFactsSchema,
  nextField: z.enum([...INTAKE_FIELDS, 'done']),
  question: z.optional(z.string()),
  lang: z.enum(['en', 'hi']),
});

export interface IntakeModelOutput {
  profileDelta: IntakeFacts;
  nextField: NextField;
  /** Null when the model's question was unusable; the UI then asks the built-in question. */
  question: string | null;
  lang: 'en' | 'hi';
}

export interface IntakeContext {
  missing: IntakeField[];
  lang: 'en' | 'hi';
  /** Room names already known from earlier turns. */
  knownRooms: string[];
}

/** Removes null values deeply (models often emit null for "not stated"). */
export function stripNulls(value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => v !== null).map(stripNulls);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => [k, stripNulls(v)]),
  );
}

/** Profile sanity: rooms referenced exist, names unique, areas carry their unit. */
function sanityErrors(delta: IntakeFacts, knownRooms: string[]): string[] {
  const errors: string[] = [];
  const names = (delta.rooms ?? []).map((r) => r.name.toLowerCase());
  const rooms = new Set([...names, ...knownRooms.map((n) => n.toLowerCase())]);
  if (new Set(names).size !== names.length) errors.push('room names must be unique');
  for (const m of delta.members ?? []) {
    if (m.sleepsIn && !rooms.has(m.sleepsIn.toLowerCase()))
      errors.push(`sleepsIn "${m.sleepsIn}" is not a room in rooms`);
  }
  for (const r of delta.rooms ?? []) {
    if (r.areaValue !== undefined && r.areaUnit === undefined)
      errors.push(`room "${r.name}" has areaValue without areaUnit`);
  }
  return errors;
}

/** Hard failures in the question: medical advice, markup or links. */
function questionErrors(question: string | undefined): string[] {
  if (!question) return [];
  if (containsHealthAdvice(question))
    return ['question must not contain medical advice, medicines or doses'];
  if (/[<>]|https?:|www\./i.test(question)) return ['question must not contain HTML or links'];
  return [];
}

/** A usable question in the right script, else null (the built-in question is used). */
function usableQuestion(question: string | undefined, lang: 'en' | 'hi'): string | null {
  const q = question?.trim();
  if (!q || q.length > MAX_QUESTION_CHARS) return null;
  return DEVANAGARI.test(q) === (lang === 'hi') ? q : null;
}

/** Schema, topic, sanity and health checks for the intake model's reply (FR-1). */
export function validateIntakeOutput(
  raw: unknown,
  ctx: IntakeContext,
): Validation<IntakeModelOutput> {
  const parsed = IntakeModelOutputSchema.safeParse(stripNulls(raw));
  if (!parsed.success)
    return {
      ok: false,
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    };
  const out = parsed.data;
  const errors = [
    ...sanityErrors(out.profileDelta, ctx.knownRooms),
    ...questionErrors(out.question),
  ];
  if (out.nextField !== 'done' && !ctx.missing.includes(out.nextField)) {
    errors.push(`nextField must be one of: ${[...ctx.missing, 'done'].join(', ')}`);
  }
  if (errors.length > 0) return { ok: false, errors };
  const question = usableQuestion(out.question, ctx.lang);
  return {
    ok: true,
    value: { profileDelta: out.profileDelta, nextField: out.nextField, question, lang: out.lang },
  };
}
