/* 리듬 비트 — 4-key falling-note rhythm game.
   Music is synthesized with Web Audio; charts are derived from the melody,
   so there are no external assets and every note lines up with a sound. */
'use strict';
(() => {
const $ = (s, r = document) => r.querySelector(s);

const LANES = 4;
const KEY_CODES = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };
const KEY_LABELS = ['D', 'F', 'J', 'K'];
const WIN = { perfect: 0.045, great: 0.09, good: 0.135, miss: 0.16 }; // seconds
const WEIGHT = { perfect: 1, great: 0.7, good: 0.4, miss: 0 };
const JUDGE_LABEL = { perfect: 'PERFECT', great: 'GREAT', good: 'GOOD', miss: 'MISS' };
const JUDGE_COLOR = { perfect: '#ffe36e', great: '#5ff2c8', good: '#6fb3ff', miss: '#ff6b7a' };
const APPROACH = [1.9, 1.5, 1.15, 0.9, 0.7]; // seconds a note is on screen, per speed 1..5
const DIFFS = [['easy', '쉬움'], ['normal', '보통'], ['hard', '어려움']];
const LEAD_IN = 2.6;       // seconds before the song starts
const HOLD_MIN = 0.45;     // sustained melody notes at least this long become hold notes
const HOLD_RELEASE = 0.12; // may release this early and still complete a hold
const LANE_COLORS = ['#e9f1ff', '#4fd1ff', '#4fd1ff', '#e9f1ff'];
const coarse = matchMedia('(pointer: coarse)').matches;

// ---------- songs ----------
// Melody: 8 tokens per bar (8th notes). "." rest, "-" sustain previous note. Bars separated by "|".
// Drums: 16 steps per bar. Bass: 8 tokens per bar, R=root O=octave F=fifth.
const SONGS = [
  {
    id: 'neon', title: '네온 드라이브', meta: '128 BPM · A minor · 신스웨이브', bpm: 128, color: '#ff4fd8',
    lead: { type: 'saw', cutoff: 1800, gain: 0.2 }, pad: true, intro: 1,
    chords: { Am: ['A2', 'min'], F: ['F2', 'maj'], C: ['C3', 'maj'], G: ['G2', 'maj'] },
    progression: ['Am', 'F', 'C', 'G'],
    phrases: {
      A: 'A4 . C5 . E5 - A5 . | F5 . E5 . C5 - A4 . | C5 . E5 . G5 - E5 . | D5 . B4 . G4 - - .',
      B: 'E5 . E5 . A5 - G5 . | F5 . A5 . C6 - A5 . | G5 . E5 . C5 . D5 . | B4 . D5 . G5 - - .',
      E: 'A5 - - - - - - .',
    },
    form: 'A B A B A B A B E',
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    bass: 'R . R O . R O .',
  },
  {
    id: 'walk', title: '봄날 산책', meta: '100 BPM · C major · 느긋한 팝', bpm: 100, color: '#7be37d',
    lead: { type: 'tri', cutoff: 3200, gain: 0.3 }, pad: true, intro: 1,
    chords: { C: ['C3', 'maj'], G: ['G2', 'maj'], Am: ['A2', 'min'], F: ['F2', 'maj'] },
    progression: ['C', 'G', 'Am', 'F'],
    phrases: {
      A: 'C5 - E5 . G5 . E5 . | D5 - G4 . B4 . D5 . | E5 - C5 . A4 . C5 . | F5 . E5 . D5 - - .',
      B: 'G5 . E5 . C5 - - . | D5 . B4 . G4 - - . | A4 . C5 . E5 - D5 . | C5 - - - . . . .',
      E: 'C5 - - - - - - .',
    },
    form: 'A B A B A B E',
    drums: { kick: 'x.......x.......', snare: '....x.......x...', hat: '..x...x...x...x.' },
    bass: 'R . . O . . R .',
  },
  {
    id: 'over', title: '오버드라이브', meta: '165 BPM · E minor · 하이 템포', bpm: 165, color: '#ff9f43',
    lead: { type: 'saw', cutoff: 2600, gain: 0.19 }, pad: false, intro: 1,
    chords: { Em: ['E2', 'min'], C: ['C3', 'maj'], D: ['D3', 'maj'], Bm: ['B2', 'min'] },
    progression: ['Em', 'C', 'D', 'Bm'],
    phrases: {
      A: 'E5 E5 G5 E5 B5 . G5 E5 | C5 E5 G5 . E5 C5 E5 G5 | D5 F#5 A5 . F#5 D5 A5 . | B4 D5 F#5 D5 B5 - - .',
      B: 'E5 . B5 . E6 - B5 G5 | C6 . G5 . E5 C5 E5 . | D5 A5 D6 A5 F#5 D5 A5 . | B5 . F#5 . D5 . B4 .',
      E: 'E5 - - - - - - .',
    },
    form: 'A B A B A B A B A B E',
    drums: { kick: 'x...x...x...x.x.', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    bass: 'R R O R R O R O',
  },
];

const NOTE_INDEX = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
function midi(name) {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error('잘못된 음이름: ' + name);
  return NOTE_INDEX[m[1]] + (parseInt(m[2], 10) + 1) * 12;
}
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

function parseSong(song) {
  const spb = 60 / song.bpm, e8 = spb / 2, e16 = spb / 4;
  const tokens = [];
  for (const p of song.form.split(/\s+/)) {
    for (const bar of song.phrases[p].split('|')) {
      const tk = bar.trim().split(/\s+/);
      if (tk.length !== 8) throw new Error('한 마디는 8토큰: ' + bar);
      tokens.push(...tk);
    }
  }
  const introSteps = song.intro * 8;
  const melody = [];
  for (let i = 0; i < tokens.length; i++) {
    const tk = tokens[i];
    if (tk === '.' || tk === '-') continue;
    let len = 1;
    while (tokens[i + len] === '-') len++;
    melody.push({ step: introSteps + i, len, midi: midi(tk) });
  }
  const totalBars = song.intro + tokens.length / 8;
  const audio = [];
  const bassTk = song.bass.split(/\s+/);
  for (let b = 0; b < totalBars; b++) {
    const ci = (((b - song.intro) % song.progression.length) + song.progression.length) % song.progression.length;
    const [rootName, quality] = song.chords[song.progression[ci]];
    const root = midi(rootName);
    const barT = b * 4 * spb;
    const lastBar = b === totalBars - 1;
    bassTk.forEach((tk, i) => {
      if (tk === '.' || (lastBar && i > 0)) return;
      const m = tk === 'O' ? root + 12 : tk === 'F' ? root + 7 : root;
      audio.push({ t: barT + i * e8, type: 'bass', midi: m, dur: lastBar ? 4 * spb * 0.9 : e8 * 0.9 });
    });
    if (!lastBar) {
      for (const [name, pat] of Object.entries(song.drums)) {
        for (let s = 0; s < 16; s++) if (pat[s] === 'x') audio.push({ t: barT + s * e16, type: name });
      }
    } else {
      audio.push({ t: barT, type: 'kick' });
    }
    if (song.pad) audio.push({ t: barT, type: 'pad', midis: [root + 12, root + 12 + (quality === 'min' ? 3 : 4), root + 19], dur: 4 * spb });
  }
  for (const n of melody) audio.push({ t: n.step * e8, type: 'lead', midi: n.midi, dur: n.len * e8 * 0.95 });
  audio.sort((a, b) => a.t - b.t);
  return { spb, e8, e16, melody, audio, totalBars, length: totalBars * 4 * spb };
}

function buildChart(song, parsed, diff) {
  const { e8 } = parsed;
  const pitches = [...new Set(parsed.melody.map((n) => n.midi))].sort((a, b) => a - b);
  const laneOf = (m) => Math.min(LANES - 1, Math.floor((pitches.indexOf(m) / pitches.length) * LANES));
  const notes = [];
  for (const n of parsed.melody) {
    if (diff === 'easy' && n.step % 2 !== 0) continue; // on-beat notes only
    const sustain = n.len * e8;
    const dur = diff !== 'easy' && sustain >= HOLD_MIN ? sustain : 0;
    notes.push({ t: n.step * e8, lane: laneOf(n.midi), dur });
  }
  if (diff === 'hard') {
    const conflict = (t, lane) => notes.some((n) => n.lane === lane &&
      (Math.abs(n.t - t) < 0.12 || (n.dur > 0 && t > n.t && t < n.t + n.dur + 0.12)));
    const anyAt = (t) => notes.some((n) => Math.abs(n.t - t) < 0.01);
    let kickSide = 0, snareSide = 0;
    for (const ev of parsed.audio) {
      if (ev.type === 'kick' && !anyAt(ev.t)) {
        const cands = kickSide ? [3, 0] : [0, 3]; kickSide ^= 1;
        for (const l of cands) if (!conflict(ev.t, l)) { notes.push({ t: ev.t, lane: l, dur: 0 }); break; }
      } else if (ev.type === 'snare') {
        const cands = snareSide ? [2, 1] : [1, 2]; snareSide ^= 1;
        for (const l of cands) if (!conflict(ev.t, l)) { notes.push({ t: ev.t, lane: l, dur: 0 }); break; }
      }
    }
  }
  notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
  return notes;
}

// ---------- storage ----------
function load(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch { return d; } }
function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }
const settings = Object.assign({ speed: 3, offset: 0, sfx: true, diff: 'normal' }, load('rhythm.settings', {}));
const best = load('rhythm.best', {});

// ---------- audio ----------
let ctx, sfxBus, noiseBuf, musicBus;
function initAudio() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.ratio.value = 4;
  comp.connect(ctx.destination);
  ctx._out = comp;
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.5; sfxBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
function newMusicBus() {
  if (musicBus) {
    const old = musicBus;
    old.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.08);
    setTimeout(() => old.disconnect(), 1200);
  }
  musicBus = ctx.createGain(); musicBus.gain.value = 0.8; musicBus.connect(ctx._out);
}
function noise(at, dur, filterType, freq, peak, decay, bus) {
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = filterType; f.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, at); g.gain.exponentialRampToValueAtTime(0.001, at + decay);
  src.connect(f); f.connect(g); g.connect(bus);
  src.start(at); src.stop(at + dur);
}
function playKick(at) {
  const o = ctx.createOscillator(); o.type = 'sine';
  o.frequency.setValueAtTime(170, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.11);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.95, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
  o.connect(g); g.connect(musicBus); o.start(at); o.stop(at + 0.32);
}
function playSnare(at) {
  noise(at, 0.25, 'bandpass', 1900, 0.5, 0.17, musicBus);
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.setValueAtTime(200, at); o.frequency.exponentialRampToValueAtTime(120, at + 0.08);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.1);
  o.connect(g); g.connect(musicBus); o.start(at); o.stop(at + 0.12);
}
function playHat(at) { noise(at, 0.08, 'highpass', 8000, 0.14, 0.05, musicBus); }
function playBass(at, m, dur) {
  const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.5, at + 0.01);
  g.gain.setTargetAtTime(0.0001, at + dur, 0.03);
  o.connect(f); f.connect(g); g.connect(musicBus); o.start(at); o.stop(at + dur + 0.2);
}
function playLead(at, m, dur, kind) {
  const f = hz(m);
  const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.Q.value = 3;
  flt.frequency.setValueAtTime(Math.min(kind.cutoff * 2.5, 12000), at);
  flt.frequency.exponentialRampToValueAtTime(kind.cutoff, at + 0.15);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(kind.gain, at + 0.012);
  g.gain.setTargetAtTime(kind.gain * 0.65, at + 0.06, 0.12);
  g.gain.setTargetAtTime(0.0001, at + dur, 0.05);
  flt.connect(g); g.connect(musicBus);
  const voices = kind.type === 'saw' ? [['sawtooth', -7], ['sawtooth', 7]] : [['triangle', 0], ['sine', 0]];
  for (const [type, det] of voices) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    o.connect(flt); o.start(at); o.stop(at + dur + 0.4);
  }
}
function playPad(at, midis, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.055, at + 0.4);
  g.gain.setTargetAtTime(0.0001, at + dur - 0.2, 0.15);
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
  f.connect(g); g.connect(musicBus);
  for (const m of midis) {
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(m);
    o.detune.value = (Math.random() - 0.5) * 10;
    o.connect(f); o.start(at); o.stop(at + dur + 0.6);
  }
}
function playTick() { if (settings.sfx && ctx) noise(ctx.currentTime, 0.05, 'highpass', 5000, 0.35, 0.035, sfxBus); }

function scheduleAudio() {
  const ev = run.parsed.audio;
  const horizon = ctx.currentTime - run.songStart + 0.25;
  while (run.audioIdx < ev.length && ev[run.audioIdx].t < horizon) {
    const e = ev[run.audioIdx++];
    const at = run.songStart + e.t;
    if (at < ctx.currentTime - 0.05) continue; // fell behind (lag); skip rather than smear
    switch (e.type) {
      case 'kick': playKick(at); break;
      case 'snare': playSnare(at); break;
      case 'hat': playHat(at); break;
      case 'bass': playBass(at, e.midi, e.dur); break;
      case 'lead': playLead(at, e.midi, e.dur, run.song.lead); break;
      case 'pad': playPad(at, e.midis, e.dur); break;
    }
  }
}

// ---------- game state ----------
const canvas = $('#stage');
const g = canvas.getContext('2d');
const geo = {};
let state = 'title'; // title | play | pause | result
let run = null;

function resize() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  geo.W = window.innerWidth; geo.H = window.innerHeight;
  canvas.width = Math.round(geo.W * dpr); canvas.height = Math.round(geo.H * dpr);
  canvas.style.width = geo.W + 'px'; canvas.style.height = geo.H + 'px';
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  geo.pw = Math.min(geo.W, 560); geo.px0 = (geo.W - geo.pw) / 2; geo.laneW = geo.pw / LANES;
  geo.hitY = Math.round(geo.H * (coarse ? 0.78 : 0.82));
  geo.noteH = Math.max(14, Math.round(geo.laneW * 0.17));
}
window.addEventListener('resize', resize);
resize();

const now = () => ctx.currentTime - run.songStart - run.latency + settings.offset / 1000;

function startGame(song, diff) {
  initAudio();
  ctx.resume();
  newMusicBus();
  const parsed = parseSong(song);
  const chart = buildChart(song, parsed, diff);
  run = {
    song, diff, parsed, chart,
    laneNotes: Array.from({ length: LANES }, () => []),
    laneIdx: Array(LANES).fill(0), drawIdx: Array(LANES).fill(0),
    held: Array(LANES).fill(false), laneFlash: Array(LANES).fill(-1e9), activeHold: Array(LANES).fill(null),
    audioIdx: 0, counts: { perfect: 0, great: 0, good: 0, miss: 0 }, judged: 0, scoreAcc: 0,
    combo: 0, maxCombo: 0, effects: [], lastJudge: null, finished: false,
    approach: APPROACH[settings.speed - 1],
    latency: ctx.outputLatency || ctx.baseLatency || 0,
    songStart: ctx.currentTime + LEAD_IN,
  };
  for (const n of chart) run.laneNotes[n.lane].push(n);
  run.total = chart.length + chart.filter((n) => n.dur > 0).length;
  setState('play');
  requestAnimationFrame(loop);
}

function setState(s) {
  state = s;
  $('#title').hidden = s !== 'title';
  $('#pause').hidden = s !== 'pause';
  $('#result').hidden = s !== 'result';
  $('#pause-btn').hidden = s !== 'play';
  if (s === 'title') renderTitle();
}

function loop() {
  if (state !== 'play' && state !== 'pause') return;
  requestAnimationFrame(loop);
  if (state === 'play') { scheduleAudio(); update(); }
  draw();
}

function update() {
  const t = now();
  for (let l = 0; l < LANES; l++) {
    const list = run.laneNotes[l];
    let i = run.laneIdx[l];
    while (i < list.length) {
      const n = list[i];
      if (n.judged) { i++; continue; }
      if (t - n.t > WIN.miss) {
        judge(n, 'miss', 0);
        if (n.dur > 0) tail(n, 'miss', true);
        i++; continue;
      }
      break;
    }
    run.laneIdx[l] = i;
    const h = run.activeHold[l];
    if (h && !h.tailJudged && t >= h.t + h.dur) tail(h, 'perfect');
  }
  if (!run.finished && t > run.parsed.length + 0.8) {
    run.finished = true;
    setTimeout(showResult, 500);
  }
}

function judge(n, kind, delta) {
  n.judged = kind;
  run.counts[kind]++; run.judged++; run.scoreAcc += WEIGHT[kind];
  if (kind === 'miss') run.combo = 0;
  else {
    run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo);
    run.effects.push({ lane: n.lane, start: performance.now(), kind });
    if (n.dur > 0) { n.holding = true; run.activeHold[n.lane] = n; }
  }
  run.lastJudge = { kind, at: performance.now(), delta };
}
function tail(n, kind, silent) {
  n.tailJudged = kind; n.holding = false;
  run.counts[kind]++; run.judged++; run.scoreAcc += WEIGHT[kind];
  if (kind === 'miss') run.combo = 0;
  else { run.combo++; run.maxCombo = Math.max(run.maxCombo, run.combo); run.effects.push({ lane: n.lane, start: performance.now(), kind }); }
  if (!silent) run.lastJudge = { kind, at: performance.now(), delta: 0 };
  if (run.activeHold[n.lane] === n) run.activeHold[n.lane] = null;
}

function press(lane) {
  if (!run || state !== 'play') return;
  run.held[lane] = true; run.laneFlash[lane] = performance.now();
  const t = now();
  const list = run.laneNotes[lane];
  let i = run.laneIdx[lane];
  while (i < list.length && list[i].judged) i++;
  run.laneIdx[lane] = i;
  if (i < list.length) {
    const n = list[i], d = t - n.t, a = Math.abs(d);
    if (a <= WIN.good) judge(n, a <= WIN.perfect ? 'perfect' : a <= WIN.great ? 'great' : 'good', d);
  }
  playTick();
}
function release(lane) {
  if (!run) return;
  run.held[lane] = false;
  if (state !== 'play') return;
  const h = run.activeHold[lane];
  if (h && !h.tailJudged) tail(h, now() >= h.t + h.dur - HOLD_RELEASE ? 'perfect' : 'miss');
}

function pauseGame() {
  if (state !== 'play') return;
  ctx.suspend();
  setState('pause');
}
function resumeGame() {
  if (state !== 'pause') return;
  for (let l = 0; l < LANES; l++) { // forgive holds that were let go while paused
    const h = run.activeHold[l];
    if (h && !h.tailJudged && !run.held[l]) tail(h, 'perfect', true);
  }
  setState('play');
  ctx.resume();
}
function quitToTitle() {
  if (ctx) { ctx.resume(); newMusicBus(); }
  run = null;
  setState('title');
}
function retry() {
  const { song, diff } = run;
  startGame(song, diff);
}

function rankOf(score) {
  return score >= 980000 ? 'S' : score >= 930000 ? 'A' : score >= 850000 ? 'B' : score >= 700000 ? 'C' : 'D';
}
function showResult() {
  const score = Math.round((run.scoreAcc / run.total) * 1000000);
  const rank = rankOf(score);
  const fc = run.counts.miss === 0;
  const key = run.song.id + ':' + run.diff;
  const prev = best[key];
  const isNew = !prev || score > prev.score;
  if (isNew) { best[key] = { score, rank, maxCombo: run.maxCombo, fc }; save('rhythm.best', best); }
  $('#r-song').textContent = `${run.song.title} · ${DIFFS.find((d) => d[0] === run.diff)[1]}`;
  const rk = $('#r-rank'); rk.textContent = rank; rk.classList.toggle('fc', fc);
  $('#r-score').textContent = score.toLocaleString('ko-KR');
  $('#r-sub').innerHTML = (fc ? '풀 콤보! ' : '') + (isNew ? '<span class="new">신기록</span>' : `최고 ${prev.score.toLocaleString('ko-KR')}`);
  for (const k of ['perfect', 'great', 'good', 'miss']) $('#r-' + k).textContent = run.counts[k];
  $('#r-combo').textContent = run.maxCombo;
  $('#r-acc').textContent = (score / 10000).toFixed(2) + '%';
  setState('result');
}

// ---------- drawing ----------
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function roundRect(x, y, w, h, r) {
  r = Math.min(r, w / 2, Math.max(0, h) / 2);
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
const FONT = '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

function draw() {
  const { W, H, px0, pw, laneW, hitY, noteH } = geo;
  const t = now();
  const spb = run.parsed.spb, approach = run.approach;
  const pn = performance.now();
  const inSong = t >= 0 && t < run.parsed.length;
  const pulse = inSong ? Math.max(0, 1 - ((((t % spb) + spb) % spb) / spb) * 2.5) : 0;

  g.fillStyle = '#090c14'; g.fillRect(0, 0, W, H);
  const rg = g.createRadialGradient(W / 2, hitY, 10, W / 2, hitY, Math.max(W, H) * 0.8);
  rg.addColorStop(0, hexA(run.song.color, 0.14 + 0.12 * pulse)); rg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);

  g.fillStyle = 'rgba(255,255,255,0.035)'; g.fillRect(px0, 0, pw, H);
  g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
  for (let i = 0; i <= LANES; i++) {
    const x = Math.round(px0 + i * laneW) + 0.5;
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  for (let l = 0; l < LANES; l++) {
    const a = run.held[l] ? 0.28 : Math.max(0, 0.28 * (1 - (pn - run.laneFlash[l]) / 180));
    if (a <= 0) continue;
    const lg = g.createLinearGradient(0, hitY, 0, hitY - 320);
    lg.addColorStop(0, hexA(LANE_COLORS[l], a)); lg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lg; g.fillRect(px0 + l * laneW, hitY - 320, laneW, 320);
  }
  g.save(); g.shadowColor = run.song.color; g.shadowBlur = 18;
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(px0, hitY - 2, pw, 4); g.restore();

  // key caps
  for (let l = 0; l < LANES; l++) {
    const cx = px0 + (l + 0.5) * laneW, cy = hitY + 44;
    g.fillStyle = run.held[l] ? hexA(LANE_COLORS[l], 0.9) : 'rgba(255,255,255,0.07)';
    roundRect(cx - laneW * 0.32, cy - 16, laneW * 0.64, 32, 8); g.fill();
    if (!coarse) {
      g.fillStyle = run.held[l] ? '#061018' : 'rgba(255,255,255,0.55)';
      g.font = `700 15px ${MONO}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(KEY_LABELS[l], cx, cy + 1);
    }
  }

  // notes
  const yAt = (nt) => hitY - ((nt - t) / approach) * hitY;
  for (let l = 0; l < LANES; l++) {
    const list = run.laneNotes[l];
    let i = run.drawIdx[l];
    while (i < list.length && list[i].t + list[i].dur < t - 0.3) i++;
    run.drawIdx[l] = i;
    const x = px0 + l * laneW;
    for (; i < list.length && list[i].t < t + approach + 0.2; i++) {
      const n = list[i];
      const headHit = n.judged && n.judged !== 'miss';
      if (headHit && (n.dur === 0 || n.tailJudged === 'perfect')) continue;
      const missed = n.judged === 'miss' || n.tailJudged === 'miss';
      const yHead = yAt(n.t);
      g.globalAlpha = missed ? 0.3 : 1;
      if (n.dur > 0) {
        const top = yAt(n.t + n.dur);
        const bottom = n.holding ? Math.min(hitY, yHead) : yHead;
        g.fillStyle = hexA(LANE_COLORS[l], n.holding ? 0.6 : 0.32);
        roundRect(x + laneW * 0.28, top, laneW * 0.44, Math.max(0, bottom - top), 6); g.fill();
        g.fillStyle = hexA(LANE_COLORS[l], 0.8);
        roundRect(x + laneW * 0.2, top - 4, laneW * 0.6, 8, 4); g.fill();
      }
      if (!headHit) {
        g.save(); g.shadowColor = LANE_COLORS[l]; g.shadowBlur = missed ? 0 : 12; g.fillStyle = LANE_COLORS[l];
        roundRect(x + 5, yHead - noteH / 2, laneW - 10, noteH, 5); g.fill(); g.restore();
      }
      g.globalAlpha = 1;
    }
  }

  // hit rings
  run.effects = run.effects.filter((e) => pn - e.start < 320);
  for (const e of run.effects) {
    const p = (pn - e.start) / 320;
    g.globalAlpha = 1 - p; g.strokeStyle = JUDGE_COLOR[e.kind]; g.lineWidth = 3 * (1 - p) + 1;
    g.beginPath(); g.arc(px0 + (e.lane + 0.5) * laneW, hitY, 10 + p * laneW * 0.7, 0, Math.PI * 2); g.stroke();
  }
  g.globalAlpha = 1;

  // judgment + combo
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (run.lastJudge) {
    const age = pn - run.lastJudge.at;
    if (age < 600) {
      const sc = age < 100 ? 1.35 - 0.35 * age / 100 : 1;
      g.save(); g.translate(W / 2, hitY - 150); g.scale(sc, sc);
      g.globalAlpha = age < 400 ? 1 : 1 - (age - 400) / 200;
      g.fillStyle = JUDGE_COLOR[run.lastJudge.kind];
      g.font = `800 ${Math.round(laneW * 0.34)}px ${MONO}`;
      g.fillText(JUDGE_LABEL[run.lastJudge.kind], 0, 0);
      const k = run.lastJudge.kind;
      if (k === 'great' || k === 'good') {
        g.font = `600 ${Math.round(laneW * 0.14)}px ${MONO}`; g.fillStyle = 'rgba(255,255,255,0.6)';
        g.fillText(run.lastJudge.delta < 0 ? 'FAST' : 'SLOW', 0, laneW * 0.3);
      }
      g.restore();
    }
  }
  if (run.combo >= 2) {
    const age = run.lastJudge ? pn - run.lastJudge.at : 1e9;
    const sc = age < 90 ? 1.18 - 0.18 * age / 90 : 1;
    g.save(); g.translate(W / 2, hitY - 240); g.scale(sc, sc);
    g.fillStyle = '#fff'; g.font = `700 ${Math.round(laneW * 0.5)}px ${MONO}`;
    g.fillText(String(run.combo), 0, 0);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = `600 ${Math.round(laneW * 0.13)}px ${MONO}`;
    g.fillText('COMBO', 0, laneW * 0.36);
    g.restore();
  }

  // HUD
  const prog = Math.max(0, Math.min(1, t / run.parsed.length));
  g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(0, 0, W, 3);
  g.fillStyle = run.song.color; g.fillRect(0, 0, W * prog, 3);
  const score = run.total ? Math.round((run.scoreAcc / run.total) * 1000000) : 0;
  g.textBaseline = 'top';
  g.textAlign = 'left'; g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = `600 15px ${FONT}`;
  g.fillText(run.song.title, 14, 14);
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.font = `500 12px ${MONO}`;
  g.fillText(DIFFS.find((d) => d[0] === run.diff)[1] + ' · ' + run.song.bpm + ' BPM', 14, 36);
  g.textAlign = 'right'; g.fillStyle = '#fff'; g.font = `700 22px ${MONO}`;
  g.fillText(String(score).padStart(7, '0'), W - 60, 14);

  if (t < 0) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const left = -t;
    g.fillStyle = 'rgba(255,255,255,0.95)'; g.font = `800 ${Math.round(laneW * 0.9)}px ${MONO}`;
    g.fillText(left > 3 ? 'READY' : String(Math.ceil(left)), W / 2, H * 0.36);
    g.fillStyle = 'rgba(255,255,255,0.55)'; g.font = `500 15px ${FONT}`;
    g.fillText(coarse ? '레인을 터치해서 노트를 맞춰요' : 'D · F · J · K 키로 노트를 맞춰요', W / 2, H * 0.36 + laneW * 0.6);
  }
}

// ---------- input ----------
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.code === 'Escape') {
    if (state === 'play') pauseGame(); else if (state === 'pause') resumeGame();
    return;
  }
  if (e.code in KEY_CODES) { e.preventDefault(); press(KEY_CODES[e.code]); }
});
window.addEventListener('keyup', (e) => { if (e.code in KEY_CODES) release(KEY_CODES[e.code]); });

const pointers = new Map();
const laneAt = (x) => { const l = Math.floor((x - geo.px0) / geo.laneW); return l >= 0 && l < LANES ? l : -1; };
canvas.addEventListener('pointerdown', (e) => {
  if (state !== 'play') return;
  const lane = laneAt(e.clientX);
  if (lane < 0) return;
  pointers.set(e.pointerId, lane);
  press(lane);
});
const endPointer = (e) => {
  const lane = pointers.get(e.pointerId);
  if (lane === undefined) return;
  pointers.delete(e.pointerId);
  release(lane);
};
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

$('#pause-btn').addEventListener('click', pauseGame);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
for (const sec of ['#pause', '#result']) {
  $(sec).addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'resume') resumeGame();
    else if (act === 'retry') retry();
    else if (act === 'quit') quitToTitle();
  });
}

// ---------- title screen ----------
function segment(el, items, value, onPick) {
  el.innerHTML = '';
  for (const [v, label] of items) {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'radio'; b.textContent = label;
    b.setAttribute('aria-checked', String(v === value));
    b.addEventListener('click', () => { onPick(v); segment(el, items, v, onPick); });
    el.appendChild(b);
  }
}
function renderTitle() {
  segment($('#diffs'), DIFFS, settings.diff, (v) => { settings.diff = v; save('rhythm.settings', settings); renderSongs(); });
  segment($('#speeds'), [1, 2, 3, 4, 5].map((n) => [n, String(n)]), settings.speed, (v) => { settings.speed = v; save('rhythm.settings', settings); });
  renderSongs();
  const off = $('#offset'); off.value = settings.offset;
  $('#offset-out').textContent = `${settings.offset > 0 ? '+' : ''}${settings.offset} ms`;
  $('#sfx').checked = settings.sfx;
}
function renderSongs() {
  const ul = $('#songs'); ul.innerHTML = '';
  for (const song of SONGS) {
    const parsed = parseSong(song);
    const count = buildChart(song, parsed, settings.diff).length;
    const b = best[song.id + ':' + settings.diff];
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'song'; btn.style.setProperty('--c', song.color);
    btn.innerHTML = `<span class="bar"></span>
      <span><span class="name">${song.title}</span><span class="meta">${song.meta}</span><span class="meta">${Math.round(parsed.length)}초 · ${count}노트</span></span>
      <span class="best">${b ? `<strong>${b.score.toLocaleString('ko-KR')}<span class="rk">${b.rank}</span></strong>${b.fc ? '풀 콤보' : '최고 기록'}` : '기록 없음'}</span>`;
    btn.addEventListener('click', () => startGame(song, settings.diff));
    li.appendChild(btn); ul.appendChild(li);
  }
}
$('#offset').addEventListener('input', (e) => {
  settings.offset = parseInt(e.target.value, 10);
  $('#offset-out').textContent = `${settings.offset > 0 ? '+' : ''}${settings.offset} ms`;
  save('rhythm.settings', settings);
});
$('#sfx').addEventListener('change', (e) => { settings.sfx = e.target.checked; save('rhythm.settings', settings); });

renderTitle();

// Autoplay/inspection hook for tests: open with ?debug and use window.rhythmDebug.
if (location.search.includes('debug')) {
  window.rhythmDebug = { get run() { return run; }, get state() { return state; }, now: () => now(), press, release };
}
})();
