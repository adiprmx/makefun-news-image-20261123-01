// main.ts — "THE WORLD IN ONE DAY": a procedural newspaper infographic summing up
// the world news of MONDAY 23 NOVEMBER 2026. Node 22, standard library only.
// Deterministic: no Date, no random, no network. Own rasterizer + own 5x7 bitmap
// font + own PNG encoder (node:zlib). Run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { join } from 'node:path';

// ---- palette (newsprint) ----
const PAPER: [number, number, number] = [247, 243, 234];
const LIGHT: [number, number, number] = [233, 228, 215];
const INK: [number, number, number] = [24, 24, 22];
const RED: [number, number, number] = [178, 34, 28];
const BLUE: [number, number, number] = [28, 68, 128];
const GREY: [number, number, number] = [110, 108, 100];
const WHITE: [number, number, number] = [255, 255, 255];

// ---- 5x7 bitmap font ('#' = ink, '.' = empty). Uppercase + digits + punctuation.
// The renderer uppercases all text first, so only these glyphs are needed.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '#####'],
  J: ['..###', '....#', '....#', '....#', '....#', '#...#', '.###.'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '#.#.#', '#..##', '#...#', '#...#', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  '0': ['.###.', '#...#', '#..##', '#.#.#', '##..#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '..#..', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.....', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.#...', '#....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '-': ['.....', '.....', '.....', '#####', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '....#', '...#.', '...#.', '..#..', '.#...', '#....'],
  '&': ['.###.', '#...#', '#...#', '.#.#.', '#..#.', '#.#..', '.##.#'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  '@': ['.###.', '#...#', '#.###', '#.#.#', '#.#..', '#....', '.###.'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
  '*': ['.....', '.#.#.', '..#..', '#####', '..#..', '.#.#.', '.....'],
};

// ---- framebuffer ----
const W = 1024;
const H = 1024;
const px = new Uint8Array(W * H * 3);
function fill(c: [number, number, number]): void {
  for (let i = 0; i < W * H; i++) { px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2]; }
}
function set(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}
function rect(x: number, y: number, w: number, h: number, c: [number, number, number], t = 1): void {
  fillRect(x, y, w, t, c); fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c); fillRect(x + w - t, y, t, h, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { set(x, y, c); if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function poly(points: Array<[number, number]>, c: [number, number, number]): void {
  for (let i = 0; i + 1 < points.length; i++) line(points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], c);
}
function circle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  let x = r, y = 0, e = 1 - r;
  while (x >= y) {
    set(cx + x, cy + y, c); set(cx + y, cy + x, c); set(cx - y, cy + x, c); set(cx - x, cy + y, c);
    set(cx - x, cy - y, c); set(cx - y, cy - x, c); set(cx + y, cy - x, c); set(cx + x, cy - y, c);
    y++; if (e <= 0) e += 2 * y + 1; else { x--; e += 2 * (y - x) + 1; }
  }
}
function fillCircle(cx: number, cy: number, r: number, c: [number, number, number]): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) set(cx + x, cy + y, c);
}
function fillPoly(points: Array<[number, number]>, c: [number, number, number]): void {
  // scanline fill for a simple polygon
  let minY = 1e9, maxY = -1e9;
  for (const p of points) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); }
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(Math.round(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])));
      }
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) for (let x = xs[i]; x <= xs[i + 1]; x++) set(x, y, c);
  }
}

// ---- text ----
function drawChar(ch: string, x: number, y: number, s: number, c: [number, number, number]): void {
  const g = FONT[ch] ?? FONT[' '];
  for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
    if (g[r][col] === '#') fillRect(x + col * s, y + r * s, s, s, c);
  }
}
function textWidth(s: number, str: string): number { return str.length * 6 * s; }
function drawText(str: string, x: number, y: number, s: number, c: [number, number, number]): void {
  const up = str.toUpperCase();
  for (let i = 0; i < up.length; i++) drawChar(up[i], x + i * 6 * s, y, s, c);
}
function drawTextCentered(str: string, cx: number, y: number, s: number, c: [number, number, number]): void {
  drawText(str, Math.round(cx - textWidth(s, str) / 2), y, s, c);
}
function wrap(text: string, s: number, maxW: number): string[] {
  const maxChars = Math.max(1, Math.floor(maxW / (6 * s)));
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? cur + ' ' + w : w;
    if (next.length <= maxChars) cur = next;
    else { if (cur) lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(text: string, x: number, y: number, s: number, c: [number, number, number], maxW: number, gap = 4): number {
  const lines = wrap(text, s, maxW);
  for (let i = 0; i < lines.length; i++) drawText(lines[i], x, y + i * (7 * s + gap), s, c);
  return lines.length;
}

// ---- PNG encoding (CRC32 + zlib) ----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', idat), pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- page ----
function buildImage(): void {
  fill(PAPER);
  // outer frame
  rect(10, 10, W - 20, H - 20, INK, 3);
  // masthead
  drawTextCentered('THE WORLD IN ONE DAY', W / 2, 30, 6, INK);
  drawTextCentered('MONDAY 23 NOVEMBER 2026', W / 2, 84, 4, RED);
  fillRect(24, 124, W - 48, 4, INK);
  fillRect(24, 132, W - 48, 1, INK);
  // ---- panels (2x2 grid) ----
  function panel(x: number, y: number, kicker: string, headline: string, body: string, art: (bx: number, by: number, bw: number, bh: number) => void): void {
    fillRect(x, y, 476, 330, LIGHT);
    rect(x, y, 476, 330, INK, 2);
    drawText(kicker, x + 16, y + 16, 2, RED);
    drawWrapped(headline, x + 16, y + 40, 3, INK, 444, 4);
    drawWrapped(body, x + 16, y + 100, 2, INK, 444, 4);
    art(x + 16, y + 168, 444, 138);
  }
  // COP31: globe + rising red arrow + thermometer
  function artClimate(bx: number, by: number, bw: number, bh: number): void {
    const cx = bx + 100, cy = by + 69;
    circle(cx, cy, 56, INK); circle(cx, cy, 54, INK);
    line(cx - 56, cy, cx + 56, cy, INK);
    line(cx, cy - 56, cx, cy + 56, INK);
    // red arrow climbing across the globe
    line(cx - 40, cy + 42, cx + 42, cy - 40, RED); line(cx - 38, cy + 42, cx + 44, cy - 40, RED);
    fillPoly([[cx + 42, cy - 40], [cx + 22, cy - 40], [cx + 44, cy - 18]], RED);
    // thermometer
    rect(bx + 300, by + 18, 20, 86, INK, 2);
    fillRect(bx + 303, by + 48, 14, 53, RED);
    fillCircle(bx + 310, by + 112, 17, RED); circle(bx + 310, by + 112, 17, INK);
    fillCircle(bx + 310, by + 112, 9, WHITE);
    drawText('HOT', bx + 340, by + 100, 2, RED);
  }
  // Benghazi: hit warship, smoke, waves
  function artShip(bx: number, by: number, bw: number, bh: number): void {
    // explosion starburst
    const ex = bx + 110, ey = by + 62;
    for (const [dx, dy] of [[-26, -14], [-28, 6], [-12, -24], [4, -26], [22, -18], [28, 0], [18, 20], [-4, 26]]) line(ex, ey, ex + dx, ey + dy, RED);
    fillCircle(ex, ey, 7, RED);
    // hull
    fillPoly([[bx + 60, by + 78], [bx + 384, by + 78], [bx + 352, by + 112], [bx + 92, by + 112]], INK);
    // mast + flag
    line(bx + 220, by + 78, bx + 220, by + 26, INK); line(bx + 220, by + 78, bx + 220, by + 26, INK);
    fillPoly([[bx + 220, by + 26], [bx + 252, by + 34], [bx + 220, by + 44]], RED);
    // smoke
    fillCircle(bx + 300, by + 42, 12, GREY); fillCircle(bx + 330, by + 26, 15, GREY); fillCircle(bx + 362, by + 44, 10, GREY);
    // waves
    poly([[bx + 20, by + 124], [bx + 60, by + 118], [bx + 100, by + 124], [bx + 140, by + 118], [bx + 180, by + 124], [bx + 220, by + 118], [bx + 260, by + 124], [bx + 300, by + 118], [bx + 340, by + 124], [bx + 380, by + 118], [bx + 420, by + 124]], BLUE);
    poly([[bx + 40, by + 134], [bx + 80, by + 129], [bx + 120, by + 134], [bx + 160, by + 129], [bx + 200, by + 134], [bx + 240, by + 129], [bx + 280, by + 134], [bx + 320, by + 129], [bx + 360, by + 134], [bx + 400, by + 129]], BLUE);
  }
  // Vanuatu: epicentre rings + seismograph zigzag
  function artQuake(bx: number, by: number, bw: number, bh: number): void {
    const cx = bx + 84, cy = by + 69;
    circle(cx, cy, 16, INK); circle(cx, cy, 32, INK); circle(cx, cy, 48, INK);
    fillCircle(cx, cy, 6, RED);
    const trace: Array<[number, number]> = [
      [bx + 160, by + 69], [bx + 178, by + 69], [bx + 186, by + 38], [bx + 194, by + 102],
      [bx + 202, by + 54], [bx + 210, by + 86], [bx + 218, by + 69], [bx + 238, by + 69],
      [bx + 246, by + 28], [bx + 254, by + 112], [bx + 262, by + 58], [bx + 270, by + 80],
      [bx + 278, by + 69], [bx + 306, by + 69], [bx + 314, by + 44], [bx + 322, by + 96],
      [bx + 330, by + 69], [bx + 360, by + 69], [bx + 368, by + 50], [bx + 376, by + 88],
      [bx + 384, by + 69], [bx + 424, by + 69],
    ];
    poly(trace, RED);
    for (const [px2, py2] of trace) set(px2, py2 + 1, RED);
    drawText('M6.5', bx + 330, by + 8, 3, RED);
  }
  // Markets: falling chart + down arrow
  function artMarkets(bx: number, by: number, bw: number, bh: number): void {
    line(bx + 30, by + 12, bx + 30, by + 122, INK);
    line(bx + 30, by + 122, bx + 424, by + 122, INK);
    const pts: Array<[number, number]> = [
      [bx + 44, by + 28], [bx + 94, by + 44], [bx + 144, by + 38], [bx + 194, by + 64],
      [bx + 244, by + 58], [bx + 294, by + 86], [bx + 344, by + 80], [bx + 394, by + 106], [bx + 414, by + 114],
    ];
    poly(pts, RED);
    for (const [px2, py2] of pts) set(px2 + 1, py2, RED);
    // down arrow
    line(bx + 392, by + 34, bx + 392, by + 96, RED); line(bx + 394, by + 34, bx + 394, by + 96, RED);
    fillPoly([[bx + 380, by + 88], [bx + 406, by + 88], [bx + 393, by + 112]], RED);
    drawText('-4%', bx + 44, by + 8, 2, RED);
  }
  panel(24, 150, 'CLIMATE', 'CLIMATE TALKS END WITH NO DEAL',
    'ANTALYA SUMMIT COLLAPSES OVER FOSSIL FUELS. LEADERS REACT AS COP31 FAILS.', artClimate);
  panel(524, 150, 'WAR AT SEA', 'RUSSIAN WARSHIP SUNK IN LIBYA',
    'SEA DRONES HIT CORVETTE MERKURY AT BENGHAZI. LIBYA SEEKS A UN INQUIRY.', artShip);
  panel(24, 502, 'EARTHQUAKE', 'DEEP QUAKE SHAKES PACIFIC',
    'M6.5 AT 601 KM DEPTH IN THE VANUATU REGION. NO DAMAGE REPORTED.', artQuake);
  panel(524, 502, 'MARKETS', 'STOCKS SLIDE AROUND THE WORLD',
    'SEOUL -4%, SHANGHAI BELOW 3,500. BRENT $92 AS AI FEARS HIT SHARES.', artMarkets);
  // ---- also today strip ----
  drawText('ALSO ON 23 NOVEMBER', 24, 848, 2, RED);
  fillRect(24, 870, W - 48, 1, INK);
  drawWrapped('HEALTH - NHS LAUNCHES BIGGEST AI BREAST-CANCER TRIAL', 24, 882, 2, INK, 444, 4);
  drawWrapped('INDONESIA - 24 CONFIRMED DEAD IN CANDY FACTORY FIRE', 524, 882, 2, INK, 444, 4);
  drawWrapped('ASIA - INDIA, CHINA OPEN 10-DAY BORDER TALKS', 24, 918, 2, INK, 444, 4);
  drawWrapped('MIDDLE EAST - HOUTHIS CLAIM STRIKE ON SAUDI REFINERY', 524, 918, 2, INK, 444, 4);
  // ---- footer ----
  fillRect(24, 958, W - 48, 1, INK);
  drawText('SOURCES: REUTERS, BBC, THE HINDU, AP, WSJ, USGS, AL JAZEERA', 24, 968, 2, GREY);
  drawText('COP31 TALKS ENDED LATE SUNDAY. BENGHAZI STRIKE SUNDAY, WRECK CONFIRMED TODAY.', 24, 986, 2, GREY);
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
buildImage();
writeFileSync(join(outDir, 'entry.png'), encodePNG());
