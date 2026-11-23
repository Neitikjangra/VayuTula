import { describe, expect, it } from 'vitest';
import en from '@/i18n/en.json';
import hi from '@/i18n/hi.json';
import { DEFAULT_LANG, isLang, t } from '@/i18n';

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
    const translated = Object.entries(hi).filter(([key]) => key !== 'lang.en');
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

describe('isLang()', () => {
  it.each(['en', 'hi'])('accepts %s', (value) => {
    expect(isLang(value)).toBe(true);
  });

  it.each(['fr', '', null, 42, undefined])('rejects %s', (value) => {
    expect(isLang(value)).toBe(false);
  });
});
