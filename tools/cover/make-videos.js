// Silent 18 s store preview videos: about 1 s on the cover, a short crossfade, then a real dive played by a small bot.
// Frames are captured frame-exact on a virtual clock: per frame the game is ticked by exactly 1/30 s (__db.manual), page
// timers run from a virtual queue and CSS animations/transitions are stepped by 1/30 s. So the video is smooth and in
// real game speed however slow the capture is. (CDP virtual time can't be used: screenshots stall while it is paused.)
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
  await ctx.addInitScript(() => { // virtual clock: until start() everything is real; after it new timers wait for advance()
    const rs = window.setTimeout, rc = window.clearTimeout, ri = window.setInterval, rci = window.clearInterval;
    const q = new Map(), anim = new Map(); let on = false, now = 0, id = 1e6;
    const add = (fn, ms, iv, a) => { const i = id++; q.set(i, { id: i, at: now + Math.max(0, +ms || 0), iv, fn: () => (typeof fn === 'function' ? fn(...a) : 0) }); return i; };
    window.setTimeout = (fn, ms, ...a) => (on ? add(fn, ms, 0, a) : rs(fn, ms, ...a));
    window.setInterval = (fn, ms, ...a) => (on ? add(fn, ms, Math.max(4, +ms || 0), a) : ri(fn, ms, ...a));
    window.clearTimeout = (i) => { q.delete(i); rc(i); }; window.clearInterval = (i) => { q.delete(i); rci(i); };
    window.__vt = {
      start() { on = true; },
      advance(ms) {
        const end = now + ms;
        for (let guard = 0; guard < 500; guard++) {
          let b = null; for (const t of q.values()) if (t.at <= end && (!b || t.at < b.at)) b = t;
          if (!b) break; now = b.at; if (b.iv) b.at += b.iv; else q.delete(b.id);
          try { b.fn(); } catch (e) { console.error(e); }
        }
        now = end;
        for (const a of document.getAnimations()) {
          if (!anim.has(a)) anim.set(a, +a.currentTime || 0); else anim.set(a, anim.get(a) + ms);
          if (a.playState !== 'finished') { a.pause(); a.currentTime = anim.get(a); }
        }
      },
    };
  });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(URL); await page.waitForFunction(() => window.__db && window.__db.mode === 'camp'); await sleep(1200);
  const cdp = await ctx.newCDPSession(page);
  await page.evaluate(() => {
    const db = window.__db, T = db.C.T, want = (t) => t === T.ORE || t === T.CHEST; // no flasks: the dive should end inside the clip
    window.__vt.start(); db.manual(true); db.startRun();
    let lastPos = '', still = 0, side = 0;
    window.__bot = setInterval(() => {
      const w = db.world; db.keys.length = 0; if (db.mode !== 'run' || !w || w.ended) return;
      const p = w.player, pos = p.x + ',' + p.y; still = pos === lastPos ? still + 1 : 0; lastPos = pos;
      let best = null, bd = 99;
      for (let y = p.y; y <= p.y + 4; y++) for (let x = p.x - 2; x <= p.x + 2; x++) { // only small detours: the clip should go deep
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
    // the lantern goes out at about 13 s of gameplay, so the clip closes on the run summary
    if (i === Math.round(13 * FPS)) await page.evaluate(() => { const w = window.__db.world; if (window.__db.mode === 'run' && w) w.oil = Math.min(w.oil, 1); });
    await page.evaluate((dt) => { window.__vt.advance(dt * 1000); window.__db.tick(dt); }, 1 / FPS);
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
