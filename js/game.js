/* Deep Buddies - main game: UI, input, loop, saving. */
(function () {
'use strict';
const D = window.DBData, C = window.DBCore, S = window.DBSprites, A = window.DBAudio, M = window.DBMaps, IC = window.DBIcons;
const VERSION = 'v4';
const KEY = 'deep-buddies-save-v1';
const $ = (id) => document.getElementById(id);
const fmt = C.fmt;
const ic = (n, c) => IC.html(n, c);

/* ---------- pixel UI frames (9-slice images drawn here, used by CSS border-image) ---------- */
function makeFrames() {
  const F = {
    wood: ['#1a0c04', '#8a5a32', '#5a3418', '#3a2010', '#2a170a'], dark: ['#0e0703', '#5a3c22', '#2a170b', '#1e1007', '#140a04'],
    btn: ['#1a0c04', '#d09a5c', '#a0683a', '#6b4226', '#4a2c16'], gold: ['#4a2204', '#fff3a0', '#ffc53a', '#e08a1a', '#a85a0a'],
    green: ['#062a0c', '#c8ffb0', '#6ee070', '#2aa040', '#18702a'], purple: ['#1e0a3a', '#ecd0ff', '#b48cff', '#6a3ab0', '#4a2490'],
    red: ['#3a0a04', '#ffc0b0', '#ff7a6a', '#c03a2a', '#8a2010']
  };
  const rows = ['..kkkkkkkk..', '.kLLLLLLLLk.', 'kLLmmmmmmmdk', 'kLmmmmmmmmdk', 'kLmmmmmmmmdk', 'kLmmmmmmmmdk', 'kLmmmmmmmmdk', 'kLmmmmmmmmdk', 'kLmmmmmmmmdk', 'kmmmmmmmmddk', '.kDDDDDDDDk.', '..kkkkkkkk..'];
  const root = document.documentElement.style;
  for (const k in F) {
    const [o, l, m, d, dd] = F[k], c = document.createElement('canvas'); c.width = c.height = 12; const x = c.getContext('2d');
    const pal = { k: o, L: l, m, d, D: dd };
    rows.forEach((r, j) => { for (let i = 0; i < 12; i++) if (r[i] !== '.') { x.fillStyle = pal[r[i]]; x.fillRect(i, j, 1, 1); } });
    if (k === 'wood') { x.fillStyle = 'rgba(0,0,0,.18)'; for (let j = 3; j < 10; j += 3) x.fillRect(2, j, 8, 1); }
    root.setProperty('--fr-' + k, `url(${c.toDataURL()})`);
  }
}
makeFrames();
IC.hydrate(document);

/* ---------- save ---------- */
let save;
try { save = C.fixSave(JSON.parse(localStorage.getItem(KEY))); } catch (e) { save = C.newSave(); }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage full or blocked */ } }
const migrated = save.migratedFrom; if (migrated) { delete save.migratedFrom; persist(); }
A.setMuted(save.muted); A.setMusicOff(!!save.musicOff);

/* ---------- state ---------- */
const cv = $('cv');
const R = new window.DBRenderer(cv);
let mode = 'camp';
let world = null, preview = null;
let cmdMode = false;
const keys = [];
let hintT = 0;
let tut = null;          // first-dive tutorial state
let runGoals = [];       // goals completed during the current dive
let goalT = 0;

function newPreview() {
  preview = new C.World(save, 12345, R.idealCols(), { noFind: true });
  preview.ev.length = 0; preview.player.y = -1; preview.player.py = -1;
  R.camY = null; R.bubble = null; R.campView = true; R.arrow = null;
}
const isTouch = ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
if (!isTouch) document.body.classList.add('nodpad'); // desktop: hint sits lower

/* ---------- toast & hint ---------- */
let toastT = null;
function toast(html, ms) {
  const t = $('toast'); t.innerHTML = html; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 1800);
}
function hint(html, sec) { const h = $('hint'); h.innerHTML = html; h.style.opacity = 1; h.classList.remove('hidden'); hintT = sec || 4; }

/* ---------- goals ---------- */
function goalHTML(p, compact) {
  const g = p.g, pct = Math.round(p.cur / p.n * 100);
  const prog = p.n > 1 ? `${fmt(p.cur)}/${fmt(p.n)}` : '';
  if (compact) return { text: g.text + (prog ? ` (${prog})` : ''), pct };
  return `${ic(g.icon || 'flag')}<div class="gtxt"><div class="glabel">Next goal${prog ? ' · ' + prog : ''}</div><div class="gname">${g.text}</div><div class="gbar"><div style="width:${pct}%"></div></div></div>` +
    (g.reward ? `<div class="greward">${ic('coin')}+${fmt(g.reward)}</div>` : '');
}
function updateGoalChip() {
  const p = C.goalProgress(save, world), h = goalHTML(p, true);
  $('goalChipTxt').textContent = h.text; $('goalChipFill').style.width = h.pct + '%';
  $('goalChip').classList.toggle('hidden', !!(tut && tut.step < 3));
}
function runGoalCheck() {
  const done = C.checkGoals(save, world);
  for (const g of done) {
    runGoals.push(g); A.SFX.goal();
    toast(`${ic('check')} Goal complete!<small>${g.text}${g.reward ? ` · +${fmt(g.reward)} coins` : ''}</small>`, 2200);
    const ch = $('goalChip'); ch.classList.remove('done'); void ch.offsetWidth; ch.classList.add('done');
  }
  if (done.length) persist();
  return done;
}

/* ---------- tutorial (first dive only) ---------- */
const TUT_TXT = {
  dig: () => isTouch ? ['Touch and drag down to dig!', 'An invisible joystick follows your finger.'] : ['Press the arrow keys or WASD to dig!', 'Hold down to dig straight down.'],
  ore: () => ['Grab the copper!', 'Ore fills your bag. It turns into coins at camp.'],
  chest: () => ['Open the treasure chest!', 'Chests are full of coins.'],
  deep: () => ['Now dig as deep as you can!', 'Your lantern oil is running. Pip helps you dig.']
};
function tutArt(step) {
  if (step !== 'dig') return ic(step === 'ore' ? 'ore:#ff9a3c' : step === 'chest' ? 'chest' : 'lantern', 'big');
  if (isTouch) return `<div class="draghand"><div class="dot0"></div>${ic('hand')}</div>`;
  return `<div class="keys"><b class="k-up">W</b><b class="k-l">A</b><b class="k-d">${ic('depth')}</b><b class="k-r">D</b></div>`;
}
function tutShow(step) {
  const t = TUT_TXT[step]();
  $('tutArt').innerHTML = tutArt(step);
  $('tutArt').querySelectorAll('.ic.big').forEach((e) => { e.style.width = e.style.height = '42px'; });
  $('tutTxt').innerHTML = `${t[0]}<small>${t[1]}</small>`;
  $('tut').classList.remove('hidden');
  const card = $('tut').querySelector('.tut-card'); card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
}
const TUT_STEPS = ['dig', 'ore', 'chest', 'deep'];
function tutSet(i) {
  tut.step = i; tut.t = 0;
  const name = TUT_STEPS[i];
  if (!name) { tutEnd(); return; }
  if (i > 0) A.SFX.step2();
  tutShow(name);
  const sp = world.tutSpots;
  R.arrow = name === 'ore' ? Object.assign({ text: 'Copper!' }, sp.ore) : name === 'chest' ? Object.assign({ text: 'Treasure!' }, sp.chest) : null;
}
function tutEnd(skipped) {
  if (!tut) return;
  tut = null; R.arrow = null; $('tut').classList.add('hidden');
  save.tutDone = true; persist();
  if (world) world.oilHold = false;
  if (skipped) A.SFX.click();
  updateGoalChip();
}
function tutUpdate(dt) {
  if (!tut || !world) return;
  tut.t += dt;
  const w = world, name = TUT_STEPS[tut.step], sp = w.tutSpots;
  const gone = (p, t) => w.tile(p.x, p.y) !== t;
  if (name === 'dig' && w.blocksP >= 3) tutSet(1);
  else if (name === 'ore' && (w.bagN > 0 || gone(sp.ore, C.T.ORE) || w.player.y > sp.ore.y + 4 || tut.t > 20)) tutSet(2);
  else if (name === 'chest' && (w.chestsN > 0 || gone(sp.chest, C.T.CHEST) || w.player.y > sp.chest.y + 4 || tut.t > 20)) tutSet(3);
  else if (name === 'deep' && tut.t > 5) tutEnd();
}
$('tutSkip').onclick = () => tutEnd(true);

/* ---------- run ---------- */
function startRun() {
  A.init(); A.SFX.click(); A.setMusicMode('dive');
  R.resize();
  const first = save.runs === 0 && !save.tutDone;
  world = new C.World(save, (Date.now() ^ (save.runs * 7919)) >>> 0, R.idealCols(), { tutorial: first });
  mode = 'run'; cmdMode = false; R.campView = false; R.arrow = null; R.emote = null;
  R.camY = null; R.parts = []; R.pops = []; R.bubble = null;
  runGoals = []; goalT = 0;
  $('camp').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('btnDyn').classList.toggle('hidden', !world.st.dyn);
  $('btnFlare').classList.toggle('hidden', !world.st.flare);
  $('btnCmd').classList.remove('on');
  $('btnCmd').classList.toggle('hidden', save.runs < 2);
  $('tut').classList.add('hidden');
  if (first) { tut = { step: 0, t: 0 }; tutSet(0); }
  else if (save.runs === 1) hint(`Pip sniffs out hidden treasure ${ic('sparkle')} Follow him when he shouts!`, 5);
  else if (save.runs === 3) hint(`${ic('paw')} Tap the paw, then a spot, to send Pip there.`, 5);
  updateGoalChip();
}
function finishRun() {
  const res = world.result();
  C.applyRun(save, res);
  if (tut) tutEnd();
  save.tutDone = true;
  const late = C.checkGoals(save, null); runGoals.push(...late);
  let auto = 0;
  if (save.autoBuy && C.plvl(save, 'p_auto')) { auto = C.autoBuy(save); save.tally.buys += auto; runGoals.push(...C.checkGoals(save, null)); }
  persist();
  mode = 'summary';
  A.SFX.end();
  setTimeout(() => showSummary(res, auto), 700);
}
function showSummary(res, auto) {
  const rows = [[ic('ore:#ff9a3c') + 'Ore ×' + res.oreN, res.ore], [ic('depth') + 'Depth ' + res.depthMax + ' m', res.depth]];
  if (res.bounty > 0) rows.push([ic('sword') + 'Monsters ×' + res.kills, res.bounty]);
  if (res.chests > 0) rows.push([ic('chest') + 'Treasure ×' + res.chestsN, res.chests]);
  const firstDive = save.runs === 1;
  const reason = firstDive ? 'Dive complete!' : world.endReason === 'oil' ? 'The lantern went out!' : 'Back to camp!';
  let html = `<h2>${ic(firstDive ? 'star' : world.endReason === 'oil' ? 'lantern' : 'up')}${reason}</h2><div class="small">Pip leads you back up the tunnel</div>`;
  if (res.record && res.depthMax > 0) html += `<div class="record">${ic('trophy')}New record: ${res.depthMax} m!</div>`;
  html += rows.map((r) => `<div class="sumrow"><span>${r[0]}</span><span>${ic('coin')}${fmt(r[1])}</span></div>`).join('');
  html += `<div class="sumtotal">${ic('coin')}+${fmt(res.total)}</div>`;
  for (const g of runGoals) html += `<div class="goaldone">${ic('check')}<span>${g.text}</span>${g.reward ? `<b>${ic('coin')}+${fmt(g.reward)}</b>` : ''}</div>`;
  const p = C.goalProgress(save, null);
  html += `<div class="sumnext">${ic('flag')}Next: ${p.g.text}${p.n > 1 ? ` (${fmt(p.cur)}/${fmt(p.n)})` : ''}</div>`;
  if (auto) html += `<div class="small">Auto-bought ${auto} upgrades</div>`;
  const can = cheapestAffordable();
  if (can) html += `<div class="affordnote">${ic('sparkle')}You can buy an upgrade!</div>`;
  html += `<div class="row"><button class="btn ${can ? 'go' : ''}" id="sumMap">${ic('rails')}Upgrades</button><button class="btn ${can ? '' : 'go'}" id="sumDig">${ic('pick')}Dig again</button></div>`;
  $('sumCard').innerHTML = html;
  $('summary').classList.remove('hidden');
  if (res.record) A.SFX.record(); else A.SFX.coin();
  $('sumMap').onclick = () => { closeSummary(); showTab('map'); };
  $('sumDig').onclick = () => { closeSummary(); startRun(); };
}
function closeSummary() {
  $('summary').classList.add('hidden');
  $('hud').classList.add('hidden'); $('camp').classList.remove('hidden');
  mode = 'camp'; world = null; A.setMusicMode('camp'); newPreview(); refreshCamp(); campLayout();
}

/* ---------- input ---------- */
const KEYMAP = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0], W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0] };
window.addEventListener('keydown', (e) => {
  if (e.target && e.target.tagName === 'TEXTAREA') return;
  if (KEYMAP[e.key]) { e.preventDefault(); if (!keys.includes(e.key)) keys.push(e.key); A.init(); }
  if (mode === 'run') {
    if (e.key === ' ' || e.key === 'e' || e.key === 'E') { useDyn(); e.preventDefault(); }
    if (e.key === 'f' || e.key === 'F') useFlare();
    if (e.key === 'q' || e.key === 'Q') toggleCmd();
  } else if (mode === 'camp' && e.key === 'Enter' && !$('camp').classList.contains('hidden') && curTab === 'home') startRun();
});
window.addEventListener('keyup', (e) => { const i = keys.indexOf(e.key); if (i >= 0) keys.splice(i, 1); });
window.addEventListener('blur', () => { keys.length = 0; });
function inputDir() {
  const j = joyDir(); if (j) return j;
  if (keys.length) { const k = KEYMAP[keys[keys.length - 1]]; return { x: k[0], y: k[1] }; }
  return null;
}
/* floating joystick: touch/drag anywhere on the play area. Short tap (no drag) = tap action. */
const JOY_DEAD = 14, JOY_R = 56;
let joy = null;
function canvasTileAt(cx, cy) { const r = cv.getBoundingClientRect(); return R.tileAt(cx - r.left, cy - r.top); }
function joyShow() {
  const el = $('joy'), ar = $('app').getBoundingClientRect();
  el.classList.remove('hidden');
  el.style.left = (joy.x0 - ar.left) + 'px'; el.style.top = (joy.y0 - ar.top) + 'px';
  let dx = joy.x - joy.x0, dy = joy.y - joy.y0; const d = Math.hypot(dx, dy);
  if (d > JOY_R) { dx *= JOY_R / d; dy *= JOY_R / d; }
  el.querySelector('.knob').style.transform = `translate(${dx}px, ${dy}px)`;
}
function joyDir() {
  if (!joy || !joy.active) return null;
  const dx = joy.x - joy.x0, dy = joy.y - joy.y0;
  if (Math.hypot(dx, dy) < JOY_DEAD) return null;
  if (Math.abs(dx) > Math.abs(dy) * 1.15) return { x: Math.sign(dx), y: 0 };
  return { x: 0, y: Math.sign(dy) };
}
function tapAction(cx, cy) {
  const t = canvasTileAt(cx, cy);
  if (t.x < 0 || t.x >= world.W || t.y < -1) return;
  if (cmdMode) { world.commandBuddy(t.x, Math.max(0, t.y)); toggleCmd(false); return; }
  world.player.goal = { x: t.x, y: t.y }; world.player.goalT = 6; // short tap: go dig that block
}
cv.addEventListener('pointerdown', (e) => {
  A.init();
  if (mode !== 'run' || !world || joy) return;
  e.preventDefault();
  joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, active: false };
  try { cv.setPointerCapture(e.pointerId); } catch (_) {}
});
cv.addEventListener('pointermove', (e) => {
  if (!joy || e.pointerId !== joy.id) return;
  joy.x = e.clientX; joy.y = e.clientY;
  if (!joy.active && Math.hypot(joy.x - joy.x0, joy.y - joy.y0) > JOY_DEAD) { joy.active = true; if (world) world.player.goal = null; }
  if (joy.active) joyShow();
});
function joyEnd(e, cancel) {
  if (!joy || e.pointerId !== joy.id) return;
  if (!joy.active && !cancel && mode === 'run' && world) tapAction(joy.x0, joy.y0);
  joy = null; $('joy').classList.add('hidden');
}
cv.addEventListener('pointerup', (e) => joyEnd(e, false));
cv.addEventListener('pointercancel', (e) => joyEnd(e, true));
cv.addEventListener('lostpointercapture', (e) => joyEnd(e, true));
function useDyn() { if (world && world.useDynamite()) A.SFX.boom(); }
function useFlare() { if (world && world.useFlare()) A.SFX.flare(); }
function toggleCmd(v) { cmdMode = v === undefined ? !cmdMode : v; $('btnCmd').classList.toggle('on', cmdMode); if (cmdMode) hint(`Tap where Pip should dig! ${ic('paw')}`, 2.5); }
$('btnDyn').onclick = useDyn; $('btnFlare').onclick = useFlare; $('btnCmd').onclick = () => toggleCmd();
$('btnSurface').onclick = () => { if (world && !world.ended) { world.end('surface'); } };
function setMute(m) {
  save.muted = m; A.setMuted(m); persist();
  for (const id of ['btnMute', 'btnMuteRun']) { $(id).innerHTML = ic(m ? 'mute' : 'sound'); $(id).classList.toggle('off', m); }
  $('btnSfx2').querySelector('span').textContent = 'Sound: ' + (m ? 'off' : 'on');
}
function setMusic(off) {
  save.musicOff = off; A.setMusicOff(off); persist();
  $('btnMusic').classList.toggle('off', off);
  $('btnMusic2').querySelector('span').textContent = 'Music: ' + (off ? 'off' : 'on');
}
$('btnMute').onclick = () => setMute(!save.muted); $('btnMuteRun').onclick = () => setMute(!save.muted); $('btnSfx2').onclick = () => setMute(!save.muted);
$('btnMusic').onclick = () => { A.init(); setMusic(!save.musicOff); }; $('btnMusic2').onclick = () => { A.init(); setMusic(!save.musicOff); };
setMute(save.muted); setMusic(!!save.musicOff);

/* ---------- coins flying into the HUD ---------- */
let flyN = 0;
function flyCoins(x, y, n) {
  if (!world || document.hidden) return;
  const tgt = $('runCoinsChip').getBoundingClientRect(), ar = $('app').getBoundingClientRect(), cr = cv.getBoundingClientRect();
  const p = R.screenOf(x, y), sx = p.x + cr.left - ar.left, sy = p.y + cr.top - ar.top;
  const tx = tgt.left - ar.left + 16, ty = tgt.top - ar.top + tgt.height / 2;
  for (let i = 0; i < Math.min(n, 6); i++) {
    if (flyN > 24) return;
    const el = document.createElement('i'); el.className = 'ic ' + IC.cls('coin');
    el.style.left = sx + 'px'; el.style.top = sy + 'px';
    $('fly').appendChild(el); flyN++;
    const d = i * 70;
    setTimeout(() => { el.style.transform = `translate(${tx - sx}px, ${ty - sy}px) scale(.8)`; el.style.opacity = '0'; }, 20 + d);
    setTimeout(() => { el.remove(); flyN--; const c = $('runCoinsChip'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); A.SFX.tick(i); }, 580 + d);
  }
}

/* ---------- events -> sound/fx ---------- */
function handleEvents(w) {
  for (const e of w.ev) {
    R.event(e, w);
    switch (e.type) {
      case 'chip': A.SFX.chip(e.s); break;
      case 'break': A.SFX.brk(e.big); break;
      case 'ore': A.SFX.ore(e.tier, e.gem); flyCoins(e.x, e.y, e.gem ? 4 : 1); break;
      case 'flask': A.SFX.flask(); break;
      case 'chest': A.SFX.coin(); A.SFX.ore(8, true); flyCoins(e.x, e.y, 5); break;
      case 'pipfind': A.SFX.find(); flyCoins(e.x, e.y, 6); break;
      case 'pipsniff': A.SFX.sniff(); if (!tut && save.runs < 3) hint(`${ic('bang')} Pip smelled treasure! Follow him.`, 3.5); break;
      case 'boom': A.SFX.boom(); break;
      case 'hurt': A.SFX.hurt(); break;
      case 'attack': A.SFX.slash(); break;
      case 'kill': A.SFX.kill(); flyCoins(e.x, e.y, 2); break;
      case 'say': A.SFX.say(); break;
      case 'lowoil': A.SFX.low(); break;
      case 'record': if (save.runs > 0) { toast(`${ic('trophy')} New record!`); A.SFX.record(); } break;
      case 'stratum': toast(`${D.stratum(e.s).name}<small>Layer ${e.s + 1} · ${e.s * D.CHUNK} m</small>`, 2200); break;
      case 'end': finishRun(); break;
    }
  }
  w.ev.length = 0;
}

/* ---------- HUD ---------- */
function updateHUD() {
  const w = world; if (!w) return;
  const f = Math.max(0, Math.min(1, w.oil / w.st.oilMax));
  $('oilFill').style.width = (f * 100) + '%';
  $('oilFill').classList.toggle('low', f < 0.25 && !w.oilHold);
  $('oilTxt').textContent = Math.ceil(w.oil) + 's';
  $('depthTxt').textContent = Math.max(0, w.player.y + 1);
  $('recTxt').textContent = Math.max(save.bestDepth, w.depthMax);
  $('bagTxt').textContent = w.bagN + '/' + w.st.capacity;
  const vm = w.st.valueMult;
  $('runCoins').textContent = fmt((w.bagV + w.bounty + w.chestV) * vm);
  if (w.st.dyn) $('btnDyn').querySelector('u').style.height = Math.max(0, w.dynCd / w.st.dynCd * 100) + '%';
  if (w.st.flare) $('btnFlare').querySelector('u').style.height = Math.max(0, w.flareCd / w.st.flareCd * 100) + '%';
}

/* ---------- camp UI ---------- */
let curTab = 'home';
function showTab(t) {
  curTab = t;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  ['home', 'map', 'relic', 'set'].forEach((k) => $('tab-' + k).classList.toggle('hidden', k !== t));
  $('camp').classList.toggle('opaque', t !== 'home');
  if (t === 'map') { ensureUpMap(); upMap.refresh(); mapHint(); if (!upMap._centered) { upMap._centered = true; upMap.focus(); } }
  if (t === 'relic') { ensurePrMap(); prMap.refresh(); renderCave(); if (!prMap._centered) { prMap._centered = true; prMap.center('p_value'); } }
  if (t === 'set') $('verTxt').textContent = `Deep Buddies ${VERSION} · dives ${save.runs} · played ${Math.round(save.playTime / 60)} min underground`;
  refreshCamp();
  campLayout();
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { A.init(); A.SFX.click(); showTab(b.dataset.tab); }));
$('btnDig').onclick = startRun;
/* tell the renderer where the free part of the camp screen is (between the tab rail and the side card) */
function campLayout() {
  const wide = document.body.classList.contains('wide');
  const cr = cv.getBoundingClientRect();
  R.railW = wide ? document.querySelector('.tabs').getBoundingClientRect().right - cr.left : 0;
  const card = document.querySelector('.home-card').getBoundingClientRect();
  R.campRight = wide && card.width ? (card.left - cr.left) / (cr.width || 1) : 1;
}

function cheapestAffordable() { return D.UPGRADES.some((u) => C.upState(save, u.id) === 'affordable'); }
function refreshCamp() {
  $('coinTxt').textContent = fmt(save.coins);
  $('relicTxt').textContent = fmt(save.relics);
  const prUnlocked = save.relicsTotal > 0 || save.bestEver >= D.CAVEIN_DEPTH * 0.5;
  $('relicChip').classList.toggle('hidden', !(save.relicsTotal > 0));
  $('tabRelic').classList.toggle('hidden', !prUnlocked);
  const can = cheapestAffordable();
  $('dotUp').classList.toggle('hidden', !can);
  $('dotPr').classList.toggle('hidden', !(D.PRESTIGE.some((u) => C.prState(save, u.id) === 'affordable') || C.relicsFor(save) > 0));
  const st = C.stats(save);
  $('gearList').classList.toggle('hidden', save.runs < 3);
  const gear = [['pick:' + S.pickColor(st.pickTier), D.PICKS[st.pickTier]], ['lantern', Math.round(st.oilMax) + ' s oil'], ['bag', st.capacity + ' ore'], ['pip:' + st.evo, D.BUDDY_FORMS[st.evo].name]];
  $('gearList').innerHTML = gear.map((g) => `<div>${ic(g[0])}<small>${g[1]}</small></div>`).join('');
  $('digSub').innerHTML = `${ic('lantern')}${Math.round(st.oilMax)} s of oil`;
  const p = C.goalProgress(save, null);
  let gc = goalHTML(p);
  $('goalCard').innerHTML = gc;
  let note = '';
  if (save.bestDepth >= D.CAVEIN_DEPTH) note = `<div class="campnote">${ic('relic')}Cave-in ready: +${fmt(C.relicsFor(save))} Relics</div>`;
  if (can) note += `<div class="campnote">${ic('sparkle')}You can buy an upgrade!</div>`;
  $('records').innerHTML = note + `<span>${ic('trophy')}Best ${save.bestEver} m</span><span>${ic('mountain')}Shaft ${save.bestDepth} m</span><span>${ic('pick')}Dives ${save.runs}</span>` + (save.caveIns ? `<span>${ic('relic')}Cave-ins ${save.caveIns}</span>` : '');
  $('autoWrap').classList.toggle('hidden', !C.plvl(save, 'p_auto'));
  $('autoBuy').checked = !!save.autoBuy;
  if (upMap && curTab === 'map') { upMap.refresh(); mapHint(); }
  if (prMap && curTab === 'relic') { prMap.refresh(); renderCave(); }
}
$('autoBuy').onchange = (e) => { save.autoBuy = e.target.checked; if (save.autoBuy) { save.tally.buys += C.autoBuy(save); C.checkGoals(save, null); } persist(); refreshCamp(); };

/* ---------- maps (revealed gradually) ---------- */
let upMap = null, prMap = null, lastBuyUp = null, selUp = null, selPr = null;
function upVis(id) {
  const u = C.UP[id];
  if (C.lvl(save, id) > 0) return 'show';
  if (u.parent) { if (C.lvl(save, u.parent) > 0) return 'show'; return upVis(u.parent) === 'show' ? 'tease' : 'hide'; }
  const budget = Math.max(save.coins, save.coinsShaft || 0) * 1.5 + 60;
  const c = C.cost(u, 0);
  return c <= budget || save.caveIns > 0 ? 'show' : c <= budget * 8 ? 'tease' : 'hide';
}
function prVis(id) {
  const u = C.PR[id];
  if (C.plvl(save, id) > 0 || !u.parent || C.plvl(save, u.parent) > 0) return 'show';
  return prVis(u.parent) === 'show' ? 'tease' : 'hide';
}
function mapHint() { $('mapHint').textContent = upMap && upMap.hiddenCount > 0 ? 'Buy upgrades to reveal more of the map' : ''; }
function ensureUpMap() {
  if (upMap) return;
  upMap = new M.NodeMap($('upMap'), { nodes: D.UPGRADES, kind: 'up', G: $('upMap').clientWidth < 600 ? 86 : 100, vis: upVis, state: (id) => C.upState(save, id), level: (id) => C.lvl(save, id), onSelect: (id) => { A.SFX.click(); selUp = id; upMap.select(id); renderUpSheet(); } });
}
function ensurePrMap() {
  if (prMap) return;
  prMap = new M.NodeMap($('prMap'), { nodes: D.PRESTIGE, kind: 'pr', G: $('prMap').clientWidth < 600 ? 86 : 100, vis: prVis, state: (id) => C.prState(save, id), level: (id) => C.plvl(save, id), onSelect: (id) => { A.SFX.click(); selPr = id; prMap.select(id); renderPrSheet(); } });
}
function gearName(u, next) {
  if (u.tier && u.br === 'pick') return D.PICKS[u.tier];
  if (u.tier && u.br === 'weap') return D.WEAPONS[u.tier];
  if (u.id === 'armor') return D.ARMORS[Math.min(next, D.ARMORS.length - 1)];
  return null;
}
function renderUpSheet() {
  const u = C.UP[selUp], sh = $('upSheet'); if (!u) { sh.classList.add('hidden'); return; }
  const l = C.lvl(save, u.id), st = C.upState(save, u.id), c = C.cost(u, l);
  const gn = gearName(u, l + 1);
  let btn;
  if (st === 'maxed') btn = `<button class="btn buy" disabled>${ic('star')}MAX</button>`;
  else if (st === 'locked') btn = `<button class="btn buy" disabled>${ic('lock')}</button>`;
  else btn = `<button class="btn buy ${st === 'affordable' ? 'go' : ''}" id="buyUp" ${st === 'affordable' ? '' : 'disabled'}>${ic('coin')}${fmt(c)}</button>`;
  const lockTxt = st === 'locked' ? `<p>${ic('lock')}Buy <b>${C.UP[u.parent].name}</b> first</p>` : '';
  const need = st === 'available' ? `<p class="small">Need ${fmt(c - save.coins)} more coins</p>` : '';
  sh.innerHTML = `<button class="x" id="closeUp">${ic('close')}</button>${ic(u.icon, 'bigic')}<div class="info"><h3>${u.name}${gn && u.id === 'armor' && st !== 'maxed' ? ' → ' + gn : ''}</h3><p>${ic(D.BR_ICON[u.br])}${u.desc}</p><p class="small">Level ${l}/${u.max}</p>${lockTxt}${need}</div>${btn}`;
  sh.classList.remove('hidden');
  $('closeUp').onclick = () => { sh.classList.add('hidden'); selUp = null; upMap.select(null); };
  const b = $('buyUp'); if (b) b.onclick = () => {
    if (C.buyUp(save, u.id)) {
      A.SFX.buy(); lastBuyUp = u.id; save.tally.buys++;
      const done = C.checkGoals(save, null);
      persist(); toast(`${ic(u.icon)} ${gn || u.name}!`, 1000);
      if (done.length) setTimeout(() => { A.SFX.goal(); toast(`${ic('check')} Goal complete!<small>${done.map((g) => g.text).join(' · ')} · +${fmt(done.reduce((a, g) => a + g.reward, 0))} coins</small>`, 2200); refreshCamp(); }, 900);
      refreshCamp(); renderUpSheet();
    } else A.SFX.nope();
  };
}
function renderPrSheet() {
  const u = C.PR[selPr], sh = $('prSheet'); if (!u) { sh.classList.add('hidden'); return; }
  const l = C.plvl(save, u.id), st = C.prState(save, u.id), c = C.cost(u, l);
  let btn;
  if (st === 'maxed') btn = `<button class="btn buy" disabled>${ic('star')}MAX</button>`;
  else if (st === 'locked') btn = `<button class="btn buy" disabled>${ic('lock')}</button>`;
  else btn = `<button class="btn buy ${st === 'affordable' ? 'purple' : ''}" id="buyPr" ${st === 'affordable' ? '' : 'disabled'}>${ic('relic')}${fmt(c)}</button>`;
  const portrait = u.evo ? `<canvas class="portrait" id="evoPortrait" width="16" height="15"></canvas>` : ic(u.icon, 'bigic');
  sh.innerHTML = `<button class="x" id="closePr">${ic('close')}</button>${portrait}<div class="info"><h3>${u.name}</h3><p>${u.desc}</p><p class="small">Level ${l}/${u.max}</p>${st === 'locked' ? `<p>${ic('lock')}Needs <b>${C.PR[u.parent].name}</b></p>` : ''}</div>${btn}`;
  sh.classList.remove('hidden');
  if (u.evo) { const pc = $('evoPortrait').getContext('2d'); pc.imageSmoothingEnabled = false; pc.drawImage(S.pip(u.evo, 0), 0, 0); }
  $('closePr').onclick = () => { sh.classList.add('hidden'); selPr = null; prMap.select(null); };
  const b = $('buyPr'); if (b) b.onclick = () => {
    if (C.buyPr(save, u.id)) { A.SFX.buy(); if (u.evo) { A.SFX.record(); toast(`${ic('sparkle')} Pip evolved!<small>${D.BUDDY_FORMS[u.evo].name}</small>`, 2500); } persist(); newPreview(); refreshCamp(); renderPrSheet(); }
    else A.SFX.nope();
  };
}
function renderCave() {
  const gain = C.relicsFor(save), card = $('caveCard');
  const ok = gain >= 1;
  card.innerHTML = `${ic('relic')}<div class="txt">${ok ? `Cave-in now: <b>+${fmt(gain)} Relics</b><br><span class="small">Deeper shaft = more relics (${save.bestDepth} m)</span>` : `Reach <b>${D.CAVEIN_DEPTH} m</b> in this shaft to Cave-in<br><span class="small">Shaft record: ${save.bestDepth} m</span>`}</div><button class="btn purple" id="btnCave" ${ok ? '' : 'disabled'}>${ic('burst')}Cave-in</button>`;
  $('btnCave').onclick = askCaveIn;
}
function askCaveIn() {
  const gain = C.relicsFor(save);
  $('confCard').innerHTML = `<h2>${ic('burst')}Cave-in?</h2><p>The shaft collapses and you open a new one.</p>
  <p>${ic('check')}Keep: Relics, Relic Map, Pip's evolutions, best depth</p><p>${ic('close')}Reset: coins, upgrades, shaft depth</p>
  <div class="sumtotal">${ic('relic')}+${fmt(gain)}</div><div class="row"><button class="btn" id="cNo">Not yet</button><button class="btn purple" id="cYes">${ic('burst')}Cave-in!</button></div>`;
  $('confirm').classList.remove('hidden');
  $('cNo').onclick = () => $('confirm').classList.add('hidden');
  $('cYes').onclick = () => {
    $('confirm').classList.add('hidden');
    const g = C.caveIn(save);
    if (g > 0) {
      A.SFX.prestige(); $('app').classList.add('shakeit'); setTimeout(() => $('app').classList.remove('shakeit'), 700);
      const done = C.checkGoals(save, null);
      persist(); toast(`${ic('burst')} +${fmt(g)} Relics!<small>A fresh shaft awaits${done.length ? ' · goal complete!' : ''}</small>`, 2500);
      if (upMap) { upMap._centered = false; }
      newPreview(); refreshCamp();
    }
  };
}

/* ---------- settings ---------- */
$('btnExport').onclick = () => { $('saveBox').value = btoa(unescape(encodeURIComponent(JSON.stringify(save)))); $('saveBox').select(); };
$('btnImport').onclick = () => {
  try { const s = C.fixSave(JSON.parse(decodeURIComponent(escape(atob($('saveBox').value.trim()))))); delete s.migratedFrom; save = s; persist(); location.reload(); }
  catch (e) { toast(`${ic('close')} Bad save code`); }
};
$('btnReset').onclick = () => {
  $('confCard').innerHTML = `<h2>${ic('trash')}Reset?</h2><p>Everything will be lost on this device.</p><div class="row"><button class="btn" id="cNo">No</button><button class="btn danger" id="cYes">${ic('trash')}Reset</button></div>`;
  $('confirm').classList.remove('hidden');
  $('cNo').onclick = () => $('confirm').classList.add('hidden');
  $('cYes').onclick = () => { localStorage.removeItem(KEY); save = C.newSave(); persist(); location.reload(); };
};

/* ---------- loop ---------- */
const STEP = 1 / 60;
let last = performance.now(), acc = 0, manual = false;
function tick(dt) {
  if (mode === 'run' && world) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { world.step(STEP, { dir: inputDir() }); acc -= STEP; n++; if (world.ended) break; }
    if (n >= 5) acc = 0;
    tutUpdate(dt);
    goalT -= dt; if (goalT <= 0 && world && !world.ended) { goalT = 0.25; runGoalCheck(); updateGoalChip(); }
    handleEvents(world);
    if (world) { R.draw(world, dt); updateHUD(); }
  } else if (mode === 'summary' && world) {
    R.draw(world, dt);
  } else if (preview) {
    preview.ev.length = 0;
    R.draw(preview, dt);
  }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
}
function frame(now) {
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
  if (!manual) tick(dt);
  requestAnimationFrame(frame);
}
function onResize() {
  const vw = window.innerWidth, vh = window.innerHeight;
  document.body.classList.toggle('wide', vw > vh * 1.1);
  document.body.classList.toggle('short', vh < 560);
  const big = vw > vh * 1.1 && vh >= 820 && vw >= 1280;
  document.body.classList.toggle('big', big);
  document.documentElement.style.setProperty('--z', big ? Math.min(1.6, Math.max(1.15, vh / 820)).toFixed(3) : '1');
  R.resize();
  campLayout();
  if (mode === 'camp' && preview && preview.W !== R.idealCols()) newPreview();
}
let rzT = null;
const queueResize = () => { onResize(); clearTimeout(rzT); rzT = setTimeout(onResize, 250); };
window.addEventListener('resize', queueResize);
window.addEventListener('orientationchange', queueResize);
if (window.visualViewport) window.visualViewport.addEventListener('resize', queueResize);
document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
setInterval(persist, 10000);

onResize();
newPreview();
refreshCamp();
showTab('home');
// brand-new players skip the menu and land straight in a guided first dive
if (save.runs === 0 && !save.tutDone) startRun();
else {
  $('camp').classList.remove('hidden'); campLayout();
  A.setMusicMode('camp');
  if (migrated) setTimeout(() => toast(`${ic('sparkle')} Deep Buddies got an update!<small>Coins now count ×10. Your progress is all here.</small>`, 3200), 400);
}
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

// small hook for automated tests (and frame-exact capture: manual(true) then tick(dt))
window.__db = { get save() { return save; }, get world() { return world; }, get mode() { return mode; }, get preview() { return preview; }, get tut() { return tut; }, R, A, startRun, showTab, C, persist,
  manual(v) { manual = !!v; last = performance.now(); }, tick, keys, skipTut: () => tutEnd(true) };
})();
