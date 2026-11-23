// V2 — "The World in One Day", Monday 23 November 2026.
// Procedural newspaper infographic, drawn from code: own framebuffer,
// own 5x7 bitmap font, own pure-stdlib PNG encoder. No network, no Date,
// no randomness: two runs write byte-identical files.
import * as fs from "node:fs";
import * as path from "node:path";
import * as zlib from "node:zlib";

// ---------------------------------------------------------------- font ----
// 5x7 bitmap font. Each glyph: 7 rows of 5 bits, written as "0"/"1" strings.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "\u2019": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "+": ["00000", "00100", "00100", "01110", "00100", "00100", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "\u00b7": ["00000", "00000", "00000", "01100", "01100", "00000", "00000"],
  "\u2014": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
};

// --------------------------------------------------------- framebuffer ----
const W = 1024;
const H = 1024;
const fb = new Uint8Array(W * H * 3);
const PAPER: [number, number, number] = [244, 239, 227];
const PANEL_BG: [number, number, number] = [252, 250, 243];
const INK: [number, number, number] = [25, 25, 25];
const RED: [number, number, number] = [168, 30, 30];
const BLUE: [number, number, number] = [31, 78, 121];
const GREY: [number, number, number] = [110, 105, 95];
type RGB = [number, number, number];

function px(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  fb[i] = c[0];
  fb[i + 1] = c[1];
  fb[i + 2] = c[2];
}
function fillRect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) px(i, j, c);
}
function strokeRect(x: number, y: number, w: number, h: number, c: RGB, t = 1): void {
  fillRect(x, y, w, t, c);
  fillRect(x, y + h - t, w, t, c);
  fillRect(x, y, t, h, c);
  fillRect(x + w - t, y, t, h, c);
}
function hline(x0: number, x1: number, y: number, c: RGB, t = 1): void {
  for (let k = 0; k < t; k++) for (let x = x0; x <= x1; x++) px(x, y + k, c);
}
function vline(x: number, y0: number, y1: number, c: RGB, t = 1): void {
  for (let k = 0; k < t; k++) for (let y = y0; y <= y1; y++) px(x + k, y, c);
}
function line(x0: number, y0: number, x1: number, y1: number, c: RGB): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}
function circle(cx: number, cy: number, r: number, c: RGB, fill = false): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d2 = x * x + y * y;
      if (fill ? d2 <= r * r : d2 <= r * r && d2 >= (r - 1) * (r - 1)) px(cx + x, cy + y, c);
    }
  }
}
function fillPoly(pts: [number, number][], c: RGB): void {
  // Scanline fill; works for the convex shapes used here.
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [, y] of pts) {
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
    const xs: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[(i + 1) % pts.length];
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) * (x1 - x0)) / (y1 - y0));
      }
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.ceil(xs[k]); x <= Math.floor(xs[k + 1]); x++) px(x, y, c);
    }
  }
}

// -------------------------------------------------------------- text ------
function glyph(ch: string): string[] {
  return FONT[ch] ?? FONT[" "]!;
}
function textWidth(s: string, sc: number): number {
  let w = 0;
  for (const ch of s.toUpperCase()) w += 6 * sc;
  return w > 0 ? w - sc : 0;
}
function drawText(x: number, y: number, s: string, sc: number, c: RGB): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = glyph(ch);
    for (let r = 0; r < 7; r++) {
      for (let col = 0; col < 5; col++) {
        if (g[r]![col] === "1") {
          for (let dy = 0; dy < sc; dy++) {
            for (let dx = 0; dx < sc; dx++) {
              px(cx + col * sc + dx, y + r * sc + dy, c);
            }
          }
        }
      }
    }
    cx += 6 * sc;
  }
}
function centerText(y: number, s: string, sc: number, c: RGB): void {
  drawText(Math.floor((W - textWidth(s, sc)) / 2), y, s, sc, c);
}
function wrap(s: string, maxW: number, sc: number): string[] {
  const words = s.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? cur + " " + w : w;
    if (textWidth(t, sc) <= maxW || !cur) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}
function drawWrapped(x: number, y: number, s: string, maxW: number, sc: number, c: RGB, lh: number, maxLines = 99): number {
  const lines = wrap(s, maxW, sc).slice(0, maxLines);
  lines.forEach((ln, i) => drawText(x, y + i * lh, ln, sc, c));
  return y + lines.length * lh;
}

// ---------------------------------------------------------------- png -----
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE.push(c >>> 0);
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(fb.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// -------------------------------------------------------------- icons ----
// Each icon draws inside a ~200x90 box centred at (cx, cy).
function iconShip(cx: number, cy: number): void {
  // waves
  for (let k = 0; k < 2; k++) {
    const wy = cy + 34 + k * 8;
    for (let x = cx - 95; x <= cx + 95; x += 2) {
      const y = wy + Math.round(3 * Math.sin((x - cx) / 14 + k));
      px(x, y, BLUE);
    }
  }
  // hull
  fillPoly(
    [
      [cx - 88, cy + 2],
      [cx + 88, cy + 2],
      [cx + 66, cy + 28],
      [cx - 66, cy + 28],
    ],
    INK,
  );
  // mast + flag
  vline(cx, cy - 30, cy + 2, INK, 3);
  fillPoly(
    [
      [cx + 1, cy - 30],
      [cx + 26, cy - 24],
      [cx + 1, cy - 18],
    ],
    RED,
  );
  // explosion burst
  const bx = cx - 48;
  const by = cy - 22;
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    line(bx, by, bx + Math.round(16 * Math.cos(ang)), by + Math.round(16 * Math.sin(ang)), RED);
  }
  circle(bx, by, 5, RED, true);
  // smoke puffs
  circle(cx + 58, cy - 26, 7, GREY, true);
  circle(cx + 72, cy - 18, 5, GREY, true);
}
function iconClimate(cx: number, cy: number): void {
  circle(cx, cy, 34, INK);
  circle(cx, cy, 30, PAPER, true);
  // meridians
  for (let k = -1; k <= 1; k++) {
    vline(cx + k * 15, cy - 28, cy + 28, INK, 1);
  }
  hline(cx - 30, cx + 30, cy, INK, 1);
  hline(cx - 26, cx + 26, cy - 16, INK, 1);
  hline(cx - 26, cx + 26, cy + 16, INK, 1);
  // crack through the globe
  line(cx - 24, cy - 26, cx - 6, cy - 4, RED);
  line(cx - 6, cy - 4, cx + 10, cy + 8, RED);
  line(cx + 10, cy + 8, cx + 24, cy + 26, RED);
  // small sun / heat
  circle(cx + 52, cy - 26, 8, RED, true);
}
function iconNato(cx: number, cy: number): void {
  fillPoly(
    [
      [cx, cy - 40],
      [cx + 36, cy - 26],
      [cx + 36, cy + 4],
      [cx, cy + 38],
      [cx - 36, cy + 4],
      [cx - 36, cy - 26],
    ],
    BLUE,
  );
  // four-point star
  fillPoly(
    [
      [cx, cy - 18],
      [cx + 6, cy - 6],
      [cx + 18, cy],
      [cx + 6, cy + 6],
      [cx, cy + 18],
      [cx - 6, cy + 6],
      [cx - 18, cy],
      [cx - 6, cy - 6],
    ],
    PAPER,
  );
}
function iconTravel(cx: number, cy: number): void {
  // plane, nose right
  fillPoly(
    [
      [cx - 78, cy - 2],
      [cx + 62, cy - 10],
      [cx + 86, cy - 2],
      [cx + 62, cy + 4],
      [cx - 78, cy + 6],
    ],
    INK,
  );
  fillPoly(
    [
      [cx - 18, cy - 2],
      [cx + 6, cy - 30],
      [cx + 18, cy - 30],
      [cx + 8, cy - 2],
    ],
    INK,
  );
  fillPoly(
    [
      [cx - 66, cy - 2],
      [cx - 52, cy - 22],
      [cx - 42, cy - 22],
      [cx - 50, cy - 2],
    ],
    INK,
  );
  // red no-fly circle + slash
  circle(cx + 52, cy + 22, 24, RED);
  line(cx + 52 - 17, cy + 22 + 17, cx + 52 + 17, cy + 22 - 17, RED);
}
function iconMarkets(cx: number, cy: number): void {
  // axes
  vline(cx - 88, cy - 34, cy + 34, INK, 2);
  hline(cx - 88, cx + 92, cy + 34, INK, 2);
  // falling line, small rebound at the end
  const pts: [number, number][] = [
    [cx - 80, cy - 28],
    [cx - 48, cy - 12],
    [cx - 16, cy + 6],
    [cx + 16, cy + 20],
    [cx + 48, cy + 26],
    [cx + 84, cy + 8],
  ];
  for (let i = 0; i + 1 < pts.length; i++) {
    line(pts[i]![0], pts[i]![1], pts[i + 1]![0], pts[i + 1]![1], RED);
    line(pts[i]![0], pts[i]![1] + 1, pts[i + 1]![0], pts[i + 1]![1] + 1, RED);
  }
  // arrowhead at the rebound end
  fillPoly(
    [
      [cx + 84, cy + 8],
      [cx + 66, cy + 2],
      [cx + 70, cy + 16],
    ],
    RED,
  );
  // dashed baseline for "yesterday"
  for (let x = cx - 80; x <= cx + 40; x += 10) hline(x, x + 5, cy - 28, GREY, 1);
}
function iconSport(cx: number, cy: number): void {
  circle(cx, cy, 36, INK);
  circle(cx, cy, 33, PANEL_BG, true);
  // centre pentagon
  fillPoly(
    [
      [cx, cy - 12],
      [cx + 11, cy - 4],
      [cx + 7, cy + 10],
      [cx - 7, cy + 10],
      [cx - 11, cy - 4],
    ],
    INK,
  );
  // seams to the edge
  line(cx, cy - 12, cx, cy - 33, INK);
  line(cx + 11, cy - 4, cx + 31, cy - 12, INK);
  line(cx + 7, cy + 10, cx + 20, cy + 27, INK);
  line(cx - 7, cy + 10, cx - 20, cy + 27, INK);
  line(cx - 11, cy - 4, cx - 31, cy - 12, INK);
}

// ------------------------------------------------------------- layout ----
type Panel = {
  kicker: string;
  head: string;
  body: string;
  icon: (cx: number, cy: number) => void;
};

const PANELS: Panel[] = [
  {
    kicker: "WAR AT SEA \u2014 LIBYA",
    head: "ZELENSKY: WE SANK THE MERKURY",
    body: "UKRAINE SAYS SEVEN SEA DRONES SANK THE RUSSIAN CORVETTE MERKURY OFF LIBYA, DESTROYING A HELICOPTER ON BOARD. A CARGO SHIP WAS HIT TOO. LIBYA ASKS THE UN TO INVESTIGATE.",
    icon: iconShip,
  },
  {
    kicker: "CLIMATE \u2014 ANTALYA",
    head: "COP31 BLAME GAME BEGINS",
    body: "AUSTRALIA'S OPPOSITION DEMANDS MINISTER BOWEN QUIT OVER THE COLLAPSED TALKS. PACIFIC ISLANDS SAY THEY WERE 'LET DOWN ON ALL SIDES'. THE UN CHIEF VOICES FRUSTRATION.",
    icon: iconClimate,
  },
  {
    kicker: "NATO \u2014 BRUSSELS",
    head: "NATO MEETS AS MISSILES HIT POLAND",
    body: "NATO'S COUNCIL MEETS IN BRUSSELS TODAY AFTER POLISH PROSECUTORS CONFIRM THREE RUSSIAN MISSILES CROSSED INTO POLAND ON FRIDAY. PM TUSK CALLS IT A PROVOCATION.",
    icon: iconNato,
  },
  {
    kicker: "TRAVEL \u2014 BELGIUM",
    head: "BELGIUM AIRPORTS SHUT ALL DAY",
    body: "AIR TRAFFIC CONTROLLERS JOIN A NATIONWIDE STRIKE; 429 FLIGHTS AT BRUSSELS AIRPORT ARE CANCELLED AND 60,000 PASSENGERS HIT. CHARLEROI SHUTS ALL DAY.",
    icon: iconTravel,
  },
  {
    kicker: "MARKETS \u2014 SEOUL",
    head: "KOSPI SINKS, FUTURES REBOUND",
    body: "SEOUL -3.3% AS KOREA READIES A RESCUE FUND; US FUTURES BOUNCE +2% AFTER WALL STREET'S WORST WEEK IN 19 MONTHS. GOLD +2.8% TO $3,613.",
    icon: iconMarkets,
  },
  {
    kicker: "SPORT \u2014 FOOTBALL",
    head: "UK TO HOST 2035 WOMEN'S WORLD CUP",
    body: "FIFA CONFIRMS THE UK AS HOST \u2014 THE FIRST WORLD CUP ON BRITISH SOIL SINCE 1966. 48 TEAMS, 104 GAMES, 19 VENUES. THE US HOSTS 2031.",
    icon: iconSport,
  },
];

const STRIP: string[] = [
  "KYIV \u2014 RUSSIAN STRIKES KILL AT LEAST 15 IN KYIV REGION",
  "INDONESIA \u2014 24 DEAD IN CANDY FACTORY FIRE CONFIRMED",
  "KOREA \u2014 EXPORTS TOP $1 TRILLION FOR THE FIRST TIME",
  "IRAN \u2014 TEHRAN CLAIMS 78 US DRONES DOWNED",
];

function drawPanel(x: number, y: number, w: number, h: number, p: Panel): void {
  fillRect(x, y, w, h, PANEL_BG);
  strokeRect(x, y, w, h, INK, 2);
  drawText(x + 12, y + 12, p.kicker, 1, RED);
  const afterHead = drawWrapped(x + 12, y + 28, p.head, w - 24, 2, INK, 16, 2);
  hline(x + 12, x + w - 12, afterHead + 6, INK, 1);
  drawWrapped(x + 12, afterHead + 14, p.body, w - 24, 1, INK, 11, 5);
  p.icon(x + Math.floor(w / 2), y + 196);
}

function main(): void {
  fillRect(0, 0, W, H, PAPER);
  strokeRect(8, 8, W - 16, H - 16, INK, 3);
  strokeRect(16, 16, W - 32, H - 32, INK, 1);

  // Masthead: the day, named loud and first.
  centerText(32, "THE WORLD IN ONE DAY", 4, INK);
  centerText(70, "MONDAY 23 NOVEMBER 2026", 3, RED);
  hline(20, W - 20, 102, INK, 2);
  hline(20, W - 20, 106, INK, 1);

  // Six panels, 2 columns x 3 rows.
  const px0 = 20;
  const px1 = 516;
  const pw = 488;
  const ph = 252;
  const py = [118, 380, 642];
  PANELS.forEach((p, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    drawPanel(col === 0 ? px0 : px1, py[row]!, pw, ph, p);
  });

  // Strip: four more Monday stories.
  drawText(20, 906, "ALSO ON 23 NOVEMBER", 1, RED);
  drawText(516, 922, STRIP[1]!, 1, INK);
  drawText(20, 922, STRIP[0]!, 1, INK);
  drawText(20, 940, STRIP[2]!, 1, INK);
  drawText(516, 940, STRIP[3]!, 1, INK);

  // Footer: sources, plus honest dating notes for Sunday/Friday events
  // that only developed on Monday.
  hline(20, W - 20, 958, INK, 1);
  drawText(20, 966, "SOURCES: REUTERS, CNN, WSJ, LE MONDE, AP, AFP, BBC, FIFA, SKEYES", 1, GREY);
  drawText(
    20,
    982,
    "MERKURY SUNK SUNDAY; ZELENSKY CONFIRMED IT TODAY. COP31 COLLAPSED SUNDAY; BLAME GAME TODAY. POLAND MISSILES FRIDAY; NATO MEETS TODAY.",
    1,
    GREY,
  );

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  fs.mkdirSync(outDir, { recursive: true });
  const png = encodePNG();
  if (png.length > 1048576) throw new Error("entry.png exceeds 1 MiB: " + png.length);
  fs.writeFileSync(path.join(outDir, "entry.png"), png);
  console.log("wrote entry.png", png.length, "bytes, 1024x1024");
}

main();
