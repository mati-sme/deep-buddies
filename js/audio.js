/* Deep Buddies - tiny WebAudio synth (no audio files). */
(function (root) {
'use strict';
let ac = null, master = null, noiseBuf = null, muted = false, last = {};
function init() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const A = window.AudioContext || window.webkitAudioContext; if (!A) return;
  ac = new A(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ac.destination);
  noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.6, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function rate(name, ms) { const n = performance.now(); if (last[name] && n - last[name] < ms) return false; last[name] = n; return true; }
function tone(freq, dur, type, vol, slide, delay) {
  if (!ac || muted) return;
  const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), g = ac.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, freq, q, vol, type, slide) {
  if (!ac || muted) return;
  const t = ac.currentTime, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = noiseBuf; f.type = type || 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q || 1;
  if (slide) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
  g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + 0.02);
}
const SFX = {
  chip(s) { if (rate('chip', 45)) noise(0.06, 1800 - Math.min(s, 10) * 110, 3, 0.25); },
  brk(big) { if (!rate('brk', 40)) return; noise(big ? 0.25 : 0.12, big ? 500 : 900, 1, big ? 0.5 : 0.3, 'lowpass', 0.4); if (big) tone(90, 0.2, 'sine', 0.35, 0.5); },
  ore(tier, gem) { const b = 520 + (tier % 6) * 60; tone(b, 0.09, 'square', 0.12); tone(b * 1.5, 0.12, 'square', 0.12, null, 0.07); if (gem) { tone(b * 2, 0.15, 'triangle', 0.15, null, 0.14); tone(b * 2.5, 0.2, 'triangle', 0.15, null, 0.22); } },
  coin() { if (rate('coin', 60)) { tone(988, 0.07, 'square', 0.1); tone(1319, 0.15, 'square', 0.1, null, 0.06); } },
  flask() { tone(300, 0.25, 'sine', 0.2, 2.5); },
  hurt() { if (rate('hurt', 150)) tone(300, 0.25, 'sawtooth', 0.18, 0.4); },
  boom() { noise(0.7, 400, 0.7, 0.8, 'lowpass', 0.15); tone(70, 0.5, 'sine', 0.5, 0.4); },
  slash() { if (rate('slash', 60)) noise(0.08, 3000, 2, 0.18, 'highpass'); },
  kill() { tone(660, 0.08, 'square', 0.12); tone(440, 0.12, 'square', 0.12, null, 0.07); tone(880, 0.15, 'triangle', 0.1, null, 0.14); },
  say() { if (rate('say', 300)) { tone(700 + Math.random() * 300, 0.05, 'triangle', 0.08); tone(900 + Math.random() * 300, 0.06, 'triangle', 0.07, null, 0.06); } },
  buy() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, 'square', 0.1, null, i * 0.06)); },
  nope() { tone(200, 0.15, 'square', 0.1, 0.8); },
  click() { tone(800, 0.03, 'square', 0.06); },
  end() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, 'triangle', 0.15, null, i * 0.15)); },
  record() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.11, null, i * 0.08)); },
  prestige() { tone(110, 1.2, 'sawtooth', 0.2, 0.3); noise(1.2, 300, 0.5, 0.6, 'lowpass', 0.2); [262, 330, 392, 523, 659, 784].forEach((f, i) => tone(f, 0.3, 'triangle', 0.12, null, 0.8 + i * 0.1)); },
  low() { tone(880, 0.1, 'square', 0.08); tone(660, 0.1, 'square', 0.08, null, 0.15); },
  flare() { noise(0.5, 4000, 0.5, 0.25, 'highpass', 0.3); tone(1200, 0.4, 'sine', 0.12, 2); },
  step() { if (rate('step', 120)) noise(0.03, 300, 2, 0.08); }
};
root.DBAudio = { init, SFX, setMuted(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; }, get muted() { return muted; } };
})(self);
