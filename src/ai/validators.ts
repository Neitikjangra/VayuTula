import * as z from 'zod/mini';
import {
  INTAKE_FIELDS,
  IntakeFactsSchema,
  type IntakeFacts,
  type IntakeField,
  type NextField,
  type PlanCandidate,
  BREATHE_IN_HOURS,
  PLAN_MAX_ITEMS,
  PLAN_MIN_ITEMS,
} from '@/domain';
import { containsHealthAdvice } from './health';
import { unexpectedNumbers } from './numbers';

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

const MAX_REASON_CHARS = 200;

const PlanModelOutputSchema = z.object({
  items: z.array(z.object({ actionId: z.string(), whyText: z.string() })),
});

export interface PlanModelOutput {
  items: { actionId: string; whyText: string }[];
}

export interface PlanContext {
  candidates: PlanCandidate[];
  lang: 'en' | 'hi';
}

/** Numbers a reason may use: the action's displayed values, its window hours and 24 (h). */
function allowedNumbers(c: PlanCandidate): number[] {
  const { inhaledTotal, pmG, co2Kg, rupees } = c.numbers;
  const w = c.timeWindow;
  const hours = w ? [w.fromHour, w.toHour, w.toHour % 24] : [];
  return [inhaledTotal, pmG, co2Kg, rupees, ...hours, BREATHE_IN_HOURS];
}

/** Health, markup, language and number checks for one reason. */
function reasonErrors(i: number, text: string, c: PlanCandidate, lang: 'en' | 'hi'): string[] {
  const t = text.trim();
  const at = `items[${i}].whyText`;
  if (!t) return [`${at} is empty`];
  const errors: string[] = [];
  if (t.length > MAX_REASON_CHARS)
    errors.push(`${at} is longer than ${MAX_REASON_CHARS} characters`);
  if (containsHealthAdvice(t))
    errors.push(`${at} must not contain medical advice, medicines or doses`);
  if (/[<>]|https?:|www\./i.test(t)) errors.push(`${at} must not contain HTML or links`);
  if (/\d:(?!\d{2})/.test(t)) errors.push(`${at} must write times as HH:00, e.g. 22:00–07:00`);
  if (DEVANAGARI.test(t) !== (lang === 'hi'))
    errors.push(`${at} must be written in ${lang === 'hi' ? 'Hindi (Devanagari)' : 'English'}`);
  const extra = unexpectedNumbers(t, allowedNumbers(c));
  if (extra.length > 0)
    errors.push(`${at} uses numbers not computed for this action: ${extra.join(', ')}`);
  return errors;
}

/** Count, known ids, no repeats and free-first order (FR-14). */
function structureErrors(items: PlanModelOutput['items'], candidates: PlanCandidate[]): string[] {
  const errors: string[] = [];
  const min = Math.min(PLAN_MIN_ITEMS, candidates.length);
  const max = Math.min(PLAN_MAX_ITEMS, candidates.length);
  if (items.length < min || items.length > max)
    errors.push(`choose between ${min} and ${max} actions`);
  const ids = items.map((i) => i.actionId);
  if (new Set(ids).size !== ids.length) errors.push('each action may appear only once');
  const unknown = ids.filter((id) => !candidates.some((c) => c.actionId === id));
  if (unknown.length > 0) errors.push(`${unknown.join(', ')} is not one of the given actions`);
  const tiers = ids.map((id) => candidates.find((c) => c.actionId === id)?.costTier ?? 0);
  if (tiers.some((tier, i) => i > 0 && tier < (tiers[i - 1] ?? 0)))
    errors.push('free-first order: no paid action may come before a free one');
  return errors;
}

/** Number, action, free-first and health checks for the plan model's reply (FR-6). */
export function validatePlanOutput(raw: unknown, ctx: PlanContext): Validation<PlanModelOutput> {
  const parsed = PlanModelOutputSchema.safeParse(stripNulls(raw));
  if (!parsed.success)
    return { ok: false, errors: ['reply must be {"items":[{"actionId","whyText"}]}'] };
  const { items } = parsed.data;
  const errors = structureErrors(items, ctx.candidates);
  items.forEach((item, i) => {
    const c = ctx.candidates.find((x) => x.actionId === item.actionId);
    if (c) errors.push(...reasonErrors(i, item.whyText, c, ctx.lang));
  });
  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: { items: items.map((i) => ({ actionId: i.actionId, whyText: i.whyText.trim() })) },
  };
}
