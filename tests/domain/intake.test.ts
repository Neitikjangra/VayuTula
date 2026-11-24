import { describe, expect, it } from 'vitest';
import { fieldsIn, membersStillToDescribe, missingFields } from '@/domain';

describe('fieldsIn()', () => {
  it('needs a place to sleep and a living room or kitchen before rooms count as answered', () => {
    expect(fieldsIn({ rooms: [{ name: 'Bedroom', kind: 'bedroom' }] })).not.toContain('rooms');
    expect(fieldsIn({ rooms: [{ name: 'Kitchen', kind: 'kitchen' }] })).not.toContain('rooms');
    expect(
      fieldsIn({
        rooms: [
          { name: 'Bedroom', kind: 'bedroom' },
          { name: 'Hall', kind: 'living' },
        ],
      }),
    ).toContain('rooms');
    expect(
      fieldsIn({
        rooms: [
          { name: 'Room', kind: 'other' },
          { name: 'Kitchen', kind: 'kitchen' },
        ],
      }),
    ).toContain('rooms');
  });

  it('still records purifier and window answers from a partial room list', () => {
    const facts = {
      rooms: [
        {
          name: 'Bedroom',
          kind: 'bedroom' as const,
          hasPurifier: true,
          windowType: 'leaky' as const,
        },
      ],
    };
    expect(fieldsIn(facts)).toEqual(['purifier', 'windows']);
  });
});

describe('fieldsIn() with a stated household size', () => {
  const mother = { label: 'Mother', ageGroup: 'elder' as const };

  it('keeps asking about people until everyone stated is described (found live)', () => {
    expect(fieldsIn({ householdSize: 4, members: [mother] })).not.toContain('members');
    expect(fieldsIn({ householdSize: 1, members: [mother] })).toContain('members');
  });

  it('counts members as answered when no size was stated', () => {
    expect(fieldsIn({ members: [mother] })).toContain('members');
  });

  it('does not count a bare size as the members answer', () => {
    expect(fieldsIn({ householdSize: 4 })).not.toContain('members');
  });

  it('reports how many people are still to be described', () => {
    expect(membersStillToDescribe({ householdSize: 4, members: [mother] })).toBe(3);
    expect(membersStillToDescribe({ householdSize: 4 })).toBe(4);
    expect(membersStillToDescribe({ members: [mother] })).toBe(0);
    expect(membersStillToDescribe({ householdSize: 1, members: [mother, mother] })).toBe(0);
  });
});

describe('missingFields()', () => {
  it('lists topics in asking order', () => {
    expect(missingFields(['members', 'budget'])).toEqual([
      'rooms',
      'purifier',
      'windows',
      'cooking',
      'sources',
      'commute',
    ]);
  });
});
