import { describe, expect, it } from 'vitest';
import { configRegistry } from '@/config';
import { configLabel, purifierName } from '@/ui/plan/configLabel';

describe('configLabel() (why panel in plain language, found live: Hindi showed raw keys)', () => {
  it('gives every config value a real label in English and Hindi', () => {
    for (const key of configRegistry.keys()) {
      expect(configLabel('en', key), key).not.toBe(key);
      expect(configLabel('hi', key), key).toMatch(/[ऀ-ॿ]|[A-Z]/);
      expect(configLabel('hi', key), key).not.toBe(key);
    }
  });

  it('uses Hindi for factors and tariffs', () => {
    expect(configLabel('en', 'factors.airExchange.leaky')).toBe(
      'Air exchange, leaky windows (per hour)',
    );
    expect(configLabel('hi', 'tariffs.electricityPerKwh')).toMatch(/बिजली/);
  });

  it('names purifiers and purchases', () => {
    expect(configLabel('en', 'purifiers.philips-ac1215.cadr')).toBe(
      'Philips AC1215/20: clean-air delivery rate (m³/h)',
    );
    expect(configLabel('hi', 'purifiers.generic-medium.filterRupees')).toBe(
      'एक मध्यम प्यूरीफ़ायर: फ़िल्टर का दाम (₹)',
    );
    expect(configLabel('en', 'actions.seal-window-gaps.oneOffRupees')).toBe(
      'Seal window gaps with weather strips: purchase price (₹)',
    );
  });

  it('translates placeholder purifier names but keeps brand names', () => {
    expect(purifierName('hi', 'unknown')).toBe('आपका प्यूरीफ़ायर (मॉडल पता नहीं)');
    expect(purifierName('hi', 'xiaomi-4')).toBe('Xiaomi Smart Air Purifier 4');
  });
});
