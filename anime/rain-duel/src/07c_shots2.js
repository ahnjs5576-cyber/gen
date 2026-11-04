// ===================================================================
//  SHOTS 11–20
// ===================================================================
// ======================= S11 — B leaps against the lightning =======================
const P11 = {
  tuck: pose({ y: -150, lean: 35, hd: -20, tw: .3, a1: [60, 90], w1: -40, h1: 'grip', a2: [40, 100], l1: [100, 140], l2: [80, 130], ex: { brow: -.8 } }),
  ext: pose({ y: -150, lean: -12, hd: -14, tw: .35, a1: [150, 50], w1: 235, h1: 'grip', a2: [80, 25], h2: 'open', l1: [72, 95], l2: [-22, 35], ex: { brow: -.9, mouth: 'grit' } }),
  land: pose({ y: -92, lean: 32, hd: -20, tw: .3, a1: [40, 60], w1: -40, h1: 'grip', a2: [70, 40], l1: [75, 125], l2: [-20, 110], ex: { brow: -.8 } }),
  stand: pose({ y: -142, lean: 4, hd: 10, tw: .3, a1: [20, 40], w1: 60, h1: 'grip', a2: [-8, 10], l1: [12, 6], l2: [-10, 4], ex: { brow: -.7, eye: .7, look: [0, .6] } })
};
shot(34, 38.5, 'leap', (ctx, lt, k, t) => {
  const fl = flashAt(t);
  const camY = sv(lt, [[0, 520], [1.0, 300, .8], [2.3, 470, .7]]);
  bg(ctx, BG.sky, 120, camY, 1, fl);
  if (fl > .3) { drawBolt(ctx, [300, -40], [560, 560 - camY + 200], 111, 6, { br: 4 }); drawBolt(ctx, [1100, -40], [900, 300], 112, 3.5, { br: 2 }); }
  const beam = BG.skyBeamY - camY - 28;
  let p, x = 700, y, s = 1.5;
  if (lt < .3) { p = P11.tuck; y = 1100; }
  else if (lt < 1.0) { const u = (lt - .3) / .7; p = u < .5 ? P11.tuck : P11.ext; y = lerp(1300, 600, easeOut(u)); x = lerp(560, 640, u); }
  else if (lt < 1.6) { p = P11.ext; y = 600 - (lt - 1.0) * 20; x = 640; }
  else if (lt < 2.2) { const u = (lt - 1.6) / .6; p = u < .5 ? P11.ext : P11.tuck; y = lerp(588, beam, easeIn(u)); x = lerp(640, 720, u); }
  else { p = sv(lt, [[2.2, P11.land], [3.4, P11.stand, .9]]); y = beam; x = 720; s = 1.1; }
  const painted = lt > 1.0 && lt < 1.6;
  const lm = painted || fl > .4 ? 'sil' : 'night';
  seed('s11', painted ? 'p' : k);
  drawFigure(ctx, CH.B, p, { x, y, s, f: -1, lm, wind: k * 1.5, rim: { d: [-.6, -.8], c: painted || fl > .4 ? '#e9eeff' : '#6874a0', lc: '#b0c0ff', k: painted ? 4 : 2.5 }, paint: painted ? 2 : 0 });
  if (lt > 2.2 && lt < 2.6) { const ph = (lt - 2.2) / .4; for (let i = -1; i <= 1; i += 2) drawPuff(ctx, x + i * (40 + ph * 60), beam - 10 - ph * 20, 18 + ph * 20, 400 + i + (k % 2), lp(['#8090b8', '#56608a'], 'day'), [-.4, -.8], 1.4); }
  drawRain(ctx, k, { d: [.8, 1, .7], flash: fl > .4 });
  if (fl > .02) tintFrame(ctx, '#cfd8ff', fl * .15, 'screen');
});
// ======================= S12 — A rises from the rubble =======================
const P12 = {
  kn1: pose({ y: -78, lean: 38, hd: 32, tw: .45, a1: [30, 40], a2: [5, 15], l1: [80, 80], l2: [-8, 82], ex: { brow: -.2, eye: .5, mouth: 'open', mo: .5 } }),
  kn2: pose({ y: -80, lean: 34, hd: 20, tw: .45, a1: [30, 40], a2: [5, 15], l1: [80, 80], l2: [-8, 82], ex: { brow: -.2, eye: .5, mouth: 'open', mo: .7 } }),
  up: pose({ y: -80, lean: 20, hd: -14, tw: .45, a1: [30, 40], a2: [5, 15], l1: [80, 80], l2: [-8, 82], ex: { brow: -.5, eye: .9, mouth: 'open', mo: .4 } }),
  w1: pose({ y: -80, lean: 18, hd: -10, tw: .45, a1: [110, 150], a2: [5, 15], l1: [80, 80], l2: [-8, 82], h1: 'fist', ex: { brow: -.6, eye: .8 } }),
  w2: pose({ y: -80, lean: 18, hd: -14, tw: .45, a1: [70, 175], a2: [5, 15], l1: [80, 80], l2: [-8, 82], h1: 'fist', ex: { brow: -.7, eye: .8, mouth: 'grit' } }),
  look: pose({ y: -80, lean: 12, hd: -28, tw: .4, yaw: .45, a1: [20, 50], a2: [5, 15], l1: [80, 80], l2: [-8, 82], ex: { brow: -.9, eye: 1, look: [.3, -.6], mouth: 'grit' } }),
  st1: pose({ y: -118, lean: 22, hd: -24, tw: .4, yaw: .45, a1: [20, 70], a2: [10, 60], l1: [60, 70], l2: [-20, 50], ex: { brow: -.9, eye: 1, look: [.3, -.6], mouth: 'grit' } }),
  st2: pose({ y: -142, lean: 4, hd: -22, tw: .4, yaw: .45, a1: [15, 50], a2: [-10, 40], l1: [12, 6], l2: [-10, 4], ex: { brow: -1, eye: 1, look: [.3, -.6], mouth: 'grit' } })
};
shot(38.5, 43.5, 'rise', (ctx, lt, k, t) => {
  const camY = sv(lt, [[0, 0], [4.0, -60, .8]]);
  bg(ctx, BG.med, 260, 150 + camY * 0, 1.35);
  ctx.save(); ctx.translate(0, -camY);
  const breath = Math.floor(lt * 12 / 5) % 2;
  const p = sv(lt, [[0, breath ? P12.kn2 : P12.kn1], [1.5, breath ? P12.kn2 : P12.kn1], [2.0, P12.up, .4], [2.4, P12.w1, .25], [2.75, P12.w2, .25], [3.2, P12.look, .3], [3.95, P12.st1, .4], [4.5, P12.st2, .4]]);
  const p2 = lt < 1.5 ? (breath ? P12.kn2 : P12.kn1) : p;
  seed('s12', k);
  drawFigure(ctx, CH.A, p2, { x: 560, y: 770, s: 1.95, f: 1, wind: k * .9, blood: [[[-.95, -.3], [-.92, 0], [-.97, .2]], [[.12, .82], [.18, .98], [.15, 1.12]]], rim: { d: [-.95, -.2], c: '#d39860', lc: '#f0b070', k: 2.2 } });
  // foreground rubble cel
  paintRubble(ctx, 260, 760, 120, PAL.night, 121, 5); paintRubble(ctx, 1060, 790, 140, PAL.night, 122, 6);
  ctx.restore();
  drawRain(ctx, k, { d: [.6, .9, 1] });
});
// ======================= S13 — fire-wind gathers around A's fist =======================
shot(43.5, 48.5, 'fire', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  const I = sstep(.4, 3.6, lt);
  const shake = lt > 3.9 ? (kf % 2 ? 3 : -3) : 0;
  ctx.save(); ctx.translate(shake, 0);
  bg(ctx, BG.cuA2, 40, 30);
  tintFrame(ctx, '#000', .35 * (1 - I));
  glow(ctx, 470, 420, 300 + I * 300, '#ff9a40', .15 + I * .35);
  // A's face, lit by the fire from below-left
  seed('s13', k);
  const ho = { x: 880, y: 290, r: 118, f: -1, yaw: .3, lm: I > .25 ? 'fire' : 'night', ex: { brow: -.9, eye: 1, look: [.5, .3], mouth: 'grit' }, wind: k * (1 + I * 2), L: [-.4, .9], rim: { d: [-.85, .5], c: '#ffc070', lc: '#ff9040', k: .06 + I * .05 }, blood: [[[.95, -.3], [.92, 0], [.97, .2]]] };
  drawBust(ctx, CH.A, ho);
  // the fist and forearm, close to camera
  const el = [940, 760], wr = [560, 470];
  drawFireWind(ctx, el, [wr[0] - 70, wr[1] - 50], kf, I, 'back', 1.7);
  const pf = pose({ x: 0, y: -143, tw: .2, a1: [0, 0], a2: [0, 0], l1: [0, 0], l2: [0, 0] });
  const a = Math.atan2(wr[0] - el[0], wr[1] - el[1]) / D2R; // angle from down, screen-space (f=1)
  const pp = Object.assign({}, pf, { a1: [a, 0, 0], order: ['A1'] });
  const sc = dist(el, wr) / (BN.ua * .45 + BN.fa);
  const e0 = jpos(pp, { x: 0, y: 0, s: sc, f: 1 }, 'A1.e'), w0 = jpos(pp, { x: 0, y: 0, s: sc, f: 1 }, 'A1.w');
  seed('s13f', k);
  drawFigure(ctx, CH.A, pp, { x: wr[0] - w0[0], y: wr[1] - w0[1], s: sc, f: 1, lm: I > .25 ? 'fire' : 'night', rim: { d: [-.6, -.7], c: '#ffd080', lc: '#ff9a40', k: 3 } });
  drawFireWind(ctx, el, [wr[0] - 70, wr[1] - 50], kf, I, 'front', 1.7);
  // rain spiralling in
  seed('sp13', kf);
  for (let i = 0; i < 30 * I; i++) { const a0 = rnd(0, TAU), r0 = rnd(160, 420); const pts = []; for (let j = 0; j < 6; j++) { const a1 = a0 + j * .22, r1 = r0 * (1 - j * .12); pts.push([wr[0] - 40 + Math.cos(a1) * r1, wr[1] - 30 + Math.sin(a1) * r1 * .7]); } ink(ctx, pts, { w: rnd(1, 2.4), c: '#ffd9a0', a: .6, t0: .5, t1: .3 }); }
  ctx.restore();
  if (lt > 3.6) drawConc(ctx, 520, 440, k, { r0: 320, n: 90, c: '#ffe6c0', a: .55, w: 6 });
  drawRain(ctx, k, { d: [.4, .7, 1 - I * .6] });
});
// ======================= S14 — lightning along B's blade =======================
const P14 = pose({ y: -98, lean: 26, hd: -16, tw: .35, a1: [90, 10], w1: 92, h1: 'grip', a2: [92, 30], h2: 'blade', l1: [72, 118], l2: [-25, 105], ex: { brow: -.95, eye: .85, mouth: 'closed', look: [.3, .4] } });
shot(48.5, 52.5, 'elec', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24), fl = flashAt(t);
  const I = sstep(.4, 3.0, lt);
  bg(ctx, BG.sky, 140, 590, 1, fl);
  tintFrame(ctx, '#000', .3 * (1 - I));
  if (fl > .3) drawBolt(ctx, [1000, -40], [1200, 400], 141, 4, { br: 3 });
  const beam = BG.skyBeamY - 590 - 28, s = 1.55, x = 760;
  const bladeA = jpos(P14, { x, y: beam, s, f: -1 }, 'A1.w');
  glow(ctx, bladeA[0] - 60, bladeA[1], 200 + I * 250, '#6f86ff', .12 + I * .3);
  seed('s14', k);
  drawFigure(ctx, CH.B, Object.assign({}, P14, { wt1: 'tanto' }), { x, y: beam, s, f: -1, lm: I > .3 ? 'elec' : 'night', wind: k * (1 + I * 2), rim: { d: [-.5, .8], c: '#c9d6ff', lc: '#8ea6ff', k: 2.5 + I * 2 }, glintC: '#e8f0ff' });
  // blade line from hand forward (f=-1 → leftwards)
  const tip = [bladeA[0] - 128 * s * .85, bladeA[1] - 6];
  drawElectric(ctx, [bladeA[0] - 14, bladeA[1] - 4], tip, kf, I, 1.2);
  // steam where rain meets the charge
  if (I > .3) for (let i = 0; i < 3; i++) { seed('st14', i, Math.floor(lt * 4)); drawPuff(ctx, lerp(bladeA[0], tip[0], rnd(.2, 1)), bladeA[1] - rnd(20, 60), rnd(10, 22), 140 + i + Math.floor(lt * 4), lp(['#c8d0ea', '#8e98c0'], 'day'), [-.4, -.8], 1.2); }
  if (lt > 3.2) drawConc(ctx, tip[0] + 80, tip[1], k, { r0: 300, n: 90, c: '#dfe6ff', a: .5 });
  drawRain(ctx, k, { d: [.7, 1, .8], flash: fl > .4 });
  if (fl > .02) tintFrame(ctx, '#cfd8ff', fl * .25, 'screen');
});
// ======================= S15 — the charge =======================
const P15 = {
  A: pose({ y: -150, lean: 42, hd: -26, tw: .25, a1: [120, -4], a2: [-30, 60], l1: [60, 90], l2: [-50, 60], ex: { brow: -1, mouth: 'shout' } }),
  B: pose({ y: -150, lean: 72, hd: -40, tw: .25, a1: [108, -2], w1: 108, h1: 'grip', a2: [-40, 40], l1: [10, 40], l2: [-30, 80], ex: { brow: -1, mouth: 'grit' } })
};
shot(52.5, 56, 'charge', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  drawSpeedBG(ctx, kf, ['#0d1226', '#1c2547', '#2a3560', '#3a2a40', '#141a33'], { ang: -.42, n: 180, cyc: 3 });
  const u = clamp(lt / 3.4, 0, 1), e = easeIn(u) * .6 + u * .4;
  const ax = lerp(-260, 520, e), ay = lerp(900, 470, e), bx = lerp(1540, 780, e), by = lerp(-160, 300, e);
  const s = 1.05;
  // trails
  const fa = jpos(P15.A, { x: ax, y: ay, s, f: 1 }, 'A1.e'), fw = jpos(P15.A, { x: ax, y: ay, s, f: 1 }, 'A1.w');
  drawFireWind(ctx, fa, fw, kf, 1, 'back', 1.2);
  for (let i = 0; i < 3; i++) { seed('tr', kf, i); const off = rnd(-20, 20); ink(ctx, [[fw[0] - 500, fw[1] + 230 + off], [fw[0] - 200, fw[1] + 90 + off], [fw[0], fw[1] + off * .3]], { w: rnd(20, 40), c: i ? '#ff9a3a' : '#ffe3a0', a: .7, t0: .9, t1: .1 }); }
  const bw = jpos(P15.B, { x: bx, y: by, s, f: -1 }, 'A1.w');
  for (let i = 0; i < 3; i++) { seed('trb', kf, i); const off = rnd(-20, 20); ink(ctx, [[bw[0] + 500, bw[1] - 220 + off], [bw[0] + 200, bw[1] - 90 + off], [bw[0] - 40, bw[1] + off * .3]], { w: rnd(16, 34), c: i ? '#6f86ff' : '#dfe6ff', a: .7, t0: .9, t1: .1 }); }
  seed('s15a', kf % 3); drawFigure(ctx, CH.A, P15.A, { x: ax, y: ay, s, f: 1, lm: 'fire', wind: kf * 2, rim: { d: [.8, -.4], c: '#ffd080', lc: '#ff9040', k: 3 } });
  drawFireWind(ctx, fa, fw, kf, 1, 'front', 1.2);
  seed('s15b', kf % 3); drawFigure(ctx, CH.B, P15.B, { x: bx, y: by, s, f: -1, lm: 'elec', wind: kf * 2, rim: { d: [-.8, .4], c: '#d6e0ff', lc: '#8ea6ff', k: 3 } });
  drawElectric(ctx, [bw[0] - 10, bw[1]], [bw[0] - 120, bw[1] + 30], kf, 1, 1);
  drawRain(ctx, k, { d: [0, .8, 1] });
  if (lt > 3.2) tintFrame(ctx, '#ffffff', (lt - 3.2) / .3 * .9, 'screen');
});
// ======================= S16 — collision =======================
shot(56, 58, 'impact', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  if (lt < .085) { tintFrame(ctx, '#ffffff', 1); return; }
  if (lt < .34) {
    // strobe impact frames: silhouettes on white / inverted
    tintFrame(ctx, '#f6f2ea', 1);
    drawConc(ctx, 640, 360, kf, { r0: 120, n: 140, c: '#16121a', a: .9, w: 12 });
    seed('s16', 0);
    drawFigure(ctx, CH.A, P15.A, { x: 470, y: 520, s: 1.3, f: 1, lm: 'sil' });
    drawFigure(ctx, CH.B, P15.B, { x: 850, y: 380, s: 1.3, f: -1, lm: 'sil' });
    if ((kf >> 1) % 2) invertFrame(ctx);
    return;
  }
  const u = easeOut(clamp((lt - .34) / 1.5, 0, 1));
  tintFrame(ctx, '#05060c', 1);
  const R0 = 80 + u * 900;
  // painted sphere: fire half / lightning half
  seed('sph', Math.floor(lt * 12));
  for (let i = 0; i < 260; i++) {
    const a = rnd(0, TAU), rr = Math.sqrt(R()) * R0; const x = 640 + Math.cos(a) * rr, y = 360 + Math.sin(a) * rr;
    const left = x < 640 + vnoise(y / 40, 3) * 30;
    const kk = rr / R0;
    ctx.globalAlpha = .5 + .5 * (1 - kk);
    brush(ctx, x, y, rnd(40, 120), a + Math.PI / 2 + rnd(-.3, .3), rnd(10, 30), mixc(left ? '#ffe9b0' : '#e6ecff', left ? '#e0601e' : '#4a5ad0', kk), { nob: 1 });
  }
  ctx.globalAlpha = 1;
  glow(ctx, 640, 360, R0 * 1.3, '#ffffff', .6);
  drawShockRing(ctx, 640, 360, R0 * .9, .9, kf, '#ffffff', 10);
  drawShockRing(ctx, 640, 360, R0 * .6, .9, kf + 9, '#ffe0b0', 6);
  // rain driven outward
  seed('rad', kf);
  for (let i = 0; i < 120; i++) { const a = rnd(0, TAU), r1 = R0 * rnd(.9, 1.6); ink(ctx, [[640 + Math.cos(a) * r1, 360 + Math.sin(a) * r1], [640 + Math.cos(a) * (r1 + 60), 360 + Math.sin(a) * (r1 + 60)]], { w: rnd(1, 2.5), c: '#cdd6f0', a: .8 }); }
  drawConc(ctx, 640, 360, kf, { r0: R0 * .8, n: 80, c: '#ffffff', a: .5, w: 8 });
});
// ======================= S17 — inside the light (harmony frame, slow motion) =======================
shot(58, 63, 'harmony', (ctx, lt, k, t) => {
  const k4 = Math.floor(lt * 6); // drawn on fours
  const z = 1 + lt * .012;
  ctx.save(); ctx.translate(640, 360); ctx.scale(z, z); ctx.translate(-640, -360);
  // painted split backdrop
  seed('hb', 0);
  for (let i = 0; i < 1400; i++) { const x = rnd(-100, 1380), y = rnd(-100, 820); const left = x < 640 + vnoise(y / 60, 5) * 50; const kk = Math.abs(x - 640) / 700; ctx.fillStyle = 'x'; brush(ctx, x, y, rnd(40, 140), rnd(-.3, .3) + (left ? .5 : -.5), rnd(14, 34), jitc(mixc(left ? '#ffcf80' : '#c6d2ff', left ? '#5a1e14' : '#141a40', clamp(kk + rnd(-.1, .1), 0, 1)), 6)); }
  glow(ctx, 640, 380, 300, '#ffffff', .6);
  applyPaper(ctx, W, H, .25);
  const wind = 3 + k4 * .25;
  seed('s17a', k4);
  drawBust(ctx, CH.A, { x: 400, y: 300, r: 150, f: 1, yaw: .93, lm: 'fire', ex: { brow: -1, eye: 1, mouth: 'shout', mo: .8 }, wind, L: [-.9, .2], rim: { d: [.95, .2], c: '#fff0c8', lc: '#ffb050', k: .1 }, paint: 1.5, blood: [[[-.95, -.3], [-.92, 0], [-.97, .2]]], cut: true });
  seed('s17b', k4);
  drawBust(ctx, CH.B, { x: 880, y: 300, r: 150, f: -1, yaw: .93, lm: 'elec', ex: { brow: -1, eye: .9, mouth: 'grit' }, wind: wind + 1, L: [.9, .2], rim: { d: [-.95, .2], c: '#eef2ff', lc: '#8ea6ff', k: .1 }, paint: 1.5, blood: [[[.05, .8], [.12, .95], [.1, 1.12]]] });
  // fist and blade crossing low in frame
  drawFireWind(ctx, [180, 760], [560, 560], k4, 1, 'back', 2.2);
  drawFireWind(ctx, [180, 760], [560, 560], k4, 1, 'front', 2.2);
  drawElectric(ctx, [1120, 700], [700, 560], k4, 1, 1.6);
  ctx.restore();
  // slow drops hanging in the air
  seed('hang', 0);
  for (let i = 0; i < 40; i++) { const x = rnd(0, W), y = rnd(0, H) + lt * 6; const r = rnd(1.5, 3.5); cel(ctx, spline([[x, y - r * 2.4, 1], [x + r, y], [x, y + r], [x - r, y]], true, 1.5), { f: '#e8ecf8', lw: .8, lc: '#5a6488' }); }
  if (lt > 4.4) tintFrame(ctx, '#ffffff', (lt - 4.4) / .6, 'screen');
});
// ======================= S18 — aftermath =======================
const LIE = pose({ x: 0, y: -143, lean: 0, hd: 0, tw: .6, a1: [-60, 20], a2: [70, 30], l1: [10, 10], l2: [-12, 14], ex: { eye: 0, mouth: 'open', mo: .3 } });
function drawLying(ctx, C, x, y, s, rot, k, lm, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  seed('lie', C.id, Math.floor(k / 3));
  drawFigure(ctx, C, Object.assign({}, LIE, o.p || {}), Object.assign({ x: 0, y: 0, s, f: 1, lm, wind: k * .2 }, o));
  ctx.restore();
}
shot(63, 68, 'after', (ctx, lt, k, t) => {
  const camX = lerp(180, 215, lt / 5);
  bg(ctx, BG.crater, camX, 0);
  const s = .4;
  drawLying(ctx, CH.A, 600 - camX, 602, s, -Math.PI / 2, k, 'night', { blood: [[[-.95, -.3], [-.92, 0]]] });
  drawLying(ctx, CH.B, 1150 - camX, 596, s, Math.PI / 2, k, 'night');
  // steam rising from the crater, redrawn on fours
  const k4 = Math.floor(lt * 6);
  for (let i = 0; i < 7; i++) {
    seed('stm', i); const x0 = 850 - camX + rnd(-200, 200), sp = rnd(10, 22), per = rnd(4, 7), off = rnd(0, per);
    const u = ((lt + off) % per) / per;
    const y = 560 - u * 260, r = 30 + u * 60;
    ctx.globalAlpha = Math.sin(u * Math.PI) * .75;
    drawPuff(ctx, x0 + u * 40, y, r, 500 + i * 10 + k4, lp(['#4a5274', '#323954'], 'day'), [-.4, -.8], 1.4);
    ctx.globalAlpha = 1;
  }
  drawSplashes(ctx, k, { x0: 0, x1: W, y0: 430, y1: 720 }, Math.floor(70 * sstep(.5, 2.5, lt)), 1);
  drawRain(ctx, k, { d: [1, .9, .6], a: sstep(.3, 2.5, lt) });
  if (lt < .8) tintFrame(ctx, '#ffffff', 1 - lt / .8);
});
// ======================= S19 — overhead: lying in the rain =======================
shot(68, 74.5, 'overhead', (ctx, lt, k, t) => {
  const z = 1 + lt * .008;
  ctx.save(); ctx.translate(640, 360); ctx.scale(z, z); ctx.translate(-640, -360);
  bg(ctx, BG.top, 60, 90);
  const eA = sv(lt, [[0, 0], [2.6, .25, .2], [3.0, .7, .3]]);
  const mA = lt > 4.4 ? 'smirk' : 'closed';
  const eB = sv(lt, [[0, .65], [5.4, .3, .3], [5.9, 0, .3]]);
  const pA = pose({ x: 0, y: -143, tw: 1, yaw: 0, hd: 0, a1: [-75, 15], a2: [80, 25], l1: [-8, 4], l2: [10, 6], ex: { eye: eA, mouth: mA, look: [0, -.3], brow: -.1 } });
  const pB = pose({ x: 0, y: -143, tw: 1, yaw: 0, hd: 0, a1: [-85, 20], a2: [70, 10], l1: [-10, 6], l2: [8, 4], ex: { eye: eB, mouth: 'closed', look: [0, -1], brow: -.2 } });
  seed('s19a', Math.floor(k / 3));
  ctx.save(); ctx.translate(560, 420); ctx.rotate(-2.2); drawFigure(ctx, CH.A, pA, { x: 0, y: 0 + 275 * 1.25, s: 1.25, f: 1, lm: 'night', blood: [[[-.4, -.3], [-.38, 0], [-.42, .2]]], cut: true, wind: 0 }); ctx.restore();
  seed('s19b', Math.floor(k / 3));
  ctx.save(); ctx.translate(730, 330); ctx.rotate(.95); drawFigure(ctx, CH.B, pB, { x: 0, y: 0 + 275 * 1.25, s: 1.25, f: 1, lm: 'night', blood: [[[.05, .8], [.12, .95]]], wind: 0 }); ctx.restore();
  ctx.restore();
  // rain seen from above: short streaks radiating from the centre, drops striking
  seed('rtop', k);
  for (let i = 0; i < 160; i++) { const a = rnd(0, TAU), r = rnd(30, 800); const x = 640 + Math.cos(a) * r, y = 360 + Math.sin(a) * r * .8; const l = 6 + r * .05; ink(ctx, [[x, y], [x + Math.cos(a) * l, y + Math.sin(a) * l * .8]], { w: rnd(.8, 2), c: '#b8c4e6', a: .55, t0: .5, t1: .3 }); }
  for (let i = 0; i < 18; i++) { seed('rr', i); const per = rnd(.4, .8), off = rnd(0, per); const u = Math.floor(((lt + off) % per) / per * 6) / 6; seed('rrp', i, Math.floor((lt + off) / per)); const x = rnd(0, W), y = rnd(0, H); ctx.strokeStyle = css('#c0cae8', (1 - u) * .7); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, u * 30 + 2, u * 30 + 2, 0, 0, TAU); ctx.stroke(); }
});
// ======================= S20 — the clouds part =======================
shot(74.5, 80, 'moon', (ctx, lt, k, t) => {
  const camX = lerp(240, 205, easeIO(lt / 5.5));
  bg(ctx, BG.moon, camX, 0);
  // moonlight shaft
  ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .12 + .1 * sstep(0, 3, lt);
  seed('shaft');
  for (let i = 0; i < 40; i++) { const x = 1090 - camX + rnd(-30, 30); brush(ctx, x, 140, rnd(300, 480), Math.PI / 2 + .22 + rnd(-.08, .08), rnd(30, 90), '#9aa8d8', { nob: 1, bend: 0 }); }
  ctx.restore();
  glow(ctx, 1090 - camX, 120, 160, '#dfe6ff', .35);
  drawLying(ctx, CH.A, 600 - camX, 602, .4, -Math.PI / 2, k, 'moon', { p: { ex: { eye: .2, mouth: 'smirk' } } });
  drawLying(ctx, CH.B, 1150 - camX, 596, .4, Math.PI / 2, k, 'moon');
  const ra = 1 - sstep(.2, 3.2, lt);
  drawSplashes(ctx, k, { x0: 0, x1: W, y0: 430, y1: 720 }, Math.floor(60 * ra), 1, '#d0d8f0');
  if (ra > 0) drawRain(ctx, k, { d: [1, .8, .5], a: ra });
});
