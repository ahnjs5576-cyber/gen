// ───────────────────────── shots, act three: the rails of light ─────────────────────────
function paintMoon(c, x, y, r, o = {}) {
  const g = c.globalCompositeOperation;
  c.globalCompositeOperation = 'lighter'; air(c, x, y, r * 6, '#ffb860', 0.28 * (o.a ?? 1)); air(c, x, y, r * 2.4, '#ffe2a0', 0.4 * (o.a ?? 1)); c.globalCompositeOperation = g;
  const disc = wob(ell(x, y, r, r, 48), 9, r * 0.012, 0.1, true);
  fillP(c, disc, '#fff3d4');
  c.save(); clipP(c, disc);
  const rng = mulberry(o.seed || 12);
  for (let i = 0; i < 9; i++) { const a = rng() * TAU, d = rng() * r * 0.7, s = r * (0.12 + rng() * 0.22); c.fillStyle = css('#e8cf9a', 0.55); c.beginPath(); c.ellipse(x + Math.cos(a) * d, y + Math.sin(a) * d, s, s * 0.8, rng() * 3, 0, TAU); c.fill(); }
  c.fillStyle = css('#e6c68a', 0.5); c.beginPath(); c.arc(x + r * 0.35, y + r * 0.3, r * 0.95, 0, TAU); c.fill();
  air(c, x - r * 0.3, y - r * 0.3, r * 0.8, '#ffffff', 0.5);
  c.restore();
}
// S9 background: on the bluff, looking out over the town and the sea
const TRACK9 = (() => {
  const P = cat(bez([420, 602], [340, 600], [262, 592], [214, 560], 16), bez([214, 560], [166, 528], [150, 470], [168, 420], 16), bez([168, 420], [190, 360], [330, 280], [470, 220], 22), bez([470, 220], [540, 190], [580, 166], [600, 150], 12));
  const L = arclen(P), tot = L[L.length - 1], sleepers = [];
  const wid = (u) => lerp(10, 1.1, u ** 0.6);
  let s = 6; while (s < tot) { const u = s / tot, [x, y, a] = sampleCurve(P, u); sleepers.push({ u, x, y, a, w: wid(u) }); s += lerp(15, 2.2, u ** 0.7); }
  const rails = (u1) => { const l = [], r = []; for (let k = 0; k <= 120; k++) { const u = k / 120 * u1, [x, y, a] = sampleCurve(P, u), w = wid(u) / 2; l.push([x + Math.sin(a) * w, y - Math.cos(a) * w]); r.push([x - Math.sin(a) * w, y + Math.cos(a) * w]); } return [l, r]; };
  return { P, sleepers, rails, wid };
})();
function buildBluff() {
  const cv = mkCanvas(W, H), c = cv.getContext('2d'), mv = mkCanvas(W, H), m = mv.getContext('2d'), cover = mkCanvas(W, H), k = cover.getContext('2d'), rng = mulberry(5501);
  rainSky(c, W, 360, { seed: 55, top: '#060918', mid: '#111a34', bot: '#262a48', glow: 0.35, gx: 400, clouds: { scale: 240, dark: '#0b0f20', mid: '#1a2240', lit: '#3a4670', dark2: '#151a32', mid2: '#262c4a', lit2: '#4a4e70' } });
  // the tear (final state): deep sky, the full moon, gold cloud rims
  c.save(); const tear = wob(ell(600, 150, 150, 92, 40), 4, 14, 0.04, true); clipP(c, tear);
  const g = c.createRadialGradient(600, 150, 10, 600, 150, 170); g.addColorStop(0, '#1c2448'); g.addColorStop(1, '#0a1028'); c.fillStyle = g; c.fillRect(0, 0, W, 360);
  for (let i = 0; i < 40; i++) { c.fillStyle = css('#e8eeff', 0.5 + rng() * 0.5); c.fillRect(450 + rng() * 300, 60 + rng() * 180, 1, 1); }
  c.restore();
  paintMoon(c, 600, 150, 46);
  // sea and horizon, moon glitter path on the gold layer
  paintPoly(c, [[-10, 330], [970, 326], [970, 372], [-10, 372]], '#0a1122', { seed: 6, dens: 0.03, len: 30, wid: 2, ang: 0, angVar: 0.03, var: 0.25 });
  paintPoly(c, [[700, 330], [780, 318], [880, 312], [970, 316], [970, 334], [700, 334]], '#0b0f1c', { strokes: 0 });
  for (let i = 0; i < 26; i++) { const x = 710 + rng() * 260; c.fillStyle = css('#ffc070', 0.7); c.fillRect(x, 320 + rng() * 10, 1.3, 1.2); }
  for (let i = 0; i < 60; i++) { const y = 334 + rng() * 36, x = 600 + (rng() - 0.5) * (20 + (y - 330) * 3); bline(m, [[x - 4 - rng() * 8, y], [x + 4 + rng() * 8, y]], 1, '#ffe0a0', 0.6 + rng() * 0.4); }
  for (let i = 0; i < 40; i++) { const x = rng() * W, y = 336 + rng() * 34; bline(c, [[x, y], [x + 4 + rng() * 10, y]], 0.8, rng() < 0.6 ? '#c89050' : '#6a88b0', 0.2 + rng() * 0.3); }
  // the sleeping town below the bluff
  roofscape(c, m, -20, 980, 372, 545, rng, { rows: 16, street: true, s0: 0.2, s1: 0.95, litP: 0.18 });
  // wire pole on the bluff + the dead wire
  bline(c, sag(980, 36, 720, 40, 3, 30), 1.6, '#06070a', 1); bline(c, qb([720, 40], [700, 52], [706, 78], 8), 1.4, '#06070a', 1); // the dead wire ends, snapped
  // bluff edge, weeds, fence, the embankment with the old rails
  paintPoly(c, [[-10, 560], [120, 548], [300, 556], [440, 566], [700, 572], [970, 568], [970, 730], [-10, 730]], '#0e1118', { seed: 7, dens: 0.03, len: 14, wid: 4, var: 0.35 });
  weeds(c, -10, 460, 586, 60, rng, { dens: 1.1, seedHeads: true });
  for (let x = 30; x < 400; x += 46 + rng() * 20) { paintRect(c, x, 548 + rng() * 6, 4, 38, '#2a2420', { strokes: 0, wob: 0.4 }); }
  bline(c, [[20, 560], [410, 566]], 1.2, '#2a2420', 0.9); bline(c, [[20, 572], [410, 577]], 1.2, '#2a2420', 0.9);
  for (let i = 0; i < 500; i++) { const x = 380 + rng() * 600, y = 590 + rng() * 130, s = 1 + rng() * 3 * (y / 600); c.fillStyle = css(mix('#1a1e26', '#3a3e48', rng()), 0.8); c.beginPath(); c.ellipse(x, y, s, s * 0.6, 0, 0, TAU); c.fill(); }
  for (let x = 424; x < 980; x += 20) paintPoly(c, [[x, 600], [x + 12, 600], [x + 14, 612], [x - 2, 612]], '#251e1c', { dens: 0.1, len: 4, wob: 0.4 });
  for (const ry of [598, 607]) { paintPoly(c, [[426, ry], [980, ry - 0.5], [980, ry + 4], [426, ry + 4]], '#3a2a22', { dens: 0.08, len: 6, wid: 1.5, wob: 0.3 }); bline(c, [[426, ry + 0.4], [980, ry]], 1, '#8aa4bc', 0.45); }
  paintPoly(c, [[426, 598], [414, 590], [406, 588], [405, 591], [414, 595], [426, 602]], '#3a2620', { dens: 0.1, wob: 0.4 });
  weeds(c, 380, 520, 612, 50, rng, { dens: 1.2 });
  weeds(c, 700, 980, 726, 90, rng, { dens: 0.8, col: '#06090c' });
  applyPaper(c, W, H, 0.22);
  // cloud cover hiding the moon: parts over time
  k.drawImage(cv, 0, 0, W, 360, 0, 0, W, 360);
  k.globalCompositeOperation = 'destination-in'; k.fillStyle = '#000'; k.beginPath(); k.ellipse(600, 150, 240, 150, 0, 0, TAU); k.fill(); k.globalCompositeOperation = 'source-over';
  paintClouds(k, 330, 0, 540, 330, { seed: 91, scale: 150, th: 0.3, soft: 0.12, dark: '#0c1022', mid: '#171e38', lit: '#2c3658', alphaOut: true, alpha: 1, prof: (v) => 0.12 - Math.abs(v - 0.45) * 0.35, brush: false });
  k.globalCompositeOperation = 'destination-in'; const kg = k.createRadialGradient(600, 150, 120, 600, 150, 260); kg.addColorStop(0, 'rgba(0,0,0,1)'); kg.addColorStop(1, 'rgba(0,0,0,0)'); k.fillStyle = kg; k.fillRect(0, 0, W, 360); k.globalCompositeOperation = 'source-over';
  return { cv, moon: mv, cover };
}
const TEAR_BLOB = wob(ell(0, 0, 1, 0.62, 40), 21, 0.13, 3, true);
function drawTear(c, B, open, t) {
  // cover with an irregular, growing hole; lit gold edge
  const T2 = drawTear.cv || (drawTear.cv = mkCanvas(W, H)), k = T2.getContext('2d');
  k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, W, H); k.globalCompositeOperation = 'source-over'; k.drawImage(B.cover, 0, 0);
  const r = 4 + open * 160, blob = TEAR_BLOB.map(([x, y]) => [600 + x * r * (1 + Math.sin(q(t, 3) * 0.6 + y) * 0.04), 150 + y * r]);
  if (open > 0) { k.globalCompositeOperation = 'destination-out'; fillP(k, blob, '#000'); k.globalCompositeOperation = 'source-over'; }
  c.drawImage(T2, 0, 0);
  if (open > 0.02) { c.save(); c.globalCompositeOperation = 'lighter'; const a = Math.min(1, open * 2); for (let i = 0; i < blob.length; i += 2) { const [x, y] = blob[i], dx = x - 600, dy = y - 150, dd = Math.hypot(dx, dy) || 1; air(c, x + dx / dd * 10, y + dy / dd * 8, 26 + h1(i) * 18, '#ffbe60', 0.16 * a); } c.restore(); }
}
function drawTrack9(c, uh, t) {
  const T = TRACK9, d = drawingIndex(t, 2);
  if (uh <= 0) return;
  for (const s of T.sleepers) {
    if (s.u > uh) break;
    const age = uh - s.u, fresh = age < 0.02 ? 1 : 0;
    const quad = hb(s.x, s.y, s.w * 1.05, Math.max(0.7, s.w * 0.17), s.a + Math.PI / 2);
    lightPoly(c, quad, fresh ? '#ffffff' : '#ffc456', fresh ? 1 : 0.85);
  }
  const [l, r] = T.rails(uh);
  for (const rail of [l, r]) lightLine(c, rail, Math.max(0.8, 2.2 * (1 - uh * 0.6)), '#ffcf6a', 0.95);
  const [hx, hy, ha] = sampleCurve(T.P, uh);
  sparkBurst(c, hx, hy, lerp(14, 4, uh), d * 17 + 3, { glow: '#ffb040', edge: '#ffd27a', shards: 5 });
  // raindrops drawn into the stitching
  const rr = mulberry(d * 61);
  c.save(); c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 10; k++) { const a = rr() * TAU, rad = (40 + rr() * 90) * (1 - uh * 0.7), sx = hx + Math.cos(a) * rad, sy = hy + Math.sin(a) * rad - 20; const ex = lerp(sx, hx, 0.55), ey = lerp(sy, hy, 0.55); c.strokeStyle = css('#ffd890', 0.5 + rr() * 0.4); c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.stroke(); }
  c.restore();
}
function shotStitch(c, lt, t) {
  const B = SCN.bluff;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(B.cv, 0, 0);
  const open = ss(3.8, 6.9, lt), moonL = ss(4.6, 7.0, lt);
  drawTear(c, B, open, t);
  if (moonL > 0) { c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = moonL; c.drawImage(B.moon, 0, 0); air(c, 600, 150, 420, '#ff9a40', 0.12); c.restore(); }
  const uh = lt < 1.2 ? 0 : Math.min(1, ((lt - 1.2) / 5.4) ** 0.8);
  const head = lt < 7.0 ? 1 : 1 + 0.6 * ss(7.0, 7.4, lt);
  const L = { kx: -0.6, ky: -0.8, kc: mixs('#6a6a8a', '#ffc860', moonL), cx: 0.1, cy: -1, cc: '#78c0e8', fall: '#3a4664', spec: 0.6 + moonL * 0.6, specX: -100 };
  const lean = lt > 7.5 ? keyHold([[7.5, 0.006], [7.7, 0.012], [7.95, 0.008]], lt) : 0;
  const o = celLayer(c, (k) => tramSide(k, 1113, 607, 2.2, { L, head, win: [1, 1, 1, 1, 1, 1, 1, 1], panto: 0.96, ivy: 0, sway: q(t, 2) * 3, lean }), { fall: [700, 0, 960, 0, '#050814', 0.35] });
  // headlamp beam toward the rail end – this is what wakes the track
  c.save(); c.globalCompositeOperation = 'lighter';
  const [hx, hy] = o.head;
  for (let k = 0; k < 7; k++) { const u = k / 6, bx = lerp(hx, 330, u), by = lerp(hy, 590, u); air(c, bx, by, 30 + u * 110, '#ffcf80', 0.16 * head * (1 - u * 0.6), 1.4, 0.55, Math.atan2(590 - hy, 330 - hx)); }
  glow(c, hx, hy, 60 * head, '#ffc060', 0.6); glow(c, hx, hy, 16, '#fffbe8', 1); flare(c, hx, hy, 70 * head, '#ffe8b0', 0.7, 0.05);
  c.restore();
  drawTrack9(c, uh, t);
  rain(c, t, { seed: 9, lights: [{ x: hx - 120, y: hy + 20, r: 200, col: '#ffcf70', a: 0.5, sy: 2 }, { x: 600, y: 150, r: 300, col: '#ffd890', a: 0.3 * moonL }], gold: (x, y) => { const [sx, sy] = sampleCurve(TRACK9.P, uh); return uh > 0 ? clamp(1 - Math.hypot(x - sx, y - sy) / 140) * 0.9 : 0; } });
  splashes(c, t, [{ x0: 400, x1: 960, y0: 600, y1: 720, n: 26, s: 1.4 }], { lights: [{ x: 360, y: 610, r: 160, col: '#ffcf70' }] });
  return { hal: 0.9 };
}
// S10: tracking alongside – heavy start, the rail end, the ground falls away
const TRK = { s: 3.4, ox: 560, oy: 560, railEnd: -700, edge: -860, k: 0.00018 };
const trkD = (lt) => 40 * Math.max(0, lt - 0.55) ** 2.5;
const trkY = (wx) => wx > TRK.railEnd ? 0 : -TRK.k * (TRK.railEnd - wx) ** 2;
function buildTrackStrip() {
  const cv = mkCanvas(3000, 320), c = cv.getContext('2d'), rng = mulberry(6601), X = (wx) => wx + 2400, Y = (sy) => sy - 500;
  // embankment & ballast up to the bluff edge
  const ex = X(TRK.edge);
  paintPoly(c, [[ex, Y(566)], [3000, Y(562)], [3000, 320], [ex - 60, 320], [ex - 30, Y(640)]], '#14171e', { seed: 3, dens: 0.04, len: 8, wid: 3, var: 0.4, angVar: 1.5 });
  for (let i = 0; i < 2600; i++) { const x = ex + rng() * (3000 - ex), y = Y(568) + rng() * 240; c.fillStyle = css(mix('#22262e', '#464a54', rng()), 0.7); c.beginPath(); c.ellipse(x, y, 1.5 + rng() * 3, 1 + rng() * 1.5, rng() * 3, 0, TAU); c.fill(); }
  for (let x = X(TRK.railEnd) - 30; x < 3000; x += 22 + rng() * 5) { const sk = (rng() - 0.5) * 2; paintPoly(c, [[x, Y(566) + sk], [x + 15, Y(566)], [x + 16, Y(576)], [x - 1, Y(576) + sk]], '#2a2220', { dens: 0.1, len: 4, wid: 1.5, wob: 0.4 }); }
  const r0 = X(TRK.railEnd);
  paintPoly(c, [[r0, Y(560)], [3000, Y(559.5)], [3000, Y(567)], [r0, Y(567)]], '#3a2a22', { dens: 0.08, len: 8, wid: 1.5, wob: 0.3 });
  bline(c, [[r0, Y(560.6)], [3000, Y(560)]], 1.6, '#a8bccc', 0.5);
  for (let k = 0; k < 120; k++) rustBlot(c, r0 + rng() * (3000 - r0), Y(562) + rng() * 4, 1.5 + rng() * 3, rng, '#3a2a22', PAL0, 0);
  paintPoly(c, [[r0, Y(560)], [r0 - 16, Y(550)], [r0 - 28, Y(546)], [r0 - 29, Y(550)], [r0 - 16, Y(557)], [r0, Y(567)]], '#3a2620', { dens: 0.1, wob: 0.4 });
  // weeds, fence posts, a signal post along the line; the bluff edge drops away
  weeds(c, ex - 40, 3000, Y(574), 50, rng, { dens: 0.5, seedHeads: true });
  weeds(c, ex - 60, ex + 300, Y(600), 80, rng, { dens: 1.4 });
  for (let x = ex + 80; x < 3000; x += 150 + rng() * 80) { paintRect(c, x, Y(500), 7, 70, '#2a2420', { dens: 0.08, ang: Math.PI / 2, wob: 0.4 }); bline(c, [[x + 1, Y(500)], [x + 1, Y(570)]], 1, '#6a7888', 0.4); }
  paintPoly(c, [[ex - 60, 320], [ex - 30, Y(640)], [ex, Y(566)], [ex - 10, Y(580)], [ex - 80, 320]], '#0a0c12', { dens: 0.05 });
  applyPaper(c, 3000, 320, 0.2);
  return cv;
}
function buildFarTown() {
  const cv = mkCanvas(1400, 1300), c = cv.getContext('2d'), m = null, rng = mulberry(6701);
  rainSky(c, 1400, 760, { seed: 67, top: '#070a1c', mid: '#141c3a', bot: '#2c2c4c', glow: 0.3, gx: 300, clouds: { scale: 260, dark: '#0d1226', mid: '#1e2648', lit: '#a08a78', dark2: '#161c38', mid2: '#2a3050', lit2: '#c8a070', lx: -0.6 } });
  paintMoon(c, 260, 170, 70);
  paintPoly(c, [[-10, 740], [1410, 736], [1410, 800], [-10, 800]], '#0b1224', { dens: 0.03, len: 30, wid: 2, ang: 0, angVar: 0.03 });
  for (let i = 0; i < 80; i++) { const y = 744 + rng() * 50, x = 260 + (rng() - 0.5) * (30 + (y - 740) * 4); bline(c, [[x - 6, y], [x + 6, y]], 1, '#ffd890', 0.4 + rng() * 0.4); }
  roofscape(c, null, -20, 1420, 800, 1290, rng, { rows: 18, street: true, s0: 0.25, s1: 1.1, litP: 0.22 });
  applyPaper(c, 1400, 1300, 0.2);
  return cv;
}
function shotTrack(c, lt, t) {
  const d = trkD(lt), wxT = -d, rise = -trkY(wxT);
  c.setTransform(1, 0, 0, 1, 0, 0);
  // far layer (slow parallax), mid strip, rails of light, then the car
  c.drawImage(SCN.far, -220 + d * 0.06, -300 + rise * 0.45 - 40);
  const X = (wx) => wx + d + TRK.ox, Y = (y) => y + rise;
  c.drawImage(SCN.strip, X(-2400), Y(500));
  // light rails beyond the rail end, built and waiting
  const pts = [], sl = [];
  for (let wx = TRK.railEnd; wx > TRK.railEnd - 2600; wx -= 12) pts.push([X(wx), Y(560 + trkY(wx))]);
  lightLine(c, pts, 2.6, '#ffcf6a', 1);
  for (let wx = TRK.railEnd - 8; wx > TRK.railEnd - 2600; wx -= 28) { const x = X(wx); if (x < -40 || x > 1000) continue; const y = Y(566 + trkY(wx)), a = Math.atan(2 * TRK.k * (TRK.railEnd - wx)); lightPoly(c, hb(x, y, 10, 2.2, -a), '#ffc456', 0.85); }
  // the car: rocks before the wheels catch, then accelerates hard
  const fwx = wxT - 82 * TRK.s, rwx = wxT + 82 * TRK.s;
  const tilt = Math.atan2(trkY(rwx) - trkY(fwx), rwx - fwx);
  const lean = keyLin([[0, 0], [0.15, 0.012], [0.35, -0.008], [0.5, 0.004], [0.7, 0], [1.6, -0.006], [2.2, 0.0]], q(lt, 2));
  const rot = d / (13 * TRK.s), spin = (trkD(lt + 0.05) - d) / 0.05 / (13 * TRK.s);
  const L = { kx: -0.7, ky: -0.7, kc: '#ffc860', cx: 0.2, cy: -1, cc: '#7ac8f0', fall: '#3a4466', spec: 1.1, specX: -40 };
  const bell = lt > 1.0 && lt < 2.2 ? Math.sin(q(lt, 2) * 22) * 0.35 * (2.2 - lt) : 0;
  const o = celLayer(c, (k) => tramSide(k, TRK.ox, TRK.oy + (trkY(wxT) + rise), TRK.s, { L, tilt, lean, head: 1.3, win: 1, panto: 0.96, ivy: 0, wrot: rot, blur: spin > 9 ? 1 : 0, bell, sway: q(t, 2) * 5, ground: rise < 20 }), { fall: [300, 0, 960, 0, '#050814', 0.3] });
  // wheel sparks where steel meets light
  const wheels = [-102, -62, 62, 102];
  for (const wl of wheels) {
    const wx = wxT + wl * TRK.s, dd = TRK.railEnd - wx;
    if (dd > -10 && dd < 140) { const x = X(wx), y = Y(560 + trkY(wx)); sparkBurst(c, x, y, 24, drawingIndex(lt, 1) * 7 + wl, { glow: '#ffb040', edge: '#ffd27a', smear: 1.2, smearAng: 0, shards: 10, grav: 0.4 }); }
  }
  if (lt > 2.2) { const dk = drawingIndex(lt, 2); sparkBurst(c, o.head[0] + 520 + 130 * TRK.s * 0, -10, 1, 1, { shards: 0 }); for (let k = 0; k < 5; k++) { const rr = mulberry(dk * 9 + k); LW = 1; ink(c, [[580 + rr() * 360, 30 + rr() * 60], [960 + rr() * 80, 40 + rr() * 60]], 1.6, css('#ffe0a0', 0.6), { t0: 0.1, t1: 0.8 }); } }
  // speed: streaking foreground weeds & lines, on twos
  const v = (trkD(lt + 0.05) - d) / 0.05;
  if (v > 200) { const dk = drawingIndex(lt, 2), rr = mulberry(dk * 3 + 1); for (let k = 0; k < Math.min(26, v / 40); k++) { const y = 600 + rr() * 130 + rise * 0.5, x = rr() * W; LW = 1; ink(c, [[x, y], [x + 80 + rr() * 200, y + (rr() - 0.5) * 4]], 1 + rr() * 2.5, css(rr() < 0.5 ? '#0c1018' : '#6a7a90', 0.6), { t0: 0.05, t1: 0.95 }); } }
  rain(c, t, { seed: 10, ang: 0.22 + Math.min(0.9, v / 1400), lenK: 1 + Math.min(1.2, v / 900), lights: [{ x: o.head[0] - 60, y: o.head[1], r: 200, col: '#ffcf70', a: 0.5 }], gold: (x, y) => clamp(1 - Math.abs(y - Y(560 + trkY(-d - (TRK.ox - x)))) / 80) * 0.6 });
  return { hal: 0.85 };
}
// S11: liftoff — painted still
function buildLiftStill() {
  const L = { kx: -0.7, ky: -0.7, kc: '#ffd070', cx: 0.3, cy: -1, cc: '#8ad0ff', fall: '#4a4a70', spec: 1.6, specX: -60, warm: 0.15 };
  const pal = tintPal('#ffb860', 0.12, 0, 'lift');
  const scene = (c, inkOnly) => {
    if (!inkOnly) {
      rainSky(c, W, H, { seed: 111, top: '#0a0c26', mid: '#262a58', bot: '#5a4a6a', glow: 0.5, gx: 200, glowCol: '#c88a50', clouds: { scale: 300, dark: '#141838', mid: '#33356a', lit: '#e8b878', dark2: '#2a2a50', mid2: '#48407a', lit2: '#ffd090', lx: -0.8 } });
      paintMoon(c, 210, 170, 112);
      const rng = mulberry(4); roofscape(c, null, -20, 980, 600, 760, rng, { rows: 9, street: true, s0: 0.3, s1: 0.8 });
      const tr = cat(bez([1000, 760], [800, 640], [640, 540], [470, 470], 20), bez([470, 470], [330, 410], [220, 300], [120, 180], 20));
      for (const off of [-9, 9]) lightLine(c, tr.map(([x, y]) => [x + off * 0.4, y + off]), 4, '#ffcf6a', 1);
      for (let u = 0.02; u < 1; u += 0.028) { const [x, y, a] = sampleCurve(tr, u); lightPoly(c, hb(x, y, 16 * (1.2 - u * 0.6), 3, a + Math.PI / 2), '#ffc456', 0.9); }
    }
    const o = tramSide(c, 540, 470, 1.75, { L, pal, tilt: 0.3, head: 1.4, win: 1, panto: 0.96, ivy: 0, ground: false, blur: 1, wrot: 1.2 });
    if (!inkOnly) { glow(c, o.head[0], o.head[1], 120, '#ffc060', 0.8); flare(c, o.head[0], o.head[1], 200, '#ffe8b0', 0.9, 0.36); sparkBurst(c, o.pan[0], o.pan[1], 40, 77, { glow: '#ffb040', edge: '#ffe08a', smear: 1.6, smearAng: 0.36, shards: 12 }); }
    return o;
  };
  return harmony((c) => scene(c, false), (c) => scene(c, true), {
    seed: 11, after: (c) => {
      const r = mulberry(8); c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, l = 8 + r() * 30, k = clamp(1 - Math.hypot(x - 500, y - 420) / 420); c.strokeStyle = css(mix('#a8c0e8', '#ffd27a', k), 0.25 + 0.5 * k); c.lineWidth = 1 + r() * 1.5 * k; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * 0.3, y - l); c.stroke(); }
      c.restore();
    }
  });
}
