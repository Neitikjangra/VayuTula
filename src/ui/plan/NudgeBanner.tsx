'use client';

import { useCallback, useState } from 'react';
import type { Profile } from '@/domain';
import type { PurifierSlot } from '@/engine/nudge';
import { format, t, type Lang } from '@/i18n';
import { formatNumber, hourLabel } from '../format';
import { CalendarReminder } from './CalendarReminder';
import { useNudge } from './useNudge';

const BUTTON =
  'min-h-11 rounded-lg px-4 py-2 text-base font-medium focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-sky-800';

type Permission = NotificationPermission | 'unsupported';

function currentPermission(): Permission {
  return typeof Notification === 'undefined' ? 'unsupported' : Notification.permission;
}

function NotifyControl({ lang }: { lang: Lang }) {
  const [permission, setPermission] = useState<Permission>(currentPermission);
  if (permission === 'unsupported') return null;
  if (permission === 'granted')
    return <p className="text-sm text-slate-800">{t(lang, 'nudge.notifyOn')}</p>;
  if (permission === 'denied')
    return <p className="text-sm text-slate-800">{t(lang, 'nudge.notifyBlocked')}</p>;
  const ask = () => void Notification.requestPermission().then(setPermission);
  return (
    <button
      type="button"
      onClick={ask}
      className={`${BUTTON} self-start border border-sky-900 text-sky-900`}
    >
      {t(lang, 'nudge.notify')}
    </button>
  );
}

function SlotNudge({ lang, slot, onDone }: { lang: Lang; slot: PurifierSlot; onDone: () => void }) {
  return (
    <>
      <p className="text-lg font-semibold text-slate-900">
        {format(lang, 'nudge.now', { room: slot.roomName })}
      </p>
      <p className="text-base text-slate-800">
        {format(lang, 'nudge.window', {
          from: hourLabel(slot.range.fromHour),
          to: hourLabel(slot.range.toHour),
        })}
      </p>
      <button
        type="button"
        onClick={onDone}
        className={`${BUTTON} self-start bg-sky-900 text-white`}
      >
        {t(lang, 'nudge.done')}
      </button>
    </>
  );
}

/** FR-16 purifier nudge: banner in the planned hours, "done" tap, weekly hours, notifications. */
export function NudgeBanner({ lang, profile }: { lang: Lang; profile: Profile }) {
  const body = useCallback(
    (room: string) => format(lang, 'nudge.notificationBody', { room }),
    [lang],
  );
  const nudge = useNudge(profile, { title: t(lang, 'app.name'), body });
  if (!nudge.hasPurifier) return null;
  const { slot } = nudge;
  return (
    <section
      aria-live="polite"
      className="flex flex-col gap-2 rounded-xl border-2 border-sky-900 bg-sky-50 p-4"
    >
      {slot && !nudge.done && <SlotNudge lang={lang} slot={slot} onDone={nudge.markDone} />}
      {slot && nudge.done && (
        <p className="text-base font-medium text-slate-900">{t(lang, 'nudge.logged')}</p>
      )}
      <p className="text-base text-slate-900">
        {format(lang, 'nudge.weekly', { hours: formatNumber(nudge.weekly, lang) })}
      </p>
      <NotifyControl lang={lang} />
      <CalendarReminder lang={lang} profile={profile} />
      <p className="text-sm text-slate-700">{t(lang, 'calendar.note')}</p>
    </section>
  );
}
