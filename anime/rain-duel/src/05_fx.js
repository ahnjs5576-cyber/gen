// ===================================================================
//  EFFECTS — hand-drawn effects animation (cel language, no particles)
// ===================================================================
// ---- rain: three cel layers, each a 6-drawing cycle, like an FX artist's loop ----
const RAIN = { cels: [], N: 6 };
const RAIN_LAYERS = [
  { n: 700, len: [12, 24], w: [.5, .9], col: '#8d9cc4', a: .55 },
  { n: 220, len: [28, 56], w: [.9, 1.5], col: '#a9b6da', a: .6 },
  { n: 34, len: [90, 180], w: [1.8, 3.2], col: '#c3cdea', a: .45 }
];
function makeRain() {
  RAIN_LAYERS.forEach((L, li) => {
    RAIN.cels[li] = [];
    for (let k = 0; k < RAIN.N; k++) {
      const c = mkCanvas(W, H), g = c.getContext('2d');
      seed('rain', li, k);
      for (let i = 0; i < L.n; i++) {
        const x = rnd(-60, W + 60), y = rnd(-60, H + 40), l = rnd(L.len[0], L.len[1]);
        const a = .2 + rnd(-.03, .03); // slant
        const x2 = x + Math.sin(a) * l, y2 = y + Math.cos(a) * l;
        ink(g, [[x, y], [x2, y2]], { w: rnd(L.w[0], L.w[1]), c: L.col, a: L.a * rnd(.5, 1), t0: .5, t1: .35, sv: 0 });
      }
      RAIN.cels[li].push(c);
    }
  });
}
// o: {d:[far,mid,near] density alpha, k: drawing index, slant offset handled in cels, flash}
function drawRain(ctx, k, o = {}) {
  const d = o.d || [1, 1, 1];
  for (let li = 0; li < 3; li++) {
    if (!d[li]) continue;
    const kk = (k + li * 2) % RAIN.N;
    seed('rainoff', li, k);
    const ox = rnd(0, W) | 0, oy = rnd(0, H) | 0;
    ctx.globalAlpha = d[li] * (o.a ?? 1);
    if (o.flash) ctx.globalCompositeOperation = 'lighter';
    const c = RAIN.cels[li][kk];
    for (const [dx, dy] of [[0, 0], [-W, 0], [0, -H], [-W, -H]]) ctx.drawImage(c, ox + dx, oy + dy);
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.globalAlpha = 1;
}
// splashes on the ground plane: region {x0,x1,y0,y1}, size grows with y
function drawSplashes(ctx, k, rg, n, sz = 1, col = '#b8c4e4') {
  seed('spl', k, rg.y0);
  ctx.strokeStyle = css(col, .7); ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const y = rnd(rg.y0, rg.y1), x = rnd(rg.x0, rg.x1), t = (y - rg.y0) / (rg.y1 - rg.y0);
    const s = (1 + t * 5) * sz * rnd(.6, 1.2);
    const ph = R();
    if (ph < .5) { // crown
      ctx.lineWidth = Math.max(.6, s * .35);
      for (let j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(x + j * s * .5, y); ctx.quadraticCurveTo(x + j * s * .9, y - s * 1.2, x + j * s * 1.3, y - s * (1.3 - Math.abs(j) * .3)); ctx.stroke(); }
    } else { // ring
      ctx.lineWidth = Math.max(.5, s * .25);
      ctx.beginPath(); ctx.ellipse(x, y, s * 2.4 * ph, s * .6 * ph, 0, 0, TAU); ctx.stroke();
    }
  }
}
// ---- lightning bolt: midpoint displacement + branches, cel white core over painted glow ----
function boltPts(a, b, rough, depth, out, br, sd) {
  const pts = [a, b];
  for (let d = 0; d < depth; d++) {
    for (let i = pts.length - 1; i > 0; i--) {
      const p = pts[i - 1], q = pts[i]; const l = dist(p, q);
      const m = [(p[0] + q[0]) / 2 + rnd(-1, 1) * l * rough, (p[1] + q[1]) / 2 + rnd(-.3, .3) * l * rough];
      pts.splice(i, 0, m);
    }
  }
  out.push(pts);
  if (br > 0) for (let i = 2; i < pts.length - 2; i += 1) if (R() < .12) {
    const p = pts[i]; const l = dist(a, b) * rnd(.15, .4); const an = Math.atan2(b[1] - a[1], b[0] - a[0]) + rnd(-.9, .9);
    boltPts(p, [p[0] + Math.cos(an) * l, p[1] + Math.sin(an) * l], rough * 1.1, Math.max(2, depth - 2), out, br - 1, sd);
  }
  return out;
}
function drawBolt(ctx, a, b, sd, w = 3, o = {}) {
  seed('bolt', sd);
  const arms = boltPts(a, b, o.rough || .32, o.depth || 6, [], o.br ?? 2, sd);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const pts of arms) { ink(ctx, pts, { w: w * 7, c: o.glow || '#3d4f9a', a: .18, t0: .1, t1: .6, sv: .2, dense: true }); ink(ctx, pts, { w: w * 3, c: o.glow2 || '#7f8fe6', a: .3, t0: .1, t1: .6, dense: true }); }
  ctx.restore();
  arms.forEach((pts, i) => ink(ctx, pts, { w: i === 0 ? w : w * .55, c: o.core || '#f4f6ff', t0: .05, t1: .7, sv: .3, dense: true }));
}
function glow(ctx, x, y, r, col, a = .5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, css(col, a)); g.addColorStop(.4, css(col, a * .35)); g.addColorStop(1, css(col, 0));
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
// ---- impact sparks ----
function drawSpark(ctx, x, y, sz, sd, o = {}) {
  seed('spark', sd);
  const n = rndi(9, 13), pts = [];
  for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + rnd(-.1, .1); const r = i % 2 ? sz * rnd(.15, .3) : sz * rnd(.5, 1.25); const q = [x + Math.cos(a) * r, y + Math.sin(a) * r * (o.sq || 1)]; if (!(i % 2)) q[2] = 1; pts.push(q); }
  glow(ctx, x, y, sz * 2.2, o.glow || '#ffb060', .5);
  const d = spline(pts, true, 3);
  cel(ctx, d, { f: o.c || '#fff6dc', bands: [{ c: o.c2 || '#ffc45a', off: [0, 0], shape: d.map(p => [x + (p[0] - x) * .55, y + (p[1] - y) * .55]), inside: false }], lw: Math.max(1.2, sz * .04), lc: o.lc || '#c0501c' });
  // flying spark streaks
  for (let i = 0; i < (o.n ?? 14); i++) {
    const a = rnd(0, TAU), r0 = sz * rnd(.4, 1), r1 = r0 + sz * rnd(.4, 1.6);
    ink(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 + sz * .15]], { w: rnd(1.2, 3), c: R() < .5 ? '#fff2c0' : '#ffb24a', t0: .3, t1: .6 });
  }
}
// ---- concentration lines (shuchu-sen) ----
function drawConc(ctx, cx, cy, k, o = {}) {
  seed('conc', k, o.sd || 0);
  const n = o.n || 90, r0 = o.r0 || 260, col = o.c || '#f0ecf6';
  for (let i = 0; i < n; i++) {
    const a = rnd(0, TAU); const ri = r0 * rnd(.8, 1.5); const ro = 1200;
    const w = rnd(1, o.w || 6);
    ink(ctx, [[cx + Math.cos(a) * ro, cy + Math.sin(a) * ro], [cx + Math.cos(a) * ri, cy + Math.sin(a) * ri]], { w, c: col, a: o.a ?? .8, t0: .02, t1: .9, sv: 0 });
  }
}
// ---- horizontal speed-pan background (painted streaks) ----
function drawSpeedBG(ctx, k, cols, o = {}) {
  ctx.fillStyle = css(cols[0]); ctx.fillRect(0, 0, W, H);
  seed('spd', k % (o.cyc || 4), o.sd || 0);
  for (let i = 0; i < (o.n || 160); i++) {
    const y = rnd(-10, H), x = rnd(-300, W), l = rnd(200, 900), w = rnd(2, 14);
    const col = pick(cols.slice(1));
    ctx.globalAlpha = rnd(.25, .8);
    brush(ctx, x, y, l, rnd(-.005, .005) + (o.ang || 0), w, jitc(col, 6), { nob: 0, bend: 0 });
  }
  ctx.globalAlpha = 1;
}
// ---- impact frame: negative-image flash ----
function invertFrame(ctx, al = 1) {
  ctx.save(); ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function tintFrame(ctx, col, al, op = 'source-over') { ctx.save(); ctx.globalCompositeOperation = op; ctx.fillStyle = css(col, al); ctx.fillRect(-50, -50, W + 100, H + 100); ctx.restore(); }
// ---- blood ----
function drawDrop(ctx, x, y, r, ang, col, lc) {
  const u = [Math.cos(ang), Math.sin(ang)], v = [-u[1], u[0]];
  const pts = [[x + u[0] * r * 2.6, y + u[1] * r * 2.6, 1]];
  for (let i = 0; i <= 6; i++) { const a = Math.PI / 2 + i / 6 * Math.PI; pts.push([x + Math.cos(a) * u[0] * r - Math.sin(a) * v[0] * -r * 0 + (Math.cos(a) * u[0] + Math.sin(a) * v[0]) * r * 0, 0]); }
  const P = [[x + u[0] * r * 2.4, y + u[1] * r * 2.4, 1], [x + v[0] * r, y + v[1] * r], [x - u[0] * r * .9, y - u[1] * r * .9], [x - v[0] * r, y - v[1] * r]];
  const d = spline(P, true, 1.5);
  cel(ctx, d, { f: col, lw: Math.max(.8, r * .25), lc: lc || '#2a0608' });
}
function drawBloodSpray(ctx, x, y, ang, spread, t, sd, sz = 1, lm = 'night') {
  seed('blood', sd);
  const col = lc1('#8c1a20', lm), lc = lc1('#3a0508', lm);
  for (let i = 0; i < 16; i++) {
    const a = ang + rnd(-spread, spread), sp = rnd(120, 420) * sz;
    const tt = Math.max(0, t - rnd(0, .08));
    const px = x + Math.cos(a) * sp * tt, py = y + Math.sin(a) * sp * tt + 380 * sz * tt * tt;
    const r = rnd(1.5, 5) * sz * (1 - tt * .4);
    if (tt <= 0) continue;
    drawDrop(ctx, px, py, r, Math.atan2(Math.sin(a) * sp + 760 * sz * tt, Math.cos(a) * sp) + Math.PI, col, lc);
  }
}
// ---- billowing smoke / steam: drawn puff clusters, cel two-tone ----
function puffShape(cx, cy, r, sd) {
  seed('puff', sd);
  const n = rndi(7, 10), pts = [];
  for (let i = 0; i < n; i++) {
    const a0 = i / n * TAU, a1 = (i + 1) / n * TAU;
    const rr = r * rnd(.75, 1.1);
    for (let j = 0; j <= 3; j++) { const a = lerp(a0, a1, j / 3); const bulge = Math.sin(j / 3 * Math.PI) * .22 + .85; const q = [cx + Math.cos(a) * rr * bulge, cy + Math.sin(a) * rr * bulge * .82]; if (j === 0) q[2] = 1; pts.push(q); }
  }
  return spline(pts, true, 3);
}
function drawPuff(ctx, cx, cy, r, sd, tones, L = [-.5, -.8], lw = 2) {
  const d = puffShape(cx, cy, r, sd);
  cel(ctx, d, { f: tones[0], bands: [{ c: tones[1], off: [L[0] * r * .35, L[1] * r * .35], lc: tones[2], lw: lw * .6 }, tones[3] ? { c: tones[3], off: [-L[0] * r * .12, -L[1] * r * .12] } : null], lw, lc: tones[4] || INK });
}
// ---- shock ring on the water / in the air: painted brush ring + thrown spray ----
function drawShockRing(ctx, cx, cy, r, sq, sd, col = '#e9eefc', w = 6) {
  seed('ring', sd);
  const n = Math.max(24, r / 8 | 0);
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + rnd(-.05, .05); const rr = r * rnd(.96, 1.04);
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * sq;
    const tan = Math.atan2(Math.cos(a) * sq, -Math.sin(a));
    ctx.globalAlpha = rnd(.18, .45);
    brush(ctx, x - Math.cos(tan) * TAU * r / n, y - Math.sin(tan) * TAU * r / n, TAU * r / n * rnd(1.8, 2.6), tan, w * rnd(.8, 2.4), jitc(col, 8), { nob: 0, bend: rnd(-.05, .05) });
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < n / 2; i++) { const a = rnd(0, TAU), rr = r * rnd(1.02, 1.15); const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * sq; ink(ctx, [[x, y], [x + Math.cos(a) * w * 4, y + Math.sin(a) * w * 4 * sq]], { w: w * .5, c: col, a: .7 }); }
}
// ---- water burst (footfall / impact): crown sheet with spiky rim, droplets ----
function drawWaterBurst(ctx, x, y, sz, ph, sd, lm = 'night') {
  if (ph <= 0) return;
  seed('wb', sd);
  const base = lc1('#dfe6fa', lm), sh = lc1('#8593c2', lm), inner = lc1('#5d6a9a', lm), lc = lc1('#232b4a', lm);
  const lw = Math.max(.8, sz * .02);
  const rise = ph < .45 ? easeOut(ph / .45) : 1 - easeIn((ph - .45) / .55) * .85;
  const wd = sz * (.35 + ph * .5), H0 = sz * rise;
  const N = 22, top = [], bot = [];
  const pk = []; for (let i = 0; i <= N; i++) pk.push(i % 2 === 0 ? rnd(.75, 1.15) : rnd(.35, .6));
  for (let i = 0; i <= N; i++) {
    const th = Math.PI + i / N * TAU; const c = Math.cos(th), sn = Math.sin(th);
    const flare = 1 + .35 * pk[i];
    const q = [x + c * wd * flare, y + sn * wd * .3 - H0 * pk[i] * (sn < 0 ? .85 : 1)]; if (i % 2 === 0) q[2] = 1;
    top.push(q); bot.push([x + c * wd, y + sn * wd * .3]);
  }
  const half = N / 2;
  const backTop = top.slice(0, half + 1), backBot = bot.slice(0, half + 1);
  const frontTop = top.slice(half), frontBot = bot.slice(half);
  if (H0 > 2) {
    const bd = spline(backTop.concat(backBot.slice().reverse()), true, 2);
    cel(ctx, bd, { f: inner, bands: [{ c: sh, off: [0, H0 * .25] }], lw, lc });
    const fd = spline(frontTop.concat(frontBot.slice().reverse()), true, 2);
    cel(ctx, fd, { f: base, bands: [{ c: sh, off: [-wd * .12, -H0 * .2], lc: lc1('#a9b6e0', lm), lw: lw * .6 }], lw, lc });
  }
  // droplets thrown from the peaks
  for (let i = 0; i <= N; i += 2) {
    if (ph < .2) continue;
    const p = top[i], out = Math.cos(Math.PI + i / N * TAU);
    const dt = ph - .2, r = sz * rnd(.025, .055);
    const px = p[0] + out * dt * sz * .6, py = p[1] - dt * sz * (.8 - dt * 2.2);
    if (py > y) continue;
    const d = spline([[px, py - r * 1.9, 1], [px + r, py], [px, py + r], [px - r, py]], true, 1.5);
    cel(ctx, d, { f: base, lw: lw * .7, lc });
  }
}
// ---- spiralling fire-wind wrapped around an arm (A's technique) ----
// axis from a (elbow) to b (fist); layer 'back' | 'front'; k drawing idx; I intensity 0..1
function drawFireWind(ctx, a, b, k, I, layer, sc = 1) {
  if (I <= .01) return;
  const ax = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(ax[0], ax[1]); const u = [ax[0] / L, ax[1] / L], v = [-u[1], u[0]];
  const nR = 2 + Math.round(I * 3), turns = 2.2;
  const F = ['#fff3cc', '#ffc457', '#f0782c', '#5a1a0c'];
  const lw = Math.max(1, sc * 1.4);
  seed('fw', k, layer);
  if (layer === 'back') glow(ctx, b[0], b[1], (60 + 140 * I) * sc, '#ff9a40', .25 + .35 * I);
  for (let r = 0; r < nR; r++) {
    const ph0 = r / nR * TAU + k * 1.1;
    const N = 48; let seg = [];
    const flush = () => {
      if (seg.length > 4) {
        const n = seg.length; const wmax = (4 + 9 * I) * sc * rnd(.8, 1.2);
        const d = ribbon(seg, [[.6, .6], [wmax * .8, wmax * .6], [wmax, wmax], [wmax * .5, wmax * .4], [.4, .4]], { capE: .3, capS: .3 });
        cel(ctx, d, { f: F[1], bands: [{ c: F[2], off: [u[0] * wmax * .6 + v[0] * wmax * .4, u[1] * wmax * .6 + v[1] * wmax * .4], lc: '#ff8a30', lw: lw * .6 }, { c: F[0], off: [-v[0] * wmax * .6, -v[1] * wmax * .6] }], lw, lc: F[3] });
      }
      seg = [];
    };
    for (let i = 0; i <= N; i++) {
      const t = -.05 + i / N * (1.15 + .35 * I);
      const ang = ph0 + t * turns * TAU;
      const front = Math.sin(ang) > 0;
      if (front !== (layer === 'front')) { flush(); continue; }
      const rad = (16 + 26 * I) * sc * (1 + Math.max(0, t - .7) * 1.4) * (1 + .12 * Math.sin(i * 1.3 + k * 2));
      seg.push([a[0] + u[0] * L * t + v[0] * Math.cos(ang) * rad, a[1] + u[1] * L * t + v[1] * Math.cos(ang) * rad]);
    }
    flush();
  }
  // flame tongues around the fist, swept back along the arm
  if (layer === 'front') {
    const nT = Math.round(2 + 4 * I);
    for (let i = 0; i < nT; i++) {
      const off = rnd(-1, 1) * (20 + 30 * I) * sc, len = rnd(40, 110) * sc * (.4 + I), w = rnd(6, 13) * sc * (.5 + I * .5);
      const p0 = [b[0] + v[0] * off + u[0] * rnd(-10, 20) * sc, b[1] + v[1] * off + u[1] * rnd(-10, 20) * sc];
      const wv = rnd(-.5, .5);
      const p1 = [p0[0] - u[0] * len * .5 + v[0] * len * wv * .3, p0[1] - u[1] * len * .5 + v[1] * len * wv * .3];
      const p2 = [p0[0] - u[0] * len + v[0] * len * wv * .6, p0[1] - u[1] * len + v[1] * len * wv * .6];
      const d = ribbon([p0, p1, p2], [[w, w], [w * .7, w * .6], [.4, .4]], { capS: 1, capE: .2 });
      cel(ctx, d, { f: F[1], bands: [{ c: F[0], shape: d.map(q => [p0[0] + (q[0] - p0[0]) * .55, p0[1] + (q[1] - p0[1]) * .55]), inside: true }, { c: F[2], off: [v[0] * w * .5, v[1] * w * .5] }], lw: lw * .8, lc: F[3] });
    }
  }
}
// ---- crackling electricity along a blade (B's technique) ----
function drawElectric(ctx, p0, p1, k, I, sc = 1) {
  seed('el', k);
  const L = dist(p0, p1); const u = [(p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L], v = [-u[1], u[0]];
  const n = 2 + Math.round(I * 5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const t0 = rnd(-.05, .5), t1 = rnd(t0 + .3, 1.15);
    const pts = []; const m = 12;
    for (let j = 0; j <= m; j++) { const t = lerp(t0, t1, j / m); const off = (j === 0 || j === m ? 0 : rnd(-1, 1)) * (8 + 16 * I) * sc; pts.push([p0[0] + u[0] * L * t + v[0] * off, p0[1] + u[1] * L * t + v[1] * off]); }
    ink(ctx, pts, { dense: true, w: (6 + 8 * I) * sc, c: '#4a5ad0', a: .3, t0: .1, t1: .1 });
    ink(ctx, pts, { dense: true, w: (2.2 + 2 * I) * sc, c: '#b8c6ff', a: .9, t0: .1, t1: .1, sv: .5 });
  }
  ctx.restore();
  for (let i = 0; i < n; i++) {
    const t = rnd(0, 1); const p = [p0[0] + u[0] * L * t, p0[1] + u[1] * L * t]; const pts = [p];
    let q = p; for (let j = 0; j < 4; j++) { q = [q[0] + rnd(-1, 1) * 18 * sc * (1 + I), q[1] + rnd(-1, 1) * 18 * sc * (1 + I)]; pts.push(q); }
    ink(ctx, pts, { w: (1.6 + I * 1.5) * sc, c: '#f2f4ff', t0: .05, t1: .5, sv: .3 });
  }
}
// ---- debris chunks (stone) flying ----
function drawChunks(ctx, cx, cy, t, n, sd, sz = 1, lm = 'night') {
  seed('chunk', sd);
  const f = lc1('#6a7088', lm), s = lc1('#3a3f52', lm);
  for (let i = 0; i < n; i++) {
    const a = rnd(-Math.PI, 0), sp = rnd(150, 520) * sz;
    const x = cx + Math.cos(a) * sp * t, y = cy + Math.sin(a) * sp * t + 600 * sz * t * t;
    const r = rnd(4, 14) * sz; const rot = rnd(0, TAU) + t * rnd(-8, 8);
    const pts = []; const m = rndi(4, 6); for (let j = 0; j < m; j++) { const an = rot + j / m * TAU; pts.push([x + Math.cos(an) * r * rnd(.6, 1.2), y + Math.sin(an) * r * rnd(.6, 1.2), 1]); }
    cel(ctx, spline(pts, true, 2), { f, bands: [{ c: s, off: [r * .3, r * .4] }], lw: 1.4 * sz, lc: '#0e0f16' });
  }
}
// ---- multiples / smear for fast motion (traditional technique) ----
function smearArc(ctx, pts, w, col, lc) {
  const d = ribbon(pts, [[w * .2, w * .2], [w, w], [w * .3, w * .3]], { capE: .3, capS: .3 });
  cel(ctx, d, { f: col, lw: 1.2, lc: lc || INK });
  for (let i = 0; i < 6; i++) { const t = rnd(.1, .9); const k = Math.floor(t * (pts.length - 1)); }
}
