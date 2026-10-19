'use strict';
// One-time generator for Evrida's app icons. Node built-ins only — no
// packages, no build step for the app itself. The generated PNGs are
// committed; you never need to run this script to use or ship Evrida.
//
// Usage: node tools/make-icons.js
//
// Brand mark geometry lives in a 64x64 coordinate space and matches the
// data-URI favicon in index.html: forest-green rounded square, white block
// "E", gold dot. The maskable variant fills the square edge to edge (so the
// OS mask never reveals transparency) with the mark inset into the safe zone.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const OUT = path.join(__dirname, '..', 'icons');

const GREEN = [0x49, 0x6b, 0x50];
const WHITE = [0xff, 0xff, 0xff];
const GOLD = [0xd8, 0xb6, 0x6a];

// The "E" from the favicon path: M18 17h28v7H26v6h17v7H26v6h20v7H18z
const E_POLY = [
  [18, 17], [46, 17], [46, 24], [26, 24], [26, 30], [43, 30],
  [43, 37], [26, 37], [26, 43], [46, 43], [46, 50], [18, 50],
];
const CORNER_R = 17;
const DOT = [49, 14, 5];

function inRoundedRect(x, y, size, r) {
  if (x < 0 || y < 0 || x > size || y > size) return false;
  const cx = x < r ? r : x > size - r ? size - r : x;
  const cy = y < r ? r : y > size - r ? size - r : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// One subpixel sample -> straight RGBA.
function sample(x, y, scale, off, maskable) {
  const ux = (x - off) / scale;
  const uy = (y - off) / scale;
  const bg = maskable ? true : inRoundedRect(ux, uy, 64, CORNER_R);
  if (!bg) return [0, 0, 0, 0];
  if (inPoly(ux, uy, E_POLY)) return [WHITE[0], WHITE[1], WHITE[2], 255];
  const dx = ux - DOT[0], dy = uy - DOT[1];
  if (dx * dx + dy * dy <= DOT[2] * DOT[2]) {
    return [GOLD[0], GOLD[1], GOLD[2], 255];
  }
  return [GREEN[0], GREEN[1], GREEN[2], 255];
}

// Render to a raw filter-0 RGBA scanline buffer with 3x3 supersampling.
// Alpha is averaged premultiplied to avoid dark fringes on the corners.
function render(size, maskable) {
  const scale = maskable ? (size * 0.74) / 64 : size / 64;
  const off = maskable ? (size - 64 * scale) / 2 : 0;
  const SS = 3;
  const n = SS * SS;
  const out = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const rowStart = py * (size * 4 + 1);
    out[rowStart] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let a = 0, ar = 0, ag = 0, ab = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample(
            px + (sx + 0.5) / SS,
            py + (sy + 0.5) / SS,
            scale,
            off,
            maskable
          );
          a += c[3];
          ar += c[0] * c[3];
          ag += c[1] * c[3];
          ab += c[2] * c[3];
        }
      }
      const i = rowStart + 1 + px * 4;
      out[i + 3] = Math.round(a / n);
      if (a > 0) {
        out[i] = Math.round(ar / a);
        out[i + 1] = Math.round(ag / a);
        out[i + 2] = Math.round(ab / a);
      }
    }
  }
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT, { recursive: true });
const jobs = [
  ['icon-180.png', 180, false], // iOS home screen (apple-touch-icon)
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['icon-maskable-512.png', 512, true], // Android adaptive icon
];
for (const [name, size, maskable] of jobs) {
  const buf = encodePng(size, render(size, maskable));
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name}: ${buf.length} bytes`);
}
