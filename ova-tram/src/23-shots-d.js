// ───────────────────────── shots, act four: over the town, into the clouds, the reflection ─────────────────────────
const TOWER_H = 2600;
const PATH12 = (() => {
  const P = cat(
    bez([1040, 2440], [800, 2300], [520, 2120], [300, 1990], 26),
    bez([300, 1990], [150, 1900], [190, 1800], [320, 1770], 12),
    bez([320, 1770], [480, 1700], [640, 1520], [760, 1370], 22),
    bez([760, 1370], [880, 1240], [820, 1170], [720, 1150], 12),
    bez([720, 1150], [560, 1080], [420, 900], [330, 720], 22),
    bez([330, 720], [280, 600], [420, 380], [560, 270], 18));
  return { P, L: arclen(P) };
})();
const T12 = { uEnd: 0.86 };
function buildTower() {
  const cv = mkCanvas(W, TOWER_H), c = cv.getContext('2d'), rng = mulberry(7701);
  const g = c.createLinearGradient(0, 0, 0, 2060); g.addColorStop(0, '#080c26'); g.addColorStop(0.5, '#10163a'); g.addColorStop(1, '#262a4c');
  c.fillStyle = g; c.fillRect(0, 0, W, TOWER_H);
  for (let i = 0; i < 500; i++) { c.fillStyle = css('#e8eeff', 0.3 + rng() * 0.6); const s = rng() < 0.1 ? 1.4 : 0.8; c.fillRect(rng() * W, rng() * 1900, s, s); }
  // moonlit clouds painted at half resolution (soft), brushed at full
  const half = mkCanvas(W / 2, TOWER_H / 2), hc = half.getContext('2d');
  const moonTint = (x, y) => { const d = Math.hypot(x * 2 - 560, y * 2 - 270); const k = clamp(1 - d / 900) * 0.6; return [255, 200, 120, k * 0.5]; };
  paintClouds(hc, 0, 0, W / 2, TOWER_H / 2, { seed: 121, scale: 110, stretch: 0.5, th: 0.55, soft: 0.07, dark: '#10163a', mid: '#262c58', lit: '#d8b088', lx: 0.3, ly: -1, alphaOut: true, prof: (v) => -Math.abs(v - 0.55) * 0.35 + (v < 0.12 ? -0.2 : 0), deep: 0.25, tint: moonTint, brush: false });
  c.drawImage(half, 0, 0, W, TOWER_H);
  brushwork(c, { x: 0, y: 0, w: W, h: 2000 }, '#1a2048', { seed: 5, dens: 0.0025, len: 40, wid: 10, alpha: 0.14, var: 0.35, ang: -0.15, angVar: 0.5 });
  paintMoon(c, 560, 270, 130);
  // horizon, sea with moon road, the town below
  paintPoly(c, [[-10, 2040], [970, 2034], [970, 2100], [-10, 2100]], '#0a1226', { dens: 0.03, len: 30, wid: 2, ang: 0, angVar: 0.03 });
  for (let i = 0; i < 90; i++) { const y = 2040 + rng() * 58, x = 560 + (rng() - 0.5) * (30 + (y - 2036) * 3); bline(c, [[x - 6, y], [x + 6, y]], 1, '#ffd890', 0.3 + rng() * 0.5); }
  paintPoly(c, [[-10, 2036], [140, 2014], [300, 2008], [420, 2030], [-10, 2040]], '#0c1020', { strokes: 0 });
  roofscape(c, null, -30, 990, 2100, 2590, rng, { rows: 15, street: true, s0: 0.3, s1: 1.35, litP: 0.25 });
  // wires over the nearest roofs
  for (let k = 0; k < 6; k++) bline(c, sag(-20, 2380 + k * 30, 980, 2330 + rng() * 120, 30, 30), 1.2, '#05060c', 0.95, k);
  applyPaper(c, W, TOWER_H, 0.2);
  return cv;
}
function buildCloudBank(seed, w, h, lit) {
  const half = mkCanvas(w / 2, h / 2), c = half.getContext('2d');
  paintClouds(c, 0, 0, w / 2, h / 2, { seed, scale: 46, stretch: 0.6, th: 0.38, soft: 0.1, dark: '#1a1e44', mid: '#343868', lit: lit || '#f0c890', lx: 0.4, ly: -1, alphaOut: true, prof: (v) => -(((v - 0.5) * 2) ** 2) * 0.3, deep: 0.2, brush: false });
  c.globalCompositeOperation = 'destination-in'; const g = c.createRadialGradient(w / 4, h / 4, Math.min(w, h) * 0.12, w / 4, h / 4, Math.min(w, h) * 0.26); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, w / 2, h / 2);
  return half;
}
function tram12(t) { // position along the path, scale, facing, tilt
  const lt = t - 55.6, u = clamp(0.02 + (lt / 9.4) * T12.uEnd * (0.85 + 0.15 * lt / 9.4));
  const [x, y, a] = sampleCurve(PATH12.P, u), dx = Math.cos(a), dy = Math.sin(a);
  const right = dx > 0, tilt = clamp(right ? Math.atan2(-dy, dx) : Math.atan2(-dy, -dx), -0.7, 0.7);
  return { u, x, y, right, tilt, s: lerp(1.05, 0.42, u) };
}
function shotTower(c, lt, t) {
  const tr = tram12(t), camY = clamp(tr.y - 430 - 260 * ss(6.5, 9.4, lt), 0, TOWER_H - H);
  c.setTransform(1, 0, 0, 1, 0, -camY);
  c.drawImage(SCN.tower, 0, 0);
  // rails of light, full length, with sleepers
  const P = PATH12.P;
  lightLine(c, P.map(([x, y]) => [x, y - 5]), 1.8, '#ffcf6a', 1); lightLine(c, P.map(([x, y]) => [x, y + 3]), 1.8, '#ffcf6a', 1);
  for (let u = 0.004; u < 1; u += 0.006) { const [x, y, a] = sampleCurve(P, u); if (y < camY - 40 || y > camY + H + 40) continue; lightPoly(c, hb(x, y - 1, 8 * lerp(1.1, 0.5, u), 1.6, a + Math.PI / 2), '#ffc456', 0.75); }
  // trailing sparks: where the pantograph was a moment ago
  for (let k = 1; k <= 14; k++) {
    const pt = tram12(q(t, 2) - k / 24), hh = 150 * pt.s, ax = pt.x + Math.sin(pt.tilt) * hh * (pt.right ? 1 : -1), ay = pt.y - Math.cos(pt.tilt) * hh - 40 * pt.s;
    const rr = mulberry(drawingIndex(t, 2) * 31 + k);
    c.save(); c.globalAlpha = 1 - k / 15; sparkBurst(c, ax + (rr() - 0.5) * 20, ay + k * 3 + (rr() - 0.5) * 10, (10 - k * 0.5) * pt.s + 2, drawingIndex(t, 2) * 7 + k, { glow: '#ffb040', edge: '#ffe08a', shards: 2, smear: 0.6 }); c.restore();
  }
  const bell = [[0.8, 1.6], [4.2, 5.0], [7.4, 8.2]].some(([a, b]) => lt > a && lt < b) ? Math.sin(q(lt, 2) * 24) * 0.4 : 0;
  const L = { kx: tr.right ? 0.4 : -0.4, ky: -0.9, kc: '#ffd070', cx: 0, cy: -1, cc: '#9ad8ff', fall: '#3a4066', spec: 1.2, specX: -60, warm: 0.12 };
  const pal = tintPal('#ffb860', 0.08, 0, 'gold');
  const o = celLayer(c, (k) => tramSide(k, tr.x, tr.y, tr.s, { L, pal, flip: tr.right, tilt: tr.tilt, head: 1.3, win: 1, panto: 0.96, ivy: 0, wrot: lt * 9, blur: 1, bell, ground: false, sway: q(t, 2) * 4 }));
  c.setTransform(1, 0, 0, 1, 0, 0);
  glow(c, o.head[0], o.head[1], 70 * tr.s + 20, '#ffc060', 0.7); flare(c, o.head[0], o.head[1], 120 * tr.s + 30, '#ffe8b0', 0.7, tr.tilt);
  sparkBurst(c, o.pan[0], o.pan[1], 16 * tr.s + 6, drawingIndex(t, 2) * 3, { glow: '#ffb040', edge: '#ffe08a', smear: 1, smearAng: tr.right ? Math.PI : 0, shards: 6 });
  // cloud banks that hide the switchbacks
  c.setTransform(1, 0, 0, 1, 0, -camY);
  c.drawImage(SCN.bankA, 230 - 360, 1880 - 260, 720, 520);
  c.drawImage(SCN.bankB, 820 - 380, 1260 - 260, 760, 520);
  c.setTransform(1, 0, 0, 1, 0, 0);
  rain(c, t, { seed: 12, dens: 0.7, col: '#b8c8f0', lights: [{ x: o.head[0], y: o.head[1], r: 240, col: '#ffd27a', a: 0.6 }], gold: (x, y) => clamp(1 - Math.hypot(x - o.head[0] + 60, y - o.head[1] + 30) / 260) });
  return { hal: 0.95 };
}
// S13: threading into the clouds
function buildClouds13() {
  const mk = (seed, lx, ly) => { const h = mkCanvas(480, 360), c = h.getContext('2d'); paintClouds(c, 0, 0, 480, 360, { seed, scale: 105, stretch: 0.6, th: 0.44, soft: 0.12, dark: '#1c1c44', mid: '#3a3a70', lit: '#ffd8a0', lx, ly, l1: 0.006, l2: 0.022, alphaOut: true, deep: 0.25, brush: false, prof: (v) => 0 });
    c.globalCompositeOperation = 'destination-in'; const g = c.createRadialGradient(240, 180, 90, 240, 180, 235); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 480, 360); return h; };
  return { a: mk(131, 0.8, -0.4), b: mk(132, -0.8, -0.4), c: mk(133, 0, 1), d: mk(134, 0.3, -0.8) };
}
function shotClouds(c, lt, t) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  const g = c.createRadialGradient(480, 300, 40, 480, 300, 700); g.addColorStop(0, '#5a4a6a'); g.addColorStop(0.5, '#1c1e44'); g.addColorStop(1, '#0a0c24'); c.fillStyle = g; c.fillRect(0, 0, W, H);
  paintMoonCached(c, lt);
  const K = SCN.c13, sp = (lt / 4.5) ** 1.6;
  const lay = (cv, x, y, sc, dx, dy, a = 1) => { c.save(); c.globalAlpha = a; c.drawImage(cv, x + dx * sp, y + dy * sp, 960 * sc, 720 * sc); c.restore(); };
  lay(K.c, -240, -420, 1.4, 0, -260);
  // the car, small and far, climbing toward the light
  const u = clamp(lt / 3.7), px = lerp(170, 476, u ** 0.8), py = lerp(600, 306, u ** 0.9), s = lerp(0.34, 0.025, u ** 0.7);
  const L = { kx: 0.6, ky: -0.8, kc: '#ffe0a0', cx: 0, cy: -1, cc: '#bfe8ff', spec: 1.4 };
  if (u < 0.97) { const o = celLayer(c, (k) => tramSide(k, px, py, s, { L, pal: tintPal('#ffc070', 0.2, 0.05, 'c13'), flip: true, tilt: 0.45 * (1 - u), head: 1.4, win: 1, panto: 0.96, ivy: 0, ground: false, blur: 1 })); glow(c, o.head[0], o.head[1], 40, '#ffc060', 0.7); sparkBurst(c, o.pan[0], o.pan[1], 8, drawingIndex(t, 2), { glow: '#ffb040', edge: '#ffe08a', shards: 3 }); }
  for (let k = 1; k < 10; k++) { const uu = clamp((lt - k * 0.06) / 3.7); const x = lerp(170, 476, uu ** 0.8), y = lerp(600, 306, uu ** 0.9) - lerp(40, 3, uu); c.save(); c.globalAlpha = (1 - k / 10) * 0.8; sparkBurst(c, x, y, lerp(6, 1.5, uu), drawingIndex(t, 2) * 5 + k, { glow: '#ffb040', edge: '#ffe08a', shards: 1 }); c.restore(); }
  if (u >= 0.9) flare(c, 478, 304, 60 + 200 * ss(3.6, 4.4, lt), '#fff4d0', 1, 0.2);
  lay(K.a, -620, -60, 1.25, -380, 60);
  lay(K.b, 380, -40, 1.25, 400, 40);
  lay(K.d, -200, 300, 1.5, -100, 380);
  // the clouds glow as they part
  c.save(); c.globalCompositeOperation = 'lighter'; air(c, 480, 300, 380 + sp * 300, '#ffc878', 0.25 + 0.35 * sp); c.restore();
  rain(c, t, { seed: 13, dens: 0.4 * (1 - sp), col: '#ffe0b0', layers: [{ n: 120, len: [10, 22], w: 0.8, a: 0.25 }] });
  return { hal: 1, th: 120, white: lt > 4.0 ? ss(4.0, 4.5, lt) * 0.95 : 0 };
}
let _moon13 = null;
function paintMoonCached(c, lt) { if (!_moon13) { _moon13 = mkCanvas(W, H); paintMoon(_moon13.getContext('2d'), 480, 300, 210); } c.drawImage(_moon13, 0, 0); }
// S14: the empty rails at street level; the trail becomes stars; the cat comes out to watch
const PUD14 = [[60, 640], [200, 606], [420, 600], [640, 604], [860, 598], [940, 630], [900, 690], [700, 712], [420, 716], [180, 706], [70, 680]];
const TRAIL = bez([286, 548], [380, 360], [620, 180], [840, 70], 60);
function shotEnd(c, lt, t) {
  const A = SCN.termEnd, z = lerp(1.07, 1.0, ss(0, 10.5, lt)), ox = 520 * (1 - z), oy = 430 * (1 - z);
  c.setTransform(z, 0, 0, z, ox, oy);
  c.drawImage(A.cv, 0, 0);
  c.globalCompositeOperation = 'lighter'; c.drawImage(A.lamp, 0, 0); c.globalCompositeOperation = 'source-over';
  // the trail across the sky, dissolving into a line of stars from the ground up
  const ff = ss(1.0, 8.0, lt), tw = drawingIndex(t, 3);
  const n = TRAIL.length;
  const lineFrom = Math.floor(ff * n);
  if (lineFrom < n - 1) lightLine(c, TRAIL.slice(lineFrom), 2.2, '#ffcf6a', 0.9 * (1 - ss(6, 9, lt)));
  for (let i = 0; i < lineFrom; i += 2) {
    const [x, y] = TRAIL[i], a = 0.55 + 0.45 * h1(i * 7 + tw * 0.31), big = i % 8 === 0;
    c.save(); c.globalCompositeOperation = 'lighter'; glow(c, x, y, big ? 9 : 5, '#ffe0a0', 0.5 * a); c.fillStyle = css('#fff6e0', a); c.fillRect(x - (big ? 1.5 : 1), y - (big ? 1.5 : 1), big ? 3 : 2, big ? 3 : 2); if (big) flare(c, x, y, 14 * a, '#fff6e0', 0.8); c.restore();
  }
  // torn ivy lying on the empty rails, a few rust flakes
  celLayer(c, (k) => {
    setLW(1.4);
    const P = PAL0, L = { kx: -0.9, ky: -0.45, kc: '#ffae4a', cx: 0.15, cy: -1, cc: '#8ab8e8' };
    const rr = mulberry(1414);
    for (let s = 0; s < 6; s++) { const x0 = 440 + rr() * 420, pts = []; for (let k2 = 0; k2 <= 10; k2++) pts.push([x0 + k2 * 5 + Math.sin(k2 + s) * 3, 556 + Math.sin(k2 * 0.7 + s) * 3 + rr() * 2]); ink(k, pts, 1.6, P.ivy1); pts.forEach((p, i) => { if (i % 3 === 1) leaf(k, p[0], p[1], -1.57 + (rr() - 0.5) * 2, 4 + rr() * 2, P, L); }); }
    for (let i = 0; i < 20; i++) { const x = 440 + rr() * 440, y = 563 + rr() * 8; fillP(k, [[x, y], [x + 2 + rr() * 2, y - 1], [x + 3, y + 1.5]], P.rust); }
    // the cat
    const walkT = 1.6, sitT = 4.6, x = lt < walkT ? 222 : lt < sitT ? lerp(222, 338, (lt - walkT) / (sitT - walkT)) : 338;
    const cl = { kx: -0.9, ky: -0.4, kc: '#ffae4a', cx: 0.4, cy: -1, cc: '#c8d8ff' };
    if (lt < sitT) catSide(k, x, 575, 1.05, 'walk', drawingIndex(lt, 2) % 4, { L: cl });
    else catSide(k, x, 575, 1.05, lt < 5.8 ? 'sit' : 'look', 0, { L: cl, flick: (lt > 7.2 && lt < 7.5) || (lt > 8.6 && lt < 8.85) ? 4 : 0, shine: lt > 5.8 ? 0.5 : 0 });
  });
  // weeds in front of where the cat comes from
  c.save(); const wr = mulberry(1500); weeds(c, 190, 262, 582, 52, wr, { dens: 1.6, col: '#05080a', col2: '#101a14', hiP: 0.5 }); c.restore();
  // puddle holding the sky
  const P = PUD14.map(p => [p[0] * z + ox, p[1] * z + oy]);
  reflect(c, c.canvas, P, 452 * z + oy, t, { amp: 1.2, alpha: 0.92, tint: '#0a1430', tintA: 0.18, rimCol: '#9ab8e8' });
  c.setTransform(z, 0, 0, z, ox, oy);
  c.save(); clipP(c, PUD14); c.globalCompositeOperation = 'lighter'; air(c, 226, 660, 50, '#ff9a3a', 0.45, 0.45, 1.6); c.restore();
  const drz = 1 - ss(0.5, 5.0, lt);
  ripples(c, t, PUD14, { n: Math.round(1 + 8 * drz), lights: [{ x: 226, y: 660, r: 120, col: '#ffb060' }] });
  if (drz > 0.02) rain(c, t, { seed: 14, dens: 0.4 * drz, lights: [{ x: 226, y: 220, r: 170, col: '#ffb050', a: 0.6 }] });
  fgDraw(c, SCN.fg14, t, 0.6);
  c.setTransform(1, 0, 0, 1, 0, 0);
  return { fade: Math.min(ss(0, 0.2, lt) * 0.0 + 1, 1 - ss(9.4, 10.5, lt)), white: lt < 0.7 ? (1 - lt / 0.7) * 0.9 : 0 };
}
