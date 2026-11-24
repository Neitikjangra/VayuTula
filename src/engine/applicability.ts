import {
  numberValue,
  type ActionDef,
  type Condition,
  type Profile,
  type ProfileCount,
  type ProfileFlag,
} from '@/domain';

function roomsWithout(profile: Profile, kind: string): boolean {
  return profile.rooms.some((r) => r.kind === kind && !r.purifierId);
}

/** Yes/no facts about a home used by `appliesWhen`. */
export function profileFlags(profile: Profile): Record<ProfileFlag, boolean> {
  const { rooms, cooking, sources } = profile;
  return {
    hasPurifier: rooms.some((r) => r.purifierId !== undefined),
    hasKitchen: rooms.some((r) => r.kind === 'kitchen'),
    hasBedroomWithoutPurifier: roomsWithout(profile, 'bedroom'),
    hasLivingWithoutPurifier: roomsWithout(profile, 'living'),
    hasOccupiedRoomWithoutPurifier: rooms.some((r) => !r.purifierId && r.occupancy.length > 0),
    hasLeakyWindow: rooms.some((r) => r.windowType === 'leaky'),
    chimney: cooking.chimney,
    kitchenDoor: cooking.kitchenDoor,
    smokerIndoors: sources.smokerIndoors,
  };
}

/** Numeric facts about a home used by `appliesWhen`. */
export function profileCounts(profile: Profile): Record<ProfileCount, number> {
  return {
    incensePerDay: profile.sources.incensePerDay,
    coilNightsPerWeek: profile.sources.coilNightsPerWeek,
    mealsPerDay: profile.cooking.mealsPerDay,
    commuteKmPerDay: profile.commute.mode === 'none' ? 0 : profile.commute.kmPerDay,
    commuteDaysPerWeek: profile.commute.mode === 'none' ? 0 : profile.commute.daysPerWeek,
  };
}

function holds(c: Condition, profile: Profile): boolean {
  switch (c.fact) {
    case 'fuel':
      return c.in.includes(profile.cooking.fuel);
    case 'commuteMode':
      return c.in.includes(profile.commute.mode);
    case 'flag':
      return profileFlags(profile)[c.name] === c.is;
    case 'count': {
      const value = profileCounts(profile)[c.name];
      return (c.gte === undefined || value >= c.gte) && (c.lte === undefined || value <= c.lte);
    }
  }
}

/** True when every `appliesWhen` condition holds for this home (FR-4). */
export function isApplicable(action: ActionDef, profile: Profile): boolean {
  return action.appliesWhen.every((c) => holds(c, profile));
}

/** Budget 0 allows free actions only; otherwise the one-off price must fit the budget. */
export function withinBudget(action: ActionDef, budgetTier: number): boolean {
  return numberValue(action.oneOffRupees) <= budgetTier;
}
