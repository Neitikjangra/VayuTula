'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Profile } from '@/domain';
import {
  activeSlot,
  isDone,
  logDone,
  purifierSlots,
  weeklyHours,
  type PurifierSlot,
} from '@/engine/nudge';
import { todayLocal } from '../format';
import { loadLog, saveLog } from './nudgeStorage';

const TICK_MS = 60_000;

/** Current local hour and date, refreshed every minute while the page is open. */
function useClock(): { hour: number; date: string } {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  return { hour: now.getHours(), date: todayLocal(now) };
}

/** Shows a browser notification once per slot per day, if the user allowed it. */
function useSlotNotification(
  slot: PurifierSlot | null,
  date: string,
  body: (room: string) => string,
  title: string,
) {
  const shown = useRef(new Set<string>());
  useEffect(() => {
    if (!slot || typeof Notification === 'undefined' || Notification.permission !== 'granted')
      return;
    const key = `${date}:${slot.roomId}`;
    if (shown.current.has(key)) return;
    shown.current.add(key);
    new Notification(title, { body: body(slot.roomName) });
  }, [slot, date, body, title]);
}

/** FR-16: the slot to nudge about now, its done state, the weekly hours and a "done" handler. */
export function useNudge(
  profile: Profile,
  notify: { title: string; body: (room: string) => string },
) {
  const { hour, date } = useClock();
  const [log, setLog] = useState(loadLog);
  const slots = useMemo(() => purifierSlots(profile), [profile]);
  const slot = activeSlot(slots, hour);
  const done = slot ? isDone(log, slot, date) : false;
  useSlotNotification(done ? null : slot, date, notify.body, notify.title);
  const markDone = () => {
    if (!slot) return;
    const next = logDone(log, slot, date);
    setLog(next);
    saveLog(next);
  };
  return { hasPurifier: slots.length > 0, slot, done, weekly: weeklyHours(log, date), markDone };
}
