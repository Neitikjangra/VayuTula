import { describe, expect, it } from 'vitest';
import { DEFAULT_HEIGHT_M, ProfileSchema, type ProfileInput } from '@/domain';
import { twoBhk } from '../fixtures/engine';

const valid = (): ProfileInput => structuredClone(twoBhk()) as ProfileInput;

function withChange(change: (p: ProfileInput) => void): ProfileInput {
  const p = valid();
  change(p);
  return p;
}

describe('ProfileSchema', () => {
  it('accepts a typical 2BHK and fills the default ceiling height', () => {
    const input = withChange((p) => {
      delete p.rooms[0]!.heightM;
    });
    const parsed = ProfileSchema.parse(input);
    expect(parsed.rooms[0]?.heightM).toBe(DEFAULT_HEIGHT_M);
  });

  it.each<[string, (p: ProfileInput) => void]>([
    ['room smaller than 2 m²', (p) => void (p.rooms[0]!.areaM2 = 1)],
    ['room larger than 200 m²', (p) => void (p.rooms[0]!.areaM2 = 500)],
    ['occupancy hour 25', (p) => void (p.rooms[0]!.occupancy[0]!.toHour = 25)],
    ['negative meals', (p) => void (p.cooking.mealsPerDay = -1)],
    ['meal hour 24', (p) => void (p.cooking.mealHours = [24])],
    ['no members', (p) => void (p.members = [])],
    [
      'nine rooms',
      (p) =>
        void (p.rooms = Array.from({ length: 9 }, (_, i) => ({ ...p.rooms[0]!, id: `r${i}` }))),
    ],
    ['occupancy by an unknown member', (p) => void (p.rooms[0]!.occupancy[0]!.memberId = 'ghost')],
    ['duplicate room ids', (p) => void (p.rooms[1]!.id = p.rooms[0]!.id)],
    [
      'budget not one of 0 / 2000 / 15000',
      (p) => void ((p as { budgetTier: number }).budgetTier = 500),
    ],
    ['commute over 200 km/day', (p) => void (p.commute.kmPerDay = 500)],
    ['8 coil nights a week', (p) => void (p.sources.coilNightsPerWeek = 8)],
    ['blank member label', (p) => void (p.members[0]!.label = '   ')],
  ])('rejects %s', (_label, change) => {
    expect(ProfileSchema.safeParse(withChange(change)).success).toBe(false);
  });
});
