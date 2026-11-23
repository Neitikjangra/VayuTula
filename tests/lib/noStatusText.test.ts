import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const SRC = path.resolve(__dirname, '../../src');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('HTTP status handling (Node 26 / HTTP/2: statusText is empty)', () => {
  it('no source file reads response.statusText', () => {
    const offenders = sourceFiles(SRC).filter((file) =>
      /\.statusText\b/.test(readFileSync(file, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('the lint rule rejects statusText and accepts ok/status', async () => {
    const eslint = new ESLint();
    const filePath = path.join(SRC, 'data', 'statusTextProbe.ts');
    const bad = 'export const f = (r: Response): string => r.statusText;\n';
    const good = 'export const f = (r: Response): boolean => r.ok && r.status === 200;\n';
    const [badResult] = await eslint.lintText(bad, { filePath });
    const [goodResult] = await eslint.lintText(good, { filePath });
    const ruleIds = badResult?.messages.map((m) => m.ruleId);
    expect(ruleIds).toContain('no-restricted-properties');
    expect(goodResult?.messages).toEqual([]);
  }, 30_000);
});
