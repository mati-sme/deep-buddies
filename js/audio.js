/* Deep Buddies - WebAudio synth: SFX + a cozy looping music track (no audio files). */
(function (root) {
'use strict';
let ac = null, master = null, sfxBus = null, musicBus = null, noiseBuf = null, muted = false, musicOff = false, last = {};
const MASTER = 0.5, MUSIC = 0.34;
function init() {
  if (ac) { if (ac.state === 'suspended' && !document.hidden) ac.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
  ac = new A(); master = ac.createGain(); master.gain.value = muted ? 0 : MASTER; master.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = musicOff ? 0 : MUSIC; musicBus.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  Music.start();
}
function rate(name, ms) { const n = performance.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; }
function tone(freq, dur, type, vol, slide, delay, bus, at) {
  if (!ac || (muted && !bus)) return;
  const t = at !== undefined ? at : ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus || sfxBus); o.start(t); o.stop(t + dur + 0.03);
}
function noise(dur, freq, q, vol, type, slide, delay, bus, at) {
  if (!ac || (muted && !bus)) return;
  const t = at !== undefined ? at : ac.currentTime + (delay || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus || sfxBus); s.start(t, Math.random() * 0.3); s.stop(t + dur + 0.03);
}
// bell-ish "pling": sine + soft octave + a little click
function pling(freq, vol, delay) { tone(freq, 0.32, 'sine', vol, null, delay); tone(freq * 2, 0.18, 'triangle', vol * 0.35, null, delay); tone(freq * 3.01, 0.07, 'sine', vol * 0.2, null, delay); }
const SFX = {
  chip(s) { if (rate('chip', 45)) { noise(0.05, 1900 - Math.min(s, 10) * 110, 3, 0.22); tone(140 + Math.random() * 30, 0.04, 'triangle', 0.08); } },
  brk(big) { if (!rate('brk', 40)) return; noise(big ? 0.25 : 0.13, big ? 500 : 950, 1, big ? 0.5 : 0.3, 'lowpass', 0.4); tone(big ? 90 : 160, big ? 0.2 : 0.08, 'sine', big ? 0.35 : 0.18, 0.5); },
  ore(tier, gem) { if (!rate('ore', 50)) return; const b = 660 + (tier % 6) * 70; pling(b, 0.16); pling(b * 1.5, 0.13, 0.06); if (gem) { pling(b * 2, 0.12, 0.13); pling(b * 2.5, 0.12, 0.2); } },
  coin() { if (rate('coin', 60)) { tone(1319, 0.06, 'square', 0.07); tone(1976, 0.2, 'square', 0.07, null, 0.055); noise(0.12, 7000, 2, 0.05, 'highpass', null, 0.05); } },
  tick(i) { if (rate('tick', 30)) tone(1200 + Math.min(i, 20) * 40, 0.05, 'triangle', 0.08); },
  flask() { tone(300, 0.25, 'sine', 0.2, 2.5); pling(880, 0.08, 0.15); },
  hurt() { if (rate('hurt', 150)) tone(300, 0.25, 'sawtooth', 0.16, 0.4); },
  boom() { noise(0.7, 400, 0.7, 0.8, 'lowpass', 0.15); tone(70, 0.5, 'sine', 0.5, 0.4); },
  slash() { if (rate('slash', 60)) noise(0.08, 3000, 2, 0.18, 'highpass'); },
  kill() { pling(660, 0.12); pling(880, 0.1, 0.07); pling(1320, 0.08, 0.14); },
  say() { if (rate('say', 300)) { tone(700 + Math.random() * 300, 0.05, 'triangle', 0.07); tone(900 + Math.random() * 300, 0.06, 'triangle', 0.06, null, 0.06); } },
  sniff() { noise(0.07, 2400, 4, 0.16, 'bandpass', 1.4); noise(0.07, 2600, 4, 0.16, 'bandpass', 1.4, 0.12); },
  find() { [784, 988, 1175, 1568].forEach((f, i) => pling(f, 0.12, i * 0.07)); },
  goal() { [523, 659, 784].forEach((f, i) => pling(f, 0.14, i * 0.08)); pling(1047, 0.16, 0.26); noise(0.3, 6000, 1, 0.05, 'highpass', null, 0.26); },
  step2() { pling(880, 0.1); pling(1320, 0.08, 0.06); },
  buy() { [523, 659, 784, 1047].forEach((f, i) => pling(f, 0.12, i * 0.055)); },
  nope() { tone(200, 0.15, 'square', 0.08, 0.8); },
  click() { tone(900, 0.03, 'triangle', 0.08); },
  end() { [392, 330, 262].forEach((f, i) => pling(f, 0.14, i * 0.15)); },
  record() { [523, 659, 784, 1047, 1319].forEach((f, i) => pling(f, 0.12, i * 0.08)); },
  prestige() { tone(110, 1.2, 'sawtooth', 0.18, 0.3); noise(1.2, 300, 0.5, 0.6, 'lowpass', 0.2); [262, 330, 392, 523, 659, 784].forEach((f, i) => pling(f, 0.12, 0.8 + i * 0.1)); },
  low() { tone(880, 0.1, 'square', 0.07); tone(660, 0.1, 'square', 0.07, null, 0.15); },
  flare() { noise(0.5, 4000, 0.5, 0.25, 'highpass', 0.3); tone(1200, 0.4, 'sine', 0.12, 2); },
  step() { if (rate('step', 120)) noise(0.03, 300, 2, 0.08); }
};

/* ---- music: 80 BPM, F major, 16 bars (A: F Dm Bb C / F Am Bb C, B: Dm Bb F C / Gm Bb C C) ----
   camp = soft pad + marimba melody; dive adds bass, a light shaker and a counter-arp. */
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const CH = { F: [53, 57, 60], Dm: [50, 53, 57], Bb: [50, 53, 58], C: [52, 55, 60], Am: [52, 57, 60], Gm: [50, 55, 58] };
const BASS = { F: 41, Dm: 38, Bb: 46, C: 48, Am: 45, Gm: 43 };
const PROG = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Bb', 'C', 'Dm', 'Bb', 'F', 'C', 'Gm', 'Bb', 'C', 'C'];
const MEL = [
  [72, 0, 69, 0, 65, 67, 69, 0], [74, 0, 72, 69, 0, 0, 65, 0], [70, 0, 69, 0, 67, 0, 65, 67], [69, 0, 67, 0, 64, 0, 0, 0],
  [72, 0, 69, 0, 65, 67, 69, 72], [76, 0, 74, 72, 0, 69, 0, 0], [74, 0, 72, 0, 70, 69, 67, 0], [67, 0, 0, 0, 0, 0, 0, 0],
  [69, 0, 0, 72, 74, 0, 72, 0], [70, 0, 0, 74, 72, 0, 70, 0], [69, 0, 0, 72, 77, 0, 76, 74], [72, 0, 0, 0, 67, 0, 0, 0],
  [70, 0, 0, 74, 79, 0, 77, 74], [77, 0, 74, 0, 72, 0, 70, 0], [72, 0, 74, 0, 76, 0, 79, 0], [77, 0, 0, 0, 0, 0, 0, 0]
];
const BPM = 80, EIGHTH = 60 / BPM / 2;
const Music = {
  timer: null, next: 0, step: 0, mode: 'camp', diveG: null, padF: null,
  start() {
    if (!ac || this.timer) return;
    this.diveG = ac.createGain(); this.diveG.gain.value = this.mode === 'dive' ? 1 : 0; this.diveG.connect(musicBus);
    this.padF = ac.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 900; this.padF.Q.value = 0.4; this.padF.connect(musicBus);
    this.next = ac.currentTime + 0.1; this.step = 0;
    this.timer = setInterval(() => this.pump(), 60);
  },
  setMode(m) {
    this.mode = m;
    if (this.diveG) { const t = ac.currentTime; this.diveG.gain.cancelScheduledValues(t); this.diveG.gain.setTargetAtTime(m === 'dive' ? 1 : 0, t, 0.6); }
  },
  pump() {
    if (!ac || ac.state !== 'running') return;
    if (this.next < ac.currentTime - 0.5) this.next = ac.currentTime + 0.05; // after a long suspend: resync
    while (this.next < ac.currentTime + 0.3) { this.play(this.step, this.next); this.step = (this.step + 1) % (16 * 8); this.next += EIGHTH; }
  },
  play(step, t) {
    if (musicOff) return;
    const bar = Math.floor(step / 8), e = step % 8, ch = PROG[bar];
    // pad: one swell per bar
    if (e === 0) for (const m of CH[ch]) for (const det of [-4, 4]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = mtof(m); o.detune.value = det;
      const len = EIGHTH * 8;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.5); g.gain.setValueAtTime(0.045, t + len - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
      o.connect(g); g.connect(this.padF); o.start(t); o.stop(t + len + 0.3);
    }
    // marimba melody (sine + 4th partial, fast decay), gently swung
    const n = MEL[bar][e];
    if (n) {
      const tt = t + (e % 2 ? EIGHTH * 0.08 : 0);
      tone(mtof(n), 0.55, 'sine', 0.2, null, 0, musicBus, tt);
      tone(mtof(n) * 4, 0.09, 'sine', 0.045, null, 0, musicBus, tt);
    }
    // dive layer
    const dg = this.diveG;
    if (e === 0 || e === 4) tone(mtof(BASS[ch]), EIGHTH * 3.2, 'triangle', 0.26, null, 0, dg, t);
    if (e === 6) tone(mtof(BASS[ch] + 7), EIGHTH * 1.5, 'triangle', 0.16, null, 0, dg, t);
    if (e % 2 === 1) noise(0.045, 8000, 1, 0.05, 'highpass', null, 0, dg, t);
    if (!n && e % 2 === 0) tone(mtof(CH[ch][(e / 2) % 3] + 24), 0.22, 'sine', 0.05, null, 0, dg, t);
  }
};
function applyGains() {
  if (!master) return;
  master.gain.value = muted ? 0 : MASTER;
  musicBus.gain.setTargetAtTime(musicOff ? 0 : MUSIC, ac.currentTime, 0.15);
}
// pause everything while the tab is hidden; only resume what we paused ourselves
let hidPaused = false;
document.addEventListener('visibilitychange', () => {
  if (!ac) return;
  if (document.hidden) { if (ac.state === 'running') { hidPaused = true; ac.suspend(); } }
  else if (hidPaused) { hidPaused = false; ac.resume(); }
});
root.DBAudio = {
  init, SFX, Music,
  setMuted(m) { muted = m; applyGains(); },
  setMusicOff(m) { musicOff = m; applyGains(); },
  setMusicMode(m) { Music.setMode(m); },
  get muted() { return muted; }, get musicOff() { return musicOff; },
  get ctx() { return ac; }, get musicBus() { return musicBus; }, get master() { return master; }
};
})(self);
