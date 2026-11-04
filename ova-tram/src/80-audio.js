// ───────────────────────── sound: everything synthesised, scheduled against the picture ─────────────────────────
const AU = { ctx: null, T0: 0 };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const NOTE = (s) => { const m = s.match(/^([A-G])(#|b)?(-?\d)$/); const b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0); return 12 * (+m[3] + 1) + b; };
function audioStart(offset = 0) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  AU.ctx = ctx;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.006; comp.release.value = 0.25;
  const master = ctx.createGain(); master.gain.value = 0.72; master.connect(comp); comp.connect(ctx.destination);
  // generated hall impulse response
  const rev = ctx.createConvolver(), len = ctx.sampleRate * 3.4, ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) { const t = i / ctx.sampleRate; d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6) * (t < 0.02 ? t / 0.02 : 1); } }
  rev.buffer = ir; const revOut = ctx.createGain(); revOut.gain.value = 0.55; rev.connect(revOut); revOut.connect(master);
  const noise = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const brown = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate); { const d = brown.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; } }
  Object.assign(AU, { master, rev, noise, brown, offset });
  AU.T0 = ctx.currentTime + 0.7 - offset;
  scheduleScore(offset);
  return ctx;
}
const A = (t) => Math.max(AU.ctx.currentTime + 0.01, AU.T0 + t);
function out(node, dry = 1, wet = 0.2) { const g = AU.ctx.createGain(); g.gain.value = dry; node.connect(g); g.connect(AU.master); if (wet > 0) { const w = AU.ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(AU.rev); } return node; }
function env(g, t, a, peak, hold, rel, base = 0.0001) { const p = g.gain; p.setValueAtTime(base, t); p.linearRampToValueAtTime(peak, t + a); p.setValueAtTime(peak, t + a + hold); p.exponentialRampToValueAtTime(0.0001, t + a + hold + rel); }
function noiseSrc(t, dur, buf) { const s = AU.ctx.createBufferSource(); s.buffer = buf || AU.noise; s.loop = true; s.loopStart = Math.random() * 3; s.start(t, Math.random() * 3); s.stop(t + dur + 0.1); return s; }
function filt(type, f, q = 1) { const b = AU.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; }
function chain(...n) { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; }
function osc(type, f, t, dur) { const o = AU.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur + 0.1); return o; }
const live = (t0, t1) => t1 >= AU.offset;   // skip events wholly before a seek point
// ── sound effects
function sNoiseHit(t, dur, type, f, q, vol, wet = 0.2, a = 0.002) { if (!live(t, t + dur)) return; const T = A(t), g = AU.ctx.createGain(); chain(noiseSrc(T, dur), filt(type, f, q), g); env(g, T, a, vol, 0, dur); out(g, 1, wet); }
function sThunder(t, big) {
  if (!live(t, t + 6)) return; const T = A(t), g = AU.ctx.createGain(), f = filt('lowpass', big ? 240 : 140, 0.7);
  chain(noiseSrc(T, 7, AU.brown), f, g); f.frequency.setValueAtTime(big ? 600 : 160, T); f.frequency.exponentialRampToValueAtTime(90, T + 5);
  const p = g.gain; p.setValueAtTime(0.0001, T); p.linearRampToValueAtTime(big ? 1.1 : 0.35, T + (big ? 0.03 : 0.8)); for (let k = 1; k < 8; k++) p.linearRampToValueAtTime((big ? 0.9 : 0.3) * (0.4 + Math.random() * 0.6) * (1 - k / 9), T + k * 0.6); p.exponentialRampToValueAtTime(0.0001, T + 6.5);
  out(g, 1, 0.5);
  if (big) { sNoiseHit(t, 0.35, 'highpass', 1500, 0.5, 0.9, 0.6); sNoiseHit(t + 0.02, 1.2, 'bandpass', 500, 0.6, 0.5, 0.6); }
}
function sPlink(t, f, vol = 0.12) { if (!live(t, t + 0.3)) return; const T = A(t), o = osc('sine', f, T, 0.3), g = AU.ctx.createGain(); o.frequency.exponentialRampToValueAtTime(f * 0.7, T + 0.12); chain(o, g); env(g, T, 0.002, vol, 0, 0.12); out(g, 1, 0.35); }
function sSqueal(t, dur, f, vol, wob = 8) { // metal-on-metal shriek
  if (!live(t, t + dur)) return; const T = A(t), g = AU.ctx.createGain(), bp = filt('bandpass', f * 1.3, 3);
  for (const [r, a] of [[1, 1], [1.13, 0.6], [1.5, 0.4], [2.02, 0.25]]) { const o = osc('sawtooth', f * r, T, dur), og = AU.ctx.createGain(); og.gain.value = a * 0.25; const l = osc('sine', 5 + Math.random() * 4, T, dur), lg = AU.ctx.createGain(); lg.gain.value = wob * r; chain(l, lg); lg.connect(o.frequency); o.frequency.linearRampToValueAtTime(f * r * (1.1 + Math.random() * 0.15), T + dur); chain(o, og, bp); }
  chain(bp, g); env(g, T, 0.05, vol, dur * 0.6, dur * 0.4); out(g, 1, 0.4);
}
function sBoing(t, f = 140, vol = 0.35) { if (!live(t, t + 1)) return; const T = A(t), o = osc('triangle', f, T, 0.9), g = AU.ctx.createGain(); o.frequency.exponentialRampToValueAtTime(f * 0.55, T + 0.7); chain(o, g); env(g, T, 0.005, vol, 0, 0.7); out(g, 1, 0.3); sNoiseHit(t, 0.05, 'bandpass', 2400, 2, 0.15, 0.2); }
function sArc(t, dur, vol = 0.3) { // electric arcing: buzzy saw through a waveshaper, gated by crackle
  if (!live(t, t + dur)) return; const T = A(t), ctx = AU.ctx, o = osc('sawtooth', 100, T, dur), ws = ctx.createWaveShaper(), cur = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cur[i] = Math.tanh(x * 6); } ws.curve = cur;
  const g = ctx.createGain(), hp = filt('highpass', 300, 0.7); chain(o, ws, hp, g);
  const p = g.gain; p.setValueAtTime(0.0001, T); for (let k = 0; k < dur * 14; k++) { const tt = T + k / 14; p.setValueAtTime(Math.random() < 0.55 ? vol * (0.4 + Math.random() * 0.6) : 0.0001, tt); } p.setValueAtTime(0.0001, T + dur);
  out(g, 1, 0.25);
  for (let k = 0; k < dur * 9; k++) sNoiseHit(t + k / 9 + Math.random() * 0.08, 0.04 + Math.random() * 0.05, 'highpass', 2500, 0.7, vol * 1.2 * Math.random(), 0.3);
}
function sClick(t, vol = 0.25, f = 3200) { sNoiseHit(t, 0.03, 'bandpass', f, 4, vol, 0.15); if (!live(t, t + 0.1)) return; const T = A(t), o = osc('sine', 180, T, 0.06), g = AU.ctx.createGain(); chain(o, g); env(g, T, 0.001, vol * 0.6, 0, 0.05); out(g, 1, 0.1); }
function sRelay(t) { sClick(t, 0.3, 1800); sNoiseHit(t + 0.01, 0.12, 'lowpass', 400, 0.8, 0.35, 0.2); }
function sHum(t, dur, vol = 0.05, f = 60) { if (!live(t, t + dur)) return; const T = A(t), g = AU.ctx.createGain(); for (const [r, a] of [[1, 1], [2, 0.6], [3, 0.3], [5, 0.15]]) { const o = osc('sine', f * r, T, dur), og = AU.ctx.createGain(); og.gain.value = a; chain(o, og, g); } env(g, T, 0.6, vol, dur - 1.6, 1); out(g, 1, 0.15); }
function sGroan(t, dur, vol = 0.45) { // traction motor straining
  if (!live(t, t + dur)) return; const T = A(t), ctx = AU.ctx, g = ctx.createGain(), lp = filt('lowpass', 260, 2);
  for (const [f, a] of [[38, 1], [38.6, 0.8], [57, 0.5], [114, 0.25]]) { const o = osc('sawtooth', f, T, dur), og = ctx.createGain(); og.gain.value = a * 0.3; o.frequency.setValueAtTime(f, T); o.frequency.linearRampToValueAtTime(f * 1.25, T + dur * 0.6); o.frequency.linearRampToValueAtTime(f * 1.55, T + dur); chain(o, og, lp); }
  lp.frequency.setValueAtTime(160, T); lp.frequency.linearRampToValueAtTime(520, T + dur);
  chain(lp, g); const p = g.gain; p.setValueAtTime(0.0001, T); p.linearRampToValueAtTime(vol, T + 0.4); for (let k = 1; k < dur * 2.5; k++) p.linearRampToValueAtTime(vol * (0.55 + Math.random() * 0.45), T + k / 2.5); p.linearRampToValueAtTime(0.0001, T + dur);
  out(g, 1, 0.3);
}
function sCreak(t, vol = 0.2) { sSqueal(t, 0.35 + Math.random() * 0.3, 380 + Math.random() * 300, vol, 30); }
function sRip(t, vol = 0.35) { // ivy tearing
  if (!live(t, t + 0.5)) return; const T = A(t), g = AU.ctx.createGain(), bp = filt('bandpass', 1400, 1.2); chain(noiseSrc(T, 0.5), bp, g);
  const p = g.gain; p.setValueAtTime(0.0001, T); for (let k = 0; k < 18; k++) p.setValueAtTime(vol * Math.random(), T + k * 0.02); p.exponentialRampToValueAtTime(0.0001, T + 0.45); bp.frequency.linearRampToValueAtTime(2600, T + 0.4); out(g, 1, 0.3);
}
function sCrackle(t, vol = 0.3) { for (let k = 0; k < 6; k++) sNoiseHit(t + k * 0.018 + Math.random() * 0.02, 0.02, 'bandpass', 1200 + Math.random() * 2000, 2, vol * Math.random(), 0.15); }
function sChime(t, m, vol = 0.12, dec = 2.2) { // FM celesta / glass bell
  if (!live(t, t + dec)) return; const T = A(t), ctx = AU.ctx, f = mtof(m), car = osc('sine', f, T, dec), mod = osc('sine', f * 3.5, T, dec), mg = ctx.createGain(), g = ctx.createGain();
  mg.gain.setValueAtTime(f * 2.4, T); mg.gain.exponentialRampToValueAtTime(f * 0.05, T + dec * 0.5); chain(mod, mg); mg.connect(car.frequency);
  chain(car, g); env(g, T, 0.003, vol, 0, dec); out(g, 0.8, 0.6);
}
function sTramBell(t, vol = 0.32, far = 0) { // "chin-chin"
  for (const k of [0, 0.2]) {
    const tt = t + k; if (!live(tt, tt + 2)) continue; const T = A(tt), ctx = AU.ctx, g = ctx.createGain(); g.gain.value = vol * (k ? 0.85 : 1);
    for (const [r, a, d] of [[1, 1, 1.5], [2.76, 0.55, 1.0], [5.4, 0.3, 0.55], [8.93, 0.16, 0.3]]) { const o = osc('sine', 1175 * r, T, d), og = ctx.createGain(); chain(o, og, g); env(og, T, 0.001, a, 0, d); }
    out(g, far ? 0.15 : 1, far ? 1.2 : 0.35); sNoiseHit(tt, 0.012, 'highpass', 4000, 0.7, vol * 0.5 * (far ? 0.2 : 1), 0.2);
  }
}
function sWhoosh(t, dur, vol = 0.3, f0 = 300, f1 = 2400) { if (!live(t, t + dur)) return; const T = A(t), g = AU.ctx.createGain(), bp = filt('bandpass', f0, 0.8); chain(noiseSrc(T, dur), bp, g); bp.frequency.exponentialRampToValueAtTime(f1, T + dur * 0.8); env(g, T, dur * 0.6, vol, 0, dur * 0.4); out(g, 1, 0.4); }
function sBoom(t, vol = 0.7) { if (!live(t, t + 3)) return; const T = A(t), o = osc('sine', 72, T, 3), g = AU.ctx.createGain(); o.frequency.exponentialRampToValueAtTime(44, T + 0.5); chain(o, g); env(g, T, 0.005, vol, 0, 2.6); out(g, 1, 0.5); sNoiseHit(t, 0.4, 'lowpass', 300, 0.7, vol * 0.5, 0.5); }
function sCymbal(t, dur, vol = 0.18) { if (!live(t, t + dur)) return; const T = A(t), g = AU.ctx.createGain(); chain(noiseSrc(T, dur), filt('highpass', 6000, 0.7), g); const p = g.gain; p.setValueAtTime(0.0001, T); p.exponentialRampToValueAtTime(vol, T + dur * 0.97); p.linearRampToValueAtTime(0.0001, T + dur); out(g, 1, 0.6); }
// ── music instruments
function mPad(t, dur, notes, vol = 0.06, bright = 0.5, atk = 0.9) {
  if (!live(t, t + dur + 2)) return; const T = A(t), ctx = AU.ctx, g = ctx.createGain(), lp = filt('lowpass', 400 + bright * 2400, 0.6);
  for (const n of notes) { const m = typeof n === 'string' ? NOTE(n) : n, f = mtof(m); for (const dt of [-7, 6]) { const o = osc('sawtooth', f, T, dur + 2.2); o.detune.value = dt + Math.random() * 3; chain(o, lp); } const s = osc('triangle', f, T, dur + 2.2), sg = ctx.createGain(); sg.gain.value = 0.6; chain(s, sg, lp); }
  lp.frequency.setValueAtTime(300, T); lp.frequency.linearRampToValueAtTime(400 + bright * 2400, T + atk * 1.4);
  chain(lp, g); const p = g.gain; p.setValueAtTime(0.0001, T); p.linearRampToValueAtTime(vol / Math.sqrt(notes.length), T + atk); p.setValueAtTime(vol / Math.sqrt(notes.length), T + dur); p.linearRampToValueAtTime(0.0001, T + dur + 2);
  out(g, 0.7, 0.7);
}
function mLead(t, dur, n, vol = 0.07) { // string-ensemble lead with delayed vibrato
  if (!live(t, t + dur + 1)) return; const T = A(t), ctx = AU.ctx, f = mtof(NOTE(n)), g = ctx.createGain(), lp = filt('lowpass', 2800, 0.7);
  const vib = osc('sine', 5.3, T, dur + 0.8), vg = ctx.createGain(); vg.gain.setValueAtTime(0, T); vg.gain.linearRampToValueAtTime(f * 0.006, T + Math.min(0.5, dur * 0.6)); chain(vib, vg);
  for (const dt of [-9, 0, 8]) { const o = osc('sawtooth', f, T, dur + 0.8); o.detune.value = dt; vg.connect(o.frequency); chain(o, lp); }
  const fl = osc('sine', f * 2, T, dur + 0.8), fg = ctx.createGain(); fg.gain.value = 0.35; vg.connect(fl.frequency); chain(fl, fg, lp);
  chain(lp, g); const p = g.gain; p.setValueAtTime(0.0001, T); p.linearRampToValueAtTime(vol, T + 0.12); p.setValueAtTime(vol, T + dur); p.linearRampToValueAtTime(0.0001, T + dur + 0.55);
  out(g, 0.8, 0.6);
}
function mPluck(t, n, vol = 0.06) { if (!live(t, t + 1)) return; const T = A(t), f = mtof(NOTE(n)), o = osc('triangle', f, T, 0.6), g = AU.ctx.createGain(), lp = filt('lowpass', 1800, 1); chain(o, lp, g); env(g, T, 0.004, vol, 0, 0.35); out(g, 1, 0.3); }
// ── the score
function scheduleScore(off) {
  const ctx = AU.ctx;
  // rain bed with per-shot colour: [time, level, lowpass]
  const rainK = [[0, 0.0001, 5000], [1.8, 0.5, 5200], [9, 0.38, 2400], [13.5, 0.5, 5200], [15.6, 0.38, 2400], [18, 0.62, 6500], [25, 0.26, 900], [30.5, 0.4, 3800], [34, 0.36, 1800], [40.5, 0.5, 5200], [49, 0.42, 5600], [54, 0.05, 3000], [55.6, 0.26, 5000], [65, 0.1, 4000], [69.5, 0.22, 4200], [74, 0.08, 4000], [79.5, 0.0001, 4000]];
  {
    const T = AU.ctx.currentTime + 0.02, src = noiseSrc(T, 90 - off), hp = filt('highpass', 380, 0.5), lp = filt('lowpass', 5000, 0.4), g = ctx.createGain(); chain(src, hp, lp, g);
    const src2 = noiseSrc(T, 90 - off, AU.brown), lp2 = filt('lowpass', 500, 0.5), g2 = ctx.createGain(); g2.gain.value = 0.35; chain(src2, lp2, g2, g);
    g.gain.setValueAtTime(0.0001, T);
    for (let i = 0; i < rainK.length; i++) { const [tt, v, f] = rainK[i]; if (tt < off) { g.gain.setValueAtTime(v, T); lp.frequency.setValueAtTime(f, T); continue; } const ramp = i && (tt - rainK[i - 1][0]) > 3 ? 0 : 0.06; g.gain.setValueAtTime(g.gain.value, A(tt)); g.gain.linearRampToValueAtTime(v, A(tt) + (i === 1 ? 1.8 : 0.05)); lp.frequency.setValueAtTime(f, A(tt)); }
    out(g, 1, 0.12);
  }
  // patter on metal & leaves
  for (let t = 0.5; t < 80; t += 0.05 + Math.random() * 0.09) {
    const k = (t > 18 && t < 25) ? 1 : (t > 9 && t < 18) ? 0.5 : (t > 25 && t < 30.5) ? 0.15 : (t > 54 && t < 55.6) ? 0 : (t > 65) ? 0.12 : 0.35;
    if (Math.random() < k) sPlink(t, 2200 + Math.random() * 2600, 0.02 + Math.random() * 0.03);
  }
  // S1 lamp crackle & buzz
  for (const [a, b] of [[46, 60], [126, 138], [170, 186]]) { for (let f = a; f < b; f += 2) sNoiseHit(f / 24, 0.03, 'bandpass', 3000, 2, 0.06, 0.1); sHum(a / 24, (b - a) / 24 + 1.4, 0.02, 120); }
  // S2/S4: drips off the step (plinks at impact)
  for (const [, per, ph] of DRIPS) for (let k = -2; k < 20; k++) { const ti = 9 + (k + 1 - ph) * per * 1; if (ti > 9.2 && ti < 18) sPlink(ti, 1500 + Math.random() * 600, 0.07); }
  sThunder(12.5, false);
  sThunder(13.5, true);
  // the cat bolts: scramble + splash
  for (let k = 0; k < 5; k++) sNoiseHit(16.82 + k * 0.05, 0.04, 'bandpass', 2600, 1.5, 0.18, 0.2);
  sNoiseHit(16.86, 0.35, 'bandpass', 1300, 0.8, 0.25, 0.3);
  // S5 pantograph
  sCreak(19.26, 0.12); sCreak(19.42, 0.1);
  sSqueal(19.8, 1.9, 1900, 0.16); sSqueal(20.0, 1.7, 2350, 0.1, 14);
  for (const k of [20.05, 20.55, 21.05, 21.5]) sBoing(k, 120 + Math.random() * 60, 0.3);
  sNoiseHit(21.7, 0.5, 'highpass', 800, 0.5, 0.8, 0.6); sBoom(21.7, 0.35); sArc(21.7, 3.3, 0.22);
  // S6 interior: relays, hum, the motor-generator waking
  LAMPS_Z.forEach((z, i) => { const on = 25 + [0.7, 1.45, 2.05, 2.55, 3.0][i]; sRelay(on); sNoiseHit(on + 0.12, 0.03, 'bandpass', 2500, 2, 0.12, 0.1); sNoiseHit(on + 0.25, 0.03, 'bandpass', 2500, 2, 0.1, 0.1); });
  sHum(25.7, 5, 0.05, 60);
  if (live(27.4, 31)) { const T = A(27.4), o = osc('sine', 180, T, 3.5), g = ctx.createGain(); o.frequency.exponentialRampToValueAtTime(420, T + 3); chain(o, g); env(g, T, 1.5, 0.04, 1, 1); out(g, 1, 0.3); }
  sCreak(27.7, 0.06); sCreak(28.4, 0.05);
  // S7 roller ratchet
  sClick(31.13, 0.3); sClick(31.53, 0.3);
  { let tt = 31.8; while (tt < 33.05) { const u = (tt - 31.8) / 1.25, rate = 8 + 30 * Math.sin(Math.PI * Math.min(1, u * 1.1)); sClick(tt, 0.14, 2600 + Math.random() * 800); tt += 1 / rate; } }
  for (const k of [33.12, 33.2, 33.3]) sClick(k, 0.22); sRelay(33.36); sChime(33.4, NOTE('A5'), 0.06, 2.5);
  // S8 wheels: groan, creaks, rust pops, ivy tearing, the wheels start to turn
  sGroan(34.4, 6.0, 0.5);
  for (const k of [34.75, 35.35, 36.05, 37.0, 37.4]) sCreak(k, 0.14);
  for (const [t0] of [[1.4], [1.6], [2.1], [2.3], [2.6], [3.1], [3.4], [4.7], [4.9], [5.3]]) sCrackle(34 + t0, 0.35);
  for (const s of WIVY) sRip(34 + s.tear, 0.4);
  sSqueal(38.6, 1.6, 700, 0.08, 20); sNoiseHit(38.6, 1.8, 'bandpass', 500, 1, 0.12, 0.2);
  // S9 the stitching: light hum, chimes climbing with the sleepers, the moon
  if (live(41.6, 49)) { const T = A(41.6), g = ctx.createGain(); for (const f of [880, 1320.5]) { const o = osc('sine', f, T, 7.6), tr = osc('sine', 7, T, 7.6), tg = ctx.createGain(); tg.gain.value = 0.3; const og = ctx.createGain(); og.gain.value = 0.5; chain(tr, tg); tg.connect(og.gain); chain(o, og, g); } env(g, T, 2, 0.015, 4, 1.5); out(g, 1, 0.6); }
  { const scale = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'E6', 'F#6', 'A6', 'B6']; let k = 0; TRACK9.sleepers.forEach((s, i) => { if (i % 3) return; const ti = 40.5 + 1.2 + 5.4 * Math.pow(s.u, 1 / 0.8); if (ti > 48) return; sChime(ti, NOTE(scale[Math.min(scale.length - 1, Math.floor(k / 2.2))]) + (k % 2 ? 0 : -12 + 12), 0.05 + 0.02 * Math.sin(k), 2.4); k++; }); }
  mPad(41.0, 2.2, ['B2', 'F#3', 'B3', 'C#4', 'D4'], 0.07, 0.25, 1.6);
  mPad(43.2, 2.0, ['G2', 'D3', 'B3', 'F#4'], 0.07, 0.3, 1.0);
  mPad(45.2, 2.0, ['E2', 'B2', 'G3', 'D4', 'F#4'], 0.08, 0.4, 1.0);
  mPad(47.2, 1.8, ['A2', 'E3', 'A3', 'D4', 'E4'], 0.09, 0.5, 0.8);
  sWhoosh(44.5, 3.2, 0.08, 200, 1200);
  // S10 rolling: motor whine, rail joints, bell, sparks
  if (live(49.3, 54)) { const T = A(49.3), g = ctx.createGain(), lp = filt('lowpass', 900, 1.5); for (const r of [1, 1.5, 2]) { const o = osc('sawtooth', 60 * r, T, 4.8); o.frequency.setValueAtTime(60 * r, T); o.frequency.exponentialRampToValueAtTime(320 * r, T + 4.6); const og = ctx.createGain(); og.gain.value = 0.2 / r; chain(o, og, lp); } lp.frequency.exponentialRampToValueAtTime(3000, T + 4.6); chain(lp, g); env(g, T, 1.2, 0.16, 3.0, 0.5); out(g, 1, 0.3); }
  for (let j = 1; j < 12; j++) { const dj = j * 260, lt = 0.55 + Math.pow(dj / 40, 0.4); if (lt > 4.9) break; const v = 100 * Math.pow(Math.max(0.01, lt - 0.55), 1.5); const gap = Math.min(0.3, 140 / v * 1.0); sNoiseHit(49 + lt, 0.05, 'lowpass', 700, 1, 0.5, 0.2); sNoiseHit(49 + lt + gap, 0.05, 'lowpass', 700, 1, 0.45, 0.2); }
  sTramBell(50.1, 0.3);
  for (const k of [51.9, 52.2, 52.95, 53.2]) { sCrackle(k, 0.5); sChime(k, NOTE('A6'), 0.05, 1.2); }
  sWhoosh(51.5, 2.5, 0.22, 300, 3000);
  { const pulse = ['A2', 'A2', 'A3', 'A2']; let tt = 49.4, k = 0; while (tt < 53.9) { mPluck(tt, pulse[k % 4], 0.05 + k * 0.002); const iv = Math.max(0.13, 0.5 - (tt - 49.4) * 0.09); tt += iv; k++; } }
  mPad(49.2, 4.6, ['A2', 'E3', 'A3', 'C#4', 'E4'], 0.07, 0.4, 2.5);
  sCymbal(52.6, 1.4, 0.16);
  // S11 liftoff: the hit, everything else drops away
  sBoom(54.0, 0.8);
  mPad(54.0, 1.8, ['D2', 'A2', 'D3', 'F#3', 'A3', 'E4', 'F#4', 'A4'], 0.16, 0.85, 0.05);
  mLead(54.0, 1.6, 'A5', 0.05);
  // S12–S13 the soaring theme
  const prog = [['D2', 'A2', 'D3', 'F#3', 'A3'], ['C#2', 'A2', 'E3', 'A3', 'E4'], ['B1', 'F#2', 'D3', 'F#3', 'B3'], ['G1', 'D2', 'B2', 'D3', 'G3', 'B3'], ['F#2', 'A2', 'D3', 'A3', 'D4'], ['E2', 'B2', 'D3', 'G3', 'B3'], ['G2', 'B2', 'D3', 'G3', 'D4'], ['A2', 'E3', 'A3', 'D4', 'E4']];
  prog.forEach((ch, i) => mPad(55.7 + i * 1.18, 1.25, ch, 0.11, 0.6, 0.35));
  const mel = [['A4', 0, 0.6], ['D5', 0.6, 1.2], ['E5', 1.8, 0.3], ['F#5', 2.1, 0.9], ['E5', 3.0, 0.6], ['D5', 3.6, 0.6], ['B4', 4.2, 1.2], ['A4', 5.4, 0.6], ['B4', 6.0, 0.3], ['D5', 6.3, 0.3], ['E5', 6.6, 1.2], ['F#5', 7.8, 0.6], ['A5', 8.4, 1.6]];
  for (const [n, s, d] of mel) mLead(55.8 + s, d, n, 0.075);
  for (let k = 0; k < 16; k++) mPluck(55.8 + k * 0.59, ['D3', 'A3', 'F#3', 'A3'][k % 4], 0.035);
  for (const k of [56.4, 59.8, 63.0]) sTramBell(k, 0.26);
  sWhoosh(55.8, 4, 0.1, 200, 900); sWhoosh(60, 5, 0.12, 300, 1400);
  for (let k = 0; k < 18; k++) sCrackle(56 + k * 0.5 + Math.random() * 0.3, 0.08);
  // clouds: climax, rising arpeggio, swell into white
  mPad(65.0, 4.3, ['D2', 'A2', 'D3', 'F#3', 'A3', 'E4', 'F#4', 'A4', 'D5'], 0.14, 0.75, 1.2);
  mLead(65.1, 2.0, 'D6', 0.05); mLead(67.1, 2.2, 'E6', 0.05);
  { const arp = ['D5', 'F#5', 'A5', 'D6', 'E6', 'F#6', 'A6']; let tt = 65.2, k = 0; while (tt < 69.2) { sChime(tt, NOTE(arp[k % arp.length]) + (k >= arp.length ? 12 : 0) * 0, 0.05, 1.6); tt += Math.max(0.09, 0.32 - (tt - 65.2) * 0.06); k++; } }
  sWhoosh(65.2, 4.0, 0.16, 250, 2600); sCymbal(68.0, 1.5, 0.18);
  // the ending: rain thins, a music box remembers the theme, one bell from very far away
  const endP = [[69.6, ['G2', 'D3', 'B3', 'F#4']], [71.9, ['F#2', 'D3', 'A3', 'D4']], [74.2, ['E2', 'B2', 'G3', 'D4']], [76.4, ['A2', 'E3', 'A3', 'D4']], [78.0, ['D2', 'A2', 'F#3', 'A3', 'D4']]];
  endP.forEach(([tt, ch], i) => mPad(tt, i === 4 ? 1.5 : 2.2, ch, 0.07, 0.35, 1.0));
  for (const [n, s] of [['F#5', 0], ['E5', 0.55], ['D5', 1.1], ['A4', 1.65], ['B4', 2.75], ['D5', 3.3], ['E5', 3.85], ['D5', 5.0], ['A5', 6.4], ['F#5', 7.6]]) sChime(70.4 + s, NOTE(n), 0.07, 2.6);
  sTramBell(76.2, 0.22, 1);
}
