// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { displayTula, rankActions } from '@/engine';
import { resetLangForTests } from '@/ui/langStore';
import ActionList from '@/ui/plan/ActionList';
import { START_ISO, constantForecast, twoBhk } from '../fixtures/engine';

const forecast = constantForecast(150);

beforeEach(() => {
  window.localStorage.clear();
  resetLangForTests();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(START_ISO));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function saveProfile(budgetTier: 0 | 2000 | 15000 = 2000) {
  window.localStorage.setItem('vayutula.profile', JSON.stringify(twoBhk({ budgetTier })));
}

describe('ActionList (R2)', () => {
  it('asks for setup when there is no profile', () => {
    render(<ActionList forecast={forecast} />);
    expect(screen.getByText('Set up your home to see actions ranked for it.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Set up your home' }).getAttribute('href')).toBe(
      '/setup',
    );
  });

  it('asks for a city when there is no forecast', () => {
    saveProfile();
    render(<ActionList forecast={null} />);
    expect(screen.getByText('Choose your city above to rank actions for today.')).toBeTruthy();
  });

  it('lists actions free-first with tier, provisional badge and all three pans', () => {
    saveProfile();
    render(<ActionList forecast={forecast} />);
    const cards = screen.getAllByRole('heading', { level: 3 }).map((h) => h.closest('li')!);
    expect(cards.length).toBeGreaterThan(3);
    const tiers = cards.map((c) => (within(c).queryByText('Free') ? 0 : 1));
    expect(tiers).toEqual([...tiers].sort());
    expect(within(cards[0]!).getByText('Provisional')).toBeTruthy();
    expect(within(cards[0]!).getByText('Breathe in')).toBeTruthy();
    expect(within(cards[0]!).getByText('Emit out')).toBeTruthy();
    expect(within(cards[0]!).getAllByText('Estimate')).toHaveLength(3);
  });

  it('shows the engine’s rounded numbers exactly', () => {
    saveProfile();
    render(<ActionList forecast={forecast} />);
    const ranked = rankActions(twoBhk({ budgetTier: 2000 }), forecast, START_ISO);
    const cards = screen.getAllByRole('heading', { level: 3 }).map((h) => h.closest('li')!);
    const n = (v: number) => Math.abs(v).toLocaleString('en-IN');
    const top = displayTula(ranked[0]!.tula);
    const saves =
      top.rupees > 0 ? `Saves ₹${n(top.rupees)} a month` : `Costs ₹${n(top.rupees)} a month`;
    expect(cards[0]!.textContent).toContain(saves);
    expect(cards[0]!.textContent).toContain(`CO₂: ${n(top.co2Kg)} kg`);
    const breathing = ranked.findIndex((r) => displayTula(r.tula).inhaledTotal > 0);
    const d = displayTula(ranked[breathing]!.tula);
    expect(cards[breathing]!.textContent).toContain(`${n(d.inhaledTotal)} µg·h/m³ less`);
  });

  it('says when the forecast is too old to plan with', () => {
    saveProfile();
    vi.setSystemTime(new Date('2026-11-27T00:00:00.000Z'));
    render(<ActionList forecast={forecast} />);
    expect(screen.getByText(/too old to plan with/)).toBeTruthy();
  });
});
