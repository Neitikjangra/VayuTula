import { describe, expect, it, vi } from 'vitest';
import { AiError, type GenerateJson, type JsonRequest } from '@/ai/client';
import { templatePlan } from '@/ai/fallback';
import { runPlan } from '@/ai/plan';
import { PLAN_SYSTEM } from '@/ai/prompts/plan';
import { validatePlanOutput } from '@/ai/validators';
import type { PlanCandidate, PlanRequest } from '@/domain';

const candidate = (
  id: string,
  costTier: 0 | 1 | 2,
  numbers: Partial<PlanCandidate['numbers']> = {},
): PlanCandidate => ({
  actionId: id,
  title: `Title of ${id}`,
  costTier,
  numbers: { inhaledTotal: 0, pmG: 0, co2Kg: 0, rupees: 0, ...numbers },
  confidence: 'med',
  timeWindow: null,
});

const candidates: PlanCandidate[] = [
  candidate('run-purifier-bedroom-sleep', 0, {
    inhaledTotal: 1811,
    pmG: -4,
    co2Kg: -9.6,
    rupees: -88,
  }),
  candidate('skip-incense', 0, { inhaledTotal: 1835, rupees: 60 }),
  candidate('bus-instead-of-car', 0, { pmG: 11, co2Kg: 60, rupees: 2065 }),
  candidate('close-kitchen-door', 0, { inhaledTotal: 473 }),
  candidate('vaporiser-instead-of-coil', 1, { inhaledTotal: 1814, co2Kg: -0.4, rupees: -11 }),
];
candidates[0]!.timeWindow = { fromHour: 22, toHour: 7 };

const request = (overrides: Partial<PlanRequest> = {}): PlanRequest => ({
  profileHash: 'a'.repeat(32),
  forecastHour: '2026-11-24T19',
  lang: 'en',
  household: { people: 4, children: 1, elders: 1, sensitive: 1, rooms: 4, purifiers: 1 },
  outdoorMean: 142,
  candidates,
  ...overrides,
});

const goodItems = [
  {
    actionId: 'run-purifier-bedroom-sleep',
    whyText: 'Run it 22:00–07:00 while you sleep: 1,811 µg·h/m³ less over 24 h for ₹88 a month.',
  },
  {
    actionId: 'skip-incense',
    whyText: 'Skipping incense keeps 1,835 µg·h/m³ out of your lungs and saves ₹60 a month.',
  },
  { actionId: 'bus-instead-of-car', whyText: 'The bus saves ₹2,065 and 60 kg of CO₂ a month.' },
  { actionId: 'vaporiser-instead-of-coil', whyText: 'A vaporiser removes coil smoke at night.' },
];

const ctx = { candidates, lang: 'en' as const };

describe('validatePlanOutput() (FR-6 guardrails)', () => {
  it('accepts 3–5 valid items', () => {
    expect(validatePlanOutput({ items: goodItems }, ctx).ok).toBe(true);
  });

  const errorsFor = (items: unknown) => {
    const r = validatePlanOutput({ items }, ctx);
    return r.ok ? [] : r.errors;
  };

  it('rejects a number the engine did not compute (number check)', () => {
    const items = [...goodItems];
    items[2] = { actionId: 'bus-instead-of-car', whyText: 'The bus saves about ₹2,000 a month.' };
    expect(errorsFor(items).join(' ')).toMatch(/2000/);
  });

  it('rejects an action that is not in the top 8 (action check)', () => {
    expect(
      errorsFor([
        ...goodItems.slice(0, 3),
        { actionId: 'buy-purifier-living', whyText: 'Buy one.' },
      ]).join(' '),
    ).toMatch(/not one of/);
  });

  it('rejects a paid action before a free one (free-first check)', () => {
    const items = [goodItems[3]!, goodItems[0]!, goodItems[1]!];
    expect(errorsFor(items).join(' ')).toMatch(/free-first/);
  });

  it('rejects medical advice (health check)', () => {
    const items = [
      ...goodItems.slice(0, 2),
      {
        actionId: 'bus-instead-of-car',
        whyText: 'Good for your child, who should keep using the inhaler.',
      },
    ];
    expect(errorsFor(items).join(' ')).toMatch(/medical/);
  });

  it.each([
    ['too few items', goodItems.slice(0, 2)],
    [
      'too many items',
      [...goodItems, { actionId: 'close-kitchen-door', whyText: 'Keep it shut.' }, goodItems[0]],
    ],
    ['a repeated action', [goodItems[0], goodItems[0], goodItems[1]]],
    [
      'an empty reason',
      [goodItems[0], goodItems[1], { actionId: 'bus-instead-of-car', whyText: ' ' }],
    ],
    [
      'a link',
      [
        goodItems[0],
        goodItems[1],
        { actionId: 'bus-instead-of-car', whyText: 'See https://x.test' },
      ],
    ],
  ])('rejects %s', (_label, items) => {
    expect(errorsFor(items).length).toBeGreaterThan(0);
  });

  it('rejects broken time formats like "19: से 20:" (found live in Hindi, R4)', () => {
    const items = [
      { actionId: 'run-purifier-bedroom-sleep', whyText: 'Run it from 22: to 7: tonight.' },
      ...goodItems.slice(1, 3),
    ];
    expect(errorsFor(items).join(' ')).toMatch(/HH:00/);
  });

  it('requires Hindi text in Devanagari when lang is hi', () => {
    const r = validatePlanOutput({ items: goodItems }, { ...ctx, lang: 'hi' });
    expect(r.ok).toBe(false);
  });

  it('accepts fewer than 3 items when fewer candidates exist', () => {
    const two = { candidates: candidates.slice(0, 2), lang: 'en' as const };
    expect(validatePlanOutput({ items: goodItems.slice(0, 2) }, two).ok).toBe(true);
  });
});

function model(...replies: unknown[]) {
  const calls: JsonRequest[] = [];
  const generate = vi.fn<GenerateJson>(async (req) => {
    calls.push(req);
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)];
    if (reply instanceof Error) throw reply;
    return reply;
  });
  return { generate, calls };
}

describe('runPlan()', () => {
  it('returns the AI plan when it passes every check', async () => {
    const { generate, calls } = model({ items: goodItems });
    const plan = await runPlan(request(), generate);
    expect(plan.source).toBe('ai');
    expect(plan.items.map((i) => i.actionId)).toEqual(goodItems.map((i) => i.actionId));
    expect(calls[0]!.system).toBe(PLAN_SYSTEM);
    expect(calls[0]!.user).toContain('"inhaledTotal":1811');
  });

  it('sends counts, numbers and titles only: no names or location', async () => {
    const { generate, calls } = model({ items: goodItems });
    await runPlan(request(), generate);
    expect(calls[0]!.user).not.toMatch(/lat|lon|Noida|profileHash/);
  });

  it('retries once with the errors, then uses the template plan', async () => {
    const bad = { items: [{ actionId: 'skip-incense', whyText: 'Saves ₹999!' }] };
    const { generate, calls } = model(bad, bad);
    const plan = await runPlan(request(), generate);
    expect(calls).toHaveLength(2);
    expect(calls[1]!.user).toMatch(/previous reply was rejected/);
    expect(plan).toEqual(templatePlan(candidates));
  });

  it('uses the template plan when the model is unavailable', async () => {
    const { generate } = model(new Error('down'), new Error('down'));
    expect((await runPlan(request(), generate)).source).toBe('template');
  });

  it.each(['unavailable', 'timeout', 'no_key'] as const)(
    'does not retry when the AI is %s (found live: retries doubled the wait to 30 s)',
    async (kind) => {
      const { generate } = model(new AiError(kind), { items: goodItems });
      const plan = await runPlan(request(), generate);
      expect(generate).toHaveBeenCalledTimes(1);
      expect(plan.source).toBe('template');
    },
  );
});

describe('templatePlan()', () => {
  it('takes the first 5 ranked actions, free-first, with built-in reasons', () => {
    expect(templatePlan(candidates)).toEqual({
      source: 'template',
      items: candidates.slice(0, 5).map((c) => ({ actionId: c.actionId, whyText: null })),
    });
  });
});
