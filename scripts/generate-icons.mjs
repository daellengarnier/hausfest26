// Abhängigkeitsfreier PNG-Generator für die App-Icons: „HF"-Monogramm auf
// grünem Grund (warmes, naturnahes Branding). Buchstaben aus Rechtecken.
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "../public");
fs.mkdirSync(OUT, { recursive: true });

const GREEN_TOP = [90, 154, 99]; // #5a9a63
const GREEN_BOT = [53, 96, 60]; // #35603c
const CREAM = [243, 238, 225]; // #f3eee1

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
function encodePNG(size, px) {
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
  const px = Buffer.alloc(size * size * 4);
  const c = size / 2;
  const corner = size * 0.22;
  const set = (x, y, rgb) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = rgb[0];
    px[i + 1] = rgb[1];
    px[i + 2] = rgb[2];
    px[i + 3] = 255;
  };
  // Hintergrund (Verlauf) + abgerundete Ecken.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let a = 255;
      if (!maskable) {
        const dx = Math.max(0, Math.abs(x - c) - (c - corner));
        const dy = Math.max(0, Math.abs(y - c) - (c - corner));
        if (Math.sqrt(dx * dx + dy * dy) > corner) a = 0;
      }
      const rgb = lerp(GREEN_TOP, GREEN_BOT, y / size);
      const i = (y * size + x) * 4;
      px[i] = rgb[0];
      px[i + 1] = rgb[1];
      px[i + 2] = rgb[2];
      px[i + 3] = a;
    }
  }
  // Stehendes Dreieck (Spitze oben) in Creme.
  const yTop = size * 0.24;
  const yBot = size * 0.75;
  const halfBase = size * 0.3;
  const cx = size / 2;
  for (let y = Math.round(yTop); y <= Math.round(yBot); y++) {
    const f = (y - yTop) / (yBot - yTop); // 0 an der Spitze, 1 an der Basis
    const hw = halfBase * f;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) set(x, y, CREAM);
  }

  return encodePNG(size, px);
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
