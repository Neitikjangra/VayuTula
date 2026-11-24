// Draws the VayuTula app icon (a balance on a deep-sky background) as small PNGs, with no
// image libraries: pixels are computed here and packed with zlib. Run: node scripts/make-icons.mjs
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const SKY = [12, 74, 110];
const WHITE = [255, 255, 255];
const LEAF = [167, 243, 208];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Colour of the pixel at (x, y) in a unit square (0..1), safe-zone sized for maskable icons. */
function colour(x, y) {
  const beamTilt = -0.06 * (x - 0.5);
  if (Math.abs(y - (0.42 + beamTilt)) < 0.025 && x > 0.22 && x < 0.78) return WHITE;
  if (y > 0.42 && y < 0.7 && Math.abs(x - 0.5) < (y - 0.42) * 0.45) return WHITE;
  if (y >= 0.7 && y < 0.74 && Math.abs(x - 0.5) < 0.16) return WHITE;
  const pan = (cx, cy, fill) => (Math.hypot((x - cx) * 1.6, y - cy) < 0.07 && y > cy ? fill : null);
  return pan(0.26, 0.455, LEAF) ?? pan(0.74, 0.427, WHITE) ?? SKY;
}

function png(size) {
  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3);
    for (let x = 0; x < size; x++) row.set(colour((x + 0.5) / size, (y + 0.5) / size), 1 + x * 3);
    rows.push(row);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const data = deflateSync(Buffer.concat(rows), { level: 9 });
  return Buffer.concat([
    signature,
    chunk('IHDR', header),
    chunk('IDAT', data),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const out = {
  'public/icon-192.png': 192,
  'public/icon-512.png': 512,
  'src/app/apple-icon.png': 180,
  'src/app/icon.png': 48,
};
for (const [path, size] of Object.entries(out)) {
  const file = png(size);
  writeFileSync(path, file);
  console.log(`${path}: ${size}px, ${file.length} bytes`);
}
