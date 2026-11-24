// @vitest-environment jsdom
process.env.TZ = 'Asia/Kolkata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { PlanRequest } from '@/domain';
import { displayTula } from '@/engine/display';
import { onePerGroup } from '@/engine/plan';
import { rankActions } from '@/engine/rank';
import { DeleteDataButton, deleteLocalData } from '@/ui/DeleteDataButton';
import { resetLangForTests } from '@/ui/langStore';
import PlanSection from '@/ui/plan/PlanSection';
import { constantForecast, twoBhk } from '../fixtures/engine';

const forecast = constantForecast(150);
const profile = twoBhk({ budgetTier: 2000 });
/** 23:00 in India on 24 Nov 2026: inside the master bedroom's 22:00–07:00 purifier slot. */
const NIGHT = '2026-11-24T17:30:00.000Z';
const NOON = '2026-11-24T06:30:00.000Z';

let planReply: () => Response;
const sent: PlanRequest[] = [];

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('vayutula.profile', JSON.stringify(profile));
  resetLangForTests();
  sent.length = 0;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NIGHT));
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init?: RequestInit) => {
      sent.push(JSON.parse(String(init?.body)) as PlanRequest);
      return planReply();
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const ranked = () => rankActions(profile, forecast, new Date().toISOString());
/** What today's plan chooses from: the ranked list with one action per choice group. */
const planRanked = () => onePerGroup(ranked());

async function renderPlan() {
  await act(async () => {
    render(<PlanSection forecast={forecast} />);
  });
}

const planCards = async () =>
  within(await screen.findByRole('list', { name: "Today's plan" }))
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.closest('li')!);

describe("today's plan (FR-6)", () => {
  it('shows the AI-written plan in order, with time windows and AI labels', async () => {
    const ids = planRanked()
      .slice(0, 3)
      .map((r) => r.action.id);
    planReply = () =>
      Response.json({
        source: 'ai',
        items: ids.map((actionId, i) => ({
          actionId,
          whyText: `Reason number one ${'x'.repeat(i)}`,
        })),
      });
    await renderPlan();
    // The engine's plan shows first; wait for the AI plan to replace it.
    await screen.findAllByText('AI-written reason');
    expect(screen.queryByText('Adding AI-written reasons…')).toBeNull();
    const cards = await planCards();
    expect(cards).toHaveLength(3);
    expect(within(cards[0]!).getByText('AI-written reason')).toBeTruthy();
    expect(within(cards[0]!).getByText(/^When: /)).toBeTruthy();
    expect(within(cards[0]!).getByText('Breathe in')).toBeTruthy();
  });

  it('sends counts and numbers only: no names, no place', async () => {
    planReply = () => new Response(null, { status: 503 });
    await renderPlan();
    // The request leaves after the profile hash is computed; slower machines (CI) need the wait.
    await vi.waitFor(() => expect(sent).toHaveLength(1));
    const body = JSON.stringify(sent[0]);
    expect(sent[0]?.profileHash).toMatch(/^[a-f0-9]{16,64}$/);
    expect(body).not.toMatch(/Mum|Dad|Dadi|Kid|Noida|28\.58/);
    expect(sent[0]?.household).toEqual({
      people: 4,
      children: 1,
      elders: 1,
      sensitive: 1,
      rooms: 4,
      purifiers: 1,
    });
  });

  it('falls back to the template plan with built-in reasons from engine numbers', async () => {
    planReply = () => new Response(null, { status: 503 });
    await renderPlan();
    const cards = await planCards();
    expect(cards.length).toBe(Math.min(5, planRanked().length));
    expect(screen.queryByText('AI-written reason')).toBeNull();
    const top = displayTula(ranked()[0]!.tula);
    if (top.inhaledTotal > 0) {
      expect(cards[0]!.textContent).toContain(
        `${top.inhaledTotal.toLocaleString('en-IN')} µg·h/m³ over the next 24 h`,
      );
    }
  });

  it('shows the plan at once while the AI is still writing (no waiting, found live)', async () => {
    planReply = () => new Response(null, { status: 200 });
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => undefined)),
    );
    await renderPlan();
    expect(screen.getByText('Adding AI-written reasons…')).toBeTruthy();
    expect((await planCards()).length).toBe(Math.min(5, planRanked().length));
  });

  it('reuses the plan saved on this device instead of asking again', async () => {
    const ids = planRanked()
      .slice(0, 3)
      .map((r) => r.action.id);
    planReply = () =>
      Response.json({
        source: 'ai',
        items: ids.map((actionId) => ({ actionId, whyText: 'Good step.' })),
      });
    await renderPlan();
    await screen.findAllByText('Good step.');
    cleanup();
    await renderPlan();
    await screen.findAllByText('Good step.');
    expect(sent).toHaveLength(1);
    expect(await planCards()).toHaveLength(3);
  });

  it('opens a why panel with inputs, formula, provisional assumptions and confidence (FR-7)', async () => {
    planReply = () => new Response(null, { status: 503 });
    await renderPlan();
    const card = (await planCards())[0]!;
    fireEvent.click(within(card).getByRole('button', { name: 'Why this step?' }));
    expect(
      within(card).getByRole('button', { name: 'Why this step?' }).getAttribute('aria-expanded'),
    ).toBe('true');
    expect(
      within(card).getByText('Outdoor PM2.5, next 24 h average: 150 µg/m³ (test)'),
    ).toBeTruthy();
    expect(within(card).getByText(/^Breathe in: indoor PM2.5 is estimated/)).toBeTruthy();
    const deposition = within(card).getByTitle('factors.deposition');
    expect(deposition.textContent).toContain('Particles settling indoors (per hour): 0.2');
    expect(deposition.textContent).toMatch(/Provisional|verified \d{4}-\d{2}-\d{2}/);
    expect(within(card).getByText(/^Confidence: (high|medium|low)\./)).toBeTruthy();
  });

  it('lists every ranked action under "All ranked actions"', async () => {
    planReply = () => new Response(null, { status: 503 });
    await renderPlan();
    const details = screen.getByText('All ranked actions').closest('details')!;
    expect(within(details).getAllByRole('heading', { level: 3 })).toHaveLength(ranked().length);
  });

  it('asks for setup when there is no saved home', async () => {
    window.localStorage.removeItem('vayutula.profile');
    await renderPlan();
    expect(screen.getByRole('link', { name: 'Set up your home' })).toBeTruthy();
  });
});

describe('purifier nudge (FR-16)', () => {
  beforeEach(() => {
    planReply = () => new Response(null, { status: 503 });
  });

  it('shows the banner in the planned hours and logs a "done" tap', async () => {
    await renderPlan();
    expect(screen.getByText('Switch on the purifier now in Master bedroom')).toBeTruthy();
    expect(screen.getByText('Planned: 22:00–07:00')).toBeTruthy();
    expect(screen.getByText('Purifier hours logged this week: 0')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: "Done, it's on" }));
    expect(screen.getByText('Logged for today. Thank you!')).toBeTruthy();
    expect(screen.getByText('Purifier hours logged this week: 9')).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem('vayutula.purifierLog')!)).toEqual([
      { date: '2026-11-24', roomId: 'master', hours: 9 },
    ]);
  });

  it('stays quiet outside the planned hours but still shows the weekly count', async () => {
    vi.setSystemTime(new Date(NOON));
    window.localStorage.setItem(
      'vayutula.purifierLog',
      JSON.stringify([{ date: '2026-11-23', roomId: 'master', hours: 9 }]),
    );
    await renderPlan();
    expect(screen.queryByText(/Switch on the purifier now/)).toBeNull();
    expect(screen.getByText('Purifier hours logged this week: 9')).toBeTruthy();
  });
});

describe('delete my data', () => {
  it('removes only VayuTula keys', () => {
    window.localStorage.setItem('other.app', 'keep');
    window.localStorage.setItem('vayutula.purifierLog', '[]');
    deleteLocalData();
    expect(window.localStorage.getItem('vayutula.profile')).toBeNull();
    expect(window.localStorage.getItem('vayutula.purifierLog')).toBeNull();
    expect(window.localStorage.getItem('other.app')).toBe('keep');
  });

  it('asks first and keeps everything if the user cancels', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<DeleteDataButton />);
    fireEvent.click(screen.getByRole('button', { name: 'Delete my data' }));
    expect(window.confirm).toHaveBeenCalled();
    expect(window.localStorage.getItem('vayutula.profile')).not.toBeNull();
  });
});
