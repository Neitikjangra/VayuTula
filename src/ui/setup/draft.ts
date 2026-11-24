import { ProfileSchema, type Profile, type ProfileInput, type RoomKind } from '@/domain';
import { t, type Lang } from '@/i18n';
import type { SelectedPlace } from '../forecastStorage';

export type Draft = ProfileInput;
export type DraftMember = Draft['members'][number];
export type DraftRoom = Draft['rooms'][number];

const DEFAULT_MEAL_HOURS = [8, 20, 13, 17, 11, 15];

function room(
  id: string,
  name: string,
  kind: RoomKind,
  areaM2: number,
  occupancy: DraftRoom['occupancy'],
): DraftRoom {
  return { id, name, kind, areaM2, occupancy };
}

/** A small, valid starting home: one adult, bedroom, living room and kitchen. */
export function defaultDraft(lang: Lang, place: SelectedPlace | null): Draft {
  const me: DraftMember = {
    id: 'm1',
    label: t(lang, 'member.default'),
    ageGroup: 'adult',
    sensitive: false,
  };
  const base: Draft = {
    city: '',
    lat: 0,
    lon: 0,
    lang,
    members: [me],
    rooms: [
      room('r1', t(lang, 'room.defaultBedroom'), 'bedroom', 12, [
        { memberId: 'm1', fromHour: 22, toHour: 7 },
      ]),
      room('r2', t(lang, 'room.defaultLiving'), 'living', 18, [
        { memberId: 'm1', fromHour: 18, toHour: 22 },
      ]),
      room('r3', t(lang, 'room.defaultKitchen'), 'kitchen', 7, []),
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
  return place ? withPlace(base, place) : base;
}

/** Sets city and location from the chosen place; device locations use the translated name. */
export function withPlace(draft: Draft, place: SelectedPlace): Draft {
  return {
    ...draft,
    city: place.kind === 'device' ? t(draft.lang, 'location.mine') : place.name,
    lat: place.lat,
    lon: place.lon,
  };
}

/** prefix + (largest number used + 1). */
export function nextId(prefix: string, ids: string[]): string {
  const used = ids.map((id) => Number(id.slice(prefix.length))).filter(Number.isFinite);
  return `${prefix}${Math.max(0, ...used) + 1}`;
}

export function addMember(draft: Draft, label: string): Draft {
  const id = nextId(
    'm',
    draft.members.map((m) => m.id),
  );
  return {
    ...draft,
    members: [...draft.members, { id, label, ageGroup: 'adult', sensitive: false }],
  };
}

/** Removes a person and their room times; the last person stays. */
export function removeMember(draft: Draft, id: string): Draft {
  if (draft.members.length <= 1) return draft;
  const rooms = draft.rooms.map((r) => ({
    ...r,
    occupancy: r.occupancy.filter((o) => o.memberId !== id),
  }));
  return { ...draft, members: draft.members.filter((m) => m.id !== id), rooms };
}

export function updateMember(draft: Draft, id: string, patch: Partial<DraftMember>): Draft {
  return { ...draft, members: draft.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) };
}

export function addRoom(draft: Draft, name: string): Draft {
  const id = nextId(
    'r',
    draft.rooms.map((r) => r.id),
  );
  return { ...draft, rooms: [...draft.rooms, room(id, name, 'other', 10, [])] };
}

/** Removes a room; the last room stays. */
export function removeRoom(draft: Draft, id: string): Draft {
  if (draft.rooms.length <= 1) return draft;
  return { ...draft, rooms: draft.rooms.filter((r) => r.id !== id) };
}

export function updateRoom(draft: Draft, id: string, patch: Partial<DraftRoom>): Draft {
  return { ...draft, rooms: draft.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) };
}

/** Sets meals per day and keeps exactly one cooking time per meal. */
export function setMeals(draft: Draft, count: number): Draft {
  const hours = Array.from(
    { length: count },
    (_, i) => draft.cooking.mealHours[i] ?? DEFAULT_MEAL_HOURS[i] ?? 12,
  );
  return { ...draft, cooking: { ...draft.cooking, mealsPerDay: count, mealHours: hours } };
}

/** The validated profile, or null when any answer is out of range or no place is chosen. */
export function toProfile(draft: Draft): Profile | null {
  if (!draft.city) return null;
  const parsed = ProfileSchema.safeParse(draft);
  return parsed.success ? parsed.data : null;
}
