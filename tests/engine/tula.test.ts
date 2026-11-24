import { describe, expect, it } from 'vitest';
import type { AppConfig } from '@/config';
import { appConfig } from '@/config';
import { buildTimeline } from '@/engine/timeline';
import { evaluateAction, totalInhaled } from '@/engine/tula';
import {
  START_ISO,
  configWith,
  constantForecast,
  handConfig,
  oneRoomProfile,
  twoBhk,
} from '../fixtures/engine';

function actionById(cfg: AppConfig, id: string) {
  const action = cfg.actions.find((a) => a.id === id);
  if (!action) throw new Error(`missing action ${id}`);
  return action;
}

function withPurifier(cfg: AppConfig, id: string, cadr: number, watts: number): AppConfig {
  const copy = structuredClone(cfg);
  const purifier = copy.purifiers.find((p) => p.id === id);
  if (!purifier) throw new Error(`missing purifier ${id}`);
  purifier.cadr.value = cadr;
  purifier.watts.value = watts;
  return copy;
}

const timeline = buildTimeline(constantForecast(100), START_ISO);

describe('golden: run the purifier you own (hand-calculated)', () => {
  // V = 25 m³, a = 0.5, P = 0.8, k = 0.25 → λ = 0.75, C = 40 / 0.75.
  // Purifier CADR 100 → λ = 4.75, C = 40 / 4.75. 24 occupied hours.
  const cfg = withPurifier(handConfig, 'generic-small', 100, 50);
  const profile = oneRoomProfile({
    rooms: [
      {
        id: 'bed',
        name: 'Bedroom',
        kind: 'bedroom',
        areaM2: 10,
        heightM: 2.5,
        windowType: 'sealed',
        purifierId: 'generic-small',
        occupancy: [{ memberId: 'a', fromHour: 0, toHour: 24 }],
      },
    ],
  });
  const tula = evaluateAction(
    profile,
    actionById(cfg, 'run-purifier-when-occupied'),
    timeline,
    cfg,
  );

  it('breathe in: 24 × (40/0.75 − 40/4.75) µg·h/m³ avoided', () => {
    expect(tula.inhaledAvoided.a).toBeCloseTo(24 * (40 / 0.75 - 40 / 4.75), 6);
  });

  it('emit out: 36 kWh/month of purifier power at grid factors (negative = adds)', () => {
    // 50 W × 24 h × 30 days = 36 kWh
    expect(tula.co2AvoidedKg).toBeCloseTo(-36 * 0.7, 9);
    expect(tula.pmEmittedAvoidedG).toBeCloseTo(-36 * 0.5, 9);
  });

  it('₹: 36 kWh × ₹8 spent per month', () => {
    expect(tula.rupeesPerMonth).toBeCloseTo(-288, 9);
  });

  it('is high confidence when window type and CADR are known', () => {
    expect(tula.confidence).toBe('high');
    expect(tula.assumptions).toContain('purifiers.generic-small.cadr');
  });
});

describe('golden: LPG to induction (hand-calculated)', () => {
  const cfg = structuredClone(handConfig);
  actionById(cfg, 'switch-to-induction').oneOffRupees.value = 2400;
  const profile = oneRoomProfile({
    cooking: {
      fuel: 'lpg',
      mealsPerDay: 2,
      mealHours: [8, 20],
      chimney: false,
      kitchenDoor: false,
    },
  });
  const tula = evaluateAction(profile, actionById(cfg, 'switch-to-induction'), timeline, cfg);

  it('₹: LPG ₹600 − induction ₹480 − cooktop ₹2,400/12 = −₹80 per month', () => {
    // 60 meals × 0.1 kg × ₹100/kg = 600; 60 × 1 kWh × ₹8 = 480
    expect(tula.rupeesPerMonth).toBeCloseTo(-80, 9);
  });

  it('emit out: 18 kg CO₂ from LPG vs 42 kg from grid power', () => {
    expect(tula.co2AvoidedKg).toBeCloseTo(18 - 42, 9);
    expect(tula.pmEmittedAvoidedG).toBeCloseTo(-30, 9);
  });

  it('breathe in improves because induction cooking emits less indoors', () => {
    expect(tula.inhaledAvoided.a).toBeGreaterThan(0);
  });
});

describe('₹ values come straight from config (FR-13)', () => {
  it('car → metro uses petrol price, mileage and metro fare exactly', () => {
    const profile = oneRoomProfile({ commute: { mode: 'car', kmPerDay: 20, daysPerWeek: 5 } });
    const tula = evaluateAction(
      profile,
      actionById(appConfig, 'metro-instead-of-car'),
      timeline,
      appConfig,
    );
    const km = (20 * 5 * 30) / 7;
    const t = appConfig.tariffs;
    const f = appConfig.factors.transport;
    const carCost = (km / t.carKmPerLitre.value) * t.petrolPerLitre.value;
    expect(tula.rupeesPerMonth).toBeCloseTo(carCost - km * t.metroFarePerKm.value, 9);
    expect(tula.co2AvoidedKg).toBeCloseTo(
      km * (f.car.co2KgPerKm.value - f.metro.co2KgPerKm.value),
      9,
    );
    expect(tula.inhaledAvoided.a).toBe(0);
  });

  it('a one-off purchase is spread over 12 months', () => {
    const profile = oneRoomProfile({
      rooms: [{ ...oneRoomProfile().rooms[0]!, windowType: 'leaky' }],
    });
    const tula = evaluateAction(
      profile,
      actionById(appConfig, 'seal-window-gaps'),
      timeline,
      appConfig,
    );
    expect(tula.rupeesPerMonth).toBeCloseTo(
      -actionById(appConfig, 'seal-window-gaps').oneOffRupees.value / 12,
      9,
    );
  });
});

describe('per-member breathe-in', () => {
  const tula = evaluateAction(
    twoBhk(),
    actionById(appConfig, 'run-purifier-when-occupied'),
    timeline,
    appConfig,
  );

  it('has one value per member, and the total is their sum', () => {
    expect(Object.keys(tula.inhaledAvoided).sort()).toEqual(['dad', 'dadi', 'kid', 'mum']);
    const sum = Object.values(tula.inhaledAvoided).reduce((s, v) => s + v, 0);
    expect(totalInhaled(tula)).toBeCloseTo(sum, 9);
  });

  it('only helps members who use the purifier room', () => {
    expect(tula.inhaledAvoided.mum).toBeGreaterThan(0);
    expect(tula.inhaledAvoided.kid).toBeCloseTo(0, 9);
  });

  it('a member who is never home has zero exposure change', () => {
    const away = twoBhk({
      members: [
        ...twoBhk().members,
        { id: 'guest', label: 'Guest', ageGroup: 'adult', sensitive: false },
      ],
    });
    const t = evaluateAction(away, actionById(appConfig, 'skip-incense'), timeline, appConfig);
    expect(t.inhaledAvoided.guest).toBe(0);
    expect(t.inhaledAvoided.dadi).toBeGreaterThan(0);
  });
});

describe('confidence', () => {
  it('is medium when one input is defaulted and low when both are', () => {
    const base = oneRoomProfile().rooms[0]!;
    const run = actionById(appConfig, 'air-at-cleanest-hour');
    const noWindow = oneRoomProfile({ rooms: [{ ...base, windowType: undefined }] });
    const both = oneRoomProfile({
      rooms: [{ ...base, windowType: undefined, purifierId: 'unknown' }],
    });
    expect(evaluateAction(noWindow, run, timeline, appConfig).confidence).toBe('med');
    expect(evaluateAction(both, run, timeline, appConfig).confidence).toBe('low');
  });
});

describe('scenario details', () => {
  const cfg = configWith({});
  it('closing the kitchen door keeps cooking smoke out of the living room', () => {
    const t = evaluateAction(twoBhk(), actionById(cfg, 'close-kitchen-door'), timeline, cfg);
    expect(t.inhaledAvoided.dadi).toBeGreaterThan(0);
  });

  it('a vaporiser removes coil smoke from bedrooms at night', () => {
    const t = evaluateAction(twoBhk(), actionById(cfg, 'vaporiser-instead-of-coil'), timeline, cfg);
    expect(t.inhaledAvoided.kid).toBeGreaterThan(0);
    expect(t.assumptions).toContain('factors.emission.coilPerNight');
  });
});
