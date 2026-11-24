// @vitest-environment jsdom
process.env.TZ = 'Asia/Kolkata';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { displayTula } from '@/engine/display';
import { onePerGroup } from '@/engine/plan';
import { rankActions } from '@/engine/rank';
import { resetLangForTests } from '@/ui/langStore';
import PlanSection from '@/ui/plan/PlanSection';
import { constantForecast, twoBhk } from '../fixtures/engine';

const forecast = constantForecast(150);
const profile = twoBhk({ budgetTier: 2000 });
const NOON = '2026-11-24T06:30:00.000Z';

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('vayutula.profile', JSON.stringify(profile));
  resetLangForTests();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(NOON));
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(null, { status: 503 })),
  );
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function renderPlan() {
  await act(async () => {
    render(<PlanSection forecast={forecast} />);
  });
}

const meter = () => screen.getByRole('region', { name: "Today's balance" });
const firstCard = async () =>
  within(await screen.findByRole('list', { name: "Today's plan" }))
    .getAllByRole('heading', { level: 3 })[0]!
    .closest('li')!;
const topTula = () =>
  displayTula(onePerGroup(rankActions(profile, forecast, new Date().toISOString()))[0]!.tula);

describe("Today's Tula meter", () => {
  it('starts level with nothing done', async () => {
    await renderPlan();
    expect(within(meter()).getByText(/^0 of \d steps done today$/)).toBeTruthy();
    expect(within(meter()).getByText(/^Tick steps as you do them/)).toBeTruthy();
  });

  it('adds the ticked step’s own numbers as text, and un-ticks', async () => {
    await renderPlan();
    const card = await firstCard();
    const tick = within(card).getByRole('button', { name: 'Mark as done' });
    fireEvent.click(tick);
    expect(tick.getAttribute('aria-pressed')).toBe('true');
    expect(tick.textContent).toBe('Done');
    expect(within(meter()).getByText(/^1 of \d steps done today$/)).toBeTruthy();
    const live = within(meter()).getByText(/^1 of/).closest('[aria-live]');
    expect(live?.getAttribute('aria-live')).toBe('polite');
    const top = topTula();
    if (top.inhaledTotal > 0) {
      expect(meter().textContent).toContain(
        `${top.inhaledTotal.toLocaleString('en-IN')} µg·h/m³ less`,
      );
    }
    fireEvent.click(tick);
    expect(tick.getAttribute('aria-pressed')).toBe('false');
    expect(within(meter()).getByText(/^0 of/)).toBeTruthy();
  });

  it('remembers today’s ticks on this device', async () => {
    await renderPlan();
    fireEvent.click(within(await firstCard()).getByRole('button', { name: 'Mark as done' }));
    const saved = JSON.parse(window.localStorage.getItem('vayutula.ticks')!) as {
      date: string;
      done: string[];
    };
    expect(saved.date).toBe('2026-11-24');
    expect(saved.done).toHaveLength(1);
    cleanup();
    await renderPlan();
    expect(within(meter()).getByText(/^1 of/)).toBeTruthy();
  });

  it('resets on a new day', async () => {
    window.localStorage.setItem(
      'vayutula.ticks',
      JSON.stringify({
        date: '2026-11-23',
        done: [onePerGroup(rankActions(profile, forecast, NOON))[0]!.action.id],
      }),
    );
    await renderPlan();
    expect(within(meter()).getByText(/^0 of/)).toBeTruthy();
  });

  it('ignores a damaged saved value', async () => {
    window.localStorage.setItem('vayutula.ticks', '{not json');
    await renderPlan();
    expect(within(meter()).getByText(/^0 of/)).toBeTruthy();
  });
});
