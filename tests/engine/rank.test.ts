import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { appConfig, configRegistry } from '@/config';
import {
  BUDGET_TIERS,
  COMMUTE_MODES,
  FUELS,
  ROOM_KINDS,
  WINDOW_TYPES,
  numberValue,
  type Profile,
  type ProfileInput,
} from '@/domain';
import { isApplicable, rankActions, scoreWeights, withinBudget } from '@/engine/rank';
import { START_ISO, constantForecast, forecastOf, profileOf, twoBhk } from '../fixtures/engine';

const forecast = constantForecast(150);

describe('applicability (FR-4)', () => {
  const action = (id: string) => appConfig.actions.find((a) => a.id === id)!;

  it('never suggests induction to a home that already cooks on induction', () => {
    const induction = twoBhk({ cooking: { ...twoBhk().cooking, fuel: 'induction' } });
    expect(isApplicable(action('switch-to-induction'), induction)).toBe(false);
    expect(isApplicable(action('switch-to-induction'), twoBhk())).toBe(true);
  });

  it('only suggests coil and incense tips when they are used', () => {
    const clean = twoBhk({
      sources: { incensePerDay: 0, coilNightsPerWeek: 0, smokerIndoors: false },
    });
    expect(isApplicable(action('skip-incense'), clean)).toBe(false);
    expect(isApplicable(action('vaporiser-instead-of-coil'), clean)).toBe(false);
  });

  it('only suggests running a purifier the home owns', () => {
    const none = twoBhk({ rooms: twoBhk().rooms.map((r) => ({ ...r, purifierId: undefined })) });
    expect(isApplicable(action('run-purifier-when-occupied'), none)).toBe(false);
  });
});

describe('budget filter', () => {
  it('budget ₹0 keeps only free actions', () => {
    const ranked = rankActions(twoBhk({ budgetTier: 0 }), forecast, START_ISO);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.every((r) => r.action.costTier === 0)).toBe(true);
  });

  it('budget ₹2,000 never shows a purchase above ₹2,000', () => {
    const ranked = rankActions(twoBhk({ budgetTier: 2000 }), forecast, START_ISO);
    expect(ranked.every((r) => numberValue(r.action.oneOffRupees) <= 2000)).toBe(true);
    expect(ranked.some((r) => r.action.costTier === 1)).toBe(true);
  });

  it('maps tiers as agreed: 0 → free, 2000 → ≤ ₹2,000, 15000 → ≤ ₹15,000', () => {
    const at = (rupees: number) => ({
      ...appConfig.actions[0]!,
      oneOffRupees: { ...appConfig.actions[0]!.oneOffRupees, value: rupees },
    });
    expect(withinBudget(at(0), 0)).toBe(true);
    expect(withinBudget(at(1), 0)).toBe(false);
    expect(withinBudget(at(2000), 2000)).toBe(true);
    expect(withinBudget(at(15001), 15000)).toBe(false);
  });
});

describe('ranking', () => {
  it('drops actions with no benefit on any pan', () => {
    const ranked = rankActions(twoBhk(), forecast, START_ISO);
    for (const { tula } of ranked) {
      const inhaled = Object.values(tula.inhaledAvoided).reduce((s, v) => s + v, 0);
      expect(
        inhaled >= 1 ||
          tula.pmEmittedAvoidedG >= 1 ||
          tula.co2AvoidedKg >= 0.1 ||
          tula.rupeesPerMonth >= 1,
      ).toBe(true);
    }
  });

  it('doubles the breathe-in weight when anyone is a child, elder or sensitive', () => {
    const adults = twoBhk({
      members: twoBhk().members.map((m) => ({
        ...m,
        ageGroup: 'adult' as const,
        sensitive: false,
      })),
    });
    expect(scoreWeights(twoBhk(), appConfig).breatheIn).toBe(2);
    expect(scoreWeights(adults, appConfig).breatheIn).toBe(1);
  });

  it('shows an effect only once when two actions do the same thing in this home', () => {
    // The only purifier is in a bedroom, so "run when occupied" equals "run during sleep".
    const ids = rankActions(twoBhk(), forecast, START_ISO).map((r) => r.action.id);
    const purifierRuns = ids.filter((id) => id.startsWith('run-purifier'));
    expect(purifierRuns).toHaveLength(1);
  });

  it('every assumption it cites exists in config', () => {
    for (const { tula } of rankActions(twoBhk({ budgetTier: 15000 }), forecast, START_ISO)) {
      for (const key of tula.assumptions) expect(configRegistry.has(key), key).toBe(true);
    }
  });

  it('two homes with different budgets get different plans', () => {
    const budget = rankActions(twoBhk({ budgetTier: 0 }), forecast, START_ISO).map(
      (r) => r.action.id,
    );
    const wellOff = rankActions(twoBhk({ budgetTier: 15000 }), forecast, START_ISO).map(
      (r) => r.action.id,
    );
    expect(wellOff).not.toEqual(budget);
  });
});

const hourArb = fc.integer({ min: 0, max: 23 });
const memberIds = ['m0', 'm1', 'm2', 'm3'];
const purifierIds = appConfig.purifiers.map((p) => p.id);

const profileArb: fc.Arbitrary<ProfileInput> = fc
  .record({
    memberCount: fc.integer({ min: 1, max: 4 }),
    ages: fc.array(fc.constantFrom('child', 'adult', 'elder' as const), {
      minLength: 4,
      maxLength: 4,
    }),
    rooms: fc.array(
      fc.record({
        kind: fc.constantFrom(...ROOM_KINDS),
        areaM2: fc.integer({ min: 4, max: 30 }),
        windowType: fc.option(fc.constantFrom(...WINDOW_TYPES), { nil: undefined }),
        purifierId: fc.option(fc.constantFrom(...purifierIds), { nil: undefined }),
        who: fc.integer({ min: 0, max: 3 }),
        from: hourArb,
        to: fc.integer({ min: 0, max: 24 }),
      }),
      { minLength: 1, maxLength: 6 },
    ),
    fuel: fc.constantFrom(...FUELS),
    meals: fc.integer({ min: 0, max: 3 }),
    incense: fc.integer({ min: 0, max: 4 }),
    coil: fc.integer({ min: 0, max: 7 }),
    smoker: fc.boolean(),
    chimney: fc.boolean(),
    door: fc.boolean(),
    mode: fc.constantFrom(...COMMUTE_MODES),
    km: fc.integer({ min: 0, max: 60 }),
    days: fc.integer({ min: 0, max: 7 }),
    budget: fc.constantFrom(...BUDGET_TIERS),
  })
  .map((r) => ({
    city: 'Prop',
    lat: 28.6,
    lon: 77.2,
    lang: 'en' as const,
    members: memberIds
      .slice(0, r.memberCount)
      .map((id, i) => ({ id, label: id, ageGroup: r.ages[i]!, sensitive: i === 0 })),
    rooms: r.rooms.map((room, i) => ({
      id: `r${i}`,
      name: `Room ${i}`,
      kind: room.kind,
      areaM2: room.areaM2,
      windowType: room.windowType,
      purifierId: room.purifierId,
      occupancy: [
        { memberId: memberIds[room.who % r.memberCount]!, fromHour: room.from, toHour: room.to },
      ],
    })),
    cooking: {
      fuel: r.fuel,
      mealsPerDay: r.meals,
      mealHours: [8, 13, 20].slice(0, r.meals),
      chimney: r.chimney,
      kitchenDoor: r.door,
    },
    sources: { incensePerDay: r.incense, coilNightsPerWeek: r.coil, smokerIndoors: r.smoker },
    commute: { mode: r.mode, kmPerDay: r.km, daysPerWeek: r.days },
    budgetTier: r.budget,
  }));

describe('free-first property (FR-14)', () => {
  it('for 1,000 random homes, no paid action ever precedes an applicable free one', () => {
    const pm = fc.array(fc.integer({ min: 5, max: 400 }), { minLength: 96, maxLength: 96 });
    fc.assert(
      fc.property(profileArb, pm, (input, values) => {
        const profile: Profile = profileOf(input);
        const ranked = rankActions(profile, forecastOf(values), START_ISO);
        const firstPaid = ranked.findIndex((r) => r.action.costTier > 0);
        const lastFree = ranked.map((r) => r.action.costTier).lastIndexOf(0);
        return firstPaid === -1 || lastFree < firstPaid;
      }),
      { numRuns: 1000 },
    );
  }, 60_000);
});
