import type { AppConfig } from '@/config';
import type { IntakeFacts, MemberFact, Occupancy, ProfileInput, RoomFact } from '@/domain';

/** Exact definition: 1 ft² = 0.09290304 m². */
export const SQFT_TO_M2 = 0.09290304;
const MIN_AREA = 2;
const MAX_AREA = 200;
const UNNAMED_PURIFIERS = /^(unknown|diy-|generic-)/;

type Room = ProfileInput['rooms'][number];
type Defaults = AppConfig['factors']['intakeDefaults'];

/** Combines turns: lists (members, rooms) are replaced, habit sections are merged field by field. */
export function mergeFacts(prev: IntakeFacts, next: IntakeFacts): IntakeFacts {
  const merged: IntakeFacts = { ...prev, ...next };
  if (prev.cooking || next.cooking) merged.cooking = { ...prev.cooking, ...next.cooking };
  if (prev.sources || next.sources) merged.sources = { ...prev.sources, ...next.sources };
  if (prev.commute || next.commute) merged.commute = { ...prev.commute, ...next.commute };
  return merged;
}

const normalise = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, '');

/** purifiers.json id whose model number appears in the text, or null when unclear. */
export function matchPurifier(text: string, cfg: AppConfig): string | null {
  const said = normalise(text);
  if (!said) return null;
  const hit = cfg.purifiers.find((p) => {
    if (UNNAMED_PURIFIERS.test(p.id)) return false;
    const key = normalise(p.model.split('/')[0] ?? '');
    return key.length >= 3 && said.includes(key);
  });
  return hit?.id ?? null;
}

function areaOf(room: RoomFact, d: Defaults): number {
  let m2 = d.roomAreaMedium.value;
  if (room.areaValue !== undefined && room.areaUnit) {
    m2 = room.areaUnit === 'sqft' ? room.areaValue * SQFT_TO_M2 : room.areaValue;
  } else if (room.size === 'small') m2 = d.roomAreaSmall.value;
  else if (room.size === 'large') m2 = d.roomAreaLarge.value;
  return Math.min(MAX_AREA, Math.max(MIN_AREA, Math.round(m2 * 2) / 2));
}

function purifierOf(room: RoomFact, cfg: AppConfig): string | undefined {
  if (room.hasPurifier === false) return undefined;
  if (room.purifierModel) return matchPurifier(room.purifierModel, cfg) ?? 'unknown';
  return room.hasPurifier ? 'unknown' : undefined;
}

function roomFrom(fact: RoomFact, i: number, cfg: AppConfig): Room {
  const windowType = fact.windowType === 'unknown' ? undefined : fact.windowType;
  return {
    id: `r${i + 1}`,
    name: fact.name,
    kind: fact.kind,
    areaM2: areaOf(fact, cfg.factors.intakeDefaults),
    windowType,
    purifierId: purifierOf(fact, cfg),
    occupancy: [],
  };
}

function sleepHours(member: MemberFact, d: Defaults): [number, number] {
  const [from = 22, to = 7] = (member.ageGroup === 'child' ? d.sleepChild : d.sleepAdult).value;
  return [from, to];
}

/** Sleep in the stated (or first) bedroom; daytime or evening in the living room. */
function occupancyFor(
  member: MemberFact,
  id: string,
  rooms: Room[],
  d: Defaults,
): Map<number, Occupancy> {
  const out = new Map<number, Occupancy>();
  const [sleepFrom, sleepTo] = sleepHours(member, d);
  const named = rooms.findIndex((r) => r.name.toLowerCase() === member.sleepsIn?.toLowerCase());
  const bed = named >= 0 ? named : rooms.findIndex((r) => r.kind === 'bedroom');
  if (bed >= 0) out.set(bed, { memberId: id, fromHour: sleepFrom, toHour: sleepTo });
  const living = rooms.findIndex((r) => r.kind === 'living');
  const day = living >= 0 ? living : rooms.findIndex((r) => r.kind === 'other');
  const home = member.homeDuringDay ?? member.ageGroup === 'elder';
  const dayFrom = home ? d.dayAtHomeFrom.value : d.eveningFrom.value;
  if (day >= 0 && day !== bed) out.set(day, { memberId: id, fromHour: dayFrom, toHour: sleepFrom });
  return out;
}

function withOccupancy(rooms: Room[], members: MemberFact[], d: Defaults): Room[] {
  const filled = rooms.map((r) => ({ ...r, occupancy: [] as Occupancy[] }));
  members.forEach((member, i) => {
    for (const [room, slot] of occupancyFor(member, `m${i + 1}`, rooms, d))
      filled[room]?.occupancy.push(slot);
  });
  return filled;
}

function cookingOf(base: ProfileInput, facts: IntakeFacts, d: Defaults): ProfileInput['cooking'] {
  const cooking = { ...base.cooking, ...facts.cooking };
  if (facts.cooking?.mealsPerDay !== undefined && facts.cooking.mealHours === undefined) {
    cooking.mealHours = d.mealHours.value.slice(0, cooking.mealsPerDay);
  }
  return cooking;
}

/**
 * Turns intake facts into a profile draft (FR-1). All conversions, defaults and occupancy are
 * computed here from config, never by the AI. Sections without facts keep the base values.
 */
export function applyFacts(base: ProfileInput, facts: IntakeFacts, cfg: AppConfig): ProfileInput {
  const d = cfg.factors.intakeDefaults;
  const members =
    facts.members?.map((m, i) => ({
      id: `m${i + 1}`,
      label: m.label,
      ageGroup: m.ageGroup,
      sensitive: m.sensitive ?? false,
    })) ?? base.members;
  let rooms = facts.rooms?.map((r, i) => roomFrom(r, i, cfg)) ?? base.rooms;
  if (facts.members) rooms = withOccupancy(rooms, facts.members, d);
  return {
    ...base,
    members,
    rooms,
    cooking: cookingOf(base, facts, d),
    sources: { ...base.sources, ...facts.sources },
    commute: { ...base.commute, ...facts.commute },
    budgetTier: facts.budgetTier ?? base.budgetTier,
  };
}
