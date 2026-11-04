'use strict';
// ===================================================================
//  CORE — rng, noise, colour, splines, hand-inked lines, cel paint
// ===================================================================
const W = 1280, H = 720, FPS = 24, DUR = 80;
const TAU = Math.PI * 2, D2R = Math.PI / 180;

function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hashStr(s) { let h = 2166136261 >>> 0; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
let R = mulberry(1);
function seed(...a) { R = mulberry(hashStr(a.join('|'))); }
const rnd = (a = 0, b = 1) => a + (b - a) * R();
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const rsgn = () => (R() < .5 ? -1 : 1);
const pick = arr => arr[Math.floor(R() * arr.length)];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const lin = (a, b, x) => clamp((x - a) / (b - a), 0, 1);
const easeIn = t => t * t, easeOut = t => 1 - (1 - t) * (1 - t);
const easeIO = t => (t < .5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
function hn(i, s) { let h = Math.imul(i | 0, 374761393) + Math.imul(s | 0, 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296; }
function vnoise(x, s = 0) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hn(i, s), hn(i + 1, s), u) * 2 - 1; }
function fbm(x, s = 0) { return vnoise(x, s) * .6 + vnoise(x * 2.1, s + 7) * .3 + vnoise(x * 4.3, s + 13) * .1; }
function hn2(x, y, s) { return hn(Math.imul(x | 0, 73856093) ^ Math.imul(y | 0, 19349663), s); }
function vn2(x, y, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hn2(ix, iy, s), b = hn2(ix + 1, iy, s), c = hn2(ix, iy + 1, s), d = hn2(ix + 1, iy + 1, s);
  return lerp(lerp(a, b, ux), lerp(c, d, ux), uy) * 2 - 1;
}
function fbm2(x, y, s = 0) { return vn2(x, y, s) * .55 + vn2(x * 2.03, y * 2.03, s + 5) * .28 + vn2(x * 4.1, y * 4.1, s + 9) * .17; }

// ---------- colour ----------
const _hx = {};
function hx(h) { if (Array.isArray(h)) return h; if (_hx[h]) return _hx[h]; const v = parseInt(h.slice(1), 16); return (_hx[h] = [v >> 16 & 255, v >> 8 & 255, v & 255]); }
function mixc(a, b, t) { const A = hx(a), B = hx(b); return [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]; }
function mulc(a, m) { const A = hx(a); const M = typeof m === 'number' ? [m, m, m] : hx(m).map(v => v / 255); return [A[0] * M[0], A[1] * M[1], A[2] * M[2]]; }
function addc(a, b, t = 1) { const A = hx(a), B = hx(b); return [Math.min(255, A[0] + B[0] * t), Math.min(255, A[1] + B[1] * t), Math.min(255, A[2] + B[2] * t)]; }
function css(c, al) { const C = hx(c); return al == null ? `rgb(${C[0] | 0},${C[1] | 0},${C[2] | 0})` : `rgba(${C[0] | 0},${C[1] | 0},${C[2] | 0},${al})`; }
function mixs(a, b, t, al) { return css(mixc(a, b, t), al); }
function jitc(c, a) { const C = hx(c); const d = rnd(-a, a); return [C[0] + d + rnd(-a, a) * .4, C[1] + d + rnd(-a, a) * .4, C[2] + d + rnd(-a, a) * .4]; }

// ---------- geometry ----------
const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const add2 = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const dirv = a => [Math.sin(a), Math.cos(a)];           // angle from "down", +x forward
function norm2(v) { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; }
function rot2(p, a, c = [0, 0]) { const s = Math.sin(a), co = Math.cos(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * co - y * s, c[1] + x * s + y * co]; }
function tr(pts, ox, oy, sx = 1, sy = sx, rot = 0) {
  const s = Math.sin(rot), c = Math.cos(rot);
  return pts.map(p => { const x = p[0] * sx, y = p[1] * sy; const q = [ox + x * c - y * s, oy + x * s + y * c]; if (p[2]) q[2] = p[2]; return q; });
}
function jit(pts, a) { return pts.map(p => { const q = [p[0] + rnd(-a, a), p[1] + rnd(-a, a)]; if (p[2]) q[2] = p[2]; return q; }); }

// Catmull-Rom through control points; a point with p[2] truthy is a hard corner
function spline(pts, closed, step = 3) {
  const n = pts.length; if (n < 3 && closed) return pts.map(p => [p[0], p[1]]);
  if (n < 2) return pts.map(p => [p[0], p[1]]);
  const out = [];
  const g = i => (closed ? pts[((i % n) + n) % n] : pts[i < 0 ? 0 : i > n - 1 ? n - 1 : i]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p1 = g(i), p2 = g(i + 1);
    let p0 = g(i - 1), p3 = g(i + 2);
    if (p1[2]) p0 = p1;
    if (p2[2]) p3 = p2;
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const m = Math.max(1, Math.ceil(len / step));
    for (let j = 0; j < m; j++) {
      const t = j / m, t2 = t * t, t3 = t2 * t;
      out.push([
        .5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        .5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]);
    }
  }
  if (!closed) out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}
function poly(ctx, d, closed = true, off) {
  ctx.beginPath(); addPoly(ctx, d, closed, off);
}
function addPoly(ctx, d, closed = true, off) {
  const ox = off ? off[0] : 0, oy = off ? off[1] : 0;
  ctx.moveTo(d[0][0] + ox, d[0][1] + oy);
  for (let i = 1; i < d.length; i++) ctx.lineTo(d[i][0] + ox, d[i][1] + oy);
  if (closed) ctx.closePath();
}
function fillD(ctx, d, col, al) { ctx.fillStyle = css(col, al); poly(ctx, d); ctx.fill(); }
function shape(pts, j = 0, step = 3) { return spline(j ? jit(pts, j) : pts, true, step); }

// ---------- hand-inked line: variable width ribbon with swells & tapers ----------
const INK = '#21161a';
function ink(ctx, pts, o = {}) {
  const w = o.w ?? 2, closed = !!o.closed;
  const d = o.dense ? pts : spline(pts, closed, o.step || 2.5);
  const n = d.length; if (n < 2) return;
  const L = new Float32Array(n);
  for (let i = 1; i < n; i++) L[i] = L[i - 1] + Math.hypot(d[i][0] - d[i - 1][0], d[i][1] - d[i - 1][1]);
  const tot = L[n - 1] || 1;
  const tp = o.tp ?? 40;
  const ta = closed ? 0 : Math.min(tot * (o.t0 ?? .3), tp), tb = closed ? 0 : Math.min(tot * (o.t1 ?? .3), tp);
  const sv = o.sv ?? .3, ns = R() * 100, sc = o.sc ?? 45;
  const lf = [], rt = [];
  for (let i = 0; i < n; i++) {
    const s = L[i]; let p = 1;
    if (ta > 0) p *= Math.pow(clamp(s / ta, 0, 1), .55);
    if (tb > 0) p *= Math.pow(clamp((tot - s) / tb, 0, 1), .55);
    p *= 1 + sv * vnoise(s / sc + ns, 3);
    if (o.prof) p *= o.prof(s / tot);
    const hw = Math.max(.12, w * p * .5);
    const a = closed ? d[(i - 1 + n) % n] : d[Math.max(0, i - 1)], b = closed ? d[(i + 1) % n] : d[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0], ty = b[1] - a[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    lf.push([d[i][0] - ty * hw, d[i][1] + tx * hw]); rt.push([d[i][0] + ty * hw, d[i][1] - tx * hw]);
  }
  ctx.fillStyle = css(o.c ?? INK, o.a);
  ctx.beginPath();
  if (closed) { addPoly(ctx, lf); addPoly(ctx, rt); ctx.fill('evenodd'); }
  else { ctx.moveTo(lf[0][0], lf[0][1]); for (let i = 1; i < n; i++) ctx.lineTo(lf[i][0], lf[i][1]); for (let i = n - 1; i >= 0; i--) ctx.lineTo(rt[i][0], rt[i][1]); ctx.closePath(); ctx.fill(); }
}
// short tapered pencil-ink stroke from a to b with optional bend
function stk(ctx, a, b, w, c, bend = 0, o = {}) {
  const m = [(a[0] + b[0]) / 2 + (a[1] - b[1]) * bend, (a[1] + b[1]) / 2 + (b[0] - a[0]) * bend];
  ink(ctx, [a, m, b], Object.assign({ w, c, t0: .45, t1: .45 }, o));
}

// ---------- cel paint ----------
// band: hard-edged second tone = part minus (part shifted by off). colour line on the edge.
function cel(ctx, d, o) {
  ctx.fillStyle = css(o.f); poly(ctx, d); ctx.fill();
  if (o.bands && o.bands.length) {
    ctx.save(); poly(ctx, d); ctx.clip();
    for (const b of o.bands) {
      if (!b) continue;
      const sd = b.shape || d;
      ctx.beginPath();
      if (b.inside) addPoly(ctx, sd, true, b.off);
      else { ctx.rect(-4000, -4000, 9000, 9000); addPoly(ctx, sd, true, b.off); }
      ctx.fillStyle = css(b.c); ctx.fill(b.inside ? 'nonzero' : 'evenodd');
      if (b.lc) { const td = b.off ? sd.map(p => [p[0] + b.off[0], p[1] + b.off[1]]) : sd; ink(ctx, td, { dense: true, closed: true, w: b.lw || 1.1, c: b.lc, sv: .5 }); }
    }
    if (o.paint) paintInside(ctx, d, o.f, o.paint);
    ctx.restore();
  } else if (o.paint) { ctx.save(); poly(ctx, d); ctx.clip(); paintInside(ctx, d, o.f, o.paint); ctx.restore(); }
  if (o.lw !== 0) ink(ctx, d, { dense: true, closed: true, w: o.lw ?? 2, c: o.lc ?? INK, sv: o.sv ?? .4 });
}
function bbox(d) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of d) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return [x0, y0, x1, y1]; }
// harmony-frame treatment: brush texture inside an already clipped cel area
function paintInside(ctx, d, base, amt) {
  const [x0, y0, x1, y1] = bbox(d); const area = (x1 - x0) * (y1 - y0);
  const n = Math.min(260, 10 + area / 260 * amt);
  for (let i = 0; i < n; i++) {
    const x = rnd(x0, x1), y = rnd(y0, y1);
    ctx.globalAlpha = rnd(.05, .16) * Math.min(1, amt);
    brush(ctx, x, y, rnd(8, 30), rnd(-.6, .6) + 1.2, rnd(2, 6), R() < .5 ? addc(base, [30, 30, 40], 1) : mulc(base, .7));
  }
  ctx.globalAlpha = 1;
}

// ribbon: chain of points with half-widths → closed outline (left side, end cap, right side back)
function ribbon(chain, widths, o = {}) {
  const d = spline(chain, false, o.step || 2.5);
  const n = d.length; const L = [0];
  for (let i = 1; i < n; i++) L[i] = L[i - 1] + dist(d[i - 1], d[i]);
  const tot = L[n - 1] || 1;
  const wAt = t => { const k = t * (widths.length - 1); const i = Math.min(widths.length - 2, Math.floor(k)); const f = k - i; const a = widths[i], b = widths[i + 1]; return [lerp(a[0] ?? a, b[0] ?? b, f), lerp(a[1] ?? a, b[1] ?? b, f)]; };
  const lf = [], rt = [];
  for (let i = 0; i < n; i++) {
    const a = d[Math.max(0, i - 1)], b = d[Math.min(n - 1, i + 1)];
    const t = norm2([b[0] - a[0], b[1] - a[1]]); const w = wAt(L[i] / tot);
    lf.push([d[i][0] - t[1] * w[0], d[i][1] + t[0] * w[0]]);
    rt.push([d[i][0] + t[1] * w[1], d[i][1] - t[0] * w[1]]);
  }
  const out = lf.slice();
  // round end cap
  const e = d[n - 1], ta = norm2([d[n - 1][0] - d[n - 2][0], d[n - 1][1] - d[n - 2][1]]);
  const capE = o.capE ?? 1, capS = o.capS ?? 1;
  const we = wAt(1); const re = (we[0] + we[1]) / 2;
  for (let k = 1; k < 6; k++) { const a = Math.PI * k / 6; const nx = -ta[1], ny = ta[0]; out.push([e[0] + (nx * Math.cos(a) + ta[0] * Math.sin(a) * capE) * re, e[1] + (ny * Math.cos(a) + ta[1] * Math.sin(a) * capE) * re]); }
  for (let i = n - 1; i >= 0; i--) out.push(rt[i]);
  const s = d[0], ts = norm2([d[1][0] - d[0][0], d[1][1] - d[0][1]]); const ws = wAt(0); const rs = (ws[0] + ws[1]) / 2;
  for (let k = 1; k < 6; k++) { const a = Math.PI * k / 6; const nx = ts[1], ny = -ts[0]; out.push([s[0] + (nx * Math.cos(a) - ts[0] * Math.sin(a) * capS) * rs, s[1] + (ny * Math.cos(a) - ts[1] * Math.sin(a) * capS) * rs]); }
  return out;
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
