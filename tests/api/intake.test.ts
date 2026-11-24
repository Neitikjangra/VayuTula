import type * as AiClient from '@/ai/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { IntakeResponseSchema } from '@/domain';

const generateJson = vi.fn();
vi.mock('@/ai/client', async (importOriginal) => ({
  ...(await importOriginal<typeof AiClient>()),
  generateJson: (req: unknown) => generateJson(req),
}));

const { POST } = await import('@/app/api/intake/route');

afterEach(() => {
  generateJson.mockReset();
  vi.restoreAllMocks();
});

let ip = 0;
function post(body: unknown, headers: Record<string, string> = {}) {
  ip += 1;
  return POST(
    new Request('http://localhost/api/intake', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': `10.0.0.${ip}`,
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  );
}

const valid = {
  message: 'Two adults and a baby in a 1BHK.',
  facts: {},
  answered: [],
  asked: 0,
  lang: 'en',
};
const reply = {
  profileDelta: { members: [{ label: 'Me', ageGroup: 'adult' }] },
  nextField: 'rooms',
  question: 'Which rooms do you have?',
  lang: 'en',
};

describe('POST /api/intake (FR-1)', () => {
  it('returns { profileDelta, nextQuestion, lang } for a valid description', async () => {
    generateJson.mockResolvedValue(reply);
    const response = await post(valid);
    expect(response.status).toBe(200);
    const body = IntakeResponseSchema.parse(await response.json());
    expect(body).toMatchObject({
      nextField: 'rooms',
      question: 'Which rooms do you have?',
      symptomNotice: false,
    });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it.each<[string, unknown]>([
    ['message over 2,000 characters', { ...valid, message: 'x'.repeat(2001) }],
    ['empty message', { ...valid, message: '   ' }],
    ['unknown language', { ...valid, lang: 'fr' }],
    ['bad facts', { ...valid, facts: { budgetTier: 7 } }],
    ['not JSON', '{oops'],
  ])('rejects %s with 400 and never calls the model', async (_label, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('rejects an oversized body before parsing it', async () => {
    const response = await post({ ...valid, padding: 'x'.repeat(40_000) });
    expect(response.status).toBe(413);
  });

  it('flags symptom mentions so the UI shows the consult-a-doctor message', async () => {
    generateJson.mockResolvedValue(reply);
    const response = await post({ ...valid, message: 'My son keeps coughing at night.' });
    expect((await response.json()).symptomNotice).toBe(true);
  });

  it('returns 503 so the UI falls back to the form when the model keeps failing', async () => {
    generateJson.mockResolvedValue({ nonsense: true });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await post(valid);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ error: 'ai_unavailable' });
    expect(generateJson).toHaveBeenCalledTimes(2);
  });

  it('never logs the user text', async () => {
    generateJson.mockRejectedValue(new Error('boom'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await post({ ...valid, message: 'secret family detail' });
    expect(log.mock.calls.flat().join(' ')).not.toContain('secret family detail');
  });

  it('limits each client to 20 requests a minute', async () => {
    generateJson.mockResolvedValue(reply);
    const headers = { 'x-forwarded-for': '198.51.100.99' };
    const statuses: number[] = [];
    for (let i = 0; i < 21; i++) statuses.push((await post(valid, headers)).status);
    expect(statuses.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(statuses[20]).toBe(429);
  });
});
