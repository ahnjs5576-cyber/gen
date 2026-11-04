// ───────────────────────── shots, act two: waking up ─────────────────────────
// key helper: hand-timed stepped values [[t,v],...] held between keys (no software easing)
function keyHold(keys, t) { let v = keys[0][1]; for (const k of keys) if (t >= k[0]) v = k[1]; return v; }
function keyLin(keys, t) { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) { const a = keys[i - 1], b = keys[i]; return lerp(a[1], b[1], (t - a[0]) / (b[0] - a[0])); } return keys[keys.length - 1][1]; }
// ── S5: tilt up the pantograph
const ROOF = { s: 4.2, ox: 480, oy: 1666, bgH: 1360, wireY: (x) => 582 + 18 * (1 - ((x - 480) / 700) ** 2) };
function buildRoofSky() {
  const cv = mkCanvas(W, ROOF.bgH), c = cv.getContext('2d'), rng = mulberry(3301);
  rainSky(c, W, ROOF.bgH, { seed: 33, top: '#05070f', mid: '#0e1528', bot: '#1c2034', glow: 0.3, gx: 200, clouds: { scale: 420, dark: '#0a0e1a', mid: '#161e36', lit: '#2e3a5a', dark2: '#121830', mid2: '#202842', lit2: '#3a4260' } });
  // distant rooftops & poles peeking at the bottom, out of focus
  for (let i = 0; i < 8; i++) { const x = i * 130 - 40 + rng() * 40, h = 80 + rng() * 140; c.fillStyle = css(mix('#0a0d16', '#141826', rng()), 1); c.fillRect(x, ROOF.bgH - 300 - h * 0.3, 110, 400); if (rng() < 0.5) { c.fillStyle = css('#ffc070', 0.5); c.fillRect(x + 30, ROOF.bgH - 260, 14, 10); litSpill(c, x + 37, ROOF.bgH - 255, 30, '#ffb060', 0.3); } }
  // tangle of wires high above + the catenary span wires
  for (let k = 0; k < 7; k++) bline(c, sag(-30, 300 + k * 60 + rng() * 40, 990, 260 + rng() * 200, 30 + rng() * 40, 40), 1 + rng() * 1.5, '#04050a', 0.95, k);
  bline(c, sag(-30, 470, 990, 450, 24, 40), 1.2, '#04050a', 1);
  for (const x of [120, 840]) bline(c, [[x, 470 + 8], [x, ROOF.wireY(x)]], 1.2, '#04050a', 1);
  applyPaper(c, W, ROOF.bgH, 0.2);
  return cv;
}
function shotPanto(c, lt, t) {
  const camY = lerp(640, 252, ss(2.0, 4.8, lt));
  c.setTransform(1, 0, 0, 1, 0, -camY);
  c.drawImage(SCN.roof, 0, 0);
  const p = keyHold([[0, 0], [1.25, 0.03], [1.33, 0.01], [1.42, 0.045], [1.5, 0.02], [1.8, 0.05], [2.05, 0.2], [2.2, 0.17], [2.55, 0.4], [2.72, 0.37], [3.05, 0.63], [3.2, 0.6], [3.5, 0.86], [3.7, 0.985], [3.78, 0.95], [3.86, 0.965], [3.95, 0.958]], lt);
  const contact = lt >= 3.7;
  const d = drawingIndex(lt, 2);
  const arc = contact ? (h1(d * 3.1) < 0.55 ? 1 : 0.35) * (lt < 4.3 ? 1.4 : 1) : 0;
  const L = { kx: -0.8, ky: -0.5, kc: contact ? mixs('#ffae4a', '#bfe4ff', arc * 0.8) : '#c8884a', cx: 0.1, cy: -1, cc: contact ? '#cfeeff' : '#6fb4dc', fall: '#5a6a8a', sheen: 1.4 };
  // wire bounce after contact
  const wb = contact ? Math.sin((q(lt, 2) - 3.7) * 18) * Math.exp(-(lt - 3.7) * 2.2) * 10 : 0;
  const wire = []; for (let x = -20; x <= 980; x += 20) wire.push([x, ROOF.wireY(x) - wb * Math.sin(Math.PI * clamp((x + 20) / 1000))]);
  LW = 1; ink(c, wire, 2.4, '#05060a', { t0: 0.01, t1: 0.01, var: 0.15 }); ink(c, wire.map(q2 => [q2[0], q2[1] - 0.8]), 0.8, css(L.cc, 0.6), { t0: 0.01, t1: 0.01 });
  const pj = contact ? (h1(d * 1.7) - 0.5) * 2.4 : 0;
  const o = celLayer(c, (k) => tramSide(k, ROOF.ox, ROOF.oy, ROOF.s, { L, panto: p, pjit: pj, head: 0, win: 0, ivy: 0, rem: false, ground: false, bell: 0 }), { fall: [0, 0, 960, 200, '#050814', 0.5] });
  // rain bouncing off the roof, then sparks at the contact point
  const roofY = ROOF.oy - 149 * ROOF.s;
  splashes(c, t, [{ x0: 0, x1: 960, y0: roofY - 8, y1: roofY + 4, n: 30, s: 2 }]);
  if (lt > 1.25 && lt < 3.7 && h1(d * 2.3) < 0.3) sparkBurst(c, o.pan[0] - 40 + h1(d) * 80, roofY - 20, 10, d * 7, { shards: 3, edge: '#9ad0ff' }); // static crackle at the base
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (contact) {
    const sx = o.pan[0], sy = o.pan[1];
    if (d % 3 !== 2 || lt < 4.2) sparkBurst(c, sx + (h1(d * 9) - 0.5) * 30, sy, lt < 4.2 ? 46 : 22 + h1(d) * 20, d * 13 + 1, { smear: lt < 4.2 ? 0.2 : 0.8, smearAng: h1(d * 5) < 0.5 ? 0 : Math.PI, shards: 9, grav: 0.6 });
    for (let k = 0; k < 6; k++) { const age = (d - k), rr = mulberry(age * 77); const fx = sx + (rr() - 0.5) * 60 + (rr() - 0.5) * k * 30, fy = sy + k * k * 9 + rr() * 10; LW = 1; ink(c, [[fx, fy], [fx + (rr() - 0.5) * 8, fy + 10 + k * 4]], 2, css(k < 2 ? '#ffffff' : '#ffd890', 1 - k * 0.15), { t0: 0.1, t1: 0.9 }); }
    c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = css('#6aa8ff', 0.1 * arc); c.fillRect(0, 0, W, H); c.restore();
    glow(c, sx, sy, 260, '#7ab8ff', 0.25 * arc);
  }
  rain(c, t, { seed: 5, lights: contact ? [{ x: o.pan[0], y: o.pan[1], r: 260, col: '#bfe4ff', a: 0.6 * arc }] : [] });
  c.setTransform(1, 0, 0, 1, 0, 0);
  return { hal: contact ? 0.9 : 0.7 };
}
// ── S6: interior, the lamps stutter on one by one
const IC = { f: 520, cx: 480, cy: 318, ey: 1.52, ez: -0.75, sh: 0 };
function P3(x, y, z) { const zz = Math.max(0.05, z - IC.ez); return [IC.cx + IC.f * x / zz, IC.cy - IC.f * (y - IC.ey) / zz + IC.sh]; }
const LAMPS_Z = [1.6, 3.6, 5.6, 7.6, 9.6];
function lampLevel(i, lt) {
  const on = [0.7, 1.45, 2.05, 2.55, 3.0][i], pat = [1, 0, 0, 1, 0.4, 0, 1, 1, 0.2, 1];
  if (lt < on) return 0; const f = Math.floor((lt - on) * FPS); if (f < pat.length) return pat[f] * 0.9; return 0.97 + 0.03 * h1(Math.floor(lt * 8) + i);
}
const ARCH = [[-1.15, 2.15], [-0.85, 2.36], [-0.4, 2.46], [0, 2.49], [0.4, 2.46], [0.85, 2.36], [1.15, 2.15]];
function shotInterior(c, lt, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  IC.sh = lt > 2.5 && lt < 4.2 ? Math.round(Math.sin(q(lt, 1) * 40) * 2 * (1 - (lt - 2.5) / 1.7)) : 0;
  const lv = LAMPS_Z.map((z, i) => lampLevel(i, lt));
  const light = (z) => { let s = 0; LAMPS_Z.forEach((lz, i) => { s += lv[i] * Math.exp(-Math.abs(z - lz) * 0.5) * 0.8; }); return clamp(s); };
  const Q = (pts, sd) => wob(subdiv(pts, 9, true), sd, 1.1, 0.05, true);
  c.fillStyle = '#020308'; c.fillRect(0, 0, W, H);
  const col = (dk, lt2, k) => mixs(dk, lt2, k);
  const pal = { wall: ['#0c1019', '#b9a27a'], wall1: ['#080a12', '#8a7454'], ceil: ['#0a0d16', '#d4c094'], floor: ['#07080c', '#5e4228'], seat: ['#060c09', '#3c6a48'], seat1: ['#040706', '#244a32'], ad: ['#0e1018', '#d8ccb0'], frame: ['#06080c', '#5a4a34'] };
  LW = 1;
  // front wall + windscreen first
  const zf = 10.6, fw = [...ARCH.map(([x, y]) => P3(x, y, zf)), P3(1.15, 0, zf), P3(-1.15, 0, zf)];
  const kf = light(zf - 0.8);
  fillP(c, fw, col(pal.wall[0], pal.wall[1], kf * 0.8));
  const panes = [[-1.0, -0.36], [-0.32, 0.32], [0.36, 1.0]];
  for (const [a, b] of panes) {
    const pp = [P3(a, 1.0, zf), P3(b, 1.0, zf), P3(b, 1.95, zf), P3(a, 1.95, zf)];
    fillP(c, pp, '#0a1222'); c.save(); clipP(c, pp); air(c, P3(-0.6, 1.2, zf)[0], P3(0, 1.2, zf)[1], 50, '#ff9a3a', 0.35 * lampFlicker(t)); rain(c, t, { seed: 61, area: bbox(pp), layers: [{ n: 14, len: [4, 9], w: 0.6, a: 0.4 }] }); c.restore();
    inkC(c, pp, 1.6);
  }
  const db = [P3(-0.35, 2.02, zf - 0.05), P3(0.35, 2.02, zf - 0.05), P3(0.35, 2.28, zf - 0.05), P3(-0.35, 2.28, zf - 0.05)];
  cel(c, db, col('#0a0c10', '#3a3026', kf), { line: 1.4, inside: (c) => { if (lt > 3.3) air(c, (db[0][0] + db[1][0]) / 2, (db[0][1] + db[2][1]) / 2, 30, '#ffe0a0', 0.7 * (lt > 3.4 ? 1 : 0.4)); } });
  // controller & brake wheel silhouettes
  const ctl = [P3(-0.75, 0.0, 10.2), P3(-0.45, 0.0, 10.2), P3(-0.47, 1.0, 10.2), P3(-0.73, 1.0, 10.2)];
  cel(c, ctl, col('#05060a', '#3a3430', kf), { line: 1.4, rim: [[0.2, -1, mixs('#203040', '#ffd890', kf), 1.2, 0.5]] });
  const hc = P3(-0.6, 1.08, 10.2); ink(c, [hc, [hc[0] + 18, hc[1] - 6]], 3); dot(c, hc[0] + 18, hc[1] - 6, 3.5, col('#2a2420', '#c8a060', kf));
  const bw = P3(0.6, 1.05, 10.2); cel(c, ell(bw[0], bw[1], 22, 7, 20), col('#05060a', '#4a3a2a', kf), { line: 1.6 }); fillP(c, ell(bw[0], bw[1], 15, 4.5, 16), '#05060a');
  // sections far → near
  for (let k = 9; k >= 0; k--) {
    const z0 = 0.6 + k, z1 = z0 + 1, zc = (z0 + z1) / 2, L = light(zc);
    // ceiling panels
    for (let i = 0; i < ARCH.length - 1; i++) {
      const a = ARCH[i], b = ARCH[i + 1];
      const pp = Q([P3(a[0], a[1], z0), P3(b[0], b[1], z0), P3(b[0], b[1], z1), P3(a[0], a[1], z1)], k * 7 + i);
      const shade = i === 0 || i === ARCH.length - 2 ? 0.62 : i === 1 || i === ARCH.length - 3 ? 0.85 : 1;
      fillP(c, pp, col(pal.ceil[0], pal.ceil[1], L * shade));
    }
    ink(c, ARCH.map(([x, y]) => P3(x, y, z1)), 1.1, col('#000', '#4a3a28', L));
    // walls with window bay, ad frame strip and wainscot
    for (const sg of [-1, 1]) {
      const x = 1.15 * sg;
      const wall = Q([P3(x, 0, z0), P3(x, 0, z1), P3(x, 2.15, z1), P3(x, 2.15, z0)], k * 11 + sg);
      fillP(c, wall, col(pal.wall[0], pal.wall[1], L * (sg < 0 ? 0.92 : 0.74)));
      const wp = Q([P3(x, 0.98, z0 + 0.1), P3(x, 0.98, z1 - 0.1), P3(x, 1.86, z1 - 0.1), P3(x, 1.86, z0 + 0.1)], k * 13 + sg);
      fillP(c, wp, sg > 0 ? '#0b1424' : '#0a1120');
      c.save(); clipP(c, wp);
      if (sg > 0 && k < 6) air(c, (wp[0][0] + wp[2][0]) / 2, (wp[0][1] + wp[2][1]) / 2, 90, '#ff9a3a', 0.25 * lampFlicker(t));
      rain(c, t, { seed: 70 + k + sg, area: bbox(wp), layers: [{ n: 10, len: [6, 14], w: 0.7, a: 0.35 }] });
      if (L > 0.05) { c.fillStyle = css('#ffd8a0', 0.1 * L); c.fillRect(0, 0, W, H); const opp = P3(-x * 0.9, 2.35, zc + 0.3); air(c, opp[0], (wp[0][1] + wp[2][1]) / 2 - 10, 20, '#fff0c8', 0.5 * L, 0.6, 1); }
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); pathP(c, [wp[3], wp[2], P3(x, 1.78, z1 - 0.1), P3(x, 1.78, z0 + 0.1)]); c.fill();
      c.restore();
      inkC(c, wp, 1.5);
      // sash bar + ad frame above window
      ink(c, [P3(x, 1.42, z0 + 0.1), P3(x, 1.42, z1 - 0.1)], 1.2);
      const ad = [P3(x, 1.92, z0 + 0.2), P3(x, 1.92, z1 - 0.2), P3(x, 2.1, z1 - 0.2), P3(x, 2.1, z0 + 0.2)];
      cel(c, ad, col(pal.ad[0], pal.ad[1], L * 0.9), { line: 1.0, inside: (c) => { if (L > 0.1) { const b = bbox(ad); glyphs(c, b.x + 2, b.y + 1, b.w - 4, b.h - 2, css(mix('#20202a', '#7a2a2a', (k % 3) / 2)), 300 + k * 2 + sg, false, L * 0.8); } } });
      ink(c, [P3(x, 0, z0), P3(x, 2.15, z0)], 1.2, col('#000', '#3a2a1c', L));
    }
    // floor
    const fl = Q([P3(-1.15, 0, z0), P3(1.15, 0, z0), P3(1.15, 0, z1), P3(-1.15, 0, z1)], k * 17);
    fillP(c, fl, col(pal.floor[0], pal.floor[1], L * 0.85));
    for (const sg of [-1, 1]) fillP(c, Q([P3(sg * 1.15, 0, z0), P3(sg * 0.66, 0, z0), P3(sg * 0.66, 0, z1), P3(sg * 1.15, 0, z1)], k * 19 + sg), col('#020203', '#2a1c12', L * 0.6));
    // benches
    for (const sg of [-1, 1]) {
      const xw = 1.15 * sg, xe = 0.74 * sg;
      const back = [P3(xw, 0.45, z0), P3(xw, 0.45, z1), P3(xw - sg * 0.06, 0.92, z1), P3(xw - sg * 0.06, 0.92, z0)];
      const top = [P3(xw, 0.45, z0), P3(xw, 0.45, z1), P3(xe, 0.45, z1), P3(xe, 0.45, z0)];
      const front = [P3(xe, 0.45, z0), P3(xe, 0.45, z1), P3(xe, 0.12, z1), P3(xe, 0.12, z0)];
      const B2 = Q(back, k * 23 + sg), T2 = Q(top, k * 29 + sg), F2 = Q(front, k * 31 + sg);
      fillP(c, B2, col(pal.seat1[0], pal.seat[1], L * 0.85)); fillP(c, T2, col(pal.seat[0], pal.seat[1], L)); fillP(c, F2, col(pal.seat1[0], pal.seat1[1], L));
      c.save(); clipP(c, F2); c.fillStyle = col('#000', '#14281a', L * 0.8); c.beginPath(); pathP(c, [P3(xe, 0.28, z0), P3(xe, 0.28, z1), P3(xe, 0.05, z1), P3(xe, 0.05, z0)]); c.fill(); c.restore();
      c.save(); clipP(c, T2); air(c, (T2[0][0] + T2[2][0]) / 2, (T2[0][1] + T2[2][1]) / 2, 40, '#b8e0b0', 0.15 * L, 1, 0.3); c.restore();
      ink(c, [front[0], front[3]], 1.0);
    }
  }
  // continuous held lines along the car
  for (const sg of [-1, 1]) {
    for (const [x, y, w] of [[1.15, 0, 1.6], [1.15, 2.15, 1.6], [0.74, 0.45, 1.8], [0.74, 0.12, 1.3], [1.09, 0.92, 1.2], [1.15, 0.98, 1.0]]) { const pts = []; for (let z = 0.6; z <= 10.6; z += 0.5) pts.push(P3(sg * x, y, z)); ink(c, wob(pts, x * 10 + y + sg, 0.8, 0.05), w, '#06040a', { t0: 0.02, t1: 0.02 }); }
  }
  // light pools: airbrushed onto floor, seats and walls
  c.save(); c.globalCompositeOperation = 'lighter';
  LAMPS_Z.forEach((z, i) => { if (lv[i] < 0.05) return; const sc = IC.f / (z - IC.ez); const f0 = P3(0, 0, z); air(c, f0[0], f0[1], sc * 1.0, '#ffc070', 0.22 * lv[i], 1, 0.35); for (const sg of [-1, 1]) { const w0 = P3(sg * 1.15, 1.55, z); air(c, w0[0], w0[1], sc * 0.9, '#ffd090', 0.14 * lv[i], 0.5, 1); const s0 = P3(sg * 0.95, 0.45, z); air(c, s0[0], s0[1], sc * 0.6, '#ffe0a0', 0.12 * lv[i], 1, 0.4); } });
  c.restore();
  // floor slats, debris, a leak puddle reflecting the lamps
  for (let x = -1.0; x <= 1.0; x += 0.16) ink(c, [P3(x, 0, 0.6), P3(x, 0, 10.6)], 0.7, css('#000', 0.5));
  const pud = []; for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; pud.push(P3(0.15 + Math.cos(a) * 0.5, 0, 4.2 + Math.sin(a) * 0.9 * (0.8 + h1(k) * 0.4))); }
  fillP(c, pud, '#0a1220'); c.save(); clipP(c, pud); LAMPS_Z.forEach((z, i) => { if (lv[i] > 0) { const pp = P3(0, -2.42 + 0.0, z); air(c, pp[0], pp[1], 30, '#ffd890', lv[i] * 0.8, 1, 0.5); } }); c.restore();
  const lr = mulberry(9); for (let k = 0; k < 26; k++) { const pp = P3((lr() - 0.5) * 1.9, 0, 0.8 + lr() * 9); const s = 120 / (pp[1] - IC.cy + 60); leaf(c, pp[0], pp[1], lr() * TAU, Math.max(2, 900 / Math.max(60, 1000 - pp[1]) * 0.9 + lr() * 2), PAL0, null); }
  // the broken window: ivy has come in
  { const z = 5.8, pts = []; for (let i = 0; i <= 12; i++) pts.push(P3(-1.12 + Math.sin(i * 0.7) * 0.04, 1.84 - i * 0.12, z + i * 0.03)); ink(c, pts, 2.2, PAL0.ivy1); pts.forEach((p, i) => { if (i % 2) leaf(c, p[0], p[1], 1.4 + i, 7, PAL0, null); }); }
  // straps: rails, then each strap with its own overlapping sway (on twos)
  const sw = lt < 2.4 ? 0 : 0.35 * Math.min(1, (lt - 2.4) * 1.2);
  const tq = q(lt, 2);
  for (const rx of [-0.62, 0.62]) {
    ink(c, [P3(rx, 2.06, 0.6), P3(rx, 2.06, 10.3)], 2.0);
    for (let j = 16; j >= 0; j--) {
      const z = 0.8 + j * 0.58, th = sw * Math.sin(tq * 5.2 - j * 0.55 + rx * 3) * (0.7 + 0.3 * Math.sin(tq * 2.1 + j)), Lz = light(z);
      const len = 0.3, bx = rx + Math.sin(th) * len, by = 2.06 - Math.cos(th) * len;
      const a = P3(rx, 2.06, z), b = P3(bx, by, z), rp = P3(bx + Math.sin(th) * 0.07, by - Math.cos(th) * 0.07, z);
      const sc = IC.f / (z - IC.ez);
      ink(c, [a, b], Math.max(1, sc * 0.022), col('#020203', '#3a3028', Lz));
      const ring = ell(rp[0], rp[1], sc * 0.065, sc * 0.07, 16);
      ink(c, ring, Math.max(1, sc * 0.018), col('#05050a', '#d6c8a4', Lz), { closed: true });
    }
  }
  // the lamps: globes, halos, and dust in the light
  LAMPS_Z.forEach((z, i) => {
    const pp = P3(0, 2.4, z), r = IC.f / (z - IC.ez) * 0.09;
    cel(c, ell(pp[0], pp[1] + r * 0.4, r, r * 0.8, 16), lv[i] > 0.05 ? mixs('#d8c8a0', '#fff6d8', lv[i]) : '#1a1c22', { line: 1.4 });
    if (lv[i] > 0.05) { glow(c, pp[0], pp[1] + r * 0.4, r * 6, '#ffcf80', 0.32 * lv[i]); glow(c, pp[0], pp[1] + r * 0.4, r * 1.8, '#fffbe8', 0.8 * lv[i]); }
  });
  if (lv[1] > 0.5) { const dr = mulberry(drawingIndex(lt, 3) * 3); c.save(); c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 40; k++) { const pp = P3((dr() - 0.5) * 2, 0.6 + dr() * 1.6, 1.5 + dr() * 6); c.fillStyle = css('#ffe8b0', 0.3 + dr() * 0.4); c.fillRect(pp[0], pp[1], 1.4, 1.4); } c.restore(); }
  return { hal: 0.85, th: 140 };
}
// ── S7: destination roller insert
const DEST = { x: 160, y: 250, w: 640, h: 200, ph: 200, final: 8 };
function destPos(lt) {
  const keys = [[0, 0], [0.62, 0], [0.66, 0.14], [0.7, 0.1], [0.98, 0.1], [1.02, 0.3], [1.06, 0.26], [1.3, 0.26]];
  if (lt < 1.3) return keyHold(keys.map(k => [k[0], k[1]]), lt);
  if (lt < 2.55) { const u = (lt - 1.3) / 1.25; return 0.26 + (DEST.final - 0.6 - 0.26) * (u * u * (1.5 - 0.5 * u)) ; }
  return keyHold([[2.55, DEST.final - 0.6], [2.62, DEST.final - 0.3], [2.7, DEST.final - 0.12], [2.8, DEST.final + 0.06], [2.86, DEST.final]], lt);
}
function shotRoller(c, lt, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  const P = PAL0, L = { kx: -0.7, ky: -0.6, kc: '#d0904a', cx: 0.2, cy: -1, cc: '#6fb4dc' };
  // surrounding body: roof edge, letterboard, windscreen top — big cel
  celLayer(c, (k) => {
    setLW(2.2);
    cel(k, [[-20, -20], [980, -20], [980, 150], [-20, 160]], P.roof, { line: 3, inside: (k) => { k.fillStyle = P.roof1; k.fillRect(-20, 110, 1000, 60); air(k, 480, 40, 500, P.glassH, 0.12, 1, 0.1); } });
    cel(k, [[-20, 150], [980, 140], [980, 560], [-20, 560]], P.cream, { line: 3, inside: (k) => { k.fillStyle = P.cream1; k.fillRect(-20, 140, 1000, 26); const r = mulberry(14); for (let i = 0; i < 24; i++) rustBlot(k, r() * 960, 180 + r() * 360, 2 + r() * r() * 10, r, P.cream, P); air(k, 800, 300, 300, L.cc, 0.12, 1, 0.5); air(k, 120, 400, 300, L.kc, 0.18, 1, 0.6); } });
    for (let x = 30; x < 960; x += 52) { rivetDome(k, x, 196, 5, P, P.cream); rivetDome(k, x, 520, 5, P, P.cream); }
    // window frame
    cel(k, rrect(DEST.x - 22, DEST.y - 22, DEST.w + 44, DEST.h + 44, 14, 4), P.cream1, { line: 2.6, rim: [[L.cx, L.cy, L.cc, 2, 0.5]] });
    cel(k, [[-20, 560], [980, 560], [980, 760], [-20, 760]], '#0d1620', { line: 3, inside: (k) => { air(k, 480, 700, 400, '#ffcf80', 0.5, 1, 0.4); } });
  });
  // roller cloth, backlit
  const pos = destPos(lt), vel = (destPos(lt + 1 / 24) - pos) * 24;
  const back = clamp((lt - 0.1) * 3);
  const win = rrect(DEST.x, DEST.y, DEST.w, DEST.h, 8, 4);
  c.save(); clipP(c, win);
  c.fillStyle = '#e8dcbc'; c.fillRect(DEST.x, DEST.y, DEST.w, DEST.h);
  for (let kk = Math.floor(pos) - 1; kk <= Math.floor(pos) + 2; kk++) {
    const y = DEST.y + (kk - pos) * DEST.ph, r = mulberry(kk * 31 + 7);
    c.fillStyle = kk === DEST.final ? '#ece2c6' : '#e2d6b4'; c.fillRect(DEST.x, y, DEST.w, DEST.ph);
    c.fillStyle = 'rgba(80,60,40,0.35)'; c.fillRect(DEST.x, y, DEST.w, 3);
    if (kk === DEST.final) {
      const mx = DEST.x + DEST.w / 2, my = y + DEST.ph / 2; LW = 1;
      const moon = wob(subdiv(cat(ell(mx - 8, my, 44, 44, 30, Math.PI * 0.42, Math.PI * 1.58), ell(mx + 12, my - 6, 36, 36, 26, -Math.PI * 0.62, Math.PI * 0.62).reverse()), 3, true), 5, 0.6, 0.1, true);
      fillP(c, moon, '#e2a62e'); c.save(); clipP(c, moon); c.fillStyle = '#b87a1e'; c.beginPath(); c.arc(mx - 26, my + 18, 30, 0, TAU); c.fill(); c.restore(); inkC(c, moon, 2, '#4a3010');
    } else if (Math.abs(vel) < 4) {
      const n = 2 + (r() * 4 | 0); glyphs(c, DEST.x + 60 + r() * 40, y + 40, DEST.w - 160, DEST.ph - 80, '#1a1410', kk * 97 + 5, false, 0.9);
      if (r() < 0.5) { c.fillStyle = css(['#8a2a22', '#24508a', '#2a6a3a'][((kk % 3) + 3) % 3], 0.8); c.fillRect(DEST.x + 20, y + 30, 22, DEST.ph - 60); }
    } else {
      // smear drawing: vertical dry-brush streaks
      for (let i = 0; i < 40; i++) { const x = DEST.x + 50 + r() * (DEST.w - 100); c.fillStyle = css('#2a2018', 0.15 + r() * 0.25); c.fillRect(x, y, 2 + r() * 8, DEST.ph); }
    }
  }
  // backlight through the cloth
  c.globalCompositeOperation = 'multiply'; const g = c.createRadialGradient(480, 350, 40, 480, 350, 420); g.addColorStop(0, css(mix('#ffffff', '#ffe0a0', 0.4))); g.addColorStop(1, css(mix('#3a3a40', '#c08040', back))); c.fillStyle = g; c.fillRect(DEST.x, DEST.y, DEST.w, DEST.h);
  c.globalCompositeOperation = 'lighter'; air(c, 480, 350, 260, '#ffb860', 0.25 * back * (lt > 2.86 ? 1.3 : 1));
  c.globalCompositeOperation = 'source-over';
  // glass: reflection streak, rain beads & rivulets
  air(c, 300, 300, 160, '#bfe0ff', 0.12, 1.4, 0.35, -0.5);
  const br = mulberry(55);
  for (let i = 0; i < 22; i++) { const x = DEST.x + br() * DEST.w, y0 = DEST.y + br() * DEST.h, s = 2 + br() * 4; const slide = br() < 0.35 ? ((q(t, 2) * 50 * (0.5 + br())) % DEST.h) : 0; const y = DEST.y + ((y0 - DEST.y + slide) % DEST.h); if (Math.abs(x - 480) < 70 && Math.abs(y - 350) < 60) continue; c.fillStyle = 'rgba(60,40,20,0.22)'; c.beginPath(); c.ellipse(x, y - s * 0.2, s, s * 0.9, 0, Math.PI, TAU); c.fill(); c.fillStyle = 'rgba(255,250,235,0.75)'; c.beginPath(); c.ellipse(x, y + s * 0.45, s * 0.7, s * 0.3, 0, 0, Math.PI); c.fill(); dot(c, x - s * 0.35, y - s * 0.35, s * 0.22, 'rgba(255,255,255,0.9)'); if (slide) { LW = 1; ink(c, [[x, y - s], [x + 1, y - s - 30 - br() * 40]], 1.4, 'rgba(255,240,220,0.3)'); } }
  c.restore();
  LW = 1; inkC(c, win, 2.4);
  rain(c, t, { seed: 77, layers: [{ n: 60, len: [20, 40], w: 1, a: 0.25 }, { n: 12, len: [60, 100], w: 2, a: 0.2 }] });
  if (lt > 2.86) { glow(c, 480, 350, 120, '#ffd060', 0.25 * ss(2.86, 3.4, lt)); }
  return { hal: 0.8 };
}
// ── S8: the wheels — groan, rock, rust cracks off, ivy tears
const WK = 14, WRAIL = 646, WC = [[205, WRAIL - 13 * WK], [765, WRAIL - 13 * WK]];
function buildWheelsBG() {
  const cv = mkCanvas(W, H), c = cv.getContext('2d'), rng = mulberry(4401);
  c.fillStyle = '#030408'; c.fillRect(0, 0, W, H);
  // far side of the street seen under the car
  const g = c.createLinearGradient(0, 300, 0, 600); g.addColorStop(0, '#05070c'); g.addColorStop(1, '#10141e'); c.fillStyle = g; c.fillRect(0, 300, W, 320);
  for (let i = 0; i < 14; i++) { const x = rng() * W, y = 420 + rng() * 100, r = 8 + rng() * 26; c.save(); c.globalCompositeOperation = 'lighter'; air(c, x, y, r * 2, rng() < 0.7 ? '#ff9a3a' : '#9fd8ff', 0.25); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = css(rng() < 0.7 ? '#ffb060' : '#9fd8ff', 0.12); c.fill(); c.restore(); }
  for (let i = 0; i < 50; i++) { const x = rng() * W, h = 20 + rng() * 60; dab(c, x, 600 - h / 2, -1.57 + (rng() - 0.5) * 0.4, h, 5 + rng() * 5, css('#05080c', 0.85)); }
  paintPoly(c, [[-10, 622], [970, 618], [970, 730], [-10, 730]], '#0c0f16', { dens: 0.03, len: 12, wid: 4, var: 0.4 });
  for (let i = 0; i < 600; i++) { const x = rng() * W, y = 650 + rng() * 80, s = 2 + rng() * 6; c.fillStyle = css(mix('#141820', '#34343a', rng()), 0.9); c.beginPath(); c.ellipse(x, y, s, s * 0.6, rng() * 3, 0, TAU); c.fill(); if (rng() < 0.3) { c.fillStyle = css('#6a8aa8', 0.3); c.beginPath(); c.ellipse(x - s * 0.2, y - s * 0.3, s * 0.4, s * 0.15, 0, 0, TAU); c.fill(); } }
  // rail + sleeper
  paintPoly(c, [[-10, WRAIL], [970, WRAIL - 1], [970, WRAIL + 22], [-10, WRAIL + 22]], '#3a2a24', { dens: 0.08, len: 10, wid: 2, var: 0.3 });
  for (let i = 0; i < 80; i++) rustBlot(c, rng() * W, WRAIL + 4 + rng() * 14, 2 + rng() * 6, rng, '#3a2a24', PAL0, 0);
  bline(c, [[-10, WRAIL + 1], [970, WRAIL]], 2.4, '#a8bccc', 0.5);
  paintPoly(c, [[-10, WRAIL + 22], [970, WRAIL + 21], [970, WRAIL + 40], [-10, WRAIL + 42]], '#1a1412', { dens: 0.06 });
  applyPaper(c, W, H, 0.2);
  return cv;
}
// ivy strands through the wheels (close-up set): [anchor on ground, path through spokes, tear time]
const WIVY = (() => {
  const r = mulberry(919), list = [];
  const mk = (x0, y0, ctrl, tear) => { const pts = bez([x0, y0], ctrl[0], ctrl[1], ctrl[2], 26); const leaves = []; pts.forEach((p, i) => { if (i % 2 === 0 && i > 1) leaves.push({ i, a: (i % 4 ? 1 : -1) * 1.3 + r() * 0.4, s: 12 + r() * 12 }); }); list.push({ pts, leaves, tear, seed: r() * 99 | 0 }); };
  mk(120, 660, [[160, 520], [220, 420], [300, 340]], 2.55);
  mk(330, 660, [[300, 560], [230, 520], [190, 440]], 3.15);
  mk(640, 660, [[700, 560], [760, 420], [700, 330]], 2.85);
  mk(860, 660, [[820, 560], [760, 520], [720, 470]], 3.6);
  mk(500, 660, [[480, 540], [520, 420], [470, 300]], 4.0);
  return list;
})();
function drawWheelIvy(c, lt, P, L) {
  for (const s of WIVY) {
    let pts = s.pts;
    const dt = lt - s.tear;
    if (dt > -0.5 && dt < 0) { // tension: strand straightens and trembles
      const k = (dt + 0.5) / 0.5, a = pts[0], b = pts[pts.length - 1];
      pts = pts.map((p, i) => { const u = i / (pts.length - 1); return [lerp(p[0], lerp(a[0], b[0], u), k * 0.5) + (h1(drawingIndex(lt) + i) - 0.5) * 3 * k, lerp(p[1], lerp(a[1], b[1], u), k * 0.5)]; });
    }
    let upper = null;
    if (dt >= 0) { // snapped: lower half falls slack from the ground anchor, upper half whips up then hangs
      const cut = 13, tq = q(dt, 2);
      const lower = pts.slice(0, cut + 1).map((p, i) => { const u = i / cut, fall = Math.min(1, tq * 2.2); return [p[0] + Math.sin(tq * 9 + i) * 4 * (1 - fall) * u, lerp(p[1], pts[0][1] - 6 + u * u * 20, fall * u)]; });
      const top = pts[pts.length - 1];
      upper = pts.slice(cut).map((p, i, arr) => { const u = 1 - i / (arr.length - 1); const whip = Math.exp(-tq * 3) * Math.sin(tq * 14 - u * 3) * 60 * u; const hang = Math.min(1, tq * 1.6); return [lerp(p[0], top[0] + Math.sin(u * 4 + tq * 3) * 10 * u, hang) + whip, lerp(p[1], top[1] + u * 140, hang)]; });
      pts = lower;
    }
    for (const seg of upper ? [pts, upper] : [pts]) {
      LW = 1; ink(c, seg, 5, P.ivy1, { t0: 0.04, t1: 0.3 }); ink(c, seg, 1.8, P.ivyH, { t0: 0.1, t1: 0.3 });
      seg.forEach((p, i) => { if (i % 3 === 1) leaf(c, p[0], p[1], (i % 2 ? 1.2 : -1.2) - 1.57 + (dt > 0 ? Math.sin(q(lt, 2) * 8 + i) * 0.5 : 0), 13 + (i * 7 % 9), P, L); });
    }
    // torn leaves tumbling down
    if (dt > 0 && dt < 2.5) for (let k = 0; k < 4; k++) { const rr = mulberry(s.seed * 10 + k), tq = q(dt, 2); const x = s.pts[13][0] + (rr() - 0.5) * 60 + Math.sin(tq * 3 + k) * 20, y = s.pts[13][1] + tq * tq * 90 * (0.6 + rr()); if (y < 660) leaf(c, x, y, tq * 4 + k, 12, P, L); }
  }
}
function shotWheels(c, lt, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(SCN.wheels, 0, 0);
  const P = PAL0;
  const head = 1;
  const L = { kx: -0.9, ky: -0.4, kc: '#ffae4a', cx: 0.2, cy: -1, cc: '#78c0e8', spec: 1 };
  // body rocking on its springs (hand keyed, on twos)
  const rock = keyLin([[0, 0], [0.5, 0], [0.75, -9], [1.0, 4], [1.35, -12], [1.7, 7], [2.05, -6], [2.4, 3], [3.0, -10], [3.35, 6], [3.8, -4], [4.3, 2], [4.6, -7], [5.0, 3], [5.4, -2], [6.5, 0]], q(lt, 2));
  const rot = lt < 4.6 ? 0 : 0.42 * (q(lt, 2) - 4.6) ** 2;
  celLayer(c, (k) => {
    // bogie frame behind? draw wheels first
    for (const [i, w] of WC.entries()) bigWheel(k, w[0], w[1], 13 * WK, rot + i * 0.4, P, L, { seed: 41 + i });
    setLW(1.4);
    // axle boxes, side frame, leaf spring (frame moves a little with the body)
    const fy = WRAIL - 27 * WK + rock * 0.3;
    for (const w of WC) cel(k, rrect(w[0] - 34, w[1] - 46, 68, 70, 8, 3), P.steel1, { line: 2.4, inside: (k) => { k.fillStyle = P.steel2; k.fillRect(w[0] + 8, w[1] - 50, 40, 80); rustBlot(k, w[0] - 10, w[1] - 20, 10, mulberry(w[0]), P.steel1, P); }, rim: [[L.kx, L.ky, L.kc, 2, 0.4]] });
    const frame = wob(subdiv([[-30, fy], [990, fy], [990, fy + 80], [WC[1][0] + 120, fy + 84], [WC[1][0] + 60, fy + 120], [WC[1][0] - 60, fy + 120], [WC[1][0] - 120, fy + 84], [WC[0][0] + 120, fy + 84], [WC[0][0] + 60, fy + 120], [WC[0][0] - 60, fy + 120], [WC[0][0] - 120, fy + 84], [-30, fy + 84]], 8, true), 4, 1.2, 0.03, true);
    cel(k, frame, P.steel, { line: 3, inside: (k) => { k.fillStyle = P.steel1; k.fillRect(-30, fy + 50, 1020, 80); const r = mulberry(8); for (let i = 0; i < 30; i++) rustBlot(k, r() * 960, fy + 10 + r() * 80, 3 + r() * r() * 14, r, P.steel, P); air(k, 200, fy + 20, 300, L.kc, 0.3, 1, 0.2); }, rim: [[L.cx, L.cy, L.cc, 2.2, 0.5], [L.kx, L.ky, L.kc, 2.4, 0.4]] });
    for (let i = 0; i < 5; i++) { const sp = qb([380 + i * 4, fy - 10 + i * 14 + rock * 0.6], [490, fy + 26 + i * 14 + rock * 0.8], [600 - i * 4, fy - 10 + i * 14 + rock * 0.6], 12); ink(k, sp, 9, INK); ink(k, sp, 6, i % 2 ? P.steel1 : P.steel); ink(k, sp.slice(2, 10), 1.4, css(L.cc, 0.6)); }
    // body skirt above, rocking
    k.save(); k.translate(480, 300); k.rotate(rock * 0.0016); k.translate(-480, -300 + rock);
    const sk = wob(subdiv([[-40, -40], [1000, -40], [1000, 218], [-40, 222]], 10, true), 6, 1.4, 0.03, true);
    cel(k, sk, P.teal, { line: 3.2, inside: (k) => { k.fillStyle = P.teal1; k.fillRect(-40, 160, 1100, 80); k.fillStyle = P.teal2; k.fillRect(-40, 204, 1100, 30); const r = mulberry(21); for (let i = 0; i < 40; i++) rustBlot(k, r() * 960, 20 + r() * 220, 2 + r() * r() * 12, r, P.teal, P); air(k, 160, 120, 360, L.kc, 0.22, 1, 0.5); air(k, 600, 40, 500, P.tealH, 0.1, 1, 0.12); }, rim: [[L.kx, L.ky, L.kc, 2.4, 0.4]] });
    for (let x = 26; x < 960; x += 40) { rivetDome(k, x, 186, 5, P, P.teal1); rivetDome(k, x, 30, 5, P, P.teal); }
    ink(k, subdiv([[-40, 218], [1000, 216]], 10), 2.2, L.kc, { var: 0.6 });
    // step at the left edge
    cel(k, [[-20, 218], [120, 218], [116, 290], [-16, 290]], P.steel1, { line: 2.6, inside: (k) => { rustBlot(k, 120, 300, 16, mulberry(3), P.steel1, P); } });
    k.restore();
    drawWheelIvy(k, lt, P, L);
  }, { fall: [140, 0, 960, 300, '#04060e', 0.55], cache: 'wheels', key: drawingIndex(lt, 2) });
  // rust flakes cracking off when the motor strains (gravity, tumbling, on twos)
  const d = drawingIndex(lt, 2);
  const pops = [[1.4, 330, 420], [1.6, 160, 560], [2.1, 700, 380], [2.3, 820, 560], [2.6, 250, 330], [3.1, 600, 470], [3.4, 760, 330], [4.7, 150, 470], [4.9, 840, 470], [5.3, 330, 560]];
  for (const [t0, x, y] of pops) {
    const dt = q(lt, 2) - t0; if (dt < 0 || dt > 1.6) continue;
    const rr = mulberry(x * 7 + y);
    if (dt < 0.25) { c.save(); c.globalAlpha = 1 - dt * 4; air(c, x, y, 30 + dt * 120, '#7a4a2a', 0.5); c.restore(); }
    for (let k = 0; k < 7; k++) {
      const vx = (rr() - 0.5) * 300, vy = -80 - rr() * 160, px = x + vx * dt, py = y + vy * dt + 520 * dt * dt; if (py > 660) continue;
      const s = 3 + rr() * 6, a = dt * (6 + rr() * 10);
      const fl = [[px + Math.cos(a) * s, py + Math.sin(a) * s * 0.6], [px + Math.cos(a + 2) * s * 0.8, py + Math.sin(a + 2) * s * 0.5], [px + Math.cos(a + 4) * s, py + Math.sin(a + 4) * s * 0.7]];
      fillP(c, fl, k % 2 ? P.rust : P.rustD); LW = 1; inkC(c, fl, 0.7);
    }
  }
  rain(c, t, { seed: 88, area: { x: -40, y: 300, w: W + 80, h: 360 }, dens: 0.3, layers: [{ n: 80, len: [10, 24], w: 0.8, a: 0.2 }] });
  splashes(c, t, [{ x0: 0, x1: 960, y0: 636, y1: 700, n: 10, s: 2 }]);
  return { hal: 0.7 };
}
