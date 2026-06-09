'use strict';

// 궁극체(Mega) 얼굴 기반 128×128 아이콘 PNG 생성 스크립트.
// 외부 의존 없이 Node.js 내장 zlib만 사용.
// 실행: node scripts/generate-icon.js

const zlib = require('zlib');
const fs   = require('fs');
const path = require('path');

const { MEGA_PALETTE, MEGA_FRAMES } = require('../src/sprites/mega');

// Frame 2 (오라A): 금색 발광 눈
const FRAME = MEGA_FRAMES[2];

// 헤드 영역: rows 0–15, cols 10–25 (16×16 스프라이트 셀)
const ROW_S = 0;
const COL_S = 10;
const CELLS = 16;
const CELL  = 8;   // 셀당 8px → 16×8 = 128px
const SIZE  = 128;

function hexToRgb(hex) {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 0xFF, (v >> 8) & 0xFF, v & 0xFF];
}

function buildPixels() {
  const pixels = Buffer.alloc(SIZE * SIZE * 3);

  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const sy = ROW_S + Math.floor(py / CELL);
      const sx = COL_S + Math.floor(px / CELL);
      const idx = (py * SIZE + px) * 3;

      const row    = (sy < FRAME.length) ? FRAME[sy] : null;
      const pidx   = (row && sx < row.length) ? row[sx] : 0;
      const color  = MEGA_PALETTE[pidx];

      let r, g, b;

      if (!color || color === 'transparent') {
        // 방사형 다크 네이비 배경
        const cx = SIZE / 2, cy = SIZE / 2;
        const d  = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2) / (SIZE * 0.65);
        const t  = Math.max(0, 1 - d);
        r = Math.round(10 + t * 20);
        g = Math.round(10 + t * 20);
        b = Math.round(25 + t * 40);
      } else {
        [r, g, b] = hexToRgb(color);
      }

      pixels[idx]     = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
    }
  }
  return pixels;
}

// ── PNG 인코더 ──────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function u32(n) {
  return Buffer.from([(n >>> 24) & 0xFF, (n >>> 16) & 0xFF, (n >>> 8) & 0xFF, n & 0xFF]);
}

function pngChunk(type, data) {
  const tb  = Buffer.from(type, 'ascii');
  const crc = u32(crc32(Buffer.concat([tb, data])));
  return Buffer.concat([u32(data.length), tb, data, crc]);
}

function encodePNG(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width,  0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // RGB
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // filter method
  ihdr[12] = 0; // no interlace

  // 스캔라인: [filter=0] + [R G B] × width
  const lines = [];
  for (let y = 0; y < height; y++) {
    const line = Buffer.alloc(1 + width * 3);
    line[0] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const si = (y * width + x) * 3;
      line[1 + x * 3]     = pixels[si];
      line[1 + x * 3 + 1] = pixels[si + 1];
      line[1 + x * 3 + 2] = pixels[si + 2];
    }
    lines.push(line);
  }

  const raw        = Buffer.concat(lines);
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── 메인 ────────────────────────────────────────────────────────────────────

const pixels  = buildPixels();
const pngData = encodePNG(SIZE, SIZE, pixels);
const outPath = path.join(__dirname, '..', 'icon.png');

fs.writeFileSync(outPath, pngData);
console.log(`icon.png 생성 완료: ${outPath} (${pngData.length} bytes)`);
