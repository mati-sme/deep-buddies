/* Deep Buddies - core logic: stats, economy, world simulation (no DOM; usable from Node). */
(function (root) {
'use strict';
const D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.DBData;
const { W, CHUNK, HP_GROWTH, VAL_GROWTH } = D;

/* ---------- tiles ---------- */
const T = { EMPTY: 0, ROCK: 1, ORE: 2, BOULDER: 3, FLASK: 4, CHEST: 5, GAS: 6, WATER: 7, LAVA: 8, WALL: 9 };
const C_passable = (t) => t === T.EMPTY || t === T.WATER || t === T.LAVA;
const passable = (t) => t === T.EMPTY || t === T.WATER || t === T.LAVA;

/* ---------- helpers ---------- */
function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 0) return '-' + fmt(-n);
  if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : String(Math.floor(n));
  const u = ['K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  let i = -1;
  while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
  return (n < 10 ? n.toFixed(2) : n < 100 ? n.toFixed(1) : Math.floor(n)) + u[i];
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hp0 = (s) => Math.pow(HP_GROWTH, s);
const val0 = (tier) => Math.pow(VAL_GROWTH, tier);
const stratumOf = (y) => Math.max(0, Math.floor(y / CHUNK));

/* ---------- save ---------- */
function newSave() {
  return { v: 1, coins: 0, up: {}, relics: 0, pr: {}, bestDepth: 0, bestEver: 0, runs: 0, caveIns: 0,
    coinsShaft: 0, coinsTotal: 0, relicsTotal: 0, muted: false, autoBuy: false, playTime: 0, seed: 1, seenIntro: false };
}
function fixSave(s) {
  const n = newSave();
  if (!s || typeof s !== 'object') return n;
  for (const k in n) if (s[k] === undefined) s[k] = n[k];
  return s;
}
const lvl = (save, id) => save.up[id] || 0;
const plvl = (save, id) => save.pr[id] || 0;
const UP = {}; D.UPGRADES.forEach((u) => { UP[u.id] = u; });
const PR = {}; D.PRESTIGE.forEach((u) => { PR[u.id] = u; });
const cost = (u, l) => Math.ceil(u.cost * Math.pow(u.g, l));

function upState(save, id) {
  const u = UP[id], l = lvl(save, id);
  if (u.parent && lvl(save, u.parent) < 1) return 'locked';
  if (l >= u.max) return 'maxed';
  return save.coins >= cost(u, l) ? 'affordable' : 'available';
}
function buyUp(save, id) {
  const u = UP[id], st = upState(save, id);
  if (st !== 'affordable') return false;
  save.coins -= cost(u, lvl(save, id));
  save.up[id] = lvl(save, id) + 1;
  return true;
}
function prState(save, id) {
  const u = PR[id], l = plvl(save, id);
  if (u.parent && plvl(save, u.parent) < 1) return 'locked';
  if (l >= u.max) return 'maxed';
  return save.relics >= cost(u, l) ? 'affordable' : 'available';
}
function buyPr(save, id) {
  const u = PR[id];
  if (prState(save, id) !== 'affordable') return false;
  save.relics -= cost(u, plvl(save, id));
  save.pr[id] = plvl(save, id) + 1;
  return true;
}
function autoBuy(save) { // cheapest-first, used by Foreman Notes and the sim
  let n = 0;
  for (;;) {
    let best = null, bc = Infinity;
    for (const u of D.UPGRADES) {
      if (upState(save, u.id) !== 'affordable') continue;
      const c = cost(u, lvl(save, u.id));
      if (c < bc) { bc = c; best = u.id; }
    }
    if (!best) return n;
    buyUp(save, best); n++;
  }
}
function autoBuyPr(save) {
  let n = 0;
  for (;;) {
    let best = null, bc = Infinity;
    for (const u of D.PRESTIGE) {
      if (prState(save, u.id) !== 'affordable') continue;
      const c = cost(u, plvl(save, u.id)) * (u.evo ? 0.5 : 1); // evolutions are favoured
      if (c < bc) { bc = c; best = u.id; }
    }
    if (!best) return n;
    buyPr(save, best); n++;
  }
}
function tierOf(save, prefix) { let t = 0; for (let i = 1; i <= 8; i++) if (lvl(save, prefix + i)) t = i; return t; }
function evoOf(save) { let e = 0; for (const u of D.PRESTIGE) if (u.evo && plvl(save, u.id)) e = Math.max(e, u.evo); return e; }

function stats(save) {
  const L = (id) => lvl(save, id), P = (id) => plvl(save, id);
  const evo = evoOf(save), core = P('p_core');
  const pickTier = tierOf(save, 'pick'), swordTier = tierOf(save, 'sword');
  const s = { evo, pickTier, swordTier, armor: L('armor') };
  s.power = Math.pow(4, pickTier) * Math.pow(1.2, L('sharpen')) * Math.pow(1.3, P('p_power')) * (1 + 0.1 * L('helmet')) * Math.pow(2, core);
  s.swing = 2.2 * Math.pow(1.08, L('swing')) * Math.pow(1.07, L('gloves'));
  s.crit = 0.03 * L('crit');
  s.quake = 0.05 * L('quake');
  s.weapon = Math.pow(5, swordTier) * Math.pow(1.25, L('wtrain')) * Math.pow(2, core);
  s.attack = 1.3 * Math.pow(1.1, L('wspeed')) * Math.pow(1.07, L('gloves'));
  s.bounty = 1 + 0.4 * L('bounty');
  s.oilMax = 10 + 2 * L('tank') + 4 * L('reserve') + 3 * P('p_oil') + 5 * core;
  s.burn = Math.pow(0.96, L('econ')) * Math.pow(0.95, P('p_time'));
  s.light = (2.6 + 0.5 * L('wick')) * (1 + 0.03 * L('helmet'));
  s.flask = 2 + 0.5 * L('oilfind');
  s.flaskChance = 0.012 * (1 + 0.25 * L('oilfind'));
  s.flare = L('flare') > 0; s.flareCd = 25 * Math.pow(0.85, L('flarepow')); s.flareDmg = L('flarepow') * 2;
  s.move = Math.min(16, 3.5 * Math.pow(1.08, L('boots')) * Math.pow(1.06, P('p_speed')));
  s.dmgTaken = Math.pow(0.78, L('armor'));
  s.gasMult = 1 - 0.3 * L('mask');
  s.heat = L('heat');
  s.capacity = Math.floor(10 * Math.pow(1.28, L('bag'))) + 4 * L('bbag');
  s.buddyRate = 0.7 * Math.pow(1.12, L('bdig')) * Math.pow(3, evo) * Math.pow(1.35, P('p_bond'));
  s.buddyRatio = 0.35 + 0.12 * L('bpow');
  s.sniff = L('sniff') + (evo >= 2 ? 4 : 0);
  s.gemhunt = L('gemhunt') > 0;
  s.bfight = (0.35 * L('bfight') + (evo >= 3 ? 1 : 0)) * Math.pow(1.35, P('p_bond'));
  s.dyn = L('dyn') > 0; s.dynCd = 30 * Math.pow(0.85, L('dynpow')); s.dynR = 1 + Math.floor((L('dynpow') + 1) / 3); s.dynMult = 3 * (1 + 0.25 * L('dynpow'));
  s.btunnel = L('btunnel') > 0;
  s.drill = evo >= 1;
  s.valueMult = Math.pow(1.12, L('appraise')) * (1 + 0.15 * P('p_value')) * (1 + 0.08 * L('merchant')) * (evo >= 4 ? 2 : 1);
  s.depthMult = 1 + 0.5 * L('depthpay');
  s.oreChance = 0.11 * (1 + 0.08 * L('veins'));
  s.chestChance = 0.003 * (1 + 0.6 * L('chests')) * Math.pow(1.5, P('p_luck'));
  s.gemBoost = (1 + 0.25 * L('gems')) * (evo >= 2 ? 1.5 : 1) * Math.pow(1.5, P('p_luck'));
  s.relicMult = 1 + 0.2 * P('p_relic');
  s.elevator = 0.2 * P('p_elev');
  s.buddyLight = evo >= 4;
  s.lavaSafe = evo >= 3;
  return s;
}

/* ---------- prestige ---------- */
function relicsFor(save) {
  if (save.bestDepth < D.CAVEIN_DEPTH) return 0;
  return Math.floor(Math.pow((save.bestDepth - D.CAVEIN_DEPTH + 2 * D.CHUNK) / D.CHUNK, 3) * stats(save).relicMult);
}
function caveIn(save) {
  const gain = relicsFor(save);
  if (gain < 1) return 0;
  save.relics += gain; save.relicsTotal += gain; save.caveIns++;
  const keep = plvl(save, 'p_keep'), old = save.up;
  save.up = {};
  if (keep >= 1) for (let i = 1; i <= 8; i++) if (old['pick' + i]) { save.up['pick' + i] = 1; save.up.sharpen = Math.max(save.up.sharpen || 0, 1); }
  if (keep >= 2) for (let i = 1; i <= 8; i++) if (old['sword' + i]) save.up['sword' + i] = 1;
  if (keep >= 3) { if (old.armor) { save.up.armor = old.armor; save.up.boots = Math.max(1, save.up.boots || 0); } }
  const ps = plvl(save, 'p_start');
  save.coins = ps ? Math.pow(10, ps + 1) : 0;
  save.bestDepth = 0; save.coinsShaft = 0;
  return gain;
}

/* ---------- world ---------- */
const BUDDY_LINES = {
  start: ['Let\'s dig!', 'Adventure time!', 'Ready, partner?', 'I smell treasure!', 'Down we go!'],
  ore: ['Shiny!', 'Ooh, ore!', 'Got it!', 'Yoink!', 'Pretty!'],
  gem: ['A GEM!!', 'Ooooh sparkly!', 'Treasure!!', 'Wow wow wow!'],
  chest: ['A treasure chest!', 'We\'re rich!'],
  hurt: ['You okay?!', 'Ouchie!', 'Hey! Leave my friend alone!'],
  creature: ['Watch out!', 'Something\'s there!', 'Eek, a monster!'],
  kill: ['Bonk!', 'Take that!', 'We did it!'],
  lowoil: ['Lamp is getting dim...', 'Hurry hurry!', 'Almost out of oil!'],
  record: ['New record!', 'Deepest ever!', 'We\'ve never been here!'],
  stratum: ['New layer!', 'Look how deep we are!', 'Different rocks!'],
  bagfull: ['My pockets are full!', 'Bag is full!'],
  flask: ['Oil! Yay!', 'More light!'],
  boom: ['KABOOM!', 'Whoa!', 'Pfew, stinky gas!'],
  idle: ['I\'ll check over here!', 'Exploring!', 'Dig dig dig...', 'Hmm hmm hmm...', 'I love rocks.', 'What\'s down there?', '*sniff sniff*', 'Best day ever!']
};

class World {
  constructor(save, seed) {
    this.save = save;
    this.st = stats(save);
    this.seed = seed >>> 0;
    this.rows = new Map(); this.chunks = new Set();
    this.creatures = [];
    this.ev = [];
    this.time = 0;
    this.oil = this.st.oilMax;
    this.bagN = 0; this.bagV = 0; this.bounty = 0; this.chestV = 0; this.oreTiers = {};
    this.kills = 0; this.blocks = 0;
    this.ended = false;
    this.lowWarned = false; this.recordSaid = save.bestDepth <= 0;
    this.lastStratum = 0;
    this.flareT = 0; this.flareCd = 0; this.dynCd = 0;
    this.sayCd = 2;
    let sy = -1;
    if (this.st.elevator > 0) sy = Math.floor(save.bestDepth * this.st.elevator) - 1;
    const cx = Math.floor(W / 2);
    this.startY = sy;
    this.player = this.mkActor(cx, sy);
    this.buddy = this.mkActor(cx - 1, sy);
    this.buddy.drillCd = 8; this.buddy.gemCd = 1; this.buddy.idleT = 0; this.buddy.restT = 0.5;
    if (sy >= 0) { this.setT(cx, sy, T.EMPTY); this.setT(cx - 1, sy, T.EMPTY); }
    this.depthMax = Math.max(0, sy + 1);
    this.lastStratum = stratumOf(Math.max(0, sy));
    this.say(this.pick('start'));
  }
  mkActor(x, y) { return { x, y, px: x, py: y, face: 1, moveCd: 0, swingCd: 0, atkCd: 0, goal: null, goalT: 0, dig: null, digT: 0, hurtT: 0 }; }
  pick(k) { const a = BUDDY_LINES[k]; return a[Math.floor(Math.random() * a.length)]; }
  say(text, force) { if (force || this.sayCd <= 0) { this.ev.push({ type: 'say', text }); this.sayCd = 2.5; } }

  ensure(y) { const c = stratumOf(y); if (!this.chunks.has(c)) this.gen(c); }
  row(y) { this.ensure(y); return this.rows.get(y); }
  tile(x, y) {
    if (x < 0 || x >= W) return T.WALL;
    if (y < 0) return y < -1 ? T.WALL : T.EMPTY;
    return this.row(y).t[x];
  }
  setT(x, y, t) { const r = this.row(y); r.t[x] = t; }

  gen(c) {
    this.chunks.add(c);
    const st = this.st, rng = mulberry32((this.seed * 2654435761) ^ (c * 40503 + 17));
    const y0 = c * CHUNK, s = c;
    for (let y = y0; y < y0 + CHUNK; y++) {
      const r = { t: new Uint8Array(W), hp: new Float32Array(W), max: new Float32Array(W), ore: new Int8Array(W).fill(-1), seen: new Uint8Array(W) };
      const base = hp0(s) * (1 + 0.012 * (y - y0));
      for (let x = 0; x < W; x++) {
        let t = T.ROCK, h = base;
        const q = rng();
        let acc = st.oreChance;
        if (q < acc) {
          t = T.ORE; h = base * 1.4;
          const g = rng(), p2 = 0.04 * st.gemBoost, p1 = 0.22 * Math.sqrt(st.gemBoost);
          r.ore[x] = s + (g < p2 ? 2 : g < p2 + p1 ? 1 : 0);
        } else if (q < (acc += st.flaskChance)) { t = T.FLASK; }
        else if (q < (acc += st.chestChance) && y > 3) { t = T.CHEST; h = base * 2; }
        else if (s >= 1 && q < (acc += 0.022)) { t = T.GAS; h = base * 0.6; }
        else if (q < (acc += 0.07) && y > 2) { t = T.BOULDER; h = base * 5; }
        r.t[x] = t; r.hp[x] = h; r.max[x] = h;
      }
      if (st.btunnel && y % 10 === 9) {
        for (let x = 0; x < W; x++) if (r.t[x] === T.ROCK || r.t[x] === T.BOULDER) { r.t[x] = T.ORE; r.ore[x] = s + (rng() < 0.2 ? 1 : 0); r.hp[x] = r.max[x] = base * 0.5; }
      }
      this.rows.set(y, r);
    }
    // caves with creatures and pools
    const n = s === 0 ? 2 : 2 + (rng() < 0.6 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const cy = y0 + (s === 0 ? 7 : 2) + Math.floor(rng() * (CHUNK - (s === 0 ? 9 : 4)));
      const cx = Math.floor(rng() * W), rx = 1 + Math.floor(rng() * 2), ry = rng() < 0.5 ? 0 : 1;
      let fill = T.EMPTY;
      const pool = rng();
      if (s >= 1 && pool < 0.25) fill = T.WATER;
      if ((s === 5 || s >= 9) && pool < 0.35) fill = T.LAVA;
      for (let y = cy - ry; y <= cy + ry; y++) for (let x = cx - rx; x <= cx + rx; x++) {
        if (x < 0 || x >= W || y < y0 || y >= y0 + CHUNK) continue;
        const rr = this.rows.get(y); rr.t[x] = (fill !== T.EMPTY && y < cy) ? T.EMPTY : fill; rr.ore[x] = -1;
      }
      if (rng() < (s === 0 ? 0.5 : 0.85)) {
        const ct = D.creatureType(s), hpM = ct.fly ? 0.7 : 1;
        const hp = 3 * Math.pow(6, s) * hpM;
        this.creatures.push({ x: cx, y: cy, px: cx, py: cy, hp, max: hp, s, type: ct, moveCd: rng(), atkCd: 1, awake: false, stun: 0, hitT: 0, dead: false, face: 1 });
      }
    }
  }

  /* --- damage & breaking --- */
  hitBlock(x, y, dmg, who) {
    const t = this.tile(x, y);
    if (passable(t) || t === T.WALL) return false;
    const r = this.row(y);
    r.hp[x] -= dmg;
    this.ev.push({ type: 'chip', x, y, s: stratumOf(y), who });
    if (r.hp[x] <= 0) { this.breakBlock(x, y, who, dmg); return true; }
    return false;
  }
  breakBlock(x, y, who, dmg) {
    const r = this.row(y), t = r.t[x], s = stratumOf(y);
    const big = r.max[x] > dmg * 3.5 || t === T.BOULDER;
    r.t[x] = T.EMPTY; r.hp[x] = 0;
    this.blocks++;
    this.ev.push({ type: 'break', x, y, s, big, t, who });
    if (t === T.ORE) {
      const tier = r.ore[x]; r.ore[x] = -1;
      if (this.bagN < this.st.capacity) {
        this.bagN++; this.bagV += val0(tier); this.oreTiers[tier] = (this.oreTiers[tier] || 0) + 1;
        this.ev.push({ type: 'ore', x, y, tier, gem: tier >= s + 2 });
        if (tier >= s + 2) this.say(this.pick('gem'), true); else if (Math.random() < 0.25) this.say(this.pick('ore'));
      } else { this.ev.push({ type: 'bagfull', x, y }); this.say(this.pick('bagfull')); }
    } else if (t === T.FLASK) {
      this.oil = Math.min(this.st.oilMax, this.oil + this.st.flask); this.ev.push({ type: 'flask', x, y, amt: this.st.flask }); this.say(this.pick('flask'));
    } else if (t === T.CHEST) {
      const v = val0(s) * 12 * this.st.gemBoost; this.chestV += v;
      this.ev.push({ type: 'chest', x, y, v: v * this.st.valueMult }); this.say(this.pick('chest'), true);
    } else if (t === T.GAS) {
      this.explode(x, y, 1, hp0(s) * 1.2, true);
    }
  }
  explode(x, y, R, dmg, gas) {
    this.ev.push({ type: 'boom', x, y, R, gas });
    if (gas) {
      const p = this.player;
      if (Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2) this.hurt(2.5 * Math.pow(1.08, stratumOf(y)) * this.st.gasMult);
      this.say(this.pick('boom'), true);
    }
    for (let yy = y - R; yy <= y + R; yy++) for (let xx = x - R; xx <= x + R; xx++) {
      if ((xx - x) * (xx - x) + (yy - y) * (yy - y) > R * R + R) continue;
      if (yy < 0 || (xx === x && yy === y)) continue;
      const t = this.tile(xx, yy);
      if (t !== T.WALL && !passable(t)) this.hitBlock(xx, yy, dmg, 'boom');
    }
    for (const c of this.creatures) if (!c.dead && Math.abs(c.x - x) <= R && Math.abs(c.y - y) <= R) this.hitCreature(c, gas ? c.max * 0.5 : dmg);
  }
  hurt(sec) {
    const d = sec * this.st.dmgTaken;
    this.oil -= d; this.player.hurtT = 0.4;
    this.ev.push({ type: 'hurt', amt: d });
    this.say(this.pick('hurt'));
  }
  hitCreature(c, dmg) {
    if (c.dead) return;
    c.hp -= dmg; c.hitT = 0.15; c.awake = true;
    this.ev.push({ type: 'slash', x: c.x, y: c.y });
    if (c.hp <= 0) {
      c.dead = true; this.kills++;
      const v = 3 * val0(c.s) * this.st.bounty; this.bounty += v;
      this.ev.push({ type: 'kill', x: c.x, y: c.y, v: v * this.st.valueMult, s: c.s });
      if (Math.random() < 0.5) this.say(this.pick('kill'));
    }
  }
  creatureAt(x, y) { for (const c of this.creatures) if (!c.dead && c.x === x && c.y === y) return c; return null; }

  /* --- movement / digging --- */
  tryDir(a, dx, dy, power, rate, speed, who) {
    const nx = a.x + dx, ny = a.y + dy;
    if (dx) a.face = dx;
    const t = this.tile(nx, ny);
    if (t === T.WALL) return false;
    if (!passable(t)) {
      a.dig = { x: nx, y: ny }; a.digT = 0.25;
      if (a.swingCd <= 0) {
        a.swingCd = 1 / rate;
        let d = power;
        if (who === 'p' && Math.random() < this.st.crit) { d *= 3; this.ev.push({ type: 'crit', x: nx, y: ny }); }
        this.ev.push({ type: 'swing', who });
        this.hitBlock(nx, ny, d, who);
        if (who === 'p' && this.st.quake > 0 && Math.random() < this.st.quake) {
          const bx = nx + dx, by = ny + dy, bt = this.tile(bx, by);
          if (bt !== T.WALL && !passable(bt) && by >= 0) this.hitBlock(bx, by, d, who);
        }
      }
      return true;
    }
    if (this.creatureAt(nx, ny)) return true; // blocked: auto-attack handles it
    if (a.moveCd <= 0) {
      a.x = nx; a.y = ny;
      let slow = 1;
      if (t === T.WATER) slow = this.st.lavaSafe ? 1 : 2 - 0.3 * this.st.heat;
      if (t === T.LAVA) slow = this.st.lavaSafe ? 1 : 1.5;
      a.moveCd = slow / speed;
      if (who === 'p') this.ev.push({ type: 'step', t });
    }
    return true;
  }
  bfsNext(a, gx, gy, maxR) {
    // shortest path through passable tiles to goal (if passable) or any passable tile next to it
    const targets = new Set();
    const key = (x, y) => (y + 2) * W + x;
    if (passable(this.tile(gx, gy))) targets.add(key(gx, gy));
    else for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) if (passable(this.tile(gx + dx, gy + dy))) targets.add(key(gx + dx, gy + dy));
    if (!targets.size) return null;
    if (targets.has(key(a.x, a.y))) return { x: 0, y: 0 };
    const prev = new Map(); const q = [[a.x, a.y]]; prev.set(key(a.x, a.y), null);
    const ymin = Math.min(a.y, gy) - maxR, ymax = Math.max(a.y, gy) + maxR;
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (ny < ymin || ny > ymax || prev.has(k)) continue;
        if (!passable(this.tile(nx, ny))) continue;
        prev.set(k, [x, y]);
        if (targets.has(k)) {
          let cur = [nx, ny], p = prev.get(k);
          while (p && !(p[0] === a.x && p[1] === a.y)) { cur = p; p = prev.get(key(p[0], p[1])); }
          return { x: cur[0] - a.x, y: cur[1] - a.y };
        }
        q.push([nx, ny]);
      }
    }
    return null;
  }
  goTo(a, gx, gy, power, rate, speed, who) {
    const md = Math.abs(gx - a.x) + Math.abs(gy - a.y);
    if (md === 0) return 'here';
    if (md === 1) { this.tryDir(a, gx - a.x, gy - a.y, power, rate, speed, who); return 'adj'; }
    if (a.moveCd > 0 && a.swingCd > 0) return 'wait';
    const st = this.bfsNext(a, gx, gy, 6);
    if (st && (st.x || st.y)) { this.tryDir(a, st.x, st.y, power, rate, speed, who); return 'path'; }
    if (st) { this.tryDir(a, Math.sign(gx - a.x) || 0, Math.sign(gy - a.y), power, rate, speed, who); return 'adj'; }
    const dx = gx - a.x, dy = gy - a.y;
    if (Math.abs(dy) >= Math.abs(dx)) this.tryDir(a, 0, Math.sign(dy), power, rate, speed, who);
    else this.tryDir(a, Math.sign(dx), 0, power, rate, speed, who);
    return 'dig';
  }

  /* --- abilities --- */
  useDynamite() {
    if (!this.st.dyn || this.dynCd > 0 || this.ended) return false;
    this.dynCd = this.st.dynCd;
    const p = this.player;
    this.explode(p.x, p.y + 1, this.st.dynR, this.st.power * this.st.dynMult, false);
    this.say('Fire in the hole!', true);
    return true;
  }
  useFlare() {
    if (!this.st.flare || this.flareCd > 0 || this.ended) return false;
    this.flareCd = this.st.flareCd; this.flareT = 4;
    for (const c of this.creatures) if (!c.dead && Math.abs(c.x - this.player.x) + Math.abs(c.y - this.player.y) <= 9) {
      c.stun = 3; if (this.st.flareDmg) this.hitCreature(c, this.st.weapon * this.st.flareDmg);
    }
    this.ev.push({ type: 'flare' });
    return true;
  }
  commandBuddy(x, y) { this.buddy.goal = { x, y, kind: 'cmd' }; this.buddy.goalT = 12; this.say('On it!', true); }
  nearSeen(x, y, r) {
    for (let yy = Math.max(0, y - r); yy <= y + r; yy++) {
      if (!this.rows.has(yy)) continue;
      const row = this.rows.get(yy);
      for (let xx = Math.max(0, x - r); xx <= Math.min(W - 1, x + r); xx++) if (row.seen[xx] && Math.abs(xx - x) + Math.abs(yy - y) <= r) return true;
    }
    return y < 0;
  }
  buddyLeash() { return Math.max(6, this.lightR() + 4); }
  buddyStep(dt) {
    const st = this.st, p = this.player, b = this.buddy;
    const bp = st.power * st.buddyRatio, bs = st.move * 0.8;
    const md = (a, c) => Math.abs(a.x - c.x) + Math.abs(a.y - c.y);
    const dist = md(b, p);
    b.restT -= dt; b.gemCd -= dt;
    if (dist > 22) { // popped too far away: he tunnels back into the explored mine
      b.x = p.x; b.y = Math.max(-1, p.y - 1); if (this.tile(b.x, b.y) !== T.EMPTY && b.y >= 0) b.y = p.y;
      b.px = b.x; b.py = b.y; b.goal = null; this.say('Pop! Found you!');
      this.ev.push({ type: 'drill', x: b.x, y: b.y });
    }
    // creatures near Pip?
    let foe = null;
    if (st.bfight > 0) {
      let fd = 5;
      for (const c of this.creatures) { if (c.dead || !c.awake) continue; const d = md(c, b); if (d < fd) { fd = d; foe = c; } }
    }
    const pursue = () => {
      b.goalT -= dt;
      const g = b.goal, gt = this.tile(g.x, g.y);
      const r = this.goTo(b, g.x, g.y, bp, st.buddyRate, bs, 'b');
      const reached = r === 'here' || (g.kind !== 'cmd' && C_passable(gt) && md(b, g) <= 1 && r !== 'path');
      if (reached || b.goalT <= 0 || this.tile(g.x, g.y) === T.WALL) {
        if (g.kind === 'cmd' && reached) this.say('Done! Back to exploring!');
        b.goal = null; b.restT = 1.2 + Math.random() * 2;
      }
    };
    if (b.goal && b.goal.kind === 'cmd') pursue();
    else if (foe) {
      b.goal = null;
      if (md(foe, b) > 1) this.goTo(b, foe.x, foe.y, bp, st.buddyRate, bs, 'b');
    } else if (b.goal) pursue();
    else if (b.restT > 0) {
      if (b.swingCd <= 0) { // dig a block next to him
        let best = null, bsc = 0;
        for (const [dx, dy] of [[0, 1], [-1, 0], [1, 0], [0, -1]]) {
          const x = b.x + dx, y = b.y + dy, t = this.tile(x, y);
          if (t === T.WALL || C_passable(t) || y < 0) continue;
          let sc = { 1: 3, 2: st.sniff > 0 ? 12 : 3.5, 3: 0.5, 4: 8, 5: 12, 6: st.gasMult < 0.5 ? 2 : -1 }[t] || 0;
          sc += Math.random() * 2;
          if (!this.nearSeen(x, y, 3)) sc -= 4;
          if (sc > bsc) { bsc = sc; best = { dx, dy }; }
        }
        if (best) this.tryDir(b, best.dx, best.dy, bp, st.buddyRate, bs, 'b'); else b.restT = 0;
      }
    } else {
      // pick something to do: smelled ore first, otherwise a random spot nearby
      const leash = this.buddyLeash(), far = dist > leash;
      let target = null;
      if (st.sniff > 0 && !far) {
        const R = 2 + st.sniff + (st.gemhunt ? 4 : 0);
        let bd = 99;
        for (let y = Math.max(0, b.y - R); y <= b.y + R; y++) for (let x = 0; x < W; x++) {
          const t = this.tile(x, y);
          if (t !== T.ORE && t !== T.CHEST) continue;
          const d = Math.abs(x - b.x) + Math.abs(y - b.y);
          if (d > R || d >= bd || md({ x, y }, p) > leash + 2) continue;
          if (!st.gemhunt && !this.nearSeen(x, y, 2)) continue;
          bd = d; target = { x, y, kind: 'ore' };
        }
        if (target && this.bagN >= st.capacity) target = null;
      }
      if (!target) {
        const cx = far ? p.x : b.x, cy = far ? p.y : b.y;
        for (let i = 0; i < 10 && !target; i++) {
          const x = cx + Math.round((Math.random() * 2 - 1) * 4), y = cy + Math.round((Math.random() * 2 - 1) * 3);
          if (x < 0 || x >= W || y < 0 || (x === b.x && y === b.y)) continue;
          if (md({ x, y }, p) > leash && !far) continue;
          if (!this.nearSeen(x, y, 2)) continue;
          target = { x, y, kind: 'wander' };
        }
      }
      if (target) { b.goal = target; b.goalT = target.kind === 'ore' ? 6 : 4; }
      else b.restT = 1;
    }
    if (st.drill) {
      b.drillCd -= dt;
      if (b.drillCd <= 0) {
        b.drillCd = 8;
        for (let k = 1; k <= 3; k++) { const t = this.tile(b.x, b.y + k); if (t !== T.WALL && !C_passable(t)) this.hitBlock(b.x, b.y + k, bp * 30, 'b'); }
        this.ev.push({ type: 'drill', x: b.x, y: b.y });
      }
    }
    if (st.bfight > 0 && b.atkCd <= 0) {
      for (const c of this.creatures) {
        if (c.dead) continue;
        if (md(c, b) <= 1) { b.atkCd = 1 / st.attack; this.ev.push({ type: 'attack', who: 'b', x: c.x, y: c.y }); this.hitCreature(c, st.weapon * st.bfight); break; }
      }
    }
    b.idleT += dt;
    if (b.idleT > 9) { b.idleT = 0; if (Math.random() < 0.6) this.say(this.pick('idle')); }
  }
  lightR() { return this.st.light + (this.flareT > 0 ? 5 : 0); }

  /* --- main step --- */
  step(dt, input) {
    if (this.ended) return;
    const st = this.st, p = this.player, b = this.buddy;
    this.time += dt;
    this.sayCd -= dt;
    for (const a of [p, b]) { a.moveCd -= dt; a.swingCd -= dt; a.atkCd -= dt; a.digT -= dt; a.hurtT -= dt; if (a.digT <= 0) a.dig = null; }
    this.flareT -= dt; this.flareCd -= dt; this.dynCd -= dt;
    this.oil -= dt * st.burn * (1 + 0.06 * stratumOf(Math.max(0, p.y)));

    // player
    const dir = input && input.dir;
    if (dir && (dir.x || dir.y)) { p.goal = null; this.tryDir(p, dir.x, dir.y, st.power, st.swing, st.move, 'p'); }
    else if (p.goal) {
      p.goalT -= dt;
      const r = this.goTo(p, p.goal.x, p.goal.y, st.power, st.swing, st.move, 'p');
      if (r === 'here' || p.goalT <= 0) p.goal = null;
    }
    if (this.tile(p.x, p.y) === T.LAVA && !st.lavaSafe) this.oil -= dt * 2 * (1 - 0.3 * st.heat) * st.dmgTaken;
    // player auto-attack
    if (p.atkCd <= 0) {
      for (const c of this.creatures) {
        if (c.dead) continue;
        if (Math.abs(c.x - p.x) + Math.abs(c.y - p.y) <= 1) { p.atkCd = 1 / st.attack; this.ev.push({ type: 'attack', who: 'p', x: c.x, y: c.y }); this.hitCreature(c, st.weapon); break; }
      }
    }

    // buddy: Pip wanders the mine on his own (does NOT follow you), digging and fighting near himself
    this.buddyStep(dt);

    // creatures
    const lr = this.lightR();
    for (const c of this.creatures) {
      if (c.dead) continue;
      c.hitT -= dt;
      const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
      if (!c.awake && d <= lr + 1.5 && (passable(this.tile(c.x, c.y)))) {
        // wakes only if the cave is open to the player (cheap check: within light)
        if (d <= lr) { c.awake = true; this.say(this.pick('creature')); this.ev.push({ type: 'wake', x: c.x, y: c.y }); }
      }
      if (c.stun > 0) { c.stun -= dt; continue; }
      if (!c.awake) continue;
      c.moveCd -= dt; c.atkCd -= dt;
      if (d <= 1) {
        if (c.atkCd <= 0) { c.atkCd = 1.4; this.ev.push({ type: 'bite', x: c.x, y: c.y }); this.hurt(1.2 * Math.pow(1.12, c.s)); }
      } else if (c.moveCd <= 0 && d < 12) {
        c.moveCd = c.type.speed;
        let best = null, bd = d;
        for (const [dx, dy] of [[0, 1], [0, -1], [-1, 0], [1, 0]]) {
          const nx = c.x + dx, ny = c.y + dy;
          if (!passable(this.tile(nx, ny)) || this.creatureAt(nx, ny) || (nx === b.x && ny === b.y)) continue;
          const nd = Math.abs(nx - p.x) + Math.abs(ny - p.y);
          if (nd < bd) { bd = nd; best = [nx, ny]; }
        }
        if (best) { c.face = Math.sign(best[0] - c.x) || c.face; c.x = best[0]; c.y = best[1]; }
      }
    }
    if (this.creatures.length > 60) this.creatures = this.creatures.filter((c) => !c.dead || false);

    // depth, records, chatter
    const dep = p.y + 1;
    if (dep > this.depthMax) {
      this.depthMax = dep;
      if (!this.recordSaid && dep > this.save.bestDepth) { this.recordSaid = true; this.say(this.pick('record'), true); this.ev.push({ type: 'record' }); }
      const s = stratumOf(p.y);
      if (s > this.lastStratum) { this.lastStratum = s; this.ev.push({ type: 'stratum', s }); this.say(this.pick('stratum'), true); }
    }
    if (!this.lowWarned && this.oil < st.oilMax * 0.25 && this.time > 3) { this.lowWarned = true; this.say(this.pick('lowoil'), true); this.ev.push({ type: 'lowoil' }); }
    // reveal tiles
    const R = Math.ceil(lr);
    for (let y = Math.max(0, p.y - R); y <= p.y + R; y++) {
      const r = this.row(y);
      for (let x = 0; x < W; x++) if ((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y) <= lr * lr) r.seen[x] = 1;
    }
    this.ensure(p.y + 30);
    if (this.oil <= 0) { this.oil = 0; this.end('oil'); }
  }
  end(reason) {
    if (this.ended) return;
    this.ended = true; this.endReason = reason;
    this.ev.push({ type: 'end', reason });
  }
  result() {
    const st = this.st, vm = st.valueMult;
    const ore = this.bagV * vm;
    const depth = 0.1 * this.depthMax * val0(stratumOf(Math.max(0, this.depthMax - 1))) * st.depthMult * vm;
    const bounty = this.bounty * vm, chests = this.chestV * vm;
    const total = Math.floor(ore + depth + bounty + chests);
    return { ore, oreN: this.bagN, depth, bounty, chests, total, depthMax: this.depthMax, time: this.time, kills: this.kills, blocks: this.blocks, oreTiers: this.oreTiers, record: this.depthMax > this.save.bestDepth };
  }
}

function applyRun(save, res) {
  save.coins += res.total; save.coinsShaft += res.total; save.coinsTotal += res.total;
  save.runs++; save.playTime += res.time;
  save.bestDepth = Math.max(save.bestDepth, res.depthMax);
  save.bestEver = Math.max(save.bestEver, res.depthMax);
}

/* --- simple bot (pacing sim + headless test). Behaves like a decent tapper. --- */
function botThink(w) {
  const p = w.player, st = w.st;
  if (w.dynCd <= 0 && st.dyn) w.useDynamite();
  if (st.flare && w.flareCd <= 0 && w.creatures.some((c) => !c.dead && c.awake && Math.abs(c.x - p.x) + Math.abs(c.y - p.y) < 4)) w.useFlare();
  if (p.goal) {
    const t = w.tile(p.goal.x, p.goal.y);
    if (!(passable(t) && p.goal.y <= p.y) && p.goalT > 0) return;
  }
  let best = null, bs = -1e9;
  const lr = w.lightR();
  for (let y = p.y; y <= p.y + 3; y++) for (let x = Math.max(0, p.x - 3); x <= Math.min(W - 1, p.x + 3); x++) {
    if (y < 0) continue;
    const t = w.tile(x, y);
    if (t !== T.ORE && t !== T.FLASK && t !== T.CHEST) continue;
    if ((x - p.x) ** 2 + (y - p.y) ** 2 > lr * lr) continue;
    if (t === T.ORE && w.bagN >= st.capacity) continue;
    const r = w.row(y), swings = Math.ceil(r.hp[x] / st.power);
    const val = t === T.FLASK ? 50 : t === T.CHEST ? 80 : 20 + 10 * (r.ore[x] - stratumOf(y));
    const sc = val - 6 * (Math.abs(x - p.x) + Math.abs(y - p.y)) - 2 * Math.min(swings, 20) + (y - p.y) * 3;
    if (sc > bs) { bs = sc; best = { x, y }; }
  }
  if (best && bs > 0) { p.goal = best; p.goalT = 4; return; }
  // otherwise go down, avoid boulders/lava
  let gx = p.x;
  const below = w.tile(p.x, p.y + 1);
  if (below === T.BOULDER || below === T.LAVA || below === T.GAS) {
    for (const dx of [1, -1, 2, -2]) { const t = w.tile(p.x + dx, p.y + 1); if (t !== T.WALL && t !== T.BOULDER && t !== T.LAVA && t !== T.GAS) { gx = p.x + dx; break; } }
  }
  p.goal = { x: gx, y: p.y + 1 }; p.goalT = 3;
}

const API = { T, passable, fmt, mulberry32, newSave, fixSave, lvl, plvl, UP, PR, cost, upState, buyUp, prState, buyPr, autoBuy, autoBuyPr, stats, relicsFor, caveIn, World, applyRun, botThink, stratumOf, val0, hp0, evoOf, tierOf };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.DBCore = API;
})(typeof self !== 'undefined' ? self : this);
