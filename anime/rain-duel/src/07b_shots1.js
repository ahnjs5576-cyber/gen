// ===================================================================
//  SHOTS 1–10
// ===================================================================
// ---- shared key drawings ----
const PZ = {
  A_stance: pose({ tw: .38, y: -136, lean: 7, hd: -4, a1: [28, 75], a2: [12, 85], l1: [20, 14], l2: [-16, 8] }),
  B_stance: pose({ tw: .32, y: -140, lean: 3, hd: -3, a1: [22, 40], w1: 70, h1: 'grip', a2: [-6, 12], l1: [12, 6], l2: [-10, 4] }),
  // run cycle (4 drawings)
  run: [
    { y: -134, lean: 26, hd: -16, tw: .22, a1: [-50, 75], a2: [55, 85], l1: [48, 22], l2: [-32, 75] },
    { y: -126, lean: 28, hd: -16, tw: .22, a1: [-22, 85], a2: [32, 90], l1: [24, 55], l2: [-8, 105] },
    { y: -134, lean: 26, hd: -16, tw: .22, a1: [55, 85], a2: [-50, 75], l1: [-32, 75], l2: [48, 22] },
    { y: -126, lean: 28, hd: -16, tw: .22, a1: [32, 90], a2: [-22, 80], l1: [-8, 105], l2: [24, 55] }
  ]
};
// ======================= S1 — wide establishing =======================
shot(0, 7, 'wide', (ctx, lt, k, t) => {
  const fl = flashAt(t);
  const camX = lerp(170, 235, easeIO(lt / 7)), camY = 0;
  bg(ctx, BG.wide, camX, camY, 1, fl);
  // far bolt
  if (fl > .3) drawBolt(ctx, [1290 - camX, -20], [1150 - camX, 340], 41, 3.2, { br: 3 });
  // lantern halation
  for (const L of BG.wideLamps) if (L.lit) { seed('lf', k); glow(ctx, L.win[0] - camX, L.win[1], 46 * L.s * rnd(.9, 1.05), '#ffb468', .5); }
  const gy = 604, s = .42, lm = lmFor(fl), rim = fl > .4 ? { d: [.4, -.9], c: '#dfe7ff', lc: '#aab8ff', k: 4 } : null;
  const ax = 640 - camX, bx = 1110 - camX;
  const wind = k * .9;
  const drawA = g => { seed('s1a', k); drawFigure(g, CH.A, PZ.A_stance, { x: ax, y: gy, s, f: 1, lm, rim, wind, det: 1 }); };
  const drawB = g => { seed('s1b', k); drawFigure(g, CH.B, PZ.B_stance, { x: bx, y: gy, s, f: -1, lm, rim, wind: wind + 2, det: 1 }); };
  reflectDraw(ctx, gy, g => { drawA(g); drawB(g); }, .2);
  drawA(ctx); drawB(ctx);
  drawSplashes(ctx, k, { x0: 0, x1: W, y0: 430, y1: 720 }, 70, 1);
  drawRain(ctx, k, { d: [1, .9, .6], flash: fl > .4 });
  if (fl > .02) tintFrame(ctx, '#c9d4ff', fl * .22, 'screen');
  if (lt < 1.6) tintFrame(ctx, '#000', 1 - easeOut(lt / 1.6));
});
// ======================= S2 — A close-up =======================
shot(7, 11, 'cuA', (ctx, lt, k, t) => {
  bg(ctx, BG.cuA, 60 + lt * 6, 40);
  const r = lerp(132, 140, lt / 4);
  const bc = [0, .45, 1, .45]; const breath = bc[Math.floor(lt * 12 / 4) % 4];
  const ex = { brow: -.55, eye: 1, look: [.2, 0], mouth: breath > .8 ? 'open' : 'closed', mo: .45 };
  seed('s2', k);
  const o = { x: 520, y: 300, r, f: 1, yaw: .6, lm: 'night', ex, breath, wind: k * .8, blood: [[[-.98, -.32], [-.93, -.08], [-.99, .16], [-.9, .42]]], L: [-.5, -.85], rim: { d: [-.9, -.2], c: '#a8805e', lc: '#c09070', k: .04 } };
  drawBust(ctx, CH.A, o);
  wetStreaks(ctx, 470, 330, 120, 120, lt, 2);
  drips(ctx, [headPt(o, .55, .02), headPt(o, -.2, .02), headPt(o, .62, 1.1)], lt, 1.1, 2);
  drawRain(ctx, k, { d: [.5, .8, 1] });
});
// ======================= S3 — B close-up, lightning glint =======================
shot(11, 15, 'cuB', (ctx, lt, k, t) => {
  const fl = flashAt(t);
  bg(ctx, BG.cuB, 40 - lt * 5, 40, 1, fl * .5);
  const r = lerp(136, 142, lt / 4);
  const e = sv(lt, [[0, .78], [2.1, .5, .25]]), b = sv(lt, [[0, -.25], [2.1, -.55, .25]]);
  seed('s3', k);
  const o = { x: 760, y: 300, r, f: -1, yaw: .58, lm: lmFor(fl), ex: { brow: b, eye: e, look: [.15, 0] }, wind: k * .7, L: [.5, -.85], rim: fl > .4 ? { d: [-.8, -.5], c: '#eef2ff', k: .1 } : { d: [.9, -.3], c: '#4a557e', k: .035 }, glintC: fl > .4 ? '#ffffff' : '#c9d0e6' };
  drawBust(ctx, CH.B, o);
  drips(ctx, [headPt(o, .7, .9), headPt(o, .1, .3), headPt(o, -.3, .35)], lt, 1.1, 3);
  drawRain(ctx, k, { d: [.5, .8, 1], flash: fl > .4 });
  if (fl > .02) tintFrame(ctx, '#d6defa', fl * .12, 'screen');
});
// ======================= S4 — the puddle =======================
shot(15, 17.5, 'puddle', (ctx, lt, k, t) => {
  bg(ctx, BG.puddle, 60, 40);
  // reflected silhouettes standing around the puddle
  ctx.save(); ctx.beginPath(); addPoly(ctx, BG.puddleShape.map(p => [p[0] - 60, p[1] - 40])); ctx.clip();
  seed('s4', 0);
  drawFigure(ctx, CH.A, PZ.A_stance, { x: 330, y: 650 - 40, s: .55, f: 1, lm: 'sil' });
  ctx.save(); ctx.translate(980, 140); ctx.scale(1, -1); drawFigure(ctx, CH.B, PZ.B_stance, { x: 0, y: 0, s: .55, f: -1, lm: 'sil' }); ctx.restore();
  ctx.restore();
  // ripple rings from drops
  for (let i = 0; i < 14; i++) {
    seed('rip', i); const per = rnd(.5, .9), off = rnd(0, per);
    const u = ((lt + off) % per) / per; const uq = Math.floor(u * 6) / 6; const cyc = Math.floor((lt + off) / per);
    seed('rippos', i, cyc);
    const x = rnd(300, 1100), y = rnd(200, 600);
    for (let j = 0; j < 2; j++) { const rr = (uq * 70 - j * 18); if (rr < 3) continue; ctx.strokeStyle = css('#b8c4ea', (1 - uq) * .8); ctx.lineWidth = 2 - j * .6; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * .62, 0, 0, TAU); ctx.stroke(); }
  }
  if (lt > 1.82) {
    const ph = (Math.floor((lt - 1.82) * 24) / 24) / .5;
    drawConc(ctx, 640, 400, k, { r0: 320, n: 70, c: '#cfd8f4', a: .6 });
    drawWaterBurst(ctx, 640, 470, 260, ph, 7);
    if (ph < .25) tintFrame(ctx, '#fff', .3 * (1 - ph * 4), 'screen');
  }
  drawRain(ctx, k, { d: [.4, .6, .5] });
});
// ======================= S5 — the dash =======================
shot(17.5, 20.5, 'dash', (ctx, lt, k, t) => {
  bg(ctx, BG.med, 320, 0);
  const gy = 665, s = .92;
  const u = lt / 3; const prog = easeIn(u) * .55 + u * .45;
  const ax = lerp(-120, 560, prog), bx = lerp(1400, 720, prog);
  const ci = k % 4;
  // horizontal speed streaks over the background
  seed('sp5', k);
  for (let i = 0; i < 40; i++) { const y = rnd(80, 700), x = rnd(-200, W); ctx.globalAlpha = rnd(.08, .22); brush(ctx, x, y, rnd(200, 600), 0, rnd(1, 4), '#9aa6cc', { bend: 0, nob: 1 }); }
  ctx.globalAlpha = 1;
  const pa = pose(Object.assign({}, PZ.run[ci], { a1: PZ.run[ci].a1.map(v => v * .8), ex: { brow: -.7, mouth: 'grit' } }));
  const pb = pose(Object.assign({}, PZ.run[(ci + 2) % 4], { w1: -70, h1: 'grip', ex: { brow: -.5 } }));
  const dA = g => { seed('s5a', k); drawFigure(g, CH.A, pa, { x: ax, y: gy, s, f: 1, wind: k * 1.4 }); };
  const dB = g => { seed('s5b', k); drawFigure(g, CH.B, pb, { x: bx, y: gy, s, f: -1, wind: k * 1.4 }); };
  reflectDraw(ctx, gy, g => { dA(g); dB(g); }, .18);
  // spray behind the feet
  for (const [x, dir, sd] of [[ax, -1, 1], [bx, 1, 2]]) for (let j = 0; j < 3; j++) { const ph = ((k + j * 2) % 6) / 6; drawWaterBurst(ctx, x + dir * (30 + j * 55), gy + 4, 34 - j * 6, ph, sd * 10 + ((k + j * 2) / 6 | 0)); }
  dA(ctx); dB(ctx);
  drawSplashes(ctx, k, { x0: 0, x1: W, y0: 380, y1: 720 }, 50, 1.2);
  drawRain(ctx, k, { d: [1, 1, .8] });
});
// ======================= S6 — the clash =======================
const P6 = {
  A: pose({ y: -126, lean: 28, hd: -18, tw: .32, a1: [96, -6], w1: 96, h1: 'grip', a2: [35, 95], l1: [48, 40], l2: [-46, 18], ex: { brow: -.9, mouth: 'grit', eye: 1 } }),
  B: pose({ y: -128, lean: 22, hd: -14, tw: .34, a1: [102, -18], w1: 128, h1: 'grip', a2: [20, 110], l1: [42, 35], l2: [-40, 14], ex: { brow: -.7, mouth: 'grit', eye: .8 } })
};
shot(20.5, 23.5, 'clash', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  bg(ctx, BG.med, 980, 110, 1.45);
  const gy = 800, s = 2.05;
  const shake = lt > .12 && lt < 2.4 ? ((kf >> 1) % 2 ? 2.5 : -2.5) * (lt < .5 ? 3 : 1) : 0;
  ctx.save(); ctx.translate(shake, -shake * .4);
  // place so the blades meet at centre
  const meet = [640, 300];
  let ax = 640 - (jpos(P6.A, { x: 0, y: gy, s, f: 1 }, 'A1.w')[0]) - 62, bx = 640 - (jpos(P6.B, { x: 0, y: gy, s, f: -1 }, 'A1.w')[0]) + 48;
  meet[1] = jpos(P6.A, { x: ax, y: gy, s, f: 1 }, 'A1.w')[1] - 10;
  let pa = P6.A, pb = P6.B;
  if (lt < .12) { ax -= 160 * (1 - lt / .12); bx += 160 * (1 - lt / .12); }
  if (lt > 2.4) { const u = easeOut(clamp((lt - 2.4) / .3, 0, 1)); ax -= 60 * u; bx += 60 * u; pa = lerpPose(P6.A, PZ.A_stance, u * .5); pb = lerpPose(P6.B, PZ.B_stance, u * .5); }
  const wind = k * 1.2;
  seed('s6a', k); drawFigure(ctx, CH.A, pa, { x: ax, y: gy, s, f: 1, wind, rim: { d: [.9, -.1], c: '#ffd9a0', lc: '#ffb060', k: 2 }, lm: 'night' });
  seed('s6b', k); drawFigure(ctx, CH.B, pb, { x: bx, y: gy, s, f: -1, wind, rim: { d: [-.9, -.1], c: '#ffd9a0', lc: '#ffb060', k: 2 }, lm: 'night' });
  if (lt >= .12 && lt < 2.4) { const sz = lt < .4 ? 120 : 34 + (k % 2) * 18; drawSpark(ctx, meet[0] - 6, meet[1] + 4, sz, lt < .4 ? 1 : k, { n: lt < .4 ? 22 : 6 }); }
  ctx.restore();
  if (lt >= .12 && lt < 1.2) drawShockRing(ctx, meet[0], meet[1], 60 + (Math.floor((lt - .12) * 12) / 12) * 900, .6, k, '#dfe6fb', 12);
  drawRain(ctx, k, { d: [.6, .9, 1], a: lt < .9 && lt > .12 ? .3 : 1 });
  if (lt < .12) drawConc(ctx, 640, 340, kf, { r0: 300, n: 60, c: '#dfe4f5', a: .5 });
  if (lt >= .12 && lt < .25) { drawConc(ctx, 640, 340, kf, { r0: 200, n: 120, c: '#ffffff', a: .9, w: 10 }); invertFrame(ctx); }
  else if (lt >= .25 && lt < .5) tintFrame(ctx, '#fff6e6', .6 * (1 - (lt - .25) / .25), 'screen');
});
// ======================= S7 — the exchange =======================
const P7 = {
  Ag: pose({ y: -136, lean: 10, hd: -6, tw: .4, a1: [40, 95], a2: [25, 110], l1: [22, 18], l2: [-18, 10], ex: { brow: -.7 } }),
  Aduck: pose({ y: -92, lean: 40, hd: -32, tw: .3, a1: [30, 110], a2: [10, 120], l1: [72, 120], l2: [-30, 100], ex: { brow: -.8, mouth: 'grit' } }),
  Aupa: pose({ y: -100, lean: 30, hd: -22, tw: .35, a1: [-25, 125], a2: [60, 100], l1: [58, 105], l2: [-35, 85], ex: { brow: -.9, mouth: 'grit' } }),
  Aup: pose({ y: -150, lean: -6, hd: -25, tw: .3, a1: [158, 30], a2: [20, 100], l1: [15, 10], l2: [-35, 30], ex: { brow: -1, mouth: 'shout' } }),
  Ablk: pose({ y: -128, lean: -6, hd: -12, tw: .45, a1: [100, 125], a2: [85, 130], l1: [22, 26], l2: [-26, 16], ex: { brow: -.8, mouth: 'grit', eye: .7 } }),
  Aslid: pose({ y: -124, lean: -12, hd: -10, tw: .45, a1: [95, 125], a2: [82, 130], l1: [30, 34], l2: [-30, 22], ex: { brow: -.8, mouth: 'grit', eye: .7 } }),
  Aspw: pose({ y: -134, lean: 14, hd: -6, tw: .05, a1: [-35, 60], a2: [55, 80], l1: [-8, 22], l2: [24, 34], ex: { brow: -.8 } }),
  Akick: pose({ y: -150, lean: -26, hd: -6, tw: .15, a1: [60, 90], a2: [-45, 60], l1: [100, 0], l2: [-12, 85], ex: { brow: -1, mouth: 'shout' } }),
  Aside: pose({ y: -132, lean: -20, hd: -14, tw: .35, a1: [30, 100], a2: [10, 110], l1: [32, 20], l2: [-25, 15], ex: { brow: -.4, eye: 1.2 } }),
  Bg: pose({ y: -138, lean: 8, hd: -5, tw: .35, a1: [55, 40], w1: 95, h1: 'grip', a2: [20, 100], l1: [20, 14], l2: [-16, 8], ex: { brow: -.5 } }),
  Bsw: pose({ y: -136, lean: -5, hd: -5, tw: .25, a1: [150, 30], w1: 205, h1: 'grip', a2: [60, 60], l1: [25, 20], l2: [-20, 10], ex: { brow: -.7 } }),
  Bsl: pose({ y: -130, lean: 22, hd: -10, tw: .4, a1: [92, 0], w1: 98, h1: 'grip', a2: [-30, 40], l1: [42, 42], l2: [-32, 15], ex: { brow: -.8, mouth: 'grit' } }),
  Bfol: pose({ y: -130, lean: 24, hd: -10, tw: .5, a1: [45, -10], w1: 20, h1: 'grip', a2: [-40, 30], l1: [42, 42], l2: [-32, 15], ex: { brow: -.8 } }),
  Bblk: pose({ y: -136, lean: -8, hd: -15, tw: .4, a1: [125, 105], w1: 230, h1: 'grip', a2: [30, 90], l1: [20, 18], l2: [-20, 10], ex: { brow: -.8, mouth: 'grit' } }),
  Bch: pose({ y: -146, lean: -8, hd: -8, tw: .3, a1: [40, 60], w1: 80, h1: 'grip', a2: [20, 90], l1: [90, 120], l2: [-5, 10], ex: { brow: -.6 } }),
  Bkk: pose({ y: -146, lean: -16, hd: -8, tw: .3, a1: [30, 70], w1: 80, h1: 'grip', a2: [10, 90], l1: [96, 4], l2: [-8, 10], ex: { brow: -.8 } }),
  Bdodge: pose({ y: -128, lean: -30, hd: 6, tw: .3, a1: [60, 60], w1: 100, h1: 'grip', a2: [-60, 40], l1: [25, 40], l2: [-30, 50], ex: { brow: -.3, eye: 1 } }),
  Bta: pose({ y: -126, lean: 14, hd: -10, tw: .3, a1: [-30, 100], w1: 95, h1: 'grip', a2: [70, 40], l1: [40, 60], l2: [-35, 30], ex: { brow: -.8 } }),
  Bth: pose({ y: -128, lean: 30, hd: -12, tw: .25, a1: [95, -5], w1: 95, h1: 'grip', a2: [-50, 30], l1: [55, 50], l2: [-45, 10], ex: { brow: -.9, mouth: 'grit' } })
};
const K7 = {
  A: [[0, P7.Ag], [.42, P7.Aduck, .06, 'o'], [.70, P7.Aupa, .1], [.83, P7.Aup, .05, 'o'], [1.24, P7.Ablk, .06, 'o'], [1.40, P7.Aslid, .1, 'o'], [1.65, P7.Aspw, .12], [1.82, P7.Akick, .06, 'o'], [2.25, P7.Ag, .2], [2.82, P7.Aside, .06, 'o']],
  B: [[0, P7.Bg], [.25, P7.Bsw, .12], [.38, P7.Bsl, .05, 'o'], [.46, P7.Bfol, .06, 'o'], [.85, P7.Bblk, .05, 'o'], [1.1, P7.Bch, .1], [1.22, P7.Bkk, .04, 'o'], [1.86, P7.Bdodge, .06, 'o'], [2.25, P7.Bta, .15], [2.8, P7.Bth, .05, 'o']],
  Ax: [[0, 450], [.42, 450], [.83, 475, .1], [1.24, 465], [1.40, 400, .14, 'o'], [1.82, 470, .1], [2.25, 460, .2], [2.82, 435, .06]],
  Bx: [[0, 860], [.38, 805, .1], [.85, 805], [1.22, 790, .06], [1.86, 860, .08, 'o'], [2.25, 860], [2.8, 760, .06, 'o']]
};
shot(23.5, 26.5, 'exchange', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  const hitT = [.84, 1.23]; let shake = 0; for (const h of hitT) if (lt > h && lt < h + .2) shake = (kf % 2 ? 4 : -4);
  ctx.save(); ctx.translate(shake, 0);
  bg(ctx, BG.med, 300, 0);
  const gy = 655, s = 1.12;
  const pa = sv(lt, K7.A), pb = sv(lt, K7.B), ax = sv(lt, K7.Ax), bx = sv(lt, K7.Bx);
  const wind = k * 1.1;
  const dA = g => { seed('s7a', k); drawFigure(g, CH.A, pa, { x: ax, y: gy, s, f: 1, wind }); };
  const dB = g => { seed('s7b', k); drawFigure(g, CH.B, pb, { x: bx, y: gy, s, f: -1, wind }); };
  reflectDraw(ctx, gy, g => { dB(g); dA(g); }, .2);
  // slash smear
  if (lt > .32 && lt < .46) { const c = jpos(P7.Bsl, { x: bx, y: gy, s, f: -1 }, 'A1.s'); const pts = []; for (let i = 0; i <= 8; i++) { const a = lerp(-2.2, -3.6, i / 8); pts.push([c[0] + Math.cos(a) * 150, c[1] + Math.sin(a) * 60 + 40]); } smearArc(ctx, pts, 16, '#dfe6fb', '#5a6a9a'); }
  dB(ctx); dA(ctx);
  if (lt > 1.25 && lt < 1.5) { const ph = (lt - 1.25) / .25; drawWaterBurst(ctx, ax - 10, gy + 4, 60, ph, 71); drawWaterBurst(ctx, ax + 40, gy + 4, 40, ph * 1.2, 72); }
  for (const h of hitT) if (lt > h && lt < h + .17) { const p = h < 1 ? jpos(P7.Bblk, { x: bx, y: gy, s, f: -1 }, 'A1.e') : jpos(P7.Ablk, { x: ax, y: gy, s, f: 1 }, 'A1.w'); drawSpark(ctx, p[0], p[1], 46, kf + h * 100, { n: 10 }); }
  ctx.restore();
  drawSplashes(ctx, k, { x0: 0, x1: W, y0: 380, y1: 720 }, 45, 1.2);
  drawRain(ctx, k, { d: [1, 1, .8] });
  for (const h of hitT) if (lt > h && lt < h + .085) invertFrame(ctx, .9);
});
// ======================= S8 — the blade grazes A's cheek (slow motion, harmony) =======================
shot(26.5, 28.5, 'graze', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  const cutT = .22, slow = lt > cutT ? cutT + (lt - cutT) * .18 : lt;
  const painted = lt > .3 && lt < 1.7;
  bg(ctx, BG.cuA2, 80, 60);
  const ex = lt < cutT ? { brow: -.2, eye: 1.15, mouth: 'closed' } : lt < 1.2 ? { brow: .2, eye: 1.25, mouth: 'open', mo: .4 } : { brow: -.85, eye: .85, mouth: 'grit' };
  const o = { x: 540, y: 320, r: 142, f: 1, yaw: .72, lm: 'night', ex, wind: painted ? 3 + Math.floor(lt * 3) * .2 : k * .8, cut: lt > cutT, L: [-.5, -.85], paint: painted ? 1.4 : 0, rim: { d: [.95, .1], c: '#c9d4f6', lc: '#e8eeff', k: .05 } };
  seed('s8', painted ? 'p' + Math.floor(lt * 3) : k);
  drawBust(ctx, CH.A, o);
  // the blade passes (on ones) with a smear trail
  if (lt > .1 && lt < .4) {
    const u = clamp((lt - .1) / .2, 0, 1), x = lerp(1500, -500, u), y = 300 + u * 40;
    const len = 520;
    smearArc(ctx, [[x + len, y - 6], [x + len * 1.6, y - 10], [x + len * 2.4, y - 4]], 22, '#cfd8f2', '#6a7aa8');
    const bl = shape([[x, y - 14], [x + len * .8, y - 16], [x + len, y + 6, 1], [x + len * .8, y + 22], [x, y + 18]], 0, 4);
    cel(ctx, bl, { f: '#b9c3da', bands: [{ c: '#7f88a0', shape: shape([[x - 10, y + 4], [x + len + 10, y + 4], [x + len, y + 40], [x - 10, y + 40]], 0, 4), inside: true }], lw: 3, lc: '#1a1424' });
  }
  if (lt > cutT) {
    const c = headPt(o, -.62, .5);
    drawBloodSpray(ctx, c[0], c[1], Math.PI * 1.15, .5, Math.min(1.2, (slow - cutT) * 3.2 + .05), 81, 1.3, 'night');
    // severed hair strands drifting
    seed('strand');
    for (let i = 0; i < 5; i++) { const sx = c[0] + rnd(-40, 60) - (slow - cutT) * 200, sy = c[1] - 160 + rnd(-30, 30) + (slow - cutT) * 120; stk(ctx, [sx, sy], [sx + rnd(14, 24), sy + rnd(-6, 6)], 2.4, lc1('#eec54c', 'night'), .2); }
  }
  if (painted) { drawConc(ctx, 560, 330, 1, { r0: 330, n: 60, c: '#dfe4f5', a: .25 }); }
  drawRain(ctx, painted ? 3 : k, { d: [.4, .6, painted ? .3 : .9] });
  if (lt > cutT && lt < cutT + .085) invertFrame(ctx, .85);
});
// ======================= S9 — the counter-punch =======================
shot(28.5, 30.5, 'punch', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  const hit = .35;
  const shake = lt > hit && lt < hit + .3 ? (kf % 2 ? 6 : -6) : 0;
  ctx.save(); ctx.translate(shake, 0);
  bg(ctx, BG.cuB, 100, 60);
  let o;
  if (lt < hit) o = { yaw: .62, tilt: 0, dx: 0, ex: { brow: -.6, eye: .8 } };
  else if (lt < 1.2) o = { yaw: .95, tilt: .32, dx: 70, ex: { brow: -.2, eye: 0, mouth: 'grit' } };
  else if (lt < 1.45) o = { yaw: .85, tilt: .18, dx: 40, ex: { brow: -.6, eye: .5, mouth: 'grit' } };
  else o = { yaw: .7, tilt: .06, dx: 20, ex: { brow: -.95, eye: .8, mouth: 'grit', look: [-.4, 0] } };
  Object.assign(o, { x: 760, y: 320, r: 142, f: -1, lm: 'night', wind: k * .9 + (lt > hit ? 4 : 0), L: [.5, -.85], blood: lt > 1.2 ? [[[.05, .8], [.12, .95], [.1, 1.12]]] : null, rim: { d: [-.95, .1], c: '#8a94c0', lc: '#a8b4e0', k: .04 } });
  seed('s9', k); drawBust(ctx, CH.B, o);
  // A's fist enters from the left
  if (lt < .7) {
    const u = clamp(lt / hit, 0, 1); const back = lt > hit ? (lt - hit) / .35 : 0;
    const fx = lerp(-260, 600, easeIn(u)) - back * 220, fy = 330;
    const pf = pose({ x: 0, y: -143, tw: .2, a1: [92, 0], a2: [0, 0], l1: [0, 0], l2: [0, 0] });
    const hpt = jpos(pf, { x: 0, y: 0, s: 3.6, f: 1 }, 'A1.w');
    seed('s9f', k); drawFigure(ctx, CH.A, Object.assign({}, pf, { order: ['A1'] }), { x: fx - hpt[0], y: fy - hpt[1], s: 3.6, f: 1, lm: 'night' });
    if (lt < hit) { seed('sm9', kf); for (let i = 0; i < 10; i++) { const y = fy + rnd(-60, 60); ink(ctx, [[fx - 400 - rnd(0, 300), y], [fx - 60, y]], { w: rnd(2, 6), c: '#cdd6f0', a: .6, t0: .8, t1: .1 }); } }
  }
  if (lt > hit && lt < hit + .25) { const c = headPt(Object.assign({}, o, { x: o.x + o.dx }), .2, .7); drawSpark(ctx, c[0] - 60, c[1], 90, 9, { n: 16, c: '#ffffff', c2: '#dfe6ff', lc: '#5060a0', glow: '#9fb0ff' }); }
  if (lt > hit + .05) { const c = headPt(Object.assign({}, o, { x: o.x + o.dx }), .55, .78); drawBloodSpray(ctx, c[0], c[1], -.25, .45, Math.min(1, (lt - hit - .05) * 1.6), 91, 1.2); }
  ctx.restore();
  if (lt > hit - .02 && lt < hit + .25) drawConc(ctx, 560, 330, kf, { r0: 260, n: 100, c: '#f4f2fa', a: .9, w: 8 });
  drawRain(ctx, k, { d: [.4, .7, 1] });
  if (lt > hit && lt < hit + .125) invertFrame(ctx);
});
// ======================= S10 — the kick, the flight, the lantern =======================
const P10 = {
  Bsp: pose({ y: -138, lean: 10, hd: 0, tw: .0, yaw: .95, a1: [-40, 70], w1: -20, h1: 'grip', a2: [40, 80], l1: [10, 20], l2: [-20, 15], ex: { brow: -.8 } }),
  Brh: pose({ y: -150, lean: -32, hd: 8, tw: .1, a1: [-60, 40], w1: -40, h1: 'grip', a2: [70, 30], l1: [105, 6], l2: [-6, 8], ex: { brow: -.9, mouth: 'grit' } }),
  Bpost: pose({ y: -140, lean: -8, hd: -4, tw: .3, a1: [30, 40], w1: 70, h1: 'grip', a2: [-10, 30], l1: [15, 8], l2: [-12, 5], ex: { brow: -.6 } }),
  Bcr: pose({ y: -104, lean: 30, hd: -24, tw: .25, a1: [-30, 50], w1: -60, h1: 'grip', a2: [40, 80], l1: [70, 115], l2: [-25, 90], ex: { brow: -.8 } }),
  Afly1: pose({ y: -143, lean: -55, hd: 30, tw: .3, a1: [150, 20], a2: [120, 40], l1: [50, 60], l2: [20, 80], ex: { brow: .3, eye: 0, mouth: 'open' } }),
  Afly2: pose({ y: -143, lean: -95, hd: 20, tw: .4, a1: [190, 40], a2: [160, 20], l1: [80, 40], l2: [40, 90], ex: { brow: .3, eye: 0, mouth: 'grit' } }),
  Askid: pose({ y: -40, lean: -82, hd: 30, tw: .4, a1: [150, 30], a2: [80, 40], l1: [75, 10], l2: [60, 40], ex: { brow: -.3, eye: .3, mouth: 'grit' } }),
  Aslump: pose({ y: -48, lean: -40, hd: 35, tw: .45, a1: [30, 20], a2: [-20, 30], l1: [80, 40], l2: [70, 80], ex: { brow: -.2, eye: .15, mouth: 'open', mo: .4 } })
};
shot(30.5, 34, 'kick', (ctx, lt, k, t) => {
  const kf = Math.floor(lt * 24);
  const hit = .33, crash = 1.5;
  let shake = 0; if (lt > hit && lt < hit + .2) shake = kf % 2 ? 5 : -5; if (lt > crash && lt < crash + .3) shake = kf % 2 ? 7 : -7;
  ctx.save(); ctx.translate(shake, shake * .3);
  const camX = sv(lt, [[0, 300], [1.25, 120, .95, 'io']]);
  bg(ctx, BG.med, camX, 0);
  const gy = 655, s = 1.0;
  // breakable lantern (a cel on its own level)
  const lx = 430 - camX;
  seed('lant10', 0);
  if (lt < crash) paintLantern(ctx, lx, gy + 8, 230, PAL.night, { sd: 77 });
  else { ctx.save(); ctx.beginPath(); ctx.rect(0, gy - 70, W, 200); ctx.clip(); seed('lant10', 0); paintLantern(ctx, lx, gy + 8, 230, PAL.night, { sd: 77 }); ctx.restore(); paintRubble(ctx, lx + 10, gy + 2, 90, PAL.night, 78, 7); }
  // B
  const pb = sv(lt, [[0, P7.Bg], [.25, P10.Bsp, .14], [hit, P10.Brh, .07, 'o'], [.9, P10.Bpost, .3], [2.9, P10.Bcr, .3]]);
  const bxw = 1080 - camX;
  // A trajectory
  let pa, ax, ay = gy;
  if (lt < hit) { pa = P7.Ag; ax = 890 - camX; }
  else if (lt < .95) { const u = (lt - hit) / (.95 - hit); pa = u < .45 ? P10.Afly1 : P10.Afly2; ax = lerp(890, 600, u) - camX; ay = gy - Math.sin(u * Math.PI) * 120; }
  else if (lt < crash) { const u = (lt - .95) / (crash - .95); pa = P10.Askid; ax = lerp(600, 470, easeOut(u)) - camX; }
  else { pa = P10.Aslump; ax = 468 - camX; }
  const dA = g => { seed('s10a', k); drawFigure(g, CH.A, pa, { x: ax, y: ay, s, f: 1, wind: k * 1.3, blood: [[[-.95, -.3], [-.92, 0], [-.97, .2]]] }); };
  const dB = g => { seed('s10b', k); drawFigure(g, CH.B, pb, { x: bxw, y: gy, s, f: -1, wind: k * 1.3 }); };
  reflectDraw(ctx, gy, g => { dB(g); dA(g); }, .2);
  dB(ctx);
  if (lt > .95 && lt < crash + .1) { const ph = ((kf % 6) / 6); drawWaterBurst(ctx, ax + 70, gy + 4, 55, ph, 100 + (kf / 6 | 0)); drawWaterBurst(ctx, ax + 130, gy + 4, 35, (ph + .5) % 1, 200 + (kf / 6 | 0)); }
  dA(ctx);
  if (lt > crash) {
    const u = Math.floor((lt - crash) * 12) / 12;
    if (u < 1) drawChunks(ctx, lx, gy - 120, u, 14, 10, 1.1);
    for (let i = 0; i < 4; i++) { const pu = Math.min(1, u * .8); ctx.globalAlpha = 1 - pu * .6; drawPuff(ctx, lx + (i - 1.5) * 50 + pu * 30 * (i - 1.5), gy - 40 - pu * 90 - i * 10, 30 + pu * 34, 300 + i + Math.floor(lt * 3), ['#3c4462', '#262c44', '#4e5880', null, '#0e1018'], [-.4, -.8], 1.6); ctx.globalAlpha = 1; }
  }
  if (lt > hit && lt < hit + .2) { const p = jpos(P10.Brh, { x: bxw, y: gy, s, f: -1 }, 'L1.a'); drawSpark(ctx, p[0], p[1], 70, 101, { n: 14 }); drawConc(ctx, p[0], p[1], kf, { r0: 180, n: 70, a: .6 }); }
  ctx.restore();
  drawSplashes(ctx, k, { x0: 0, x1: W, y0: 380, y1: 720 }, 45, 1.2);
  drawRain(ctx, k, { d: [1, 1, .8] });
  if ((lt > hit && lt < hit + .085) || (lt > crash && lt < crash + .085)) invertFrame(ctx, .9);
});
