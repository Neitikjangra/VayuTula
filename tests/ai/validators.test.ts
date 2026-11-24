import { describe, expect, it } from 'vitest';
import { stripNulls, validateIntakeOutput } from '@/ai/validators';
import { INTAKE_FIELDS } from '@/domain';

const all = [...INTAKE_FIELDS];
const ctx = { missing: all, lang: 'en' as const, knownRooms: [] };

function output(overrides: Record<string, unknown> = {}) {
  return {
    profileDelta: {
      members: [{ label: 'Kid', ageGroup: 'child', sleepsIn: 'Kids room' }],
      rooms: [{ name: 'Kids room', kind: 'bedroom', areaValue: 120, areaUnit: 'sqft' }],
    },
    nextField: 'cooking',
    question: 'What do you usually cook on?',
    lang: 'en',
    ...overrides,
  };
}

describe('validateIntakeOutput() (FR-1)', () => {
  it('accepts a well-formed reply', () => {
    const result = validateIntakeOutput(output(), ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.question).toBe('What do you usually cook on?');
  });

  it('ignores null fields the model may emit', () => {
    const raw = output({
      profileDelta: { members: null, budgetTier: null, cooking: { fuel: 'lpg', chimney: null } },
    });
    const result = validateIntakeOutput(raw, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.profileDelta).toEqual({ cooking: { fuel: 'lpg' } });
  });

  it.each<[string, unknown]>([
    ['not an object', 'hello'],
    ['unknown next field', output({ nextField: 'pets' })],
    ['out-of-range meals', output({ profileDelta: { cooking: { mealsPerDay: 40 } } })],
    ['unknown room kind', output({ profileDelta: { rooms: [{ name: 'Puja', kind: 'temple' }] } })],
    ['budget not a tier', output({ profileDelta: { budgetTier: 5000 } })],
  ])('rejects invalid shape: %s', (_label, raw) => {
    expect(validateIntakeOutput(raw, ctx).ok).toBe(false);
  });

  it('rejects asking about a topic that is already answered', () => {
    const result = validateIntakeOutput(output({ nextField: 'members' }), {
      ...ctx,
      missing: ['cooking', 'budget'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/nextField/);
  });

  it('rejects a person sleeping in a room that does not exist', () => {
    const raw = output({
      profileDelta: { members: [{ label: 'A', ageGroup: 'adult', sleepsIn: 'Attic' }] },
    });
    expect(validateIntakeOutput(raw, ctx).ok).toBe(false);
  });

  it('accepts a room known from earlier turns', () => {
    const raw = output({
      profileDelta: { members: [{ label: 'A', ageGroup: 'adult', sleepsIn: 'Attic' }] },
    });
    expect(validateIntakeOutput(raw, { ...ctx, knownRooms: ['Attic'] }).ok).toBe(true);
  });

  it('rejects an area without its unit (the model must not guess units)', () => {
    const raw = output({
      profileDelta: { rooms: [{ name: 'Hall', kind: 'living', areaValue: 200 }] },
    });
    expect(validateIntakeOutput(raw, ctx).ok).toBe(false);
  });

  it('rejects medical advice in the question', () => {
    const result = validateIntakeOutput(
      output({ question: 'Does your son use his inhaler twice a day?' }),
      ctx,
    );
    expect(result.ok).toBe(false);
  });

  it('rejects HTML or links in the question', () => {
    expect(validateIntakeOutput(output({ question: 'See <a href="x">this</a>' }), ctx).ok).toBe(
      false,
    );
    expect(
      validateIntakeOutput(output({ question: 'Read https://example.com first' }), ctx).ok,
    ).toBe(false);
  });

  it('drops (but does not reject) a question in the wrong script, so the built-in one is used', () => {
    const hindi = validateIntakeOutput(
      output({ question: 'What fuel do you cook with?', lang: 'hi' }),
      { ...ctx, lang: 'hi' },
    );
    expect(hindi.ok && hindi.value.question).toBe(null);
    const english = validateIntakeOutput(output({ question: 'आप किस ईंधन से खाना बनाते हैं?' }), ctx);
    expect(english.ok && english.value.question).toBe(null);
  });

  it('drops an over-long question', () => {
    const result = validateIntakeOutput(output({ question: 'Why '.repeat(80) }), ctx);
    expect(result.ok && result.value.question).toBe(null);
  });
});

describe('stripNulls()', () => {
  it('removes nulls deeply but keeps arrays and other values', () => {
    expect(stripNulls({ a: null, b: [1, null, { c: null, d: 2 }], e: { f: null } })).toEqual({
      b: [1, { d: 2 }],
      e: {},
    });
  });
});
