import { localeOf, t, type Lang } from '@/i18n';
import type { SelectedPlace } from './forecastStorage';

/** "18:00" in the forecast's time zone. */
export function formatHour(isoTime: string, timeZone: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(isoTime));
}

/** "Tue, 24 Nov" for a YYYY-MM-DD local date. */
export function formatDay(date: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

/** "24 Nov, 18:05" in the forecast's time zone. */
export function formatDateTime(isoTime: string, timeZone: string, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).format(new Date(isoTime));
}

/** Locale-aware integer. */
export function formatNumber(value: number, lang: Lang): string {
  return new Intl.NumberFormat(localeOf(lang)).format(value);
}

/** "07:00" for a clock hour. */
export function hourLabel(hour: number): string {
  return `${String(hour % 24).padStart(2, '0')}:00`;
}

/** Today's date on this device as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Display name for a place; device locations are translated at render time. */
export function placeLabel(place: SelectedPlace, lang: Lang): string {
  return place.kind === 'device' ? t(lang, 'location.mine') : place.name;
}
