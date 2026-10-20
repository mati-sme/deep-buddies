/* Deep Buddies - visual upgrade map (mine-cart rails) and relic map (geological constellation). */
(function (root) {
'use strict';
const D = root.DBData;
const IH = (n, c) => root.DBIcons.html(n, c);

function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; }

function enableDragPan(wrap) {
  let down = null; wrap._moved = false;
  wrap.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }; wrap._moved = false; });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) wrap._moved = true;
    wrap.scrollLeft = down.sl - dx; wrap.scrollTop = down.st - dy;
  });
  window.addEventListener('pointerup', () => { down = null; setTimeout(() => { wrap._moved = false; }, 0); });
}

/* opts: { nodes, kind:'up'|'pr', G, state(id), level(id), vis(id) -> 'show'|'tease'|'hide', onSelect(id) } */
class NodeMap {
  constructor(wrap, opts) {
    this.wrap = wrap; this.o = opts; this.btn = {};
    const N = opts.nodes, G = opts.G;
    const xs = N.map((n) => n.x), ys = N.map((n) => n.y);
    this.minX = Math.min(...xs) - 1; this.maxX = Math.max(...xs) + 1; this.maxY = Math.max(...ys) + 1;
    this.inner = el('div', 'map-inner ' + opts.kind);
    this.inner.style.width = (this.maxX - this.minX + 1) * G + 'px';
    this.inner.style.height = (this.maxY + 1.2) * G + 'px';
    wrap.innerHTML = ''; wrap.appendChild(this.inner);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.inner.style.width); this.svg.setAttribute('height', this.inner.style.height);
    this.svg.classList.add('rails');
    this.inner.appendChild(this.svg);
    if (opts.kind === 'up') this.decorUp(); else this.decorPr();
    for (const n of N) {
      const b = el('button', 'node br-' + (n.br || 'pr') + (n.evo ? ' evo' : ''));
      b.style.left = this.px(n.x) + 'px'; b.style.top = this.py(n.y) + 'px';
      b.innerHTML = `${IH(n.icon, 'nic')}<span class="q">?</span><span class="lv"></span><span class="nm">${n.name}</span>`;
      b.dataset.id = n.id;
      b.addEventListener('click', () => { if (wrap._moved || b.classList.contains('v-tease')) return; opts.onSelect(n.id); });
      this.inner.appendChild(b); this.btn[n.id] = b;
    }
    enableDragPan(wrap);
    this.refresh();
  }
  px(x) { return (x - this.minX + 0.5) * this.o.G; }
  py(y) { return (y + 0.6) * this.o.G; }
  decorUp() {
    const G = this.o.G;
    // strata background bands
    for (let i = 0; i <= this.maxY; i += 2) {
      const band = el('div', 'band'); const P = D.stratum(Math.floor(i / 2));
      band.style.top = this.py(i + 0.5) + 'px'; band.style.height = 2 * G + 'px'; band.style.background = `linear-gradient(${P.base}55, ${P.dark}88)`;
      this.inner.appendChild(band);
    }
    const sky = el('div', 'skyband'); sky.style.height = this.py(0) + 'px'; this.inner.appendChild(sky);
    // branch labels
    const seen = {};
    for (const n of this.o.nodes) if (!n.parent && !seen[n.br]) {
      seen[n.br] = 1;
      const l = el('div', 'brlabel', `${IH(D.BR_ICON[n.br])}${D.B[n.br]}`); l.dataset.br = n.br;
      l.style.left = this.px(n.x) + 'px'; l.style.top = (this.py(0) - G * 0.48) + 'px'; l.style.color = D.BR_COL[n.br];
      this.inner.appendChild(l);
    }
    const st = el('div', 'station', IH('tent', 'big') + '<small>Camp</small>');
    st.style.left = this.px(1.5) + 'px'; st.style.top = (this.py(0) - G * 0.32) + 'px';
    this.inner.appendChild(st);
  }
  decorPr() {
    const core = el('div', 'station', IH('mountain', 'big') + '<small>Your shafts</small>');
    core.style.left = this.px(0) + 'px'; core.style.top = (this.py(0) - this.o.G * 0.1) + 'px';
    this.inner.appendChild(core);
    for (let i = 0; i < 40; i++) {
      const s = el('div', 'star'); s.style.left = Math.random() * 100 + '%'; s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 3) + 's'; this.inner.appendChild(s);
    }
    for (let i = 0; i < 4; i++) {
      const b = el('div', 'layer'); b.style.top = this.py(1 + i * 2 - 0.5) + 'px'; b.style.height = this.o.G * 2 + 'px';
      b.style.background = `linear-gradient(90deg, transparent, ${['#5a3a8a', '#2a5a8a', '#8a3a2a', '#8a7a2a'][i]}33, transparent)`;
      this.inner.appendChild(b);
    }
  }
  path(n) {
    const G = this.o.G;
    const x2 = this.px(n.x), y2 = this.py(n.y);
    let x1, y1;
    if (n.parent) { const p = this.o.nodes.find((q) => q.id === n.parent); x1 = this.px(p.x); y1 = this.py(p.y); }
    else if (this.o.kind === 'up') { x1 = x2; y1 = this.py(0); }
    else { x1 = this.px(0); y1 = this.py(0) - G * 0.1; }
    if (this.o.kind === 'pr') return `M${x1},${y1} L${x2},${y2}`;
    if (x1 === x2 || y1 === y2) return `M${x1},${y1} L${x2},${y2}`;
    return `M${x1},${y1} L${x1},${y2} L${x2},${y2}`;
  }
  vis(n) { return this.o.vis ? this.o.vis(n.id) : 'show'; }
  refresh() {
    const o = this.o, svg = this.svg, NS = 'http://www.w3.org/2000/svg';
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const add = (d, cls, col) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('class', cls); if (col) p.style.stroke = col; svg.appendChild(p); };
    if (o.kind === 'up') {
      const d = `M${this.px(this.minX + 0.6)},${this.py(0)} L${this.px(this.maxX - 0.6)},${this.py(0)}`;
      add(d, 'ties'); add(d, 'rail on', '#d9b38c'); add(d, 'gap');
    }
    const shownBr = {};
    for (const n of o.nodes) {
      const v = this.vis(n); if (v === 'hide') continue;
      if (v === 'show' && n.br) shownBr[n.br] = 1;
      const d = this.path(n), st = o.state(n.id), on = st === 'maxed' || o.level(n.id) > 0;
      const col = n.br ? D.BR_COL[n.br] : '#b8a0ff';
      if (v === 'tease') { add(d, o.kind === 'up' ? 'tease' : 'beam'); continue; }
      if (o.kind === 'up') { add(d, 'ties'); add(d, 'rail' + (on ? ' on' : ''), on ? col : null); add(d, 'gap'); }
      else add(d, 'beam' + (on ? ' on' : st === 'locked' ? '' : ' avail'));
    }
    let hidden = 0;
    for (const n of o.nodes) {
      const b = this.btn[n.id], st = o.state(n.id), v = this.vis(n);
      if (v === 'hide') hidden++;
      b.className = 'node br-' + (n.br || 'pr') + (n.evo ? ' evo' : '') + ' st-' + st + ' v-' + v + (this.sel === n.id ? ' sel' : '');
      const lv = b.querySelector('.lv');
      if (st === 'locked') lv.innerHTML = IH('lock');
      else if (n.max > 1) lv.textContent = `${o.level(n.id)}/${n.max}`;
      else lv.innerHTML = o.level(n.id) ? IH('check') : '';
    }
    this.inner.querySelectorAll('.brlabel').forEach((l) => l.classList.toggle('hidden', !shownBr[l.dataset.br]));
    // the map only extends as deep as what has been revealed; below that, fog fills the view (no dead empty area)
    let deep = 0, x0 = 1e9, x1 = -1e9;
    for (const n of o.nodes) if (this.vis(n) !== 'hide') { deep = Math.max(deep, n.y); x0 = Math.min(x0, n.x); x1 = Math.max(x1, n.x); }
    if (document.body.classList.contains('big') && this.wrap.clientWidth) { // big screens: zoom up, but keep every revealed branch in view
      const cssZ = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--z')) || 1;
      const fitZ = this.wrap.clientWidth / ((x1 - x0 + 2.6) * o.G);
      this.inner.style.zoom = Math.max(0.85, Math.min(cssZ, fitZ)).toFixed(3);
    } else this.inner.style.zoom = '';
    const full = (this.maxY + 1.2) * o.G, revealH = Math.min(full, this.py(deep + 1.3));
    const viewH = this.wrap.clientHeight ? this.wrap.clientHeight / this.zoom() - 2 : 0;
    const h = Math.max(revealH, Math.min(full, viewH));
    this.inner.style.height = h + 'px';
    if (!this.fog) { this.fog = el('div', 'mapfog'); this.inner.appendChild(this.fog); }
    this.fog.style.top = (revealH - o.G * 0.35) + 'px'; this.fog.style.height = Math.max(0, h - revealH + o.G * 0.35) + 'px';
    this.fog.classList.toggle('hidden', h - revealH < o.G * 0.5);
    this.fog.innerHTML = hidden && o.kind === 'up' ? `<span>${IH('lock')}${hidden} more upgrades below. Buy upgrades to reveal them</span>` : '';
    this.hiddenCount = hidden;
  }
  /* centre of the visible part of the map */
  zoom() { return parseFloat(getComputedStyle(this.inner).zoom) || 1; }
  focus() {
    const vis = this.o.nodes.filter((n) => this.vis(n) === 'show');
    if (!vis.length) return;
    const xs = vis.map((n) => n.x), ys = vis.map((n) => n.y), z = this.zoom();
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = Math.min(...ys);
    this.wrap.scrollLeft = this.px(cx) * z - this.wrap.clientWidth / 2;
    this.wrap.scrollTop = Math.max(0, (this.py(cy) - this.o.G * 1.2) * z);
  }
  select(id) { this.sel = id; this.refresh(); }
  center(id) {
    const n = this.o.nodes.find((q) => q.id === id) || this.o.nodes[0];
    const z = this.zoom();
    this.wrap.scrollLeft = this.px(n.x) * z - this.wrap.clientWidth / 2;
    this.wrap.scrollTop = Math.max(0, this.py(n.y) * z - this.wrap.clientHeight / 3);
  }
}
root.DBMaps = { NodeMap };
})(self);
