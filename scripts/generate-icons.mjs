// Abhängigkeitsfreier PNG-Generator für die PWA-Icons (Ring + Punkt auf Indigo).
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public");
fs.mkdirSync(OUT, { recursive: true });

const ACCENT = [99, 102, 241];
const ACCENT_DARK = [67, 56, 202];
const LIGHT = [241, 245, 249];
const PINK = [236, 72, 153];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, draw) {
  const px = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = draw(x, y);
      const i = (y * size + x) * 4;
      px[i] = r;
      px[i + 1] = g;
      px[i + 2] = b;
      px[i + 3] = a;
    }
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}
const lerp = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

function makeIcon(size, { maskable = false } = {}) {
  const c = size / 2;
  const ringOuter = size * (maskable ? 0.3 : 0.34);
  const ringInner = size * (maskable ? 0.2 : 0.23);
  const dotR = size * 0.075;
  const corner = size * 0.22;
  return encodePNG(size, (x, y) => {
    const dx = x - c,
      dy = y - c;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const t = (x + y) / (2 * size);
    let [r, g, b] = lerp(ACCENT, ACCENT_DARK, t);
    let a = 255;
    if (!maskable) {
      const rx = Math.max(0, Math.abs(dx) - (c - corner));
      const ry = Math.max(0, Math.abs(dy) - (c - corner));
      if (Math.sqrt(rx * rx + ry * ry) > corner) a = 0;
    }
    if (dist <= ringOuter && dist >= ringInner) [r, g, b] = LIGHT;
    const pdx = x - c,
      pdy = y - (c - ringOuter * 0.92);
    if (Math.sqrt(pdx * pdx + pdy * pdy) <= dotR) [r, g, b] = PINK;
    if (dist <= dotR * 0.8) [r, g, b] = LIGHT;
    return [r, g, b, a];
  });
}

for (const [name, size, opts] of [
  ["pwa-192x192.png", 192, {}],
  ["pwa-512x512.png", 512, {}],
  ["maskable-512x512.png", 512, { maskable: true }],
  ["apple-touch-icon.png", 180, {}],
  ["favicon-64.png", 64, {}],
]) {
  fs.writeFileSync(path.join(OUT, name), makeIcon(size, opts));
  console.log("wrote", name);
}
