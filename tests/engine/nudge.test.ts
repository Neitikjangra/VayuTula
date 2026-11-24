import { describe, expect, it } from 'vitest';
import { activeSlot, isDone, logDone, purifierSlots, weeklyHours } from '@/engine/nudge';
import { twoBhk } from '../fixtures/engine';

describe('purifier nudge (FR-16)', () => {
  const slots = purifierSlots(twoBhk());

  it('plans a slot for each room with a purifier, while it is occupied', () => {
    expect(slots).toEqual([
      {
        roomId: 'master',
        roomName: 'Master bedroom',
        range: { fromHour: 22, toHour: 7 },
        hours: 9,
      },
    ]);
  });

  it('is active only inside the planned hours (wrapping past midnight)', () => {
    expect(activeSlot(slots, 22)?.roomId).toBe('master');
    expect(activeSlot(slots, 3)?.roomId).toBe('master');
    expect(activeSlot(slots, 7)).toBeNull();
    expect(activeSlot(slots, 15)).toBeNull();
  });

  it('has no slots when the home has no purifier', () => {
    const none = twoBhk({ rooms: twoBhk().rooms.map((r) => ({ ...r, purifierId: undefined })) });
    expect(purifierSlots(none)).toEqual([]);
  });

  it('logs a "done" tap once per room per day', () => {
    let log = logDone([], slots[0]!, '2026-11-24');
    log = logDone(log, slots[0]!, '2026-11-24');
    expect(log).toEqual([{ date: '2026-11-24', roomId: 'master', hours: 9 }]);
    expect(isDone(log, slots[0]!, '2026-11-24')).toBe(true);
    expect(isDone(log, slots[0]!, '2026-11-25')).toBe(false);
  });

  it('counts purifier hours over the last 7 days, today included', () => {
    const log = [
      { date: '2026-11-17', roomId: 'master', hours: 9 },
      { date: '2026-11-18', roomId: 'master', hours: 9 },
      { date: '2026-11-24', roomId: 'master', hours: 9 },
      { date: '2026-11-24', roomId: 'kids', hours: 10 },
    ];
    expect(weeklyHours(log, '2026-11-24')).toBe(28);
    expect(weeklyHours([], '2026-11-24')).toBe(0);
  });
});
