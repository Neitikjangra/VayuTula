/** A daily calendar reminder (RFC 5545 VEVENT with a daily repeat and an alarm at the start). */
export interface DailyReminder {
  uid: string;
  title: string;
  description: string;
  /** First day, YYYY-MM-DD, in the device's local time. */
  date: string;
  fromHour: number;
  durationHours: number;
  /** When the file is made; written in UTC as DTSTAMP. */
  now: Date;
}

const MAX_LINE_OCTETS = 75;
const HOUR_MS = 3_600_000;

/** Escapes text values (RFC 5545 §3.3.11). */
export function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Folds a content line to at most 75 octets per line, never splitting a character (§3.1). */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let octets = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? MAX_LINE_OCTETS : MAX_LINE_OCTETS - 1;
    if (octets + size > limit) {
      parts.push(current);
      current = '';
      octets = 0;
    }
    current += char;
    octets += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Floating local date-time (no time zone): the calendar shows it at that clock hour. */
function localStamp(date: string, hourOffset: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d) + hourOffset * HOUR_MS);
  return `${t.getUTCFullYear()}${pad(t.getUTCMonth() + 1)}${pad(t.getUTCDate())}T${pad(t.getUTCHours())}0000`;
}

function utcStamp(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** The .ics file text, CRLF line endings, for one daily reminder. */
export function dailyReminderIcs(r: DailyReminder): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//VayuTula//Purifier reminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${r.uid}`,
    `DTSTAMP:${utcStamp(r.now)}`,
    `DTSTART:${localStamp(r.date, r.fromHour)}`,
    `DTEND:${localStamp(r.date, r.fromHour + r.durationHours)}`,
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeText(r.title)}`,
    `DESCRIPTION:${escapeText(r.description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(r.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
