/* 비트 리듬 — 노래 파일을 넣으면 비트를 분석해 노트를 자동으로 만들어 주는 4키 리듬 게임.
 *
 * 흐름: 파일 → decodeAudioData → 분석(analyze) → 채보 생성(buildChart) → 플레이(게임 루프) → 결과
 *  - 분석: 모노 다운믹스 → Hann 창 + FFT(1024, hop 512) → 저/중/고 대역별 스펙트럼 플럭스 → 자기상관으로 BPM 추정
 *  - 채보: 플럭스 적응 임계값으로 피크(온셋) 선택 → 세기 순 그리디로 최소 간격 보장 → 대역에 따라 레인 배정 → 16분 격자에 살짝 스냅
 *  - 타이밍: AudioContext.currentTime 기준. 노트 시각과 소리를 같은 시계로 맞춘다. */
(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const LANES = 4;
  const KEYS = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  const KEY_LABELS = ['D', 'F', 'J', 'K'];
  const LANE_COLORS = ['#ff6b8a', '#ffd166', '#5de0e6', '#b28dff'];
  const JUDGES = [
    { name: 'PERFECT', win: 0.045, weight: 1, color: '#ffd166' },
    { name: 'GREAT', win: 0.09, weight: 0.7, color: '#5de0e6' },
    { name: 'GOOD', win: 0.135, weight: 0.4, color: '#7ee0a3' },
  ];
  const MISS = { name: 'MISS', weight: 0, color: '#ff8a73' };
  const HIT_WINDOW = 0.135;
  const LEAD_IN = 2.0;          // 시작 후 첫 노트까지 여유(초)
  const DIFFS = {
    easy: { label: '쉬움', gap: 0.27, alpha: 1.55, chord: 0 },
    normal: { label: '보통', gap: 0.16, alpha: 1.25, chord: 0.04 },
    hard: { label: '어려움', gap: 0.105, alpha: 1.05, chord: 0.14 },
  };
  const APPROACH = [2.2, 1.9, 1.65, 1.4, 1.2, 1.0, 0.85, 0.72, 0.6, 0.5]; // 속도 1~10 → 노트가 화면을 지나는 시간(초)

  // ---------- 설정 저장 ----------
  const SKEY = 'beat-rhythm.v1';
  const settings = Object.assign({ diff: 'normal', speed: 5, offset: 0, volume: 80, auto: false }, loadSettings());
  function loadSettings() {
    try { return JSON.parse(localStorage.getItem(SKEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveSettings() {
    try { localStorage.setItem(SKEY, JSON.stringify(settings)); } catch (e) { /* 무시 */ }
  }

  // ---------- 오디오 ----------
  let audioCtx = null;
  function ac() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // ---------- FFT (radix-2, 제자리) ----------
  class FFT {
    constructor(n) {
      this.n = n;
      const bits = Math.round(Math.log2(n));
      this.rev = new Uint32Array(n);
      for (let i = 0; i < n; i++) {
        let r = 0, x = i;
        for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; }
        this.rev[i] = r;
      }
      this.cos = new Float32Array(n / 2);
      this.sin = new Float32Array(n / 2);
      for (let k = 0; k < n / 2; k++) {
        this.cos[k] = Math.cos(-2 * Math.PI * k / n);
        this.sin[k] = Math.sin(-2 * Math.PI * k / n);
      }
    }
    transform(re, im) {
      const n = this.n, rev = this.rev, cos = this.cos, sin = this.sin;
      for (let i = 0; i < n; i++) {
        const j = rev[i];
        if (j > i) {
          let t = re[i]; re[i] = re[j]; re[j] = t;
          t = im[i]; im[i] = im[j]; im[j] = t;
        }
      }
      for (let size = 2; size <= n; size <<= 1) {
        const half = size >> 1, step = n / size;
        for (let start = 0; start < n; start += size) {
          for (let k = 0; k < half; k++) {
            const wr = cos[k * step], wi = sin[k * step];
            const a = start + k, b = a + half;
            const xr = re[b] * wr - im[b] * wi;
            const xi = re[b] * wi + im[b] * wr;
            re[b] = re[a] - xr; im[b] = im[a] - xi;
            re[a] += xr; im[a] += xi;
          }
        }
      }
    }
  }

  // ---------- 분석: 대역별 스펙트럼 플럭스 + BPM ----------
  async function analyze(buffer, onProgress) {
    const sr = buffer.sampleRate;
    const N = 1024, H = 512;
    const chs = buffer.numberOfChannels;
    const len = buffer.length;
    const mono = new Float32Array(len);
    for (let c = 0; c < chs; c++) {
      const d = buffer.getChannelData(c);
      for (let i = 0; i < len; i++) mono[i] += d[i] / chs;
    }
    const frames = Math.max(1, Math.floor((len - N) / H) + 1);
    const win = new Float32Array(N);
    for (let i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    const fft = new FFT(N);
    const binHz = sr / N;
    const bandHz = [[30, 180], [180, 1500], [1500, Math.min(10000, sr / 2 - binHz)]];
    const bands = bandHz.map(([lo, hi]) => [Math.max(1, Math.floor(lo / binHz)), Math.min(N / 2 - 1, Math.ceil(hi / binHz))]);
    const flux = [new Float32Array(frames), new Float32Array(frames), new Float32Array(frames)];
    const total = new Float32Array(frames);
    let prev = new Float32Array(N / 2), cur = new Float32Array(N / 2);
    const re = new Float32Array(N), im = new Float32Array(N);
    const weights = [1.0, 0.8, 0.6];
    let lastYield = performance.now();

    for (let t = 0; t < frames; t++) {
      const off = t * H;
      for (let i = 0; i < N; i++) { re[i] = mono[off + i] * win[i]; im[i] = 0; }
      fft.transform(re, im);
      for (let k = 0; k < N / 2; k++) cur[k] = Math.log1p(20 * Math.sqrt(re[k] * re[k] + im[k] * im[k]));
      let sum = 0;
      for (let b = 0; b < 3; b++) {
        let s = 0;
        for (let k = bands[b][0]; k <= bands[b][1]; k++) { const d = cur[k] - prev[k]; if (d > 0) s += d; }
        flux[b][t] = s;
        sum += s * weights[b];
      }
      total[t] = sum;
      const tmp = prev; prev = cur; cur = tmp;
      if (performance.now() - lastYield > 40) {
        onProgress && onProgress(t / frames);
        await new Promise((r) => setTimeout(r, 0));
        lastYield = performance.now();
      }
    }
    // 첫 프레임은 무음과의 차이라 과대평가됨
    total[0] = 0; flux.forEach((f) => { f[0] = 0; });
    const hop = H / sr;
    const frameOffset = N / 2 / sr;
    const tempo = estimateTempo(total, hop, frameOffset);
    // 배경 연출용 정규화 에너지(살짝 스무딩)
    let max = 1e-9;
    for (let t = 0; t < frames; t++) if (total[t] > max) max = total[t];
    const energy = new Float32Array(frames);
    for (let t = 0; t < frames; t++) {
      const a = total[Math.max(0, t - 1)], b = total[t], c = total[Math.min(frames - 1, t + 1)];
      energy[t] = (a + 2 * b + c) / 4 / max;
    }
    onProgress && onProgress(1);
    return { sr, hop, frameOffset, frames, flux, total, energy, tempo, duration: buffer.duration };
  }

  function estimateTempo(env, hop, frameOffset) {
    const n = env.length;
    let mean = 0;
    for (let i = 0; i < n; i++) mean += env[i];
    mean /= n || 1;
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = env[i] - mean;
    const minLag = Math.max(1, Math.round(60 / 200 / hop));
    const maxLag = Math.min(n - 2, Math.round(60 / 60 / hop));
    if (maxLag <= minLag) return { bpm: 120, period: 0.5, phase: 0, confidence: 0 };
    const ac = new Float32Array(maxLag + 1);
    let best = minLag, bestV = -Infinity;
    for (let lag = minLag; lag <= maxLag; lag++) {
      let s = 0;
      for (let i = 0; i + lag < n; i++) s += x[i] * x[i + lag];
      s /= (n - lag);
      const bpm = 60 / (lag * hop);
      // 90~160 BPM 근방을 살짝 선호(배/반배 혼동 완화)
      const w = Math.exp(-0.5 * Math.pow(Math.log2(bpm / 120) / 0.8, 2));
      ac[lag] = s;
      const v = s * (0.6 + 0.4 * w);
      if (v > bestV) { bestV = v; best = lag; }
    }
    // 포물선 보간으로 lag 정밀화
    let lagF = best;
    if (best > minLag && best < maxLag) {
      const a = ac[best - 1], b = ac[best], c = ac[best + 1];
      const denom = a - 2 * b + c;
      if (Math.abs(denom) > 1e-12) lagF = best + 0.5 * (a - c) / denom;
    }
    const period = lagF * hop;
    const bpm = 60 / period;
    // 위상: 격자가 에너지와 가장 잘 맞는 시작점
    const L = Math.round(lagF);
    let bestO = 0, bestS = -Infinity;
    for (let o = 0; o < L; o++) {
      let s = 0, cnt = 0;
      for (let i = o; i < n; i += L) { s += env[i]; cnt++; }
      s /= cnt || 1;
      if (s > bestS) { bestS = s; bestO = o; }
    }
    const phase = bestO * hop + frameOffset;
    let varx = 0;
    for (let i = 0; i < n; i++) varx += x[i] * x[i];
    varx /= n || 1;
    const confidence = varx > 0 ? Math.max(0, Math.min(1, ac[best] / varx)) : 0;
    return { bpm, period, phase, confidence };
  }

  // ---------- 채보 생성 ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildChart(a, diffKey) {
    const d = DIFFS[diffKey] || DIFFS.normal;
    const { total, flux, hop, frameOffset, frames, tempo } = a;
    // 정규화 + 가벼운 스무딩
    let max = 1e-9;
    for (let t = 0; t < frames; t++) if (total[t] > max) max = total[t];
    const env = new Float32Array(frames);
    for (let t = 0; t < frames; t++) {
      const p = total[Math.max(0, t - 1)], c = total[t], nx = total[Math.min(frames - 1, t + 1)];
      env[t] = (p + 2 * c + nx) / 4 / max;
    }
    // 지역 평균(약 ±0.4초)과 전역 표준편차로 적응 임계값
    const w = Math.max(2, Math.round(0.4 / hop));
    const prefix = new Float64Array(frames + 1);
    for (let t = 0; t < frames; t++) prefix[t + 1] = prefix[t] + env[t];
    let mean = prefix[frames] / frames, sq = 0;
    for (let t = 0; t < frames; t++) sq += (env[t] - mean) * (env[t] - mean);
    const std = Math.sqrt(sq / frames);
    const cands = [];
    for (let t = 1; t < frames - 1; t++) {
      const v = env[t];
      if (v < env[t - 1] || v <= env[t + 1]) continue;
      if (v < env[Math.max(0, t - 2)] || v < env[Math.min(frames - 1, t + 2)]) continue;
      const lo = Math.max(0, t - w), hi = Math.min(frames, t + w + 1);
      const local = (prefix[hi] - prefix[lo]) / (hi - lo);
      const thr = d.alpha * local + 0.25 * std + 0.02;
      if (v > thr) cands.push({ t, v, time: t * hop + frameOffset });
    }
    // 세기 순으로 받아들이되 최소 간격 유지
    cands.sort((p, q) => q.v - p.v);
    const accepted = [];
    const taken = [];
    outer: for (const c of cands) {
      for (const x of taken) if (Math.abs(x - c.time) < d.gap) continue outer;
      taken.push(c.time);
      accepted.push(c);
    }
    accepted.sort((p, q) => p.time - q.time);

    // 16분 격자에 가볍게 스냅(25ms 이내)
    const q = tempo.period / 4;
    if (tempo.confidence > 0.15 && q > 0.04) {
      for (const c of accepted) {
        const g = tempo.phase + Math.round((c.time - tempo.phase) / q) * q;
        if (Math.abs(g - c.time) < 0.025) c.time = g;
      }
    }

    // 레인 배정: 저음 우세 → 바깥 레인(0,3), 고음 우세 → 안쪽 레인(1,2), 중음 → 전체
    const bandMax = flux.map((f) => { let m = 1e-9; for (let t = 0; t < frames; t++) if (f[t] > m) m = f[t]; return m; });
    const rng = mulberry32(Math.floor(a.duration * 1000) ^ accepted.length);
    const notes = [];
    let prevLane = -1, prevTime = -10, runLen = 0;
    const strengths = accepted.map((c) => c.v).sort((p, q) => p - q);
    const chordThr = strengths.length ? strengths[Math.floor(strengths.length * (1 - d.chord))] : Infinity;
    for (let i = 0; i < accepted.length; i++) {
      const c = accepted[i];
      const t = c.t;
      const b = [flux[0][t] / bandMax[0], flux[1][t] / bandMax[1], flux[2][t] / bandMax[2]];
      const dom = b[0] >= b[1] && b[0] >= b[2] ? 0 : (b[2] >= b[1] ? 2 : 1);
      let pool = dom === 0 ? [0, 3] : dom === 2 ? [1, 2] : [0, 1, 2, 3];
      const close = c.time - prevTime < 0.2;
      let choices = pool.filter((l) => !(close && l === prevLane) && !(runLen >= 2 && l === prevLane));
      if (!choices.length) choices = [0, 1, 2, 3].filter((l) => l !== prevLane);
      const lane = choices[Math.floor(rng() * choices.length)];
      notes.push({ time: c.time, lane });
      // 강한 비트에 동시치기(난이도에 따라)
      if (d.chord > 0 && c.v >= chordThr) {
        const gapPrev = c.time - prevTime, gapNext = i + 1 < accepted.length ? accepted[i + 1].time - c.time : 1;
        if (gapPrev >= 0.18 && gapNext >= 0.18) {
          const other = [0, 1, 2, 3].filter((l) => l !== lane && Math.abs(l - lane) !== 0);
          const partner = dom === 0 ? (lane === 0 ? 3 : 0) : dom === 2 ? (lane === 1 ? 2 : 1) : other[Math.floor(rng() * other.length)];
          notes.push({ time: c.time, lane: partner });
        }
      }
      runLen = lane === prevLane ? runLen + 1 : 1;
      prevLane = lane;
      prevTime = c.time;
    }
    notes.sort((p, q) => p.time - q.time || p.lane - q.lane);
    // 최대 밀도(2초 창 노트/초)
    let peakNps = 0;
    for (let i = 0, j = 0; i < notes.length; i++) {
      while (notes[i].time - notes[j].time > 2) j++;
      peakNps = Math.max(peakNps, (i - j + 1) / 2);
    }
    return { notes, peakNps };
  }

  // ---------- 데모 곡 합성 ----------
  async function makeDemoSong() {
    const sr = 44100, bpm = 128, beat = 60 / bpm, bars = 16;
    const dur = 0.5 + bars * 4 * beat + 1.5;
    const oc = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
    const master = oc.createGain(); master.gain.value = 0.7; master.connect(oc.destination);
    const noiseBuf = oc.createBuffer(1, sr, sr);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < sr; i++) nd[i] = Math.random() * 2 - 1;

    function env(node, t, a, peak, decay) {
      node.gain.setValueAtTime(0, t);
      node.gain.linearRampToValueAtTime(peak, t + a);
      node.gain.exponentialRampToValueAtTime(0.001, t + a + decay);
    }
    function kick(t) {
      const o = oc.createOscillator(), g = oc.createGain();
      o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      env(g, t, 0.003, 1.0, 0.28);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.35);
    }
    function snare(t, vol = 0.6) {
      const s = oc.createBufferSource(); s.buffer = noiseBuf;
      const f = oc.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
      const g = oc.createGain(); env(g, t, 0.002, vol, 0.16);
      s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.25);
      const o = oc.createOscillator(), g2 = oc.createGain(); o.frequency.value = 190;
      env(g2, t, 0.002, vol * 0.5, 0.08); o.connect(g2).connect(master); o.start(t); o.stop(t + 0.12);
    }
    function hat(t, open) {
      const s = oc.createBufferSource(); s.buffer = noiseBuf;
      const f = oc.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
      const g = oc.createGain(); env(g, t, 0.001, open ? 0.25 : 0.18, open ? 0.12 : 0.04);
      s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + 0.2);
    }
    function bass(t, freq, len) {
      const o = oc.createOscillator(); o.type = 'sawtooth'; o.frequency.value = freq;
      const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(200, t + len);
      const g = oc.createGain(); env(g, t, 0.005, 0.35, len);
      o.connect(f).connect(g).connect(master); o.start(t); o.stop(t + len + 0.05);
    }
    function lead(t, freq, len) {
      const o = oc.createOscillator(); o.type = 'square'; o.frequency.value = freq;
      const f = oc.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
      const g = oc.createGain(); env(g, t, 0.004, 0.12, len);
      const p = oc.createStereoPanner(); p.pan.value = Math.sin(t * 2) * 0.5;
      o.connect(f).connect(g).connect(p).connect(master); o.start(t); o.stop(t + len + 0.05);
    }
    const A1 = 55, C2 = 65.41, G1 = 49, F1 = 43.65;
    const bassLine = [[A1, A1, C2, G1], [A1, A1, F1, G1]];
    const arp = [220, 261.63, 329.63, 392, 329.63, 261.63, 440, 392];
    for (let bar = 0; bar < bars; bar++) {
      const breakdown = bar === 7 || bar === 15;
      for (let bt = 0; bt < 4; bt++) {
        const t = 0.5 + (bar * 4 + bt) * beat;
        if (!breakdown || bt === 0) kick(t);
        if ((bt === 1 || bt === 3) && !breakdown) snare(t);
        if (breakdown && bt === 3) for (let k = 0; k < 4; k++) snare(t + k * beat / 4, 0.35 + k * 0.1);
        hat(t + beat / 2, bt % 2 === 1);
        if (bar >= 2 && !breakdown) hat(t, false);
        const bn = bassLine[Math.floor(bar / 4) % 2][bt];
        bass(t, bn, beat * 0.45);
        if (bar % 2 === 1 && (bt === 1 || bt === 3)) bass(t + beat / 2, bn * 1.5, beat * 0.3);
        if (bar >= 4) {
          lead(t, arp[(bt * 2) % 8] * (bar >= 12 ? 2 : 1), beat * 0.4);
          lead(t + beat / 2, arp[(bt * 2 + 1) % 8] * (bar >= 12 ? 2 : 1), beat * 0.4);
        }
      }
    }
    const buf = await oc.startRendering();
    return buf;
  }

  // ---------- UI: 준비 화면 ----------
  const els = {
    setup: $('#screen-setup'), play: $('#screen-play'), result: $('#screen-result'),
    drop: $('#drop'), file: $('#file'), demo: $('#demo'),
    progress: $('#progress'), progressLabel: $('#progress-label'), progressFill: $('#progress-fill'),
    song: $('#song'), title: $('#song-title'), mDur: $('#m-dur'), mBpm: $('#m-bpm'), mNotes: $('#m-notes'), mNps: $('#m-nps'),
    diff: $('#diff'), speed: $('#speed'), speedVal: $('#speed-val'), offset: $('#offset'), volume: $('#volume'), auto: $('#auto'),
    start: $('#start'), change: $('#change'),
    canvas: $('#game'), pause: $('#pause'), resume: $('#resume'), retryP: $('#retry-p'), quit: $('#quit'),
    rTitle: $('#r-title'), rRank: $('#r-rank'), rScore: $('#r-score'), rAcc: $('#r-acc'), rCombo: $('#r-combo'),
    rPerfect: $('#r-perfect'), rGreat: $('#r-great'), rGood: $('#r-good'), rMiss: $('#r-miss'), rNote: $('#r-note'),
    retry: $('#retry'), back: $('#back'),
  };

  let song = null;      // { name, buffer, analysis }
  let chart = null;     // { notes, peakNps }

  function show(screen) {
    for (const s of [els.setup, els.play, els.result]) s.hidden = s !== screen;
  }
  function fmtTime(s) {
    const m = Math.floor(s / 60), r = Math.round(s - m * 60);
    return `${m}:${String(r).padStart(2, '0')}`;
  }

  function applySettingsToUI() {
    for (const b of els.diff.querySelectorAll('button')) b.classList.toggle('on', b.dataset.d === settings.diff);
    els.speed.value = settings.speed;
    els.speedVal.textContent = `${settings.speed} · ${APPROACH[settings.speed - 1].toFixed(2)}s`;
    els.offset.value = settings.offset;
    els.volume.value = settings.volume;
    els.auto.checked = !!settings.auto;
  }

  function refreshChart() {
    if (!song) return;
    chart = buildChart(song.analysis, settings.diff);
    els.mNotes.textContent = String(chart.notes.length);
    els.mNps.textContent = `${chart.peakNps.toFixed(1)}/s`;
  }

  async function loadBuffer(name, buffer) {
    els.song.hidden = true;
    els.progress.hidden = false;
    els.progressLabel.textContent = `"${name}" 비트를 분석하는 중…`;
    els.progressFill.style.width = '0%';
    const analysis = await analyze(buffer, (p) => { els.progressFill.style.width = `${Math.round(p * 100)}%`; });
    song = { name, buffer, analysis };
    els.progress.hidden = true;
    els.title.textContent = name;
    els.mDur.textContent = fmtTime(buffer.duration);
    els.mBpm.textContent = `${Math.round(analysis.tempo.bpm)}`;
    refreshChart();
    els.song.hidden = false;
    els.song.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function loadFile(file) {
    if (!file) return;
    try {
      els.progress.hidden = false;
      els.song.hidden = true;
      els.progressLabel.textContent = `"${file.name}" 읽는 중…`;
      els.progressFill.style.width = '0%';
      const arr = await file.arrayBuffer();
      const buffer = await ac().decodeAudioData(arr);
      await loadBuffer(file.name.replace(/\.[^.]+$/, ''), buffer);
    } catch (e) {
      console.error(e);
      els.progress.hidden = true;
      alert('이 파일은 재생할 수 없습니다. mp3, wav, ogg, m4a 같은 오디오 파일인지 확인해 주세요.');
    }
  }

  els.file.addEventListener('change', () => loadFile(els.file.files[0]));
  ['dragenter', 'dragover'].forEach((ev) => els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => els.drop.addEventListener(ev, (e) => { e.preventDefault(); els.drop.classList.remove('over'); }));
  els.drop.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    loadFile(f);
  });
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());

  els.demo.addEventListener('click', async () => {
    els.progress.hidden = false;
    els.song.hidden = true;
    els.progressLabel.textContent = '데모 곡을 만드는 중…';
    els.progressFill.style.width = '0%';
    const buf = await makeDemoSong();
    await loadBuffer('데모 곡 (128 BPM)', buf);
  });

  els.diff.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-d]');
    if (!b) return;
    settings.diff = b.dataset.d; saveSettings(); applySettingsToUI(); refreshChart();
  });
  els.speed.addEventListener('input', () => { settings.speed = parseInt(els.speed.value, 10) || 5; saveSettings(); applySettingsToUI(); });
  els.offset.addEventListener('change', () => { settings.offset = Math.max(-500, Math.min(500, parseInt(els.offset.value, 10) || 0)); saveSettings(); applySettingsToUI(); });
  els.volume.addEventListener('input', () => { settings.volume = parseInt(els.volume.value, 10); saveSettings(); if (game && game.gain) game.gain.gain.value = settings.volume / 100; });
  els.auto.addEventListener('change', () => { settings.auto = els.auto.checked; saveSettings(); });
  els.change.addEventListener('click', () => { song = null; chart = null; els.song.hidden = true; els.file.value = ''; window.scrollTo({ top: 0, behavior: 'smooth' }); });
  els.start.addEventListener('click', () => { if (song && chart) startGame(); });
  els.resume.addEventListener('click', () => togglePause(false));
  els.retryP.addEventListener('click', () => { stopGame(); startGame(); });
  els.quit.addEventListener('click', () => { stopGame(); show(els.setup); });
  els.retry.addEventListener('click', () => startGame());
  els.back.addEventListener('click', () => show(els.setup));
  applySettingsToUI();

  // ---------- 게임 ----------
  let game = null;
  const g2d = els.canvas.getContext('2d');
  let dpr = 1;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = els.play.clientWidth || window.innerWidth, h = els.play.clientHeight || window.innerHeight;
    els.canvas.width = Math.round(w * dpr);
    els.canvas.height = Math.round(h * dpr);
  }
  window.addEventListener('resize', () => { if (game) resize(); });

  function startGame() {
    stopGame();
    show(els.play);
    resize();
    const ctx = ac();
    const notes = chart.notes.map((n) => ({ time: n.time + LEAD_IN, lane: n.lane, judged: null, hitAt: 0 }));
    const lanes = Array.from({ length: LANES }, () => []);
    notes.forEach((n) => lanes[n.lane].push(n));
    const gain = ctx.createGain();
    gain.gain.value = settings.volume / 100;
    gain.connect(ctx.destination);
    const src = ctx.createBufferSource();
    src.buffer = song.buffer;
    src.connect(gain);
    const startAt = ctx.currentTime + 0.15 + LEAD_IN;   // 노트 시간 = 곡 시간 + LEAD_IN 이므로 곡은 LEAD_IN 뒤에 시작
    src.start(startAt);
    game = {
      ctx, src, gain, notes, lanes, startAt: startAt - LEAD_IN,
      ptr: new Array(LANES).fill(0), drawFrom: 0,
      pressed: new Array(LANES).fill(0), flashes: new Array(LANES).fill(0),
      hits: [], lastJudge: null,
      score: 0, weightSum: 0, combo: 0, maxCombo: 0, counts: { PERFECT: 0, GREAT: 0, GOOD: 0, MISS: 0 },
      paused: false, done: false, raf: 0,
      endTime: LEAD_IN + song.buffer.duration + 0.6,
    };
    if (ctx.state === 'suspended') ctx.resume();
    els.pause.hidden = true;
    loop();
  }

  function stopGame() {
    if (!game) return;
    cancelAnimationFrame(game.raf);
    try { game.src.stop(); } catch (e) { /* 이미 끝났을 수 있음 */ }
    try { game.src.disconnect(); game.gain.disconnect(); } catch (e) { /* 무시 */ }
    if (game.ctx.state === 'suspended') game.ctx.resume();
    game = null;
  }

  function songTime() {
    return game.ctx.currentTime - game.startAt - settings.offset / 1000;
  }

  function togglePause(force) {
    if (!game || game.done) return;
    const p = force === undefined ? !game.paused : force;
    if (p === game.paused) return;
    game.paused = p;
    els.pause.hidden = !p;
    if (p) game.ctx.suspend(); else game.ctx.resume();
  }

  function judgeNote(note, now) {
    const dt = Math.abs(now - note.time);
    let j = MISS;
    for (const w of JUDGES) if (dt <= w.win) { j = w; break; }
    applyJudge(note, j, now);
  }
  function applyJudge(note, j, now) {
    note.judged = j.name;
    note.hitAt = now;
    game.counts[j.name]++;
    game.weightSum += j.weight;
    if (j === MISS) game.combo = 0; else { game.combo++; game.maxCombo = Math.max(game.maxCombo, game.combo); }
    game.score = Math.round(game.weightSum / game.notes.length * 1000000);
    game.lastJudge = { j, at: performance.now() };
    if (j !== MISS) game.hits.push({ lane: note.lane, at: performance.now(), color: j.color });
  }

  function hitLane(lane) {
    if (!game || game.paused || game.done) return;
    const now = songTime();
    game.flashes[lane] = performance.now();
    const arr = game.lanes[lane];
    let i = game.ptr[lane];
    while (i < arr.length && arr[i].judged) i++;
    game.ptr[lane] = i;
    const n = arr[i];
    if (n && Math.abs(now - n.time) <= HIT_WINDOW) judgeNote(n, now);
  }

  function update(now) {
    // 놓친 노트 처리
    for (let l = 0; l < LANES; l++) {
      const arr = game.lanes[l];
      let i = game.ptr[l];
      while (i < arr.length && (arr[i].judged || arr[i].time < now - HIT_WINDOW)) {
        if (!arr[i].judged) {
          if (settings.auto) applyJudge(arr[i], JUDGES[0], arr[i].time);
          else applyJudge(arr[i], MISS, now);
        }
        i++;
      }
      game.ptr[l] = i;
      if (settings.auto) {
        const n = arr[i];
        if (n && now >= n.time - 0.004) { game.flashes[l] = performance.now(); applyJudge(n, JUDGES[0], n.time); }
      }
    }
    while (game.drawFrom < game.notes.length && game.notes[game.drawFrom].time < now - 0.3) game.drawFrom++;
    if (now >= game.endTime || (game.drawFrom >= game.notes.length && now > game.notes[game.notes.length - 1]?.time + 1.5 && now > game.endTime - 0.6)) finish();
  }

  function finish() {
    if (!game || game.done) return;
    game.done = true;
    const g = game;
    cancelAnimationFrame(g.raf);
    try { g.src.stop(); } catch (e) { /* 무시 */ }
    showResult(g);
    game = null;
  }

  function loop() {
    if (!game) return;
    game.raf = requestAnimationFrame(loop);
    const now = songTime();
    if (!game.paused) update(now);
    if (game) draw(now);
  }

  function rankOf(score) {
    if (score >= 990000) return 'SS';
    if (score >= 950000) return 'S';
    if (score >= 900000) return 'A';
    if (score >= 800000) return 'B';
    if (score >= 700000) return 'C';
    return 'D';
  }

  function showResult(g) {
    show(els.result);
    const rank = g.notes.length ? rankOf(g.score) : 'D';
    els.rTitle.textContent = `${song.name} · ${DIFFS[settings.diff].label}${settings.auto ? ' · 자동 연주' : ''}`;
    els.rRank.textContent = rank;
    els.rRank.dataset.rank = rank;
    els.rScore.textContent = g.score.toLocaleString('ko-KR');
    els.rAcc.textContent = `${(g.weightSum / Math.max(1, g.notes.length) * 100).toFixed(2)}%`;
    els.rCombo.textContent = `${g.maxCombo}${g.maxCombo === g.notes.length && g.notes.length ? ' (FULL COMBO)' : ''}`;
    els.rPerfect.textContent = g.counts.PERFECT;
    els.rGreat.textContent = g.counts.GREAT;
    els.rGood.textContent = g.counts.GOOD;
    els.rMiss.textContent = g.counts.MISS;
    const early = g.notes.filter((n) => n.judged && n.judged !== 'MISS').map((n) => n.hitAt - n.time);
    if (early.length >= 10) {
      const avg = early.reduce((s, v) => s + v, 0) / early.length * 1000;
      els.rNote.textContent = Math.abs(avg) > 15
        ? `평균적으로 ${Math.abs(avg).toFixed(0)}ms ${avg < 0 ? '빨리' : '늦게'}쳤어요. 오디오 지연 보정을 ${avg < 0 ? '내리면' : '올리면'} 더 잘 맞을 수 있습니다.`
        : '타이밍이 잘 맞고 있어요.';
    } else els.rNote.textContent = '';
  }

  // ---------- 그리기 ----------
  function roundRect(x, y, w, h, r) {
    g2d.beginPath();
    g2d.moveTo(x + r, y);
    g2d.arcTo(x + w, y, x + w, y + h, r);
    g2d.arcTo(x + w, y + h, x, y + h, r);
    g2d.arcTo(x, y + h, x, y, r);
    g2d.arcTo(x, y, x + w, y, r);
    g2d.closePath();
  }
  function energyAt(now) {
    const a = song.analysis;
    const t = Math.round((now - LEAD_IN - a.frameOffset) / a.hop);
    if (t < 0 || t >= a.frames) return 0;
    return a.energy[t];
  }

  function draw(now) {
    const W = els.canvas.width / dpr, H = els.canvas.height / dpr;
    g2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pnow = performance.now();
    const areaW = Math.min(W - 16, 460);
    const x0 = (W - areaW) / 2;
    const laneW = areaW / LANES;
    const judgeY = H - Math.max(96, Math.min(150, H * 0.17));
    const topY = 56;
    const approach = APPROACH[settings.speed - 1];
    const pps = (judgeY - topY) / approach;
    const safe = 12;

    // 배경 + 비트 글로우
    g2d.fillStyle = '#0b0e14';
    g2d.fillRect(0, 0, W, H);
    const e = energyAt(now);
    if (e > 0.05) {
      const grd = g2d.createRadialGradient(W / 2, judgeY, 10, W / 2, judgeY, Math.max(W, H) * 0.8);
      grd.addColorStop(0, `rgba(93,224,230,${0.16 * e})`);
      grd.addColorStop(1, 'rgba(93,224,230,0)');
      g2d.fillStyle = grd;
      g2d.fillRect(0, 0, W, H);
    }
    // 레인 바탕
    g2d.fillStyle = 'rgba(255,255,255,0.035)';
    g2d.fillRect(x0, 0, areaW, H);
    for (let l = 0; l < LANES; l++) {
      const x = x0 + l * laneW;
      const since = pnow - game.flashes[l];
      if (since < 160) {
        const a = (1 - since / 160) * 0.35;
        const grd = g2d.createLinearGradient(0, judgeY, 0, judgeY - 260);
        grd.addColorStop(0, hexA(LANE_COLORS[l], a));
        grd.addColorStop(1, hexA(LANE_COLORS[l], 0));
        g2d.fillStyle = grd;
        g2d.fillRect(x, judgeY - 260, laneW, 260);
      }
    }
    g2d.strokeStyle = 'rgba(255,255,255,0.08)';
    g2d.lineWidth = 1;
    for (let l = 0; l <= LANES; l++) {
      const x = Math.round(x0 + l * laneW) + 0.5;
      g2d.beginPath(); g2d.moveTo(x, 0); g2d.lineTo(x, H); g2d.stroke();
    }
    // 박자선
    const tempo = song.analysis.tempo;
    if (tempo.confidence > 0.1 && tempo.period > 0.25) {
      g2d.strokeStyle = 'rgba(255,255,255,0.07)';
      const first = Math.ceil((now - tempo.phase - LEAD_IN) / tempo.period);
      for (let k = first; ; k++) {
        const bt = LEAD_IN + tempo.phase + k * tempo.period;
        const y = judgeY - (bt - now) * pps;
        if (y < topY) break;
        if (y > judgeY) continue;
        g2d.beginPath(); g2d.moveTo(x0, Math.round(y) + 0.5); g2d.lineTo(x0 + areaW, Math.round(y) + 0.5); g2d.stroke();
      }
    }
    // 판정선
    g2d.fillStyle = 'rgba(255,255,255,0.9)';
    g2d.fillRect(x0, judgeY - 1.5, areaW, 3);
    g2d.fillStyle = 'rgba(93,224,230,0.35)';
    g2d.fillRect(x0, judgeY + 1.5, areaW, 6);

    // 노트
    const noteH = Math.max(14, Math.min(22, laneW * 0.22));
    for (let i = game.drawFrom; i < game.notes.length; i++) {
      const n = game.notes[i];
      const dt = n.time - now;
      if (dt > approach + 0.1) break;
      if (n.judged && n.judged !== 'MISS') continue;
      const y = judgeY - dt * pps;
      if (y > H + noteH) continue;
      const x = x0 + n.lane * laneW + 4;
      const alpha = n.judged === 'MISS' ? Math.max(0, 0.5 - (now - n.time)) : 1;
      g2d.globalAlpha = alpha;
      g2d.fillStyle = LANE_COLORS[n.lane];
      g2d.shadowColor = LANE_COLORS[n.lane];
      g2d.shadowBlur = 12;
      roundRect(x, y - noteH / 2, laneW - 8, noteH, 5);
      g2d.fill();
      g2d.shadowBlur = 0;
      g2d.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(x + 6, y - noteH / 2 + 3, laneW - 20, 3, 1.5);
      g2d.fill();
      g2d.globalAlpha = 1;
    }

    // 히트 이펙트
    game.hits = game.hits.filter((h) => pnow - h.at < 320);
    for (const h of game.hits) {
      const p = (pnow - h.at) / 320;
      const cx = x0 + h.lane * laneW + laneW / 2;
      g2d.globalAlpha = (1 - p) * 0.9;
      g2d.strokeStyle = h.color;
      g2d.lineWidth = 3 * (1 - p) + 1;
      g2d.beginPath(); g2d.arc(cx, judgeY, 10 + p * laneW * 0.55, 0, Math.PI * 2); g2d.stroke();
      g2d.globalAlpha = 1;
    }

    // 키 캡
    const capY = judgeY + 14, capH = Math.min(52, H - capY - safe - 6);
    for (let l = 0; l < LANES; l++) {
      const x = x0 + l * laneW + 6;
      const active = pnow - game.flashes[l] < 120;
      g2d.fillStyle = active ? hexA(LANE_COLORS[l], 0.9) : 'rgba(255,255,255,0.06)';
      roundRect(x, capY, laneW - 12, capH, 8);
      g2d.fill();
      g2d.fillStyle = active ? '#0b0e14' : 'rgba(255,255,255,0.55)';
      g2d.font = `700 ${Math.min(20, capH * 0.42)}px "JetBrains Mono", monospace`;
      g2d.textAlign = 'center'; g2d.textBaseline = 'middle';
      g2d.fillText(KEY_LABELS[l], x + (laneW - 12) / 2, capY + capH / 2);
    }

    // 판정 텍스트 + 콤보
    if (game.lastJudge && pnow - game.lastJudge.at < 600) {
      const p = (pnow - game.lastJudge.at) / 600;
      const s = 1 + 0.25 * Math.max(0, 1 - p * 6);
      g2d.globalAlpha = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
      g2d.fillStyle = game.lastJudge.j.color;
      g2d.font = `700 ${Math.round(22 * s)}px "JetBrains Mono", monospace`;
      g2d.textAlign = 'center'; g2d.textBaseline = 'middle';
      g2d.fillText(game.lastJudge.j.name, W / 2, judgeY - 150);
      g2d.globalAlpha = 1;
    }
    if (game.combo >= 2) {
      g2d.fillStyle = 'rgba(255,255,255,0.95)';
      g2d.font = `700 ${Math.min(48, W * 0.1)}px "JetBrains Mono", monospace`;
      g2d.textAlign = 'center'; g2d.textBaseline = 'middle';
      g2d.fillText(String(game.combo), W / 2, judgeY - 210);
      g2d.fillStyle = 'rgba(255,255,255,0.5)';
      g2d.font = `600 12px "JetBrains Mono", monospace`;
      g2d.fillText('COMBO', W / 2, judgeY - 180);
    }

    // HUD
    g2d.fillStyle = 'rgba(255,255,255,0.95)';
    g2d.font = `700 22px "JetBrains Mono", monospace`;
    g2d.textAlign = 'center'; g2d.textBaseline = 'top';
    g2d.fillText(String(game.score).padStart(7, '0'), W / 2, 14 + safe);
    g2d.font = `500 12px "JetBrains Mono", monospace`;
    g2d.fillStyle = 'rgba(255,255,255,0.55)';
    g2d.textAlign = 'left';
    g2d.fillText(`${(game.weightSum / Math.max(1, game.notes.length) * 100).toFixed(2)}%`, 12, 18 + safe);
    g2d.textAlign = 'right';
    g2d.fillText(DIFFS[settings.diff].label + (settings.auto ? ' · AUTO' : ''), W - 12, 18 + safe);
    // 진행 바
    const prog = Math.max(0, Math.min(1, (now - LEAD_IN) / song.buffer.duration));
    g2d.fillStyle = 'rgba(255,255,255,0.12)';
    g2d.fillRect(0, safe, W, 3);
    g2d.fillStyle = '#5de0e6';
    g2d.fillRect(0, safe, W * prog, 3);
    // 시작 카운트다운
    if (now < LEAD_IN) {
      g2d.fillStyle = 'rgba(255,255,255,0.85)';
      g2d.font = `700 48px "JetBrains Mono", monospace`;
      g2d.textAlign = 'center'; g2d.textBaseline = 'middle';
      g2d.fillText(String(Math.ceil(LEAD_IN - now)), W / 2, H * 0.4);
      g2d.font = `500 14px "IBM Plex Sans KR", sans-serif`;
      g2d.fillStyle = 'rgba(255,255,255,0.6)';
      g2d.fillText('D · F · J · K 로 판정선에서 쳐요', W / 2, H * 0.4 + 44);
    }
  }
  function hexA(hex, a) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  // ---------- 입력 ----------
  document.addEventListener('keydown', (e) => {
    if (!game) return;
    if (e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
    if (e.repeat) return;
    const lane = KEYS.indexOf(e.code);
    if (lane >= 0) { e.preventDefault(); hitLane(lane); }
  });
  els.canvas.addEventListener('pointerdown', (e) => {
    if (!game || game.paused) return;
    e.preventDefault();
    const W = els.canvas.width / dpr;
    const areaW = Math.min(W - 16, 460);
    const x0 = (W - areaW) / 2;
    const lane = Math.max(0, Math.min(LANES - 1, Math.floor((e.clientX - x0) / (areaW / LANES))));
    hitLane(lane);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && game && !game.done) togglePause(true); });

  // 디버그/테스트용 훅
  window.__rhythm = {
    get game() { return game; }, get song() { return song; }, get chart() { return chart; },
    settings, buildChart, analyze, makeDemoSong, startGame, finish,
  };
})();
