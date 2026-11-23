// Fails if the home page's first-load JavaScript exceeds 200 KB gzipped (PRD Section 7, Efficiency).
// Run after `npm run build`.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 200;
const html = readFileSync('.next/server/app/index.html', 'utf8');
const scripts = [
  ...new Set([...html.matchAll(/"(\/_next\/static\/[^"]+?\.js)"/g)].map((m) => m[1])),
];

let bytes = 0;
for (const src of scripts) {
  bytes += gzipSync(readFileSync(path.join('.next', src.replace('/_next', '')))).length;
}

const kb = bytes / 1024;
console.log(
  `First-load JS: ${kb.toFixed(1)} KB gzipped across ${scripts.length} files (limit ${LIMIT_KB} KB).`,
);
if (scripts.length === 0 || kb > LIMIT_KB) {
  console.error(scripts.length === 0 ? 'No scripts found; is the build missing?' : 'Over budget.');
  process.exit(1);
}
