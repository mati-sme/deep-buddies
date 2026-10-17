// Generates PNG icons (pixel mole with lantern glow) with a tiny PNG encoder. node tools/make-icons.js
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const MOLE = ['............', '...BBBBBB...', '..BBBBBBBB..', '.BBWEBBWEBB.', '.BBEEBBEEBB.', '.BBBBNNBBBB.', '.BBBCCCCBBB.', '..BCCCCCCB..', '..BCCCCCCB..', '..BBCCCCBB..', '.PPBBBBBBPP.', '............'];
const PAL = { B: [138, 98, 72], C: [200, 154, 120], W: [255, 255, 255], E: [26, 16, 16], N: [255, 143, 176], P: [255, 176, 200], H: [255, 204, 51] };
function crc32(buf) { let c, crc = 0xffffffff; for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(size, pad) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const cell = Math.floor(size * (1 - pad * 2) / 12), off = Math.floor((size - cell * 12) / 2);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const dx = x - size / 2, dy = y - size * 0.45, d = Math.sqrt(dx * dx + dy * dy) / (size * 0.6);
      const g = Math.max(0, 1 - d);
      let col = [26 + 200 * g * g, 15 + 120 * g * g, 8 + 40 * g * g];
      const band = Math.floor(y / (size / 8));
      if (y > size * 0.82) col = [74 - band, 44, 24];
      const i = Math.floor((x - off) / cell), j = Math.floor((y - off) / cell);
      if (i >= 0 && i < 12 && j >= 0 && j < 12) { const ch = MOLE[j][i]; if (PAL[ch]) col = PAL[ch]; }
      // helmet lamp
      if (j === 0 && i >= 4 && i <= 7 && i >= 0) col = PAL.H;
      const p = y * (size * 4 + 1) + 1 + x * 4;
      raw[p] = Math.min(255, col[0]); raw[p + 1] = Math.min(255, col[1]); raw[p + 2] = Math.min(255, col[2]); raw[p + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const dir = path.join(__dirname, '..', 'icons');
fs.writeFileSync(path.join(dir, 'icon-192.png'), png(192, 0.1));
fs.writeFileSync(path.join(dir, 'icon-512.png'), png(512, 0.1));
fs.writeFileSync(path.join(dir, 'maskable-512.png'), png(512, 0.2));
console.log('icons written');
