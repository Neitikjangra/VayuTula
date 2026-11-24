'use client';

import { useState } from 'react';
import * as z from 'zod/mini';
import { todayLocal } from '../format';

const TICKS_KEY = 'vayutula.ticks';
const TicksSchema = z.object({
  date: z.iso.date(),
  done: z.array(z.string().check(z.maxLength(60))),
});

/** Today's ticked step ids; ticks from an earlier day are dropped (the meter resets daily). */
function loadTicks(date: string): string[] {
  try {
    const parsed = TicksSchema.safeParse(
      JSON.parse(window.localStorage.getItem(TICKS_KEY) ?? 'null'),
    );
    return parsed.success && parsed.data.date === date ? parsed.data.done : [];
  } catch {
    return [];
  }
}

function saveTicks(date: string, done: string[]): void {
  try {
    window.localStorage.setItem(TICKS_KEY, JSON.stringify({ date, done }));
  } catch {
    // Storage blocked: ticks still work until the page is closed.
  }
}

/** Which plan steps are ticked "Done" today, with a toggle that saves on this device. */
export function useTicks(): { done: string[]; toggle: (actionId: string) => void } {
  const [date] = useState(() => todayLocal());
  const [done, setDone] = useState(() => loadTicks(date));
  const toggle = (actionId: string) => {
    setDone((current) => {
      const next = current.includes(actionId)
        ? current.filter((id) => id !== actionId)
        : [...current, actionId];
      saveTicks(date, next);
      return next;
    });
  };
  return { done, toggle };
}
