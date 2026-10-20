/* Deep Buddies - procedural pixel art (sprites + tile textures). */
(function (root) {
'use strict';
const D = root.DBData;
const TS = 16; // texture pixel size

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function fromRows(rows, pal) {
  const h = rows.length, w = rows[0].length, c = canvas(w, h), x = c.getContext('2d');
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const ch = rows[j][i]; if (ch === '.' || !pal[ch]) continue;
    x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1);
  }
  return c;
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const MINER = [
  '....HHHH....',
  '...HHHHHHL..',
  '...hhhhhh...',
  '...SSSSSS...',
  '...SSESSE...',
  '...SSSSSS...',
  '....SrrS....',
  '..BBBBBBBB..',
  '.SBBbBBbBBS.',
  '.SBBBBBBBBS.',
  '...PPPPPP...',
  '...PP..PP...',
  '..KKK..KKK..'
];
const MINER_PAL = { H: '#ffcc33', h: '#d99a1e', L: '#fff7c0', S: '#ffd2a6', E: '#2a1a10', r: '#e0806a', B: '#3d7be0', b: '#2a5cb0', P: '#6b4a2b', K: '#3a2a1e' };

const MOLE = [
  '............',
  '...BBBBBB...',
  '..BBBBBBBB..',
  '.BBWEBBWEBB.',
  '.BBEEBBEEBB.',
  '.BBBBNNBBBB.',
  '.BBBCCCCBBB.',
  '..BCCCCCCB..',
  '..BCCCCCCB..',
  '..BBCCCCBB..',
  '.PPBBBBBBPP.',
  '............'
];
const SPR = {
  bat: ['............', '.W........W.', '.WW..MM..WW.', '.WWWMMMMWWW.', '..WWMEEMWW..', '...WMMMMW...', '....MTTM....', '.....MM.....', '............', '............', '............', '............'],
  slime: ['............', '............', '............', '.....MM.....', '....MMMM....', '...MLMMMM...', '..MLMEMMEM..', '..MMMMMMMM..', '.MMMMTTMMMM.', '.MMMMMMMMMM.', '..DDDDDDDD..', '............'],
  beetle: ['............', '...A....A...', '....A..A....', '...MMMMMM...', '..MEMMMMEM..', '.LMMMMMMMML.', '.MMMMDMMMMM.', '.MMMMDMMMMM.', '.MMMMDMMMMM.', '..MMMDMMMM..', '.L.L....L.L.', '............'],
  spider: ['............', 'L..........L', '.L..MMMM..L.', '..LMMMMMML..', 'LLMEMMMMEMLL', '..MMMMMMMM..', 'LLMMMMMMMMLL', '..LMMMMMML..', '.L..MMMM..L.', 'L..........L', '............', '............'],
  imp: ['............', '..A......A..', '..AA.MM.AA..', '...MMMMMM...', '..MMEMMEMM..', '..MMMMMMMM..', '...MTTTTM...', '..LMMMMMML..', '.L.MMMMMM.L.', '...MM..MM...', '...DD..DD...', '............'],
  golem: ['............', '...MMMMMM...', '..MMMMMMMM..', '..MEEMMEEM..', '..MMMMMMMM..', '.LMMDDDDMML.', 'LLMMMMMMMMLL', 'LLMMMMMMMMLL', '..MMMMMMMM..', '..MMM..MMM..', '..DDD..DDD..', '............']
};
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
const BASE_CRE = { bat: '#7a5aa0', slime: '#6ac46a', beetle: '#8a6a3a', spider: '#5a4a8a', imp: '#e0562a', golem: '#8a8a94' };

const cache = {};
function creature(type) {
  const key = 'c:' + type.name;
  if (cache[key]) return cache[key];
  const m = type.tint || BASE_CRE[type.sprite];
  const pal = { M: m, L: shade(m, 0.35), D: shade(m, -0.35), E: '#ffffff', W: shade(m, -0.2), T: '#ffffff', A: shade(m, -0.45) };
  const spr = SPR[type.sprite].map((r) => r);
  const c = fromRows(spr, pal);
  // pupils
  const x = c.getContext('2d'); x.fillStyle = '#111';
  spr.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'E' && i % 2 === 0) x.fillRect(i, j, 1, 1); });
  return (cache[key] = c);
}
function miner(armorTier) {
  const key = 'm:' + armorTier;
  if (cache[key]) return cache[key];
  const shirts = ['#3d7be0', '#9a6a3a', '#9aa0aa', '#c8ccd4', '#8ff0ff', '#3aa060', '#fff27a'];
  const pal = Object.assign({}, MINER_PAL, { B: shirts[Math.min(armorTier, shirts.length - 1)], b: shade(shirts[Math.min(armorTier, shirts.length - 1)], -0.3) });
  return (cache[key] = fromRows(MINER, pal));
}
function mole(evo) {
  const key = 'b:' + evo;
  if (cache[key]) return cache[key];
  const f = D.BUDDY_FORMS[evo];
  const c = fromRows(MOLE, { B: f.body, C: f.belly, W: '#ffffff', E: '#1a1010', N: '#ff8fb0', P: '#ffb0c8' });
  const x = c.getContext('2d');
  if (f.extra === 'drill') { x.fillStyle = '#c0c8d0'; x.fillRect(5, 0, 2, 1); x.fillRect(4, 1, 4, 1); x.fillStyle = '#ffcc33'; x.fillRect(3, 2, 6, 1); }
  if (f.extra === 'crystal') { x.fillStyle = '#8ff0ff'; x.fillRect(3, 0, 1, 2); x.fillRect(6, 0, 1, 2); x.fillRect(8, 0, 1, 2); x.fillStyle = '#ffffff'; x.fillRect(6, 0, 1, 1); }
  if (f.extra === 'flame') { x.fillStyle = '#ff9a3c'; x.fillRect(4, 0, 1, 2); x.fillRect(6, 0, 2, 2); x.fillStyle = '#ffe066'; x.fillRect(6, 1, 1, 1); }
  if (f.extra === 'star') { x.fillStyle = '#fff27a'; x.fillRect(5, 0, 2, 1); x.fillRect(4, 1, 4, 1); x.fillRect(5, 2, 2, 1); }
  return (cache[key] = c);
}

/* ---- tile textures ---- */
function rockTex(s, v, kind) {
  const key = 'r:' + s + ':' + v + ':' + kind;
  if (cache[key]) return cache[key];
  const P = D.stratum(s), c = canvas(TS, TS), x = c.getContext('2d'), r = rng(s * 97 + v * 13 + (kind === 'boulder' ? 5000 : 0));
  const base = kind === 'boulder' ? shade(P.base, -0.25) : P.base;
  x.fillStyle = base; x.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 70; i++) {
    const q = r(); x.fillStyle = q < 0.45 ? shade(base, -0.18) : q < 0.85 ? shade(base, 0.12) : P.speck;
    const w = q < 0.85 ? 2 : 1; x.fillRect(Math.floor(r() * TS), Math.floor(r() * TS), w, 1);
  }
  if (kind === 'boulder') {
    x.fillStyle = shade(base, 0.25); x.fillRect(3, 3, 9, 2); x.fillRect(2, 5, 2, 6);
    x.fillStyle = shade(base, -0.4); x.fillRect(4, 13, 9, 1); x.fillRect(13, 5, 1, 8);
    x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, TS, 1); x.fillRect(0, 0, 1, TS);
  }
  // bevel: light top/left, dark bottom/right -> chunky blocks
  x.fillStyle = 'rgba(255,255,255,0.16)'; x.fillRect(0, 0, TS, 1); x.fillRect(0, 0, 1, TS);
  x.fillStyle = 'rgba(0,0,0,0.30)'; x.fillRect(0, TS - 1, TS, 1); x.fillRect(TS - 1, 0, 1, TS);
  if (kind === 'gas') {
    for (let i = 0; i < 6; i++) { x.fillStyle = i % 2 ? '#9cff6a' : '#5fd03a'; const bx = 2 + Math.floor(r() * 11), by = 2 + Math.floor(r() * 11); x.fillRect(bx, by, 2, 2); }
    x.fillStyle = 'rgba(120,255,80,0.18)'; x.fillRect(1, 1, TS - 2, TS - 2);
  }
  return (cache[key] = c);
}
function wallTex(s, v) {
  const key = 'w:' + s + ':' + v;
  if (cache[key]) return cache[key];
  const P = D.stratum(s), c = canvas(TS, TS), x = c.getContext('2d'), r = rng(s * 31 + v * 7 + 999);
  const b = shade(P.base, -0.62);
  x.fillStyle = b; x.fillRect(0, 0, TS, TS);
  for (let i = 0; i < 30; i++) { x.fillStyle = r() < 0.5 ? shade(b, -0.25) : shade(b, 0.15); x.fillRect(Math.floor(r() * TS), Math.floor(r() * TS), 2, 1); }
  return (cache[key] = c);
}
function oreTex(tier, v) {
  const key = 'o:' + tier + ':' + v;
  if (cache[key]) return cache[key];
  const O = D.ore(tier), c = canvas(TS, TS), x = c.getContext('2d'), r = rng(tier * 11 + v * 3 + 77);
  const n = 4 + (tier % 3);
  for (let i = 0; i < n; i++) {
    const cx = 2 + Math.floor(r() * 11), cy = 2 + Math.floor(r() * 11);
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(cx - 1, cy - 1, 5, 4);
    x.fillStyle = shade(O.color, -0.35); x.fillRect(cx, cy + 1, 3, 2);
    x.fillStyle = O.color; x.fillRect(cx, cy, 3, 2);
    x.fillStyle = O.hi; x.fillRect(cx, cy, 1, 1);
  }
  if (tier >= 4) { x.fillStyle = O.hi; x.fillRect(7, 7, 2, 2); x.fillStyle = O.color; x.fillRect(6, 8, 4, 1); x.fillRect(8, 6, 1, 4); }
  return (cache[key] = c);
}
const FLASK = ['......', '..CC..', '..GG..', '.GOOG.', 'GOOOOG', 'GOOOOG', 'GOOOOG', '.GGGG.'];
const CHEST = ['..........', '.WWWWWWWW.', 'WwwwwwwwwW', 'WYYYYYYYYW', 'WwwwGGwwwW', 'WwwwGGwwwW', 'WwwwwwwwwW', 'WWWWWWWWWW'];
function itemTex(kind) {
  const key = 'i:' + kind;
  if (cache[key]) return cache[key];
  const c = kind === 'flask' ? fromRows(FLASK, { C: '#8a5a32', G: '#cfe8ff', O: '#ffb030' }) : fromRows(CHEST, { W: '#5a3418', w: '#a8682c', Y: '#ffcc33', G: '#fff2a0' });
  return (cache[key] = c);
}

/* ---- v4 hand-authored characters & props (fill grids; outline added automatically) ---- */
const OUTLINE = '#1e1008';
function outlined(rows, pal, out) {
  const h = rows.length, w = rows[0].length, c = canvas(w + 2, h + 2), x = c.getContext('2d');
  const on = (i, j) => j >= 0 && j < h && i >= 0 && i < w && rows[j][i] !== '.';
  x.fillStyle = out || OUTLINE;
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
    if (on(i, j)) continue;
    if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1) || on(i - 1, j - 1) || on(i + 1, j - 1) || on(i - 1, j + 1) || on(i + 1, j + 1)) x.fillRect(i + 1, j + 1, 1, 1);
  }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = rows[j][i]; if (ch !== '.' && pal[ch]) { x.fillStyle = pal[ch]; x.fillRect(i + 1, j + 1, 1, 1); } }
  return c;
}
// miner, facing right; 14x14 fill -> 16x16 sprite. Frame 1 = stride.
const HERO = [
  '....hHHHHh....',
  '...hHHHHHHHL..',
  '..hhhhhhhhhhh.',
  '...SSSSSSSS...',
  '...SSSSSESS...',
  '...SSSSSSRS...',
  '....sSSSSS....',
  '..bBBBBBBBBb..',
  '.SbBBYBBBBBbS.',
  '.SbBBYBBBBBbS.',
  '...yyyyoyyy...',
  '...PPPPPPPP...',
  '...PPP..PPP...',
  '..KKKK..KKKK..'
];
const HERO_LEGS1 = ['...PPPPPPPP...', '..PPP....PPP..', '.KKKK....KKKK.'];
const HERO_PAL = { H: '#ffcc33', h: '#d99a1e', L: '#fffbd0', S: '#ffd2a6', s: '#e8b080', E: '#2a1a10', R: '#f09080', B: '#3d7be0', b: '#2a5cb0', Y: '#c08a4c', y: '#7a4a22', o: '#ffcc33', P: '#6b4a2b', K: '#3a2a1e' };
function hero(armorTier, frame) {
  const key = 'H:' + armorTier + ':' + (frame || 0);
  if (cache[key]) return cache[key];
  const shirts = ['#3d7be0', '#9a6a3a', '#9aa0aa', '#c8ccd4', '#8ff0ff', '#3aa060', '#fff27a'];
  const sh = shirts[Math.min(armorTier, shirts.length - 1)];
  const rows = frame ? HERO.slice(0, 11).concat(HERO_LEGS1) : HERO;
  return (cache[key] = outlined(rows, Object.assign({}, HERO_PAL, { B: sh, b: shade(sh, -0.3) })));
}
// Pip, front-facing; 14x13 fill -> 16x15. Frames: 0 normal, 1 blink, 2 happy (^^)
const PIP = [
  '...BB....BB...',
  '..BBBBBBBBBB..',
  '.BBBBBBBBBBBB.',
  '.BBWEBBBBWEBB.',
  '.BBEEBBBBEEBB.',
  'BBRBBNNNNBBRBB',
  'BBBBBBNNBBBBBB',
  '.BBBCCCCCCBBB.',
  '.BBCCCCCCCCBB.',
  '.BBCCCCCCCCBB.',
  '..BBCCCCCCBB..',
  '.PPPBBBBBBPPP.',
  '..PP......PP..'
];
function pip(evo, frame) {
  const key = 'P:' + evo + ':' + (frame || 0);
  if (cache[key]) return cache[key];
  const f = D.BUDDY_FORMS[evo];
  let rows = PIP.slice();
  if (frame === 1) { rows[3] = '.BBBBBBBBBBBB.'; rows[4] = '.BBEEBBBBEEBB.'; }
  if (frame === 2) { rows[3] = '.BBBEBBBBEBBB.'; rows[4] = '.BBEBEBBEBEBB.'; }
  const c = outlined(rows, { B: f.body, C: f.belly, W: '#ffffff', E: '#1a1010', N: '#ff8fb0', R: '#ff9ab8', P: '#ffb0c8' });
  const x = c.getContext('2d');
  if (f.extra === 'drill') { x.fillStyle = '#c0c8d0'; x.fillRect(7, 0, 2, 1); x.fillRect(6, 1, 4, 1); x.fillStyle = '#ffcc33'; x.fillRect(5, 2, 6, 1); }
  if (f.extra === 'crystal') { x.fillStyle = '#8ff0ff'; x.fillRect(4, 0, 1, 2); x.fillRect(7, 0, 2, 2); x.fillRect(11, 0, 1, 2); x.fillStyle = '#ffffff'; x.fillRect(7, 0, 1, 1); }
  if (f.extra === 'flame') { x.fillStyle = '#ff9a3c'; x.fillRect(5, 0, 1, 2); x.fillRect(7, 0, 2, 2); x.fillRect(10, 0, 1, 2); x.fillStyle = '#ffe066'; x.fillRect(7, 1, 1, 1); }
  if (f.extra === 'star') { x.fillStyle = '#fff27a'; x.fillRect(7, 0, 2, 1); x.fillRect(6, 1, 4, 1); x.fillRect(7, 2, 2, 1); }
  return (cache[key] = c);
}
// pickaxe: handle from bottom-left (grip at 1,10), head across the top-right. 12x12 fill -> 14x14.
const PICK = [
  '.....GGGGh..',
  '...GGgggghh.',
  '..Gg..bB.hh.',
  '.Gg..bB...h.',
  '.g..bB......',
  '...bB.......',
  '..bB........',
  '.bB.........',
  'bB..........',
  'd...........',
  '............',
  '............'
];
function pickaxe(tier) {
  const key = 'X:' + tier;
  if (cache[key]) return cache[key];
  const m = pickColor(tier);
  return (cache[key] = outlined(PICK, { G: shade(m, 0.45), g: m, h: shade(m, -0.4), b: '#7a4a22', B: '#b07a40', d: '#4a2a12' }));
}
const PROPS = {
  tent: { r: [
    '.......rr.......',
    '.......rrr......',
    '.......b........',
    '......aAa.......',
    '.....aAAaa......',
    '....aAAaaaa.....',
    '....aAAadaaa....',
    '...aAAaddaaaa...',
    '..aAAaaddaaaaa..',
    '..aAAaadddaaaa..',
    '.aAAaaadddaaaaa.',
    'aAAaaaaddddaaaaa',
    'zzzzzzzzzzzzzzzz'], pal: { r: '#ff5a5a', b: '#6a4020', a: '#e08a3a', A: '#ffc070', d: '#3a1a08', z: '#8a4a1a' } },
  cart: { r: [
    '...yY.ay.Yy...',
    '..yaYyyaYyay..',
    'hhhhhhhhhhhhhh',
    '.hGggggggggGh.',
    '.hgggggggggggh',
    '..hhhhhhhhhhh.',
    '..dd......dd..',
    '.dDDd....dDDd.',
    '..dd......dd..'], pal: { y: '#ffcc33', Y: '#fff3a0', a: '#ff9a3c', h: '#4a4e58', G: '#c8ccd4', g: '#8a90a0', d: '#2a2a30', D: '#6a6e78' } },
  sign: { r: [
    'bBBBBBBBBBBBBBBBBBb',
    'bBwwwwwwwwwwwwwwwBb',
    'bBwwwwwwwwwwwwwwwBb',
    'bBwwwwwwwwwwwwwwwBb',
    'bddddddddddddddddbd',
    '........dd.........',
    '........dd.........',
    '........dd.........'], pal: { b: '#8a5a32', B: '#c08a4c', w: '#a8743c', d: '#5a3418' } },
  log: { r: ['.bbbbbbbbbbbb.', 'bBBBBBBBBBBBBw', 'bbbbbbbbbbbbbW', '.dddddddddddd.'], pal: { b: '#8a5a32', B: '#b07a40', d: '#5a3418', w: '#e0b080', W: '#c09060' } }
};
function prop(name) {
  const key = 'p:' + name;
  if (cache[key]) return cache[key];
  const p = PROPS[name];
  return (cache[key] = outlined(p.r, p.pal));
}
// campfire: logs + 3 flame frames
function campfire(frame) {
  frame = ((frame % 3) + 3) % 3;
  const key = 'f:' + frame;
  if (cache[key]) return cache[key];
  const flames = [
    ['....a.....', '...aa..a..', '...aYa.aa.', '..aAYYaAa.', '.aAYwYYAa.', '.aAYwwYAa.', '..aAYYAa..'],
    ['.....a....', '..a..aa...', '..aa.aYa..', '..aAaYYAa.', '.aAYYwYAa.', '.aAYwwYAa.', '..aAYYAa..'],
    ['...a......', '...aa..a..', '..aYa.aa..', '.aAYYaAa..', '.aAYwYYAa.', '.aAYwwYAa.', '..aAYYAa..']
  ][frame % 3];
  const rows = flames.concat(['.bBbbbbBb.', 'bBdbbbbdBb']);
  return (cache[key] = outlined(rows, { a: '#ff7a2a', A: '#ffb040', Y: '#ffe066', w: '#fff8d0', b: '#8a5a32', B: '#b07a40', d: '#5a3418' }));
}

function pickColor(tier) { return D.PICK_COL[Math.min(tier, D.PICK_COL.length - 1)]; }

root.DBSprites = { TS, canvas, outlined, hero, pip, pickaxe, prop, campfire, creature, miner, mole, rockTex, wallTex, oreTex, itemTex, shade, pickColor };
})(self);
