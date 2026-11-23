// Fails if the files tracked by git exceed the size budget (PRD Section 2: repo under 10 MB, CI limit 8 MB).
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';

const LIMIT_BYTES = 8 * 1024 * 1024;
const MAX_FILE_BYTES = 1024 * 1024;

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

let total = 0;
const oversized = [];
for (const file of files) {
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    continue;
  }
  total += size;
  if (size > MAX_FILE_BYTES) oversized.push(`${file} (${(size / 1024).toFixed(0)} KB)`);
}

const mb = (total / 1024 / 1024).toFixed(2);
console.log(`Tracked files: ${files.length}, total ${mb} MB (limit 8 MB).`);
if (oversized.length > 0) {
  console.error(`Files over 1 MB:\n  ${oversized.join('\n  ')}`);
  process.exit(1);
}
if (total > LIMIT_BYTES) {
  console.error('Tracked size is over the 8 MB budget.');
  process.exit(1);
}
