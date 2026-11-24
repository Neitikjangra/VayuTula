import * as z from 'zod/mini';
import { CitationSchema, ConfigValueSchema } from './config';
import { COMMUTE_MODES, FUELS, ROOM_KINDS } from './profile';

export const ACTION_CATEGORIES = ['indoor', 'routine', 'alternative'] as const;
export type ActionCategory = (typeof ACTION_CATEGORIES)[number];

export const PROFILE_FLAGS = [
  'hasPurifier',
  'hasKitchen',
  'hasBedroomWithoutPurifier',
  'hasLivingWithoutPurifier',
  'hasOccupiedRoomWithoutPurifier',
  'hasLeakyWindow',
  'chimney',
  'kitchenDoor',
  'smokerIndoors',
] as const;
export const PROFILE_COUNTS = [
  'incensePerDay',
  'coilNightsPerWeek',
  'mealsPerDay',
  'commuteKmPerDay',
  'commuteDaysPerWeek',
] as const;
export type ProfileFlag = (typeof PROFILE_FLAGS)[number];
export type ProfileCount = (typeof PROFILE_COUNTS)[number];

/** One condition in an action's `appliesWhen` list; all must hold. */
export const ConditionSchema = z.discriminatedUnion('fact', [
  z.object({ fact: z.literal('fuel'), in: z.array(z.enum(FUELS)) }),
  z.object({ fact: z.literal('commuteMode'), in: z.array(z.enum(COMMUTE_MODES)) }),
  z.object({ fact: z.literal('flag'), name: z.enum(PROFILE_FLAGS), is: z.boolean() }),
  z.object({
    fact: z.literal('count'),
    name: z.enum(PROFILE_COUNTS),
    gte: z.optional(z.number()),
    lte: z.optional(z.number()),
  }),
]);
export type Condition = z.infer<typeof ConditionSchema>;

/** The scenario change an action makes to today's habits. */
export const ModifiesSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('runPurifier'), roomKind: z.optional(z.enum(ROOM_KINDS)) }),
  z.object({ type: z.literal('airAtCleanestHour') }),
  z.object({ type: z.literal('airKitchenAfterMeals') }),
  z.object({ type: z.literal('closeKitchenDoor') }),
  z.object({ type: z.literal('addChimney') }),
  z.object({ type: z.literal('scaleCooking'), factorKey: z.literal('lidFactor') }),
  z.object({ type: z.literal('setFuel'), fuel: z.enum(FUELS) }),
  z.object({ type: z.literal('setIncense'), perDay: z.int().check(z.gte(0)) }),
  z.object({ type: z.literal('replaceCoil') }),
  z.object({ type: z.literal('smokeOutside') }),
  z.object({ type: z.literal('sealWindows') }),
  z.object({ type: z.literal('setCommuteMode'), mode: z.enum(COMMUTE_MODES) }),
  z.object({
    type: z.literal('scaleCommute'),
    kmFactor: z.number().check(z.gte(0), z.lte(1)),
    daysLess: z.int().check(z.gte(0), z.lte(7)),
  }),
  z.object({
    type: z.literal('addPurifier'),
    purifierId: z.string(),
    roomKind: z.enum(ROOM_KINDS),
  }),
]);
export type Modifies = z.infer<typeof ModifiesSchema>;

/** A curated action (FR-4). costTier: 0 free, 1 up to ₹2,000, 2 above. */
export const ActionDefSchema = z.object({
  id: z.string().check(z.regex(/^[a-z0-9-]+$/)),
  category: z.enum(ACTION_CATEGORIES),
  /** Actions in the same group are alternatives (e.g. bus vs metro); a plan shows one. */
  group: z.optional(z.string().check(z.regex(/^[a-z-]+$/))),
  costTier: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  oneOffRupees: ConfigValueSchema,
  effort: z.int().check(z.gte(1), z.lte(3)),
  appliesWhen: z.array(ConditionSchema),
  modifies: ModifiesSchema,
  citation: CitationSchema,
});
export type ActionDef = z.infer<typeof ActionDefSchema>;
