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

/** Display name for a place; device locations are translated at render time. */
export function placeLabel(place: SelectedPlace, lang: Lang): string {
  return place.kind === 'device' ? t(lang, 'location.mine') : place.name;
}
