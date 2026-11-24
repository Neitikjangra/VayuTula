'use client';

import { useMemo } from 'react';
import type { Profile } from '@/domain';
import { purifierSlots, type PurifierSlot } from '@/engine/nudge';
import { format, type Lang } from '@/i18n';
import { dailyReminderIcs } from '@/lib/ics';
import { hourLabel, todayLocal } from '../format';

/** Builds the reminder file for one purifier slot, in the chosen language. */
export function slotReminder(lang: Lang, slot: PurifierSlot, now: Date): string {
  const from = hourLabel(slot.range.fromHour);
  const to = hourLabel(slot.range.toHour);
  return dailyReminderIcs({
    uid: `${slot.roomId}-purifier@vayutula`,
    title: format(lang, 'calendar.title', { room: slot.roomName }),
    description: format(lang, 'calendar.body', { room: slot.roomName, from, to }),
    date: todayLocal(now),
    fromHour: slot.range.fromHour,
    durationHours: slot.hours,
    now,
  });
}

/** Saves the text as a file through a temporary link (no server round trip). */
function saveFile(name: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/** "Add a daily reminder to your calendar" for each room's purifier slot (.ics file). */
export function CalendarReminder({ lang, profile }: { lang: Lang; profile: Profile }) {
  const slots = useMemo(() => purifierSlots(profile), [profile]);
  return (
    <div className="flex flex-wrap gap-2">
      {slots.map((slot) => (
        <button
          key={slot.roomId}
          type="button"
          onClick={() =>
            saveFile(`vayutula-purifier-${slot.roomId}.ics`, slotReminder(lang, slot, new Date()))
          }
          className="min-h-11 self-start rounded-lg border border-sky-900 px-4 py-2 text-base font-medium text-sky-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800"
        >
          {format(lang, 'calendar.add', { room: slot.roomName })}
        </button>
      ))}
    </div>
  );
}
