// ===================================================================
//  CHARACTERS — one construction model per character, redrawn every
//  drawing from a skeleton key (never a transformed cut-out)
// ===================================================================
// A: blond spiky-haired brawler, faded orange jacket, cloth headband
// B: black-haired swordsman, indigo high-collar shirt, rope belt, tantō
const CH = {
  A: {
    id: 'A', skin: ['#f0c39a', '#c88a68'], hair: ['#eec54c', '#b7832a'], hairLine: '#4a2c10',
    top: ['#d77a33', '#9a4a1f'], yoke: ['#34333d', '#1f1e26'], pants: ['#3a3b47', '#25252f'],
    wrap: ['#d9d1bc', '#a39b88'], shoe: ['#2b2a33', '#18171e'], band: ['#7a2828', '#4a1616'],
    eye: '#3b78bb', eyeD: '#1d3d66', mouth: '#4a1c1e', brow: '#8a5a1e'
  },
  B: {
    id: 'B', skin: ['#ead3bd', '#b9998a'], hair: ['#252a40', '#13151f'], hairLine: '#08090f',
    top: ['#30385c', '#1c2039'], yoke: ['#30385c', '#1c2039'], pants: ['#4b4b59', '#30303c'],
    wrap: ['#d0c9b7', '#9b9483'], shoe: ['#26252c', '#141318'], rope: ['#ddd5c0', '#a59d88'],
    blade: ['#b9c1d2', '#7b8399'], hilt: ['#25222b', '#121116'],
    eye: '#2e2a3d', eyeD: '#141220', mouth: '#4a1c22', brow: '#141522'
  }
};
// lighting "colour models" (as on a night-scene colour key sheet)
const LM = {
  day: { mul: [1, 1, 1], add: [0, 0, 0], sh: 1, hl: '#7a6a8a', lc: INK },
  night: { mul: [.47, .53, .74], add: [6, 9, 22], sh: .9, hl: '#5a6c9c', lc: '#1a1220' },
  flash: { mul: [.78, .84, 1.0], add: [26, 30, 44], sh: .5, hl: '#8fa4d8', lc: '#140e18' },
  fire: { mul: [.66, .52, .44], add: [34, 14, 2], sh: .82, hl: '#d86a3a', lc: '#24120e' },
  elec: { mul: [.5, .54, .8], add: [14, 16, 46], sh: .85, hl: '#7f8fe0', lc: '#140f22' },
  moon: { mul: [.6, .66, .86], add: [12, 15, 30], sh: .86, hl: '#7d8cc0', lc: '#181424' },
  sil: { mul: [.1, .11, .17], add: [3, 4, 10], sh: 1, hl: '#2a3050', lc: '#07060b' }
};
const _palc = {};
function lp(pair, lm) { // lit material: [base, shade, deep]
  const k = pair[0] + pair[1] + lm; if (_palc[k]) return _palc[k];
  const L = LM[lm];
  const f = c => { const C = hx(c); return [C[0] * L.mul[0] + L.add[0], C[1] * L.mul[1] + L.add[1], C[2] * L.mul[2] + L.add[2]]; };
  const b = f(pair[0]), s = mulc(f(pair[1]), L.sh);
  return (_palc[k] = [b, s, mulc(s, .72)]);
}
function lc1(c, lm) { const L = LM[lm], C = hx(c); return [C[0] * L.mul[0] + L.add[0], C[1] * L.mul[1] + L.add[1], C[2] * L.mul[2] + L.add[2]]; }

// ---------- skeleton ----------
const BN = { sp: 94, nk: 10, ua: 50, fa: 46, th: 72, sh: 69, hr: 23 };
function pose(o) { return Object.assign({ x: 0, y: -143, lean: 0, hd: 0, tw: .2, a1: [8, 12], a2: [-8, 14], l1: [4, 6], l2: [-6, 8], h1: 'fist', h2: 'fist' }, o); }
function fk(p) {
  const pv = [p.x, p.y], La = p.lean * D2R, sp = [Math.sin(La), -Math.cos(La)], pr = [-sp[1], sp[0]];
  const at = (o, u, v) => [o[0] + sp[0] * u + pr[0] * v, o[1] + sp[1] * u + pr[1] * v];
  const nk = at(pv, BN.sp, 0);
  const HL = (p.lean + p.hd) * D2R;
  const hd = [nk[0] + Math.sin(HL) * (BN.nk + BN.hr * .8), nk[1] - Math.cos(HL) * (BN.nk + BN.hr * .8)];
  const sw = 20 * p.tw + 4, hw = 10 * p.tw + 2.5;
  const s1 = at(nk, -8, -sw), s2 = at(nk, -8, sw), h1 = at(pv, 0, -hw), h2 = at(pv, 0, hw);
  const arm = (s, a) => { const e = add2(s, dirv(a[0] * D2R), BN.ua); const w = add2(e, dirv((a[0] + a[1]) * D2R), BN.fa); const ha = (a[0] + a[1] + (a[2] || 0)) * D2R; return { s, e, w, h: add2(w, dirv(ha), 8), ha }; };
  const leg = (h, l) => { const k = add2(h, dirv(l[0] * D2R), BN.th); const sa = (l[0] - l[1]) * D2R; const a = add2(k, dirv(sa), BN.sh); const fa = sa + (90 + (l[2] || 0)) * D2R; return { h, k, a, toe: add2(a, dirv(fa), 21), heel: add2(a, dirv(fa), -6), fa }; };
  return { pv, nk, hd, sp, pr, at, A1: arm(s1, p.a1), A2: arm(s2, p.a2), L1: leg(h1, p.l1), L2: leg(h2, p.l2) };
}
function lerpPose(a, b, t) {
  const o = Object.assign({}, t < .5 ? a : b);
  for (const k of ['x', 'y', 'lean', 'hd', 'tw', 'yaw']) if (typeof a[k] === 'number' && typeof b[k] === 'number') o[k] = lerp(a[k], b[k], t);
  for (const k of ['a1', 'a2', 'l1', 'l2']) if (a[k] && b[k]) o[k] = a[k].map((v, i) => lerp(v, b[k][i] ?? 0, t));
  for (const k of ['w1', 'w2']) if (typeof a[k] === 'number' && typeof b[k] === 'number') o[k] = lerp(a[k], b[k], t);
  return o;
}

// ---------- head construction (model-sheet turnaround keys, unit radius) ----------
const HK = {
  f: [[0, -.98], [.64, -.78], [.88, -.25], [.86, .1], [.82, .3], [.72, .52], [.55, .72], [.3, .9], [0, .99], [-.3, .9], [-.62, .65], [-.84, .25], [-.88, -.25], [-.64, -.78]],
  q: [[.02, -.98], [.64, -.74], [.84, -.18], [.8, .12], [.85, .3], [.77, .52], [.68, .68], [.55, .84], [.4, .97], [.16, .92], [-.42, .6], [-.66, .25], [-.9, -.2], [-.66, -.8]],
  p: [[-.05, -.98], [.66, -.68], [.86, -.06], [.8, .18], [1.03, .47], [.86, .56], [.88, .68], [.82, .8], [.82, .95], [.45, .98], [-.1, .62], [-.42, .4], [-.96, -.1], [-.72, -.76]]
};
const HKC = { f: [8], q: [4, 8, 10], p: [4, 5, 8, 10] };
for (const k in HK) HK[k] = HK[k].map(p => [p[0], p[1] > 0 ? p[1] * 1.13 : p[1]]);
function headContour(yaw) {
  const [a, b, t, ck] = yaw < .5 ? [HK.f, HK.q, yaw / .5, yaw < .25 ? 'f' : 'q'] : [HK.q, HK.p, (yaw - .5) / .5, yaw < .75 ? 'q' : 'p'];
  return a.map((p, i) => { const q = [lerp(p[0], b[i][0], t), lerp(p[1], b[i][1], t)]; if (HKC[ck].includes(i)) q[2] = 1; return q; });
}
// front-of-face depth profile used to place midline features
function profX(y) { const P = HK.p; for (let i = 2; i < 9; i++) { if (y <= P[i + 1][1]) { const t = (y - P[i][1]) / (P[i + 1][1] - P[i][1]); return lerp(P[i][0], P[i + 1][0], clamp(t, 0, 1)); } } return .8; }

// head: o = {x,y,r,f,yaw,tilt,ex,lm,L:[lx,ly] screen dir to key light, rim:{d:[x,y],c,lc,k}, det}
function drawHead(ctx, C, o) {
  const r = o.r, f = o.f || 1, yaw = clamp(o.yaw ?? .55, 0, 1), phi = yaw * Math.PI / 2, T = o.tilt || 0;
  const cT = Math.cos(T), sT = Math.sin(T);
  const M = (x, y) => { const X = x * cT - y * sT, Y = x * sT + y * cT; return [o.x + f * X * r, o.y + Y * r]; };
  const Mp = pts => pts.map(p => { const q = M(p[0], p[1]); if (p[2]) q[2] = 1; return q; });
  const lm = o.lm || 'night', L = LM[lm], ex = Object.assign({ brow: 0, eye: 1, look: [0, 0], mouth: 'closed', mo: 0 }, o.ex || {});
  const sk = lp(C.skin, lm), hr = lp(C.hair, lm);
  const lw = clamp(r * .052, 1, 4.6), lwi = lw * .62, jt = Math.min(1.2, r * .012);
  const Ld = o.L || [-.6, -.8];
  const shOff = (k) => [Ld[0] * k * r, Ld[1] * k * r];
  const rimB = (d, k) => o.rim ? { c: o.rim.c, off: [-o.rim.d[0] * (o.rim.k || k) * r, -o.rim.d[1] * (o.rim.k || k) * r] } : null;
  const vis = lon => Math.cos(lon + phi);
  const fx = (lon, y, rw = .74) => Math.sin(lon + phi) * rw + Math.sin(phi) * .1;
  const det = o.det ?? (r > 16 ? 2 : r > 8 ? 1 : 0);

  // ----- back layer: headband tails, back hair -----
  if (C.id === 'A') {
    const ph = o.wind ?? 0;
    for (let k = 0; k < 2; k++) {
      const base = [-.86 + .25 * yaw, -.42];
      const pts = [];
      for (let i = 0; i <= 5; i++) {
        const t = i / 5; const wv = Math.sin(ph * 1.7 + t * 4 + k * 1.3) * (.18 + t * .25);
        pts.push([base[0] - t * (1.05 + k * .3) - yaw * t * .2, base[1] + t * (.45 + k * .25) + wv]);
      }
      const ribPts = Mp(pts);
      const d = ribbon(ribPts, [[.13 * r, .13 * r], [.12 * r, .1 * r], [.09 * r, .08 * r]], { capE: .2 });
      const bc = lp(C.band, lm);
      cel(ctx, d, { f: bc[0], bands: [{ c: bc[1], off: shOff(.08) }], lw: lw * .8, lc: L.lc });
    }
  }
  const hairBack = HAIR[C.id].back(yaw, o.wind || 0);
  {
    const d = shape(Mp(hairBack), jt, 3);
    cel(ctx, d, { f: hr[0], bands: [{ c: hr[1], off: shOff(.16), lc: L.hl, lw: lwi * .7 }, rimB(d, .08)], lw, lc: C.id === 'A' ? mulc(lc1(C.hairLine, lm), 1) : L.lc });
  }
  // ----- face -----
  const fc = shape(Mp(headContour(yaw)), jt, 3);
  const capPts = HAIR[C.id].cap(yaw, o.wind || 0);
  const cap = shape(Mp(capPts.pts), jt, 3);
  const hairShadow = cap.map(p => [p[0] + Ld[0] * -.05 * r * f, p[1] + .13 * r]);
  cel(ctx, fc, { f: sk[0], bands: [{ c: sk[1], off: shOff(.2), lc: L.hl, lw: lwi * .7 }, { c: sk[1], shape: hairShadow, inside: true }, rimB(fc, .07)], lw, lc: L.lc });
  // ear
  for (const lon of [-1.5708, 1.5708]) {
    const v = vis(lon); if (v < -.2) continue;
    const ex0 = Math.sin(lon + phi) * .8, sg = lon < 0 ? -1 : 1, wf = 1 - Math.abs(Math.sin(lon + phi)) * .55;
    const ep = Mp([[ex0 + sg * .01, .04], [ex0 + sg * .12 * wf, -.01], [ex0 + sg * .18 * wf, .16], [ex0 + sg * .12 * wf, .38], [ex0 - sg * .02, .46]]);
    const ed = shape(ep, jt * .5, 2);
    cel(ctx, ed, { f: sk[0], bands: [{ c: sk[1], off: [-f * sg * .05 * r, 0] }], lw: lwi, lc: L.lc });
    if (det > 1) ink(ctx, Mp([[ex0 + sg * .1 * wf, .08], [ex0 + sg * .11 * wf, .26], [ex0 + sg * .03, .34]]), { w: lwi * .7, c: L.lc });
  }
  // ----- features -----
  if (det > 0) {
    const ec = lc1(C.eye, lm), ew0 = lc1('#f3efe6', lm);
    const eyeY = .17;
    for (const lon of [-.52, .52]) {
      const v = vis(lon); if (v < .08) continue;
      const fore = .3 + .7 * v;
      const cx = fx(lon, eyeY), sg = lon < 0 ? -1 : 1; // outer corner direction
      const ew = .2 * fore, eh = .095 * clamp(ex.eye, 0, 1.3);
      const xin = cx - sg * ew, xout = cx + sg * ew * 1.05;
      const browY = eyeY - .19 - ex.brow * .03;
      // eye white + iris
      if (ex.eye > .08 && det > 1) {
        const lidTop = eyeY - eh * (B_EYE(C) ? .8 : 1);
        const almond = Mp([[xin, eyeY + .01, 1], [lerp(xin, xout, .35), lidTop], [xout, eyeY - eh * .15, 1], [lerp(xin, xout, .6), eyeY + eh * .75]]);
        const ad = shape(almond, 0, 2);
        fillD(ctx, ad, ew0);
        ctx.save(); poly(ctx, ad); ctx.clip();
        const ix = cx + ex.look[0] * .06 * fore - sg * .01, iy = eyeY + ex.look[1] * .04 + .005;
        const iw = .072 * fore, ih = .1;
        const ir = []; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ir.push([ix + Math.cos(a) * iw, iy + Math.sin(a) * ih]); }
        const id = shape(Mp(ir), 0, 2);
        cel(ctx, id, { f: ec, bands: [{ c: lc1(C.eyeD, lm), shape: Mp([[ix - .2, iy - .3], [ix + .2, iy - .3], [ix + .2, iy - .02], [ix - .2, iy - .04]]).map(p => p), inside: true }], lw: lwi * .6, lc: L.lc });
        const pp = []; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; pp.push([ix + Math.cos(a) * iw * .42, iy + .01 + Math.sin(a) * ih * .45]); }
        fillD(ctx, shape(Mp(pp), 0, 2), lc1(C.eyeD, lm));
        if (o.glint !== false) { const gp = []; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; gp.push([ix - sg * iw * .35 + Math.cos(a) * .018, iy - .035 + Math.sin(a) * .022]); } fillD(ctx, shape(Mp(gp), 0, 2), o.glintC || '#f4f1ea'); }
        // upper-lid shadow on the white
        fillD(ctx, shape(Mp([[xin - .05, lidTop - .1], [xout + .05, lidTop - .1], [xout + .05, eyeY - eh * .2], [xin - .05, eyeY - eh * .45]]), 0, 3), mixc(ew0, sk[1], .55), .7);
        ctx.restore();
        // upper lid line (heavy), lash flick, lower lid
        ink(ctx, Mp([[xin - sg * .01, eyeY + .015], [lerp(xin, xout, .35), lidTop - .005], [xout, eyeY - eh * .15], [xout + sg * .04, eyeY + .01]]), { w: lw * 1.05, c: L.lc, t0: .25, t1: .2, sv: .2 });
        ink(ctx, Mp([[lerp(xin, xout, .45), eyeY + eh * .8], [xout - sg * .01, eyeY + eh * .35]]), { w: lwi * .7, c: L.lc });
        if (det > 1 && r > 30) ink(ctx, Mp([[lerp(xin, xout, .55), eyeY + eh + .05], [xout + sg * .01, eyeY + eh * .6 + .03]]), { w: lwi * .45, c: L.lc });
        if (det > 1 && r > 40) ink(ctx, Mp([[lerp(xin, xout, .2), lidTop - .05], [lerp(xin, xout, .7), lidTop - .07], [xout + sg * .02, eyeY - eh * .5]]), { w: lwi * .5, c: L.lc });
      } else {
        // closed / tiny eye: single stroke
        ink(ctx, Mp([[xin, eyeY], [lerp(xin, xout, .5), eyeY - (ex.eye > .08 ? .03 : -.02)], [xout, eyeY + .01]]), { w: lw * .9, c: L.lc });
      }
      // brow
      const bIn = [cx - sg * ew * 1.1, browY + .03 - ex.brow * .07], bOut = [cx + sg * ew * 1.25, browY - .02 + ex.brow * .03];
      if (C.id === 'A') ink(ctx, Mp([bIn, [lerp(bIn[0], bOut[0], .5), browY - .03], bOut]), { w: lw * 1.5, c: mulc(lc1(C.brow, lm), .8), t0: .1, t1: .5 });
      else ink(ctx, Mp([bIn, [lerp(bIn[0], bOut[0], .5), browY - .025], bOut]), { w: lw * .9, c: L.lc, t0: .1, t1: .6 });
      if (ex.brow < -.4 && det > 1 && sg < 0 && yaw < .7) ink(ctx, Mp([[cx - sg * ew * 1.5, browY + .02], [cx - sg * ew * 1.35, browY + .1]]), { w: lwi * .6, c: L.lc });
    }
    // nose
    const nx = Math.sin(phi) * profX(.53) * .95, nbx = Math.sin(phi) * profX(.25) * .9;
    if (yaw > .15) {
      ink(ctx, Mp([[nbx - .02, .28], [nx, .53], [nx - .1 * Math.sin(phi) - .02, .6]]), { w: lwi, c: L.lc, t0: .6, t1: .3 });
      if (det > 1) fillD(ctx, shape(Mp([[nx - .02, .55], [nx - .16 * Math.sin(phi) - .02, .61], [nx - .03, .61]]), 0, 2), sk[1]);
    } else ink(ctx, Mp([[-.03, .56], [.03, .58]]), { w: lwi, c: L.lc });
    // mouth
    drawMouth(ctx, C, ex, phi, Mp, lw, lwi, sk, L, lm, r);
    // face marks: blood, scratches
    if (o.blood) for (const b of o.blood) {
      const bd = b.map(p => [Math.sin((p[0]) + phi) * .8 + Math.sin(phi) * .12 * (1 - Math.abs(p[0])), p[1]]);
      ink(ctx, Mp(bd), { w: lw * 1.2, c: lc1('#7a1018', lm), t0: .15, t1: .5, sv: .5 });
    }
    if (o.cut) { const cx = fx(-.95, .45, .8); ink(ctx, Mp([[cx - .1, .38], [cx + .12, .5]]), { w: lw * .8, c: lc1('#8a1820', lm) }); }
  }
  // ----- front hair cap + bangs (no outline across the crown) -----
  {
    ctx.save(); poly(ctx, cap); ctx.fillStyle = css(hr[0]); ctx.fill(); ctx.clip();
    ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); addPoly(ctx, cap, true, shOff(.14)); ctx.fillStyle = css(hr[1]); ctx.fill('evenodd');
    ink(ctx, cap.map(p => [p[0] + Ld[0] * .14 * r, p[1] + Ld[1] * .14 * r]), { dense: true, closed: true, w: lwi * .7, c: L.hl });
    if (o.rim) { ctx.beginPath(); ctx.rect(-4000, -4000, 9000, 9000); addPoly(ctx, cap, true, [-o.rim.d[0] * .07 * r, -o.rim.d[1] * .07 * r]); ctx.fillStyle = css(o.rim.c); ctx.fill('evenodd'); }
    // strand lines
    if (det > 1) for (const s of capPts.strands || []) ink(ctx, Mp(s), { w: lwi * .7, c: C.id === 'A' ? lc1(C.hairLine, lm) : L.lc });
    ctx.restore();
    const n = cap.length, i0 = Math.floor(n * capPts.edge[0]), i1 = Math.floor(n * capPts.edge[1]);
    ink(ctx, cap.slice(i0, i1), { dense: true, w: lw, c: C.id === 'A' ? lc1(C.hairLine, lm) : L.lc, t0: .05, t1: .05 });
  }
  if (C.id === 'A') drawHeadband(ctx, C, yaw, phi, Mp, lw, lwi, lm, L, shOff, o);
}
function B_EYE(C) { return C.id === 'B'; }
function drawMouth(ctx, C, ex, phi, Mp, lw, lwi, sk, L, lm, r) {
  const mx = Math.sin(phi) * profX(.77) * .92, my = .78;
  const fw = .2 * (1 - Math.sin(phi) * .55);
  const m = ex.mouth;
  if (m === 'closed' || m === 'smirk') {
    const sm = m === 'smirk' ? .03 : 0;
    ink(ctx, Mp([[mx - fw * 1.1, my + .01], [mx, my + .015], [mx + fw * .5, my - sm]]), { w: lwi * 1.1, c: L.lc, t0: .4, t1: .4 });
    return;
  }
  const o = (m === 'shout' ? .22 : m === 'open' ? .12 : .06) * (ex.mo || 1);
  const pts = [[mx - fw * 1.1, my, 1], [mx - fw * .3, my - .02], [mx + fw * .7, my - .01, 1], [mx + fw * .5, my + o * .7], [mx - fw * .3, my + o]];
  const d = shape(Mp(pts), 0, 2);
  fillD(ctx, d, lc1(C.mouth, lm));
  ctx.save(); poly(ctx, d); ctx.clip();
  // teeth
  const tw = lc1('#efeae0', lm);
  if (m === 'grit') { fillD(ctx, shape(Mp([[mx - fw * 1.2, my - .05], [mx + fw, my - .05], [mx + fw, my + o * .9], [mx - fw * 1.2, my + o * .9]]), 0, 2), tw); ink(ctx, Mp([[mx - fw * 1.1, my + o * .45], [mx + fw * .8, my + o * .4]]), { w: lwi * .6, c: L.lc }); }
  else { fillD(ctx, shape(Mp([[mx - fw * 1.2, my - .05], [mx + fw, my - .05], [mx + fw, my + .035], [mx - fw * 1.2, my + .03]]), 0, 2), tw); }
  ctx.restore();
  ink(ctx, d, { dense: true, closed: true, w: lwi * 1.1, c: L.lc });
}
function drawHeadband(ctx, C, yaw, phi, Mp, lw, lwi, lm, L, shOff, o) {
  const top = [], bot = [];
  const y0 = -.54, y1 = -.33;
  for (let i = 0; i <= 14; i++) {
    const lon = -1.75 + i / 14 * 3.5; if (Math.cos(lon + phi) < -.02) continue;
    const s = Math.sin(lon + phi);
    const rr = s > 0 ? lerp(1.0, .9, Math.sin(phi)) : 1.0; top.push([s * rr + Math.sin(phi) * .03, y0 + Math.abs(s) * .06]); bot.push([s * rr * .99 + Math.sin(phi) * .03, y1 + Math.abs(s) * .06]);
  }
  if (top.length < 2) return;
  const pts = top.concat(bot.reverse());
  const d = shape(Mp(pts), .5, 2);
  const bc = lp(C.band, lm);
  cel(ctx, d, { f: bc[0], bands: [{ c: bc[1], off: shOff(.06) }], lw: lw * .9, lc: L.lc });
  // a few wrinkle lines
  ink(ctx, Mp([[Math.sin(phi) * .3, y0 + .05], [Math.sin(phi) * .5, y1 - .04]]), { w: lwi * .5, c: L.lc });
}
// ---------- hair designs ----------
function polarPt(th, rr) { return [Math.sin(th) * rr, -Math.cos(th) * rr]; }
const HAIR = {
  A: {
    back(yaw, wind) {
      // spiky crown, sweeps back as head turns
      const S = [[-124, .36], [-101, .55], [-80, .4], [-58, .62], [-33, .48], [-12, .66], [14, .44], [36, .52], [62, .34], [86, .4], [112, .22]];
      const pts = [], sw = -yaw * 38 - 9;
      for (let i = 0; i < S.length; i++) {
        const [th0, ln] = S[i]; const th = (th0 * (1 - .18 * yaw) + sw) * D2R;
        const L = ln * (1 + (th0 < 0 ? yaw * .25 : -yaw * .35)) + Math.sin(wind * 2 + i) * .02;
        const thV = th - 11 * D2R;
        pts.push(polarPt(thV, 1.08)); const tp = polarPt(th + (th0 < 0 ? -.12 : .05) * (1 + yaw), 1 + L); tp[2] = 1; pts.push(tp);
      }
      pts.push(polarPt((S[S.length - 1][0] * (1 - .18 * yaw) + sw + 10) * D2R, 1.05));
      pts.push([0, .2]);
      return pts;
    },
    cap(yaw, wind) {
      const phi = yaw * Math.PI / 2;
      const pts = [];
      // bangs across forehead (projected by longitude)
      const B = [[-1.45, -.24], [-1.05, -.14], [-.64, -.08], [-.24, -.05], [.16, -.1], [.56, -.07], [.96, -.16], [1.35, -.26]];
      const vis = B.filter(b => Math.cos(b[0] + phi) > .12);
      const backTh = (-112 - yaw * 30) * D2R;
      const bk = polarPt(backTh, 1.0); bk[1] = Math.max(bk[1], -.1);
      pts.push([bk[0], bk[1] + .12]);
      for (let i = 0; i < vis.length; i++) {
        const [lon, ty] = vis[i]; const s = Math.sin(lon + phi), sn = Math.sin(lon + .22 + phi);
        const vx = s * .93 + Math.sin(phi) * .06;
        pts.push([vx - .07, -.42]); const tp = [vx + .04 * Math.sin(phi) + .02, ty + .1 + Math.sin(wind * 3 + i) * .01, 1]; pts.push(tp);
      }
      const fr = [lerp(.87, .9, yaw), -.3]; pts.push(fr);
      const frTh = Math.atan2(fr[0], -fr[1]);
      for (let a = frTh; a > backTh; a -= .18) pts.push(polarPt(a, 1.05));
      return { pts, edge: [0, .55], strands: [] };
    }
  },
  B: {
    back(yaw, wind) {
      const S = [[-142, .4], [-122, .5], [-101, .55], [-79, .46], [-56, .4], [-32, .3], [-8, .24], [17, .2], [43, .17], [68, .15]];
      const pts = [], sw = -yaw * 28;
      for (let i = 0; i < S.length; i++) {
        const [th0, ln] = S[i]; const th = (th0 * (1 - .1 * yaw) + sw) * D2R;
        const L = ln * (1 + yaw * .35 * (th0 < -40 ? 1 : 0)) + Math.sin(wind * 2 + i * 1.3) * .03;
        pts.push(polarPt(th - 9 * D2R, 1.06)); const tp = polarPt(th - .35 - yaw * .2, 1 + L); tp[2] = 1; pts.push(tp);
      }
      pts.push(polarPt((70 + sw + 14) * D2R, 1.04)); pts.push([0, .3]);
      return pts;
    },
    cap(yaw, wind) {
      const phi = yaw * Math.PI / 2;
      const pts = [];
      // long side locks frame the face, shorter centre bangs
      const B = [[-1.62, .55], [-1.32, .9], [-.85, .0], [-.45, -.08], [-.1, .2], [.25, -.1], [.62, -.02], [1.25, .88], [1.55, .5]];
      const vis = B.filter(b => Math.cos(b[0] + phi) > .1);
      const backTh = (-118 - yaw * 28) * D2R;
      const bk = polarPt(backTh, 1.0);
      pts.push([bk[0], bk[1] + .2]);
      for (let i = 0; i < vis.length; i++) {
        const [lon, ty] = vis[i]; const s = Math.sin(lon + phi);
        const vx = s * .95 + Math.sin(phi) * .08;
        const wv = Math.sin(wind * 2.3 + i * 1.7) * .03;
        pts.push([vx - .06, -.38 + Math.abs(s) * .1]); const tp = [vx + .03 + wv - Math.sin(phi) * .04 * ty, ty + wv * .5, 1]; pts.push(tp);
      }
      const fr = [lerp(.9, .93, yaw), -.28]; pts.push(fr);
      const frTh = Math.atan2(fr[0], -fr[1]);
      for (let a = frTh; a > backTh; a -= .18) pts.push(polarPt(a, 1.05));
      return { pts, edge: [0, .62], strands: [] };
    }
  }
};

// ---------- hands ----------
function handPts(type) { return handPts0(type).map(q => { const r = [q[0] * 1.2, q[1] * 1.2]; if (q[2]) r[2] = 1; return r; }); }
function handPts0(type) {
  // local frame: u along forearm direction, v sideways; returns control pts
  if (type === 'open') return [[-3, -5], [6, -6], [14, -7, 1], [16, -4], [9, -3], [17, -1, 1], [18, 1.5], [9, 1], [16, 4, 1], [15, 6], [8, 4], [12, 8, 1], [9, 9], [2, 7], [-3, 5]];
  if (type === 'blade') return [[-3, -4.5], [8, -4.5], [17, -3, 1], [18, 0], [17, 3, 1], [8, 4.5], [-3, 4.5]];
  // fist / grip
  return [[-3, -5.5], [5, -6.5], [10, -6, 1], [12.5, -3], [12.5, 3], [10, 6, 1], [3, 6.5], [-3, 5]];
}

// ---------- full figure ----------
// o: {x,y (ground screen), s (scale), f (facing ±1), lm, L, rim, wind, ex, blood, det, sil, paint}
function drawFigure(ctx, C, p, o) {
  const s = o.s, f = o.f || 1, lm = o.lm || 'night', Lm = LM[lm];
  const J = fk(p);
  const M = q => [o.x + f * q[0] * s, o.y + q[1] * s];
  const Ld = o.L || [-.55 * f, -.83];
  const lw = clamp(1.1 + s * 1.4, 1.2, 5.5), lwi = lw * .6, jt = Math.min(.9, .25 + s * .35);
  const pal = k => lp(C[k], lm);
  const bandsFor = (k, w) => {
    const b = [{ c: pal(k)[1], off: [Ld[0] * w * s, Ld[1] * w * s], lc: Lm.hl, lw: lwi * .7 }];
    if (o.rim) b.push({ c: o.rim.c, off: [-o.rim.d[0] * (o.rim.k || 3) * s, -o.rim.d[1] * (o.rim.k || 3) * s], lc: o.rim.lc, lw: lwi * .7 });
    return b;
  };
  const part = (pts, k, w = 5, extra) => { const d = Array.isArray(pts[0]) && pts.dense ? pts : shape(pts, jt, 2.5); cel(ctx, d, Object.assign({ f: pal(k)[0], bands: bandsFor(k, w), lw, lc: Lm.lc, paint: o.paint }, extra || {})); return d; };
  const partD = (d, k, w = 5, extra) => { cel(ctx, d, Object.assign({ f: pal(k)[0], bands: bandsFor(k, w), lw, lc: Lm.lc, paint: o.paint }, extra || {})); return d; };
  const rib = (chain, widths, o2) => ribbon(chain.map(M), widths.map(w => Array.isArray(w) ? [w[0] * s, w[1] * s] : [w * s, w * s]), o2);

  const T = (u, v) => M(J.at(J.nk, -u, v)); // torso local: u down from neck, v forward
  const tw = clamp(p.tw, 0, 1);
  const TS = [[-6, -2], [-15, 6], [-17, 30], [-12, 62], [-15, 90], [-13, 106], [10, 106], [13, 88], [12, 64], [17, 36], [15, 13], [7, -2]];
  const TF = [[-7, -2], [-27, 6], [-21, 32], [-16, 62], [-18, 90], [-16, 106], [16, 106], [18, 90], [16, 62], [21, 32], [27, 6], [7, -2]];
  const torsoPts = TS.map((q, i) => T(lerp(q[1], TF[i][1], tw), lerp(q[0], TF[i][0], tw)));

  const drawArm = (A, near, hand, weapon) => {
    // weapon behind hand
    if (weapon && weapon.behind) drawWeapon(ctx, C, A, weapon, M, s, f, lm, lw, Ld, o);
    const ch = [A.s, A.e, A.w];
    const top = C.id === 'A' ? 'top' : 'skin';
    if (C.id === 'A') {
      partD(rib(ch, [[9, 9], [9.5, 8.5], [7.5, 7], [7.5, 7.5], [6.5, 6]]), 'top', 4);
      // cuff
      const cuff = rib([lerp2(A.e, A.w, .82), A.w], [[6.6, 6.6], [6.4, 6.4]], { capE: .3, capS: .3 });
      partD(cuff, 'yoke', 3);
    } else {
      partD(rib(ch, [[7, 7], [7.5, 6.5], [5.5, 5], [6, 5.5], [4.6, 4.2]]), 'skin', 3);
      const wr = rib([lerp2(A.e, A.w, .25), A.w], [[6.2, 5.8], [4.9, 4.6]], { capE: .3, capS: .3 });
      const wd = partD(wr, 'wrap', 3);
      if (s > .5) for (let k = 1; k < 5; k++) { const a = lerp2(A.e, A.w, .25 + k * .17); const n = norm2([A.w[1] - A.e[1], -(A.w[0] - A.e[0])]); ink(ctx, [M(add2(a, n, 5.5)), M(add2(add2(a, n, -5.5), [A.w[0] - A.e[0], A.w[1] - A.e[1]], .06))], { w: lwi * .6, c: Lm.lc }); }
      // short sleeve
      partD(rib([A.s, lerp2(A.s, A.e, .55)], [[10, 10], [8.5, 8.5]], { capE: .25 }), 'top', 4);
    }
    // hand
    const hp = handPts(hand).map(q => { const a = A.ha; const u = dirv(a), v = [u[1], -u[0]]; return M([A.w[0] + u[0] * q[0] + v[0] * q[1], A.w[1] + u[1] * q[0] + v[1] * q[1]]); }).map((q, i) => { const src = handPts(hand)[i]; if (src[2]) q[2] = 1; return q; });
    const hd = shape(hp, jt * .6, 2);
    partD(hd, 'skin', 2.5);
    if ((hand === 'fist' || hand === 'grip') && s > .55) { const u = dirv(A.ha), v = [u[1], -u[0]]; const P2 = (a, b) => M([A.w[0] + u[0] * a + v[0] * b, A.w[1] + u[1] * a + v[1] * b]); ink(ctx, [P2(7, -5), P2(9, 0), P2(7, 4)], { w: lwi * .7, c: Lm.lc }); }
    if (weapon && !weapon.behind) drawWeapon(ctx, C, A, weapon, M, s, f, lm, lw, Ld, o);
  };
  const drawLeg = (Lg, near) => {
    const ch = [Lg.h, Lg.k, Lg.a];
    partD(rib(ch, [[13, 12.5], [12, 11], [9.5, 9.5], [9.5, 9.5], [8, 7.5]]), 'pants', 6);
    // shin wraps
    const wr = rib([lerp2(Lg.k, Lg.a, .45), Lg.a], [[7.3, 7.3], [5.8, 5.8]], { capE: .2, capS: .2 });
    partD(wr, 'wrap', 3);
    if (s > .5) for (let k = 1; k < 4; k++) { const a = lerp2(Lg.k, Lg.a, .45 + k * .14); const d = norm2([Lg.a[0] - Lg.k[0], Lg.a[1] - Lg.k[1]]); const n = [d[1], -d[0]]; ink(ctx, [M(add2(a, n, 6.5)), M(add2(add2(a, n, -6.5), d, 4))], { w: lwi * .55, c: Lm.lc }); }
    // foot (split-toe sandal/boot)
    const fd = dirv(Lg.fa), fn = [fd[1], -fd[0]];
    const FP = (a, b) => M([Lg.a[0] + fd[0] * a + fn[0] * b, Lg.a[1] + fd[1] * a + fn[1] * b]);
    const ft = [FP(-7, -4), FP(4, -6), FP(15, -4.5), FP(22, -1.5, 1), FP(23, 2.5), FP(19, 4.5, 1), FP(-2, 4.8, 1), FP(-8, 3)];
    ft[3][2] = 1; ft[5][2] = 1; ft[6][2] = 1;
    partD(shape(ft, jt * .5, 2), 'shoe', 2.5);
  };
  const drawTorso = () => {
    const td = shape(torsoPts, jt, 2.5);
    partD(td, 'top', 7);
    ctx.save(); poly(ctx, td); ctx.clip();
    if (C.id === 'A') {
      // dark shoulder yoke
      const yk = [T(-10, -40), T(-10, 40), T(20, 40), T(22, lerp(14, 22, tw)), T(lerp(17, 23, tw), lerp(-15, -25, tw)), T(20, -40)];
      const yd = shape(yk, jt, 3); cel(ctx, yd, { f: pal('yoke')[0], bands: bandsFor('yoke', 5), lw: lwi, lc: Lm.lc });
      // zipper / front edge
      if (tw > .2) ink(ctx, [T(22, lerp(13, 0, tw)), T(60, lerp(11, 0, tw)), T(104, lerp(10, 1, tw))], { w: lwi * .8, c: Lm.lc });
      ink(ctx, [T(70, lerp(-9, -12, tw)), T(78, lerp(-3, -6, tw)), T(74, lerp(4, 6, tw))], { w: lwi * .5, c: Lm.lc });
    } else {
      // rope belt
      const bt = [T(84, -30), T(84, 30), T(94, 30), T(94, -30)];
      const bd = shape(bt.map((q, i) => [q[0], q[1] + (i < 2 ? 0 : 0)]), jt, 3);
      cel(ctx, bd, { f: pal('rope')[0], bands: bandsFor('rope', 2), lw: lwi, lc: Lm.lc });
      if (s > .45) for (let k = -3; k < 4; k++) ink(ctx, [T(85, k * 6 - 2), T(93, k * 6 + 2)], { w: lwi * .5, c: Lm.lc });
      ink(ctx, [T(20, lerp(10, 0, tw)), T(48, lerp(14, 2, tw))], { w: lwi * .6, c: Lm.lc });
    }
    ctx.restore();
    // collar
    const cw = lerp(9, 15, tw);
    if (C.id === 'A') {
      const cl = [T(-6, -cw), T(-3, cw * .9), T(8, cw * .95), T(10, lerp(4, 0, tw)), T(8, -cw)];
      part(cl, 'yoke', 3);
    } else {
      const cl = [T(-12, -cw - 2), T(-10, cw + 1), T(6, cw + 2), T(8, -cw - 1)];
      part(cl, 'top', 3);
    }
  };
  const drawNeck = () => {
    const hc = M(J.hd); const nb = T(2, lerp(1, 0, tw)); const r = BN.hr * s;
    const nk = rib([[J.nk[0], J.nk[1] + 3], J.hd], [[6.5, 6.5], [6, 6]], { capE: .3, capS: .3 });
    partD(nk, 'skin', 4);
  };
  const drawHeadNow = () => {
    const hc = M(J.hd);
    drawHead(ctx, C, { x: hc[0], y: hc[1], r: BN.hr * s, f, yaw: p.yaw ?? clamp(1 - tw * .9, 0, 1), tilt: (p.lean * .35 + p.hd) * D2R, ex: p.ex || o.ex, lm, L: Ld, rim: o.rim ? { d: o.rim.d, c: o.rim.c, lc: o.rim.lc, k: .1 } : null, wind: o.wind || 0, blood: p.blood || o.blood, det: o.det, glint: o.glint, cut: o.cut });
  };
  const backItem = () => {
    if (C.id === 'B' && !p.noSheath) {
      // tantō sheath across the back
      const a = T(14, -16), b = T(80, -2);
      const d = ribbon([a, b], [[3.2 * s, 3.2 * s], [3.6 * s, 3.6 * s]], { capE: .4, capS: .4 });
      cel(ctx, d, { f: lp(C.hilt, lm)[0], lw: lwi, lc: Lm.lc });
    }
  };
  const order = p.order || ['A2', 'L2', 'back', 'torso', 'L1', 'neck', 'head', 'A1'];
  for (const k of order) {
    if (k === 'A2') drawArm(J.A2, false, p.h2, p.w2 != null ? { ang: p.w2, type: p.wt2 || (C.id === 'B' ? 'tanto' : 'kunai'), behind: p.wb2 } : null);
    else if (k === 'A1') drawArm(J.A1, true, p.h1, p.w1 != null ? { ang: p.w1, type: p.wt1 || (C.id === 'B' ? 'tanto' : 'kunai'), behind: p.wb1 } : null);
    else if (k === 'L2') drawLeg(J.L2, false);
    else if (k === 'L1') drawLeg(J.L1, true);
    else if (k === 'torso') drawTorso();
    else if (k === 'neck') drawNeck();
    else if (k === 'head') drawHeadNow();
    else if (k === 'back') backItem();
  }
  return { J, M };
}
function drawWeapon(ctx, C, A, wp, M, s, f, lm, lw, Ld, o) {
  const a = wp.ang * D2R, u = dirv(a), v = [u[1], -u[0]];
  const base = A.w; const P = (x, y) => M([base[0] + u[0] * x + v[0] * y + dirv(A.ha)[0] * 6, base[1] + u[1] * x + v[1] * y + dirv(A.ha)[1] * 6]);
  const Lm = LM[lm];
  if (wp.type === 'kunai') {
    const hilt = [P(-14, -1.6), P(2, -1.8), P(2, 1.8), P(-14, 1.6)];
    cel(ctx, shape(hilt, 0, 2), { f: lp(CH.A.yoke, lm)[0], lw: lw * .7, lc: Lm.lc });
    const ring = []; for (let i = 0; i < 10; i++) { const t = i / 10 * TAU; ring.push(P(-17 + Math.cos(t) * 3, Math.sin(t) * 3)); }
    ink(ctx, ring, { closed: true, w: lw * .6, c: Lm.lc });
    const bl = [P(2, -4.5), P(10, -3.5), P(28, 0, 1), P(10, 3.5), P(2, 4.5)]; bl[2][2] = 1;
    cel(ctx, shape(bl, 0, 2), { f: lp(['#9aa2b4', '#646c80'], lm)[0], bands: [{ c: lp(['#9aa2b4', '#646c80'], lm)[1], shape: shape([P(2, 0), P(30, 0), P(2, 6)], 0, 2), inside: true }], lw: lw * .7, lc: Lm.lc });
  } else {
    const len = wp.len || 78;
    const hilt = [P(-20, -2.4), P(4, -2.6), P(4, 2.6), P(-20, 2.4)];
    cel(ctx, shape(hilt, 0, 2), { f: lp(C.hilt, lm)[0], lw: lw * .7, lc: Lm.lc });
    if (s > .5) for (let k = 0; k < 4; k++) ink(ctx, [P(-18 + k * 5.5, -2.4), P(-15 + k * 5.5, 2.4)], { w: lw * .35, c: lp(CH.B.wrap, lm)[1] });
    const gd = [P(4, -4), P(6.5, -4), P(6.5, 4), P(4, 4)];
    cel(ctx, shape(gd, 0, 2), { f: lp(['#5a5a66', '#33333c'], lm)[0], lw: lw * .6, lc: Lm.lc });
    const bc = wp.lit ? [wp.lit, mixc(wp.lit, '#6070a0', .4)] : lp(C.blade, lm);
    const bl = [P(6.5, -2.6), P(len * .7, -2.8), P(len, -1.2, 1), P(len + 3, 1.2, 1), P(len * .7, 2.6), P(6.5, 2.4)]; bl[2][2] = 1; bl[3][2] = 1;
    const bd = shape(bl, 0, 2);
    cel(ctx, bd, { f: bc[0], bands: [{ c: bc[1], shape: shape([P(5, .4), P(len + 5, .4), P(len + 5, 6), P(5, 6)], 0, 2), inside: true }], lw: lw * .7, lc: Lm.lc });
  }
}

// ---------- bust (for close-ups): shoulders, collar, neck, then the head ----------
const BUST = {
  f: [[-.36, 1.25], [-.42, 1.62], [-1.5, 2.0], [-2.35, 2.35], [-2.7, 2.9], [-2.85, 4.8], [2.85, 4.8], [2.7, 2.9], [2.35, 2.35], [1.5, 2.0], [.42, 1.62], [.36, 1.25]],
  p: [[-.45, 1.2], [-.6, 1.7], [-1.0, 2.0], [-1.35, 2.4], [-1.5, 3.0], [-1.55, 4.8], [1.35, 4.8], [1.3, 3.0], [1.05, 2.35], [.75, 1.95], [.38, 1.62], [.3, 1.2]]
};
function drawBust(ctx, C, o) {
  const r = o.r, f = o.f || 1, yaw = clamp(o.yaw ?? .55, 0, 1), lm = o.lm || 'night', Lm = LM[lm];
  const Ld = o.L || [-.55 * f, -.83];
  const by = (o.breath || 0) * .05;
  const M = (x, y) => [o.x + f * x * r + (o.dx || 0), o.y + (y - by) * r];
  const Mp = pts => pts.map(p => { const q = M(p[0], p[1]); if (p[2]) q[2] = 1; return q; });
  const lw = clamp(r * .052, 1, 4.6), lwi = lw * .62, jt = Math.min(1.2, r * .012);
  const t = yaw; const shift = yaw * .25;
  const bp = BUST.f.map((p, i) => [lerp(p[0], BUST.p[i][0], t) - shift, lerp(p[1], BUST.p[i][1], t)]);
  const bands = (pair, k) => { const b = [{ c: lp(pair, lm)[1], off: [Ld[0] * k * r, Ld[1] * k * r], lc: Lm.hl, lw: lwi * .7 }]; if (o.rim) b.push({ c: o.rim.c, off: [-o.rim.d[0] * .06 * r, -o.rim.d[1] * .06 * r], lc: o.rim.lc, lw: lwi * .6 }); return b; };
  // neck
  const nx = -.08 + yaw * .12;
  const neck = Mp([[nx - .36, .55], [nx + .34, .55], [nx + .38, 1.75], [nx - .42, 1.75]]);
  cel(ctx, shape(neck, jt, 3), { f: lp(C.skin, lm)[0], bands: [{ c: lp(C.skin, lm)[1], shape: shape(Mp([[nx - 1, .4], [nx + 1, .4], [nx + 1, 1.05], [nx - 1, 1.2]]), 0, 3), inside: true }].concat(bands(C.skin, .25).slice(0)), lw, lc: Lm.lc });
  // torso
  const td = shape(Mp(bp), jt, 3);
  cel(ctx, td, { f: lp(C.top, lm)[0], bands: bands(C.top, .3), lw, lc: Lm.lc, paint: o.paint });
  ctx.save(); poly(ctx, td); ctx.clip();
  if (C.id === 'A') {
    const yk = shape(Mp([[-3.2, 1.0], [3.2, 1.0], [3.2, 2.75], [lerp(1.5, .8, t) - shift, 2.55], [-shift, 2.75], [lerp(-1.5, -1.3, t) - shift, 2.55], [-3.2, 2.75]]), jt, 3);
    cel(ctx, yk, { f: lp(C.yoke, lm)[0], bands: bands(C.yoke, .25), lw: lwi, lc: Lm.lc });
    const zx = Math.sin(yaw * Math.PI / 2) * .95 - shift * .2;
    if (yaw < .85) ink(ctx, Mp([[zx * .8, 1.7], [zx, 3.2], [zx * 1.05, 4.8]]), { w: lwi, c: Lm.lc });
    ink(ctx, Mp([[-1.7 - shift, 3.5], [-1.2 - shift, 3.9], [-1.5 - shift, 4.5]]), { w: lwi * .6, c: Lm.lc });
  } else {
    ink(ctx, Mp([[.6 - shift, 2.5], [.9 - shift, 3.3]]), { w: lwi * .6, c: Lm.lc });
    ink(ctx, Mp([[-1.3 - shift, 3.0], [-1.1 - shift, 3.8]]), { w: lwi * .6, c: Lm.lc });
  }
  ctx.restore();
  // collar
  const cx0 = nx - .02;
  if (C.id === 'A') {
    const cl = shape(Mp([[cx0 - .62, 1.35], [cx0 + .3, 1.42], [cx0 + .62 - yaw * .1, 1.5], [cx0 + .5, 1.95], [cx0 - .1, 2.05], [cx0 - .72, 1.9]]), jt, 3);
    cel(ctx, cl, { f: lp(C.yoke, lm)[0], bands: bands(C.yoke, .15), lw, lc: Lm.lc });
  } else {
    const cl = shape(Mp([[cx0 - .78, .95], [cx0 - .2, 1.18], [cx0 + .66, 1.05], [cx0 + .72, 1.95], [cx0 - .1, 2.1], [cx0 - .85, 1.9]]), jt, 3);
    cel(ctx, cl, { f: lp(C.top, lm)[0], bands: bands(C.top, .18), lw, lc: Lm.lc });
  }
  drawHead(ctx, C, Object.assign({}, o, { x: o.x + (o.dx || 0), y: o.y - by * r, L: Ld }));
}
