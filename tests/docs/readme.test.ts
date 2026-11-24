import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { configRegistry } from '@/config';

const readme = readFileSync('README.md', 'utf8');

describe('README (judged)', () => {
  it('has every required section', () => {
    for (const heading of [
      '## 1. Chosen vertical',
      '## 2. Brief-to-feature table',
      '## 3. Approach and logic',
      '## 4. How it works',
      '## 5. Assumptions',
      '## 6. Setup, scripts, testing, deployment, security, accessibility',
      '## 7. Business model and roadmap',
    ]) {
      expect(readme).toContain(heading);
    }
    expect(readme).toContain('Challenge 6: Urban Air Quality Assistant');
  });

  it('only cites files and tests that exist (brief-to-feature table)', () => {
    const cited = [...readme.matchAll(/`((?:src|tests)\/[^`\s]+)`/g)].map((m) => m[1]!);
    expect(cited.length).toBeGreaterThan(20);
    const missing = cited.filter((path) => !existsSync(path));
    expect(missing).toEqual([]);
  });

  it('lists every config value with its status (run `node scripts/assumptions.mjs` if this fails)', () => {
    for (const [key, entry] of configRegistry) {
      const status = entry.verifiedOn ? `verified ${entry.verifiedOn}` : 'provisional';
      expect(readme, key).toMatch(
        new RegExp(`\\| \`${key.replace(/[.]/g, '\\.')}\` \\|[^\\n]*\\| ${status} \\|`),
      );
    }
  });
});
