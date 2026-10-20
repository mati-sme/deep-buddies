/* Deep Buddies - hand-authored pixel icons (replace every emoji in the UI).
   Each icon is a 10x10 fill grid; a 1px dark outline is added automatically, giving a 12x12 sprite.
   "name:#hex" tints the icon's tint channel (main/light/dark letters). */
(function (root) {
'use strict';
const OUT = '#24140a';
const PAL = {
  y: '#ffcc33', Y: '#fff3a0', o: '#c0801a', w: '#fff6e0', W: '#ffffff',
  g: '#9aa0aa', G: '#d8dde6', h: '#5a5e68', b: '#a0683a', B: '#d09a5c', d: '#6a4020',
  r: '#ff5a5a', R: '#ffb0a0', e: '#b02a2a', u: '#4a90e0', U: '#a8d4ff', n: '#2a5cb0',
  v: '#5fd03a', V: '#b0ff8a', f: '#2a8020', p: '#ff9ab8', P: '#e07a9a', c: '#8ff0ff', C: '#e0ffff', s: '#3aa0b0',
  m: '#b48cff', M: '#e2c8ff', q: '#6a3ab0', a: '#ff9a3c', A: '#ffd08a', z: '#c0541a'
};
// rows, optional palette overrides (pal), tint channel [main, light, dark] (t)
const I = {
  coin: { r: ['..yyyyyy..', '.yYYYYyyy.', 'yYYooooyyo', 'yYoyyyyoyo', 'yYoyYyyoyo', 'yyoyyyyoyo', 'yyoyyyyoyo', 'yyyooooyoo', '.yyyyyyoo.', '..oooooo..'] },
  lantern: { r: ['...hhhh...', '...h..h...', '.bbbbbbbb.', '.bayyyyab.', '.baYwwYab.', '.bayYYyab.', '.bayyyyab.', '.bbbbbbbb.', '..bddddb..', '...bbbb...'], pal: { y: '#ffe066', Y: '#fff8c8', a: '#ffb347' } },
  depth: { r: ['...Uuuu...', '...Uuuu...', '...Uuuu...', '...Uuuu...', 'UUUUuuuuuu', '.Uuuuuuun.', '..Uuuuun..', '...Uuun...', '....un....', '..........'], t: ['u', 'U', 'n'] },
  trophy: { r: ['..YYyyyo..', 'yyYYyyyoyy', 'y.YYyyyo.y', 'y.Yyyyyo.y', '.yYyyyyoy.', '..Yyyyyo..', '...yyyo...', '....yo....', '...oooo...', '..oooooo..'] },
  bag: { r: ['...dddd...', '..d....d..', '.bbbbbbbb.', 'bBBBBBBBBb', 'bBbbbbbbbb', 'bBbyyyybbb', 'bBbbbbbbbb', 'bbbbbbbbbb', 'bddddddddb', '.dddddddd.'], t: ['b', 'B', 'd'] },
  sound: { r: ['...w......', '..ww...y..', '.www.y..y.', 'wwww..y.y.', 'wwww..y.y.', 'wwww..y.y.', 'wwww..y.y.', '.www.y..y.', '..ww...y..', '...w......'] },
  mute: { r: ['...w......', '..ww......', '.www......', 'wwww.r..r.', 'wwww..rr..', 'wwww..rr..', 'wwww.r..r.', '.www......', '..ww......', '...w......'] },
  music: { r: ['....yyyyyy', '....yYYYYy', '....y....y', '....y....y', '....y....y', '....y....y', '.yyyy..yyy', 'yYYyy.yYyy', 'yyyyy.yyyy', '.yyy...yy.'] },
  paw: { r: ['..bb..bb..', '..bb..bb..', 'bb......bb', 'bb......bb', '...bbbb...', '..bbbbbb..', '.bbbbbbbb.', '.bbbbbbbb.', '..PPPPPP..', '...PPPP...'], pal: { b: '#ffb0c8' } },
  dynamite: { r: ['......aY..', '.....da...', '.....d....', '.Rr.Rr.Rr.', '.Rr.Rr.Rr.', '.hhhhhhhh.', '.Rr.Rr.Rr.', '.Rr.Rr.Rr.', '.Rr.Rr.Rr.', '.ee.ee.ee.'] },
  sparkle: { r: ['....y.....', '....y.....', '...yYy....', '..yYwYy...', 'yyYwwwYyy.', '..yYwYy...', '...yYy....', '....y.....', '....y.....', '..........'], t: ['y', 'Y', 'o'] },
  tent: { r: ['....r.....', '....rr....', '....a.....', '...aAa....', '..aAaaa...', '..aAada...', '.aAaddda..', '.aAaddda..', 'aAaadddaa.', 'zzzzzzzzz.'] },
  rails: { r: ['...ay.y...', '..ayaYya..', 'hhhhhhhhhh', '.hGgggggh.', '.hggggggh.', '..hhhhhh..', '..d....d..', '.ddd..ddd.', '..d....d..', 'bbbbbbbbbb'] },
  relic: { r: ['...mmmm...', '..mMMMmq..', '..mMmmmq..', '..qqmqqq..', '..mMmmmq..', '..mMmmqq..', '...Mmmq...', '..mqqqqq..', '..mMmmmq..', '.qqqqqqqq.'] },
  flag: { r: ['..h.......', '..hrrrr...', '..hRRrrrr.', '..hRrrrrrr', '..hrrrrrr.', '..hrrr....', '..h.......', '..h.......', '..h.......', '.hhh......'] },
  check: { r: ['..........', '........VV', '.......VVv', '......VVv.', 'VV...VVv..', 'vVV.VVv...', '.vVVVv....', '..vVv.....', '...v......', '..........'] },
  lock: { r: ['...hhhh...', '..h....h..', '..h....h..', '.yyyyyyyy.', '.yYyyyyyo.', '.yYyhhyyo.', '.yYyhhyyo.', '.yYyyhyyo.', '.yyyyyyyo.', '.oooooooo.'] },
  close: { r: ['ww......ww', 'www....www', '.www..www.', '..wwwwww..', '...wwww...', '...wwww...', '..wwwwww..', '.www..www.', 'www....www', 'ww......ww'] },
  pick: { r: ['..GGGGGh..', '.GGgBbghh.', 'GGg.Bb..hh', 'Gg.Bb....h', 'G..Bb.....', '..Bb......', '.Bb.......', 'Bb........', 'd.........', '..........'], t: ['g', 'G', 'h'] },
  sword: { r: ['........GG', '.......Ggh', '......Ggh.', '.....Ggh..', '....Ggh...', '..yGgh....', '...yh.....', '..b.y.....', '.b........', 'a.........'], t: ['g', 'G', 'h'] },
  shield: { r: ['.uuuuuuuu.', 'uUUUyyuuun', 'uUUUyyuuun', 'uUyyyyyyun', 'uUUUyyuuun', 'uUUUyyuuun', '.uUUyyuun.', '..uUyyun..', '...uyyn...', '....nn....'], t: ['u', 'U', 'n'] },
  boots: { r: ['.bbbb.....', '.bBbb.....', '.yyyy.....', '.bBbb.....', '.bBbbb....', '.bBbbbbb..', '.bBbbbbbbb', '.bbbbbbbbb', '.ddddddddd', '..........'], t: ['b', 'B', 'd'] },
  burst: { r: ['....a.....', '.a..a..a..', '..aAAAa...', '..AYYYA...', 'aaAYwYAaa.', '..AYYYA...', '..aAAAa...', '.a..a..a..', '....a.....', '..........'], t: ['a', 'A', 'z'] },
  star: { r: ['....y.....', '....y.....', '...yYy....', 'yyyyYyyyy.', '.yYYYYYy..', '..yYYYy...', '..yYyYy...', '.yYy.yYy..', '.yy...yy..', '..........'] },
  mountain: { r: ['..........', '....ww....', '...wGGw...', '...gGgh...', '..gGgghh..', '..gGgghh..', '.gGggghhh.', '.gGggghhh.', 'gGgggghhhh', 'hhhhhhhhhh'] },
  ore: { r: ['..........', '...hhhh...', '..hgaAgh..', '.hgAagggh.', '.hggggaAh.', 'hgaAgggaah', 'hggggAaggh', '.hgaggggh.', '..hhhhhh..', '..........'], t: ['a', 'A', 'z'] },
  chest: { r: ['..........', '.bbbbbbbb.', 'bBBBBBBBBb', 'bBbbbbbbbd', 'yyyyyyyyyy', 'bBbbYYbbbd', 'bBbbyybbbd', 'bBbbbbbbbd', 'bddddddddd', '..........'] },
  heart: { r: ['.rrr..rrr.', 'rRRrrrrrre', 'rRrrrrrrre', 'rrrrrrrree', '.rrrrrree.', '..rrrree..', '...rree...', '....rr....', '..........', '..........'], t: ['r', 'R', 'e'] },
  whetstone: { r: ['.......Y..', '......YwY.', '.......Y..', '..........', '.gGGGGGGg.', 'gGgggggggh', 'gggggggghh', '.hhhhhhhh.', '.bbbbbbbb.', '.dddddddd.'] },
  wind: { r: ['..........', '....UUUU..', 'UUUU....U.', '.......U..', '..UUUUUU..', '..........', 'UUUUUU....', '......U...', '..UUUU....', '..........'] },
  clover: { r: ['.vv...vv..', 'vVvv.vVvv.', 'vvvvvvvvv.', '.vvvVvvv..', 'vvvvvvvvv.', 'vVvv.vvvv.', '.vv.f.vv..', '....f.....', '...f......', '..........'] },
  fist: { r: ['..........', '.BBBBBBB..', 'BbBbBbBbd.', 'BBBBBBBBd.', 'BBBBBBBBd.', 'BdddddBBd.', '.BBBBBBdd.', '..BBBBBd..', '..rrrrrr..', '..eeeeee..'], t: ['r', 'R', 'e'], pal: { B: '#ffd2a6', b: '#e0a878', d: '#c08060' } },
  hand: { r: ['...B.B....', '.B.B.B.B..', '.B.B.B.B..', '.BBBBBBB..', '.BBBBBBB.B', '.BBBBBBBB.', '.BBBBBBB..', '..BBBBB...', '..ddddd...', '..ddddd...'], t: ['B', 'b', 'd'], pal: { B: '#ffd2a6', d: '#3d7be0' } },
  medal: { r: ['.rr...uu..', '..rr.uu...', '...ruu....', '...yyyy...', '..yYYyyy..', '..yYyyyo..', '..yyyyyo..', '...yyoo...', '..........', '..........'] },
  barrel: { r: ['..hhhhhh..', '.uUUuuuun.', '.hhhhhhhh.', '.uUUuuuun.', '.uUuuuuun.', '.uUuuuuun.', '.hhhhhhhh.', '.uUuuuuun.', '.uUUuuuun.', '..hhhhhh..'], t: ['u', 'U', 'n'] },
  candle: { r: ['....Y.....', '...YwY....', '...aYa....', '....h.....', '...Wwg....', '...Wwg....', '...Wwg....', '...Wwg....', '..bbbbb...', '..ddddd...'], pal: { w: '#fff0c8', g: '#d8c8a0' } },
  flask: { r: ['....dd....', '....bb....', '....GG....', '...GaaG...', '..GaAaaG..', '.GaAaaaaG.', '.GaAaaaaG.', '.GaaaaaaG.', '..GGGGGG..', '..........'], t: ['a', 'A', 'z'], pal: { G: '#cfe8ff', a: '#ffb030' } },
  hourglass: { r: ['bbbbbbbbbb', '.GyyyyyyG.', '..GyyyyG..', '...GyyG...', '....GG....', '....GG....', '...G.yG...', '..G.yyyG..', '.GyyyyyyG.', 'bbbbbbbbbb'], pal: { G: '#cfe8ff' } },
  mask: { r: ['..gggggg..', '.gGGGGGGh.', 'gGUUggUUgh', 'gGUUggUUgh', 'gGgggggghh', '.gghhhhgh.', '..hvvvvh..', '..hVvvvh..', '...hhhh...', '..........'] },
  helmet: { r: ['..........', '..........', '...yyyy...', '..yYwwyo..', '.yYwWwyyo.', '.yYYwwyyo.', 'yYYyyyyyyo', 'oooooooooo', '..........', '..........'] },
  nose: { r: ['.......U..', '..U..U...U', '...U......', '..pppppp..', '.pwwppppP.', 'pwwppppppP', 'pwpppppppP', '.ppppppPP.', '..PPPPPP..', '..........'] },
  gem: { r: ['..........', '..CCcccs..', '.CCccccss.', 'CCccccccss', '.cCcccccs.', '..cCcccs..', '...cCcs...', '....cs....', '..........', '..........'], t: ['c', 'C', 's'] },
  bomb: { r: ['......Ya..', '.....a....', '....hh....', '..hhhhhh..', '.hgghhhhh.', '.hghhhhhh.', '.hhhhhhhh.', '.hhhhhhhh.', '..hhhhhh..', '...hhhh...'], pal: { h: '#4a4e58', g: '#8a90a0' } },
  arrowslr: { r: ['..........', '..........', '..u....u..', '.uu....uu.', 'uuuuuuuuuu', 'uuuuuuuuuu', '.uu....uu.', '..u....u..', '..........', '..........'], t: ['u', 'U', 'n'] },
  magnifier: { r: ['..gggg....', '.gUUUUg...', 'gUwwUUUg..', 'gUwUUUUg..', 'gUUUUUUg..', '.gUUUUg...', '..gggghb..', '.......bb.', '........bb', '.........d'] },
  ruler: { r: ['..........', '..........', '..........', 'yyyyyyyyyy', 'yoyoyoyoyo', 'yoyyyoyyyo', 'yyyyyyyyyy', 'oooooooooo', '..........', '..........'] },
  map: { r: ['..........', 'BBBBBBBBBB', 'BbBBBBBBBB', 'BBbBBBrBrB', 'BBBbBBBrBB', 'BBBBbBrBrB', 'BBBBBbBBBB', 'BBBBBBbBBB', 'dddddddddd', '..........'], pal: { B: '#f0d8a0', b: '#a0683a' } },
  eye: { r: ['..........', '..........', '..wwwwww..', '.wwcccsww.', 'wwcwhhcsww', 'wwcchhcsww', '.wwcccsww.', '..wwwwww..', '..........', '..........'], pal: { h: '#1a1010' } },
  coinbag: { r: ['..bb.bb...', '...bbb....', '...yyy....', '..BBBBBB..', '.BBByyBBb.', 'BBByyyyBbd', 'BBByyyyBbd', 'BBBByyBBbd', '.BBBBBBbd.', '..dddddd..'] },
  scroll: { r: ['.dBBBBBBd.', 'dBwwwwwwBd', '.Bwwwwwwb.', '.Bwhhhhwb.', '.Bwwwwwwb.', '.Bwhhhwwb.', '.Bwwwwwwb.', '.Bwhhhhwb.', 'dBwwwwwwBd', '.dBBBBBBd.'], pal: { w: '#fff0c8' } },
  volcano: { r: ['...a..a...', '....aa....', '...zaaz...', '..bbaabb..', '.bBbbabbd.', '.bBbbbbbd.', 'bBbbbbbbdd', 'bBbbbbbbdd', 'dddddddddd', '..........'], pal: { b: '#8a6a5a', B: '#b09080', d: '#5a4038' } },
  flame: { r: ['....a.....', '...aa.....', '...aAa....', '..aAAaa...', '.aaAYAaa..', '.aAYYYAa..', 'aAYYwYYAa.', 'aAYwwwYAa.', '.aAYYYAa..', '..aaaaa...'], t: ['a', 'A', 'z'] },
  jar: { r: ['..bbbbbb..', '...dddd...', '..GGGGGG..', '.GwGGGGGG.', '.GwGGGGGG.', '.GyyyyyyG.', '.GyYyyyyG.', '.GyyyyyyG.', '.GGGGGGGG.', '..........'], pal: { G: '#cfe8ff' } },
  feather: { r: ['........wW', '.......wWw', '......wWw.', '.....wWw..', '....wWw...', '...wWw....', '..wWw.....', '.hww......', 'h.........', '..........'], pal: { w: '#a8d4ff' } },
  column: { r: ['gggggggggg', '.gGGGGGgh.', '..GgGgGh..', '..GgGgGh..', '..GgGgGh..', '..GgGgGh..', '..GgGgGh..', '.gGGGGGgh.', 'gggggggggh', 'hhhhhhhhhh'] },
  elevator: { r: ['hhhhhhhhhh', 'h...yy...h', 'h..yyyy..h', 'h........h', 'h........h', 'h........h', 'h..yyyy..h', 'h...yy...h', 'h........h', 'hhhhhhhhhh'] },
  notebook: { r: ['.uuuuuuuu.', 'huwwwwwwu.', '.uwhhhhwu.', 'huwwwwwwu.', '.uwhhhwwu.', 'huwwwwwwu.', '.uwhhhhwu.', 'huwwwwwwu.', '.uuuuuuuu.', '..........'] },
  help: { r: ['..yyyyy...', '.yy...yy..', '.yy...yy..', '......yy..', '.....yy...', '....yy....', '....yy....', '..........', '....yy....', '....yy....'] },
  trash: { r: ['...hhhh...', 'hhhhhhhhhh', '.gggggggg.', '.gGgGgGgh.', '.gGgGgGgh.', '.gGgGgGgh.', '.gGgGgGgh.', '.gGgGgGgh.', '.gGgGgGgh.', '..hhhhhh..'] },
  bang: { r: ['...rrr....', '...rRr....', '...rRr....', '...rRr....', '...rrr....', '...rrr....', '....r.....', '..........', '...rrr....', '...rrr....'] },
  play: { r: ['.vv.......', '.vVvv.....', '.vVVvvv...', '.vVVVVvvv.', '.vVVVVVVvv', '.vVVVVVVvv', '.vVVVVvvv.', '.vVVvvv...', '.vVvv.....', '.vv.......'] },
  pause: { r: ['..........', '.ww...ww..', '.ww...ww..', '.ww...ww..', '.ww...ww..', '.ww...ww..', '.ww...ww..', '.ww...ww..', '.ww...ww..', '..........'] },
  up: { r: ['....uy....', '...Uyyn...', '..Uyyyyn..', '.Uyyyyyyn.', 'UUUUyyyyyy', '...Uyyy...', '...Uyyy...', '...Uyyy...', '...Uyyy...', '..........'], pal: { u: '#c0801a', U: '#fff3a0', n: '#c0801a' } },
  gift: { r: ['..r..r....', '...rr.....', 'yyyyrryyyy', 'yYYYrrYYYo', 'yyyyrryyyo', '.bbbrrbbb.', '.bBbrrbbd.', '.bBbrrbbd.', '.bBbrrbbd.', '.dddrrddd.'] },
  skull: { r: ['..wwwwww..', '.wwwwwwwg.', 'wwwwwwwwwg', 'wkkwwkkwwg', 'wkkwwkkwwg', 'wwwwkwwwgg', '.wwwwwwwg.', '..wkwkwg..', '..wwwwwg..', '..........'], pal: { k: '#2a1a10' } }
};
const ALIAS = { flaskbig: 'flask:#ff6ad0', firework: 'burst:#ff6ad0', cave: 'mountain', gear: 'bag', oil: 'lantern', buddy: 'paw' };

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  if (f > 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; } else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
function gearRows() { // procedural cog (8 teeth)
  const rows = [];
  for (let j = 0; j < 10; j++) {
    let s = '';
    for (let i = 0; i < 10; i++) {
      const dx = i - 4.5, dy = j - 4.5, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      const tooth = Math.abs(((a / (Math.PI / 4)) % 1 + 1) % 1 - 0.5) > 0.25;
      if (d < 1.6) s += '.';
      else if (d < 3.4 || (d < 5.1 && tooth)) s += dx + dy < -1 ? 'G' : dx + dy > 2 ? 'h' : 'g';
      else s += '.';
    }
    rows.push(s);
  }
  return rows;
}
I.cog = { r: gearRows() };

function makeCanvas(w, h) {
  if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  return null;
}
const cache = {};
function resolve(name) {
  let n = String(name || 'coin'); if (ALIAS[n]) n = ALIAS[n];
  const [base0, tint] = n.split(':');
  const base = ALIAS[base0] && !tint ? ALIAS[base0] : base0;
  return { base, tint };
}
/* a 12x12 canvas for the icon */
function get(name) {
  if (cache[name]) return cache[name];
  const { base, tint } = resolve(name);
  if (base === 'pip' && root.DBSprites) { // portrait of a Pip evolution
    const c = makeCanvas(12, 12); c.getContext('2d').drawImage(root.DBSprites.mole(Math.max(0, (+tint || 0))), 0, 0); return (cache[name] = c);
  }
  const def = I[base] || I.coin;
  const pal = Object.assign({}, PAL, def.pal || {});
  if (tint && def.t) { pal[def.t[0]] = tint; pal[def.t[1]] = shade(tint, 0.45); pal[def.t[2]] = shade(tint, -0.4); }
  const c = makeCanvas(12, 12), x = c.getContext('2d');
  const fill = (i, j) => j >= 0 && j < 10 && i >= 0 && i < 10 && def.r[j][i] !== '.';
  x.fillStyle = OUT;
  for (let j = -1; j <= 10; j++) for (let i = -1; i <= 10; i++) {
    if (fill(i, j)) continue;
    let near = false;
    for (let dj = -1; dj <= 1 && !near; dj++) for (let di = -1; di <= 1; di++) if ((di || dj) && fill(i + di, j + dj)) { near = true; break; }
    if (near) x.fillRect(i + 1, j + 1, 1, 1);
  }
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) {
    const ch = def.r[j][i]; if (ch === '.') continue;
    x.fillStyle = pal[ch] || '#ff00ff'; x.fillRect(i + 1, j + 1, 1, 1);
  }
  return (cache[name] = c);
}
const urls = {};
function url(name) { return urls[name] || (urls[name] = get(name).toDataURL()); }
/* CSS-class based <i> for DOM use: one injected rule per icon */
let sheet = null; const classes = {};
function cls(name) {
  if (classes[name]) return classes[name];
  const k = 'ic-' + String(name).replace(/[^a-z0-9]/gi, '_');
  if (!sheet) { const st = document.createElement('style'); st.id = 'db-icons'; document.head.appendChild(st); sheet = st.sheet; }
  sheet.insertRule(`.${k}{background-image:url(${url(name)})}`, sheet.cssRules.length);
  return (classes[name] = k);
}
function html(name, extra) { return `<i class="ic ${cls(name)}${extra ? ' ' + extra : ''}" aria-hidden="true"></i>`; }
/* swap every [data-ic] placeholder in a DOM subtree for its icon */
function hydrate(rootEl) {
  (rootEl || document).querySelectorAll('[data-ic]').forEach((el) => { el.classList.add('ic', cls(el.dataset.ic)); el.setAttribute('aria-hidden', 'true'); });
}
function names() { return Object.keys(I); }
root.DBIcons = { get, url, cls, html, hydrate, names, DEFS: I, shade };
})(self);
