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
  const r = await page.goto(URL, { waitUntil: 'load' });
  ok(r.status() === 200, 'page 200');
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/db-camp.png' });
  ok(await page.isVisible('#btnDig'), 'dig button visible');
  // run 1: real input (tap the block below the miner a few times, use dpad), then bot
  await page.click('#btnDig', { force: true });
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => window.__db.mode === 'run'), 'run started');
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
  const mid = await page.evaluate(() => ({ y: window.__db.world.player.y, goal: window.__db.world.player.goal }));
  await touch('touchEnd');
  await page.waitForTimeout(100);
  ok(joyVis, 'joystick ring shows while dragging');
  ok(mid.y >= yBefore + 1, `touch-drag down moved/dug player: y ${yBefore} -> ${mid.y}`);
  ok(mid.goal === null, 'drag did not start tap-to-dig pathing');
  ok(await page.evaluate(() => document.getElementById('joy').classList.contains('hidden')), 'joystick hidden after release');
  // drag sideways
  const xBefore = await page.evaluate(() => window.__db.world.player.x);
  await touch('touchStart', 150, 500);
  for (let i = 1; i <= 8; i++) { await touch('touchMove', 150 + i * 10, 502); await page.waitForTimeout(20); }
  for (let i = 0; i < 20; i++) { await touch('touchMove', 230, 502 + (i % 2)); await page.waitForTimeout(60); }
  await touch('touchEnd');
  const xAfter = await page.evaluate(() => window.__db.world.player.x);
  ok(xAfter > xBefore, `touch-drag right moved/dug player: x ${xBefore} -> ${xAfter}`);
  // short tap with paw mode: commands Pip, not the player
  await page.click('#btnCmd', { force: true });
  await touch('touchStart', 100, 700); await page.waitForTimeout(60); await touch('touchEnd');
  await page.waitForTimeout(50);
  const cmd = await page.evaluate(() => ({ b: window.__db.world.buddy.goal, p: window.__db.world.player.goal, on: document.getElementById('btnCmd').classList.contains('on') }));
  ok(cmd.b && cmd.b.kind === 'cmd' && !cmd.p && !cmd.on, 'short tap in 🐾 mode sends Pip: ' + JSON.stringify(cmd.b));
  // short tap without paw mode: tap-to-dig goal
  await touch('touchStart', 300, 650); await page.waitForTimeout(60); await touch('touchEnd');
  await page.waitForTimeout(30);
  ok(await page.evaluate(() => !!window.__db.world.player.goal || window.__db.world.ended), 'short tap sets a dig target');
  await page.evaluate(() => { window.__bot = setInterval(() => { const w = window.__db.world; if (w && !w.ended) window.__db.C.botThink(w); }, 30); });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + '/db-run.png' });
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 30000 });
  await page.screenshot({ path: OUT + '/db-summary.png' });
  const s1 = await page.evaluate(() => ({ coins: window.__db.save.coins, runs: window.__db.save.runs, best: window.__db.save.bestDepth }));
  ok(s1.runs === 1 && s1.best > 0, 'run 1 done (most of its 10 s spent on joystick checks): ' + JSON.stringify(s1));
  await page.click('#sumMap', { force: true });
  await page.waitForTimeout(400);
  // buy tank
  await page.evaluate(() => { window.__db.save.coins = Math.max(window.__db.save.coins, 50); });
  await page.click('#upMap .node.br-lamp >> nth=0', { force: true });
  await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + '/db-map.png' });
  await page.click('#buyUp', { force: true });
  const tank = await page.evaluate(() => window.__db.save.up.tank || 0);
  ok(tank === 1, 'bought Bigger Oil Tank');
  // second run with longer oil, also test tap-to-dig
  await page.click('.tabs button[data-tab=home]', { force: true });
  await page.click('#btnDig', { force: true });
  await page.waitForTimeout(300);
  const oilMax = await page.evaluate(() => window.__db.world.st.oilMax);
  ok(oilMax === 12, 'upgrade applied (oil ' + oilMax + ')');
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 40000 });
  await page.click('#sumDig', { force: true });
  await page.waitForTimeout(200);
  await page.click('#btnSurface', { force: true });
  await page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 10000 });
  await page.click('#sumMap', { force: true });
  // prestige: fake a deep shaft
  await page.evaluate(() => { const s = window.__db.save; s.bestDepth = 130; s.bestEver = Math.max(130, s.bestEver); s.coinsShaft = 1e6; window.__db.persist(); window.__db.showTab('relic'); });
  await page.waitForTimeout(300);
  await page.screenshot({ path: OUT + '/db-relic.png' });
  await page.click('#btnCave', { force: true });
  await page.click('#cYes', { force: true });
  await page.waitForTimeout(500);
  const s2 = await page.evaluate(() => ({ relics: window.__db.save.relics, caveIns: window.__db.save.caveIns, tank: window.__db.save.up.tank || 0, coins: window.__db.save.coins }));
  ok(s2.caveIns === 1 && s2.relics > 0 && s2.tank === 0, 'cave-in: ' + JSON.stringify(s2));
  await page.click('#prMap .node >> nth=0', { force: true });
  await page.click('#buyPr', { force: true });
  const pv = await page.evaluate(() => window.__db.save.pr.p_value || 0);
  ok(pv === 1, 'bought relic node Ancient Lore');
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  const s3 = await page.evaluate(() => ({ relics: window.__db.save.relics, caveIns: window.__db.save.caveIns, pv: window.__db.save.pr.p_value, runs: window.__db.save.runs }));
  ok(s3.caveIns === 1 && s3.pv === 1 && s3.runs === 3, 'save survived reload: ' + JSON.stringify(s3));
  // desktop check with keyboard
  const dpage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  dpage.on('console', (m) => { if (m.type() === 'error') errors.push('desktop console: ' + m.text()); });
  dpage.on('pageerror', (e) => errors.push('desktop pageerror: ' + e.message));
  await dpage.goto(URL, { waitUntil: 'load' }); await dpage.waitForTimeout(500);
  await dpage.click('#btnDig', { force: true }); await dpage.keyboard.down('ArrowDown'); await dpage.waitForTimeout(2000); await dpage.keyboard.up('ArrowDown');
  const dy = await dpage.evaluate(() => window.__db.world.player.y);
  ok(dy >= 1, 'desktop keyboard dig works (y=' + dy + ')');
  // mouse drag joystick on desktop
  const dy0 = await dpage.evaluate(() => window.__db.world.player.y);
  await dpage.mouse.move(640, 400); await dpage.mouse.down(); await dpage.mouse.move(640, 470, { steps: 8 });
  let dug = false;
  for (let i = 0; i < 16; i++) { await dpage.waitForTimeout(100); const st = await dpage.evaluate(() => { const p = window.__db.world.player; return !!(p.dig && p.dig.y === p.y + 1); }); dug = dug || st; }
  await dpage.mouse.up();
  const dy1 = await dpage.evaluate(() => window.__db.world.player.y);
  ok(dy1 > dy0 || dug, `desktop mouse-drag joystick digs/moves down (y ${dy0} -> ${dy1}, digging below: ${dug})`);
  await dpage.screenshot({ path: OUT + '/db-desktop.png' });
  ok(errors.length === 0, 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
