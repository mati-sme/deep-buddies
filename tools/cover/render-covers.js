// Renders the three CrazyGames covers from tools/cover/cover.js. node tools/cover/render-covers.js <outdir>
const { chromium } = require('../../test/node_modules/playwright-core');
const path = require('path'), fs = require('fs');
const OUT = process.argv[2] || '/workspace/tmp/covers';
fs.mkdirSync(OUT, { recursive: true });
const ROOT = path.resolve(__dirname, '../..');
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 400, height: 300 } });
  p.on('pageerror', (e) => console.log('ERR', e.message));
  const font = fs.readFileSync(path.join(ROOT, 'fonts/pixelify-sans.woff')).toString('base64');
  await p.setContent(`<style>@font-face{font-family:'Pixelify Sans';src:url(data:font/woff;base64,${font}) format('woff');font-weight:400 700}</style><body style="font-family:'Pixelify Sans'">.</body>`);
  await p.addScriptTag({ path: path.join(__dirname, 'cover.js') });
  await p.evaluate(() => document.fonts.load('700 40px "Pixelify Sans"'));
  for (const [file, w, h, s, lay] of [['cover-landscape-1920x1080.png', 1920, 1080, 6, 'land'], ['cover-portrait-800x1200.png', 800, 1200, 4, 'port'], ['cover-square-800x800.png', 800, 800, 4, 'sq']]) {
    const data = await p.evaluate(([w, h, s, lay]) => { const c = document.createElement('canvas'); DBCover.drawCover(c, w, h, s, lay); return c.toDataURL('image/png'); }, [w, h, s, lay]);
    fs.writeFileSync(path.join(OUT, file), Buffer.from(data.split(',')[1], 'base64'));
    console.log('wrote', file);
  }
  await b.close();
})();
