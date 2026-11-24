import { describe, expect, it } from 'vitest';
import { buildTimeline, inHourRange, localHoursOf } from '@/engine/timeline';
import { START_ISO, constantForecast, forecastOf } from '../fixtures/engine';

describe('inHourRange()', () => {
  it('handles daytime ranges, overnight wrap and the whole day', () => {
    expect(inHourRange(9, { fromHour: 9, toHour: 17 })).toBe(true);
    expect(inHourRange(17, { fromHour: 9, toHour: 17 })).toBe(false);
    expect(inHourRange(23, { fromHour: 22, toHour: 7 })).toBe(true);
    expect(inHourRange(3, { fromHour: 22, toHour: 7 })).toBe(true);
    expect(inHourRange(12, { fromHour: 22, toHour: 7 })).toBe(false);
    expect(inHourRange(12, { fromHour: 0, toHour: 24 })).toBe(true);
  });
});

describe('buildTimeline()', () => {
  it('starts at the hour containing the start time and uses local clock hours', () => {
    const values = Array.from({ length: 96 }, (_, i) => i);
    const timeline = buildTimeline(forecastOf(values), '2026-11-24T00:10:00.000Z');
    // 00:10 UTC is 05:40 in India, inside the 05:00 local hour (index 5).
    expect(timeline.cOut[0]).toBe(5);
    expect(timeline.localHours[0]).toBe(5);
    expect(timeline.cOut).toHaveLength(48);
  });

  it('throws when the forecast does not reach 48 hours ahead', () => {
    expect(() => buildTimeline(constantForecast(100, 96), '2026-11-26T00:00:00.000Z')).toThrow(
      RangeError,
    );
    expect(() => buildTimeline(constantForecast(100, 96), 'not a time')).toThrow(RangeError);
  });

  it('reads local hours in the forecast time zone', () => {
    expect(localHoursOf([START_ISO], 'Asia/Kolkata')).toEqual([0]);
    expect(localHoursOf([START_ISO], 'UTC')).toEqual([18]);
  });
});
