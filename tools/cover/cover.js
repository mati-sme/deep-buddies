/* Deep Buddies - key art drawn entirely in code: shapes rasterised at low resolution with hard (thresholded) edges,
   auto-outlined and scaled up nearest-neighbour, so it reads as chunky pixel art. drawCover(canvas, W, H, scale, opts) */
(function (root) {
'use strict';
const OUT = '#1e1008';
function cnv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hard(c) { // threshold alpha: no anti-aliased edges
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height), a = d.data;
  for (let i = 3; i < a.length; i += 4) a[i] = a[i] >= 110 ? 255 : 0;
  x.putImageData(d, 0, 0); return c;
}
function outline(c, col, n) { // n-pixel outline around opaque pixels
  const w = c.width, h = c.height, x = c.getContext('2d');
  for (let k = 0; k < (n || 1); k++) {
    const d = x.getImageData(0, 0, w, h), a = d.data, o = new Uint8ClampedArray(a);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const p = (j * w + i) * 4; if (a[p + 3]) continue;
      let near = false;
      for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < w && jj < h && a[(jj * w + ii) * 4 + 3]) { near = true; break; } }
      if (near) { o[p] = r; o[p + 1] = g; o[p + 2] = b; o[p + 3] = 255; }
    }
    d.data.set(o); x.putImageData(d, 0, 0);
  }
  return c;
}
/* a layer: draw shapes one at a time, each hard-edged, composited in order */
class Layer {
  constructor(w, h) { this.c = cnv(w, h); this.x = this.c.getContext('2d'); this.x.imageSmoothingEnabled = false; this.w = w; this.h = h; }
  shape(col, fn) { const t = cnv(this.w, this.h), x = t.getContext('2d'); x.fillStyle = col; x.strokeStyle = col; x.beginPath(); fn(x); hard(t); this.x.drawImage(t, 0, 0); return this; }
  ell(col, cx, cy, rx, ry, rot) { return this.shape(col, (x) => { x.ellipse(cx, cy, Math.max(0.5, rx), Math.max(0.5, ry), rot || 0, 0, Math.PI * 2); x.fill(); }); }
  rect(col, x0, y0, w, h) { this.x.fillStyle = col; this.x.fillRect(Math.round(x0), Math.round(y0), Math.round(w), Math.round(h)); return this; }
  poly(col, pts) { return this.shape(col, (x) => { x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.closePath(); x.fill(); }); }
  line(col, wdt, pts) { return this.shape(col, (x) => { x.lineWidth = wdt; x.lineCap = 'round'; x.lineJoin = 'round'; x.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) x.lineTo(p[0], p[1]); x.stroke(); }); }
  arc(col, wdt, cx, cy, r, a0, a1) { return this.shape(col, (x) => { x.lineWidth = wdt; x.lineCap = 'butt'; x.arc(cx, cy, r, a0, a1); x.stroke(); }); }
  clipTo(mask) { this.x.globalCompositeOperation = 'destination-in'; this.x.drawImage(mask.c, 0, 0); this.x.globalCompositeOperation = 'source-over'; return this; }
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------------- background: lantern-lit cave ---------------- */
function background(L, W, H, lx, ly, R) {
  const x = L.x, r = rng(7);
  L.rect('#140a14', 0, 0, W, H);
  // posterised radial light: a few hard bands from warm amber to deep cave purple
  const bands = ['#2a1530', '#3a1c2c', '#5a2c26', '#7a4024', '#a05a28', '#c87a34'];
  for (let i = 0; i < bands.length; i++) { const rr = R * (1.9 - i * 0.29); L.ell(bands[i], lx, ly, rr * 1.25, rr); }
  // rock blocks around the edges (dark), with bevels
  const bs = Math.round(Math.min(W, H) / 9);
  for (let j = -1; j < H / bs + 1; j++) for (let i = -1; i < W / bs + 1; i++) {
    const X = i * bs + (j % 2 ? bs / 2 : 0), Y = j * bs, cx = X + bs / 2, cy = Y + bs / 2;
    const d = Math.hypot((cx - lx) / 1.25, cy - ly) / R; if (d < 1.05) continue;
    const k = Math.min(1, (d - 1.05) * 1.4), base = k > 0.6 ? '#1e0f1c' : k > 0.3 ? '#2a1424' : '#3a1c26';
    L.rect(base, X + 1, Y + 1, bs - 2, bs - 2);
    L.rect(k > 0.6 ? '#2a1828' : '#4a2830', X + 1, Y + 1, bs - 2, Math.max(1, bs / 8));
    if (r() < 0.25) { const ox = X + 3 + r() * (bs - 8), oy = Y + 3 + r() * (bs - 8), oc = ['#ff9a3c', '#8ff0ff', '#c39bff', '#ffcc33'][Math.floor(r() * 4)]; L.rect(oc, ox, oy, 2, 2); L.rect('#ffffff', ox, oy, 1, 1); }
  }
  // glowing crystal clusters on both sides
  const crystal = (cx, cy, s, col, hi) => {
    for (const [dx, h, w2, rot] of [[0, 1, 0.5, 0], [-0.7, 0.7, 0.4, -0.35], [0.7, 0.6, 0.4, 0.4]]) {
      const bx = cx + dx * s, top = cy - h * s * 2.2;
      L.poly(OUT, [[bx - w2 * s - 1, cy + 1], [bx + rot * s * 1.2 - 1, top - 1], [bx + rot * s * 1.2 + 1, top - 1], [bx + w2 * s + 1, cy + 1]]);
      L.poly(col, [[bx - w2 * s, cy], [bx + rot * s * 1.2, top], [bx + w2 * s, cy]]);
      L.poly(hi, [[bx - w2 * s * 0.6, cy - 1], [bx + rot * s * 1.2, top + 1], [bx - w2 * s * 0.1, cy - 1]]);
    }
  };
  crystal(W * 0.09, H * 0.93, H * 0.07, '#5ad0e8', '#d8fbff');
  crystal(W * 0.92, H * 0.95, H * 0.06, '#b48cff', '#efe0ff');
  if (W > H * 1.2) crystal(W * 0.85, H * 0.2, H * 0.035, '#5ad0e8', '#d8fbff'); else crystal(W * 0.9, H * 0.42, H * 0.03, '#5ad0e8', '#d8fbff');
  if (W > H * 1.2) crystal(W * 0.13, H * 0.25, H * 0.03, '#ffcc33', '#fff8c0');
}
function ground(L, W, H, gy) {
  L.rect('#1e1008', 0, gy - 1, W, H - gy + 1);
  L.rect('#6a4020', 0, gy, W, H - gy);
  const bs = Math.round(H / 14);
  for (let i = 0; i < W / bs + 1; i++) { L.rect('#8a5a32', i * bs + 1, gy + 1, bs - 2, 2); L.rect('#4a2810', i * bs, gy + 2, 1, H); }
  L.rect('#4fbf4a', 0, gy, W, 2); L.rect('#9ef08a', 0, gy, W, 1);
}
/* ---------------- characters ---------------- */
function miner(W, H, cx, by, s) { // s = head radius in low-res px; by = feet y
  const L = new Layer(W, H);
  const hy = by - s * 4.1; // head centre
  // legs + boots
  L.rect('#5a3a20', cx - s * 0.95, by - s * 1.5, s * 0.75, s * 1.2).rect('#5a3a20', cx + s * 0.2, by - s * 1.5, s * 0.75, s * 1.2);
  L.ell('#3a2a1e', cx - s * 0.6, by - s * 0.3, s * 0.65, s * 0.38).ell('#3a2a1e', cx + s * 0.6, by - s * 0.3, s * 0.65, s * 0.38);
  // body (shirt) + strap + belt
  L.ell('#3d7be0', cx, by - s * 2.25, s * 1.25, s * 1.25);
  L.ell('#6aa0f0', cx - s * 0.45, by - s * 2.6, s * 0.55, s * 0.6);
  L.rect('#2a5cb0', cx + s * 0.55, by - s * 3.0, s * 0.45, s * 1.6);
  L.rect('#7a4a22', cx - s * 1.15, by - s * 1.55, s * 2.3, s * 0.38).rect('#ffcc33', cx - s * 0.18, by - s * 1.55, s * 0.36, s * 0.38);
  // arm holding the pick (raised, right side)
  L.line('#ffd2a6', s * 0.62, [[cx + s * 0.9, by - s * 2.6], [cx + s * 1.7, by - s * 3.4]]);
  // head
  L.ell('#ffd2a6', cx, hy, s, s * 0.95);
  L.ell('#f09080', cx - s * 0.55, hy + s * 0.25, s * 0.22, s * 0.14).ell('#f09080', cx + s * 0.55, hy + s * 0.25, s * 0.22, s * 0.14);
  L.ell('#2a1a10', cx - s * 0.33, hy - s * 0.05, s * 0.16, s * 0.24).ell('#2a1a10', cx + s * 0.33, hy - s * 0.05, s * 0.16, s * 0.24);
  L.rect('#ffffff', cx - s * 0.38, hy - s * 0.2, Math.max(1, s * 0.09), Math.max(1, s * 0.09)).rect('#ffffff', cx + s * 0.28, hy - s * 0.2, Math.max(1, s * 0.09), Math.max(1, s * 0.09));
  L.arc('#8a3a2a', Math.max(1, s * 0.12), cx, hy + s * 0.2, s * 0.32, 0.35, Math.PI - 0.35);
  // helmet + brim + lamp
  L.shape('#ffcc33', (x) => { x.ellipse(cx, hy - s * 0.25, s * 1.08, s * 0.95, 0, Math.PI, 0); x.fill(); });
  L.ell('#fff3a0', cx - s * 0.45, hy - s * 0.85, s * 0.35, s * 0.18, -0.4);
  L.rect('#d99a1e', cx - s * 1.3, hy - s * 0.32, s * 2.6, s * 0.3);
  L.ell('#ffffff', cx, hy - s * 0.75, s * 0.3, s * 0.3).ell('#fffbd0', cx, hy - s * 0.75, s * 0.18, s * 0.18);
  // pickaxe: handle + curved head
  const gx = cx + s * 1.75, gy = by - s * 3.45;
  const ex = gx + s * 1.3, ey = gy - s * 2.0;
  L.line('#7a4a22', s * 0.36, [[gx - s * 0.2, gy + s * 0.35], [ex, ey]]);
  L.line('#b07a40', s * 0.14, [[gx - s * 0.25, gy + s * 0.2], [ex - s * 0.1, ey - s * 0.05]]);
  L.shape('#c8ccd4', (x) => { x.lineWidth = s * 0.5; x.lineCap = 'round'; x.arc(ex + s * 0.2, ey + s * 1.2, s * 1.55, -Math.PI * 0.86, -Math.PI * 0.2); x.stroke(); });
  L.shape('#eef2f8', (x) => { x.lineWidth = s * 0.16; x.lineCap = 'round'; x.arc(ex + s * 0.2, ey + s * 1.2, s * 1.7, -Math.PI * 0.8, -Math.PI * 0.45); x.stroke(); });
  L.ell('#ffd2a6', gx, gy, s * 0.36, s * 0.36); // hand over the handle
  return outline(L.c, OUT, Math.max(1, Math.round(s / 7)));
}
function pip(W, H, cx, by, s, gem) { // s = body radius
  const L = new Layer(W, H);
  const cy = by - s * 0.95;
  // feet
  L.ell('#ffb0c8', cx - s * 0.5, by - s * 0.08, s * 0.32, s * 0.16).ell('#ffb0c8', cx + s * 0.5, by - s * 0.08, s * 0.32, s * 0.16);
  // ears
  L.ell('#7a5238', cx - s * 0.62, cy - s * 0.82, s * 0.24, s * 0.22).ell('#7a5238', cx + s * 0.62, cy - s * 0.82, s * 0.24, s * 0.22);
  L.ell('#ff9ab8', cx - s * 0.62, cy - s * 0.82, s * 0.12, s * 0.11).ell('#ff9ab8', cx + s * 0.62, cy - s * 0.82, s * 0.12, s * 0.11);
  // body + shading
  L.ell('#7a5238', cx, cy, s * 1.0, s * 0.95);
  L.ell('#9a6a48', cx - s * 0.18, cy - s * 0.2, s * 0.75, s * 0.68);
  L.ell('#e8c49a', cx, cy + s * 0.32, s * 0.6, s * 0.5); // belly
  L.ell('#ffe0b8', cx - s * 0.12, cy + s * 0.22, s * 0.3, s * 0.22);
  // eyes (big, shiny)
  for (const d of [-1, 1]) {
    const ex = cx + d * s * 0.36, ey = cy - s * 0.2;
    L.ell('#1a1010', ex, ey, s * 0.19, s * 0.23);
    L.ell('#ffffff', ex - s * 0.06, ey - s * 0.09, s * 0.08, s * 0.08);
    L.rect('#ffffff', ex + s * 0.06, ey + s * 0.07, Math.max(1, s * 0.05), Math.max(1, s * 0.05));
  }
  // blush + nose + smile
  L.ell('#ff8aa8', cx - s * 0.62, cy + s * 0.05, s * 0.15, s * 0.09).ell('#ff8aa8', cx + s * 0.62, cy + s * 0.05, s * 0.15, s * 0.09);
  L.ell('#ff6f98', cx, cy + s * 0.02, s * 0.2, s * 0.14);
  L.ell('#ffd0de', cx - s * 0.06, cy - s * 0.02, s * 0.07, s * 0.05);
  L.arc('#3a1a10', Math.max(1, s * 0.06), cx - s * 0.09, cy + s * 0.14, s * 0.1, 0.2, Math.PI - 0.3).arc('#3a1a10', Math.max(1, s * 0.06), cx + s * 0.09, cy + s * 0.14, s * 0.1, 0.3, Math.PI - 0.2);
  // paws raised, holding a gem up high
  if (gem) {
    const gx = cx + s * 0.05, gy = cy - s * 1.35;
    L.ell('#ffb0c8', cx - s * 0.36, cy - s * 0.85, s * 0.18, s * 0.2).ell('#ffb0c8', cx + s * 0.46, cy - s * 0.85, s * 0.18, s * 0.2);
    L.poly('#5ad0e8', [[gx - s * 0.42, gy], [gx - s * 0.22, gy - s * 0.28], [gx + s * 0.22, gy - s * 0.28], [gx + s * 0.42, gy], [gx, gy + s * 0.48]]);
    L.poly('#d8fbff', [[gx - s * 0.3, gy - s * 0.02], [gx - s * 0.16, gy - s * 0.22], [gx + s * 0.02, gy - s * 0.22], [gx - s * 0.04, gy + s * 0.25]]);
    L.poly('#3aa0b0', [[gx + s * 0.1, gy + s * 0.05], [gx + s * 0.42, gy], [gx, gy + s * 0.48]]);
  } else {
    L.ell('#ffb0c8', cx - s * 0.62, cy + s * 0.55, s * 0.17, s * 0.15).ell('#ffb0c8', cx + s * 0.62, cy + s * 0.55, s * 0.17, s * 0.15);
  }
  return outline(L.c, OUT, Math.max(1, Math.round(s / 9)));
}
function sparkle(L, x0, y0, n, col) {
  L.rect(col, x0 - n, y0, n * 2 + 1, 1).rect(col, x0, y0 - n, 1, n * 2 + 1).rect('#ffffff', x0, y0, 1, 1);
  if (n > 2) L.rect(col, x0 - 1, y0 - 1, 3, 3).rect('#ffffff', x0, y0, 1, 1);
}
/* title: pixel font, hard edges, 3-band glossy fill, thick outline, hard drop shadow */
// The title is pixel art authored here (not a font): 2 px strokes, caps 10 rows, x-height 7, descender 3, so every
// counter (the e, B, p, d holes) is at least 3x2 and stays open at any cover size.
const GLYPHS = {
  D: ['#####..', '######.', '##..###', '##...##', '##...##', '##...##', '##...##', '##..###', '######.', '#####..'],
  B: ['######.', '#######', '##...##', '##...##', '######.', '######.', '##...##', '##...##', '#######', '######.'],
  e: ['.#####.', '##...##', '##...##', '#######', '##.....', '##...##', '.#####.'],
  p: ['######.', '##...##', '##...##', '##...##', '##...##', '######.', '##.....', '##.....', '##.....'],
  u: ['##...##', '##...##', '##...##', '##...##', '##...##', '##..###', '.###.##'],
  d: ['.....##', '.....##', '.....##', '.######', '##...##', '##...##', '##...##', '##...##', '##..###', '.###.##'],
  i: ['##', '##', '..', '##', '##', '##', '##', '##', '##', '##'],
  s: ['.######', '##.....', '##.....', '.#####.', '.....##', '.....##', '######.'],
};
const CAP = 10; // rows above the baseline; lowercase without ascender start at row 3; p descends 3 rows
function glyphRows(ch) { const g = GLYPHS[ch]; return { g, top: g.length >= CAP ? 0 : CAP - 7 }; }
function lineCols(t) { let c = 0; for (const ch of t) c += ch === ' ' ? 4 : GLYPHS[ch][0].length + 1; return c - 1; }
function title(W, H, text, cx, cy, size) {
  const T = new Layer(W, H), x = T.x, lines = Array.isArray(text) ? text : [text];
  const cols = Math.max(...lines.map(lineCols)), lineRows = CAP + 3 + 2;
  const u = Math.max(1, Math.floor(Math.min(size / 9, (W * 0.9) / cols))); // one title pixel in canvas pixels
  size = u * 9;
  const mask = cnv(W, H), mx = mask.getContext('2d'); mx.fillStyle = '#fff';
  const tops = [];
  lines.forEach((l, li) => {
    let X = Math.round(cx - (lineCols(l) * u) / 2);
    const Y0 = Math.round(cy + (li - (lines.length - 1) / 2) * lineRows * u - (CAP * u) / 2); tops.push(Y0);
    for (const ch of l) {
      if (ch === ' ') { X += 4 * u; continue; }
      const { g, top } = glyphRows(ch);
      g.forEach((row, r) => { for (let c = 0; c < row.length; c++) if (row[c] === '#') mx.fillRect(X + c * u, Y0 + (top + r) * u, u, u); });
      X += (g[0].length + 1) * u;
    }
  });
  const lh = CAP * u; // glossy bands over each line's cap height (the last one also colours the p descender)
  const band = (c, a, b) => { const t = cnv(W, H), tx = t.getContext('2d'); tx.drawImage(mask, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = c; tx.beginPath(); for (const t0 of tops) tx.rect(0, t0 + lh * a, W, lh * (b - a) + 1); tx.fill(); x.drawImage(t, 0, 0); }; // one path: source-in clears outside each separate fill
  band('#fff6c0', 0, 0.3); band('#ffd84a', 0.3, 0.62); band('#ff9a2a', 0.62, 1.35);
  // Outline only the outer contour, so the counters (holes in e, B, p, d) stay open.
  const td = x.getImageData(0, 0, W, H), ta = td.data, out = new Uint8Array(W * H), stack = [];
  for (let i = 0; i < W; i++) stack.push(i, (H - 1) * W + i);
  for (let j = 0; j < H; j++) stack.push(j * W, j * W + W - 1);
  while (stack.length) { // flood the transparent area reachable from the edges = outside
    const q = stack.pop(); if (out[q] || ta[q * 4 + 3]) continue; out[q] = 1;
    const qx = q % W, qy = (q - qx) / W;
    if (qx > 0) stack.push(q - 1); if (qx < W - 1) stack.push(q + 1); if (qy > 0) stack.push(q - W); if (qy < H - 1) stack.push(q + W);
  }
  const ring = cnv(W, H), rx = ring.getContext('2d'), rd = rx.createImageData(W, H);
  for (let q = 0; q < W * H; q++) if (!out[q]) rd.data[q * 4 + 3] = 255; // text + holes, solid
  rx.putImageData(rd, 0, 0);
  outline(ring, '#5a2a04', 1); outline(ring, '#1e1008', Math.max(1, Math.round(size / 16)));
  const rr = rx.getImageData(0, 0, W, H);
  for (let q = 0; q < W * H; q++) if (!out[q]) rr.data[q * 4 + 3] = 0; // keep only the ring outside the letters
  for (let q = 0; q < W * H; q++) if (!out[q] && !ta[q * 4 + 3]) { // counters: solid dark brown, so the scene doesn't show through
    ta[q * 4] = 0x3a; ta[q * 4 + 1] = 0x1a; ta[q * 4 + 2] = 0x06; ta[q * 4 + 3] = 255;
  }
  x.putImageData(td, 0, 0);
  rx.putImageData(rr, 0, 0); x.globalCompositeOperation = 'destination-over'; x.drawImage(ring, 0, 0); x.globalCompositeOperation = 'source-over';
  const S = new Layer(W, H); S.x.globalAlpha = 1; S.x.drawImage(T.c, 0, Math.max(2, Math.round(size / 9)));
  const sd = S.x.getImageData(0, 0, W, H); for (let i = 0; i < sd.data.length; i += 4) if (sd.data[i + 3]) { sd.data[i] = 20; sd.data[i + 1] = 8; sd.data[i + 2] = 4; sd.data[i + 3] = 200; } S.x.putImageData(sd, 0, 0);
  S.x.drawImage(T.c, 0, 0);
  return S.c;
}
/* layout: 'land' 16:9, 'port' 2:3, 'sq' 1:1. Low-res size = output / scale */
function drawCover(out, OW, OH, scale, layout, opts) {
  opts = opts || {};
  const W = Math.round(OW / scale), H = Math.round(OH / scale);
  const L = new Layer(W, H);
  let gy, lx, ly, R, mx, ms, px, ps, tx, ty, tsz;
  if (layout === 'land') { gy = H * 0.86; lx = W * 0.5; ly = H * 0.62; R = H * 0.42; mx = W * 0.36; ms = H * 0.115; px = W * 0.63; ps = H * 0.2; tx = W / 2; ty = H * 0.15; tsz = Math.round(H * 0.2); }
  else if (layout === 'port') { gy = H * 0.88; lx = W * 0.5; ly = H * 0.66; R = W * 0.5; mx = W * 0.31; ms = W * 0.115; px = W * 0.67; ps = W * 0.215; tx = W / 2; ty = H * 0.17; tsz = Math.round(W * 0.26); }
  else { gy = H * 0.88; lx = W * 0.5; ly = H * 0.64; R = W * 0.42; mx = W * 0.31; ms = W * 0.098; px = W * 0.66; ps = W * 0.185; tx = W / 2; ty = H * 0.14; tsz = Math.round(W * 0.16); }
  const mirror = layout !== 'land';
  background(L, W, H, lx, ly, R);
  ground(L, W, H, Math.round(gy));
  // lantern beam from the helmet + soft floor light
  const mc = miner(W, H, mirror ? W - mx : mx, Math.round(gy), ms);
  if (mirror) { L.x.save(); L.x.translate(W, 0); L.x.scale(-1, 1); L.x.drawImage(mc, 0, 0); L.x.restore(); } else L.x.drawImage(mc, 0, 0);
  L.x.drawImage(pip(W, H, px, Math.round(gy), ps, true), 0, 0);
  const r = rng(3);
  for (let i = 0; i < 9; i++) sparkle(L, Math.round(px - ps * 1.4 + r() * ps * 2.8), Math.round(gy - ps * 3.2 + r() * ps * 1.3), 1 + Math.floor(r() * 3), ['#fff3a0', '#d8fbff', '#ffd0e8'][i % 3]);
  sparkle(L, Math.round(px + ps * 0.05), Math.round(gy - ps * 2.9), 3, '#ffffff');
  // scale up nearest-neighbour; the title gets its own layer at twice the resolution so letter counters stay open
  out.width = OW; out.height = OH; const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(L.c, 0, 0, W, H, 0, 0, OW, OH);
  if (!opts.noTitle) {
    const k = Math.max(2, Math.round(scale / 2)), TW = Math.round(OW / k), TH = Math.round(OH / k), f = scale / k;
    o.drawImage(title(TW, TH, layout === 'port' ? ['Deep', 'Buddies'] : 'Deep Buddies', tx * f, ty * f, Math.round(tsz * f)), 0, 0, TW, TH, 0, 0, OW, OH);
  }
}
root.DBCover = { drawCover };
})(self);
