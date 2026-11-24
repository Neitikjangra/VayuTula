import * as z from 'zod/mini';
import { AGE_GROUPS, COMMUTE_MODES, FUELS, ROOM_KINDS, WINDOW_TYPES } from './profile';

/** Topics the conversational setup covers (FR-1). */
export const INTAKE_FIELDS = [
  'members',
  'rooms',
  'purifier',
  'windows',
  'cooking',
  'sources',
  'commute',
  'budget',
] as const;
export type IntakeField = (typeof INTAKE_FIELDS)[number];
export type NextField = IntakeField | 'done';

/** FR-1: at most 6 follow-up questions. */
export const MAX_INTAKE_QUESTIONS = 6;
export const MAX_INTAKE_CHARS = 2000;

const Text = (max: number) => z.string().check(z.trim(), z.minLength(1), z.maxLength(max));
const Int = (min: number, max: number) => z.int().check(z.gte(min), z.lte(max));
const Hour = Int(0, 23);

const MemberFactSchema = z.object({
  label: Text(40),
  ageGroup: z.enum(AGE_GROUPS),
  sensitive: z.optional(z.boolean()),
  /** Name of the room this person sleeps in (must match a room name). */
  sleepsIn: z.optional(Text(40)),
  homeDuringDay: z.optional(z.boolean()),
});

/** A room as the user described it. Numbers are copied as stated; code converts them. */
const RoomFactSchema = z.object({
  name: Text(40),
  kind: z.enum(ROOM_KINDS),
  areaValue: z.optional(z.number().check(z.gt(0), z.lte(2500))),
  areaUnit: z.optional(z.enum(['m2', 'sqft'])),
  size: z.optional(z.enum(['small', 'medium', 'large'])),
  windowType: z.optional(z.enum([...WINDOW_TYPES, 'unknown'])),
  hasPurifier: z.optional(z.boolean()),
  purifierModel: z.optional(Text(80)),
});

/** Facts extracted from the user's words. Lists, when present, are complete lists. */
export const IntakeFactsSchema = z.object({
  members: z.optional(z.array(MemberFactSchema).check(z.maxLength(12))),
  rooms: z.optional(z.array(RoomFactSchema).check(z.maxLength(8))),
  cooking: z.optional(
    z.object({
      fuel: z.optional(z.enum(FUELS)),
      mealsPerDay: z.optional(Int(0, 6)),
      mealHours: z.optional(z.array(Hour).check(z.maxLength(6))),
      chimney: z.optional(z.boolean()),
      kitchenDoor: z.optional(z.boolean()),
    }),
  ),
  sources: z.optional(
    z.object({
      incensePerDay: z.optional(Int(0, 10)),
      coilNightsPerWeek: z.optional(Int(0, 7)),
      smokerIndoors: z.optional(z.boolean()),
    }),
  ),
  commute: z.optional(
    z.object({
      mode: z.optional(z.enum(COMMUTE_MODES)),
      kmPerDay: z.optional(z.number().check(z.gte(0), z.lte(200))),
      daysPerWeek: z.optional(Int(0, 7)),
    }),
  ),
  budgetTier: z.optional(z.union([z.literal(0), z.literal(2000), z.literal(15000)])),
});
export type IntakeFacts = z.infer<typeof IntakeFactsSchema>;
export type MemberFact = z.infer<typeof MemberFactSchema>;
export type RoomFact = z.infer<typeof RoomFactSchema>;

const NextFieldSchema = z.enum([...INTAKE_FIELDS, 'done']);

/** Body of POST /api/intake. */
export const IntakeRequestSchema = z.object({
  message: Text(MAX_INTAKE_CHARS),
  facts: IntakeFactsSchema,
  answered: z.array(z.enum(INTAKE_FIELDS)).check(z.maxLength(INTAKE_FIELDS.length)),
  asked: Int(0, 50),
  lang: z.enum(['en', 'hi']),
});
export type IntakeRequest = z.infer<typeof IntakeRequestSchema>;

/** Reply of POST /api/intake. `question` null means "use the built-in question for nextField". */
export const IntakeResponseSchema = z.object({
  profileDelta: IntakeFactsSchema,
  nextField: NextFieldSchema,
  question: z.nullable(z.string().check(z.maxLength(300))),
  lang: z.enum(['en', 'hi']),
  symptomNotice: z.boolean(),
});
export type IntakeResponse = z.infer<typeof IntakeResponseSchema>;

/** Topics not answered yet, in asking order. */
export function missingFields(answered: readonly IntakeField[]): IntakeField[] {
  return INTAKE_FIELDS.filter((f) => !answered.includes(f));
}

/**
 * Rooms are only "answered" once the list has somewhere to sleep and a living room or kitchen;
 * otherwise the chat asks about the other rooms (found live: one room ended the topic).
 */
function roomsComplete(rooms: RoomFact[]): boolean {
  const sleep = rooms.some((r) => r.kind === 'bedroom' || r.kind === 'other');
  const day = rooms.some((r) => r.kind === 'living' || r.kind === 'kitchen');
  return sleep && day;
}

/** Topics a set of facts covers. */
export function fieldsIn(facts: IntakeFacts): IntakeField[] {
  const rooms = facts.rooms ?? [];
  const covered: Record<IntakeField, boolean> = {
    members: facts.members !== undefined,
    rooms: roomsComplete(rooms),
    purifier: rooms.some((r) => r.hasPurifier !== undefined || r.purifierModel !== undefined),
    windows: rooms.some((r) => r.windowType !== undefined),
    cooking: facts.cooking !== undefined,
    sources: facts.sources !== undefined,
    commute: facts.commute !== undefined,
    budget: facts.budgetTier !== undefined,
  };
  return INTAKE_FIELDS.filter((f) => covered[f]);
}
