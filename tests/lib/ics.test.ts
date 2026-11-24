import { describe, expect, it } from 'vitest';
import { dailyReminderIcs, escapeText, foldLine } from '@/lib/ics';

const base = {
  uid: 'master-purifier@vayutula',
  title: 'Switch on the purifier in Master bedroom',
  description: 'Run it 22:00–07:00, doors shut.',
  date: '2026-11-24',
  fromHour: 22,
  durationHours: 9,
  now: new Date('2026-11-24T06:30:00.000Z'),
};

describe('dailyReminderIcs()', () => {
  const ics = dailyReminderIcs(base);
  const lines = ics.split('\r\n');

  it('is a calendar with one daily event and an alarm, CRLF line endings', () => {
    expect(lines[0]).toBe('BEGIN:VCALENDAR');
    expect(lines).toContain('VERSION:2.0');
    expect(lines).toContain('RRULE:FREQ=DAILY');
    expect(lines).toContain('BEGIN:VALARM');
    expect(lines).toContain('TRIGGER:PT0M');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('uses local clock times and crosses midnight for night slots', () => {
    expect(lines).toContain('DTSTART:20261124T220000');
    expect(lines).toContain('DTEND:20261125T070000');
    expect(lines).toContain('DTSTAMP:20261124T063000Z');
  });

  it('escapes commas and semicolons in text', () => {
    expect(lines).toContain('DESCRIPTION:Run it 22:00–07:00\\, doors shut.');
    expect(escapeText('a;b\\c\nd')).toBe('a\\;b\\\\c\\nd');
  });
});

describe('foldLine()', () => {
  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Hi')).toBe('SUMMARY:Hi');
  });

  it('folds to 75 octets without splitting Hindi characters', () => {
    const folded = foldLine(`SUMMARY:${'मास्टर बेडरूम में प्यूरीफ़ायर चालू करें '.repeat(4)}`);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    for (const part of parts) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true);
    expect(folded.replace(/\r\n /g, '')).toContain('प्यूरीफ़ायर');
  });
});
