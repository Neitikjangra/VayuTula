import { appConfig, type AppConfig } from '@/config';
import type { Forecast, ProfileInput } from '@/domain';
import { ProfileSchema, type Profile } from '@/domain';

const HOUR_MS = 3_600_000;
/** Local midnight 24 Nov 2026 in India. */
export const START_ISO = '2026-11-23T18:30:00.000Z';

/** A forecast with one PM2.5 value per hour (UTC times, Asia/Kolkata zone). */
export function forecastOf(values: number[], timezone = 'Asia/Kolkata'): Forecast {
  const start = Date.parse(START_ISO);
  return {
    source: 'test',
    fetchedAt: START_ISO,
    timezone,
    lat: 28.58,
    lon: 77.33,
    hours: values.map((pm25, i) => ({ time: new Date(start + i * HOUR_MS).toISOString(), pm25 })),
  };
}

export const constantForecast = (pm25: number, hours = 96) =>
  forecastOf(Array.from({ length: hours }, () => pm25));

/** Deep copy of the app config with selected values replaced, by dotted path below each file. */
export function configWith(overrides: Record<string, number | number[]>): AppConfig {
  const copy = structuredClone(appConfig);
  for (const [path, value] of Object.entries(overrides)) {
    const parts = path.split('.');
    let node: unknown = copy;
    for (const part of parts) node = (node as Record<string, unknown>)[part];
    (node as { value: number | number[] }).value = value;
  }
  return copy;
}

/** Round numbers so golden values can be worked out by hand. */
export const handConfig = configWith({
  'factors.airExchange.sealed': 0.5,
  'factors.penetration.sealed': 0.8,
  'factors.deposition': 0.25,
  'factors.co2.gridKgPerKwh': 0.7,
  'factors.pm.gridGPerKwh': 0.5,
  'factors.co2.lpgKgPerKg': 3,
  'factors.fuelUse.lpgKgPerMeal': 0.1,
  'factors.fuelUse.inductionKwhPerMeal': 1,
  'tariffs.electricityPerKwh': 8,
  'tariffs.lpgPerCylinder': 1000,
  'tariffs.lpgCylinderKg': 10,
});

export function profileOf(input: ProfileInput): Profile {
  return ProfileSchema.parse(input);
}

/** One adult who stays all day in one sealed 10 m² × 2.5 m bedroom (25 m³) with no sources. */
export function oneRoomProfile(extra: Partial<ProfileInput> = {}): Profile {
  return profileOf({
    city: 'Test',
    lat: 28.58,
    lon: 77.33,
    lang: 'en',
    members: [{ id: 'a', label: 'Adult', ageGroup: 'adult', sensitive: false }],
    rooms: [
      {
        id: 'bed',
        name: 'Bedroom',
        kind: 'bedroom',
        areaM2: 10,
        heightM: 2.5,
        windowType: 'sealed',
        occupancy: [{ memberId: 'a', fromHour: 0, toHour: 24 }],
      },
    ],
    cooking: { fuel: 'lpg', mealsPerDay: 0, mealHours: [], chimney: false, kitchenDoor: false },
    sources: { incensePerDay: 0, coilNightsPerWeek: 0, smokerIndoors: false },
    commute: { mode: 'none', kmPerDay: 0, daysPerWeek: 0 },
    budgetTier: 0,
    ...extra,
  });
}

/** A typical Delhi 2BHK: two adults, a child, an elder, one purifier in the parents' room. */
export function twoBhk(extra: Partial<ProfileInput> = {}): Profile {
  return profileOf({
    city: 'Noida',
    lat: 28.58,
    lon: 77.33,
    lang: 'en',
    members: [
      { id: 'mum', label: 'Mum', ageGroup: 'adult', sensitive: false },
      { id: 'dad', label: 'Dad', ageGroup: 'adult', sensitive: false },
      { id: 'kid', label: 'Kid', ageGroup: 'child', sensitive: true },
      { id: 'dadi', label: 'Dadi', ageGroup: 'elder', sensitive: false },
    ],
    rooms: [
      {
        id: 'master',
        name: 'Master bedroom',
        kind: 'bedroom',
        areaM2: 14,
        windowType: 'average',
        purifierId: 'philips-ac1215',
        occupancy: [
          { memberId: 'mum', fromHour: 22, toHour: 7 },
          { memberId: 'dad', fromHour: 22, toHour: 7 },
        ],
      },
      {
        id: 'kids',
        name: 'Kids room',
        kind: 'bedroom',
        areaM2: 11,
        windowType: 'leaky',
        occupancy: [
          { memberId: 'kid', fromHour: 21, toHour: 7 },
          { memberId: 'dadi', fromHour: 21, toHour: 7 },
        ],
      },
      {
        id: 'living',
        name: 'Living room',
        kind: 'living',
        areaM2: 18,
        occupancy: [
          { memberId: 'dadi', fromHour: 7, toHour: 21 },
          { memberId: 'kid', fromHour: 15, toHour: 21 },
          { memberId: 'mum', fromHour: 18, toHour: 22 },
          { memberId: 'dad', fromHour: 19, toHour: 22 },
        ],
      },
      {
        id: 'kitchen',
        name: 'Kitchen',
        kind: 'kitchen',
        areaM2: 7,
        windowType: 'average',
        occupancy: [],
      },
    ],
    cooking: {
      fuel: 'lpg',
      mealsPerDay: 2,
      mealHours: [8, 20],
      chimney: false,
      kitchenDoor: false,
    },
    sources: { incensePerDay: 2, coilNightsPerWeek: 3, smokerIndoors: false },
    commute: { mode: 'car', kmPerDay: 20, daysPerWeek: 5 },
    budgetTier: 2000,
    ...extra,
  });
}
