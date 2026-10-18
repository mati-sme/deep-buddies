// Rewarded-ad offer test (mobile + desktop). node test/ads.js [url]   (also run at the end of test/e2e.js)
// Covers: no offer on the first runs, offer appears later, "No thanks" leaves coins unchanged, closing the mock early gives nothing,
// watching to the end doubles the run's coins exactly once (saved, survives reload, can't be claimed twice), settings toggle hides it.
const { chromium } = require('playwright-core');
const VPS = [
  { name: 'mobile', opts: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } },
  { name: 'desktop', opts: { viewport: { width: 1280, height: 800 } } },
];
async function adsSuite(browser, URL, ok, shotPath) {
  for (const vp of VPS) {
    const P = `[ads ${vp.name}] `;
    const ctx = await browser.newContext(vp.opts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(URL, { waitUntil: 'load' });
    await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(500);
    const ev = (fn, a) => page.evaluate(fn, a);
    const summaryOpen = () => page.waitForFunction(() => !document.getElementById('summary').classList.contains('hidden'), null, { timeout: 40000 });
    // play one full run with the bot (real World, real summary)
    const playRun = async () => {
      await page.click('.tabs button[data-tab=home]', { force: true }); await page.waitForTimeout(150);
      await page.click('#btnDig', { force: true }); await page.waitForTimeout(200);
      await ev(() => { clearInterval(window.__bot); window.__bot = setInterval(() => { const w = window.__db.world; if (w && !w.ended) window.__db.C.botThink(w); }, 30); });
      await summaryOpen(); await page.waitForTimeout(300);
      await ev(() => clearInterval(window.__bot));
      return ev(() => ({ total: window.__db.lastRes.total, coins: window.__db.save.coins, runs: window.__db.save.runs, offer: !!document.getElementById('adOffer'), would: window.Ads.shouldOffer({ runsBefore: 2, reward: window.__db.lastRes.total }) }));
    };
    const closeSum = () => page.click('#sumMap', { force: true });

    ok(await ev(() => !!window.Ads && window.Ads.backend() === 'mock' && window.Ads.isAvailable()), P + 'Ads module loaded (mock backend, available)');
    const r1 = await playRun();
    ok(r1.runs === 1 && !r1.offer, P + `no offer on the very first run (earned ${r1.total}${r1.would ? ', would qualify later' : ''})`);
    await closeSum();
    const r2 = await playRun();
    ok(r2.runs === 2 && !r2.offer, P + `no offer on the second run (earned ${r2.total})`);
    await closeSum();
    // run 3: offer appears; decline keeps coins unchanged
    const r3 = await playRun();
    ok(r3.runs === 3 && r3.offer, P + `offer appears on run 3 (earned ${r3.total})`);
    const btn = await ev(() => { const a = document.getElementById('adYes').getBoundingClientRect(), b = document.getElementById('adNo').getBoundingClientRect(); return { a: [a.width, a.height], b: [b.width, b.height], txt: document.getElementById('adOffer').innerText }; });
    ok(Math.abs(btn.a[0] - btn.b[0]) < 2 && Math.abs(btn.a[1] - btn.b[1]) < 2 && /No thanks/.test(btn.txt) && /2× coins/.test(btn.txt), P + `"Watch ad" and "No thanks" are the same size (${btn.a.map(Math.round)} vs ${btn.b.map(Math.round)})`);
    if (shotPath && vp.name === 'mobile') await page.screenshot({ path: shotPath });
    await page.click('#adNo', { force: true }); await page.waitForTimeout(200);
    const d = await ev(() => ({ coins: window.__db.save.coins, offer: !!document.getElementById('adOffer'), ad: !!document.getElementById('ad-mock'), claim: window.__db.save.adClaimRun }));
    ok(d.coins === r3.coins && !d.offer && !d.ad && d.claim !== 3, P + `"No thanks" hides the card, no ad, coins unchanged (${d.coins})`);
    await closeSum();
    ok(await ev(() => window.__db.save.coins) === r3.coins, P + 'declining has no penalty after closing the summary');
    // run 4: close the mock early -> nothing; then watch to the end -> 2x once
    const r4 = await playRun();
    ok(r4.offer, P + `offer appears again on run 4 (earned ${r4.total})`);
    await page.click('#adYes', { force: true }); await page.waitForTimeout(300);
    const mock = await ev(() => { const m = document.getElementById('ad-mock'); return m && { label: m.innerText.includes('Sample ad (test)'), close: !!document.getElementById('ad-mock-close'), count: document.getElementById('ad-mock-count').textContent }; });
    ok(mock && mock.label && mock.close && /5|4/.test(mock.count), P + `mock ad shows "Sample ad (test)", a countdown (${mock && mock.count}) and Close`);
    await page.waitForTimeout(1000);
    await page.click('#ad-mock-close'); await page.waitForTimeout(300);
    const e1 = await ev(() => ({ coins: window.__db.save.coins, ad: !!document.getElementById('ad-mock'), offer: !!document.getElementById('adOffer'), yes: !document.getElementById('adYes').disabled }));
    ok(e1.coins === r4.coins && !e1.ad && e1.offer && e1.yes, P + 'closing the ad early gives no reward (coins unchanged, offer still there)');
    const t0 = Date.now();
    await page.click('#adYes', { force: true });
    await page.waitForSelector('#ad-mock-done', { state: 'visible', timeout: 9000 });
    const mid = await ev(() => window.__db.save.coins);
    ok(mid === r4.coins, P + `no reward before the ad finishes (watched ${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    await page.click('#ad-mock-done'); await page.waitForTimeout(300);
    const g = await ev(() => ({ coins: window.__db.save.coins, claim: window.__db.save.adClaimRun, txt: document.getElementById('adOffer').innerText, total: document.getElementById('sumTotal').innerText }));
    ok(g.coins === r4.coins + r4.total && g.claim === 4 && /Bonus/.test(g.txt), P + `watching to the end doubles the run: coins ${r4.coins} -> ${g.coins} (+${r4.total}), total shows "${g.total.replace(/\s+/g, ' ')}"`);
    await ev(() => window.__db.watchAd(window.__db.lastRes)); await page.waitForTimeout(400);
    const g2 = await ev(() => ({ coins: window.__db.save.coins, ad: !!document.getElementById('ad-mock') }));
    ok(g2.coins === g.coins && !g2.ad, P + 'a second claim for the same run is refused (no ad, coins unchanged)');
    await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(500);
    const g3 = await ev(() => ({ coins: window.__db.save.coins, claim: window.__db.save.adClaimRun }));
    ok(g3.coins === g.coins && g3.claim === 4, P + 'reward and claim are saved (survive reload)');
    // settings toggle off -> no offer
    await page.click('.tabs button[data-tab=set]', { force: true }); await page.waitForTimeout(200);
    ok(await page.isVisible('#adsToggle') && await ev(() => document.getElementById('adsToggle').checked), P + '"Offer reward ads" toggle is in More and on by default');
    await page.click('#adsToggle', { force: true });
    await ev(() => { window.Ads.CONFIG.minReward = 0; window.Ads.CONFIG.minFracOfBest = 0; }); // only the toggle can block run 5
    const r5 = await playRun();
    ok(!r5.offer && await ev(() => window.__db.save.adsOffer === false), P + `toggle off: no offer on run 5 (earned ${r5.total})`);
    ok(errors.length === 0, P + 'no console errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
    await ctx.close();
  }
}
module.exports = { adsSuite };
if (require.main === module) {
  (async () => {
    const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
    const ok = (c, msg) => { console.log((c ? 'PASS ' : 'FAIL ') + msg); if (!c) process.exitCode = 1; };
    await adsSuite(browser, process.argv[2] || 'http://localhost:8765/', ok, process.env.SHOT);
    await browser.close();
  })();
}
