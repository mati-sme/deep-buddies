// Silent 18 s store preview videos: about 1 s on the cover, a short crossfade, then a real dive played by a small bot.
// Frames are captured frame-exact: CDP virtual time moves timers and CSS animations by 1/30 s and the game is ticked by
// exactly 1/30 s per frame (__db.manual), so the result is smooth however slow capture is.
// node tools/cover/make-videos.js <outdir> [gameUrl]
const { chromium } = require('../../test/node_modules/playwright-core');
const path = require('path'), fs = require('fs'), { execFileSync } = require('child_process');
const OUT = process.argv[2] || '/workspace/tmp/videos', URL = process.argv[3] || 'http://localhost:8765/index.html';
const ROOT = path.resolve(__dirname, '../..'), FPS = 30, SECS = 18, COVER_F = 30, FADE_F = 8;
fs.mkdirSync(OUT, { recursive: true });
// a save from a few dives in: early pickaxe, some Pip skills, and no extra oil so the dive fits in the clip
const SAVE = { v: 2, coins: 140, up: { sharpen: 6, pick1: 1, pick2: 1, sword1: 1, wtrain: 2, wick: 2, sniff: 2, bdig: 3, boots: 2, veins: 1 }, relics: 0, pr: {},
  bestDepth: 31, bestEver: 31, runs: 6, caveIns: 0, coinsShaft: 2400, coinsTotal: 2400, relicsTotal: 0, muted: true, musicOff: true, autoBuy: false,
  playTime: 300, seed: 7, seenIntro: true, tutDone: true, goal: 8 };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cover(browser, w, h, scale, layout, file) {
  const p = await browser.newPage({ viewport: { width: 400, height: 300 } });
  const font = fs.readFileSync(path.join(ROOT, 'fonts/pixelify-sans.woff')).toString('base64');
  await p.setContent(`<style>@font-face{font-family:'Pixelify Sans';src:url(data:font/woff;base64,${font}) format('woff');font-weight:400 700}</style><body style="font-family:'Pixelify Sans'">.</body>`);
  await p.addScriptTag({ path: path.join(__dirname, 'cover.js') });
  await p.evaluate(() => document.fonts.load('700 40px "Pixelify Sans"'));
  const data = await p.evaluate(([w, h, s, l]) => { const c = document.createElement('canvas'); DBCover.drawCover(c, w, h, s, l); return c.toDataURL('image/png'); }, [w, h, scale, layout]);
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64')); await p.close();
}

async function video(browser, name, vw, vh, dpr, mobile, coverArgs) {
  const fd = path.join('/workspace/tmp', 'vid-' + name); fs.rmSync(fd, { recursive: true, force: true }); fs.mkdirSync(fd, { recursive: true });
  const OW = Math.round(vw * dpr), OH = Math.round(vh * dpr);
  await cover(browser, OW, OH, coverArgs[0], coverArgs[1], path.join(fd, 'cover.png'));
  const ctx = await browser.newContext({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile, serviceWorkers: 'block' });
  await ctx.addInitScript((s) => { localStorage.setItem('deep-buddies-save-v1', JSON.stringify(s)); }, SAVE);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL); await page.waitForFunction(() => window.__db && window.__db.mode === 'camp'); await sleep(1200);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'pause' });
  await page.evaluate(() => {
    const db = window.__db, T = db.C.T, want = (t) => t === T.ORE || t === T.CHEST || t === T.FLASK;
    db.manual(true); db.startRun();
    let lastPos = '', still = 0, side = 0;
    window.__bot = setInterval(() => {
      const w = db.world; db.keys.length = 0; if (db.mode !== 'run' || !w || w.ended) return;
      const p = w.player, pos = p.x + ',' + p.y; still = pos === lastPos ? still + 1 : 0; lastPos = pos;
      let best = null, bd = 99;
      for (let y = p.y - 1; y <= p.y + 4; y++) for (let x = p.x - 4; x <= p.x + 4; x++) {
        if (y < 0 || !want(w.tile(x, y)) || !w.row(y).seen[x]) continue;
        const d = Math.abs(x - p.x) + Math.abs(y - p.y) * 1.3; if (d < bd) { bd = d; best = [x, y]; }
      }
      let k = 'ArrowDown';
      if (still > 6) { side = side || (Math.random() < 0.5 ? -1 : 1); k = side < 0 ? 'ArrowLeft' : 'ArrowRight'; if (still > 12) side = -side; }
      else if (best) { const dx = best[0] - p.x, dy = best[1] - p.y; k = dx && (Math.abs(dx) >= Math.abs(dy) || dy <= 0) ? (dx > 0 ? 'ArrowRight' : 'ArrowLeft') : dy < 0 ? 'ArrowUp' : 'ArrowDown'; }
      else side = 0;
      db.keys.push(k);
    }, 120);
  });
  const GAME_F = SECS * FPS - COVER_F;
  for (let i = 0; i < GAME_F; i++) {
    const done = new Promise((r) => cdp.once('Emulation.virtualTimeBudgetExpired', r));
    await cdp.send('Emulation.setVirtualTimePolicy', { policy: 'advance', budget: 1000 / FPS }); await done;
    await page.evaluate((dt) => window.__db.tick(dt), 1 / FPS); // game time: exactly one frame (rAF timing under virtual time is not 1:1)
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(fd, `g${String(i).padStart(4, '0')}.png`), Buffer.from(shot.data, 'base64'));
  }
  const info = await page.evaluate(() => ({ mode: window.__db.mode, depth: window.__db.world && window.__db.world.player.y + 1 }));
  await ctx.close();
  // cover hold + crossfade, then gameplay
  execFileSync('python3', ['-c', `
from PIL import Image
import os
fd='${fd}'; W,H=${OW},${OH}
c=Image.open(fd+'/cover.png').convert('RGB').resize((W,H),Image.NEAREST)
g=Image.open(fd+'/g0000.png').convert('RGB').resize((W,H),Image.NEAREST)
for i in range(${COVER_F}):
  f=c if i < ${COVER_F - FADE_F} else Image.blend(c,g,(i-${COVER_F - FADE_F}+1)/(${FADE_F}+1))
  f.save(fd+'/a%04d.png'%i)
`]);
  const list = fs.readdirSync(fd).filter((f) => /^[ag]\d{4}\.png$/.test(f)).sort((a, b) => (a[0] === b[0] ? a.localeCompare(b) : a[0] === 'a' ? -1 : 1));
  list.forEach((f, i) => fs.renameSync(path.join(fd, f), path.join(fd, `f${String(i).padStart(4, '0')}.png`)));
  const out = path.join(OUT, `preview-${name}-${OW}x${OH}.mp4`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(fd, 'f%04d.png'), '-vf', `scale=${OW}:${OH}:flags=neighbor,format=yuv420p`,
    '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-movflags', '+faststart', out]);
  console.log('video', out, list.length, 'frames', (fs.statSync(out).size / 1e6).toFixed(1) + ' MB', JSON.stringify(info), 'errors', errs.length, errs.slice(0, 3));
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const only = process.env.ONLY;
  if (!only || only === 'landscape') await video(browser, 'landscape', 1920, 1080, 1, false, [6, 'land']);
  if (!only || only === 'portrait') await video(browser, 'portrait', 720, 1080, 1.5, true, [5.4, 'port']);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
