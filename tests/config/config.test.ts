import { describe, expect, it } from 'vitest';
import {
  appConfig,
  configRegistry,
  healthStatements,
  healthValues,
  isKeyProvisional,
} from '@/config';
import { ACTION_CATEGORIES } from '@/domain';

describe('config honesty (CLAUDE.md)', () => {
  it('every value has a unit, a source and a verification state', () => {
    expect(configRegistry.size).toBeGreaterThan(100);
    for (const [key, entry] of configRegistry) {
      expect(entry.unit.length, key).toBeGreaterThan(0);
      expect(entry.source.length, key).toBeGreaterThan(0);
    }
  });

  it('an unverified value never claims a source, and a verified one always names it', () => {
    for (const [key, entry] of configRegistry) {
      if (entry.verifiedOn === null) expect(entry.source, key).toBe('TODO');
      else expect(entry.source, key).not.toBe('TODO');
    }
  });

  it('treats unknown keys as provisional', () => {
    expect(isKeyProvisional('factors.doesNotExist')).toBe(true);
    expect(isKeyProvisional('factors.deposition')).toBe(true);
  });
});

describe('actions.json (FR-4)', () => {
  const { actions } = appConfig;

  it('has about 25 actions across all three groups', () => {
    expect(actions.length).toBeGreaterThanOrEqual(20);
    for (const category of ACTION_CATEGORIES) {
      expect(
        actions.some((a) => a.category === category),
        category,
      ).toBe(true);
    }
  });

  it('every action has a citation and a unique id', () => {
    expect(new Set(actions.map((a) => a.id)).size).toBe(actions.length);
    for (const a of actions) expect(a.citation.source.length, a.id).toBeGreaterThan(0);
  });

  it('cost tiers match the one-off price: 0 free, 1 up to ₹2,000, 2 above', () => {
    for (const a of actions) {
      const rupees = a.oneOffRupees.value as number;
      if (a.costTier === 0) expect(rupees, a.id).toBe(0);
      if (a.costTier === 1) expect(rupees > 0 && rupees <= 2000, a.id).toBe(true);
      if (a.costTier === 2) expect(rupees, a.id).toBeGreaterThan(2000);
    }
  });

  it('purifiers added by actions exist in purifiers.json', () => {
    const ids = new Set(appConfig.purifiers.map((p) => p.id));
    for (const a of actions) {
      if (a.modifies.type === 'addPurifier')
        expect(ids.has(a.modifies.purifierId), a.id).toBe(true);
    }
  });
});

describe('purifiers.json', () => {
  it('lists about 20 models plus the unknown and DIY entries, with unique ids', () => {
    const ids = appConfig.purifiers.map((p) => p.id);
    expect(ids.length).toBeGreaterThanOrEqual(18);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['unknown', 'diy-box-fan']));
  });
});

describe('health-library.json', () => {
  it('has English and Hindi text for every statement, and every number it uses exists', () => {
    const values: Record<string, unknown> = healthValues;
    for (const s of healthStatements) {
      expect(s.en.length).toBeGreaterThan(0);
      expect(s.hi).toMatch(/[ऀ-ॿ]/);
      if (s.valueKey) expect(values[s.valueKey], s.id).toBeDefined();
    }
    expect(healthStatements.map((s) => s.id)).toContain('consult-doctor');
  });
});
