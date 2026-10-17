// Pacing simulation: a bot plays real runs through the actual game core (same World class as the browser).
// usage: node sim/pacing.js [minutesPerDay=40] [maxDays=80]
const C = require('../js/core.js');
const D = require('../js/data.js');
const MIN_PER_DAY = +process.argv[2] || 40;
const MAX_DAYS = +process.argv[3] || 80;
const OVERHEAD = 12; // seconds per run spent on the camp screen
const DT = 1 / 20;

const save = C.newSave();
let play = 0, seed = 1, sinceCave = 0, stale = 0;
const ms = [];
const mark = (name) => { ms.push({ name, run: save.runs, day: play / (MIN_PER_DAY * 60), hours: play / 3600 }); };
const seen = new Set();
const once = (k, name) => { if (!seen.has(k)) { seen.add(k); mark(name); } };
const prMaxed = () => D.PRESTIGE.every((u) => C.plvl(save, u.id) >= u.u_max || C.plvl(save, u.id) >= u.max);
const firstRuns = [];
let lastLog = -1;
while (play < MAX_DAYS * MIN_PER_DAY * 60) {
  const w = new C.World(save, seed++);
  while (!w.ended && w.time < 600) { C.botThink(w); w.step(DT, null); w.ev.length = 0; }
  const r = w.result();
  C.applyRun(save, r);
  play += r.time + OVERHEAD; sinceCave++;
  if (firstRuns.length < 8) firstRuns.push(`run ${save.runs}: ${r.time.toFixed(1)}s, depth ${r.depthMax}m, ore ${r.oreN}, coins ${r.total}`);
  const bought = C.autoBuy(save); stale = bought ? 0 : stale + 1;
  if (bought && !seen.has('up1')) once('up1', 'first upgrade bought');
  for (let s = 1; s < 22; s++) if (save.bestEver >= s * D.CHUNK) once('s' + s, `reached ${D.stratum(s).name} (${s * D.CHUNK} m)`);
  const gain = C.relicsFor(save);
  if (gain >= 1 && sinceCave >= 8 && (gain >= Math.max(1, save.relicsTotal * 0.5) || stale >= 6)) {
    C.caveIn(save); sinceCave = 0; C.autoBuyPr(save);
    if (save.caveIns === 1) mark(`first cave-in (+${gain} relics)`);
    if ([5,10,25,50,100].includes(save.caveIns)) mark(`cave-in #${save.caveIns} (+${gain} relics, shaft depth ${save.bestEver}m best)`);
    for (let e = 1; e <= 4; e++) if (C.evoOf(save) >= e) once('e' + e, `buddy evolution ${e}: ${D.BUDDY_FORMS[e].name}`);
  }
  const day = Math.floor(play / (MIN_PER_DAY * 60));
  if (day !== lastLog && day % 3 === 0) { lastLog = day; console.log(`day ${day}: runs ${save.runs} caveIns ${save.caveIns} relics ${save.relics}/${save.relicsTotal} best ${save.bestEver}m shaftBest ${save.bestDepth}m coins ${C.fmt(save.coins)} lastRun ${r.time.toFixed(0)}s/${C.fmt(r.total)} evo ${C.evoOf(save)} upLv ${Object.values(save.up).reduce((a,b)=>a+b,0)}`); }
  if (D.PRESTIGE.every((u) => C.plvl(save, u.id) >= u.max)) { mark('ALL prestige nodes maxed (full completion)'); break; }
}
console.log('\nFirst runs:\n' + firstRuns.join('\n'));
console.log(`\nMilestones (${MIN_PER_DAY} min/day of play):`);
for (const m of ms) console.log(`  ${m.name.padEnd(48)} run ${String(m.run).padStart(5)}  day ${m.day.toFixed(1).padStart(5)}  (${m.hours.toFixed(1)} h played)`);
const missing = D.PRESTIGE.filter((u) => C.plvl(save, u.id) < u.max).map((u) => `${u.id} ${C.plvl(save, u.id)}/${u.max}`);
if (missing.length) console.log('Not maxed:', missing.join(', '));
