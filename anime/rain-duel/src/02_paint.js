// ===================================================================
//  PAINT — poster-colour background painting on paper
// ===================================================================
function brush(ctx, x, y, len, ang, w, col, o) {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const bend = o && o.bend != null ? o.bend : rnd(-.12, .12);
  const N = 6, Lp = [], Rp = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, b = bend * len * 2 * t * (1 - t);
    const px = x + c * len * t + nx * b, py = y + s * len * t + ny * b;
    const prof = t < .15 ? .8 + t : t > .7 ? 1 - (t - .7) * 1.9 : 1;
    const hw = w * .5 * prof * (1 + rnd(-.14, .14));
    Lp.push([px + nx * hw, py + ny * hw]); Rp.push([px - nx * hw, py - ny * hw]);
  }
  ctx.fillStyle = css(col);
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (let i = 1; i <= N; i++) ctx.lineTo(Lp[i][0], Lp[i][1]);
  for (let i = N; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath(); ctx.fill();
  if (w > 3.5 && !(o && o.nob)) {
    const ga = ctx.globalAlpha; const nb = Math.min(4, 1 + (w / 5 | 0));
    for (let k = 0; k < nb; k++) {
      const off = rnd(-.4, .4) * w, t0 = rnd(0, .4), t1 = rnd(.6, 1);
      ctx.globalAlpha = ga * rnd(.25, .55);
      ctx.strokeStyle = css(R() < .5 ? addc(col, [16, 16, 20]) : mulc(col, .78));
      ctx.lineWidth = rnd(.5, 1.3);
      ctx.beginPath();
      ctx.moveTo(x + c * len * t0 + nx * off, y + s * len * t0 + ny * off);
      ctx.quadraticCurveTo(x + c * len * .5 + nx * (off + bend * len * .5), y + s * len * .5 + ny * (off + bend * len * .5), x + c * len * t1 + nx * off, y + s * len * t1 + ny * off);
      ctx.stroke();
    }
    ctx.globalAlpha = ga;
  }
}
// dry-brush scumble: broken streaks of thin bristle lines
function dryBrush(ctx, x, y, len, ang, w, col, al = .5) {
  const c = Math.cos(ang), s = Math.sin(ang), nx = -s, ny = c;
  const n = 4 + (w / 1.5 | 0);
  ctx.strokeStyle = css(col);
  for (let k = 0; k < n; k++) {
    const off = rnd(-.5, .5) * w; const t0 = rnd(0, .3), t1 = rnd(.5, 1);
    ctx.globalAlpha = al * rnd(.3, 1); ctx.lineWidth = rnd(.4, 1.4);
    ctx.beginPath(); ctx.moveTo(x + c * len * t0 + nx * off, y + s * len * t0 + ny * off); ctx.lineTo(x + c * len * t1 + nx * off, y + s * len * t1 + ny * off); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// ---------- paper ----------
let PAPER = null;
function makePaper() {
  const c = mkCanvas(W, H), g = c.getContext('2d');
  const id = g.createImageData(W, H), a = id.data;
  seed('paper');
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const n = fbm2(x / 3.2, y / 3.2, 4) * 16 + fbm2(x / 40, y / 40, 9) * 10 + (hn2(x, y, 7) - .5) * 18;
    const v = 128 + n; a[i] = v; a[i + 1] = v; a[i + 2] = v; a[i + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  // fibres
  for (let i = 0; i < 1400; i++) {
    const x = rnd(0, W), y = rnd(0, H), l = rnd(4, 18), an = rnd(0, TAU);
    g.strokeStyle = R() < .5 ? 'rgba(255,255,255,.18)' : 'rgba(0,0,0,.14)'; g.lineWidth = rnd(.4, .9);
    g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(an) * l * .5 + rnd(-3, 3), y + Math.sin(an) * l * .5 + rnd(-3, 3), x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke();
  }
  PAPER = c;
}
function applyPaper(ctx, w, h, al = .22) {
  ctx.save(); ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = al;
  for (let y = 0; y < h; y += H) for (let x = 0; x < w; x += W) ctx.drawImage(PAPER, x, y);
  ctx.restore();
}

// ---------- palettes ----------
const PAL = {
  night: {
    sky: ['#070b17', '#111a31', '#1c2644', '#2a3456'], cloudD: '#0d1325', cloudM: '#18213a', cloudL: '#2c3758', cloudRim: '#46527a',
    mtn: ['#2a3352', '#202943', '#171e34'], mist: '#3a4466', stone: '#2c3247', stoneL: '#3b425a', stoneD: '#1b1f2e', joint: '#0e1019',
    sheen: '#4d5878', torii: '#4b2826', toriiD: '#2b1617', toriiL: '#6a3a33', cedar: '#0b1418', cedarL: '#1b2a2f', moss: '#1f2b28',
    lamp: '#f2b25c', water: '#232a40', rubble: '#30364b'
  },
  moon: {
    sky: ['#0d1428', '#1f2c4e', '#3b4a72', '#5d6a91'], cloudD: '#1a2340', cloudM: '#2d3a60', cloudL: '#5b6893', cloudRim: '#aeb8d8',
    mtn: ['#4a5579', '#353f60', '#252d48'], mist: '#66709a', stone: '#3a4260', stoneL: '#56608a', stoneD: '#232940', joint: '#121524',
    sheen: '#9aa6cc', torii: '#5a3230', toriiD: '#33191a', toriiL: '#8a5048', cedar: '#0f1a20', cedarL: '#2a3c46', moss: '#25332f',
    lamp: '#f2b25c', water: '#2e3756', rubble: '#3c4462'
  }
};
function skyCol(P, t) { const s = P.sky; const k = clamp(t, 0, .999) * (s.length - 1); const i = Math.floor(k); return mixc(s[i], s[i + 1], k - i); }

// ---------- sky ----------
function paintSky(g, w, h, P, o = {}) {
  for (let y = 0; y < h; y += 4) { g.fillStyle = css(skyCol(P, y / h)); g.fillRect(0, y, w, 5); }
  for (let y = -10; y < h; y += 5) for (let x = -40; x < w; x += rnd(30, 60)) {
    brush(g, x, y + rnd(-3, 3), rnd(40, 90), rnd(-.06, .06) + (o.skew || 0), rnd(6, 12), jitc(skyCol(P, y / h), 4));
  }
}
function cloudShape(cx, cy, wd, ht, sd) {
  seed('cl', sd);
  const pts = []; const n = 14;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = cx - wd / 2 + wd * t;
    const env = Math.sin(Math.PI * t);
    pts.push([x + rnd(-8, 8), cy - ht * (.35 + .65 * env) * rnd(.65, 1.15)]);
  }
  pts.push([cx + wd / 2 + 10, cy + ht * .1]);
  for (let i = n; i >= 0; i--) { const x = cx - wd / 2 + wd * i / n; pts.push([x + rnd(-6, 6), cy + ht * rnd(.05, .25)]); }
  return spline(pts, true, 5);
}
function paintCloud(g, cx, cy, wd, ht, P, sd, o = {}) {
  const d = cloudShape(cx, cy, wd, ht, sd);
  const base = o.base || P.cloudM;
  g.save(); poly(g, d); g.fillStyle = css(base); g.fill(); g.clip();
  seed('clp', sd);
  // under-belly dark
  for (let i = 0; i < wd * ht / 260; i++) {
    const x = rnd(cx - wd / 2, cx + wd / 2), y = rnd(cy - ht, cy + ht * .3);
    const k = clamp((y - (cy - ht)) / (ht * 1.3), 0, 1);
    brush(g, x, y, rnd(25, 70), rnd(-.25, .25), rnd(6, 14), jitc(mixc(o.top || P.cloudL, P.cloudD, k), 5));
  }
  // lit rim on top edge (hard edge)
  g.beginPath(); g.rect(-9e3, -9e3, 2e4, 2e4); addPoly(g, d, true, [rnd(-4, 4), ht * .18]);
  g.fillStyle = css(o.rim || P.cloudRim, o.rimA ?? .55); g.fill('evenodd');
  for (let i = 0; i < wd / 6; i++) {
    const p = d[rndi(0, d.length / 2 | 0)];
    brush(g, p[0] - 10, p[1] + rnd(2, 10), rnd(15, 40), rnd(-.4, .4), rnd(3, 7), jitc(o.rim || P.cloudRim, 6));
  }
  g.restore();
}
function paintStorm(g, w, h, P, o = {}) {
  seed('storm', o.sd || 0);
  const sd = (o.sd || 0) * 13 + 2, sc = o.scale || 1;
  const ramp = [P.cloudD, P.cloudM, P.cloudL, P.cloudRim];
  const vAt = (x, y) => fbm2(x / (420 * sc), y / (150 * sc), sd) + .35 * fbm2(x / (120 * sc), y / (60 * sc), sd + 3) + (o.bright || 0) - .15 * (y / h);
  const colAt = v => { const k = clamp((v + .55) / 1.2, 0, .999) * 2.2; const i = Math.min(2, Math.floor(k)); return mixc(ramp[i], ramp[i + 1], k - i); };
  // large masses: flow-field strokes, back to front
  const N = w * h / (o.dense || 220);
  for (let i = 0; i < N; i++) {
    const x = rnd(-60, w + 40), y = rnd(-20, h);
    const v = vAt(x, y); const persp = .45 + .9 * (1 - y / h);
    const ang = .12 * Math.sin(x / 300 + sd) + .35 * vn2(x / 260, y / 140, sd + 8) + (o.skew || 0);
    const sky = skyCol(P, y / h);
    const cov = clamp((v + .25) * 2.2, 0, 1);
    const col = mixc(sky, colAt(v), cov);
    brush(g, x, y, rnd(50, 130) * persp * sc, ang, rnd(10, 26) * persp * sc, jitc(col, 4));
  }
  // lit upper edges of cloud masses
  for (let i = 0; i < N * .35; i++) {
    const x = rnd(-40, w), y = rnd(0, h * .95);
    const a = vAt(x, y - 14 * sc), b = vAt(x, y);
    if (a < .05 && b > .12) {
      const persp = .5 + .8 * (1 - y / h);
      g.globalAlpha = rnd(.35, .8);
      brush(g, x, y, rnd(20, 60) * persp, rnd(-.25, .2), rnd(3, 8) * persp, jitc(mixc(P.cloudL, P.cloudRim, rnd(.2, 1)), 5));
    }
  }
  g.globalAlpha = 1;
  // far rain curtains
  for (let i = 0; i < w / 10; i++) {
    const x = rnd(0, w), y = rnd(h * .25, h);
    dryBrush(g, x, y, rnd(60, 180), 1.72, rnd(4, 16), P.mist, rnd(.05, .12));
  }
  g.globalAlpha = 1;
}

// ---------- mountains ----------
function ridge(w, base, amp, sd, rough = 1) {
  const pts = []; for (let x = -20; x <= w + 20; x += 6) { const n = fbm(x / 260 + sd, sd) * amp + fbm(x / 70 + sd * 3, sd + 1) * amp * .3 * rough + Math.abs(vnoise(x / 30 + sd, sd + 4)) * amp * .08 * rough; pts.push([x, base - n]); }
  return pts;
}
function paintMountains(g, w, P, layers) {
  layers.forEach((L, li) => {
    seed('mtn', li, L.sd);
    const top = ridge(w, L.y, L.amp, L.sd, L.rough ?? 1);
    const d = top.concat([[w + 20, L.y + L.depth], [-20, L.y + L.depth]]);
    g.fillStyle = css(L.c); poly(g, d); g.fill();
    g.save(); poly(g, d); g.clip();
    for (let i = 0; i < w * L.depth / 90; i++) {
      const k = rndi(0, top.length - 2); const p = top[k], q = top[k + 1];
      const sl = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const y = p[1] + rnd(0, L.depth * .9);
      const lit = (q[1] - p[1]) < 0;
      brush(g, p[0] + rnd(-10, 10), y, rnd(14, 40), sl + (lit ? -.9 : .9) + rnd(-.2, .2) + Math.PI * (R() < .5 ? 0 : 0), rnd(2, 6), jitc(lit ? addc(L.c, [14, 15, 22]) : mulc(L.c, .82), 4));
    }
    // ridge light edge
    for (let k = 0; k < top.length - 1; k += 2) { const p = top[k]; if (R() < .55) brush(g, p[0], p[1] + 1.5, rnd(8, 18), rnd(-.3, .3), rnd(1.5, 3), addc(L.c, [22, 24, 34]), { nob: 1 }); }
    // mist at base
    for (let i = 0; i < w / 10; i++) { g.globalAlpha = rnd(.08, .2); brush(g, rnd(-40, w), L.y + L.depth * rnd(.15, .9), rnd(60, 160), rnd(-.03, .03), rnd(6, 16), P.mist, { nob: 1 }); }
    g.globalAlpha = 1; g.restore();
  });
}

// ---------- cedar (sugi) ----------
function paintCedar(g, x, base, ht, P, sd, o = {}) {
  seed('cedar', sd);
  const tw = ht * .045;
  const c = o.c || P.cedar, cl = o.cl || P.cedarL;
  // trunk
  const trunk = [[x - tw, base], [x - tw * .6, base - ht * .55], [x - tw * .25, base - ht], [x + tw * .25, base - ht], [x + tw * .6, base - ht * .55], [x + tw * 1.1, base]];
  fillD(g, spline(trunk, true, 4), mixc(c, '#2a1c1a', .3));
  for (let i = 0; i < 18; i++) brush(g, x + rnd(-tw * .7, tw * .5), base - rnd(0, ht * .6), rnd(20, 60), -Math.PI / 2 + rnd(-.05, .05), rnd(1.5, 3.5), jitc(mixc(c, cl, .4), 5));
  // tiers of drooping foliage
  const tiers = Math.round(ht / 26);
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers; const y = base - ht + ht * .06 + t * ht * .82;
    const half = (ht * .05 + t * ht * .2) * rnd(.75, 1.2) * (o.wide || 1);
    const side = rnd(-1, 1) * half * .2;
    const n = Math.max(6, half / 3 | 0);
    const sil = []; const m = 9;
    for (let k = 0; k <= m; k++) { const u = k / m * 2 - 1; sil.push([x + side + u * half * rnd(.85, 1.05), y + Math.abs(u) * half * .28 + rnd(-4, 6) - (1 - Math.abs(u)) * 10]); }
    for (let k = m; k >= 0; k--) { const u = k / m * 2 - 1; sil.push([x + side + u * half * .8, y + Math.abs(u) * half * .2 + 16 + rnd(0, 8)]); }
    fillD(g, spline(sil, true, 4), mulc(c, .85));
    for (let k = 0; k < n; k++) {
      const u = rnd(-1, 1); const px = x + side + u * half, py = y + Math.abs(u) * half * .25 + rnd(-6, 6);
      const ang = Math.PI / 2 + u * .9 + rnd(-.2, .2);
      brush(g, px - Math.cos(ang) * 10, py - 12, rnd(14, 30), ang, rnd(5, 11), jitc(c, 4), { nob: 0 });
    }
    for (let k = 0; k < n * .5; k++) { const u = rnd(-.9, .9); brush(g, x + side + u * half - 6, y + Math.abs(u) * half * .2 - 8, rnd(8, 18), -.2 + u * .5, rnd(2, 4), jitc(cl, 5)); }
  }
}

// ---------- torii ----------
function paintTorii(g, cx, base, ht, P, o = {}) {
  seed('torii', o.sd || 0);
  const s = ht / 230;
  const pw = 13 * s, gap = 78 * s;
  const C = P.torii, CD = P.toriiD, CL = P.toriiL;
  const pillar = (px, tilt, h) => {
    const top = base - h; const d = shape([[px - pw * 1.1, base], [px - pw * .9 + tilt, top, 1], [px + pw * .9 + tilt, top, 1], [px + pw * 1.1, base, 1]], .5, 4);
    cel(g, d, { f: C, bands: [{ c: CD, off: [pw * .9, 0] }], lw: 1.6 * s + .4, lc: '#160c0e' });
    for (let i = 0; i < 16; i++) brush(g, px + rnd(-pw * .9, pw * .5) + tilt * .5, base - rnd(h * .05, h * .95), rnd(20, 50) * s, -Math.PI / 2 + rnd(-.04, .04), rnd(1.5, 3) * s, jitc(R() < .5 ? CL : CD, 6));
    // rain stain streaks
    for (let i = 0; i < 6; i++) { g.globalAlpha = .3; dryBrush(g, px + rnd(-pw, pw), top + rnd(0, 30), rnd(40, h * .6), Math.PI / 2, 3, P.moss, .5); g.globalAlpha = 1; }
  };
  if (o.broken) {
    pillar(cx - gap, 0, ht * .92);
    pillar(cx + gap, 4 * s, ht * .45);
    // jagged break
    const by = base - ht * .45;
    fillD(g, shape([[cx + gap - pw, by], [cx + gap - pw * .3, by - 10 * s, 1], [cx + gap + pw * .2, by - 3 * s, 1], [cx + gap + pw, by - 14 * s, 1], [cx + gap + pw * 1.1, by + 4 * s]], 0, 3), CL);
    // fallen beam leaning
    const kas = [[cx - gap - 60 * s, base - ht * .95], [cx - gap - 20 * s, base - ht * 1.0, 1], [cx + gap + 30 * s, base - ht * .4, 1], [cx + gap + 40 * s, base - ht * .33, 1], [cx - gap - 30 * s, base - ht * .86, 1]];
    cel(g, shape(kas, .6, 4), { f: '#24171b', bands: [{ c: '#170f13', off: [0, -8 * s] }], lw: 1.8 * s, lc: '#120a0c' });
    const nuki = [[cx - gap - 30 * s, base - ht * .74], [cx + gap * .3, base - ht * .74, 1], [cx + gap * .5, base - ht * .70, 1], [cx - gap - 30 * s, base - ht * .70, 1]];
    cel(g, shape(nuki, .5, 4), { f: C, bands: [{ c: CD, off: [0, -5 * s] }], lw: 1.4 * s, lc: '#160c0e' });
    return;
  }
  pillar(cx - gap, 0, ht * .92); pillar(cx + gap, 0, ht * .92);
  // nuki
  cel(g, shape([[cx - gap - 34 * s, base - ht * .74], [cx + gap + 34 * s, base - ht * .74, 1], [cx + gap + 34 * s, base - ht * .69, 1], [cx - gap - 34 * s, base - ht * .69, 1]], .4, 4), { f: C, bands: [{ c: CD, off: [0, -5 * s] }], lw: 1.4 * s, lc: '#160c0e' });
  // gakuzuka
  cel(g, shape([[cx - 7 * s, base - ht * .92], [cx + 7 * s, base - ht * .92, 1], [cx + 7 * s, base - ht * .74, 1], [cx - 7 * s, base - ht * .74, 1]], .3, 3), { f: CD, lw: 1.2 * s, lc: '#160c0e' });
  // shimaki + kasagi with upturned ends
  const ky = base - ht * .95;
  cel(g, shape([[cx - gap - 46 * s, ky], [cx + gap + 46 * s, ky, 1], [cx + gap + 44 * s, ky + 9 * s, 1], [cx - gap - 44 * s, ky + 9 * s, 1]], .4, 4), { f: C, bands: [{ c: CD, off: [0, -4 * s] }], lw: 1.4 * s, lc: '#160c0e' });
  const kk = [[cx - gap - 70 * s, ky - 30 * s, 1], [cx - gap - 40 * s, ky - 16 * s], [cx, ky - 12 * s], [cx + gap + 40 * s, ky - 16 * s], [cx + gap + 70 * s, ky - 30 * s, 1], [cx + gap + 66 * s, ky - 18 * s, 1], [cx + gap + 40 * s, ky - 4 * s], [cx, ky - 1 * s], [cx - gap - 40 * s, ky - 4 * s], [cx - gap - 66 * s, ky - 18 * s, 1]];
  cel(g, shape(kk, .5, 4), { f: '#22171b', bands: [{ c: '#3a2a2e', off: [0, 5 * s], inside: false }], lw: 2 * s, lc: '#120a0c' });
}

// ---------- stone lantern (toro) ----------
function paintLantern(g, cx, base, ht, P, o = {}) {
  seed('toro', o.sd || 0);
  const s = ht / 160; const S = P.stone, SD = P.stoneD, SL = P.stoneL;
  const lw = 1.3 * s + .5, lc = '#0d0f17';
  const block = (pts, f = S) => { const d = shape(pts, .5 * s, 3); cel(g, d, { f, bands: [{ c: SD, off: [-6 * s, -2 * s] }], lw, lc }); return d; };
  const tilt = o.tilt || 0;
  const X = (x, y) => [cx + x * s + (base - (base - y * s)) * 0 + tilt * (-y) * s, base - y * s];
  block([X(-26, 0), X(26, 0), X(22, 14), X(-22, 14)]);
  block([X(-17, 14), X(17, 14), X(14, 22), X(-14, 22)]);
  block([X(-8, 22), X(8, 22), X(7, 78), X(-7, 78)]);
  block([X(-22, 78), X(22, 78), X(26, 90), X(-26, 90)]);
  // fire box
  const fb = [X(-17, 90), X(17, 90), X(17, 122), X(-17, 122)];
  block(fb);
  const win = shape([X(-8, 96), X(8, 96), X(8, 116), X(-8, 116)], .4 * s, 3);
  fillD(g, win, o.lit ? P.lamp : '#090a10');
  if (o.lit) { fillD(g, shape([X(-5, 97), X(5, 97), X(4, 108), X(-4, 108)], .3, 3), '#ffe3a6'); }
  ink(g, win, { dense: true, closed: true, w: 1.1 * s, c: lc });
  // roof with curled corners
  const roof = [X(-12, 122), X(12, 122), X(40, 130, 1), X(46, 138, 1), X(36, 136), X(0, 146), X(-36, 136), X(-46, 138, 1), X(-40, 130, 1)];
  const rd = shape(roof, .5 * s, 3);
  cel(g, rd, { f: S, bands: [{ c: SL, off: [0, 4 * s] }], lw, lc });
  const top = shape([X(-6, 145), X(6, 145), X(7, 152), X(0, 162, 1), X(-7, 152)], .4, 3);
  cel(g, top, { f: S, bands: [{ c: SD, off: [-3 * s, 0] }], lw, lc });
  // moss & stone strokes
  for (let i = 0; i < 40; i++) { const y = rnd(0, 150); brush(g, cx + rnd(-20, 16) * s, base - y * s, rnd(4, 10) * s, rnd(-.4, .4), rnd(1, 2.4) * s, jitc(R() < .4 ? P.moss : SL, 6)); }
  return { win: X(0, 106), s };
}

// ---------- ground: flooded stone pavement in perspective ----------
function paintPavement(g, w, h, P, o) {
  const hz = o.hz, vx = o.vx;
  seed('pave', o.sd || 0);
  g.fillStyle = css(P.joint); g.fillRect(0, hz, w, h - hz);
  // rows
  let z = 1; const rows = [];
  let y = hz + 2;
  while (y < h + 40) { const ny = y + Math.max(3, (y - hz) * (o.rowK || .22) * rnd(.85, 1.15)); rows.push([y, ny]); y = ny; }
  for (const [y0, y1] of rows) {
    const k = (y0 - hz) / (h - hz);
    const sw = (40 + 380 * k) * (o.slab || 1);
    let x = -rnd(0, sw);
    while (x < w + sw) {
      const ww = sw * rnd(.6, 1.4);
      // converge sides to the vanishing point
      const f0 = (y0 - hz), f1 = (y1 - hz);
      const xa = vx + (x - vx) * (f0 / Math.max(1, f1)), xb = vx + (x + ww - vx) * (f0 / Math.max(1, f1));
      const gap = .8 + k * 2.6;
      const quad = [[xa + gap, y0 + gap * .5], [xb - gap, y0 + gap * .5], [x + ww - gap, y1 - gap * .5], [x + gap, y1 - gap * .5]];
      const base = jitc(mixc(mixc(P.stone, P.stoneD, rnd(0, .7)), skyCol(P, .9), rnd(0, .25)), 6);
      fillD(g, jit(quad, gap * .4), base);
      // wet surface strokes
      const nstk = 2 + (ww * (y1 - y0) / 900 | 0);
      g.save(); poly(g, quad); g.clip();
      for (let i = 0; i < Math.min(nstk, 30); i++) brush(g, rnd(x, x + ww), rnd(y0, y1), rnd(10, 40) * (.3 + k), rnd(-.05, .05), rnd(1.5, 4) * (.4 + k), jitc(R() < .5 ? P.stoneL : P.stoneD, 5));
      g.restore();
      x += ww;
    }
    g.globalAlpha = .9; g.fillStyle = css(P.joint); g.fillRect(0, y1 - 1 - k * 1.5, w, 1 + k * 2); g.globalAlpha = 1;
  }
  // puddles
  for (let i = 0; i < (o.puddles || 14); i++) {
    const py = hz + Math.pow(rnd(.05, 1), 1.3) * (h - hz);
    const k = (py - hz) / (h - hz);
    const pw = rnd(60, 260) * (.2 + k * 1.2), ph = pw * (.05 + k * .14);
    const px = rnd(0, w);
    const pts = []; for (let a = 0; a < 12; a++) { const an = a / 12 * TAU; pts.push([px + Math.cos(an) * pw * rnd(.7, 1.1), py + Math.sin(an) * ph * rnd(.7, 1.1)]); }
    const d = spline(pts, true, 4);
    fillD(g, d, mixc(P.water, skyCol(P, .8), .5));
    g.save(); poly(g, d); g.clip();
    for (let j = 0; j < 8 + pw / 8; j++) brush(g, rnd(px - pw, px + pw), rnd(py - ph, py + ph), rnd(10, 50) * (.3 + k), rnd(-.03, .03), rnd(1, 3) * (.3 + k), jitc(R() < .6 ? P.sheen : skyCol(P, .6), 6), { nob: 1 });
    g.restore();
    ink(g, d.slice(d.length / 2 | 0), { dense: true, w: 1 + k * 1.5, c: P.joint, a: .7 });
  }
}
// reflect everything above hz into the flooded ground, broken into ripples
function reflect(g, w, h, hz, al = .32, P) {
  const tmp = mkCanvas(w, h), t = tmp.getContext('2d');
  t.save(); t.translate(0, hz * 2); t.scale(1, -1); t.drawImage(g.canvas, 0, 0); t.restore();
  const mk = mkCanvas(w, h), m = mk.getContext('2d');
  seed('refl', hz);
  for (let y = hz; y < h; y += rnd(2, 6)) {
    const k = (y - hz) / (h - hz);
    m.fillStyle = `rgba(0,0,0,${(1 - k) * .9 + .1})`;
    for (let x = -50; x < w; x += rnd(30, 120)) m.fillRect(x + rnd(-10, 10), y, rnd(25, 100), rnd(1, 4) * (1 + k * 2));
  }
  t.globalCompositeOperation = 'destination-in'; t.drawImage(mk, 0, 0);
  t.globalCompositeOperation = 'source-over';
  g.save(); g.beginPath(); g.rect(0, hz, w, h - hz); g.clip(); g.globalAlpha = al; g.drawImage(tmp, 0, 0); g.restore();
}
function paintLampSheen(g, x, hz, y1, w0, col, al = .35) {
  for (let y = hz; y < y1; y += rnd(2, 5)) { const k = (y - hz) / (y1 - hz); g.globalAlpha = al * (1 - k) * rnd(.3, 1); brush(g, x + rnd(-w0, w0) * (1 + k), y, rnd(6, 26), rnd(-.05, .05), rnd(1.5, 3), col, { nob: 1 }); }
  g.globalAlpha = 1;
}
function paintRubble(g, cx, cy, sz, P, sd, n = 6) {
  seed('rub', sd);
  for (let i = 0; i < n; i++) {
    const x = cx + rnd(-sz, sz), y = cy + rnd(-sz * .2, sz * .2), r = rnd(.15, .45) * sz;
    const pts = []; const m = rndi(5, 7); for (let a = 0; a < m; a++) { const an = a / m * TAU + rnd(-.3, .3); pts.push([x + Math.cos(an) * r * rnd(.7, 1.2), y + Math.sin(an) * r * .6 * rnd(.7, 1.2), 1]); }
    const d = spline(pts, true, 3);
    cel(g, d, { f: jitc(P.rubble, 6), bands: [{ c: P.stoneD, off: [-r * .25, -r * .3] }, { c: P.stoneL, off: [r * .2, r * .25] }], lw: 1.2, lc: P.joint });
  }
}
