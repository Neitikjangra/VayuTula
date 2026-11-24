import { describe, expect, it } from 'vitest';
import { appConfig } from '@/config';
import { displayTula } from '@/engine/display';
import { householdSummary, outdoorMean, planCandidates, timeWindowFor } from '@/engine/plan';
import { rankActions } from '@/engine/rank';
import { buildTimeline } from '@/engine/timeline';
import { START_ISO, constantForecast, forecastOf, twoBhk } from '../fixtures/engine';

const action = (id: string) => appConfig.actions.find((a) => a.id === id)!;
const HOUR = 3_600_000;
const at = (localHour: number) => new Date(Date.parse(START_ISO) + localHour * HOUR).toISOString();
const timeline = (localHour = 0, forecast = constantForecast(150)) =>
  buildTimeline(forecast, at(localHour));

describe('timeWindowFor() (FR-6: each plan item has a time window)', () => {
  it('runs a purifier while its room is occupied', () => {
    expect(
      timeWindowFor(twoBhk(), action('run-purifier-when-occupied'), timeline(), appConfig),
    ).toEqual({ fromHour: 22, toHour: 7 });
  });

  it('puts an added purifier where it will be used most', () => {
    expect(
      timeWindowFor(
        twoBhk({ budgetTier: 15000 }),
        action('buy-purifier-bedroom'),
        timeline(),
        appConfig,
      ),
    ).toEqual({ fromHour: 21, toHour: 7 });
  });

  it('airs at the cleanest daytime hour of the forecast', () => {
    const values = Array.from({ length: 96 }, (_, i) => (i === 14 ? 30 : 200));
    expect(
      timeWindowFor(
        twoBhk(),
        action('air-at-cleanest-hour'),
        timeline(0, forecastOf(values)),
        appConfig,
      ),
    ).toEqual({ fromHour: 14, toHour: 15 });
  });

  it('ties cooking actions to the next meal', () => {
    expect(timeWindowFor(twoBhk(), action('close-kitchen-door'), timeline(0), appConfig)).toEqual({
      fromHour: 8,
      toHour: 9,
    });
    expect(timeWindowFor(twoBhk(), action('close-kitchen-door'), timeline(10), appConfig)).toEqual({
      fromHour: 20,
      toHour: 21,
    });
    expect(
      timeWindowFor(twoBhk(), action('air-kitchen-after-meals'), timeline(10), appConfig),
    ).toEqual({ fromHour: 21, toHour: 22 });
  });

  it('uses the incense and coil schedules from config', () => {
    expect(timeWindowFor(twoBhk(), action('skip-incense'), timeline(10), appConfig)).toEqual({
      fromHour: 19,
      toHour: 20,
    });
    expect(
      timeWindowFor(twoBhk(), action('vaporiser-instead-of-coil'), timeline(), appConfig),
    ).toEqual({ fromHour: 21, toHour: 5 });
  });

  it('has no window for all-day or one-off actions', () => {
    for (const id of [
      'metro-instead-of-car',
      'seal-window-gaps',
      'switch-to-induction',
      'smoke-outside',
    ]) {
      expect(
        timeWindowFor(
          twoBhk({ sources: { ...twoBhk().sources, smokerIndoors: true } }),
          action(id),
          timeline(),
          appConfig,
        ),
        id,
      ).toBeNull();
    }
  });
});

describe('planCandidates()', () => {
  const profile = twoBhk({ budgetTier: 15000 });
  const t = timeline();
  const ranked = rankActions(profile, constantForecast(150), START_ISO);
  const candidates = planCandidates(profile, ranked, t, (id) => `Title ${id}`, appConfig);

  it('sends at most 8, in ranked (free-first) order', () => {
    expect(candidates.length).toBeLessThanOrEqual(8);
    const order = ranked.map((r) => r.action.id);
    const positions = candidates.map((c) => order.indexOf(c.actionId));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('keeps one step per choice group (no bus and metro in the same plan, found live)', () => {
    const groups = candidates
      .map((c) => appConfig.actions.find((a) => a.id === c.actionId)?.group)
      .filter((g): g is string => g !== undefined);
    expect(new Set(groups).size).toBe(groups.length);
    const ids = candidates.map((c) => c.actionId);
    expect(
      ids.filter((id) => ['bus-instead-of-car', 'metro-instead-of-car', 'carpool'].includes(id))
        .length,
    ).toBeLessThanOrEqual(1);
    expect(ids.filter((id) => id.includes('incense')).length).toBeLessThanOrEqual(1);
  });

  it('carries the numbers exactly as displayed, and no names', () => {
    const first = displayTula(ranked[0]!.tula);
    expect(candidates[0]!.numbers).toEqual({
      inhaledTotal: first.inhaledTotal,
      pmG: first.pmG,
      co2Kg: first.co2Kg,
      rupees: first.rupees,
    });
    expect(JSON.stringify(candidates)).not.toMatch(/Mum|Dad|Kid|Dadi|Noida/);
  });
});

describe('householdSummary() and outdoorMean()', () => {
  it('counts people and rooms without names', () => {
    expect(householdSummary(twoBhk())).toEqual({
      people: 4,
      children: 1,
      elders: 1,
      sensitive: 1,
      rooms: 4,
      purifiers: 1,
    });
  });

  it('averages the outdoor forecast over the next 24 hours', () => {
    const values = Array.from({ length: 96 }, (_, i) => (i < 24 ? 100 : 400));
    expect(outdoorMean(buildTimeline(forecastOf(values), START_ISO))).toBe(100);
  });
});
