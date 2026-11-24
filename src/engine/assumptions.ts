import { numberValue, type ActionDef, type CommuteMode, type Fuel } from '@/domain';
import type { Scenario } from './scenario';
import { cookingEmissionKey } from './sources';

const FUEL_KEYS: Record<Fuel, string[]> = {
  lpg: [
    'factors.fuelUse.lpgKgPerMeal',
    'factors.co2.lpgKgPerKg',
    'tariffs.lpgPerCylinder',
    'tariffs.lpgCylinderKg',
  ],
  png: ['factors.fuelUse.pngM3PerMeal', 'factors.co2.pngKgPerM3', 'tariffs.pngPerM3'],
  biomass: [
    'factors.fuelUse.biomassKgPerMeal',
    'factors.co2.biomassKgPerKg',
    'tariffs.biomassPerKg',
  ],
  induction: ['factors.fuelUse.inductionKwhPerMeal'],
};

const MODE_TARIFFS: Record<CommuteMode, string[]> = {
  none: [],
  walkCycle: [],
  car: ['tariffs.petrolPerLitre', 'tariffs.carKmPerLitre'],
  twoWheeler: ['tariffs.petrolPerLitre', 'tariffs.twoWheelerKmPerLitre'],
  bus: ['tariffs.busFarePerKm'],
  metro: ['tariffs.metroFarePerKm'],
};

const ELECTRICITY = [
  'tariffs.electricityPerKwh',
  'factors.co2.gridKgPerKwh',
  'factors.pm.gridGPerKwh',
];
const AIRING = [
  'factors.airExchange.airing',
  'factors.penetration.airing',
  'factors.schedules.airingWindow',
];

const INCENSE = [
  'factors.emission.incensePerStick',
  'factors.schedules.incenseHours',
  'tariffs.incensePerStick',
];
const COIL = [
  'factors.emission.coilPerNight',
  'factors.schedules.coilHours',
  'factors.devices.vaporiserWatts',
  'tariffs.coilRupees',
  'tariffs.vaporiserRefillPerNight',
  ...ELECTRICITY,
];
const SMOKING = [
  'factors.emission.cigarette',
  'factors.behaviour.cigarettesPerDayIndoors',
  'factors.schedules.smokingHours',
];

function cookingKeys(fuel: Fuel): string[] {
  const keys = [`factors.emission.${cookingEmissionKey(fuel)}`, ...(FUEL_KEYS[fuel] ?? [])];
  return fuel === 'induction' ? [...keys, ...ELECTRICITY] : keys;
}

function modeKeys(mode: CommuteMode): string[] {
  return [
    `factors.transport.${mode}.co2KgPerKm`,
    `factors.transport.${mode}.pmGPerKm`,
    ...MODE_TARIFFS[mode],
  ];
}

function changeKeys(action: ActionDef, base: Scenario, s: Scenario): string[] {
  const m = action.modifies;
  switch (m.type) {
    case 'airAtCleanestHour':
      return AIRING;
    case 'airKitchenAfterMeals':
      return [...AIRING, ...cookingKeys(base.cooking.fuel)];
    case 'closeKitchenDoor':
      return ['factors.behaviour.kitchenLeakShare', ...cookingKeys(base.cooking.fuel)];
    case 'addChimney':
      return ['factors.behaviour.chimneyCapture', ...cookingKeys(base.cooking.fuel)];
    case 'scaleCooking':
      return [`factors.behaviour.${m.factorKey}`, ...cookingKeys(base.cooking.fuel)];
    case 'setFuel':
      return [...cookingKeys(base.cooking.fuel), ...cookingKeys(s.cooking.fuel)];
    case 'setIncense':
      return INCENSE;
    case 'replaceCoil':
      return COIL;
    case 'smokeOutside':
      return SMOKING;
    case 'setCommuteMode':
    case 'scaleCommute':
      return [...modeKeys(base.commute.mode), ...modeKeys(s.commute.mode)];
    default:
      return ELECTRICITY;
  }
}

/** Config keys an action's Tula numbers depend on (for the why panel and the provisional badge). */
export function assumptionKeys(action: ActionDef, base: Scenario, s: Scenario): string[] {
  const keys = new Set<string>(['factors.deposition', ...changeKeys(action, base, s)]);
  for (const room of [...base.rooms, ...s.rooms]) {
    keys.add(`factors.airExchange.${room.windowType}`);
    keys.add(`factors.penetration.${room.windowType}`);
    if (room.purifier)
      keys.add(`purifiers.${room.purifier.id}.cadr`).add(`purifiers.${room.purifier.id}.watts`);
  }
  if (s.addedPurifier) {
    keys
      .add(`purifiers.${s.addedPurifier.id}.filterRupees`)
      .add(`purifiers.${s.addedPurifier.id}.filterLifeMonths`);
  }
  if (numberValue(action.oneOffRupees) > 0) keys.add(`actions.${action.id}.oneOffRupees`);
  return [...keys].sort();
}
