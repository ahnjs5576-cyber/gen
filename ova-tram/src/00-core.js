'use strict';
// ───────────────────────── core math / rng / colour ─────────────────────────
const W = 960, H = 720, FPS = 24, DUR = 80;
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => x < a ? a : x > b ? b : x;
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const ss = (a, b, x) => { const t = inv(a, b, x); return t * t * (3 - 2 * t); };
function mulberry(a) {
  a = (a * 2654435761) >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function h1(x) { const s = Math.sin(x * 127.1 + 311.7) * 43758.5453123; return s - Math.floor(s); }
function h2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7 + 74.7) * 43758.5453123; return s - Math.floor(s); }
function vn(x, seed = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(h1(i + seed * 91.7), h1(i + 1 + seed * 91.7), u); }
function vn2(x, y, seed = 0) {
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), o = seed * 37.1;
  return lerp(lerp(h2(i + o, j), h2(i + 1 + o, j), ux), lerp(h2(i + o, j + 1), h2(i + 1 + o, j + 1), ux), uy);
}
function fbm2(x, y, seed = 0) { return vn2(x, y, seed) * 0.55 + vn2(x * 2.03, y * 2.03, seed + 5) * 0.28 + vn2(x * 4.1, y * 4.1, seed + 9) * 0.17; }
// hand timing helpers: quantise time onto ones / twos / threes
const q = (t, n) => Math.floor(t * FPS / n) * n / FPS;
const drawingIndex = (t, n = 2) => Math.floor(t * FPS / n);

const _cc = Object.create(null);
function rgb(c) {
  if (typeof c !== 'string') return c;
  if (_cc[c]) return _cc[c];
  if (c[0] === 'r') { const m = c.match(/[\d.]+/g).map(Number); return (_cc[c] = [m[0], m[1], m[2]]); }
  let h = c.slice(1); if (h.length === 3) h = h.split('').map(x => x + x).join('');
  return (_cc[c] = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
}
function css(c, a = 1) { c = rgb(c); return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`; }
function mix(a, b, t) { a = rgb(a); b = rgb(b); return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
function mixs(a, b, t, al = 1) { return css(mix(a, b, t), al); }
function scl(a, k) { a = rgb(a); return [a[0] * k, a[1] * k, a[2] * k]; }

// ───────────────────────── point lists ─────────────────────────
function bez(p0, p1, p2, p3, n = 12) {
  const r = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    r.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return r;
}
function qb(p0, p1, p2, n = 10) {
  const r = [];
  for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; r.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); }
  return r;
}
function ln(a, b, n = 1) { const r = []; for (let i = 0; i <= n; i++) r.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); return r; }
function cat(...arrs) {
  const r = [];
  for (const a of arrs) for (let i = 0; i < a.length; i++) {
    if (i === 0 && r.length) { const l = r[r.length - 1]; if (Math.abs(l[0] - a[0][0]) < 1e-6 && Math.abs(l[1] - a[0][1]) < 1e-6) continue; }
    r.push(a[i]);
  }
  return r;
}
function ell(cx, cy, rx, ry, n = 28, a0 = 0, a1 = TAU) {
  const r = []; const closed = Math.abs(a1 - a0 - TAU) < 1e-6; const m = closed ? n : n + 1;
  for (let i = 0; i < m; i++) { const a = a0 + (a1 - a0) * i / n; r.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); }
  return r;
}
function rrect(x, y, w, h, r, n = 4) {
  r = Math.min(r, w / 2, h / 2);
  return cat(ell(x + w - r, y + r, r, r, n, -Math.PI / 2, 0), ell(x + w - r, y + h - r, r, r, n, 0, Math.PI / 2),
    ell(x + r, y + h - r, r, r, n, Math.PI / 2, Math.PI), ell(x + r, y + r, r, r, n, Math.PI, Math.PI * 1.5));
}
function subdiv(pts, step, closed = false) {
  const r = []; const n = pts.length; const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i], b = pts[(i + 1) % n]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]); const k = Math.max(1, Math.ceil(d / step));
    for (let j = 0; j < k; j++) r.push([lerp(a[0], b[0], j / k), lerp(a[1], b[1], j / k)]);
  }
  if (!closed) r.push(pts[n - 1]);
  return r;
}
function arclen(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
// hand wobble: low-frequency displacement along the normal, stable for a given seed
function wob(pts, seed, amp, freq = 0.05, closed = false) {
  if (!amp) return pts;
  const n = pts.length, L = arclen(pts), r = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const o = (vn(L[i] * freq, seed) - 0.5) * 2 * amp;
    r.push([pts[i][0] - dy / d * o, pts[i][1] + dx / d * o]);
  }
  return r;
}
function tf(pts, dx = 0, dy = 0, s = 1, sy = s) { return pts.map(p => [p[0] * s + dx, p[1] * sy + dy]); }
function rot(pts, a, cx = 0, cy = 0) { const c = Math.cos(a), s = Math.sin(a); return pts.map(p => [cx + (p[0] - cx) * c - (p[1] - cy) * s, cy + (p[0] - cx) * s + (p[1] - cy) * c]); }
function bbox(p) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const q of p) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; } return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
function sampleCurve(pts, u) { // u 0..1 along arc length → [x,y,angle]
  const L = arclen(pts), tot = L[L.length - 1], tgt = clamp(u) * tot;
  let i = 1; while (i < L.length - 1 && L[i] < tgt) i++;
  const a = pts[i - 1], b = pts[i], f = (tgt - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
  return [lerp(a[0], b[0], f), lerp(a[1], b[1], f), Math.atan2(b[1] - a[1], b[0] - a[0])];
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
