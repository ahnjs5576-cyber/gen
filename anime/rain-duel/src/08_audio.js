// ===================================================================
//  SOUND — every sound synthesized: rain, wind, thunder, steel, flesh,
//  water, fire, lightning, taiko, drone and a breathy bamboo flute
// ===================================================================
function scoreAudio(ac, out, T0, from) {
  const sr = ac.sampleRate;
  const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = .005; comp.release.value = .25;
  const lim = ac.createDynamicsCompressor(); lim.threshold.value = -4; lim.ratio.value = 20; lim.attack.value = .001; lim.release.value = .1; lim.knee.value = 0;
  comp.connect(lim); lim.connect(out);
  const bus = ac.createGain(); bus.gain.value = .72; bus.connect(comp);
  // reverb (procedural impulse: a wet stone courtyard in the mountains)
  const rv = ac.createConvolver(); { const len = sr * 3.2, b = ac.createBuffer(2, len, sr); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); } rv.buffer = b; }
  const rvg = ac.createGain(); rvg.gain.value = .32; rv.connect(rvg); rvg.connect(comp);
  const send = (node, dry = 1, wet = .3) => { const d = ac.createGain(); d.gain.value = dry; node.connect(d); d.connect(bus); const w = ac.createGain(); w.gain.value = wet; node.connect(w); w.connect(rv); };
  const at = t => T0 + t;
  const live = t => t >= from - .05;
  // noise buffers
  const mkNoise = (sec, type) => { const b = ac.createBuffer(1, sr * sec, sr), d = b.getChannelData(0); let l = 0; for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; if (type === 'brown') { l = (l + .02 * w) / 1.02; d[i] = l * 3.5; } else if (type === 'pink') { l = .97 * l + .03 * w; d[i] = (w * .4 + l * 2.2); } else d[i] = w; } return b; };
  const WN = mkNoise(4, 'white'), BN_ = mkNoise(6, 'brown'), PN = mkNoise(5, 'pink');
  const src = (buf, loop) => { const s = ac.createBufferSource(); s.buffer = buf; s.loop = !!loop; return s; };
  const filt = (type, f, q = .7) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };
  const gainN = v => { const g = ac.createGain(); g.gain.value = v; return g; };
  const chain = (...n) => { for (let i = 0; i < n.length - 1; i++) n[i].connect(n[i + 1]); return n[n.length - 1]; };
  // gain automation from a film-time table
  const automate = (param, table) => {
    param.setValueAtTime(table[0][1], ac.currentTime);
    let cur = table[0][1];
    for (const [t, v, mode] of table) {
      if (t < from) { cur = v; param.setValueAtTime(v, ac.currentTime); continue; }
      if (mode === 'set') param.setValueAtTime(v, at(t)); else param.linearRampToValueAtTime(v, at(t));
    }
  };

  // ---------------- beds ----------------
  { // rain
    const s = src(PN, true), bp = filt('bandpass', 2400, .45), lp = filt('lowpass', 7000), g = gainN(0);
    chain(s, bp, lp, g); send(g, 1, .15);
    automate(g.gain, [[0, 0], [1.2, .55], [7, .55], [7.3, .38], [17.4, .38], [17.6, .6], [55.9, .6], [56.0, 0, 'set'], [63, 0, 'set'], [64.8, .5], [74.5, .5], [77.6, .06], [79.8, 0]]);
    s.start(ac.currentTime, (from % 5)); s.stop(at(DUR + 1));
    const s2 = src(WN, true), hp = filt('highpass', 5000), g2 = gainN(0);
    chain(s2, hp, g2); send(g2, 1, .1);
    automate(g2.gain, [[0, 0], [1.2, .12], [55.9, .12], [56, 0, 'set'], [63, 0, 'set'], [65, .1], [76, .02], [79, 0]]);
    s2.start(ac.currentTime, from % 4); s2.stop(at(DUR + 1));
  }
  { // wind gusts
    const s = src(BN_, true), lp = filt('lowpass', 520, .9), g = gainN(0);
    chain(s, lp, g); send(g, 1, .3);
    const tb = [[0, 0]]; for (let t = .5; t < 56; t += 1.7) tb.push([t, .28 + .3 * Math.abs(Math.sin(t * 1.3))]); tb.push([56, 0, 'set'], [63, 0, 'set']); for (let t = 64; t < 80; t += 2) tb.push([t, .15 * (1 - (t - 64) / 16)]);
    automate(g.gain, tb);
    const fl = [[0, 380]]; for (let t = 1; t < 80; t += 2.3) fl.push([t, 300 + 500 * Math.abs(Math.sin(t * .77))]);
    automate(lp.frequency, fl);
    s.start(ac.currentTime, from % 6); s.stop(at(DUR + 1));
  }
  // drips / close drops
  for (let t = Math.max(.5, from); t < 79; t += .07 + Math.random() * .22) {
    if (t > 55.9 && t < 64) continue;
    const s = src(WN), bp = filt('bandpass', 1500 + Math.random() * 3500, 6), g = gainN(0);
    chain(s, bp, g); send(g, .7, .2);
    const v = (t > 75 ? Math.max(0, 1 - (t - 75) / 3) : 1) * (.05 + Math.random() * .1);
    g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t) + .002); g.gain.exponentialRampToValueAtTime(.0005, at(t) + .05);
    s.start(at(t), Math.random() * 3); s.stop(at(t) + .08);
  }

  // ---------------- sound effects ----------------
  const noiseHit = (t, dur, type, f, q, v, wet = .3, f1) => {
    if (!live(t)) return; const s = src(WN), b = filt(type, f, q), g = gainN(0);
    chain(s, b, g); send(g, 1, wet);
    if (f1) b.frequency.exponentialRampToValueAtTime(f1, at(t + dur));
    g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t) + .005); g.gain.exponentialRampToValueAtTime(.0008, at(t + dur));
    s.start(at(t), Math.random() * 2); s.stop(at(t + dur + .05));
  };
  const tone = (t, f, dur, v, type = 'sine', f1, wet = .3, att = .004) => {
    if (!live(t)) return; const o = ac.createOscillator(), g = gainN(0); o.type = type; o.frequency.setValueAtTime(f, at(t)); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at(t + dur));
    chain(o, g); send(g, 1, wet);
    g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t) + att); g.gain.exponentialRampToValueAtTime(.0005, at(t + dur));
    o.start(at(t)); o.stop(at(t + dur + .05));
  };
  const whoosh = (t, dur, f0, f1, v) => {
    if (!live(t)) return; const s = src(WN), b = filt('bandpass', f0, 1.4), g = gainN(0);
    chain(s, b, g); send(g, 1, .25);
    b.frequency.setValueAtTime(f0, at(t)); b.frequency.exponentialRampToValueAtTime(f1, at(t + dur));
    g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + dur * .6)); g.gain.linearRampToValueAtTime(0, at(t + dur));
    s.start(at(t), Math.random()); s.stop(at(t + dur + .05));
  };
  const clang = (t, v = .5) => {
    [523, 1307, 2131, 3170, 4415, 5890, 7310].forEach((f, i) => tone(t, f * (1 + Math.random() * .01), .25 + 1.6 / (i + 1), v * .22 / (1 + i * .3), 'sine', null, .5, .001));
    noiseHit(t, .06, 'highpass', 3000, .7, v * .9, .4);
  };
  const thump = (t, v = .7) => { tone(t, 140, .22, v, 'sine', 42, .2, .002); noiseHit(t, .09, 'lowpass', 1400, .8, v * .6, .2); };
  const splash = (t, v = .4, len = .3) => { noiseHit(t, len, 'bandpass', 1300, .8, v, .3, 600); noiseHit(t + .02, len * .7, 'highpass', 3500, .7, v * .4, .3); };
  const thunder = (t, v = .9, near = false) => {
    if (near) noiseHit(t, .35, 'highpass', 1200, .5, v * .5, .5);
    if (!live(t)) return;
    const s = src(BN_), lp = filt('lowpass', near ? 260 : 160, .7), g = gainN(0);
    chain(s, lp, g); send(g, 1, .6);
    g.gain.setValueAtTime(0, at(t)); let tt = t; g.gain.linearRampToValueAtTime(v, at(t + .12));
    for (let i = 0; i < 8; i++) { tt += .25 + Math.random() * .45; g.gain.linearRampToValueAtTime(v * (1 - i / 9) * (.5 + Math.random() * .5), at(tt)); }
    g.gain.linearRampToValueAtTime(0, at(tt + 1.4));
    s.start(at(t), Math.random() * 3); s.stop(at(tt + 1.5));
  };
  const crackle = (t0, t1, dens, v, f = 2500) => { for (let t = Math.max(t0, from); t < t1; t += (.02 + Math.random() * .1) / dens) noiseHit(t, .012 + Math.random() * .03, 'bandpass', f * (.6 + Math.random()), 2, v * (.4 + Math.random() * .6), .2); };

  // lightning & thunder
  thunder(5.4, .8); thunder(13.9, .7, true); thunder(35.15, 1, true); thunder(51.2, .8);
  // S1 subtle cloth flap
  for (let t = 2; t < 7; t += 1.3) whoosh(t, .5, 300, 700, .06);
  // S2/S3 breath
  for (let t = 7.3; t < 11; t += 1.33) { noiseHit(t + .7, .45, 'bandpass', 900, 1.2, .08, .2); }
  // S4 drops in the puddle, then the push-off
  for (let t = 15.1; t < 16.8; t += .18 + Math.random() * .2) { tone(t, 900 + Math.random() * 900, .08, .06, 'sine', 400, .3); }
  splash(16.82, .9, .5); thump(16.82, .5);
  // S5 run: splashing footfalls, accelerating
  for (let t = 17.6; t < 20.5; t += .17) { splash(t, .25, .14); splash(t + .06, .18, .12); }
  whoosh(19.9, .6, 400, 2400, .35);
  // S6 clash
  clang(20.62, .9); thump(20.62, .8); noiseHit(20.62, .9, 'lowpass', 700, .7, .5, .6);
  for (let t = 21.0; t < 22.9; t += .09 + Math.random() * .12) { noiseHit(t, .05, 'bandpass', 4200, 4, .09, .2); }
  tone(21, 2100, 2, .03, 'sawtooth', 2050, .2, .3);
  clang(22.95, .35); whoosh(22.9, .4, 600, 200, .2);
  // S7 exchange
  whoosh(23.75, .2, 500, 3000, .3); whoosh(23.83, .14, 3000, 700, .4);
  whoosh(24.2, .16, 400, 1600, .25); thump(24.34, .7); clang(24.34, .2);
  whoosh(24.62, .12, 300, 1200, .25); thump(24.72, .85); splash(24.75, .5, .45);
  whoosh(25.15, .2, 500, 2200, .35); whoosh(25.75, .2, 300, 900, .2);
  whoosh(26.1, .2, 800, 4000, .35);
  // S8 graze
  noiseHit(26.68, .12, 'highpass', 5000, .9, .5, .5); tone(26.7, 3800, .5, .08, 'sine', 3600, .6); tone(26.7, 5200, .4, .05, 'sine', null, .6);
  noiseHit(26.72, .2, 'bandpass', 700, 1.5, .3, .4);
  tone(26.8, 92, 1.6, .12, 'sine', 60, .7, .2);
  // S9 punch
  whoosh(28.6, .26, 300, 1500, .3); thump(28.85, 1); noiseHit(28.85, .3, 'lowpass', 2500, .7, .5, .4); noiseHit(28.9, .15, 'bandpass', 1800, 2, .2, .3);
  // S10 kick and crash
  whoosh(30.7, .2, 400, 2500, .35); thump(30.83, 1);
  whoosh(30.9, .5, 1600, 300, .25);
  for (let t = 31.45; t < 32.0; t += .05) splash(t, .22, .1);
  noiseHit(32.0, 1.2, 'lowpass', 900, .6, .9, .5); thump(32.0, .9);
  for (let i = 0; i < 18; i++) { const t = 32.05 + Math.random() * .9; tone(t, 180 + Math.random() * 400, .1, .12, 'triangle', 90, .3); noiseHit(t, .07, 'bandpass', 900 + Math.random() * 1500, 2, .15, .3); }
  // S11 leap
  whoosh(34.3, .8, 200, 1500, .4); whoosh(35.6, .6, 1200, 300, .2); thump(36.2, .4); clang(36.22, .08);
  // S12 breathing, wipe
  for (let t = 38.6; t < 40.4; t += .62) noiseHit(t, .5, 'bandpass', 700, 1.3, .12, .2);
  whoosh(41.0, .35, 400, 900, .08);
  // S13 fire-wind roar
  const roar = (t0, t1, f0, f1, v) => {
    if (t1 < from) return; const s = src(BN_, true), b = filt('bandpass', f0, 2.2), b2 = filt('lowpass', 2600), g = gainN(0);
    chain(s, b, b2, g); send(g, 1, .35);
    const st = Math.max(t0, from);
    b.frequency.setValueAtTime(f0, at(st)); b.frequency.exponentialRampToValueAtTime(f1, at(t1));
    g.gain.setValueAtTime(0, at(st)); g.gain.linearRampToValueAtTime(v, at(t1 - .3)); g.gain.linearRampToValueAtTime(0, at(t1 + .05));
    s.start(at(st)); s.stop(at(t1 + .1));
    const s2 = src(WN, true), b3 = filt('bandpass', f0 * 2, 1.2), g2 = gainN(0); chain(s2, b3, g2); send(g2, 1, .3);
    b3.frequency.setValueAtTime(f0 * 2, at(st)); b3.frequency.exponentialRampToValueAtTime(f1 * 2, at(t1));
    g2.gain.setValueAtTime(0, at(st)); g2.gain.linearRampToValueAtTime(v * .25, at(t1 - .3)); g2.gain.linearRampToValueAtTime(0, at(t1 + .05));
    s2.start(at(st)); s2.stop(at(t1 + .1));
  };
  roar(43.9, 48.5, 160, 700, 1.1); crackle(44.5, 48.4, 1.5, .25, 1800);
  // S14 electric
  const buzz = (t0, t1, v) => {
    if (t1 < from) return; const st = Math.max(t0, from);
    const o = ac.createOscillator(), o2 = ac.createOscillator(), ws = ac.createWaveShaper(), g = gainN(0), hp = filt('highpass', 120);
    o.type = 'sawtooth'; o.frequency.value = 58; o2.type = 'square'; o2.frequency.value = 117.5;
    const cv = new Float32Array(256); for (let i = 0; i < 256; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 5); } ws.curve = cv;
    const og = gainN(.5); o.connect(og); o2.connect(og); chain(og, ws, hp, g); send(g, 1, .3);
    g.gain.setValueAtTime(0, at(st)); g.gain.linearRampToValueAtTime(v, at(t1 - .2)); g.gain.linearRampToValueAtTime(0, at(t1 + .05));
    o.start(at(st)); o2.start(at(st)); o.stop(at(t1 + .1)); o2.stop(at(t1 + .1));
  };
  buzz(48.9, 52.5, .12); crackle(49.2, 52.4, 2.5, .35, 4500);
  // S15 charge: both, plus running whoosh
  roar(52.5, 56.0, 300, 900, .8); buzz(52.5, 56.0, .1); crackle(52.5, 55.9, 3, .3, 4000);
  whoosh(53.0, 2.9, 300, 3000, .4);
  // S16 collision: boom, then silence and a ringing ear
  if (live(56)) {
    const o = ac.createOscillator(), g = gainN(0); o.frequency.setValueAtTime(70, at(56)); o.frequency.exponentialRampToValueAtTime(24, at(58)); chain(o, g); send(g, 1, .6);
    g.gain.setValueAtTime(0, at(56)); g.gain.linearRampToValueAtTime(.85, at(56.01)); g.gain.exponentialRampToValueAtTime(.001, at(58.3)); o.start(at(56)); o.stop(at(58.4));
  }
  noiseHit(56.0, 1.6, 'lowpass', 2000, .5, 1.0, .7, 200); noiseHit(56.0, .3, 'highpass', 2000, .5, .6, .5); clang(56.0, .6);
  tone(56.5, 3950, 6.2, .035, 'sine', 3900, .2, 1.2);
  for (let t = 58.4; t < 62.6; t += .95) { tone(t, 58, .25, .35, 'sine', 40, .3); tone(t + .28, 52, .22, .25, 'sine', 38, .3); }
  noiseHit(62.6, .5, 'highpass', 1500, .5, .3, .6, 6000);
  // S18–20 aftermath
  for (let t = 63.5; t < 67.5; t += 1.6) noiseHit(t, 1.4, 'bandpass', 500, .8, .07, .5);

  // ---------------- music ----------------
  const pad = (t0, t1, notes, v, cutoff = 700, att = 2, rel = 2) => {
    if (t1 < from) return; const st = Math.max(t0, from);
    const lp = filt('lowpass', cutoff, .8), g = gainN(0); chain(lp, g); send(g, .8, .6);
    for (const n of notes) for (const det of [-6, 5]) { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 440 * Math.pow(2, (n - 69) / 12); o.detune.value = det; o.connect(lp); o.start(at(st)); o.stop(at(t1 + rel)); }
    g.gain.setValueAtTime(0, at(st)); g.gain.linearRampToValueAtTime(v, at(Math.min(t1, st + att))); g.gain.setValueAtTime(v, at(t1)); g.gain.linearRampToValueAtTime(0, at(t1 + rel));
  };
  pad(0, 15.5, [38, 45, 50], .05, 420, 4, 2);            // D drone
  pad(15.5, 20.5, [38, 45, 51], .06, 600, 1, .5);        // tension: minor 2nd colour
  pad(20.5, 34, [38, 45, 50, 53], .05, 800, .5, 1);
  pad(34, 43.5, [36, 43, 48, 51], .06, 500, 1, 1.5);
  pad(43.5, 56, [38, 45, 50, 53, 57], .07, 1100, 2, .05);
  pad(63, 80, [38, 45, 50, 54], .045, 450, 4, 2);        // resolution: D with major third
  // taiko
  const taiko = (t, v = .8) => { tone(t, 82, .55, v, 'sine', 38, .45, .003); noiseHit(t, .08, 'lowpass', 600, .7, v * .5, .4); };
  const rim = (t, v = .3) => { noiseHit(t, .05, 'bandpass', 2200, 3, v, .3); tone(t, 640, .06, v * .4, 'triangle', 500, .3); };
  for (let t = 17.5; t < 20.5; t += .25) { taiko(t, .45 + (t - 17.5) * .12); }
  for (let b = 0; b < 26; b++) { const t = 23.5 + b * .25; if (t > 26.5) break; if (b % 4 === 0) taiko(t, .8); else if (b % 2 === 0) rim(t, .25); }
  for (let t = 30.5; t < 34; t += .5) taiko(t, .6);
  for (let t = 43.6; t < 48.5; t += 1.2 - (t - 43.6) * .17) taiko(t, .4 + (t - 43.6) * .1);
  for (let t = 48.6; t < 52.4; t += .6) rim(t, .2);
  for (let t = 52.5; t < 56; t += .125) taiko(t, .5 + (t - 52.5) * .12);
  // bamboo flute (shakuhachi-like): breathy sine with slow vibrato, miyako-bushi phrase
  const flute = (t, midi, dur, v = .16) => {
    if (!live(t)) return; const f = 440 * Math.pow(2, (midi - 69) / 12);
    const o = ac.createOscillator(), vib = ac.createOscillator(), vg = gainN(f * .012), g = gainN(0);
    o.type = 'sine'; o.frequency.setValueAtTime(f * .97, at(t)); o.frequency.linearRampToValueAtTime(f, at(t + .25));
    vib.frequency.value = 4.6; vib.connect(vg); vg.connect(o.frequency);
    chain(o, g); send(g, .8, .9);
    g.gain.setValueAtTime(0, at(t)); g.gain.linearRampToValueAtTime(v, at(t + .3)); g.gain.setValueAtTime(v * .85, at(t + dur * .7)); g.gain.linearRampToValueAtTime(0, at(t + dur));
    o.start(at(t)); vib.start(at(t + .4)); o.stop(at(t + dur + .05)); vib.stop(at(t + dur + .05));
    const s = src(WN), b = filt('bandpass', f * 1.5, 1.5), bg_ = gainN(0); chain(s, b, bg_); send(bg_, .7, .8);
    bg_.gain.setValueAtTime(0, at(t)); bg_.gain.linearRampToValueAtTime(v * .35, at(t + .08)); bg_.gain.linearRampToValueAtTime(v * .12, at(t + .4)); bg_.gain.linearRampToValueAtTime(0, at(t + dur));
    s.start(at(t), Math.random()); s.stop(at(t + dur + .05));
  };
  const phrase = [[68.4, 69, 2.2], [70.8, 70, 1.2], [72.1, 69, 1.0], [73.2, 67, 2.4], [75.9, 62, 1.4], [77.4, 65, 1.0], [78.4, 62, 1.6]];
  for (const [t, n, d] of phrase) flute(t, n, d, .15);
}
