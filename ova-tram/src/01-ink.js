// ───────────────────────── cel painting & inking ─────────────────────────
// RM lets one drawing function be rendered as paint-only or ink-only (used by the painted "harmony" stills)
const RM = { paint: true, ink: true };
let LW = 1;           // local units per screen pixel for line weights
const INK = '#150b11';
function setLW(s) { LW = (1 + 0.32 * Math.log2(Math.max(1, s))) / s; }
function pathP(c, p, close = true) {
  c.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]);
  if (close) c.closePath();
}
function fillP(c, p, col, a) {
  if (!RM.paint || !p || p.length < 3) return;
  c.beginPath(); pathP(c, p); c.fillStyle = a === undefined ? (typeof col === 'string' ? col : css(col)) : css(col, a); c.fill();
}
function clipP(c, p) { c.beginPath(); pathP(c, p); c.clip(); }
function air(c, x, y, r, col, a = 1, sx = 1, sy = 1, ang = 0) { // airbrush pass
  if (!RM.paint || r <= 0 || a <= 0) return;
  c.save(); c.translate(x, y); if (ang) c.rotate(ang); c.scale(sx, sy);
  const g = c.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, css(col, a)); g.addColorStop(0.45, css(col, a * 0.45)); g.addColorStop(1, css(col, 0));
  c.fillStyle = g; c.fillRect(-r, -r, 2 * r, 2 * r); c.restore();
}
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; } return a / 2; }
// variable-pressure ink ribbon. w in screen px (scaled by LW).
function ink(c, pts, w, col = INK, o = {}) {
  if (!RM.ink || !pts || pts.length < 2) return;
  const n = pts.length, closed = !!o.closed, L = arclen(pts), tot = L[n - 1] || 1;
  const seed = o.seed ?? (pts[0][0] * 0.131 + pts[0][1] * 0.717);
  const t0 = o.t0 ?? Math.min(0.35, 14 / tot), t1 = o.t1 ?? Math.min(0.35, 14 / tot);
  const ww = w * LW, wv = o.var ?? 0.35;
  const left = [], right = [];
  for (let i = 0; i < n; i++) {
    const a = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)], b = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const u = L[i] / tot;
    let tp = 1;
    if (!closed) { tp = Math.min(1, u / t0, (1 - u) / t1); tp = Math.max(0.12, Math.sqrt(Math.max(0, tp))); }
    const pr = 1 - wv * 0.5 + wv * vn(L[i] * 0.045 / Math.max(LW, 0.05) * 0.25, seed);
    const hw = ww * 0.5 * tp * pr;
    left.push([pts[i][0] - dy * hw, pts[i][1] + dx * hw]); right.push([pts[i][0] + dy * hw, pts[i][1] - dx * hw]);
  }
  c.beginPath();
  if (closed) { pathP(c, left); pathP(c, right.reverse()); }
  else { c.moveTo(left[0][0], left[0][1]); for (let i = 1; i < n; i++) c.lineTo(left[i][0], left[i][1]); for (let i = n - 1; i >= 0; i--) c.lineTo(right[i][0], right[i][1]); c.closePath(); }
  c.fillStyle = typeof col === 'string' ? col : css(col);
  c.fill(closed ? 'evenodd' : 'nonzero');
}
function inkC(c, pts, w, col = INK, o = {}) { o.closed = true; ink(c, pts, w, col, o); }
// coloured held line on the lit side of a closed outline
function rim(c, pts, lx, ly, col, w = 1.6, th = 0.3, o = {}) {
  if (!RM.ink || !pts || pts.length < 3) return;
  const n = pts.length, sg = signedArea(pts) > 0 ? 1 : -1, lit = [];
  const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n]; const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    lit.push(((dy / d) * sg * lx + (-dx / d) * sg * ly) > th);
  }
  let start = lit.indexOf(false); if (start < 0) { inkC(c, pts, w, col); return; }
  let run = [];
  const flush = () => { if (run.length > 2) ink(c, run, w, col, { t0: 0.3, t1: 0.3, var: 0.5, seed: o.seed }); run = []; };
  for (let k = 1; k <= n; k++) { const i = (start + k) % n; if (lit[i]) run.push(pts[i]); else flush(); }
  flush();
}
// a cel "shape": flat base, clipped hard shadows / airbrush, then ink + rim
function cel(c, pts, base, o = {}) {
  fillP(c, pts, base);
  if (o.inside && RM.paint) { c.save(); clipP(c, pts); o.inside(c); c.restore(); }
  if (o.line !== 0) inkC(c, pts, o.line ?? 1.4, o.ink ?? INK, { seed: o.seed });
  if (o.rim) for (const r of o.rim) rim(c, pts, r[0], r[1], r[2], r[3] ?? 1.4, r[4] ?? 0.3, { seed: o.seed });
}
function dot(c, x, y, r, col) { if (!RM.paint) return; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = typeof col === 'string' ? col : css(col); c.fill(); }
function inkDot(c, x, y, r, col = INK) { if (!RM.ink) return; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
// glow for light sources (additive)
function glow(c, x, y, r, col, a = 1, sx = 1, sy = 1) {
  if (!RM.paint) return;
  const g = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter'; air(c, x, y, r, col, a, sx, sy); c.globalCompositeOperation = g;
}
// hand-drawn four-point star flare
function flare(c, x, y, r, col, a = 1, ang = 0) {
  if (!RM.paint) return;
  const g = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  c.save(); c.translate(x, y); c.rotate(ang);
  for (let k = 0; k < 4; k++) {
    const len = r * (k % 2 ? 0.55 : 1), wd = r * 0.035;
    c.beginPath(); c.moveTo(0, -wd); c.quadraticCurveTo(len * 0.3, -wd * 0.4, len, 0); c.quadraticCurveTo(len * 0.3, wd * 0.4, 0, wd); c.closePath();
    c.fillStyle = css(col, a); c.fill(); c.rotate(Math.PI / 2);
  }
  c.restore(); c.globalCompositeOperation = g;
}
