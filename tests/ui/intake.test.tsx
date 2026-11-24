// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProfileSchema, type IntakeRequest } from '@/domain';
import { LANG_STORAGE_KEY, resetLangForTests } from '@/ui/langStore';
import SetupScreen from '@/ui/setup/SetupScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

type Reply = Record<string, unknown> | { status: number };
let replies: Reply[] = [];
const sent: IntakeRequest[] = [];

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem(
    'vayutula.place',
    JSON.stringify({ kind: 'search', name: 'Noida', lat: 28.58, lon: 77.33 }),
  );
  resetLangForTests();
  push.mockReset();
  sent.length = 0;
  replies = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)) as IntakeRequest);
      const next = replies.shift() ?? { status: 503 };
      if ('status' in next && typeof next.status === 'number')
        return new Response(null, { status: next.status });
      return Response.json({ symptomNotice: false, ...next });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function say(text: string) {
  fireEvent.change(screen.getByLabelText('Your message'), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
  });
}

const turn1 = {
  profileDelta: {
    members: [
      { label: 'Me', ageGroup: 'adult', sleepsIn: 'Our room' },
      { label: 'Son', ageGroup: 'child', sensitive: true, sleepsIn: 'Kids room' },
    ],
    rooms: [
      { name: 'Our room', kind: 'bedroom', hasPurifier: true, purifierModel: 'Philips AC1215' },
      { name: 'Kids room', kind: 'bedroom', areaValue: 110, areaUnit: 'sqft' },
      { name: 'Hall', kind: 'living' },
    ],
  },
  nextField: 'cooking',
  question: 'What do you cook on, and how many meals a day?',
  lang: 'en',
};

describe('chat setup (FR-1)', () => {
  it('opens with a welcome and keeps "Use the form instead" visible', () => {
    render(<SetupScreen />);
    expect(screen.getByText(/Describe your home in a few sentences/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use the form instead' })).toBeTruthy();
    expect(screen.getByText('Nothing yet. Start by describing your home.')).toBeTruthy();
  });

  it('fills the live summary from the reply and labels the AI-written question', async () => {
    replies = [turn1];
    render(<SetupScreen />);
    await say('Me and my son, two bedrooms and a hall. Philips AC1215 in our room.');
    expect(sent[0]).toMatchObject({ facts: {}, answered: [], asked: 0, lang: 'en' });
    expect(screen.getByText('People: Me (Adult), Son (Child)')).toBeTruthy();
    expect(
      screen.getByText(
        /Rooms: Our room \(Bedroom, 12 m², purifier\), Kids room \(Bedroom, 10 m²\)/,
      ),
    ).toBeTruthy();
    expect(screen.getByText('What do you cook on, and how many meals a day?')).toBeTruthy();
    expect(screen.getByText('AI-written')).toBeTruthy();
  });

  it('sends what it already knows on the next turn, and uses the built-in question when the AI gives none', async () => {
    replies = [
      turn1,
      {
        profileDelta: { cooking: { fuel: 'lpg', mealsPerDay: 2 } },
        nextField: 'sources',
        question: null,
        lang: 'en',
      },
    ];
    render(<SetupScreen />);
    await say('first');
    await say('LPG, twice a day');
    expect(sent[1]?.facts.members).toHaveLength(2);
    expect(sent[1]?.answered).toEqual(expect.arrayContaining(['members', 'rooms', 'purifier']));
    expect(sent[1]?.asked).toBe(1);
    expect(
      screen.getByText('Do you burn incense or mosquito coils, or does anyone smoke indoors?'),
    ).toBeTruthy();
    expect(screen.getByText('Cooking: LPG cylinder, 2 meals a day')).toBeTruthy();
  });

  it('shows the fixed consult-a-doctor message when symptoms are mentioned', async () => {
    replies = [{ ...turn1, symptomNotice: true }];
    render(<SetupScreen />);
    await say('my son keeps coughing');
    expect(screen.getByText(/please consult a doctor/).getAttribute('role')).toBe('alert');
  });

  it('asks the user to wait when rate-limited, staying in the chat', async () => {
    replies = [{ status: 429 }];
    render(<SetupScreen />);
    await say('hello');
    expect(screen.getByText(/a lot of messages in a minute/)).toBeTruthy();
    expect(screen.getByLabelText('Your message')).toBeTruthy();
  });

  it('falls back to the form, keeping what was already understood, when the AI fails', async () => {
    replies = [turn1, { status: 503 }];
    render(<SetupScreen />);
    await say('first');
    await say('second');
    expect(screen.getByText(/AI helper isn't available/).getAttribute('role')).toBe('status');
    const names = screen
      .getAllByLabelText<HTMLInputElement>('Name or nickname')
      .map((i) => i.value);
    expect(names).toEqual(['Me', 'Son']);
    const rooms = screen.getAllByLabelText<HTMLInputElement>('Room name').map((i) => i.value);
    expect(rooms).toEqual(['Our room', 'Kids room', 'Hall']);
  });

  it('finishes, then saves a valid profile', async () => {
    replies = [{ ...turn1, nextField: 'done', question: null }];
    render(<SetupScreen />);
    await say('everything');
    expect(
      screen.getByText("Thanks, that's enough to start. Check the summary, then save."),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Your message')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save and see actions' }));
    });
    const saved = ProfileSchema.parse(JSON.parse(window.localStorage.getItem('vayutula.profile')!));
    expect(saved.rooms[0]).toMatchObject({ name: 'Our room', purifierId: 'philips-ac1215' });
    expect(push).toHaveBeenCalledWith('/');
  });

  it('works in Hindi', async () => {
    window.localStorage.setItem(LANG_STORAGE_KEY, 'hi');
    replies = [
      {
        profileDelta: { members: [{ label: 'दादी', ageGroup: 'elder' }] },
        nextField: 'rooms',
        question: 'आपके घर में कौन-से कमरे हैं?',
        lang: 'hi',
      },
    ];
    render(<SetupScreen />);
    fireEvent.change(screen.getByLabelText('आपका संदेश'), { target: { value: 'घर में दादी रहती हैं' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'भेजें' }));
    });
    expect(sent[0]?.lang).toBe('hi');
    expect(screen.getByText('लोग: दादी (बुज़ुर्ग (60+))')).toBeTruthy();
    expect(screen.getByText('आपके घर में कौन-से कमरे हैं?')).toBeTruthy();
  });
});
