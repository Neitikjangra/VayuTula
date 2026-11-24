import { describe, expect, it } from 'vitest';
import { appConfig } from '@/config';
import { ProfileSchema, type IntakeFacts, type ProfileInput } from '@/domain';
import { SQFT_TO_M2, applyFacts, matchPurifier, mergeFacts } from '@/engine/intakeMerge';

const d = appConfig.factors.intakeDefaults;

function base(): ProfileInput {
  return {
    city: 'Noida',
    lat: 28.58,
    lon: 77.33,
    lang: 'en',
    members: [{ id: 'm1', label: 'Me', ageGroup: 'adult', sensitive: false }],
    rooms: [
      {
        id: 'r1',
        name: 'Bedroom',
        kind: 'bedroom',
        areaM2: 12,
        occupancy: [{ memberId: 'm1', fromHour: 22, toHour: 7 }],
      },
    ],
    cooking: {
      fuel: 'lpg',
      mealsPerDay: 2,
      mealHours: [8, 20],
      chimney: false,
      kitchenDoor: false,
    },
    sources: { incensePerDay: 0, coilNightsPerWeek: 0, smokerIndoors: false },
    commute: { mode: 'none', kmPerDay: 0, daysPerWeek: 0 },
    budgetTier: 0,
  };
}

const family: IntakeFacts = {
  members: [
    { label: 'Me', ageGroup: 'adult', sleepsIn: 'Our room', homeDuringDay: false },
    {
      label: 'Son',
      ageGroup: 'child',
      sensitive: true,
      sleepsIn: 'Kids room',
      homeDuringDay: false,
    },
    { label: 'Dadi', ageGroup: 'elder', sleepsIn: 'kids room' },
  ],
  rooms: [
    {
      name: 'Our room',
      kind: 'bedroom',
      size: 'large',
      hasPurifier: true,
      purifierModel: 'Philips AC1215',
    },
    { name: 'Kids room', kind: 'bedroom', areaValue: 110, areaUnit: 'sqft', windowType: 'leaky' },
    { name: 'Hall', kind: 'living', areaValue: 18, areaUnit: 'm2' },
    { name: 'Kitchen', kind: 'kitchen', windowType: 'unknown' },
  ],
};

describe('applyFacts() (FR-1: code, not the AI, turns facts into a profile)', () => {
  const profile = ProfileSchema.parse(applyFacts(base(), family, appConfig));

  it('makes a valid profile with stable ids', () => {
    expect(profile.members.map((m) => m.id)).toEqual(['m1', 'm2', 'm3']);
    expect(profile.rooms.map((r) => r.id)).toEqual(['r1', 'r2', 'r3', 'r4']);
    expect(profile.members[1]).toMatchObject({ label: 'Son', ageGroup: 'child', sensitive: true });
  });

  it('converts square feet in code and uses config sizes for words', () => {
    expect(profile.rooms[1]?.areaM2).toBe(Math.round(110 * SQFT_TO_M2 * 2) / 2);
    expect(profile.rooms[0]?.areaM2).toBe(d.roomAreaLarge.value);
    expect(profile.rooms[2]?.areaM2).toBe(18);
    expect(profile.rooms[3]?.areaM2).toBe(d.roomAreaMedium.value);
  });

  it('keeps "not sure" windows as unknown so confidence drops', () => {
    expect(profile.rooms[1]?.windowType).toBe('leaky');
    expect(profile.rooms[3]?.windowType).toBeUndefined();
  });

  it('matches a named purifier model to purifiers.json', () => {
    expect(profile.rooms[0]?.purifierId).toBe('philips-ac1215');
    expect(profile.rooms[1]?.purifierId).toBeUndefined();
  });

  it('builds sleep and day hours from config schedules (room names match case-insensitively)', () => {
    const [adultFrom, adultTo] = d.sleepAdult.value;
    const [childFrom, childTo] = d.sleepChild.value;
    expect(profile.rooms[0]?.occupancy).toEqual([
      { memberId: 'm1', fromHour: adultFrom, toHour: adultTo },
    ]);
    expect(profile.rooms[1]?.occupancy).toEqual([
      { memberId: 'm2', fromHour: childFrom, toHour: childTo },
      { memberId: 'm3', fromHour: adultFrom, toHour: adultTo },
    ]);
    // Me and Son are out in the day (evening at home); Dadi, an elder, is home all day by default.
    expect(profile.rooms[2]?.occupancy).toEqual([
      { memberId: 'm1', fromHour: d.eveningFrom.value, toHour: adultFrom },
      { memberId: 'm2', fromHour: d.eveningFrom.value, toHour: childFrom },
      { memberId: 'm3', fromHour: d.dayAtHomeFrom.value, toHour: adultFrom },
    ]);
  });

  it('puts people with no stated bedroom in the first bedroom', () => {
    const p = applyFacts(base(), { members: [{ label: 'Guest', ageGroup: 'adult' }] }, appConfig);
    expect(p.rooms[0]?.occupancy.map((o) => o.memberId)).toEqual(['m1']);
  });

  it('keeps earlier occupancy when only habits change', () => {
    const p = applyFacts(base(), { sources: { incensePerDay: 2 } }, appConfig);
    expect(p.rooms).toEqual(base().rooms);
    expect(p.sources.incensePerDay).toBe(2);
  });

  it('fills cooking times from config when only the number of meals is given', () => {
    const p = applyFacts(base(), { cooking: { mealsPerDay: 3 } }, appConfig);
    expect(p.cooking.mealHours).toEqual(d.mealHours.value.slice(0, 3));
  });

  it('clamps areas to the profile limits', () => {
    const p = applyFacts(
      base(),
      { rooms: [{ name: 'Hall', kind: 'living', areaValue: 2500, areaUnit: 'sqft' }] },
      appConfig,
    );
    expect(p.rooms[0]?.areaM2).toBe(200);
  });
});

describe('matchPurifier()', () => {
  it.each([
    ['Philips AC1215', 'philips-ac1215'],
    ['my philips ac 1215', 'philips-ac1215'],
    ['Coway AP-1019C', 'coway-ap-1019c'],
    ['Levoit Core 300', 'levoit-core-300'],
  ])('finds %s', (text, id) => {
    expect(matchPurifier(text, appConfig)).toBe(id);
  });

  it.each(['Philips', 'some purifier', ''])(
    'returns null when the model is unclear: "%s"',
    (text) => {
      expect(matchPurifier(text, appConfig)).toBeNull();
    },
  );
});

describe('mergeFacts()', () => {
  it('replaces lists and merges habit fields turn by turn', () => {
    const first: IntakeFacts = {
      members: [{ label: 'A', ageGroup: 'adult' }],
      cooking: { fuel: 'lpg' },
    };
    const second: IntakeFacts = { cooking: { mealsPerDay: 2 }, budgetTier: 2000 };
    expect(mergeFacts(first, second)).toEqual({
      members: [{ label: 'A', ageGroup: 'adult' }],
      cooking: { fuel: 'lpg', mealsPerDay: 2 },
      budgetTier: 2000,
    });
  });
});
