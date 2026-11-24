// Fails if any page's first-load JavaScript exceeds 200 KB gzipped (PRD Section 7, Efficiency).
// Run after `npm run build`. Code loaded later with next/dynamic is not counted.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const LIMIT_KB = 200;
const PAGES = ['index', 'setup'];

function firstLoadKb(page) {
  const html = readFileSync(`.next/server/app/${page}.html`, 'utf8');
  const scripts = [
    ...new Set([...html.matchAll(/"(\/_next\/static\/[^"]+?\.js)"/g)].map((m) => m[1])),
  ];
  if (scripts.length === 0) throw new Error(`No scripts found for /${page}; is the build missing?`);
  let bytes = 0;
  for (const src of scripts) {
    bytes += gzipSync(readFileSync(path.join('.next', src.replace('/_next', '')))).length;
  }
  return bytes / 1024;
}

let failed = false;
for (const page of PAGES) {
  const kb = firstLoadKb(page);
  const ok = kb <= LIMIT_KB;
  failed ||= !ok;
  console.log(
    `/${page === 'index' ? '' : page}: ${kb.toFixed(1)} KB gzipped first-load JS ${ok ? 'OK' : 'OVER'} (limit ${LIMIT_KB} KB)`,
  );
}
if (failed) process.exit(1);
