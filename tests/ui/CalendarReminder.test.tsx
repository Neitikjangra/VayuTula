// @vitest-environment jsdom
process.env.TZ = 'Asia/Kolkata';

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { purifierSlots } from '@/engine/nudge';
import { CalendarReminder, slotReminder } from '@/ui/plan/CalendarReminder';
import { twoBhk } from '../fixtures/engine';

const profile = twoBhk({ budgetTier: 2000 });
const slot = purifierSlots(profile)[0]!;
const now = new Date('2026-11-24T06:30:00.000Z');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('calendar reminder', () => {
  it('builds a daily event for the purifier slot in the chosen language', () => {
    const en = slotReminder('en', slot, now);
    expect(en).toContain(`SUMMARY:Switch on the purifier in ${slot.roomName}`);
    expect(en).toContain('DTSTART:20261124T220000');
    expect(en).toContain('RRULE:FREQ=DAILY');
    expect(slotReminder('hi', slot, now).replace(/\r\n /g, '')).toContain('प्यूरीफ़ायर चालू करें');
  });

  it('offers one button per room with a purifier and saves an .ics file', () => {
    const created = vi.fn<(blob: Blob) => string>(() => 'blob:reminder');
    vi.stubGlobal(
      'URL',
      Object.assign(URL, { createObjectURL: created, revokeObjectURL: vi.fn() }),
    );
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    render(<CalendarReminder lang="en" profile={profile} />);
    const buttons = screen.getAllByRole('button', { name: /^Add a daily reminder/ });
    expect(buttons).toHaveLength(purifierSlots(profile).length);
    fireEvent.click(buttons[0]!);
    expect(click).toHaveBeenCalledTimes(1);
    expect(created.mock.calls[0]![0].type).toBe('text/calendar;charset=utf-8');
  });
});
