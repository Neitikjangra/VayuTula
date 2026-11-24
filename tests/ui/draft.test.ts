import { describe, expect, it } from 'vitest';
import {
  addMember,
  addRoom,
  defaultDraft,
  nextId,
  removeMember,
  removeRoom,
  setMeals,
  toProfile,
  updateRoom,
  withPlace,
} from '@/ui/setup/draft';

const place = { kind: 'search' as const, name: 'Noida', lat: 28.58, lon: 77.33 };

describe('profile draft', () => {
  it('starts as a valid 1-person, 3-room home once a place is chosen', () => {
    const draft = defaultDraft('en', place);
    expect(draft.members).toHaveLength(1);
    expect(draft.rooms.map((r) => r.kind)).toEqual(['bedroom', 'living', 'kitchen']);
    expect(toProfile(draft)).not.toBeNull();
  });

  it('is not saveable without a place', () => {
    expect(toProfile(defaultDraft('en', null))).toBeNull();
    expect(toProfile(withPlace(defaultDraft('en', null), place))?.city).toBe('Noida');
  });

  it('uses Hindi default names in Hindi', () => {
    expect(defaultDraft('hi', place).rooms[2]?.name).toBe('रसोई');
  });

  it('creates unique ids', () => {
    expect(nextId('m', ['m1', 'm3'])).toBe('m4');
    expect(nextId('r', [])).toBe('r1');
  });

  it('adds and removes people, dropping their room times', () => {
    let draft = addMember(defaultDraft('en', place), 'Dadi');
    expect(draft.members.map((m) => m.id)).toEqual(['m1', 'm2']);
    draft = updateRoom(draft, 'r1', { occupancy: [{ memberId: 'm2', fromHour: 21, toHour: 7 }] });
    draft = removeMember(draft, 'm2');
    expect(draft.members).toHaveLength(1);
    expect(draft.rooms[0]?.occupancy).toEqual([]);
    expect(toProfile(draft)).not.toBeNull();
  });

  it('never removes the last person or the last room', () => {
    const draft = defaultDraft('en', place);
    expect(removeMember(draft, 'm1').members).toHaveLength(1);
    const oneRoom = removeRoom(removeRoom(draft, 'r1'), 'r2');
    expect(removeRoom(oneRoom, 'r3').rooms).toHaveLength(1);
  });

  it('adds a room with a fresh id', () => {
    const draft = addRoom(defaultDraft('en', place), 'Study');
    expect(draft.rooms.at(-1)).toMatchObject({ id: 'r4', name: 'Study', kind: 'other' });
  });

  it('keeps one cooking time per meal', () => {
    expect(setMeals(defaultDraft('en', place), 3).cooking.mealHours).toHaveLength(3);
    expect(setMeals(defaultDraft('en', place), 0).cooking.mealHours).toEqual([]);
  });

  it('rejects out-of-range answers instead of saving them', () => {
    const tiny = updateRoom(defaultDraft('en', place), 'r1', { areaM2: 0 });
    expect(toProfile(tiny)).toBeNull();
  });
});
