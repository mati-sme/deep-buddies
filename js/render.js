/* Deep Buddies - canvas renderer: lantern-lit chunky pixel cave. */
(function (root) {
'use strict';
const D = root.DBData, C = root.DBCore, S = root.DBSprites;
const { T } = C;
const FONT = '"Pixelify Sans", system-ui, sans-serif';
const IC = (n) => root.DBIcons.get(n);

class Renderer {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.dark = document.createElement('canvas'); this.dctx = this.dark.getContext('2d');
    this.parts = []; this.pops = []; this.shake = 0; this.camY = null; this.bubble = null; this.t = 0;
    this.pSwing = 0; this.bSwing = 0; this.slash = null; this.flash = 0; this.hurtFlash = 0;
    this.arrow = null; this.emote = null; this.findFx = null; this.campView = false;
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.cv.clientWidth || 360, h = this.cv.clientHeight || 640;
    this.dpr = dpr; this.w = w; this.h = h;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dark.width = this.cv.width; this.dark.height = this.cv.height;
    this.camX = null;
    this.layout(D.W, D.W / 2);
  }
  landscape() { return this.w > this.h * 1.1; }
  // landscape tile size: fits ~12.5 rows (phones) / ~15 rows (big screens), snapped so 16px textures scale by whole device pixels
  landscapeTs() {
    const target = this.h / (this.h < 600 ? 12.5 : 15);
    let step = 16 / this.dpr; while (step < 6) step *= 2;
    const minTs = step * Math.ceil(26 / step);
    return Math.min(step * Math.ceil(110 / step), Math.max(minTs, step * Math.round(target / step)));
  }
  idealCols() { return this.landscape() ? Math.max(D.W, Math.min(40, Math.floor(this.w / this.landscapeTs()))) : D.W; }
  layout(W, focusX) {
    this.ts = this.landscape() ? this.landscapeTs() : Math.max(24, Math.floor(Math.min(this.w / (D.W + 0.4), 64)));
    const span = W * this.ts;
    let ox;
    if (span <= this.w) { ox = (this.w - span) / 2; this.camX = null; }
    else { // shaft wider than the screen (e.g. rotated to portrait mid-run): follow the player sideways
      const tgt = Math.max(this.w - span, Math.min(0, this.w / 2 - (focusX + 0.5) * this.ts));
      this.camX = this.camX === null ? tgt : this.camX + (tgt - this.camX) * 0.15;
      ox = this.camX;
    }
    this.ox = Math.round(ox * this.dpr) / this.dpr;
    this.xa = Math.max(0, Math.floor(-this.ox / this.ts) - 1); this.xb = Math.min(W - 1, Math.ceil((this.w - this.ox) / this.ts));
  }
  sx(x) { return this.ox + Math.round(x * this.ts * this.dpr) / this.dpr; }
  sy(y) { return Math.round((y - this.camY) * this.ts * this.dpr) / this.dpr; }
  tileAt(px, py) { return { x: Math.floor((px - this.ox) / this.ts), y: Math.floor(py / this.ts + this.camY) }; }

  /* ---- events -> juice ---- */
  burst(x, y, n, cols, speed, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * speed;
      this.parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.6, life: 0.5 + Math.random() * 0.5, col: cols[i % cols.length], size: size * (0.6 + Math.random() * 0.8) });
    }
  }
  pop(x, y, text, col, big, icon) { this.pops.push({ x: x + 0.5, y: y + 0.2, text, col, life: 1.2, big, icon }); }
  emo(kind, t) { this.emote = { kind, t: t || 1.6 }; }
  /* screen position (CSS px, canvas-relative) of a tile centre */
  screenOf(x, y) { return { x: this.sx(x) + this.ts / 2, y: this.sy(y) + this.ts / 2 }; }
  event(e, w) {
    const P = e.s !== undefined ? D.stratum(e.s) : null;
    switch (e.type) {
      case 'chip': if (e.who === 'p') this.pSwing = 0.16; else if (e.who === 'b') this.bSwing = 0.16;
        this.burst(e.x, e.y, 3, [P.light, P.speck, P.dark], 3, 0.09); break;
      case 'break': this.burst(e.x, e.y, e.big ? 16 : 8, [P.base, P.light, P.speck, P.dark], e.big ? 6 : 4, e.big ? 0.14 : 0.11); if (e.big) this.shake = Math.max(this.shake, 5); break;
      case 'ore': { const O = D.ore(e.tier); this.burst(e.x, e.y, e.gem ? 18 : 8, [O.color, O.hi, '#ffffff'], 4, 0.1); this.pop(e.x, e.y, e.gem ? O.name + '!' : '+' + O.name, O.hi, e.gem, e.gem ? 'gem:' + O.color : 'ore:' + O.color); break; }
      case 'bagfull': this.pop(e.x, e.y, 'Bag full!', '#ff8080', false, 'bag'); break;
      case 'flask': this.pop(e.x, e.y, '+' + Math.max(1, Math.round(e.amt)) + 's', '#ffd060', true, 'lantern'); this.burst(e.x, e.y, 10, ['#ffb030', '#fff0a0'], 3, 0.1); break;
      case 'chest': this.pop(e.x, e.y, '+' + C.fmt(e.v), '#ffe066', true, 'coin'); this.burst(e.x, e.y, 24, ['#ffcc33', '#fff2a0', '#ffffff'], 6, 0.12); this.shake = Math.max(this.shake, 4); break;
      case 'pipfind': this.pop(e.x, e.y - 0.4, 'Pip found treasure!', '#fff2a0', true, 'sparkle'); this.pop(e.x, e.y + 0.3, '+' + C.fmt(e.v), '#ffe066', true, 'coin'); this.burst(e.x, e.y, 36, ['#ffcc33', '#fff2a0', '#ffffff', '#ff9ab8'], 6, 0.13); this.shake = Math.max(this.shake, 4); this.emo('heart', 2.2); this.findFx = null; break;
      case 'pipsniff': this.emo('bang', 2.2); this.findFx = { x: e.x, y: e.y, t: 12 }; break;
      case 'boom': this.burst(e.x, e.y, e.gas ? 26 : 40, e.gas ? ['#9cff6a', '#5fd03a', '#d0ffb0'] : ['#ff9a3c', '#ffe066', '#ff5030', '#444'], e.gas ? 4 : 8, 0.18); this.shake = Math.max(this.shake, e.gas ? 7 : 12); this.flash = e.gas ? 0.15 : 0.3; break;
      case 'hurt': this.hurtFlash = 0.35; this.shake = Math.max(this.shake, 5); this.pop(w.player.x, w.player.y - 0.3, '-' + Math.max(1, Math.round(e.amt)) + 's', '#ff6060', false, 'lantern'); break;
      case 'slash': this.burst(e.x, e.y, 5, ['#ffffff', '#ffd0d0'], 3, 0.08); break;
      case 'attack': this.slash = { x: e.x, y: e.y, t: 0.18, who: e.who }; break;
      case 'kill': this.burst(e.x, e.y, 18, ['#ffffff', '#ffe066', '#b090ff'], 5, 0.12); this.pop(e.x, e.y, '+' + C.fmt(e.v), '#ffe066', false, 'coin'); if (e.who === 'b') this.emo('heart'); break;
      case 'crit': this.pop(e.x, e.y, 'CRIT!', '#ffef6a'); break;
      case 'drill': this.burst(e.x, e.y + 1, 14, ['#c0c8d0', '#ffcc33'], 4, 0.1); this.shake = Math.max(this.shake, 3); break;
      case 'flare': this.flash = 0.6; break;
      case 'say': this.bubble = { text: e.text, t: 2.6 }; break;
    }
  }

  /* ---- drawing ---- */
  drawTile(w, x, y, X, Y, ts) {
    const ctx = this.ctx, r = w.row(y), t = r.t[x], s = C.stratumOf(y), v = (x * 7 + y * 13) % 3;
    if (C.passable(t)) {
      ctx.drawImage(S.wallTex(s, v), X, Y, ts, ts);
      if (t === T.WATER) {
        ctx.fillStyle = 'rgba(60,140,255,0.55)'; ctx.fillRect(X, Y, ts, ts);
        ctx.fillStyle = 'rgba(200,230,255,0.6)'; const o = Math.sin(this.t * 3 + x) * ts * 0.06; ctx.fillRect(X, Y + ts * 0.12 + o, ts, Math.max(2, ts * 0.06));
      } else if (t === T.LAVA) {
        const g = 0.75 + Math.sin(this.t * 4 + x * 1.7 + y) * 0.2;
        ctx.fillStyle = `rgba(255,${Math.floor(90 + 60 * g)},20,${0.85})`; ctx.fillRect(X, Y, ts, ts);
        ctx.fillStyle = 'rgba(255,240,120,0.7)'; ctx.fillRect(X + ((this.t * 9 + x * 5) % ts), Y + ts * 0.3, ts * 0.12, ts * 0.12);
      }
      return;
    }
    const kind = t === T.BOULDER ? 'boulder' : t === T.GAS ? 'gas' : 'rock';
    ctx.drawImage(S.rockTex(s, v, kind), X, Y, ts, ts);
    if (t === T.ORE) ctx.drawImage(S.oreTex(r.ore[x], v), X, Y, ts, ts);
    else if (t === T.FLASK) ctx.drawImage(S.itemTex('flask'), X + ts * 0.3, Y + ts * 0.2, ts * 0.4, ts * 0.55);
    else if (t === T.CHEST) ctx.drawImage(S.itemTex('chest'), X + ts * 0.12, Y + ts * 0.25, ts * 0.76, ts * 0.6);
    if (y === 0) { ctx.fillStyle = '#4fbf4a'; ctx.fillRect(X, Y, ts, ts * 0.19); ctx.fillStyle = '#7ee06a'; ctx.fillRect(X, Y, ts, ts * 0.07); }
    const ratio = r.hp[x] / r.max[x];
    if (ratio < 0.999) {
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = Math.max(2, ts / 16);
      ctx.beginPath();
      const m = (a, b) => [X + a * ts, Y + b * ts];
      const lines = [[[0.5, 0.5], [0.25, 0.2]], [[0.5, 0.5], [0.8, 0.35]], [[0.5, 0.5], [0.4, 0.85]], [[0.25, 0.2], [0.1, 0.35]], [[0.8, 0.35], [0.9, 0.7]], [[0.4, 0.85], [0.7, 0.9]]];
      const n = ratio < 0.33 ? 6 : ratio < 0.66 ? 4 : 2;
      for (let i = 0; i < n; i++) { const a = m(...lines[i][0]), b = m(...lines[i][1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }
  }
  drawSky(yTop, yBot) {
    const ctx = this.ctx;
    if (yBot <= 0) return;
    const g = ctx.createLinearGradient(0, Math.min(0, yBot - this.h), 0, yBot);
    g.addColorStop(0, '#2f5fc8'); g.addColorStop(0.6, '#6ea0f0'); g.addColorStop(1, '#ffd9a0');
    ctx.fillStyle = g; ctx.fillRect(0, yTop, this.w, yBot - yTop);
    const ts = this.ts, pu = Math.max(2, Math.round(ts / 10)); // "pixel unit" for chunky shapes
    const snap = (v) => Math.round(v / pu) * pu;
    const disc = (cx, cy, r, col) => { ctx.fillStyle = col; for (let dy = -r; dy <= r; dy += pu) { const hw = snap(Math.sqrt(Math.max(0, r * r - dy * dy))); ctx.fillRect(snap(cx) - hw, snap(cy + dy), hw * 2, pu); } };
    // sun with halo rings
    const sx = this.w * 0.8, sy = yBot - ts * 5.4;
    disc(sx, sy, ts * 1.25, 'rgba(255,240,170,0.18)'); disc(sx, sy, ts * 0.95, 'rgba(255,240,170,0.3)'); disc(sx, sy, ts * 0.7, '#fff3b0'); disc(sx - ts * 0.12, sy - ts * 0.12, ts * 0.45, '#fffbe0');
    // stepped pixel clouds
    for (let i = 0; i < 5; i++) {
      const cw = ts * (1.6 + (i % 3) * 0.5), cx = snap(((i * 197 + this.t * (5 + i)) % (this.w + cw * 2)) - cw), cy = snap(yBot - ts * (3.4 + (i % 3) * 1.0) - (i === 4 ? ts * 2 : 0));
      ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(cx, cy, snap(cw), snap(ts * 0.34)); ctx.fillRect(cx + snap(cw * 0.18), cy - snap(ts * 0.24), snap(cw * 0.5), snap(ts * 0.26)); ctx.fillRect(cx + snap(cw * 0.5), cy - snap(ts * 0.12), snap(cw * 0.32), snap(ts * 0.14));
      ctx.fillStyle = 'rgba(190,210,255,0.85)'; ctx.fillRect(cx, cy + snap(ts * 0.34) - pu, snap(cw), pu);
    }
    // two layers of stepped hills + pixel pines
    const hills = (base, amp, freq, col, phase) => {
      ctx.fillStyle = col;
      for (let x = 0; x < this.w + pu; x += pu * 2) {
        const h = snap(amp * (0.55 + 0.45 * Math.sin(x * freq + phase) * Math.sin(x * freq * 0.37 + phase * 2)));
        ctx.fillRect(x, yBot - base - h, pu * 2, base + h + 2);
      }
    };
    hills(ts * 0.9, ts * 1.7, 0.006, '#5aa0a0', 1.3);
    hills(ts * 0.3, ts * 1.1, 0.011, '#3d8f4a', 0.2);
    for (let i = 0; i < 9; i++) {
      const tx = snap((i * 0.13 + 0.04) * this.w + Math.sin(i * 7.1) * ts), th = ts * (0.9 + (i % 3) * 0.25), ty = yBot - ts * 0.25;
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(tx - pu / 2, snap(ty - th * 0.3), pu, snap(th * 0.3));
      ctx.fillStyle = '#2a6a3a';
      for (let k = 0; k < 4; k++) { const ww = snap(th * (0.5 - k * 0.1)); ctx.fillRect(tx - ww / 2, snap(ty - th * 0.3 - (k + 1) * th * 0.18), ww, snap(th * 0.2)); }
      ctx.fillStyle = '#3e8a4a'; ctx.fillRect(tx - pu, snap(ty - th * 0.95), pu, snap(th * 0.5));
    }
  }
  /* cosy camp scene on the surface (only while in camp) */
  drawCamp(w, surfY) {
    const ctx = this.ctx, ts = this.ts, wide = this.landscape();
    const rail = wide ? (this.railW || 0) : 0, right = wide ? this.w * (this.campRight || 0.64) : this.w;
    const cx = rail + (right - rail) / 2, u = Math.min(ts, (right - rail) / 13);
    const put = (img, x, wpx) => { const h = img.height * (wpx / img.width); ctx.drawImage(img, Math.round(x - wpx / 2), Math.round(surfY - h + u * 0.05), Math.round(wpx), Math.round(h)); };
    put(S.prop('tent'), cx - u * 4.5, u * 3.2);
    if (right - rail > u * 15.5) put(S.prop('sign'), cx - u * 7.1, u * 2.1);
    put(S.prop('cart'), cx + u * 4.8, u * 2.4);
    // campfire glow + fire
    const fx = cx + u * 0.15, fl = 1 + Math.sin(this.t * 9) * 0.05;
    const g = ctx.createRadialGradient(fx, surfY - u * 0.4, 0, fx, surfY - u * 0.4, u * 3.2 * fl);
    g.addColorStop(0, 'rgba(255,190,90,0.45)'); g.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = g; ctx.fillRect(fx - u * 4, surfY - u * 4, u * 8, u * 5);
    put(S.campfire(Math.floor(this.t * 8)), fx, u * 1.25);
    if (Math.random() < 0.25) this.parts.push({ sx: fx + (Math.random() - 0.5) * u * 0.4, sy: surfY - u * 0.9, vx: (Math.random() - 0.5) * 12, vy: -30 - Math.random() * 30, life: 0.9, col: Math.random() < 0.5 ? '#ffd060' : '#ff8a3c', size: 0.07, screen: true });
    put(S.prop('log'), fx - u * 1.5, u * 1.1);
    // hero + Pip, large
    const bobH = Math.round(Math.sin(this.t * 2.2) * u * 0.03);
    const hero = S.hero(w.st.armor, 0), hw = u * 2.1, hh = hero.height * hw / hero.width;
    ctx.save(); ctx.translate(Math.round(cx - u * 1.9), Math.round(surfY - hh + bobH)); ctx.drawImage(hero, -hw / 2, 0, hw, hh);
    const pk = S.pickaxe(w.st.pickTier); ctx.translate(hw * 0.32, hh * 0.62); ctx.rotate(-0.25); ctx.drawImage(pk, -hw * 0.1, -hw * 0.75, hw * 0.85, hw * 0.85); ctx.restore();
    const blink = (this.t % 3.6) < 0.14 ? 1 : 0, pp = S.pip(w.st.evo, this.emote && this.emote.t > 0 ? 2 : blink), pw = u * 1.9, ph = pp.height * pw / pp.width;
    const hop = Math.round(Math.max(0, Math.sin(this.t * 3.1)) * u * 0.18 * (Math.sin(this.t * 0.9) > 0.3 ? 1 : 0));
    ctx.drawImage(pp, Math.round(cx + u * 2.0 - pw / 2), Math.round(surfY - ph - hop), Math.round(pw), Math.round(ph));
    if (w.st.evo >= 4) { ctx.fillStyle = 'rgba(255,240,140,0.2)'; ctx.beginPath(); ctx.arc(cx + u * 2, surfY - ph / 2, pw * 0.75, 0, 7); ctx.fill(); }
    // little heart over Pip now and then
    const ht = this.t % 7;
    if (ht < 1.4) { const a = Math.min(1, ht * 3, (1.4 - ht) * 3), sz = u * 0.55; ctx.globalAlpha = a; ctx.drawImage(IC('heart'), Math.round(cx + u * 2.0 - sz / 2), Math.round(surfY - ph - u * 0.6 - ht * u * 0.4 - hop), sz, sz); ctx.globalAlpha = 1; }
  }
  drawActorMiner(w, a, ts) {
    const ctx = this.ctx, X = this.sx(a.px), Y = this.sy(a.py);
    const moving = Math.abs(a.x - a.px) + Math.abs(a.y - a.py) > 0.05;
    const bob = moving ? Math.round(Math.abs(Math.sin(this.t * 10)) * ts * 0.06) : 0;
    const spr = S.hero(w.st.armor, moving ? Math.floor(this.t * 8) % 2 : 0);
    ctx.save();
    ctx.translate(X + ts / 2, Y + ts / 2 - bob);
    if (a.hurtT > 0 && Math.floor(this.t * 20) % 2) ctx.globalAlpha = 0.5;
    ctx.scale(a.face < 0 ? -1 : 1, 1);
    ctx.drawImage(spr, -ts * 0.5, -ts * 0.56, ts, ts);
    ctx.restore();
    // pickaxe sprite, swung around the grip
    let dx = a.face, dy = 0;
    if (a.dig) { dx = a.dig.x - a.x; dy = a.dig.y - a.y; }
    const base = Math.atan2(dy, dx);
    const sw = this.pSwing > 0 ? (this.pSwing / 0.16) : 0;
    let ang = base - 1.2 + (1 - sw) * 1.4 * (a.dig ? 1 : 0.3);
    if (!a.dig) ang = (a.face > 0 ? -0.9 : Math.PI + 0.9);
    const hx = X + ts / 2 + Math.cos(base) * ts * 0.18, hy = Y + ts * 0.55 + Math.sin(base) * ts * 0.1 - bob;
    const sc = ts * 0.056, img = S.pickaxe(w.st.pickTier);
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang + 0.86);
    if (Math.cos(ang) < 0) { ctx.rotate(-1.72); ctx.scale(-1, 1); }
    ctx.drawImage(img, -1.5 * sc, -9.5 * sc, 14 * sc, 14 * sc);
    ctx.restore();
  }
  drawBuddy(w, b, ts) {
    const ctx = this.ctx, X = this.sx(b.px), Y = this.sy(b.py);
    const moving = Math.abs(b.x - b.px) + Math.abs(b.y - b.py) > 0.05;
    const bob = moving ? Math.abs(Math.sin(this.t * 12)) * ts * 0.1 : Math.sin(this.t * 3) * ts * 0.03;
    const dig = this.bSwing > 0 ? Math.sin(this.t * 60) * ts * 0.05 : 0;
    const happy = this.emote && this.emote.t > 0 && this.emote.kind !== 'bang';
    const frame = happy ? 2 : (this.t % 3.4) < 0.13 ? 1 : 0;
    ctx.save(); ctx.translate(X + ts / 2 + dig, Y + ts / 2 - bob);
    ctx.scale(b.face < 0 ? -1 : 1, 1);
    if (w.st.evo >= 4) { ctx.fillStyle = 'rgba(255,240,140,0.25)'; ctx.beginPath(); ctx.arc(0, 0, ts * 0.6, 0, 7); ctx.fill(); }
    ctx.drawImage(S.pip(w.st.evo, frame), -ts * 0.48, -ts * 0.4, ts * 0.96, ts * 0.9);
    ctx.restore();
  }
  drawEmote(w, ts) {
    const e = this.emote; if (!e || e.t <= 0) return;
    const b = w.buddy, X = this.sx(b.px) + ts / 2, Y = this.sy(b.py) - ts * 0.2;
    const sz = Math.round(ts * 0.55), up = Math.abs(Math.sin(this.t * 6)) * ts * 0.12;
    this.ctx.globalAlpha = Math.min(1, e.t * 3);
    this.ctx.drawImage(IC(e.kind === 'bang' ? 'bang' : e.kind), Math.round(X - sz / 2), Math.round(Y - sz - up), sz, sz);
    this.ctx.globalAlpha = 1;
  }
  /* tutorial pointer: bouncing arrow + ring + label, drawn above the darkness */
  drawArrow(ts) {
    const a = this.arrow; if (!a) return;
    const ctx = this.ctx, X = this.sx(a.x) + ts / 2, Y = this.sy(a.y) + ts / 2;
    const p = 0.5 + 0.5 * Math.sin(this.t * 6);
    ctx.strokeStyle = `rgba(255,232,120,${0.55 + 0.4 * p})`; ctx.lineWidth = Math.max(3, ts * 0.07);
    const r = ts * (0.62 + 0.08 * p); ctx.strokeRect(Math.round(X - r), Math.round(Y - r), Math.round(r * 2), Math.round(r * 2));
    const sz = Math.round(ts * 0.8), by = Y - r - sz - Math.abs(Math.sin(this.t * 5)) * ts * 0.3;
    ctx.drawImage(IC('depth:#ffd84a'), Math.round(X - sz / 2), Math.round(by), sz, sz);
    if (a.text) {
      const fs = Math.max(15, Math.round(ts * 0.36));
      ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(a.text, X, by - 4);
      ctx.fillStyle = '#fff2a0'; ctx.fillText(a.text, X, by - 4);
    }
  }
  drawBubble(w, ts) {
    if (!this.bubble || this.bubble.t <= 0) return;
    const ctx = this.ctx, b = w.buddy;
    const X = this.sx(b.px) + ts / 2;
    const rawY = this.sy(b.py) - ts * 0.15, off = rawY < 60 || rawY > this.h - 40;
    const Y = Math.max(110, Math.min(this.h - 60, rawY));
    const text = this.bubble.text;
    const fs = Math.max(13, Math.round(ts * 0.36));
    ctx.font = `600 ${fs}px ${FONT}`;
    const icw = off ? fs * 1.2 : 0;
    const tw = ctx.measureText(text).width + fs + icw;
    let bx = Math.max(4, Math.min(this.w - tw - 4, X - tw / 2)), by = Y - fs * 1.9;
    const a = Math.min(1, this.bubble.t * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, tw, fs * 1.5, fs * 0.5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - 5, by + fs * 1.5 - 1); ctx.lineTo(X, by + fs * 1.5 + 7); ctx.lineTo(X + 5, by + fs * 1.5 - 1); ctx.fill();
    ctx.fillStyle = '#3a2a1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + tw / 2 + icw / 2, by + fs * 0.78);
    if (off) ctx.drawImage(IC('paw'), Math.round(bx + fs * 0.4), Math.round(by + fs * 0.25), Math.round(fs), Math.round(fs));
    ctx.globalAlpha = 1;
  }

  draw(w, dt) {
    this.t += dt;
    const W = w.W;
    this.layout(W, w.player.px);
    const ctx = this.ctx, ts = this.ts, dpr = this.dpr;
    const lr = w.lightR();
    // smooth actors
    const k = Math.min(1, dt * 16);
    for (const a of [w.player, w.buddy]) { a.px += (a.x - a.px) * k; a.py += (a.y - a.py) * k; }
    for (const c of w.creatures) { c.px += (c.x - c.px) * Math.min(1, dt * 10); c.py += (c.y - c.py) * Math.min(1, dt * 10); }
    const viewRows = this.h / ts;
    const target = w.player.py - viewRows * (this.campView ? (this.landscape() ? 0.5 : 0.36) : w.player.y < 2 ? 0.55 : 0.4);
    if (this.camY === null) this.camY = target;
    this.camY += (target - this.camY) * Math.min(1, dt * 5);
    this.pSwing -= dt; this.bSwing -= dt; this.shake *= Math.pow(0.002, dt); this.flash -= dt; this.hurtFlash -= dt;
    if (this.bubble) this.bubble.t -= dt;
    if (this.emote) this.emote.t -= dt;
    if (this.findFx) { this.findFx.t -= dt; if (this.findFx.t <= 0) this.findFx = null; }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const shx = (Math.random() - 0.5) * this.shake, shy = (Math.random() - 0.5) * this.shake;
    ctx.translate(shx, shy);
    const s0 = C.stratumOf(Math.max(0, Math.floor(this.camY + viewRows / 2)));
    ctx.fillStyle = D.stratum(s0).bg; ctx.fillRect(-20, -20, this.w + 40, this.h + 40);
    const surfY = this.sy(0);
    this.drawSky(-20, surfY);

    const y0 = Math.floor(this.camY) - 1, y1 = Math.ceil(this.camY + viewRows) + 1;
    for (let y = Math.max(0, y0); y <= y1; y++) {
      const Y = this.sy(y);
      // bedrock sides
      const P = D.stratum(C.stratumOf(y));
      ctx.fillStyle = S.shade(P.dark, -0.45); ctx.fillRect(-20, Y, this.ox + 20, ts + 1); ctx.fillRect(this.sx(W), Y, this.w, ts + 1);
      for (let x = this.xa; x <= this.xb; x++) this.drawTile(w, x, y, this.sx(x), Y, ts);
    }
    // side wall edge lines
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.ox - 3, Math.max(surfY, -20), 3, this.h + 40); ctx.fillRect(this.sx(W), Math.max(surfY, -20), 3, this.h + 40);
    if (surfY > -ts * 4) { // surface: grass on the side walls; camp scene or small props
      ctx.fillStyle = '#4fbf4a'; ctx.fillRect(-20, surfY, this.ox + 20, ts * 0.2); ctx.fillRect(this.sx(W), surfY, this.w, ts * 0.2);
      if (this.campView) this.drawCamp(w, surfY);
      else if (this.ox > ts * 1.5) {
        const t = S.prop('tent'), c = S.prop('cart');
        ctx.drawImage(t, Math.round(this.ox - ts * 2.3), Math.round(surfY - ts * 1.6), Math.round(ts * 1.8), Math.round(ts * 1.6));
        ctx.drawImage(c, Math.round(this.sx(W) + ts * 0.4), Math.round(surfY - ts * 0.9), Math.round(ts * 1.6), Math.round(ts * 1.1));
      }
    }
    // creatures
    for (const c of w.creatures) {
      if (c.dead || c.y < y0 || c.y > y1) continue;
      const X = this.sx(c.px), Y = this.sy(c.py);
      const bob = Math.sin(this.t * (c.type.fly ? 12 : 5) + c.x) * ts * (c.type.fly ? 0.1 : 0.04);
      ctx.save(); ctx.translate(X + ts / 2, Y + ts / 2 + bob); ctx.scale(c.face < 0 ? -1 : 1, 1);
      if (c.stun > 0) ctx.globalAlpha = 0.6;
      ctx.drawImage(S.creature(c.type), -ts * 0.45, -ts * 0.45, ts * 0.9, ts * 0.9);
      if (c.hitT > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(S.creature(c.type), -ts * 0.45, -ts * 0.45, ts * 0.9, ts * 0.9); }
      ctx.restore();
      if (c.hp < c.max) { ctx.fillStyle = '#300'; ctx.fillRect(X + ts * 0.15, Y - ts * 0.05, ts * 0.7, 4); ctx.fillStyle = '#ff5050'; ctx.fillRect(X + ts * 0.15, Y - ts * 0.05, ts * 0.7 * Math.max(0, c.hp / c.max), 4); }
      if (c.stun > 0) { const q = Math.round(ts * 0.36); ctx.save(); ctx.translate(X + ts / 2, Y + ts * 0.05); ctx.rotate(this.t * 4); ctx.drawImage(IC('sparkle'), -q / 2, -q / 2, q, q); ctx.restore(); }
    }
    if (!this.campView) { this.drawBuddy(w, w.buddy, ts); this.drawActorMiner(w, w.player, ts); }
    if (this.slash && this.slash.t > 0) {
      this.slash.t -= dt;
      const X = this.sx(this.slash.x) + ts / 2, Y = this.sy(this.slash.y) + ts / 2, p = 1 - this.slash.t / 0.18;
      ctx.strokeStyle = this.slash.who === 'p' ? 'rgba(255,255,255,0.9)' : 'rgba(255,190,120,0.9)'; ctx.lineWidth = Math.max(3, ts * 0.1);
      ctx.beginPath(); ctx.arc(X, Y, ts * 0.45, -2.4 + p * 2, -0.6 + p * 2); ctx.stroke();
    }
    // particles (world space)
    for (const p of this.parts) {
      p.life -= dt; ctx.fillStyle = p.col; const sz = Math.max(2, p.size * ts);
      if (p.screen) { p.sx += p.vx * dt; p.sy += p.vy * dt; ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillRect(p.sx - sz / 2, p.sy - sz / 2, sz, sz); ctx.globalAlpha = 1; continue; }
      p.vy += 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillRect(this.sx(p.x) - sz / 2, this.sy(p.y) - sz / 2, sz, sz);
    }
    this.parts = this.parts.filter((p) => p.life > 0);
    if (this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);

    // darkness with lantern light
    if (surfY < this.h) {
      const d = this.dctx;
      d.setTransform(dpr, 0, 0, dpr, 0, 0);
      d.globalCompositeOperation = 'source-over';
      d.clearRect(-50, -50, this.w + 100, this.h + 100);
      const top = Math.max(-30, surfY + ts * 0.9);
      d.fillStyle = 'rgba(4,2,10,0.97)'; d.fillRect(-30, top, this.w + 60, this.h + 60);
      if (surfY > -ts * 3) { const g = d.createLinearGradient(0, surfY, 0, surfY + ts * 3); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); d.globalCompositeOperation = 'destination-out'; d.fillStyle = g; d.fillRect(-30, top, this.w + 60, ts * 2.2); }
      d.globalCompositeOperation = 'destination-out';
      d.fillStyle = 'rgba(0,0,0,0.32)';
      for (let y = Math.max(0, y0); y <= y1; y++) { const r = w.row(y); for (let x = this.xa; x <= this.xb; x++) if (r.seen[x]) d.fillRect(this.sx(x), this.sy(y), ts, ts); }
      const light = (ax, ay, R) => {
        const cx = this.sx(ax) + ts / 2, cy = this.sy(ay) + ts / 2;
        const g = d.createRadialGradient(cx, cy, 0, cx, cy, R);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.55, 'rgba(0,0,0,0.92)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = g; d.fillRect(cx - R, cy - R, R * 2, R * 2);
      };
      const fl = 1 + Math.sin(this.t * 13) * 0.025 + Math.sin(this.t * 7.3) * 0.02;
      const oilF = w.oil < 3 ? 0.55 + 0.45 * (w.oil / 3) : 1;
      light(w.player.px, w.player.py, (lr + 0.5) * ts * fl * oilF);
      light(w.buddy.px, w.buddy.py, (w.st.buddyLight ? 3 : 1.3) * ts);
      for (const c of w.creatures) if (!c.dead && c.type.name === 'Magma Imp') light(c.px, c.py, ts * 0.9);
      if (this.flash > 0) { d.fillStyle = `rgba(0,0,0,${Math.min(1, this.flash * 2)})`; d.fillRect(-30, -30, this.w + 60, this.h + 60); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(this.dark, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(shx, shy);
      // warm lantern tint
      const cx = this.sx(w.player.px) + ts / 2, cy = this.sy(w.player.py) + ts / 2, R = (lr + 0.5) * ts;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      g.addColorStop(0, 'rgba(255,190,90,0.22)'); g.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = g; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
      // sniffed ore sparkles (beyond the light)
      const sn = w.st.sniff;
      if (sn > 0) {
        const R2 = lr + sn;
        for (let y = Math.max(0, w.player.y - Math.ceil(R2)); y <= w.player.y + R2; y++) {
          const r = w.row(y);
          for (let x = this.xa; x <= this.xb; x++) {
            if (r.t[x] !== T.ORE && r.t[x] !== T.CHEST) continue;
            const dd = Math.hypot(x - w.player.x, y - w.player.y);
            if (dd <= lr || dd > R2) continue;
            const col = r.t[x] === T.CHEST ? '#ffcc33' : D.ore(r.ore[x]).color;
            const tw = 0.5 + 0.5 * Math.sin(this.t * 5 + x * 3 + y);
            ctx.globalAlpha = 0.35 + 0.5 * tw; ctx.fillStyle = col;
            const X = this.sx(x) + ts / 2, Y = this.sy(y) + ts / 2, q = ts * 0.12;
            ctx.fillRect(X - q / 2, Y - q * 2, q, q * 4); ctx.fillRect(X - q * 2, Y - q / 2, q * 4, q);
            ctx.globalAlpha = 1;
          }
        }
      }
    }
    if (this.findFx) { // Pip sniffed treasure: golden sparkle on that tile
      const f = this.findFx, X = this.sx(f.x) + ts / 2, Y = this.sy(f.y) + ts / 2, q = ts * (0.25 + 0.12 * Math.sin(this.t * 8));
      ctx.save(); ctx.translate(X, Y); ctx.rotate(this.t * 2); ctx.globalAlpha = 0.85; ctx.drawImage(IC('sparkle'), -q, -q, q * 2, q * 2); ctx.restore(); ctx.globalAlpha = 1;
    }
    if (!this.campView) this.drawEmote(w, ts);
    this.drawArrow(ts);
    if (this.hurtFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${this.hurtFlash * 0.4})`; ctx.fillRect(-20, -20, this.w + 40, this.h + 40); }
    if (w.oil < w.st.oilMax * 0.2 && !w.ended) { ctx.fillStyle = `rgba(80,0,0,${0.12 + 0.1 * Math.sin(this.t * 6)})`; ctx.fillRect(-20, -20, this.w + 40, this.h + 40); }
    // popups
    for (const p of this.pops) {
      p.life -= dt; p.y -= dt * 1.2;
      const fs = Math.max(14, Math.round(ts * (p.big ? 0.5 : 0.4)));
      ctx.font = `700 ${fs}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.min(1, p.life * 2);
      const icw = p.icon ? fs * 1.15 : 0, X = this.sx(p.x) + icw / 2, Y = this.sy(p.y);
      ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.strokeText(p.text, X, Y);
      ctx.fillStyle = p.col; ctx.fillText(p.text, X, Y);
      if (p.icon) { const tw = ctx.measureText(p.text).width, q = Math.round(fs * 1.05); ctx.drawImage(IC(p.icon), Math.round(X - tw / 2 - q - 3), Math.round(Y - q / 2), q, q); }
      ctx.globalAlpha = 1;
    }
    this.pops = this.pops.filter((p) => p.life > 0);
    if (!this.campView) this.drawBubble(w, ts);
  }
}
root.DBRenderer = Renderer;
})(self);
