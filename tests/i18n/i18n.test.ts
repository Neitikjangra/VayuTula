import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import { appConfig } from '@/config';
import { DEFAULT_LANG, format, isLang, isMessageKey, localeOf, t } from '@/i18n';

describe('i18n catalogues', () => {
  it('en and hi have exactly the same keys', () => {
    expect(Object.keys(hi).sort()).toEqual(Object.keys(en).sort());
  });

  it('has no empty strings in either language', () => {
    for (const catalogue of [en, hi]) {
      for (const value of Object.values(catalogue)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('Hindi strings that are not language names use Devanagari', () => {
    const devanagari = /[ऀ-ॿ]/;
    const languageNeutral = new Set([
      'lang.en',
      'forecast.dayRange',
      'tula.rupees',
      'tula.personValue',
      'summary.person',
      'summary.room',
    ]);
    const translated = Object.entries(hi).filter(([key]) => !languageNeutral.has(key));
    for (const [, value] of translated) {
      expect(value).toMatch(devanagari);
    }
  });
});

describe('t()', () => {
  it('returns the string for the requested language', () => {
    expect(t('en', 'app.name')).toBe('VayuTula');
    expect(t('hi', 'app.name')).toBe('वायुतुला');
  });

  it('defaults to English', () => {
    expect(DEFAULT_LANG).toBe('en');
  });
});

describe('format()', () => {
  it('fills placeholders in both languages', () => {
    expect(format('en', 'forecast.for', { place: 'Noida' })).toBe('Forecast for Noida');
    expect(format('hi', 'forecast.for', { place: 'नोएडा' })).toBe('नोएडा का पूर्वानुमान');
  });

  it('leaves unknown placeholders untouched', () => {
    expect(format('en', 'forecast.for', {})).toBe('Forecast for {place}');
  });

  it('uses the same placeholders in en and hi for every key', () => {
    const names = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(names(hi[key])).toEqual(names(en[key]));
    }
  });
});

describe('action titles', () => {
  it('every action in actions.json has a title in both languages', () => {
    for (const action of appConfig.actions) {
      const key = `action.${action.id}`;
      expect(isMessageKey(key), key).toBe(true);
    }
    expect(isMessageKey('action.not-real')).toBe(false);
  });
});

describe('localeOf()', () => {
  it('maps languages to Indian locales', () => {
    expect(localeOf('en')).toBe('en-IN');
    expect(localeOf('hi')).toBe('hi-IN');
  });
});

describe('isLang()', () => {
  it.each(['en', 'hi'])('accepts %s', (value) => {
    expect(isLang(value)).toBe(true);
  });

  it.each(['fr', '', null, 42, undefined])('rejects %s', (value) => {
    expect(isLang(value)).toBe(false);
  });
});
