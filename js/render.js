/* Deep Buddies - canvas renderer: lantern-lit chunky pixel cave. */
(function (root) {
'use strict';
const D = root.DBData, C = root.DBCore, S = root.DBSprites;
const { T } = C; const W = D.W;

class Renderer {
  constructor(cv) {
    this.cv = cv; this.ctx = cv.getContext('2d');
    this.dark = document.createElement('canvas'); this.dctx = this.dark.getContext('2d');
    this.parts = []; this.pops = []; this.shake = 0; this.camY = null; this.bubble = null; this.t = 0;
    this.pSwing = 0; this.bSwing = 0; this.slash = null; this.flash = 0; this.hurtFlash = 0;
    this.resize();
  }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.cv.clientWidth || 360, h = this.cv.clientHeight || 640;
    this.dpr = dpr; this.w = w; this.h = h;
    this.cv.width = Math.round(w * dpr); this.cv.height = Math.round(h * dpr);
    this.dark.width = this.cv.width; this.dark.height = this.cv.height;
    this.ts = Math.max(24, Math.floor(Math.min(w / (W + 0.4), 64)));
    this.ox = Math.floor((w - this.ts * W) / 2);
  }
  sx(x) { return this.ox + x * this.ts; }
  sy(y) { return (y - this.camY) * this.ts; }
  tileAt(px, py) { return { x: Math.floor((px - this.ox) / this.ts), y: Math.floor(py / this.ts + this.camY) }; }

  /* ---- events -> juice ---- */
  burst(x, y, n, cols, speed, size) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * speed;
      this.parts.push({ x: x + 0.5, y: y + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.6, life: 0.5 + Math.random() * 0.5, col: cols[i % cols.length], size: size * (0.6 + Math.random() * 0.8) });
    }
  }
  pop(x, y, text, col, big) { this.pops.push({ x: x + 0.5, y: y + 0.2, text, col, life: 1.2, big }); }
  event(e, w) {
    const P = e.s !== undefined ? D.stratum(e.s) : null;
    switch (e.type) {
      case 'chip': if (e.who === 'p') this.pSwing = 0.16; else if (e.who === 'b') this.bSwing = 0.16;
        this.burst(e.x, e.y, 3, [P.light, P.speck, P.dark], 3, 0.09); break;
      case 'break': this.burst(e.x, e.y, e.big ? 16 : 8, [P.base, P.light, P.speck, P.dark], e.big ? 6 : 4, e.big ? 0.14 : 0.11); if (e.big) this.shake = Math.max(this.shake, 5); break;
      case 'ore': { const O = D.ore(e.tier); this.burst(e.x, e.y, e.gem ? 18 : 8, [O.color, O.hi, '#ffffff'], 4, 0.1); this.pop(e.x, e.y, e.gem ? '💎 ' + O.name + '!' : '+' + O.name, O.hi, e.gem); break; }
      case 'bagfull': this.pop(e.x, e.y, '🎒 Full!', '#ff8080'); break;
      case 'flask': this.pop(e.x, e.y, '+' + e.amt.toFixed(1) + 's 🏮', '#ffd060', true); this.burst(e.x, e.y, 10, ['#ffb030', '#fff0a0'], 3, 0.1); break;
      case 'chest': this.pop(e.x, e.y, '+' + C.fmt(e.v) + ' 🪙', '#ffe066', true); this.burst(e.x, e.y, 24, ['#ffcc33', '#fff2a0', '#ffffff'], 6, 0.12); this.shake = Math.max(this.shake, 4); break;
      case 'boom': this.burst(e.x, e.y, e.gas ? 26 : 40, e.gas ? ['#9cff6a', '#5fd03a', '#d0ffb0'] : ['#ff9a3c', '#ffe066', '#ff5030', '#444'], e.gas ? 4 : 8, 0.18); this.shake = Math.max(this.shake, e.gas ? 7 : 12); this.flash = e.gas ? 0.15 : 0.3; break;
      case 'hurt': this.hurtFlash = 0.35; this.shake = Math.max(this.shake, 5); this.pop(w.player.x, w.player.y - 0.3, '-' + e.amt.toFixed(1) + 's', '#ff6060'); break;
      case 'slash': this.burst(e.x, e.y, 5, ['#ffffff', '#ffd0d0'], 3, 0.08); break;
      case 'attack': this.slash = { x: e.x, y: e.y, t: 0.18, who: e.who }; break;
      case 'kill': this.burst(e.x, e.y, 18, ['#ffffff', '#ffe066', '#b090ff'], 5, 0.12); this.pop(e.x, e.y, '+' + C.fmt(e.v) + ' 🪙', '#ffe066'); break;
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
    const g = ctx.createLinearGradient(0, 0, 0, yBot);
    g.addColorStop(0, '#3a6fd8'); g.addColorStop(1, '#ffd9a0');
    ctx.fillStyle = g; ctx.fillRect(0, yTop, this.w, yBot - yTop);
    // pixel clouds + hills
    const ts = this.ts;
    ctx.fillStyle = '#fff3b0'; ctx.fillRect(this.w * 0.78, yBot - ts * 5.2, ts * 1.1, ts * 1.1);
    ctx.fillStyle = 'rgba(255,243,176,0.25)'; ctx.fillRect(this.w * 0.78 - ts * 0.3, yBot - ts * 5.5, ts * 1.7, ts * 1.7);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 173 + this.t * 6) % (this.w + 200)) - 100, cy = yBot - ts * (3.2 + (i % 3) * 0.9);
      ctx.fillRect(cx, cy, ts * 1.6, ts * 0.35); ctx.fillRect(cx + ts * 0.3, cy - ts * 0.25, ts * 0.9, ts * 0.3);
    }
    ctx.fillStyle = '#3d8f4a';
    for (let i = -1; i < 8; i++) { const hx = i * this.w / 5; ctx.beginPath(); ctx.ellipse(hx, yBot, this.w / 6, ts * 1.2, 0, Math.PI, 0); ctx.fill(); }
  }
  drawActorMiner(w, a, ts) {
    const ctx = this.ctx, X = this.sx(a.px), Y = this.sy(a.py);
    const bob = Math.abs(Math.sin(this.t * 10)) * (Math.abs(a.x - a.px) + Math.abs(a.y - a.py) > 0.05 ? ts * 0.06 : 0);
    const spr = S.miner(w.st.armor);
    ctx.save();
    ctx.translate(X + ts / 2, Y + ts / 2 - bob);
    if (a.hurtT > 0 && Math.floor(this.t * 20) % 2) ctx.globalAlpha = 0.5;
    ctx.scale(a.face < 0 ? -1 : 1, 1);
    ctx.drawImage(spr, -ts * 0.45, -ts * 0.5, ts * 0.9, ts * 0.98);
    ctx.restore();
    // pickaxe
    let ang = -0.6;
    let dx = a.face, dy = 0;
    if (a.dig) { dx = a.dig.x - a.x; dy = a.dig.y - a.y; }
    const base = Math.atan2(dy, dx);
    const sw = this.pSwing > 0 ? (this.pSwing / 0.16) : 0;
    ang = base - 1.2 + (1 - sw) * 1.4 * (a.dig ? 1 : 0.3);
    if (!a.dig) ang = (a.face > 0 ? -0.9 : Math.PI + 0.9);
    const hx = X + ts / 2 + Math.cos(base) * ts * 0.15, hy = Y + ts * 0.55 + Math.sin(base) * ts * 0.1;
    const L = ts * 0.55;
    const ex = hx + Math.cos(ang) * L, ey = hy + Math.sin(ang) * L;
    ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = Math.max(2, ts * 0.08); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = S.pickColor(w.st.pickTier); ctx.lineWidth = Math.max(3, ts * 0.12);
    const px = Math.cos(ang + Math.PI / 2) * ts * 0.22, py = Math.sin(ang + Math.PI / 2) * ts * 0.22;
    ctx.beginPath(); ctx.moveTo(ex - px, ey - py); ctx.quadraticCurveTo(ex + Math.cos(ang) * ts * 0.08, ey + Math.sin(ang) * ts * 0.08, ex + px, ey + py); ctx.stroke();
  }
  drawBuddy(w, b, ts) {
    const ctx = this.ctx, X = this.sx(b.px), Y = this.sy(b.py);
    const moving = Math.abs(b.x - b.px) + Math.abs(b.y - b.py) > 0.05;
    const bob = moving ? Math.abs(Math.sin(this.t * 12)) * ts * 0.1 : Math.sin(this.t * 3) * ts * 0.03;
    const dig = this.bSwing > 0 ? Math.sin(this.t * 60) * ts * 0.05 : 0;
    ctx.save(); ctx.translate(X + ts / 2 + dig, Y + ts / 2 - bob);
    ctx.scale(b.face < 0 ? -1 : 1, 1);
    if (w.st.evo >= 4) { ctx.fillStyle = 'rgba(255,240,140,0.25)'; ctx.beginPath(); ctx.arc(0, 0, ts * 0.6, 0, 7); ctx.fill(); }
    ctx.drawImage(S.mole(w.st.evo), -ts * 0.42, -ts * 0.38, ts * 0.84, ts * 0.84);
    ctx.restore();
  }
  drawBubble(w, ts) {
    if (!this.bubble || this.bubble.t <= 0) return;
    const ctx = this.ctx, b = w.buddy;
    const X = this.sx(b.px) + ts / 2;
    const rawY = this.sy(b.py) - ts * 0.15, off = rawY < 60 || rawY > this.h - 40;
    const Y = Math.max(110, Math.min(this.h - 60, rawY));
    const text = off ? '🐾 ' + this.bubble.text : this.bubble.text;
    const fs = Math.max(12, Math.round(ts * 0.36));
    ctx.font = `bold ${fs}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width + fs;
    let bx = Math.max(4, Math.min(this.w - tw - 4, X - tw / 2)), by = Y - fs * 1.9;
    const a = Math.min(1, this.bubble.t * 3);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fffaf0'; ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(bx, by, tw, fs * 1.5, fs * 0.5); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X - 5, by + fs * 1.5 - 1); ctx.lineTo(X, by + fs * 1.5 + 7); ctx.lineTo(X + 5, by + fs * 1.5 - 1); ctx.fill();
    ctx.fillStyle = '#3a2a1e'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + tw / 2, by + fs * 0.78);
    ctx.globalAlpha = 1;
  }

  draw(w, dt) {
    this.t += dt;
    const ctx = this.ctx, ts = this.ts, dpr = this.dpr;
    const lr = w.lightR();
    // smooth actors
    const k = Math.min(1, dt * 16);
    for (const a of [w.player, w.buddy]) { a.px += (a.x - a.px) * k; a.py += (a.y - a.py) * k; }
    for (const c of w.creatures) { c.px += (c.x - c.px) * Math.min(1, dt * 10); c.py += (c.y - c.py) * Math.min(1, dt * 10); }
    const viewRows = this.h / ts;
    const target = w.player.py - viewRows * (this.campView ? 0.36 : w.player.y < 2 ? 0.55 : 0.4);
    if (this.camY === null) this.camY = target;
    this.camY += (target - this.camY) * Math.min(1, dt * 5);
    this.pSwing -= dt; this.bSwing -= dt; this.shake *= Math.pow(0.002, dt); this.flash -= dt; this.hurtFlash -= dt;
    if (this.bubble) this.bubble.t -= dt;

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
      for (let x = 0; x < W; x++) this.drawTile(w, x, y, this.sx(x), Y, ts);
    }
    // side wall edge lines
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(this.ox - 3, Math.max(surfY, -20), 3, this.h + 40); ctx.fillRect(this.sx(W), Math.max(surfY, -20), 3, this.h + 40);
    if (surfY > -ts * 2) { // surface props: mine sign + cart
      ctx.font = `${Math.round(ts * 0.8)}px system-ui`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText('⛺', this.sx(-0.2) - ts * 0.3, surfY); ctx.fillText('🛒', this.sx(W) + ts * 0.6, surfY);
      ctx.fillStyle = '#4fbf4a'; ctx.fillRect(-20, surfY, this.ox + 20, ts * 0.2); ctx.fillRect(this.sx(W), surfY, this.w, ts * 0.2);
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
      if (c.stun > 0) { ctx.font = `${Math.round(ts * 0.35)}px system-ui`; ctx.fillText('💫', X + ts / 2, Y + ts * 0.1); }
    }
    this.drawBuddy(w, w.buddy, ts);
    this.drawActorMiner(w, w.player, ts);
    if (this.slash && this.slash.t > 0) {
      this.slash.t -= dt;
      const X = this.sx(this.slash.x) + ts / 2, Y = this.sy(this.slash.y) + ts / 2, p = 1 - this.slash.t / 0.18;
      ctx.strokeStyle = this.slash.who === 'p' ? 'rgba(255,255,255,0.9)' : 'rgba(255,190,120,0.9)'; ctx.lineWidth = Math.max(3, ts * 0.1);
      ctx.beginPath(); ctx.arc(X, Y, ts * 0.45, -2.4 + p * 2, -0.6 + p * 2); ctx.stroke();
    }
    // particles (world space)
    for (const p of this.parts) {
      p.life -= dt; p.vy += 14 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillStyle = p.col; const sz = Math.max(2, p.size * ts);
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
      for (let y = Math.max(0, y0); y <= y1; y++) { const r = w.row(y); for (let x = 0; x < W; x++) if (r.seen[x]) d.fillRect(this.sx(x), this.sy(y), ts, ts); }
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
          for (let x = 0; x < W; x++) {
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
    if (this.hurtFlash > 0) { ctx.fillStyle = `rgba(255,0,0,${this.hurtFlash * 0.4})`; ctx.fillRect(-20, -20, this.w + 40, this.h + 40); }
    if (w.oil < w.st.oilMax * 0.2 && !w.ended) { ctx.fillStyle = `rgba(80,0,0,${0.12 + 0.1 * Math.sin(this.t * 6)})`; ctx.fillRect(-20, -20, this.w + 40, this.h + 40); }
    // popups
    for (const p of this.pops) {
      p.life -= dt; p.y -= dt * 1.2;
      const fs = Math.round(ts * (p.big ? 0.5 : 0.38));
      ctx.font = `900 ${fs}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(p.text, this.sx(p.x), this.sy(p.y));
      ctx.fillStyle = p.col; ctx.fillText(p.text, this.sx(p.x), this.sy(p.y));
      ctx.globalAlpha = 1;
    }
    this.pops = this.pops.filter((p) => p.life > 0);
    this.drawBubble(w, ts);
  }
}
root.DBRenderer = Renderer;
})(self);
