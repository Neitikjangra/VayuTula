import * as z from 'zod/mini';

export const AGE_GROUPS = ['child', 'adult', 'elder'] as const;
export const ROOM_KINDS = ['bedroom', 'living', 'kitchen', 'other'] as const;
export const WINDOW_TYPES = ['leaky', 'average', 'sealed'] as const;
export const FUELS = ['lpg', 'png', 'induction', 'biomass'] as const;
export const COMMUTE_MODES = ['none', 'car', 'twoWheeler', 'bus', 'metro', 'walkCycle'] as const;
export const BUDGET_TIERS = [0, 2000, 15000] as const;
export const DEFAULT_HEIGHT_M = 2.8;

export type RoomKind = (typeof ROOM_KINDS)[number];
export type WindowType = (typeof WINDOW_TYPES)[number];
export type Fuel = (typeof FUELS)[number];
export type CommuteMode = (typeof COMMUTE_MODES)[number];
export type BudgetTier = (typeof BUDGET_TIERS)[number];

const Id = z.string().check(z.minLength(1), z.maxLength(40));
const Label = z.string().check(z.trim(), z.minLength(1), z.maxLength(40));
const Hour = z.int().check(z.gte(0), z.lte(23));

/** Hours [fromHour, toHour) in local time; wraps past midnight when toHour <= fromHour. */
export const HourRangeSchema = z.object({
  fromHour: Hour,
  toHour: z.int().check(z.gte(0), z.lte(24)),
});
export type HourRange = z.infer<typeof HourRangeSchema>;

export const MemberSchema = z.object({
  id: Id,
  label: Label,
  ageGroup: z.enum(AGE_GROUPS),
  sensitive: z.boolean(),
});
export type Member = z.infer<typeof MemberSchema>;

export const OccupancySchema = z.extend(HourRangeSchema, { memberId: Id });
export type Occupancy = z.infer<typeof OccupancySchema>;

export const RoomSchema = z.object({
  id: Id,
  name: Label,
  kind: z.enum(ROOM_KINDS),
  areaM2: z.number().check(z.gte(2), z.lte(200)),
  heightM: z._default(z.number().check(z.gte(2), z.lte(5)), DEFAULT_HEIGHT_M),
  /** Missing means "not sure"; the engine assumes average and lowers confidence. */
  windowType: z.optional(z.enum(WINDOW_TYPES)),
  /** purifiers.json id, or "unknown" when the model is not known. */
  purifierId: z.optional(Id),
  /** When the purifier usually runs today. Missing means it is usually off. */
  purifierHours: z.optional(HourRangeSchema),
  occupancy: z.array(OccupancySchema).check(z.maxLength(24)),
});
export type Room = z.infer<typeof RoomSchema>;

export const CookingSchema = z.object({
  fuel: z.enum(FUELS),
  mealsPerDay: z.int().check(z.gte(0), z.lte(6)),
  mealHours: z.array(Hour).check(z.maxLength(6)),
  /** Uses a chimney or exhaust fan while cooking. */
  chimney: z.boolean(),
  /** Kitchen door kept closed while cooking. */
  kitchenDoor: z.boolean(),
});

export const SourcesSchema = z.object({
  incensePerDay: z.int().check(z.gte(0), z.lte(10)),
  coilNightsPerWeek: z.int().check(z.gte(0), z.lte(7)),
  smokerIndoors: z.boolean(),
});

export const CommuteSchema = z.object({
  mode: z.enum(COMMUTE_MODES),
  kmPerDay: z.number().check(z.gte(0), z.lte(200)),
  daysPerWeek: z.int().check(z.gte(0), z.lte(7)),
});

function idsUnique(items: { id: string }[]): boolean {
  return new Set(items.map((i) => i.id)).size === items.length;
}

/** The household profile (PRD 4.1, with room `kind` and `purifierHours` added). */
export const ProfileSchema = z
  .object({
    city: z.string().check(z.trim(), z.minLength(1), z.maxLength(80)),
    lat: z.number().check(z.gte(-90), z.lte(90)),
    lon: z.number().check(z.gte(-180), z.lte(180)),
    lang: z.enum(['en', 'hi']),
    members: z.array(MemberSchema).check(z.minLength(1), z.maxLength(12)),
    rooms: z.array(RoomSchema).check(z.minLength(1), z.maxLength(8)),
    cooking: CookingSchema,
    sources: SourcesSchema,
    commute: CommuteSchema,
    budgetTier: z.union([z.literal(0), z.literal(2000), z.literal(15000)]),
  })
  .check(
    z.refine((p) => idsUnique(p.members) && idsUnique(p.rooms), 'ids must be unique'),
    z.refine((p) => {
      const ids = new Set(p.members.map((m) => m.id));
      return p.rooms.every((r) => r.occupancy.every((o) => ids.has(o.memberId)));
    }, 'occupancy must refer to a member'),
  );
export type Profile = z.infer<typeof ProfileSchema>;
/** Profile as typed in by a user, before defaults (e.g. heightM) are applied. */
export type ProfileInput = z.input<typeof ProfileSchema>;
