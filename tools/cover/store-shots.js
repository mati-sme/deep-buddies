// 1920x1080 store screenshots: an early dive, a deeper dive, the camp and the Upgrade Map. node tools/cover/store-shots.js <outdir> [url]
const { chromium } = require('../../test/node_modules/playwright-core');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || '/workspace/tmp/store-shots', URL = process.argv[3] || 'http://localhost:8765/index.html';
fs.mkdirSync(OUT, { recursive: true });
const base = { v: 2, relics: 0, pr: {}, caveIns: 0, relicsTotal: 0, muted: true, musicOff: true, autoBuy: false, seenIntro: true, tutDone: true, seed: 7 };
const EARLY = { ...base, coins: 140, up: { sharpen: 6, pick1: 1, pick2: 1, sword1: 1, wtrain: 2, wick: 2, sniff: 2, bdig: 3, boots: 2, veins: 1 }, bestDepth: 31, bestEver: 31, runs: 6, coinsShaft: 2400, coinsTotal: 2400, playTime: 300, goal: 8 };
const MID = { ...base, coins: 2600, up: { sharpen: 14, pick1: 1, pick2: 1, pick3: 1, swing: 4, sword1: 1, sword2: 1, wtrain: 6, tank: 7, wick: 4, oilfind: 3, flare: 1, boots: 5, bag: 6, armor: 2, bdig: 8, bpow: 3, sniff: 4, bbag: 3, gemhunt: 1, veins: 4, chests: 2, appraise: 6 },
  bestDepth: 62, bestEver: 62, runs: 24, coinsShaft: 41000, coinsTotal: 41000, playTime: 1500, goal: 12 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function page(browser, save) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, serviceWorkers: 'block' });
  await ctx.addInitScript((s) => localStorage.setItem('deep-buddies-save-v1', JSON.stringify(s)), save);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => window.__db && window.__db.mode === 'camp'); await sleep(1500);
  return p;
}
async function dive(p, secs) { // the same small bot as the preview video: digs down, detours for nearby ore and chests
  await p.evaluate(() => {
    const db = window.__db, T = db.C.T, want = (t) => t === T.ORE || t === T.CHEST || t === T.FLASK; db.startRun();
    let last = '', still = 0, side = 0;
    window.__bot = setInterval(() => {
      const w = db.world; db.keys.length = 0; if (db.mode !== 'run' || !w || w.ended) return;
      const pl = w.player, pos = pl.x + ',' + pl.y; still = pos === last ? still + 1 : 0; last = pos;
      let best = null, bd = 99;
      for (let y = pl.y; y <= pl.y + 4; y++) for (let x = pl.x - 2; x <= pl.x + 2; x++) { if (!want(w.tile(x, y)) || !w.row(y).seen[x]) continue; const d = Math.abs(x - pl.x) + Math.abs(y - pl.y) * 1.3; if (d < bd) { bd = d; best = [x, y]; } }
      let k = 'ArrowDown';
      if (still > 6) { side = side || (Math.random() < 0.5 ? -1 : 1); k = side < 0 ? 'ArrowLeft' : 'ArrowRight'; if (still > 12) side = -side; }
      else if (best) { const dx = best[0] - pl.x, dy = best[1] - pl.y; k = dx && (Math.abs(dx) >= Math.abs(dy) || dy <= 0) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy < 0 ? 'ArrowUp' : 'ArrowDown'; }
      else side = 0;
      db.keys.push(k);
    }, 120);
  });
  await sleep(secs * 1000);
}
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  let p = await page(b, EARLY); await dive(p, 6.5); await p.screenshot({ path: path.join(OUT, '1-dig-1920x1080.png') }); console.log('1-dig', p.errs); await p.context().close();
  p = await page(b, MID); await dive(p, 13); await p.screenshot({ path: path.join(OUT, '2-deeper-1920x1080.png') }); console.log('2-deeper', p.errs, await p.evaluate(() => window.__db.world && window.__db.world.player.y + 1)); await p.context().close();
  p = await page(b, EARLY); await p.screenshot({ path: path.join(OUT, '3-camp-1920x1080.png') }); console.log('3-camp', p.errs);
  await p.context().close();
  p = await page(b, MID); await p.evaluate(() => window.__db.showTab('map')); await sleep(700); await p.screenshot({ path: path.join(OUT, '4-upgrade-map-1920x1080.png') }); console.log('4-map', p.errs); await p.context().close();
  await b.close();
})();
