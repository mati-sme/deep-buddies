// Mid-game landscape screenshots. node test/shot-wide.js [baseUrl] [outDir]
const { chromium } = require('playwright-core');
const BASE = process.argv[2] || 'http://localhost:8765/';
const OUT = process.argv[3] || '/tmp';
const VPS = [
  { name: '1920x1080', viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
];
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  for (const vp of VPS) {
    const ctx = await browser.newContext(vp);
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await ctx.addInitScript(() => {
      if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded', '1');
      const up = { sharpen: 14, pick1: 1, pick2: 1, pick3: 1, pick4: 1, swing: 8, sword1: 1, sword2: 1, sword3: 1, wtrain: 8, tank: 15, wick: 3, oilfind: 6, flare: 1, boots: 8, bag: 12, armor: 2, bdig: 12, bpow: 4, sniff: 3, gemhunt: 1, bfight: 3, dyn: 1, appraise: 15, veins: 5 };
      const s = Object.assign({ v: 1, coins: 0, up: {}, relics: 0, pr: {}, bestDepth: 0, bestEver: 0, runs: 0, caveIns: 0, coinsShaft: 0, coinsTotal: 0, relicsTotal: 0, muted: false, autoBuy: false, playTime: 0, seed: 1 }, { up, pr: { p_value: 3, p_power: 6, evo1: 1, evo2: 1 }, relics: 40, relicsTotal: 900, caveIns: 6, runs: 300, bestDepth: 90, bestEver: 260, coins: 12345, seenIntro: true });
      localStorage.setItem('deep-buddies-save-v1', JSON.stringify(s));
    });
    await page.goto(BASE); await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}/wide-${vp.name}-camp.png` });
    await page.click('#btnDig', { force: true });
    await page.evaluate(() => { window.__bot = setInterval(() => { const w = window.__db.world; if (w && !w.ended) window.__db.C.botThink(w); }, 30); });
    await page.waitForTimeout(10000);
    if (vp.hasTouch) {
      const cdp = await ctx.newCDPSession(page);
      const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
      await touch('touchStart', 150, 300); for (let i = 1; i <= 6; i++) { await touch('touchMove', 150 + i * 3, 300 + i * 6); await page.waitForTimeout(30); }
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/wide-${vp.name}-run.png` }); await touch('touchEnd');
    } else {
      await page.screenshot({ path: `${OUT}/wide-${vp.name}-run.png` });
    }
    await page.evaluate(() => clearInterval(window.__bot));
    console.log(vp.name, 'errors', errs);
    await ctx.close();
  }
  await browser.close();
})();
