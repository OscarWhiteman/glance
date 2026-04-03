#!/usr/bin/env node
/**
 * Generate a 512×512 placeholder app icon as a raw PNG.
 * Uses no external dependencies — writes a minimal valid PNG with the Glance "G" eye motif.
 *
 * Usage: node scripts/generate-icon.js
 * Output: build/icon.png (also usable as source for icns/ico conversion)
 *
 * For a production icon, replace build/icon.png with a designer-crafted asset.
 * electron-builder auto-converts PNG to .icns (macOS) and .ico (Windows).
 */

const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { deflateSync } = require('zlib');

const SIZE = 512;
const pixels = Buffer.alloc(SIZE * SIZE * 4, 0);

function setPixel(x, y, r, g, b, a) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function fillCircle(cx, cy, radius, r, g, b, a) {
  const r2 = radius * radius;
  for (let y = Math.max(0, Math.floor(cy - radius)); y <= Math.min(SIZE - 1, Math.ceil(cy + radius)); y++) {
    for (let x = Math.max(0, Math.floor(cx - radius)); x <= Math.min(SIZE - 1, Math.ceil(cx + radius)); x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= r2) {
        // Anti-alias at the edge
        const edge = Math.sqrt(d2) - radius + 1;
        const aa = edge > 0 ? Math.max(0, 1 - edge) : 1;
        setPixel(x, y, r, g, b, Math.round(a * aa));
      }
    }
  }
}

function strokeCircle(cx, cy, radius, thickness, r, g, b, a) {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;
  const outer2 = outer * outer;
  const inner2 = inner * inner;
  for (let y = Math.max(0, Math.floor(cy - outer)); y <= Math.min(SIZE - 1, Math.ceil(cy + outer)); y++) {
    for (let x = Math.max(0, Math.floor(cx - outer)); x <= Math.min(SIZE - 1, Math.ceil(cx + outer)); x++) {
      const dx = x - cx, dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 <= outer2 && d2 >= inner2) {
        setPixel(x, y, r, g, b, a);
      }
    }
  }
}

// Background: dark rounded rect (approximated with a filled circle)
fillCircle(256, 256, 240, 15, 23, 42, 255); // #0f172a (slate-900)

// Outer ring — white "G" / eye shape
strokeCircle(256, 256, 160, 40, 255, 255, 255, 230);

// Cut the "G" gap on the right
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const dx = x - 256, dy = y - 256;
    if (dx > 70 && Math.abs(dy) < 55) {
      // Restore the background colour
      const d2 = dx * dx + dy * dy;
      if (d2 < 240 * 240) {
        setPixel(x, y, 15, 23, 42, 255);
      } else {
        setPixel(x, y, 0, 0, 0, 0);
      }
    }
  }
}

// Horizontal bar of the "G"
for (let y = 256 - 14; y <= 256 + 14; y++) {
  for (let x = 256; x <= 256 + 140; x++) {
    setPixel(x, y, 255, 255, 255, 230);
  }
}

// Inner dot — sky blue pupil (#38bdf8)
fillCircle(256, 256, 55, 56, 189, 248, 255);

// ── Encode as PNG ───────────────────────────────────────────────────────────

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData));
  return Buffer.concat([len, typeData, crc]);
}

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);  // width
ihdr.writeUInt32BE(SIZE, 4);  // height
ihdr[8] = 8;                  // bit depth
ihdr[9] = 6;                  // colour type: RGBA
ihdr[10] = 0;                 // compression
ihdr[11] = 0;                 // filter
ihdr[12] = 0;                 // interlace

// IDAT — each row has a filter byte (0 = None) prepended
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const rowOff = y * (1 + SIZE * 4);
  raw[rowOff] = 0; // filter: None
  pixels.copy(raw, rowOff + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
}
const compressed = deflateSync(raw, { level: 9 });

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const png = Buffer.concat([
  signature,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = join(__dirname, '..', 'build');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'icon.png');
writeFileSync(outPath, png);
console.log(`Icon written to ${outPath} (${png.length} bytes, ${SIZE}x${SIZE})`);
