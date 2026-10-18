/* Deep Buddies - main game: UI, input, loop, saving. */
(function () {
'use strict';
const D = window.DBData, C = window.DBCore, S = window.DBSprites, A = window.DBAudio, M = window.DBMaps;
const VERSION = 'v3-ads';
const KEY = 'deep-buddies-save-v1';
const $ = (id) => document.getElementById(id);
const fmt = C.fmt;

/* ---------- save ---------- */
let save;
try { save = C.fixSave(JSON.parse(localStorage.getItem(KEY))); } catch (e) { save = C.newSave(); }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* storage full or blocked */ } }
A.setMuted(save.muted);

/* ---------- state ---------- */
const cv = $('cv');
const R = new window.DBRenderer(cv);
let mode = 'camp';
let world = null, preview = null;
let cmdMode = false;
const keys = [];
let hintT = 0;
let lastRes = null; // last run result (summary + reward-ad claim)

function newPreview() {
  preview = new C.World(save, 12345, R.idealCols());
  preview.ev.length = 0; preview.player.y = -1; preview.player.py = -1;
  R.camY = null; R.bubble = null; R.campView = true;
}
const isTouch = ('ontouchstart' in window) || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
if (!isTouch) document.body.classList.add('nodpad'); // desktop: hint sits lower

/* ---------- toast & hint ---------- */
let toastT = null;
function toast(html, ms) {
  const t = $('toast'); t.innerHTML = html; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms || 1800);
}
function hint(text, sec) { const h = $('hint'); h.textContent = text; h.style.opacity = 1; h.classList.remove('hidden'); hintT = sec || 4; }

/* ---------- run ---------- */
function startRun() {
  A.init(); A.SFX.click();
  R.resize();
  world = new C.World(save, (Date.now() ^ (save.runs * 7919)) >>> 0, R.idealCols());
  mode = 'run'; cmdMode = false; R.campView = false;
  R.camY = null; R.parts = []; R.pops = []; R.bubble = null;
  $('camp').classList.add('hidden'); $('hud').classList.remove('hidden');
  $('btnDyn').classList.toggle('hidden', !world.st.dyn);
  $('btnFlare').classList.toggle('hidden', !world.st.flare);
  $('btnCmd').classList.remove('on');
  if (save.runs === 0) hint(isTouch ? 'Touch and drag anywhere to walk and dig! 👆⛏️' : 'Arrow keys / WASD (or drag the mouse) to dig! ⛏️', 6);
  else if (save.runs === 1) hint('Dig down 🔽 and grab shiny ore before the lantern goes out! 🏮', 5);
  else if (save.runs === 3) hint('🐾 Pip explores on his own! Tap the paw, then a spot, to send him there.', 5);
}
function finishRun() {
  const res = world.result();
  const bestBefore = save.bestRunCoins || 0;
  C.applyRun(save, res);
  save.bestRunCoins = Math.max(bestBefore, res.total);
  // optional reward ad (2x this run's coins); never on the first runs or for tiny runs, see js/ads.js CONFIG
  res.runNo = save.runs;
  res.adOffer = !!(window.Ads && window.Ads.shouldOffer({ enabled: save.adsOffer !== false, runsBefore: save.runs - 1, reward: res.total, best: bestBefore, claimed: save.adClaimRun === save.runs }));
  let auto = 0;
  if (save.autoBuy && C.plvl(save, 'p_auto')) auto = C.autoBuy(save);
  persist();
  mode = 'summary';
  A.SFX.end();
  lastRes = res;
  setTimeout(() => showSummary(res, auto), 700);
}
function showSummary(res, auto) {
  const rows = [
    ['⛏️ Ore ×' + res.oreN, res.ore], ['📏 Depth ' + res.depthMax + ' m', res.depth]
  ];
  if (res.bounty > 0) rows.push(['⚔️ Monsters ×' + res.kills, res.bounty]);
  if (res.chests > 0) rows.push(['🎁 Treasure', res.chests]);
  const reason = world.endReason === 'oil' ? '🏮 The lantern went out!' : '⏏️ Back to camp!';
  let html = `<h2>${reason}</h2><div class="small">Pip leads you back up the tunnel 🐾</div>`;
  if (res.record && res.depthMax > 0) html += `<div class="record">🏆 New record: ${res.depthMax} m!</div>`;
  html += rows.map((r) => `<div class="sumrow"><span>${r[0]}</span><span>🪙 ${fmt(r[1])}</span></div>`).join('');
  html += `<div class="sumtotal" id="sumTotal">🪙 +${fmt(res.total)}</div>`;
  if (res.adOffer) html += `<div class="adoffer" id="adOffer"><div class="adtxt" id="adTxt">🎬 Watch a short ad: <b>2× coins</b> this run <span class="small">(+🪙 ${fmt(res.total)})</span></div><div class="row"><button class="btn" id="adYes">🎬 Watch ad</button><button class="btn" id="adNo">No thanks</button></div></div>`;
  if (auto) html += `<div class="small">📒 Auto-bought ${auto} upgrades</div>`;
  const can = cheapestAffordable();
  html += `<div class="row"><button class="btn ${can ? 'go' : ''}" id="sumMap">🛤️ Upgrades${can ? ' ✨' : ''}</button><button class="btn" id="sumDig">⛏️ Dig again</button></div>`;
  $('sumCard').innerHTML = html;
  $('summary').classList.remove('hidden');
  if (res.record) A.SFX.record(); else A.SFX.coin();
  $('sumMap').onclick = () => { closeSummary(); showTab('map'); };
  $('sumDig').onclick = () => { closeSummary(); startRun(); };
  if (res.adOffer) {
    $('adNo').onclick = () => { A.SFX.click(); $('adOffer').remove(); };
    $('adYes').onclick = () => watchAd(res);
  }
}
// Reward ad: double this run's coins. Applied only after the ad was watched to the end, at most once per run (saved).
function watchAd(res) {
  if (save.adClaimRun === res.runNo) return;
  const yes = $('adYes'), no = $('adNo');
  yes.disabled = no.disabled = true;
  window.Ads.showRewarded('deep-buddies-run-end').then((r) => {
    const card = $('adOffer');
    if (r.rewarded && save.adClaimRun !== res.runNo && save.runs === res.runNo) {
      save.adClaimRun = res.runNo;
      save.coins += res.total; save.coinsShaft += res.total; save.coinsTotal += res.total;
      persist();
      if ($('sumTotal')) $('sumTotal').innerHTML = `🪙 +${fmt(res.total * 2)} <span class="x2">×2</span>`;
      if (card) card.innerHTML = `<div class="adtxt">🎉 Bonus! You got 🪙 +${fmt(res.total)} extra. Thanks!</div>`;
      A.SFX.record(); refreshCamp();
    } else if (card) {
      $('adTxt').innerHTML = '🙂 No bonus this time, and that\'s okay! You can try again or skip it.';
      yes.disabled = no.disabled = false;
    }
  });
}
function closeSummary() {
  $('summary').classList.add('hidden');
  $('hud').classList.add('hidden'); $('camp').classList.remove('hidden');
  mode = 'camp'; world = null; newPreview(); refreshCamp();
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
function toggleCmd(v) { cmdMode = v === undefined ? !cmdMode : v; $('btnCmd').classList.toggle('on', cmdMode); if (cmdMode) hint('Tap where Pip should dig! 🐾', 2.5); }
$('btnDyn').onclick = useDyn; $('btnFlare').onclick = useFlare; $('btnCmd').onclick = () => toggleCmd();
$('btnSurface').onclick = () => { if (world && !world.ended) { world.end('surface'); } };
function setMute(m) { save.muted = m; A.setMuted(m); persist(); $('btnMute').textContent = $('btnMuteRun').textContent = m ? '🔇' : '🔊'; }
$('btnMute').onclick = () => setMute(!save.muted); $('btnMuteRun').onclick = () => setMute(!save.muted);
setMute(save.muted);

/* ---------- events -> sound/fx ---------- */
function handleEvents(w) {
  for (const e of w.ev) {
    R.event(e, w);
    switch (e.type) {
      case 'chip': A.SFX.chip(e.s); break;
      case 'break': A.SFX.brk(e.big); break;
      case 'ore': A.SFX.ore(e.tier, e.gem); break;
      case 'flask': A.SFX.flask(); break;
      case 'chest': A.SFX.coin(); A.SFX.ore(8, true); break;
      case 'boom': A.SFX.boom(); break;
      case 'hurt': A.SFX.hurt(); break;
      case 'attack': A.SFX.slash(); break;
      case 'kill': A.SFX.kill(); break;
      case 'say': A.SFX.say(); break;
      case 'lowoil': A.SFX.low(); break;
      case 'record': toast('🏆 New record!'); A.SFX.record(); break;
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
  $('oilFill').classList.toggle('low', f < 0.25);
  $('oilTxt').textContent = Math.ceil(w.oil) + 's';
  $('depthTxt').textContent = Math.max(0, w.player.y + 1);
  $('recTxt').textContent = Math.max(save.bestDepth, w.depthMax);
  $('bagTxt').textContent = w.bagN + '/' + w.st.capacity;
  const vm = w.st.valueMult;
  $('runCoins').textContent = fmt((w.bagV + w.bounty + w.chestV) * vm);
  if (w.st.dyn) $('btnDyn').querySelector('i').style.height = Math.max(0, w.dynCd / w.st.dynCd * 100) + '%';
  if (w.st.flare) $('btnFlare').querySelector('i').style.height = Math.max(0, w.flareCd / w.st.flareCd * 100) + '%';
}

/* ---------- camp UI ---------- */
let curTab = 'home';
function showTab(t) {
  curTab = t;
  document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  ['home', 'map', 'relic', 'set'].forEach((k) => $('tab-' + k).classList.toggle('hidden', k !== t));
  $('camp').classList.toggle('opaque', t !== 'home');
  if (t === 'map') { ensureUpMap(); upMap.refresh(); if (!upMap._centered) { upMap._centered = true; upMap.center(lastBuyUp || 'tank'); } }
  if (t === 'relic') { ensurePrMap(); prMap.refresh(); renderCave(); if (!prMap._centered) { prMap._centered = true; prMap.center('p_value'); } }
  if (t === 'set') $('verTxt').textContent = `Deep Buddies ${VERSION} · runs ${save.runs} · played ${Math.round(save.playTime / 60)} min underground`;
  refreshCamp();
}
document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { A.init(); A.SFX.click(); showTab(b.dataset.tab); }));
$('btnDig').onclick = startRun;

function cheapestAffordable() { return D.UPGRADES.some((u) => C.upState(save, u.id) === 'affordable'); }
function refreshCamp() {
  $('coinTxt').textContent = fmt(save.coins);
  $('relicTxt').textContent = fmt(save.relics);
  const prUnlocked = save.relicsTotal > 0 || save.bestEver >= D.CAVEIN_DEPTH * 0.5;
  $('relicChip').classList.toggle('hidden', !(save.relicsTotal > 0));
  $('tabRelic').classList.toggle('hidden', !prUnlocked);
  $('dotUp').classList.toggle('hidden', !cheapestAffordable());
  $('dotPr').classList.toggle('hidden', !(D.PRESTIGE.some((u) => C.prState(save, u.id) === 'affordable') || C.relicsFor(save) > 0));
  const st = C.stats(save);
  const gear = [
    ['⛏️', D.PICKS[st.pickTier]], ['🗡️', D.WEAPONS[st.swordTier]], ['🛡️', D.ARMORS[st.armor]], ['🏮', st.oilMax.toFixed(0) + ' s oil'],
    ['🥾', st.move.toFixed(1) + ' tiles/s'], ['🎒', st.capacity + ' ore'], ['💥', fmt(st.power) + ' power'], ['🐾', D.BUDDY_FORMS[st.evo].name]
  ];
  $('gearList').innerHTML = gear.map((g) => `<div>${g[0]}<small>${g[1]}</small></div>`).join('');
  $('digSub').textContent = `🏮 ${st.oilMax.toFixed(0)} s of oil`;
  let goal;
  if (save.runs === 0) goal = 'Pip is ready! Let\'s dig our first tunnel 🐾';
  else if (save.bestDepth < D.CAVEIN_DEPTH) goal = `🎯 Reach ${D.CAVEIN_DEPTH} m to unlock 🗿 Cave-in (record ${save.bestDepth} m)`;
  else goal = `🗿 Cave-in ready: +${fmt(C.relicsFor(save))} Relics (go deeper for more!)`;
  if (cheapestAffordable()) goal += '<br>✨ You can buy an upgrade!';
  $('goalTxt').innerHTML = goal;
  $('records').innerHTML = `<span>🏆 Best ${save.bestEver} m</span><span>⛰️ Shaft ${save.bestDepth} m</span><span>🔁 Runs ${save.runs}</span>` + (save.caveIns ? `<span>🗿 Cave-ins ${save.caveIns}</span>` : '');
  $('autoWrap').classList.toggle('hidden', !C.plvl(save, 'p_auto'));
  $('autoBuy').checked = !!save.autoBuy;
  if (upMap && curTab === 'map') upMap.refresh();
  if (prMap && curTab === 'relic') { prMap.refresh(); renderCave(); }
}
$('autoBuy').onchange = (e) => { save.autoBuy = e.target.checked; if (save.autoBuy) C.autoBuy(save); persist(); refreshCamp(); };

/* ---------- maps ---------- */
let upMap = null, prMap = null, lastBuyUp = null, selUp = null, selPr = null;
function ensureUpMap() {
  if (upMap) return;
  upMap = new M.NodeMap($('upMap'), { nodes: D.UPGRADES, kind: 'up', G: 92, state: (id) => C.upState(save, id), level: (id) => C.lvl(save, id), onSelect: (id) => { A.SFX.click(); selUp = id; upMap.select(id); renderUpSheet(); } });
}
function ensurePrMap() {
  if (prMap) return;
  prMap = new M.NodeMap($('prMap'), { nodes: D.PRESTIGE, kind: 'pr', G: 96, state: (id) => C.prState(save, id), level: (id) => C.plvl(save, id), onSelect: (id) => { A.SFX.click(); selPr = id; prMap.select(id); renderPrSheet(); } });
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
  if (st === 'maxed') btn = '<button class="btn buy" disabled>⭐ MAX</button>';
  else if (st === 'locked') btn = `<button class="btn buy" disabled>🔒</button>`;
  else btn = `<button class="btn buy ${st === 'affordable' ? 'go' : ''}" id="buyUp" ${st === 'affordable' ? '' : 'disabled'}>🪙 ${fmt(c)}</button>`;
  const lockTxt = st === 'locked' ? `<p>🔒 Buy <b>${C.UP[u.parent].name}</b> first</p>` : '';
  const need = st === 'available' ? `<p class="small">Need 🪙 ${fmt(c - save.coins)} more</p>` : '';
  sh.innerHTML = `<button class="x" id="closeUp">✖</button><div class="bigic">${u.icon}</div><div class="info"><h3>${u.name}${gn && u.id === 'armor' && st !== 'maxed' ? ' → ' + gn : ''}</h3><p>${D.BR_ICON[u.br]} ${u.desc}</p><p class="small">Level ${l}/${u.max}</p>${lockTxt}${need}</div>${btn}`;
  sh.classList.remove('hidden');
  $('closeUp').onclick = () => { sh.classList.add('hidden'); selUp = null; upMap.select(null); };
  const b = $('buyUp'); if (b) b.onclick = () => {
    if (C.buyUp(save, u.id)) { A.SFX.buy(); lastBuyUp = u.id; persist(); toast(`${u.icon} ${gn || u.name}!`, 1000); refreshCamp(); renderUpSheet(); }
    else A.SFX.nope();
  };
}
function renderPrSheet() {
  const u = C.PR[selPr], sh = $('prSheet'); if (!u) { sh.classList.add('hidden'); return; }
  const l = C.plvl(save, u.id), st = C.prState(save, u.id), c = C.cost(u, l);
  let btn;
  if (st === 'maxed') btn = '<button class="btn buy" disabled>⭐ MAX</button>';
  else if (st === 'locked') btn = '<button class="btn buy" disabled>🔒</button>';
  else btn = `<button class="btn buy ${st === 'affordable' ? 'purple' : ''}" id="buyPr" ${st === 'affordable' ? '' : 'disabled'}>🗿 ${fmt(c)}</button>`;
  const portrait = u.evo ? `<canvas class="portrait" id="evoPortrait" width="12" height="12"></canvas>` : `<div class="bigic">${u.icon}</div>`;
  sh.innerHTML = `<button class="x" id="closePr">✖</button>${portrait}<div class="info"><h3>${u.name}</h3><p>${u.desc}</p><p class="small">Level ${l}/${u.max}</p>${st === 'locked' ? `<p>🔒 Needs <b>${C.PR[u.parent].name}</b></p>` : ''}</div>${btn}`;
  sh.classList.remove('hidden');
  if (u.evo) { const pc = $('evoPortrait').getContext('2d'); pc.imageSmoothingEnabled = false; pc.drawImage(S.mole(u.evo), 0, 0); }
  $('closePr').onclick = () => { sh.classList.add('hidden'); selPr = null; prMap.select(null); };
  const b = $('buyPr'); if (b) b.onclick = () => {
    if (C.buyPr(save, u.id)) { A.SFX.buy(); if (u.evo) { A.SFX.record(); toast(`✨ Pip evolved!<small>${D.BUDDY_FORMS[u.evo].name}</small>`, 2500); } persist(); newPreview(); refreshCamp(); renderPrSheet(); }
    else A.SFX.nope();
  };
}
function renderCave() {
  const gain = C.relicsFor(save), card = $('caveCard');
  const ok = gain >= 1;
  card.innerHTML = `<div style="font-size:40px">🗿</div><div class="txt">${ok ? `Cave-in now: <b>+${fmt(gain)} Relics</b><br><span class="small">Deeper shaft = more relics (${save.bestDepth} m)</span>` : `Reach <b>${D.CAVEIN_DEPTH} m</b> in this shaft to Cave-in<br><span class="small">Shaft record: ${save.bestDepth} m</span>`}</div><button class="btn purple" id="btnCave" ${ok ? '' : 'disabled'}>💥 Cave-in</button>`;
  $('btnCave').onclick = askCaveIn;
}
function askCaveIn() {
  const gain = C.relicsFor(save);
  $('confCard').innerHTML = `<h2>💥 Cave-in?</h2><p>The shaft collapses and you open a new one.</p>
  <p>✅ Keep: 🗿 Relics, Relic Map, Pip's evolutions, 🏆 best depth</p><p>🔄 Reset: 🪙 coins, 🛤️ upgrades, shaft depth</p>
  <div class="sumtotal">🗿 +${fmt(gain)}</div><div class="row"><button class="btn" id="cNo">✖ Not yet</button><button class="btn purple" id="cYes">💥 Cave-in!</button></div>`;
  $('confirm').classList.remove('hidden');
  $('cNo').onclick = () => $('confirm').classList.add('hidden');
  $('cYes').onclick = () => {
    $('confirm').classList.add('hidden');
    const g = C.caveIn(save);
    if (g > 0) {
      A.SFX.prestige(); $('app').classList.add('shakeit'); setTimeout(() => $('app').classList.remove('shakeit'), 700);
      persist(); toast(`💥 +${fmt(g)} Relics!<small>A fresh shaft awaits</small>`, 2500);
      newPreview(); refreshCamp();
    }
  };
}

/* ---------- settings ---------- */
$('adsToggle').checked = save.adsOffer !== false;
$('adsToggle').onchange = (e) => { save.adsOffer = e.target.checked; persist(); };
$('btnExport').onclick = () => { $('saveBox').value = btoa(unescape(encodeURIComponent(JSON.stringify(save)))); $('saveBox').select(); };
$('btnImport').onclick = () => {
  try { const s = C.fixSave(JSON.parse(decodeURIComponent(escape(atob($('saveBox').value.trim()))))); save = s; persist(); location.reload(); }
  catch (e) { toast('❌ Bad save code'); }
};
$('btnReset').onclick = () => {
  $('confCard').innerHTML = `<h2>🗑️ Reset?</h2><p>Everything will be lost on this device.</p><div class="row"><button class="btn" id="cNo">✖ No</button><button class="btn danger" id="cYes">🗑️ Reset</button></div>`;
  $('confirm').classList.remove('hidden');
  $('cNo').onclick = () => $('confirm').classList.add('hidden');
  $('cYes').onclick = () => { localStorage.removeItem(KEY); save = C.newSave(); persist(); location.reload(); };
};

/* ---------- loop ---------- */
const STEP = 1 / 60;
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (mode === 'run' && world) {
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 5) { world.step(STEP, { dir: inputDir() }); acc -= STEP; n++; if (world.ended) break; }
    if (n >= 5) acc = 0;
    handleEvents(world);
    if (world) { R.draw(world, dt); updateHUD(); }
  } else if (mode === 'summary' && world) {
    R.draw(world, dt);
  } else if (preview) {
    preview.ev.length = 0;
    R.draw(preview, dt);
  }
  if (hintT > 0) { hintT -= dt; if (hintT <= 0) $('hint').style.opacity = 0; }
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
requestAnimationFrame(frame);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

// small hook for automated tests
window.__db = { get save() { return save; }, get world() { return world; }, get mode() { return mode; }, get preview() { return preview; }, R, startRun, showTab, C, persist, get lastRes() { return lastRes; }, watchAd };
})();
