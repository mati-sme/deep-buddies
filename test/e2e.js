// Headless test: load, play a run (bot), buy upgrade, prestige, reload save. node test/e2e.js [url]
const { chromium } = require('playwright-core');
const URL = process.argv[2] || 'http://localhost:8765/';
const OUT = process.env.OUT || '/tmp';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
  const EMOJI = '[\\p{Extended_Pictographic}\\u2190-\\u21FF\\u2B00-\\u2BFF\\uFE0F]';
  const noEmoji = (pg, where) => pg.evaluate(([re]) => { const R = new RegExp(re, 'u'); const t = document.getElementById('app').innerText + ' ' + [...document.querySelectorAll('[title],[aria-label]')].map((e) => (e.title || '') + (e.getAttribute('aria-label') || '')).join(' '); const m = t.match(new RegExp(re, 'gu')); return m ? [...new Set(m)].join(' ') : ''; }, [EMOJI]);
  const decimals = (pg) => pg.evaluate(() => { const t = ['hud', 'camp', 'summary'].map((id) => { const e = document.getElementById(id); return e && !e.classList.contains('hidden') ? e.innerText : ''; }).join(' '); return (t.match(/\d+\.\d+(?![KMBT])/g) || []).join(' '); });
  const r = await page.goto(URL, { waitUntil: 'load' });
  ok(r.status() === 200, 'page 200');
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/db-first-load.png' });
  // a brand-new player lands straight in a guided first dive (no menu)
  const t0 = await page.evaluate(() => ({ mode: window.__db.mode, tut: window.__db.tut, hold: window.__db.world && window.__db.world.oilHold, oil: window.__db.world && window.__db.world.oil, campHidden: document.getElementById('camp').classList.contains('hidden'), tutVis: !document.getElementById('tut').classList.contains('hidden') }));
  ok(t0.mode === 'run' && t0.campHidden && t0.tut && t0.tut.step === 0 && t0.tutVis, 'new player starts directly in the tutorial dive: ' + JSON.stringify(t0));
  ok(t0.hold === true && t0.oil === 15, 'lantern oil paused until the first blocks are dug (15 s)');
  ok(await page.evaluate(() => document.getElementById('btnCmd').classList.contains('hidden')), 'paw button hidden on the first dives');
  ok((await page.$('#dpad')) === null, 'no on-screen d-pad');
  ok(await page.evaluate(() => document.getElementById('joy').classList.contains('hidden')), 'joystick invisible when idle');
  // touch-drag joystick (real touch events through CDP)
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  const yBefore = await page.evaluate(() => window.__db.world.player.y);
  await touch('touchStart', 200, 600);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', 200, 600 + i * 10); await page.waitForTimeout(20); }
  const joyVis = await page.evaluate(() => !document.getElementById('joy').classList.contains('hidden'));
  for (let i = 0; i < 25; i++) { await touch('touchMove', 200 + (i % 2), 680); await page.waitForTimeout(60); }
  const mid = await page.evaluate(() => ({ y: window.__db.world.player.y, goal: window.__db.world.player.goal, tut: window.__db.tut, hold: window.__db.world.oilHold }));
  await touch('touchEnd');
  await page.waitForTimeout(100);
  ok(joyVis, 'joystick ring shows while dragging');
  ok(mid.y >= yBefore + 1, `touch-drag down moved/dug player: y ${yBefore} -> ${mid.y}`);
  ok(mid.goal === null, 'drag did not start tap-to-dig pathing');
  ok(mid.hold === false && mid.tut && mid.tut.step >= 1, 'tutorial advanced after digging, oil now burning: step ' + (mid.tut && mid.tut.step));
  ok(await page.evaluate(() => !!window.__db.R.arrow || !window.__db.tut || window.__db.tut.step >= 3), 'tutorial arrow points at the next target');
  ok(await page.evaluate(() => document.getElementById('joy').classList.contains('hidden')), 'joystick hidden after release');
  // drag sideways
  const xBefore = await page.evaluate(() => window.__db.world.player.x);
  await touch('touchStart', 150, 500);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', 150 + i * 10, 502); await page.waitForTimeout(20); }
  for (let i = 0; i < 20; i++) { await touch('touchMove', 230, 502 + (i % 2)); await page.waitForTimeout(60); }
  await touch('touchEnd');
  const xAfter = await page.evaluate(() => window.__db.world.player.x);
  ok(xAfter > xBefore, `touch-drag right moved/dug player: x ${xBefore} -> ${xAfter}`);
  ok(!(await noEmoji(page)), 'no emoji in the HUD: ' + (await noEmoji(page)));
  // music: an analyser on the music bus hears the synthesized track
  const mus = await page.evaluate(async () => {
    const A = window.__db.A; A.init(); const ac = A.ctx; if (ac.state !== 'running') await ac.resume();
    const an = ac.createAnalyser(); an.fftSize = 2048; A.musicBus.connect(an);
    const buf = new Float32Array(an.fftSize); let sum = 0, n = 0, peak = 0;
    for (let k = 0; k < 30; k++) { await new Promise((r) => setTimeout(r, 100)); an.getFloatTimeDomainData(buf); for (const v of buf) { sum += v * v; n++; peak = Math.max(peak, Math.abs(v)); } }
    return { state: ac.state, rms: Math.sqrt(sum / n), peak, gain: A.musicBus.gain.value };
  });
  ok(mus.state === 'running' && mus.rms > 0.003 && mus.peak < 1, 'music is playing (synth): ' + JSON.stringify(mus));
  await page.evaluate(() => { window.__bot = setInterval(() => { const w = window.__db.world; if (w && !w.ended) window.__db.C.botThink(w); }, 30); });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + '/db-run.png' });
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 40000 });
  await page.screenshot({ path: OUT + '/db-summary.png' });
  const s1 = await page.evaluate(() => ({ coins: window.__db.save.coins, runs: window.__db.save.runs, best: window.__db.save.bestDepth, goal: window.__db.save.goal, tutDone: window.__db.save.tutDone, title: document.querySelector('#sumCard h2').textContent }));
  ok(s1.runs === 1 && s1.best > 0 && s1.tutDone, 'run 1 done: ' + JSON.stringify(s1));
  ok(s1.title.includes('Dive complete'), 'first summary says "Dive complete!"');
  ok(s1.goal >= 1, 'goals completed during the first dive: ' + s1.goal);
  ok(s1.coins >= 50, 'first upgrade (Bigger Oil Tank, 50) affordable after dive 1: ' + s1.coins + ' coins');
  ok(Number.isInteger(s1.coins), 'coins are whole numbers');
  ok(!(await decimals(page)), 'no decimal numbers on the summary: ' + (await decimals(page)));
  ok(!(await noEmoji(page)), 'no emoji on the summary');
  await page.click('#sumMap', { force: true });
  await page.waitForTimeout(400);
  const mv = await page.evaluate(() => { const n = [...document.querySelectorAll('#upMap .node')]; return { show: n.filter((e) => e.classList.contains('v-show')).length, tease: n.filter((e) => e.classList.contains('v-tease')).length, all: n.length }; });
  ok(mv.show >= 1 && mv.show <= 10 && mv.show + mv.tease < mv.all, 'upgrade map reveals gradually: ' + JSON.stringify(mv));
  ok(!(await noEmoji(page)), 'no emoji on the upgrade map: ' + (await noEmoji(page)));
  // buy tank
  await page.evaluate(() => { window.__db.save.coins = Math.max(window.__db.save.coins, 50); });
  await page.click('#upMap .node[data-id=tank]', { force: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/db-map.png' });
  await page.click('#buyUp', { force: true });
  const tank = await page.evaluate(() => ({ t: window.__db.save.up.tank || 0, buys: window.__db.save.tally.buys }));
  ok(tank.t === 1 && tank.buys === 1, 'bought Bigger Oil Tank (purchase counted for goals)');
  // second run with longer oil
  await page.click('.tabs button[data-tab=home]', { force: true });
  await page.waitForTimeout(200);
  ok(await page.isVisible('#btnDig') && await page.isVisible('#goalCard'), 'camp shows the DIG button and goal card');
  ok(!(await noEmoji(page)), 'no emoji in camp: ' + (await noEmoji(page)));
  ok(!(await decimals(page)), 'no decimals in camp: ' + (await decimals(page)));
  await page.screenshot({ path: OUT + '/db-camp.png' });
  await page.click('#btnDig', { force: true });
  await page.waitForTimeout(300);
  const oilMax = await page.evaluate(() => window.__db.world.st.oilMax);
  ok(oilMax === 18, 'upgrade applied (oil ' + oilMax + ')');
  ok(await page.evaluate(() => !document.getElementById('goalChip').classList.contains('hidden') && document.getElementById('goalChipTxt').textContent.length > 3), 'goal chip shows in the HUD');
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 40000 });
  await page.click('#sumDig', { force: true });
  await page.waitForTimeout(300);
  // dive 3: paw button now available; short tap in paw mode commands Pip, not the player
  await page.evaluate(() => { clearInterval(window.__bot); window.__db.world.player.goal = null; });
  ok(await page.isVisible('#btnCmd'), 'paw button shows from dive 3');
  await page.click('#btnCmd', { force: true });
  await touch('touchStart', 100, 700); await page.waitForTimeout(60); await touch('touchEnd');
  await page.waitForTimeout(50);
  const cmd = await page.evaluate(() => ({ b: window.__db.world.buddy.goal, p: window.__db.world.player.goal, on: document.getElementById('btnCmd').classList.contains('on') }));
  ok(cmd.b && cmd.b.kind === 'cmd' && !cmd.p && !cmd.on, 'short tap in paw mode sends Pip: ' + JSON.stringify(cmd));
  await touch('touchStart', 300, 650); await page.waitForTimeout(60); await touch('touchEnd');
  await page.waitForTimeout(30);
  ok(await page.evaluate(() => !!window.__db.world.player.goal || window.__db.world.ended), 'short tap sets a dig target');
  await page.click('#btnSurface', { force: true });
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 10000 });
  await page.click('#sumMap', { force: true });
  // prestige: fake a deep shaft
  await page.evaluate(() => { const s = window.__db.save; s.bestDepth = 130; s.bestEver = Math.max(130, s.bestEver); s.coinsShaft = 1e6; window.__db.persist(); window.__db.showTab('relic'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/db-relic.png' });
  ok(!(await noEmoji(page)), 'no emoji on the relic map: ' + (await noEmoji(page)));
  await page.click('#btnCave', { force: true });
  await page.click('#cYes', { force: true });
  await page.waitForTimeout(500);
  const s2 = await page.evaluate(() => ({ relics: window.__db.save.relics, caveIns: window.__db.save.caveIns, tank: window.__db.save.up.tank || 0, coins: window.__db.save.coins }));
  ok(s2.caveIns === 1 && s2.relics > 0 && s2.tank === 0, 'cave-in: ' + JSON.stringify(s2));
  await page.click('#prMap .node[data-id=p_value]', { force: true });
  await page.click('#buyPr', { force: true });
  const pv = await page.evaluate(() => window.__db.save.pr.p_value || 0);
  ok(pv === 1, 'bought relic node Ancient Lore');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  const s3 = await page.evaluate(() => ({ relics: window.__db.save.relics, caveIns: window.__db.save.caveIns, pv: window.__db.save.pr.p_value, runs: window.__db.save.runs, mode: window.__db.mode }));
  ok(s3.caveIns === 1 && s3.pv === 1 && s3.runs === 3 && s3.mode === 'camp', 'save survived reload, returning player sees camp: ' + JSON.stringify(s3));
  ok(!(await noEmoji(page)), 'no emoji in settings/camp after reload');
  // migration: an old v1 save (coins in old units, no tutorial/goal fields)
  const mctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await mctx.addInitScript(() => { if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1'); localStorage.setItem('deep-buddies-save-v1', JSON.stringify({ v: 1, coins: 123.4, up: { tank: 3, sharpen: 2, pick1: 1 }, relics: 0, pr: {}, bestDepth: 40, bestEver: 40, runs: 25, caveIns: 0, coinsShaft: 900.5, coinsTotal: 900.5, relicsTotal: 0, muted: false, autoBuy: false, playTime: 600, seed: 1, seenIntro: true })); });
  const mp = await mctx.newPage(); mp.on('pageerror', (e) => errors.push('migration pageerror: ' + e.message));
  await mp.goto(URL, { waitUntil: 'load' }); await mp.waitForTimeout(600);
  const mg = await mp.evaluate(() => { const s = window.__db.save; return { v: s.v, coins: s.coins, tank: s.up.tank, tutDone: s.tutDone, goal: s.goal, mode: window.__db.mode, tally: !!s.tally }; });
  ok(mg.v === 2 && mg.coins === 1234 && mg.tank === 3 && mg.tutDone && mg.mode === 'camp' && mg.tally, 'v1 save migrated (coins x10, upgrades kept, no tutorial): ' + JSON.stringify(mg));
  ok(mg.goal >= 7, 'migrated save skips goals it already passed (goal #' + mg.goal + ')');
  await mctx.close();
  // desktop check with keyboard (fresh player -> tutorial dive)
  const dpage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  dpage.on('console', (m) => { if (m.type() === 'error') errors.push('desktop console: ' + m.text()); });
  dpage.on('pageerror', (e) => errors.push('desktop pageerror: ' + e.message));
  await dpage.goto(URL, { waitUntil: 'load' }); await dpage.waitForTimeout(500);
  ok(await dpage.evaluate(() => window.__db.mode === 'run' && !!document.querySelector('#tutArt .keys')), 'desktop tutorial shows keycaps');
  await dpage.keyboard.down('ArrowDown'); await dpage.waitForTimeout(2000); await dpage.keyboard.up('ArrowDown');
  const dy = await dpage.evaluate(() => window.__db.world.player.y);
  ok(dy >= 1, 'desktop keyboard dig works (y=' + dy + ')');
  await dpage.click('#tutSkip', { force: true }); await dpage.waitForTimeout(100);
  ok(await dpage.evaluate(() => !window.__db.tut && window.__db.save.tutDone && document.getElementById('tut').classList.contains('hidden')), 'skip tutorial works');
  // mouse drag joystick on desktop
  const dy0 = await dpage.evaluate(() => window.__db.world.player.y);
  await dpage.mouse.move(640, 400); await dpage.mouse.down(); await dpage.mouse.move(640, 470, { steps: 8 });
  let dug = false;
  for (let i = 0; i < 16; i++) { await dpage.waitForTimeout(100); const st = await dpage.evaluate(() => { const p = window.__db.world.player; return !!(p.dig && p.dig.y === p.y + 1); }); dug = dug || st; }
  await dpage.mouse.up();
  const dy1 = await dpage.evaluate(() => window.__db.world.player.y);
  ok(dy1 > dy0 || dug, `desktop mouse-drag joystick digs/moves down (y ${dy0} -> ${dy1}, digging below: ${dug})`);
  await dpage.screenshot({ path: OUT + '/db-desktop.png' });
  // ---------------- landscape / wide screens ----------------
  for (const vp of [
    { name: 'desktop-1920x1080', width: 1920, height: 1080, dpr: 1, touch: false },
    { name: 'ultrawide-2560x1080', width: 2560, height: 1080, dpr: 1, touch: false },
    { name: 'phone-landscape-844x390', width: 844, height: 390, dpr: 3, touch: true }
  ]) await landscape(browser, vp, ok, errors);
  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

async function fits(page, sels) {
  return page.evaluate((sels) => {
    const W = innerWidth, H = innerHeight, bad = [];
    const d = document.documentElement;
    if (d.scrollWidth > W + 1 || d.scrollHeight > H + 1) bad.push(`page overflow ${d.scrollWidth}x${d.scrollHeight}`);
    for (const s of sels) {
      const e = document.querySelector(s);
      if (!e || e.offsetParent === null && getComputedStyle(e).position !== 'fixed') { bad.push(s + ' not visible'); continue; }
      const r = e.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) bad.push(s + ' zero size');
      if (r.left < -1 || r.top < -1 || r.right > W + 1 || r.bottom > H + 1) bad.push(`${s} outside viewport (${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)})`);
    }
    return bad;
  }, sels);
}
async function landscape(browser, vp, ok, errors) {
  const OUT = process.env.OUT || '/tmp';
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.dpr, hasTouch: vp.touch, isMobile: vp.touch });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(vp.name + ' console: ' + m.text()); });
  page.on('pageerror', (e) => errors.push(vp.name + ' pageerror: ' + e.message));
  const P = `[${vp.name}] `;
  await page.goto(URL, { waitUntil: 'load' }); await page.waitForTimeout(600);
  let bad = await fits(page, ['.hud-top', '.tut-card', '#tutSkip', '#cv']);
  ok(bad.length === 0, P + 'tutorial dive layout fits' + (bad.length ? ': ' + bad.join('; ') : ''));
  await page.screenshot({ path: `${OUT}/db-${vp.name}-tutorial.png` });
  await page.evaluate(() => { const s = window.__db.save; s.runs = 2; s.tutDone = true; s.coins = 200; window.__db.persist(); });
  await page.evaluate(() => { window.onbeforeunload = null; }); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(600);
  await page.evaluate(() => { const s = window.__db.save; if (s.runs < 2) { s.runs = 2; s.tutDone = true; window.__db.persist(); location.reload(); } });
  await page.waitForTimeout(400);
  bad = await fits(page, ['#btnDig', '.home-card', '.tabs', '.topbar', '#cv']);
  ok(bad.length === 0, P + 'camp layout fits, no overflow' + (bad.length ? ': ' + bad.join('; ') : ''));
  const cam = await page.evaluate(() => ({ cw: document.getElementById('cv').clientWidth, wide: document.body.classList.contains('wide'), tabsDir: getComputedStyle(document.querySelector('.tabs')).flexDirection }));
  ok(cam.cw >= vp.width - 1 && cam.wide && cam.tabsDir === 'column', P + `full-width canvas (${cam.cw}px) and side tab rail`);
  await page.screenshot({ path: `${OUT}/db-${vp.name}-camp.png` });
  await page.click('#btnDig', { force: true }); await page.waitForTimeout(400);
  const L = await page.evaluate(() => { const R = window.__db.R, w = window.__db.world; return { W: w.W, ts: R.ts, dpr: R.dpr, span: w.W * R.ts, vw: R.w, rows: R.h / R.ts, light: w.lightR() }; });
  const devPx = L.ts * L.dpr;
  ok(L.W > 11, P + `wider shaft: ${L.W} columns`);
  ok(Math.abs(devPx / 16 - Math.round(devPx / 16)) < 0.01 || Math.abs(devPx / 8 - Math.round(devPx / 8)) < 0.01, P + `crisp whole-pixel tiles: ${L.ts} css px = ${devPx} device px (${devPx / 16}x)`);
  ok(L.span >= L.vw * 0.8, P + `cave uses the width: ${Math.round(L.span)} of ${L.vw}px, ${L.rows.toFixed(1)} rows visible`);
  bad = await fits(page, ['.hud-top', '.hud-right', '#btnCmd', '#btnSurface']);
  ok(bad.length === 0, P + 'HUD fits' + (bad.length ? ': ' + bad.join('; ') : ''));
  const y0 = await page.evaluate(() => window.__db.world.player.y);
  let dug = false;
  if (vp.touch) {
    const cdp = await ctx.newCDPSession(page);
    const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await touch('touchStart', vp.width * 0.3, vp.height * 0.5);
    for (let i = 1; i <= 8; i++) { await touch('touchMove', vp.width * 0.3, vp.height * 0.5 + i * 8); await page.waitForTimeout(20); }
    ok(await page.evaluate(() => !document.getElementById('joy').classList.contains('hidden')), P + 'joystick appears on touch-drag');
    for (let i = 0; i < 25; i++) { await touch('touchMove', vp.width * 0.3 + (i % 2), vp.height * 0.5 + 64); await page.waitForTimeout(60); dug = dug || await page.evaluate(() => { const p = window.__db.world.player; return !!(p.dig && p.dig.y === p.y + 1); }); }
    const goal = await page.evaluate(() => window.__db.world.player.goal);
    await touch('touchEnd');
    ok(goal === null, P + 'drag did not trigger tap pathing');
    await page.waitForTimeout(100);
    await page.click('#btnCmd', { force: true });
    await touch('touchStart', vp.width * 0.6, vp.height * 0.6); await page.waitForTimeout(50); await touch('touchEnd'); await page.waitForTimeout(50);
    ok(await page.evaluate(() => { const g = window.__db.world.buddy.goal; return !!g && g.kind === 'cmd'; }), P + 'short tap in paw mode works');
  } else {
    await page.keyboard.down('ArrowDown');
    for (let i = 0; i < 20; i++) { await page.waitForTimeout(100); dug = dug || await page.evaluate(() => { const p = window.__db.world.player; return !!(p.dig && p.dig.y === p.y + 1); }); }
    await page.keyboard.up('ArrowDown');
  }
  const y1 = await page.evaluate(() => window.__db.world.player.y);
  ok(y1 > y0 || dug, P + `${vp.touch ? 'touch joystick' : 'keyboard'} digs/moves (y ${y0} -> ${y1})`);
  await page.evaluate(() => { window.__bot = setInterval(() => { const w = window.__db.world; if (w && !w.ended) window.__db.C.botThink(w); }, 30); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/db-${vp.name}-run.png` });
  if (vp.touch) { // live orientation change mid-run, then back
    await page.setViewportSize({ width: vp.height, height: vp.width }); await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const R = window.__db.R; return { wide: document.body.classList.contains('wide'), cw: document.getElementById('cv').clientWidth, ts: R.ts, vw: innerWidth, px: R.sx(window.__db.world.player.px) }; });
    bad = await fits(page, ['.hud-top', '#btnCmd']);
    ok(!r.wide && r.cw === r.vw && r.px >= 0 && r.px <= r.vw && bad.length === 0, P + `rotate to portrait mid-run: layout adapts, player on screen (x=${Math.round(r.px)}/${r.vw})` + (bad.length ? ': ' + bad.join('; ') : ''));
    await page.setViewportSize({ width: vp.width, height: vp.height }); await page.waitForTimeout(500);
    ok(await page.evaluate(() => document.body.classList.contains('wide')), P + 'rotate back to landscape');
  }
  await page.evaluate(() => clearInterval(window.__bot));
  await page.click('#btnSurface', { force: true });
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 15000 });
  await page.waitForTimeout(400);
  bad = await fits(page, ['#sumCard', '#sumMap', '#sumDig']);
  ok(bad.length === 0, P + 'run summary fits' + (bad.length ? ': ' + bad.join('; ') : ''));
  await page.click('#sumMap', { force: true }); await page.waitForTimeout(400);
  await page.evaluate(() => { window.__db.save.coins += 100; });
  await page.click('#upMap .node[data-id=tank]', { force: true }); await page.waitForTimeout(200);
  const m = await page.evaluate(() => { const r = document.getElementById('upMap').getBoundingClientRect(); return { w: r.width, h: r.height }; });
  bad = await fits(page, ['#upMap', '#upSheet', '#buyUp']);
  ok(bad.length === 0 && m.w >= vp.width * 0.8 && m.h >= vp.height * 0.6, P + `upgrade map opens roomy (${Math.round(m.w)}x${Math.round(m.h)}) with detail panel` + (bad.length ? ': ' + bad.join('; ') : ''));
  await page.click('#buyUp', { force: true });
  ok(await page.evaluate(() => (window.__db.save.up.tank || 0) === 1), P + 'bought upgrade from the map');
  await page.screenshot({ path: `${OUT}/db-${vp.name}-map.png` });
  await page.evaluate(() => { const s = window.__db.save; s.bestDepth = 120; window.__db.showTab('relic'); });
  await page.waitForTimeout(300);
  bad = await fits(page, ['#caveCard', '#prMap', '#btnCave']);
  ok(bad.length === 0, P + 'relic map fits' + (bad.length ? ': ' + bad.join('; ') : ''));
  await ctx.close();
}
