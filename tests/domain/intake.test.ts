import { describe, expect, it } from 'vitest';
import { fieldsIn, missingFields } from '@/domain';

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
