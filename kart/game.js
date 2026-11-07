'use strict';
(() => {
// ───────────────────────── 유틸 ─────────────────────────
const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angNorm = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const fmtTime = (t) => {
  if (t == null) return '--:--.---';
  const m = Math.floor(t / 60); const s = t - m * 60;
  return `${String(m).padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
};
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 무시 */ } },
};

// ───────────────────────── 물리 상수 ─────────────────────────
const P = {
  accel: 380, brake: 520, maxSpeed: 560, reverseMax: 150,
  boostMax: 820, boostAccel: 760, boostDur: 2.2, miniBoostDur: 0.5,
  turnRate: 2.5, driftTurn: 3.3, grip: 0.82, driftGrip: 0.955, driftKick: 240,
  gaugeRate: 0.42, kartR: 17, shoulder: 50,
};

// ───────────────────────── 트랙 정의 ─────────────────────────
const TRACKS = [
  {
    id: 'village', name: '빌리지 서킷', desc: '완만한 코너와 긴 직선. 입문용 코스', width: 240,
    theme: { grass: '#5fae4d', grass2: '#55a046', shoulder: '#c9b98a', wall: '#8a5a3c', road: '#5c626c', line: '#f3f3f3', curbA: '#e6453c', curbB: '#fafafa', decor: 'village' },
    points: [[400,500],[1000,320],[1800,300],[2500,400],[2900,800],[2850,1400],[2400,1800],[1700,1750],[1400,1350],[1000,1400],[800,1800],[350,1650],[250,1050]],
  },
  {
    id: 'forest', name: '숲속 S자 코스', desc: '연속 코너. 드리프트 연습에 딱!', width: 200,
    theme: { grass: '#3f8a46', grass2: '#377c3f', shoulder: '#8b7355', wall: '#4b3a2a', road: '#4f555e', line: '#eef1f5', curbA: '#e0b030', curbB: '#2c2c2c', decor: 'forest' },
    points: [[300,400],[900,250],[1500,450],[1900,900],[2400,700],[2900,500],[3100,1000],[2700,1400],[2100,1300],[1700,1700],[1100,1900],[500,1700],[250,1100]],
  },
  {
    id: 'desert', name: '사막 스피드웨이', desc: '최고 속도로 달리는 고속 코스', width: 260,
    theme: { grass: '#dcb978', grass2: '#d2ad6a', shoulder: '#b98f55', wall: '#7a4e2a', road: '#6b6670', line: '#fff3d6', curbA: '#d8442f', curbB: '#fff7e6', decor: 'desert' },
    points: [[400,600],[1200,300],[2200,300],[2900,600],[3000,1100],[2600,1500],[2000,1300],[1500,1500],[1000,1900],[400,1700],[200,1150]],
  },
];
const COLORS = ['#ff4d4d', '#2ec4ff', '#ffd23f', '#5ee36b', '#ff8bd6', '#ff8a2b', '#a98bff', '#f5f5f5'];
const AI_NAMES = ['포포', '모모', '치치', '루루', '코코', '보보', '미미', '토토'];
const ITEMS = {
  missile: { name: '미사일', color: '#ff4d4d' },
  banana:  { name: '바나나', color: '#ffd23f' },
  shield:  { name: '실드',   color: '#2ec4ff' },
  boost:   { name: '부스터', color: '#ff8a2b' },
  water:   { name: '물폭탄', color: '#4fa8ff' },
};

function buildTrack(def) {
  const cp = def.points, n = cp.length, dense = [];
  for (let i = 0; i < n; i++) {
    const p0 = cp[(i + n - 1) % n], p1 = cp[i], p2 = cp[(i + 1) % n], p3 = cp[(i + 2) % n];
    for (let j = 0; j < 40; j++) {
      const t = j / 40, t2 = t * t, t3 = t2 * t;
      const f = (a) => 0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3);
      dense.push([f(0), f(1)]);
    }
  }
  // 등간격 리샘플
  const sp = 12, s = []; let acc = 0, prev = dense[0];
  s.push({ x: prev[0], y: prev[1] });
  for (let i = 1; i <= dense.length; i++) {
    const p = dense[i % dense.length];
    let d = dist(p[0], p[1], prev[0], prev[1]);
    while (acc + d >= sp) {
      const t = (sp - acc) / d;
      const np = [prev[0] + (p[0] - prev[0]) * t, prev[1] + (p[1] - prev[1]) * t];
      s.push({ x: np[0], y: np[1] }); prev = np; d = dist(p[0], p[1], prev[0], prev[1]); acc = 0;
    }
    acc += d; prev = p;
  }
  if (dist(s[s.length - 1].x, s[s.length - 1].y, s[0].x, s[0].y) < sp * 0.5) s.pop();
  const N = s.length;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  for (let i = 0; i < N; i++) {
    const a = s[(i + N - 1) % N], b = s[(i + 1) % N];
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    s[i].ang = ang; s[i].nx = -Math.sin(ang); s[i].ny = Math.cos(ang);
    minX = Math.min(minX, s[i].x); maxX = Math.max(maxX, s[i].x); minY = Math.min(minY, s[i].y); maxY = Math.max(maxY, s[i].y);
  }
  for (let i = 0; i < N; i++) s[i].curv = angNorm(s[(i + 6) % N].ang - s[(i + N - 6) % N].ang) / 12; // rad/sample
  const halfW = def.width / 2;
  const track = { def, s, N, halfW, wallR: halfW + P.shoulder, bbox: { minX, minY, maxX, maxY } };

  // 연석 구간(코너)
  const runs = [];
  let run = null;
  for (let i = 0; i < N; i++) {
    if (Math.abs(s[i].curv) > 0.012) { if (!run) run = { a: i, b: i }; run.b = i; }
    else if (run) { runs.push(run); run = null; }
  }
  if (run) runs.push(run);
  track.curbRuns = runs.filter((r) => r.b - r.a > 6);

  // 장식물 (트랙 바깥에만)
  const decor = [];
  const margin = 420;
  let tries = 0;
  while (decor.length < 160 && tries++ < 4000) {
    const x = rand(minX - margin, maxX + margin), y = rand(minY - margin, maxY + margin);
    let ok = true;
    for (let i = 0; i < N; i += 2) { if (dist(x, y, s[i].x, s[i].y) < track.wallR + 70) { ok = false; break; } }
    if (!ok) continue;
    for (const d of decor) { if (dist(x, y, d.x, d.y) < 70) { ok = false; break; } }
    if (!ok) continue;
    decor.push({ x, y, r: rand(18, 42), v: Math.random(), kind: Math.random() < 0.75 ? 'a' : 'b' });
  }
  track.decor = decor;

  // 아이템 박스
  track.itemBoxes = [];
  for (const f of [0.22, 0.5, 0.78]) {
    const idx = Math.floor(N * f);
    for (const o of [-0.5, 0, 0.5]) {
      const p = s[idx];
      const lat = o * halfW * 0.9;
      track.itemBoxes.push({ idx, lat, x: p.x + p.nx * lat, y: p.y + p.ny * lat, active: true, t: 0 });
    }
  }
  return track;
}

// ───────────────────────── 소리 ─────────────────────────
const Snd = {
  ctx: null, master: null, engine: null, drift: null, muted: store.get('kart.muted', false),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    try {
      this.ctx = new C();
      this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.6; this.master.connect(this.ctx.destination);
      const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 70;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 700;
      const g = this.ctx.createGain(); g.gain.value = 0;
      o.connect(f); f.connect(g); g.connect(this.master); o.start();
      this.engine = { o, g, f };
      // 드리프트 노이즈
      const buf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const ch = buf.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const bf = this.ctx.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 900; bf.Q.value = 0.8;
      const dg = this.ctx.createGain(); dg.gain.value = 0;
      src.connect(bf); bf.connect(dg); dg.connect(this.master); src.start();
      this.drift = { g: dg };
      this.noiseBuf = buf;
    } catch (e) { this.ctx = null; }
  },
  toggle() { this.muted = !this.muted; store.set('kart.muted', this.muted); if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.6, this.ctx.currentTime, 0.05); return this.muted; },
  update(speed, boosting, drifting, running) {
    if (!this.engine) return;
    const t = this.ctx.currentTime;
    this.engine.o.frequency.setTargetAtTime(55 + Math.abs(speed) * 0.2 + (boosting ? 70 : 0), t, 0.06);
    this.engine.g.gain.setTargetAtTime(running ? 0.09 : 0, t, 0.1);
    this.drift.g.gain.setTargetAtTime(drifting ? 0.08 : 0, t, 0.05);
  },
  beep(freq, dur = 0.12, type = 'square', vol = 0.18, slide = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  noise(dur = 0.3, vol = 0.25, freq = 400) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.6;
    const g = this.ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master); src.start(t); src.stop(t + dur + 0.05);
  },
  sfx(name) {
    switch (name) {
      case 'count': this.beep(440, 0.15); break;
      case 'go': this.beep(880, 0.35, 'square', 0.22); break;
      case 'boost': this.noise(0.6, 0.3, 1200); this.beep(200, 0.5, 'sawtooth', 0.12, 500); break;
      case 'mini': this.beep(300, 0.2, 'sawtooth', 0.1, 300); break;
      case 'item': this.beep(660, 0.08, 'triangle', 0.2); this.beep(990, 0.1, 'triangle', 0.2); break;
      case 'use': this.beep(520, 0.1, 'triangle', 0.15, -200); break;
      case 'hit': this.noise(0.4, 0.35, 250); this.beep(120, 0.4, 'sawtooth', 0.2, -80); break;
      case 'wall': this.noise(0.12, 0.2, 600); break;
      case 'shield': this.beep(700, 0.25, 'sine', 0.2, 400); break;
      case 'bubble': this.beep(900, 0.3, 'sine', 0.15, -500); break;
      case 'lap': this.beep(600, 0.1, 'triangle', 0.18); this.beep(800, 0.1, 'triangle', 0.18); this.beep(1000, 0.2, 'triangle', 0.18); break;
      case 'finish': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.3, 'triangle', 0.2), i * 120)); break;
    }
  },
};

// ───────────────────────── 캔버스 / 입력 ─────────────────────────
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.floor(W * DPR); canvas.height = Math.floor(H * DPR);
  // CSS 크기를 화면 크기로 고정 (안 하면 고밀도 화면에서 캔버스가 DPR배로 커져 화면 밖으로 넘친다)
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
}
let touchPad = 0; // 터치 버튼이 차지하는 아래쪽 높이 (HUD를 그 위로 올린다)
function measureTouch() {
  touchPad = 0;
  if (!isTouch || touchEl.classList.contains('hidden')) return;
  for (const g of touchEl.querySelectorAll('.tgroup')) { const r = g.getBoundingClientRect(); touchPad = Math.max(touchPad, H - r.top + 6); }
}
window.addEventListener('resize', () => { resize(); setTimeout(measureTouch, 50); }); resize();

const keys = new Set();
const pressed = new Set(); // 이번 프레임에 눌린 키(엣지)
const KEYMAP = {
  ArrowUp: 'throttle', KeyW: 'throttle', ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  ShiftLeft: 'drift', ShiftRight: 'drift', ControlLeft: 'boost', ControlRight: 'boost', KeyX: 'boost',
  Space: 'item', KeyZ: 'item',
};
window.addEventListener('keydown', (e) => {
  const act = KEYMAP[e.code];
  if (act) { e.preventDefault(); if (!keys.has(act)) pressed.add(act); keys.add(act); }
  if (e.repeat) return;
  if (e.code === 'KeyC') { settings.camRotate = !settings.camRotate; store.set('kart.camRotate', settings.camRotate); toast(settings.camRotate ? '카메라 회전 켬' : '카메라 회전 끔'); }
  if (e.code === 'KeyM') { const m = Snd.toggle(); toast(m ? '소리 끔' : '소리 켬'); }
  if (e.code === 'KeyP' && state !== 'menu') { settings.autopilot = !settings.autopilot; toast(settings.autopilot ? '관전 모드 (자동 주행)' : '직접 조작'); }
  if (e.code === 'KeyR' && (state === 'race' || state === 'countdown' || state === 'finished')) startRace();
  if (e.code === 'Escape' && state !== 'menu') showMenu();
});
window.addEventListener('keyup', (e) => { const act = KEYMAP[e.code]; if (act) keys.delete(act); });
window.addEventListener('blur', () => keys.clear());

// 터치 버튼 (iOS 사파리 호환: touch 이벤트 + preventDefault)
const touchEl = document.getElementById('touch');
const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
const settings = {
  camRotate: store.get('kart.camRotate', true),
  autopilot: false,
  autoThrottle: store.get('kart.autoThrottle', isTouch),
};
if (isTouch) {
  const activeTouches = new Map(); // touch id -> act
  const held = new Map(); // act -> count
  const press = (act) => { held.set(act, (held.get(act) || 0) + 1); if (!keys.has(act)) pressed.add(act); keys.add(act); };
  const release = (act) => { const n = (held.get(act) || 1) - 1; held.set(act, n); if (n <= 0) { held.set(act, 0); keys.delete(act); } };
  for (const b of touchEl.querySelectorAll('.tbtn')) {
    const act = b.dataset.act;
    b.addEventListener('touchstart', (e) => {
      e.preventDefault(); Snd.init(); b.classList.add('on');
      for (const t of e.changedTouches) { if (!activeTouches.has(t.identifier)) { activeTouches.set(t.identifier, act); press(act); } }
    }, { passive: false });
    const end = (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) { if (activeTouches.get(t.identifier) === act) { activeTouches.delete(t.identifier); release(act); } }
      if (!(held.get(act) > 0)) b.classList.remove('on');
    };
    b.addEventListener('touchend', end, { passive: false });
    b.addEventListener('touchcancel', end, { passive: false });
    // 마우스/트랙패드/애플펜슬 보조
    const pdown = (e) => { if (e.pointerType === 'touch') return; e.preventDefault(); Snd.init(); b.classList.add('on'); if (!keys.has(act)) pressed.add(act); keys.add(act); };
    const pup = (e) => { if (e.pointerType === 'touch') return; b.classList.remove('on'); keys.delete(act); };
    b.addEventListener('pointerdown', pdown); b.addEventListener('pointerup', pup); b.addEventListener('pointercancel', pup); b.addEventListener('pointerleave', pup);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    b.addEventListener('click', (e) => e.preventDefault());
  }
  // 게임 중 화면 스크롤·확대 방지
  document.addEventListener('touchmove', (e) => { if (state !== 'menu' && state !== 'results') e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  canvas.addEventListener('touchstart', (e) => { if (state !== 'menu' && state !== 'results') e.preventDefault(); }, { passive: false });
}


// ───────────────────────── 게임 상태 ─────────────────────────
let state = 'menu'; // menu | countdown | race | finished
let track = null, karts = [], player = null;
let projectiles = [], hazards = [], particles = [], skids = [], toasts = [];
let raceTime = 0, countdown = 0, finishWait = 0, lapFlash = null;
let camera = { x: 0, y: 0, angle: -Math.PI / 2, zoom: 1 };
let selection = { track: store.get('kart.track', 0), color: store.get('kart.color', 0), laps: store.get('kart.laps', 3) };
let grassPattern = null;

function toast(text, color = '#fff', life = 1.6) { toasts.push({ text, color, t: life, life }); }

function makeKart(name, color, isAI) {
  return {
    name, color, isAI, x: 0, y: 0, angle: 0, vx: 0, vy: 0, speed: 0, lat: 0,
    steerVis: 0, drifting: false, driftDir: 0, driftTime: 0, gauge: 0, boostT: 0,
    item: null, itemSpin: 0, shieldT: 0, spinT: 0, spinA: 0, bubbleT: 0, wallHitT: 0, offroad: false,
    idx: 0, lap: 0, progress: 0, rank: 1, lapTimes: [], lapStart: 0, bestLap: null, finished: false, finishTime: null,
    stuckT: 0, unstickT: 0, speedMul: 1, flameSeed: Math.random() * 10,
    ai: { skill: rand(0.9, 1.0), offset: 0, offsetTarget: 0, offsetTimer: 0, nextItemAt: 0 },
  };
}

function startRace() {
  const def = TRACKS[selection.track];
  track = buildTrack(def);
  const { s, N, halfW } = track;
  karts = []; projectiles = []; hazards = []; particles = []; skids = []; toasts = [];
  raceTime = 0; countdown = 3.6; finishWait = 0; lapFlash = null;
  const total = 8;
  const playerSlot = 3;
  const names = AI_NAMES.slice().sort(() => Math.random() - 0.5);
  const colors = COLORS.filter((_, i) => i !== selection.color).sort(() => Math.random() - 0.5);
  for (let i = 0; i < total; i++) {
    const isPlayer = i === playerSlot;
    const k = makeKart(isPlayer ? '나' : names[i < playerSlot ? i : i - 1], isPlayer ? COLORS[selection.color] : colors[i < playerSlot ? i : i - 1], !isPlayer);
    const row = Math.floor(i / 2), col = i % 2;
    const idx = (N - 10 - row * 5 + N) % N;
    const p = s[idx];
    const lat = (col ? 0.42 : -0.42) * halfW;
    k.x = p.x + p.nx * lat; k.y = p.y + p.ny * lat; k.angle = p.ang; k.idx = idx; k.lap = 0; k.lat = lat;
    k.ai.offset = k.ai.offsetTarget = lat * 0.6;
    karts.push(k);
    if (isPlayer) player = k;
  }
  camera.x = player.x; camera.y = player.y; camera.angle = player.angle; camera.zoom = baseZoom();
  grassPattern = makeGrassPattern(def.theme);
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('result').classList.add('hidden');
  if (isTouch) { touchEl.classList.remove('hidden'); touchEl.classList.toggle('auto', !!settings.autoThrottle); }
  measureTouch();
  state = 'countdown';
  lastCount = 4;
}
let lastCount = 4;

function showMenu() {
  state = 'menu';
  document.getElementById('menu').classList.remove('hidden');
  document.getElementById('result').classList.add('hidden');
  touchEl.classList.add('hidden');
  renderMenu();
}

function makeGrassPattern(theme) {
  const c = document.createElement('canvas'); c.width = c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = theme.grass; g.fillRect(0, 0, 96, 96);
  g.fillStyle = theme.grass2;
  for (let i = 0; i < 26; i++) { g.beginPath(); g.ellipse(Math.random() * 96, Math.random() * 96, rand(6, 16), rand(3, 8), Math.random() * TAU, 0, TAU); g.fill(); }
  return ctx.createPattern(c, 'repeat');
}

function baseZoom() {
  // 세로 화면(폰)은 더 멀리서 보여줘 트랙이 충분히 보이게 한다
  const portrait = H > W;
  const z = portrait ? Math.min(W / 760, H / 1100) : Math.min(W / 1000, H / 650);
  return clamp(z, 0.36, 1.25);
}

// ───────────────────────── 입력 생성 ─────────────────────────
function playerInput() {
  return {
    steer: (keys.has('right') ? 1 : 0) - (keys.has('left') ? 1 : 0),
    throttle: (keys.has('throttle') || (settings.autoThrottle && !keys.has('brake'))) ? 1 : 0,
    brake: keys.has('brake') ? 1 : 0,
    drift: keys.has('drift'),
    boost: pressed.has('boost'),
    item: pressed.has('item'),
  };
}

function aiInput(k) {
  const { s, N, halfW } = track;
  const look = 9 + Math.floor(Math.abs(k.speed) / 45);
  // 주행 라인 오프셋 갱신
  k.ai.offsetTimer -= dtGlobal;
  if (k.ai.offsetTimer <= 0) { k.ai.offsetTimer = rand(2.5, 6); k.ai.offsetTarget = rand(-0.55, 0.55) * halfW; }
  let desired = k.ai.offsetTarget;
  // 바나나 피하기
  for (const h of hazards) {
    const ahead = (h.idx - k.idx + N) % N;
    if (ahead < 18 && Math.abs(h.lat - desired) < 50) desired = clamp(h.lat > 0 ? h.lat - 80 : h.lat + 80, -halfW + 30, halfW - 30);
  }
  k.ai.offset = lerp(k.ai.offset, desired, 1 - Math.exp(-dtGlobal * 2));
  const t = s[(k.idx + look) % N];
  const tx = t.x + t.nx * k.ai.offset, ty = t.y + t.ny * k.ai.offset;
  const da = angNorm(Math.atan2(ty - k.y, tx - k.x) - k.angle);
  let steer = clamp(da * 2.6, -1, 1);
  let curv = 0;
  for (let i = 0; i < look * 2; i += 3) curv = Math.max(curv, Math.abs(s[(k.idx + i) % N].curv));
  const sharp = curv * 100; // 대략 0~4
  const brake = (sharp > 2.2 && k.speed > 420) ? 1 : 0;
  const drift = sharp > 1.2 && Math.abs(da) > 0.18 && k.speed > 240;
  const boost = k.gauge >= 1 && sharp < 0.8 && k.spinT <= 0;
  const item = !!k.item && k.itemSpin <= 0 && raceTime > k.ai.nextItemAt && k.spinT <= 0;
  let throttle = 1;
  // 끼임 탈출
  if (k.unstickT > 0) { k.unstickT -= dtGlobal; throttle = 0; return { steer: -steer, throttle: 0, brake: 1, drift: false, boost: false, item: false }; }
  if (state === 'race' && Math.abs(k.speed) < 40 && k.spinT <= 0 && k.bubbleT <= 0) { k.stuckT += dtGlobal; if (k.stuckT > 1.4) { k.stuckT = 0; k.unstickT = 0.7; } } else k.stuckT = 0;
  return { steer, throttle, brake, drift, boost, item };
}

// ───────────────────────── 카트 물리 ─────────────────────────
let dtGlobal = 1 / 60;
function stepKart(k, dt, input) {
  const racing = state === 'race' || state === 'finished';
  const ctrl = racing && k.spinT <= 0 && k.bubbleT <= 0;
  if (k.spinT > 0) { k.spinT -= dt; k.spinA += dt * 11; if (k.spinT <= 0) k.spinA = 0; }
  if (k.bubbleT > 0) { k.bubbleT -= dt; k.vx *= Math.pow(0.9, dt * 60); k.vy *= Math.pow(0.9, dt * 60); }
  if (k.shieldT > 0) k.shieldT -= dt;
  if (k.wallHitT > 0) k.wallHitT -= dt;
  if (k.itemSpin > 0) k.itemSpin -= dt;

  const fx = Math.cos(k.angle), fy = Math.sin(k.angle);
  let vf = k.vx * fx + k.vy * fy;
  let vl = -k.vx * fy + k.vy * fx; // 오른쪽 방향 성분
  const boosting = k.boostT > 0;
  const maxS = (boosting ? P.boostMax : P.maxSpeed) * (k.offroad ? 0.6 : 1) * k.speedMul;

  if (ctrl) {
    const acc = boosting ? P.boostAccel : P.accel;
    if (input.throttle) vf += acc * dt;
    if (input.brake) vf -= P.brake * dt;
    const sf = clamp(Math.abs(vf) / 220, 0, 1);
    const wantDrift = input.drift && Math.abs(input.steer) > 0.2 && vf > 190;
    if (!k.drifting && wantDrift) { k.drifting = true; k.driftDir = Math.sign(input.steer); k.driftTime = 0; }
    if (k.drifting && (!input.drift || vf < 110)) {
      k.drifting = false;
      if (k.driftTime > 0.4) { k.boostT = Math.max(k.boostT, P.miniBoostDur); if (!k.isAI) Snd.sfx('mini'); }
      k.driftTime = 0;
    }
    if (k.drifting) {
      k.driftTime += dt;
      const sdir = k.driftDir * 0.7 + input.steer * 0.5;
      k.angle += sdir * P.driftTurn * sf * dt;
      vl -= k.driftDir * P.driftKick * dt;
      k.gauge = clamp(k.gauge + dt * P.gaugeRate * (0.5 + Math.min(Math.abs(vl) / 220, 1.2)), 0, 1);
      if (!k.isAI && k.gauge >= 1 && k.gaugeWasFull !== true) { k.gaugeWasFull = true; toast('부스터 준비! (Ctrl / X)', '#ffb400', 1.2); }
    } else {
      k.angle += input.steer * P.turnRate * sf * dt * (vf < 0 ? -1 : 1);
    }
    if (k.gauge < 1) k.gaugeWasFull = false;
    if (input.boost && k.gauge >= 1) {
      k.gauge = 0; k.boostT = P.boostDur; k.gaugeWasFull = false;
      if (!k.isAI) { Snd.sfx('boost'); toast('부스터!', '#ff8a2b', 1); } 
    }
    if (input.item && k.item && k.itemSpin <= 0) useItem(k);
    k.steerVis = lerp(k.steerVis, input.steer, 1 - Math.exp(-dt * 10));
  } else {
    if (k.drifting) { k.drifting = false; k.driftTime = 0; }
    k.steerVis = lerp(k.steerVis, 0, 1 - Math.exp(-dt * 10));
  }

  const grip = k.drifting ? P.driftGrip : (k.offroad ? 0.8 : P.grip);
  vl *= Math.pow(grip, dt * 60);
  vf *= Math.pow(k.offroad ? 0.975 : 0.993, dt * 60);
  if (ctrl && !input.throttle && !input.brake) vf *= Math.pow(0.985, dt * 60);
  if (vf > maxS) vf = lerp(vf, maxS, 1 - Math.pow(0.92, dt * 60));
  if (vf < -P.reverseMax) vf = -P.reverseMax;
  k.vx = fx * vf - fy * vl; k.vy = fy * vf + fx * vl;
  k.x += k.vx * dt; k.y += k.vy * dt;
  k.speed = vf;
  if (k.boostT > 0) k.boostT -= dt;

  // 파티클: 부스터 불꽃 / 드리프트 먼지 / 스키드
  if (k.boostT > 0 && Math.random() < 0.9) spawnParticle(k.x - fx * 24, k.y - fy * 24, -fx * 120 + rand(-40, 40), -fy * 120 + rand(-40, 40), 0.35, pick(['#ff8a2b', '#ffd23f', '#ff4d4d']), rand(4, 8));
  if (k.drifting && Math.abs(vl) > 60) {
    for (const side of [-1, 1]) {
      const wx = k.x - fx * 13 - fy * side * 13, wy = k.y - fy * 13 + fx * side * 13;
      skids.push({ x: wx, y: wy, a: 0.4 });
      if (Math.random() < 0.3) spawnParticle(wx, wy, rand(-30, 30), rand(-30, 30), 0.6, 'rgba(230,230,230,0.5)', rand(6, 12));
    }
    if (skids.length > 1400) skids.splice(0, skids.length - 1400);
  }
  if (k.offroad && Math.abs(vf) > 100 && Math.random() < 0.4) spawnParticle(k.x - fx * 18, k.y - fy * 18, rand(-40, 40), rand(-40, 40), 0.5, track.def.theme.shoulder, rand(5, 9));
}

function spawnParticle(x, y, vx, vy, life, color, size) {
  if (particles.length > 500) particles.shift();
  particles.push({ x, y, vx, vy, t: life, life, color, size });
}

function nearestIdx(x, y, from, win = 40) {
  const { s, N } = track;
  let best = from, bd = Infinity;
  for (let d = -win; d <= win; d++) {
    const i = (from + d + N * 4) % N;
    const dd = (s[i].x - x) ** 2 + (s[i].y - y) ** 2;
    if (dd < bd) { bd = dd; best = i; }
  }
  return best;
}

function trackConstrain(k) {
  const { s, N, halfW, wallR } = track;
  const prevIdx = k.idx;
  const best = nearestIdx(k.x, k.y, k.idx);
  k.idx = best;
  if (prevIdx > N * 0.75 && best < N * 0.25) { k.lap++; onLap(k); }
  else if (prevIdx < N * 0.25 && best > N * 0.75) k.lap--;
  const p = s[best];
  const lat = (k.x - p.x) * p.nx + (k.y - p.y) * p.ny;
  k.lat = lat;
  k.offroad = Math.abs(lat) > halfW - 6;
  const lim = wallR - 12;
  if (Math.abs(lat) > lim) {
    const sgn = Math.sign(lat);
    const target = lim * sgn;
    k.x += (target - lat) * p.nx; k.y += (target - lat) * p.ny; k.lat = target;
    const vn = k.vx * p.nx + k.vy * p.ny;
    if (vn * sgn > 0) {
      k.vx -= vn * p.nx * 1.25; k.vy -= vn * p.ny * 1.25;
      if (k.wallHitT <= 0) {
        // 첫 충돌: 세게 감속 + 불꽃
        k.vx *= 0.7; k.vy *= 0.7;
        if (Math.abs(vn) > 80) {
          for (let i = 0; i < 6; i++) spawnParticle(k.x + p.nx * sgn * 14, k.y + p.ny * sgn * 14, -p.nx * sgn * rand(40, 160) + rand(-60, 60), -p.ny * sgn * rand(40, 160) + rand(-60, 60), 0.3, '#ffe066', rand(2, 4));
          if (!k.isAI) Snd.sfx('wall');
        }
      } else {
        // 벽에 긁히며 달리는 중: 살짝만 감속
        k.vx *= 0.985; k.vy *= 0.985;
        if (Math.random() < 0.3) spawnParticle(k.x + p.nx * sgn * 14, k.y + p.ny * sgn * 14, rand(-40, 40), rand(-40, 40), 0.25, '#ffe066', rand(1.5, 3));
      }
      k.wallHitT = 0.25;
      if (k.drifting) { k.drifting = false; k.driftTime = 0; }
    }
  }
  k.progress = k.lap * N + k.idx;
}

function onLap(k) {
  const laps = selection.laps;
  if (k.lap >= 2) {
    const lt = raceTime - k.lapStart;
    k.lapTimes.push(lt);
    if (k.bestLap == null || lt < k.bestLap) k.bestLap = lt;
    if (!k.isAI) {
      lapFlash = { text: `LAP ${k.lap - 1}  ${fmtTime(lt)}`, t: 2 };
      const bestKey = `kart.best.${track.def.id}`;
      const prevBest = store.get(bestKey, null);
      if (prevBest == null || lt < prevBest) { store.set(bestKey, lt); if (prevBest != null) toast('베스트 랩 갱신!', '#2ec4ff', 2); }
      Snd.sfx('lap');
    }
  }
  k.lapStart = raceTime;
  if (k.lap === laps && !k.isAI && laps > 1) toast('최종 랩!', '#ff4d4d', 2);
  if (k.lap > laps && !k.finished) {
    k.finished = true; k.finishTime = raceTime;
    if (!k.isAI) { state = 'finished'; finishWait = 3; Snd.sfx('finish'); toast(`${k.rank}위로 완주!`, '#ffd23f', 3); }
  }
}

// ───────────────────────── 아이템 ─────────────────────────
function giveItem(k) {
  const r = k.rank;
  const w = r <= 2 ? { banana: 4, shield: 3, water: 2, missile: 1, boost: 1 }
          : r <= 5 ? { missile: 3, water: 3, banana: 2, shield: 2, boost: 2 }
                   : { missile: 4, boost: 4, water: 2, shield: 1, banana: 1 };
  let total = 0; for (const v of Object.values(w)) total += v;
  let x = Math.random() * total;
  for (const [key, v] of Object.entries(w)) { x -= v; if (x <= 0) { k.item = key; break; } }
  if (!k.item) k.item = 'missile';
  k.itemSpin = 0.9;
  if (k.isAI) k.ai.nextItemAt = raceTime + rand(1.2, 4);
  else Snd.sfx('item');
}

function kartAhead(k) {
  let best = null;
  for (const o of karts) if (o !== k && o.rank === k.rank - 1) best = o;
  return best;
}

function useItem(k) {
  const type = k.item; k.item = null;
  const fx = Math.cos(k.angle), fy = Math.sin(k.angle);
  if (!k.isAI) Snd.sfx('use');
  switch (type) {
    case 'missile':
      projectiles.push({ type, x: k.x + fx * 30, y: k.y + fy * 30, angle: k.angle, idx: k.idx, lat: k.lat, owner: k, speed: Math.max(k.speed, 0) + 650, life: 6, target: kartAhead(k) });
      break;
    case 'banana': {
      const x = k.x - fx * 42, y = k.y - fy * 42;
      const idx = nearestIdx(x, y, k.idx, 10); const p = track.s[idx];
      hazards.push({ x, y, idx, lat: (x - p.x) * p.nx + (y - p.y) * p.ny, r: 16, owner: k, armT: 0.4 });
      break;
    }
    case 'shield': k.shieldT = 8; if (!k.isAI) toast('실드 ON', '#2ec4ff', 1); break;
    case 'boost': k.boostT = Math.max(k.boostT, P.boostDur); if (!k.isAI) { Snd.sfx('boost'); toast('부스터!', '#ff8a2b', 1); } break;
    case 'water': {
      const tgt = kartAhead(k);
      let tx, ty;
      const d = tgt ? dist(k.x, k.y, tgt.x, tgt.y) : 500;
      const dur = clamp(d / 800, 0.5, 1.3);
      if (tgt) { tx = tgt.x + tgt.vx * dur * 0.85; ty = tgt.y + tgt.vy * dur * 0.85; }
      else { const p = track.s[(k.idx + 40) % track.N]; tx = p.x; ty = p.y; }
      projectiles.push({ type, x: k.x, y: k.y, sx: k.x, sy: k.y, tx, ty, t: 0, dur, owner: k });
      break;
    }
  }
}

function hitKart(k, type, from) {
  if (k.finished) return;
  if (k.shieldT > 0) { k.shieldT = 0; if (!k.isAI) { Snd.sfx('shield'); toast('실드가 막았어요!', '#2ec4ff', 1.2); } for (let i = 0; i < 14; i++) spawnParticle(k.x, k.y, rand(-150, 150), rand(-150, 150), 0.5, '#2ec4ff', rand(3, 6)); return; }
  k.drifting = false; k.driftTime = 0; k.boostT = 0;
  if (type === 'missile') { k.spinT = 1.1; k.vx *= 0.25; k.vy *= 0.25; }
  else if (type === 'banana') { k.spinT = 0.75; k.vx *= 0.5; k.vy *= 0.5; }
  else if (type === 'water') { k.bubbleT = 1.8; }
  if (!k.isAI) { Snd.sfx(type === 'water' ? 'bubble' : 'hit'); toast(type === 'water' ? '물폭탄에 갇혔다!' : type === 'missile' ? '미사일 피격!' : '바나나에 미끄러짐!', '#ff5a5f', 1.4); }
  if (from === player && from !== k) toast(`${k.name} 명중!`, '#ffd23f', 1.2);
  for (let i = 0; i < 12; i++) spawnParticle(k.x, k.y, rand(-120, 120), rand(-120, 120), 0.5, type === 'water' ? '#4fa8ff' : '#ffb400', rand(3, 7));
}

function stepProjectiles(dt) {
  const { s, N } = track;
  for (const pr of projectiles) {
    if (pr.type === 'missile') {
      pr.life -= dt;
      pr.idx = nearestIdx(pr.x, pr.y, pr.idx, 30);
      const tgt = pr.target && !pr.target.finished ? pr.target : null;
      const tgtLat = tgt && dist(pr.x, pr.y, tgt.x, tgt.y) < 600 ? tgt.lat : 0;
      pr.lat = lerp(pr.lat, tgtLat, 1 - Math.exp(-dt * 3));
      const a = s[(pr.idx + 7) % N];
      const ax = a.x + a.nx * pr.lat, ay = a.y + a.ny * pr.lat;
      const da = angNorm(Math.atan2(ay - pr.y, ax - pr.x) - pr.angle);
      pr.angle += clamp(da, -1, 1) * 7 * dt;
      pr.x += Math.cos(pr.angle) * pr.speed * dt; pr.y += Math.sin(pr.angle) * pr.speed * dt;
      spawnParticle(pr.x, pr.y, rand(-30, 30), rand(-30, 30), 0.4, 'rgba(255,255,255,0.6)', rand(3, 6));
      for (const k of karts) {
        if (k === pr.owner || k.bubbleT > 0) continue;
        if (dist(k.x, k.y, pr.x, pr.y) < P.kartR + 12) { hitKart(k, 'missile', pr.owner); pr.life = 0; break; }
      }
      if (Math.abs(pr.lat) > track.wallR) pr.life = 0;
    } else if (pr.type === 'water') {
      pr.t += dt;
      const u = clamp(pr.t / pr.dur, 0, 1);
      pr.x = lerp(pr.sx, pr.tx, u); pr.y = lerp(pr.sy, pr.ty, u); pr.h = Math.sin(u * Math.PI);
      if (u >= 1) {
        pr.life = 0;
        for (let i = 0; i < 24; i++) spawnParticle(pr.x, pr.y, rand(-180, 180), rand(-180, 180), 0.6, '#7cc4ff', rand(3, 8));
        for (const k of karts) if (k !== pr.owner && dist(k.x, k.y, pr.x, pr.y) < 70) hitKart(k, 'water', pr.owner);
      }
    }
  }
  projectiles = projectiles.filter((p) => p.life !== 0);
  // 바나나
  for (const h of hazards) {
    if (h.armT > 0) { h.armT -= dt; continue; }
    for (const k of karts) {
      if (k.spinT > 0 || k.bubbleT > 0) continue;
      if (dist(k.x, k.y, h.x, h.y) < P.kartR + h.r) { hitKart(k, 'banana', h.owner); h.dead = true; break; }
    }
  }
  hazards = hazards.filter((h) => !h.dead);
  // 아이템 박스
  for (const b of track.itemBoxes) {
    if (!b.active) { b.t -= dt; if (b.t <= 0) b.active = true; continue; }
    for (const k of karts) {
      if (k.item || k.itemSpin > 0 || k.finished) continue;
      if (dist(k.x, k.y, b.x, b.y) < P.kartR + 18) { b.active = false; b.t = 3; giveItem(k); for (let i = 0; i < 10; i++) spawnParticle(b.x, b.y, rand(-120, 120), rand(-120, 120), 0.5, '#ffd23f', rand(3, 6)); break; }
    }
  }
}

function kartCollisions() {
  for (let i = 0; i < karts.length; i++) for (let j = i + 1; j < karts.length; j++) {
    const a = karts[i], b = karts[j];
    const dx = b.x - a.x, dy = b.y - a.y; const d = Math.hypot(dx, dy);
    const minD = P.kartR * 2;
    if (d < minD && d > 0.001) {
      const nx = dx / d, ny = dy / d, over = (minD - d) / 2;
      a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
      const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rv < 0) { const imp = -rv * 0.55; a.vx -= nx * imp; a.vy -= ny * imp; b.vx += nx * imp; b.vy += ny * imp; }
    }
  }
}

function updateRanks() {
  const sorted = karts.slice().sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1; if (b.finished) return 1;
    return b.progress - a.progress;
  });
  sorted.forEach((k, i) => { k.rank = i + 1; });
  // AI 고무줄
  for (const k of karts) {
    if (!k.isAI) continue;
    const gap = (player.progress - k.progress) / track.N; // 양수면 AI가 뒤
    k.speedMul = clamp(k.ai.skill + clamp(gap, -0.25, 0.25) * 0.35, 0.85, 1.07);
  }
  player.speedMul = 1;
}

// ───────────────────────── 메인 업데이트 ─────────────────────────
function update(dt) {
  dtGlobal = dt;
  for (const t of toasts) t.t -= dt; toasts = toasts.filter((t) => t.t > 0);
  if (lapFlash) { lapFlash.t -= dt; if (lapFlash.t <= 0) lapFlash = null; }

  if (state === 'countdown') {
    countdown -= dt;
    const c = Math.ceil(countdown);
    if (c !== lastCount) { lastCount = c; if (c >= 1 && c <= 3) Snd.sfx('count'); if (c === 0) Snd.sfx('go'); }
    if (countdown <= 0) { state = 'race'; raceTime = 0; for (const k of karts) k.lapStart = 0; }
    // 대기 중엔 가속 입력 무시, 카메라만 세팅
  }
  if (state === 'race' || state === 'finished') raceTime += dt;

  const playerIn = playerInput();
  for (const k of karts) {
    const input = (k.isAI || k.finished || settings.autopilot || state === 'countdown') ? (state === 'countdown' ? { steer: 0, throttle: 0, brake: 0, drift: false, boost: false, item: false } : aiInput(k)) : playerIn;
    stepKart(k, dt, input);
  }
  kartCollisions();
  for (const k of karts) trackConstrain(k);
  if (state === 'race' || state === 'finished') stepProjectiles(dt);
  updateRanks();

  for (const p of particles) { p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; }
  particles = particles.filter((p) => p.t > 0);
  for (const sk of skids) sk.a -= dt * 0.04;
  if (skids.length && skids[0].a <= 0) skids = skids.filter((sk) => sk.a > 0);
  for (const b of track.itemBoxes) b.spin = (b.spin || 0) + dt * 2;

  if (state === 'finished') { finishWait -= dt; if (finishWait <= 0) { state = 'results'; showResults(); } }

  // 카메라
  const k = player;
  const tz = baseZoom() * (1 - clamp(Math.abs(k.speed) / P.boostMax, 0, 1) * 0.18);
  camera.zoom = lerp(camera.zoom, tz, 1 - Math.exp(-dt * 2));
  const lead = clamp(Math.abs(k.speed) / P.maxSpeed, 0, 1.4) * 110;
  const tx = k.x + Math.cos(k.angle) * lead, ty = k.y + Math.sin(k.angle) * lead;
  const f = 1 - Math.exp(-dt * 6);
  camera.x = lerp(camera.x, tx, f); camera.y = lerp(camera.y, ty, f);
  const ta = settings.camRotate ? (k.spinT > 0 ? camera.angle : k.angle) : -Math.PI / 2;
  camera.angle += angNorm(ta - camera.angle) * (1 - Math.exp(-dt * (settings.camRotate ? 4 : 8)));

  Snd.update(k.speed, k.boostT > 0, k.drifting, state !== 'menu' && state !== 'results');
}

// ───────────────────────── 렌더 ─────────────────────────
function roundRect(x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function tracePath(points, closed = true) {
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  if (closed) ctx.closePath();
}

function drawWorld() {
  const { s, N, halfW, wallR, def, bbox } = track;
  const th = def.theme;
  // 잔디
  ctx.fillStyle = grassPattern || th.grass;
  ctx.fillRect(bbox.minX - 1500, bbox.minY - 1500, bbox.maxX - bbox.minX + 3000, bbox.maxY - bbox.minY + 3000);

  // 장식물
  for (const d of track.decor) drawDecor(d, th.decor);

  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  tracePath(s);
  ctx.strokeStyle = th.wall; ctx.lineWidth = wallR * 2 + 18; ctx.stroke();
  ctx.strokeStyle = th.shoulder; ctx.lineWidth = wallR * 2; ctx.stroke();
  ctx.strokeStyle = th.line; ctx.lineWidth = halfW * 2; ctx.stroke();
  ctx.strokeStyle = th.road; ctx.lineWidth = halfW * 2 - 10; ctx.stroke();
  // 중앙선
  ctx.setLineDash([40, 40]); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);
  // 연석
  for (const r of track.curbRuns) {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = r.a; i <= r.b; i++) { const p = s[i]; const x = p.x + p.nx * side * (halfW - 2), y = p.y + p.ny * side * (halfW - 2); if (i === r.a) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
      ctx.lineWidth = 12; ctx.strokeStyle = th.curbB; ctx.stroke();
      ctx.setLineDash([28, 28]); ctx.strokeStyle = th.curbA; ctx.stroke(); ctx.setLineDash([]);
    }
  }
  // 출발선
  { const p = s[0]; const cell = (halfW * 2) / 10;
    for (let row = 0; row < 2; row++) for (let c = 0; c < 10; c++) {
      ctx.fillStyle = (row + c) % 2 ? '#111' : '#fff';
      const lat = -halfW + c * cell, fwd = -cell + row * cell;
      ctx.save(); ctx.translate(p.x + p.nx * lat + Math.cos(p.ang) * fwd, p.y + p.ny * lat + Math.sin(p.ang) * fwd); ctx.rotate(p.ang);
      ctx.fillRect(0, 0, cell + 0.5, cell + 0.5); ctx.restore();
    }
  }
  // 스키드 마크
  if (skids.length) {
    ctx.fillStyle = '#222';
    for (const sk of skids) { ctx.globalAlpha = clamp(sk.a, 0, 0.4); ctx.fillRect(sk.x - 3, sk.y - 3, 6, 6); }
    ctx.globalAlpha = 1;
  }
  // 바나나
  for (const h of hazards) drawBanana(h.x, h.y, 1);
  // 아이템 박스
  for (const b of track.itemBoxes) {
    if (!b.active) continue;
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin || 0);
    const sc = 1 + Math.sin((b.spin || 0) * 2) * 0.08; ctx.scale(sc, sc);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; roundRect(-14 + 4, -14 + 5, 28, 28, 6); ctx.fill();
    const g = ctx.createLinearGradient(-14, -14, 14, 14); g.addColorStop(0, '#ffd23f'); g.addColorStop(0.5, '#ff6ad5'); g.addColorStop(1, '#2ec4ff');
    ctx.fillStyle = g; roundRect(-14, -14, 28, 28, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.rotate(-(b.spin || 0)); ctx.fillStyle = '#fff'; ctx.font = 'bold 20px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('?', 0, 1);
    ctx.restore();
  }
  // 파티클
  for (const p of particles) { ctx.globalAlpha = clamp(p.t / p.life, 0, 1); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * p.t / p.life), 0, TAU); ctx.fill(); }
  ctx.globalAlpha = 1;
  // 카트 (순위 뒤에서 앞으로)
  const order = karts.slice().sort((a, b) => b.rank - a.rank);
  for (const k of order) drawKart(k);
  // 투사체
  for (const pr of projectiles) {
    if (pr.type === 'missile') {
      ctx.save(); ctx.translate(pr.x, pr.y); ctx.rotate(pr.angle);
      ctx.fillStyle = '#ff8a2b'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-22 - Math.random() * 10, -5); ctx.lineTo(-22 - Math.random() * 10, 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e63946'; roundRect(-12, -5, 24, 10, 5); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(9, 0, 4, 0, TAU); ctx.fill();
      ctx.restore();
    } else if (pr.type === 'water') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(pr.x, pr.y, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(79,168,255,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pr.tx, pr.ty, 40, 0, TAU); ctx.stroke();
      const sc = 1 + pr.h * 1.2;
      ctx.fillStyle = '#4fa8ff'; ctx.beginPath(); ctx.arc(pr.x, pr.y - pr.h * 40, 11 * sc, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(pr.x - 4 * sc, pr.y - pr.h * 40 - 4 * sc, 3.5 * sc, 0, TAU); ctx.fill();
    }
  }
  // 이름표
  for (const k of karts) {
    if (k === player) continue;
    ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(camera.angle + Math.PI / 2);
    ctx.font = 'bold 13px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillText(k.name, 1, -25); ctx.fillStyle = '#fff'; ctx.fillText(k.name, 0, -26);
    ctx.restore();
  }
}

function drawDecor(d, kind) {
  ctx.save(); ctx.translate(d.x, d.y);
  if (kind === 'forest' || (kind === 'village' && d.kind === 'a')) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(6, 8, d.r, 0, TAU); ctx.fill();
    ctx.fillStyle = d.v < 0.5 ? '#2f7a3a' : '#3b8d45'; ctx.beginPath(); ctx.arc(0, 0, d.r, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.beginPath(); ctx.arc(-d.r * 0.3, -d.r * 0.3, d.r * 0.45, 0, TAU); ctx.fill();
  } else if (kind === 'village') {
    const w = d.r * 1.6, h = d.r * 1.3;
    ctx.rotate(d.v * 0.4 - 0.2);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
    ctx.fillStyle = ['#e9c46a', '#f4a261', '#e76f51', '#8ecae6'][Math.floor(d.v * 4)]; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#9b4a2c'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.45);
  } else if (kind === 'desert') {
    if (d.kind === 'a') { // 바위
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(5, 6, d.r * 0.8, d.r * 0.55, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = d.v < 0.5 ? '#a07a52' : '#8e6b48'; ctx.beginPath(); ctx.ellipse(0, 0, d.r * 0.8, d.r * 0.55, d.v, 0, TAU); ctx.fill();
    } else { // 선인장
      ctx.fillStyle = '#3d8b4f'; roundRect(-5, -d.r * 0.7, 10, d.r * 1.4, 5); ctx.fill();
      roundRect(-d.r * 0.5, -6, d.r * 0.5, 9, 4); ctx.fill(); roundRect(0, -14, d.r * 0.5, 9, 4); ctx.fill();
    }
  }
  ctx.restore();
}

function drawBanana(x, y, scale) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(3, 4, 14, 9, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#ffd23f'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, -4, 12, 0.3, Math.PI - 0.3); ctx.stroke();
  ctx.strokeStyle = '#6b4b12'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(11, -1); ctx.lineTo(14, -5); ctx.stroke();
  ctx.restore();
}

function drawKart(k) {
  ctx.save(); ctx.translate(k.x, k.y);
  if (k.bubbleT > 0) { ctx.fillStyle = 'rgba(79,168,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, 34, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke(); }
  ctx.rotate(k.angle + (k.spinT > 0 ? k.spinA : 0));
  ctx.fillStyle = 'rgba(0,0,0,0.28)'; roundRect(-20 + 3, -12 + 5, 40, 24, 7); ctx.fill();
  if (k.boostT > 0) {
    const t = performance.now() / 1000 + k.flameSeed;
    for (const side of [-7, 7]) {
      const len = 22 + Math.sin(t * 40 + side) * 6 + Math.random() * 8;
      const g = ctx.createLinearGradient(-20, 0, -20 - len, 0); g.addColorStop(0, '#fff7c2'); g.addColorStop(0.4, '#ffb400'); g.addColorStop(1, 'rgba(255,60,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-20, side - 5); ctx.lineTo(-20 - len, side); ctx.lineTo(-20, side + 5); ctx.closePath(); ctx.fill();
    }
  }
  ctx.fillStyle = '#1b1b1f';
  ctx.fillRect(-16, -16, 11, 7); ctx.fillRect(-16, 9, 11, 7);
  for (const side of [-1, 1]) { ctx.save(); ctx.translate(12, side * 13); ctx.rotate(k.steerVis * 0.45); ctx.fillRect(-5, -3.5, 10, 7); ctx.restore(); }
  ctx.fillStyle = k.color; roundRect(-20, -11, 40, 22, 7); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.28)'; roundRect(7, -8, 11, 16, 4); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(-24, -14, 5, 28);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-4, 0, 6.5, 0, TAU); ctx.fill();
  ctx.fillStyle = '#222a3a'; ctx.beginPath(); ctx.arc(-2, 0, 4.5, -1.1, 1.1); ctx.fill();
  ctx.restore();
  if (k.shieldT > 0) {
    ctx.save(); ctx.translate(k.x, k.y);
    ctx.globalAlpha = k.shieldT < 1.5 ? (Math.sin(k.shieldT * 20) > 0 ? 0.6 : 0.2) : 0.55;
    ctx.strokeStyle = '#2ec4ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(46,196,255,0.18)'; ctx.fill();
    ctx.restore();
  }
}

function drawItemIcon(type, x, y, size) {
  ctx.save(); ctx.translate(x, y); const u = size / 40;
  ctx.scale(u, u);
  switch (type) {
    case 'missile':
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#ff8a2b'; ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-24, -6); ctx.lineTo(-24, 6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#e63946'; roundRect(-14, -6, 28, 12, 6); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(9, 0, 4, 0, TAU); ctx.fill();
      break;
    case 'banana': drawBanana(0, 4, 1.3); break;
    case 'shield':
      ctx.fillStyle = '#2ec4ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(15, -10); ctx.lineTo(13, 6); ctx.lineTo(0, 17); ctx.lineTo(-13, 6); ctx.lineTo(-15, -10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(10, -7); ctx.lineTo(0, 11); ctx.closePath(); ctx.fill();
      break;
    case 'boost': {
      const g = ctx.createLinearGradient(0, 16, 0, -16); g.addColorStop(0, '#ff4d4d'); g.addColorStop(0.5, '#ff8a2b'); g.addColorStop(1, '#ffd23f');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -18); ctx.bezierCurveTo(14, -4, 16, 8, 6, 16); ctx.bezierCurveTo(8, 8, 2, 4, 0, 0); ctx.bezierCurveTo(-4, 6, -8, 8, -6, 16); ctx.bezierCurveTo(-16, 8, -12, -4, 0, -18); ctx.fill();
      break;
    }
    case 'water':
      ctx.fillStyle = '#4fa8ff'; ctx.beginPath(); ctx.moveTo(0, -17); ctx.bezierCurveTo(12, -2, 14, 6, 10, 12); ctx.bezierCurveTo(5, 19, -5, 19, -10, 12); ctx.bezierCurveTo(-14, 6, -12, -2, 0, -17); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(-4, 6, 3.5, 0, TAU); ctx.fill();
      break;
  }
  ctx.restore();
}

function drawHUD() {
  const k = player;
  const small = W < 600;
  const pad = 14;
  ctx.textBaseline = 'top';
  // 랩 & 시간 (왼쪽 위)
  ctx.textAlign = 'left';
  ctx.font = `900 ${small ? 22 : 30}px system-ui`;
  shadowText(`LAP ${clamp(k.lap, 1, selection.laps)}/${selection.laps}`, pad, pad, '#fff');
  ctx.font = `700 ${small ? 15 : 20}px system-ui`;
  shadowText(fmtTime(raceTime), pad, pad + (small ? 28 : 38), 'rgba(255,255,255,0.85)');
  if (lapFlash) { ctx.font = `800 ${small ? 14 : 18}px system-ui`; ctx.globalAlpha = clamp(lapFlash.t, 0, 1); shadowText(lapFlash.text, pad, pad + (small ? 50 : 66), '#2ec4ff'); ctx.globalAlpha = 1; }

  // 순위 (오른쪽 위)
  ctx.textAlign = 'right';
  ctx.font = `900 ${small ? 40 : 56}px system-ui`;
  shadowText(`${k.rank}`, W - pad - (small ? 24 : 34), pad - 6, k.rank === 1 ? '#ffd23f' : '#fff');
  ctx.font = `800 ${small ? 16 : 22}px system-ui`;
  shadowText(`위 /${karts.length}`, W - pad, pad + (small ? 18 : 26), 'rgba(255,255,255,0.85)');

  // 미니맵
  drawMinimap(W - pad - (small ? 120 : 170), pad + (small ? 54 : 74), small ? 120 : 170, small ? 84 : 120);

  // 속도 (왼쪽 아래)
  const by = H - pad - touchPad;
  ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  const kmh = Math.round(Math.abs(k.speed) * 0.3);
  ctx.font = `900 ${small ? 36 : 54}px system-ui`;
  shadowText(`${kmh}`, pad, by, k.boostT > 0 ? '#ff8a2b' : '#fff');
  ctx.font = `700 ${small ? 13 : 16}px system-ui`;
  shadowText('km/h', pad + (small ? 70 : 105), by - 6, 'rgba(255,255,255,0.8)');

  // 부스터 게이지 (가운데 아래)
  const gw = small ? 180 : 280, gh = small ? 14 : 18;
  const gx = W / 2 - gw / 2, gy = H - pad - gh - touchPad;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(gx - 3, gy - 3, gw + 6, gh + 6, gh / 2 + 3); ctx.fill();
  if (k.gauge > 0) {
    const g = ctx.createLinearGradient(gx, 0, gx + gw, 0); g.addColorStop(0, '#2ec4ff'); g.addColorStop(0.6, '#ffd23f'); g.addColorStop(1, '#ff8a2b');
    ctx.fillStyle = g; roundRect(gx, gy, gw * k.gauge, gh, gh / 2); ctx.fill();
  }
  if (k.gauge >= 1) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(performance.now() / 120);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; roundRect(gx - 3, gy - 3, gw + 6, gh + 6, gh / 2 + 3); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `800 ${small ? 12 : 14}px system-ui`;
  shadowText(k.boostT > 0 ? 'BOOST!' : k.gauge >= 1 ? '부스터 준비 완료' : '드리프트로 게이지 충전', W / 2, gy - 6, k.boostT > 0 ? '#ff8a2b' : 'rgba(255,255,255,0.85)');

  // 아이템 슬롯 (오른쪽 아래 / 터치면 가운데 위)
  const sz = small ? 56 : 76;
  const sx = isTouch ? W / 2 - sz / 2 : W - pad - sz, sy = isTouch ? pad : H - pad - sz;
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; roundRect(sx, sy, sz, sz, 14); ctx.fill();
  ctx.strokeStyle = k.item && k.itemSpin <= 0 ? '#ffd23f' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2; roundRect(sx, sy, sz, sz, 14); ctx.stroke();
  if (k.item) {
    const type = k.itemSpin > 0 ? Object.keys(ITEMS)[Math.floor(performance.now() / 70) % 5] : k.item;
    drawItemIcon(type, sx + sz / 2, sy + sz / 2, sz * 0.62);
    if (k.itemSpin <= 0 && !isTouch) { ctx.font = '700 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; shadowText(ITEMS[k.item].name + ' (Space)', sx + sz / 2, sy + sz + 4, '#fff'); }
  }

  // 카운트다운
  if (state === 'countdown') {
    const c = Math.ceil(countdown);
    const txt = c >= 1 && c <= 3 ? String(c) : c <= 0 ? 'GO!' : '';
    const frac = countdown - Math.floor(countdown);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${(small ? 90 : 140) * (1 + (1 - frac) * 0.15)}px system-ui`;
    shadowText(txt, W / 2, H * 0.4, c <= 0 ? '#5ee36b' : c === 1 ? '#ffd23f' : '#fff', 6);
  } else if (state === 'race' && raceTime < 1) {
    ctx.globalAlpha = 1 - raceTime; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `900 ${small ? 90 : 140}px system-ui`; shadowText('GO!', W / 2, H * 0.4, '#5ee36b', 6); ctx.globalAlpha = 1;
  }
  // 토스트
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  toasts.slice(-3).forEach((t, i, arr) => {
    const a = clamp(t.t / 0.4, 0, 1);
    ctx.globalAlpha = a; ctx.font = `900 ${small ? 20 : 28}px system-ui`;
    shadowText(t.text, W / 2, H * 0.22 + (i - (arr.length - 1)) * (small ? 28 : 38), t.color);
  });
  ctx.globalAlpha = 1;
  // 상태 안내
  if (k.spinT > 0 || k.bubbleT > 0) { ctx.font = `800 ${small ? 16 : 20}px system-ui`; shadowText(k.bubbleT > 0 ? '잠시만… 탈출 중' : '스핀!', W / 2, H * 0.3, '#fff'); }
}

function shadowText(txt, x, y, color, blur = 0) {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillText(txt, x + 2, y + 2);
  if (blur) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = blur; }
  ctx.fillStyle = color; ctx.fillText(txt, x, y);
  ctx.shadowBlur = 0;
}

function drawMinimap(x, y, w, h) {
  const { s, bbox } = track;
  const bw = bbox.maxX - bbox.minX, bh = bbox.maxY - bbox.minY;
  const sc = Math.min((w - 16) / bw, (h - 16) / bh);
  const ox = x + w / 2 - (bbox.minX + bw / 2) * sc, oy = y + h / 2 - (bbox.minY + bh / 2) * sc;
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; roundRect(x, y, w, h, 10); ctx.fill();
  ctx.beginPath();
  for (let i = 0; i < s.length; i += 3) { const px = ox + s[i].x * sc, py = oy + s[i].y * sc; if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
  ctx.closePath(); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.stroke();
  const st = s[0]; ctx.fillStyle = '#fff'; ctx.fillRect(ox + st.x * sc - 3, oy + st.y * sc - 3, 6, 6);
  for (const k of karts) {
    const r = k === player ? 5 : 3.5;
    ctx.fillStyle = k.color; ctx.beginPath(); ctx.arc(ox + k.x * sc, oy + k.y * sc, r, 0, TAU); ctx.fill();
    if (k === player) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
  }
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!track) { ctx.fillStyle = '#0f1a2e'; ctx.fillRect(0, 0, W, H); return; }
  ctx.fillStyle = track.def.theme.grass; ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H > W ? (H - touchPad) * 0.6 : H * (isTouch ? 0.55 : 0.62));
  ctx.scale(camera.zoom, camera.zoom);
  ctx.rotate(-camera.angle - Math.PI / 2);
  ctx.translate(-camera.x, -camera.y);
  drawWorld();
  ctx.restore();
  if (state !== 'results') drawHUD();
}

// ───────────────────────── 결과 / 메뉴 ─────────────────────────
function showResults() {
  touchEl.classList.add('hidden');
  const sorted = karts.slice().sort((a, b) => a.rank - b.rank);
  document.getElementById('resultTitle').textContent = player.rank === 1 ? '🏆 1위! 우승!' : `${player.rank}위로 완주`;
  document.getElementById('resultSub').textContent = `${track.def.name} · ${selection.laps}랩 · 베스트 랩 ${fmtTime(player.bestLap)}`;
  const tb = document.getElementById('resultBody'); tb.innerHTML = '';
  for (const k of sorted) {
    const tr = document.createElement('tr'); if (k === player) tr.className = 'me';
    tr.innerHTML = `<td class="rank">${k.rank}</td><td><span class="dot" style="background:${k.color}"></span>${k.name}</td><td>${k.finished ? fmtTime(k.finishTime) : '주행 중'}</td><td>${fmtTime(k.bestLap)}</td>`;
    tb.appendChild(tr);
  }
  document.getElementById('result').classList.remove('hidden');
}

function renderMenu() {
  const tl = document.getElementById('trackList'); tl.innerHTML = '';
  TRACKS.forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'card' + (i === selection.track ? ' selected' : '');
    const best = store.get(`kart.best.${t.id}`, null);
    b.innerHTML = `<div class="swatch" style="background:linear-gradient(90deg, ${t.theme.grass}, ${t.theme.road}, ${t.theme.curbA})"></div><div class="name">${t.name}</div><div class="desc">${t.desc}</div><div class="best">베스트 랩 ${best == null ? '기록 없음' : fmtTime(best)}</div>`;
    b.onclick = () => { selection.track = i; store.set('kart.track', i); renderMenu(); };
    tl.appendChild(b);
  });
  const cl = document.getElementById('colorList'); cl.innerHTML = '';
  COLORS.forEach((c, i) => {
    const b = document.createElement('button'); b.style.background = c; b.title = c; if (i === selection.color) b.className = 'selected';
    b.onclick = () => { selection.color = i; store.set('kart.color', i); renderMenu(); };
    cl.appendChild(b);
  });
  const to = document.getElementById('touchOpts');
  if (isTouch) {
    to.classList.remove('hidden');
    const al = document.getElementById('autoList'); al.innerHTML = '';
    [[true, '자동 가속 (조향만)'], [false, '가속 버튼 직접']].forEach(([v, label]) => {
      const b = document.createElement('button'); b.textContent = label; if (v === !!settings.autoThrottle) b.className = 'selected';
      b.onclick = () => { settings.autoThrottle = v; store.set('kart.autoThrottle', v); renderMenu(); };
      al.appendChild(b);
    });
  }
  const ll = document.getElementById('lapList'); ll.innerHTML = '';
  [1, 3, 5].forEach((n) => {
    const b = document.createElement('button'); b.textContent = `${n}랩`; if (n === selection.laps) b.className = 'selected';
    b.onclick = () => { selection.laps = n; store.set('kart.laps', n); renderMenu(); };
    ll.appendChild(b);
  });
}

document.getElementById('startBtn').addEventListener('click', () => { Snd.init(); startRace(); });
document.getElementById('retryBtn').addEventListener('click', () => { Snd.init(); startRace(); });
document.getElementById('menuBtn').addEventListener('click', showMenu);

// ───────────────────────── 루프 ─────────────────────────
let last = performance.now();
function frame(now) {
  let dt = (now - last) / 1000; last = now;
  if (window.innerWidth !== W || window.innerHeight !== H) { resize(); measureTouch(); }
  if (dt > 0.05) dt = 0.05;
  if (state !== 'menu') update(dt);
  render();
  pressed.clear();
  requestAnimationFrame(frame);
}
renderMenu();
requestAnimationFrame(frame);

// 테스트용 훅 (화면 없이 빠르게 시뮬레이션)
window.__kart = {
  sim(seconds) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) { update(1 / 60); pressed.clear(); } },
  snapshot() { return { state, raceTime, karts: karts.map((k) => ({ name: k.name, lap: k.lap, idx: k.idx, lat: Math.round(k.lat), speed: Math.round(k.speed), rank: k.rank, finished: k.finished, bestLap: k.bestLap })) }; },
  set autopilot(v) { settings.autopilot = v; },
  keys() { return [...keys]; },
  dbg() { return { W, H, touchPad, zoom: camera.zoom, isTouch, px: player.x, py: player.y, cx: camera.x, cy: camera.y, ang: player.angle, cang: camera.angle }; },
};
})();
