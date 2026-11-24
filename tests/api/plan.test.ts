import type * as AiClient from '@/ai/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlanResponseSchema, type PlanRequest } from '@/domain';

const generateJson = vi.fn();
vi.mock('@/ai/client', async (importOriginal) => ({
  ...(await importOriginal<typeof AiClient>()),
  generateJson: (req: unknown) => generateJson(req),
}));

const { POST } = await import('@/app/api/plan/route');

afterEach(() => {
  generateJson.mockReset();
  vi.restoreAllMocks();
});

let ip = 0;
function post(body: unknown, headers: Record<string, string> = {}) {
  ip += 1;
  return POST(
    new Request('http://localhost/api/plan', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `10.1.0.${ip}`,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

const candidate = (actionId: string, rupees: number) => ({
  actionId,
  title: `Title ${actionId}`,
  costTier: 0,
  numbers: { inhaledTotal: 100, pmG: 0, co2Kg: 0, rupees },
  confidence: 'high',
  timeWindow: null,
});

let n = 0;
function body(overrides: Partial<PlanRequest> = {}): PlanRequest {
  n += 1;
  return {
    profileHash: `${'b'.repeat(30)}${String(n).padStart(2, '0')}`,
    forecastHour: '2026-11-24T19',
    lang: 'en',
    household: { people: 2, children: 0, elders: 0, sensitive: 0, rooms: 2, purifiers: 1 },
    outdoorMean: 150,
    candidates: [
      candidate('skip-incense', 60),
      candidate('close-kitchen-door', 0),
      candidate('cook-with-lid', 87),
    ],
    ...overrides,
  } as PlanRequest;
}

const aiReply = {
  items: [
    { actionId: 'skip-incense', whyText: 'Skip incense: 100 µg·h/m³ less and ₹60 saved a month.' },
    { actionId: 'close-kitchen-door', whyText: 'Keep the kitchen smoke in the kitchen.' },
    { actionId: 'cook-with-lid', whyText: 'A lid saves ₹87 a month.' },
  ],
};

describe('POST /api/plan (FR-6)', () => {
  it('returns the AI plan when it passes every check', async () => {
    generateJson.mockResolvedValue(aiReply);
    const response = await post(body());
    expect(response.status).toBe(200);
    const plan = PlanResponseSchema.parse(await response.json());
    expect(plan.source).toBe('ai');
    expect(plan.items).toHaveLength(3);
  });

  it('falls back to the template plan (200) when the model keeps failing', async () => {
    generateJson.mockResolvedValue({
      items: [{ actionId: 'skip-incense', whyText: 'Saves ₹5,000!' }],
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await post(body());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      source: 'template',
      items: ['skip-incense', 'close-kitchen-door', 'cook-with-lid'].map((actionId) => ({
        actionId,
        whyText: null,
      })),
    });
  });

  it('caches plans per profile hash and forecast hour: one model call per plan', async () => {
    generateJson.mockResolvedValue(aiReply);
    const same = body();
    await post(same);
    const again = await post(same);
    expect(again.headers.get('x-plan-cache')).toBe('hit');
    expect(generateJson).toHaveBeenCalledTimes(1);
    await post({ ...same, forecastHour: '2026-11-24T20' });
    expect(generateJson).toHaveBeenCalledTimes(2);
  });

  it('does not cache template plans, so the AI is tried again later', async () => {
    generateJson.mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const same = body();
    await post(same);
    await post(same);
    expect(generateJson).toHaveBeenCalledTimes(4);
  });

  it.each<[string, unknown]>([
    ['a missing profile hash', { ...body(), profileHash: 'nope' }],
    [
      'nine candidates',
      { ...body(), candidates: Array.from({ length: 9 }, (_, i) => candidate(`a${i}`, 0)) },
    ],
    ['a name-like field', { ...body(), household: { names: ['Mum'] } }],
    ['not JSON', '{oops'],
  ])('rejects %s with 400 and never calls the model', async (_label, b) => {
    expect((await post(b)).status).toBe(400);
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('is rate-limited like every AI route', async () => {
    generateJson.mockResolvedValue(aiReply);
    const headers = { 'x-forwarded-for': '198.51.100.77' };
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await post(body(), headers)).status);
    expect(statuses[19]).toBe(200);
    expect(statuses[20]).toBe(429);
  });
});
