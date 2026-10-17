// Mid-game screenshots for the README/report. node test/shot.js
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1.5, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await ctx.addInitScript(() => {
    if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
    const up = { sharpen: 14, pick1: 1, pick2: 1, pick3: 1, pick4: 1, swing: 8, sword1: 1, sword2: 1, sword3: 1, wtrain: 8, tank: 15, wick: 3, oilfind: 6, flare: 1, boots: 8, bag: 12, armor: 2, bdig: 12, bpow: 4, sniff: 3, gemhunt: 1, bfight: 3, dyn: 1, appraise: 15, veins: 5 };
    const s = Object.assign({ v: 1, coins: 0, up: {}, relics: 0, pr: {}, bestDepth: 0, bestEver: 0, runs: 0, caveIns: 0, coinsShaft: 0, coinsTotal: 0, relicsTotal: 0, muted: false, autoBuy: false, playTime: 0, seed: 1 }, { up, pr: { p_value: 3, p_power: 6, evo1: 1, evo2: 1 }, relics: 40, relicsTotal: 900, caveIns: 6, runs: 300, bestDepth: 90, bestEver: 260, coins: 12345, seenIntro: true });
    localStorage.setItem('deep-buddies-save-v1', JSON.stringify(s));
  });
  await page.goto('http://localhost:8765/'); await page.waitForTimeout(600);
  await page.screenshot({ path: '/tmp/shot-camp.png' });
  await page.click('#btnDig', { force: true });
  await page.evaluate(() => { setInterval(() => { const w = window.__db.world; if (w && !w.ended) window.__db.C.botThink(w); }, 30); });
  for (let i = 1; i <= 8; i++) { await page.waitForTimeout(2500); await page.screenshot({ path: `/tmp/shot-run${i}.png` }); const d = await page.evaluate(() => window.__db.world && [window.__db.world.player.y, window.__db.world.creatures.filter(c=>c.awake&&!c.dead).length]); console.log(i, d); }
  console.log('errors', errs);
  await browser.close();
})();
