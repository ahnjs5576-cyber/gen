// ===================================================================
//  BACKGROUND ART — each painted once, like a background painter's board
// ===================================================================
const BG = {};
function board(w, h) { const c = mkCanvas(w, h); return [c, c.getContext('2d')]; }

// shared: the mountain shrine courtyard on the cliff
function paintCourtyard(g, w, h, P, o) {
  const hz = o.hz;
  paintSky(g, w, hz + 40, P);
  if (o.moon) paintMoon(g, o.moon[0], o.moon[1], o.moon[2], P);
  paintStorm(g, w, hz + 20, P, { sd: o.sd || 0, rows: o.cloudRows, scale: o.cloudScale || 1 });
  paintMountains(g, w, P, [
    { y: hz - 70 * o.ms, amp: 70 * o.ms, depth: 120, c: P.mtn[0], sd: 3.1 },
    { y: hz - 35 * o.ms, amp: 55 * o.ms, depth: 80, c: P.mtn[1], sd: 7.7 },
    { y: hz - 5 * o.ms, amp: 30 * o.ms, depth: 60, c: P.mtn[2], sd: 12.3, rough: 1.4 }]);
  // mist band at the cliff edge
  seed('edge', o.sd || 0);
  for (let i = 0; i < w / 6; i++) { g.globalAlpha = rnd(.08, .22); brush(g, rnd(-60, w), hz - rnd(-6, 30), rnd(60, 180), rnd(-.02, .02), rnd(6, 18), P.mist, { nob: 1 }); }
  g.globalAlpha = 1;
  // cliff lip / low stone edge
  const lip = []; for (let x = -10; x <= w + 10; x += 20) lip.push([x, hz + rnd(-2, 2)]);
  for (const t of (o.torii || [])) paintTorii(g, t.x, t.y, t.h, P, t);
  for (const c of (o.cedarsBack || [])) paintCedar(g, c.x, c.y, c.h, P, c.sd, c);
  g.fillStyle = css(P.stoneD); g.fillRect(0, hz - 2, w, 5);
  paintPavement(g, w, h, P, { hz: hz + 2, vx: o.vx, sd: o.sd || 0, puddles: o.puddles || 16, rowK: o.rowK, slab: o.slab });
  const lamps = [];
  for (const L of (o.lanterns || [])) lamps.push(Object.assign(paintLantern(g, L.x, L.y, L.h, P, L), { lit: L.lit }));
  for (const c of (o.cedars || [])) paintCedar(g, c.x, c.y, c.h, P, c.sd, c);
  reflect(g, w, h, hz + 2, o.reflA ?? .3, P);
  for (const L of lamps) if (L.lit) {
    paintLampSheen(g, L.win[0], hz + 4, h, 8 * L.s, P.lamp, .25);
    const gr = g.createRadialGradient(L.win[0], L.win[1], 2, L.win[0], L.win[1], 60 * L.s);
    gr.addColorStop(0, 'rgba(255,190,110,.35)'); gr.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = gr; g.fillRect(L.win[0] - 80 * L.s, L.win[1] - 80 * L.s, 160 * L.s, 160 * L.s);
  }
  for (const r of (o.rubble || [])) paintRubble(g, r[0], r[1], r[2], P, r[3], r[4]);
  if (o.post) o.post(g);
  applyPaper(g, w, h, .26);
  return lamps;
}
function paintMoon(g, x, y, r, P) {
  for (let i = 0; i < 30; i++) { g.globalAlpha = .05; brush(g, x - r * 4 + rnd(0, r * 8), y + rnd(-r * 2, r * 2), rnd(r, r * 4), rnd(-.1, .1), rnd(r * .3, r), '#b8c2e0', { nob: 1 }); }
  g.globalAlpha = 1;
  const d = shape(Array.from({ length: 16 }, (_, i) => [x + Math.cos(i / 16 * TAU) * r, y + Math.sin(i / 16 * TAU) * r]), .6, 3);
  cel(g, d, { f: '#e8e6dc', bands: [{ c: '#c9cbd6', off: [r * .25, r * .2] }], lw: 0 });
}

function buildBackgrounds() {
  const P = PAL.night;
  // ---- wide establishing board 1700x720 ----
  {
    const [c, g] = board(1700, 720);
    BG.wideLamps = paintCourtyard(g, 1700, 720, P, {
      hz: 420, vx: 860, ms: 1, sd: 1,
      torii: [{ x: 860, y: 424, h: 250, sd: 1 }],
      cedarsBack: [{ x: 1500, y: 430, h: 300, sd: 11 }, { x: 1580, y: 436, h: 360, sd: 12 }, { x: 230, y: 432, h: 320, sd: 13 }, { x: 140, y: 438, h: 290, sd: 14 }],
      lanterns: [{ x: 700, y: 452, h: 70, sd: 1 }, { x: 1020, y: 452, h: 70, sd: 2, lit: 1 }, { x: 560, y: 500, h: 110, sd: 3, lit: 1 }, { x: 1160, y: 500, h: 110, sd: 4 }],
      cedars: [{ x: 40, y: 760, h: 760, sd: 21, wide: 1.2 }, { x: 1670, y: 760, h: 800, sd: 22, wide: 1.1 }],
      puddles: 18
    });
    BG.wide = c;
  }
  // ---- medium fight board 1900x720: lower camera ----
  {
    const [c, g] = board(1900, 720);
    BG.medLamps = paintCourtyard(g, 1900, 720, P, {
      hz: 360, vx: 950, ms: 1.6, sd: 2, cloudScale: 1.4, rowK: .3, slab: 1.5,
      cloudRows: [[.15, 9], [.4, 8], [.7, 7]],
      torii: [{ x: 1250, y: 366, h: 330, sd: 2 }],
      cedarsBack: [{ x: 300, y: 372, h: 380, sd: 31 }, { x: 420, y: 376, h: 300, sd: 32 }, { x: 1750, y: 372, h: 420, sd: 33 }],
      lanterns: [{ x: 620, y: 420, h: 150, sd: 5, lit: 1 }, { x: 1560, y: 430, h: 170, sd: 6 }],
      puddles: 14, reflA: .34
    });
    BG.med = c;
  }

  // ---- close-up backdrops: out-of-focus painted darkness ----
  for (const [key, warm, sd] of [['cuA', 1, 1], ['cuB', 0, 2], ['cuA2', 1, 3]]) {
    const [c, g] = board(1400, 800);
    for (let y = 0; y < 800; y += 4) { g.fillStyle = css(mixc('#0a0e1c', '#222b48', Math.pow(y / 800, 1.4))); g.fillRect(0, y, 1400, 5); }
    seed('cu', sd);
    for (let i = 0; i < 900; i++) { const x = rnd(-50, 1400), y = rnd(-20, 800); brush(g, x, y, rnd(80, 220), Math.PI / 2 + .2 + rnd(-.05, .05), rnd(10, 30), jitc(mixc('#0c1122', '#2a3354', y / 800 * rnd(.5, 1)), 5)); }
    // soft distant shapes: cedar trunks, lantern glow
    for (let i = 0; i < 5; i++) { const x = rnd(0, 1400); g.globalAlpha = .5; brush(g, x, -20, 860, Math.PI / 2, rnd(40, 90), '#0a0f1a', { bend: 0 }); g.globalAlpha = 1; }
    if (warm) {
      const lx = sd === 1 ? 260 : 1150, ly = 330;
      for (let i = 0; i < 40; i++) { g.globalAlpha = .06; brush(g, lx + rnd(-60, 60), ly + rnd(-60, 60), rnd(40, 120), rnd(0, TAU), rnd(20, 60), '#e09a50', { nob: 1 }); }
      g.globalAlpha = 1;
      const gr = g.createRadialGradient(lx, ly, 0, lx, ly, 180); gr.addColorStop(0, 'rgba(255,190,110,.45)'); gr.addColorStop(1, 'rgba(255,160,80,0)'); g.fillStyle = gr; g.fillRect(lx - 200, ly - 200, 400, 400);
    }
    for (let i = 0; i < 260; i++) dryBrush(g, rnd(0, 1400), rnd(-100, 800), rnd(80, 300), Math.PI / 2 + .2, rnd(3, 10), '#6d7aa6', rnd(.04, .1));
    for (let i = 0; i < 60; i++) { g.globalAlpha = rnd(.05, .12); brush(g, rnd(-100, 1400), rnd(450, 800), rnd(150, 400), rnd(-.03, .03), rnd(20, 50), '#3b4670', { nob: 1 }); }
    g.globalAlpha = 1;
    applyPaper(g, 1400, 800, .28);
    BG[key] = c;
  }
  // ---- puddle, looking down ----
  {
    const [c, g] = board(1400, 800);
    seed('pud');
    // stones
    g.fillStyle = css(P.joint); g.fillRect(0, 0, 1400, 800);
    const slabs = [[-40, -40, 520, 300], [490, -60, 980, 260], [990, -40, 1460, 340], [-60, 280, 420, 860], [430, 250, 1010, 420], [1000, 350, 1460, 860], [420, 430, 1000, 860]];
    for (const [x0, y0, x1, y1] of slabs) {
      const q = jit([[x0 + 6, y0 + 6], [x1 - 6, y0 + 6], [x1 - 6, y1 - 6], [x0 + 6, y1 - 6]], 5);
      fillD(g, q, jitc(mixc(P.stone, P.stoneD, rnd(0, .5)), 6));
      g.save(); poly(g, q); g.clip();
      for (let i = 0; i < 160; i++) brush(g, rnd(x0, x1), rnd(y0, y1), rnd(20, 70), rnd(0, TAU), rnd(3, 9), jitc(R() < .5 ? P.stoneL : P.stoneD, 6));
      g.restore();
    }
    // the puddle reflects the sky
    const pts = []; for (let a = 0; a < 16; a++) { const an = a / 16 * TAU; pts.push([700 + Math.cos(an) * rnd(430, 560), 420 + Math.sin(an) * rnd(260, 330)]); }
    const d = spline(pts, true, 4);
    g.save(); poly(g, d); g.clip();
    paintSky(g, 1400, 800, PAL.night);
    paintStorm(g, 1400, 800, P, { sd: 9, bright: .15 });
    g.restore();
    ink(g, d, { dense: true, closed: true, w: 3, c: P.joint });
    applyPaper(g, 1400, 800, .28);
    BG.puddle = c; BG.puddleShape = d;
  }
  // ---- low-angle storm sky, torii beam at the bottom (tall board for tilts) ----
  {
    const [c, g] = board(1500, 1300);
    paintSky(g, 1500, 1300, P);
    paintStorm(g, 1500, 1300, P, { sd: 5, scale: 1.6, dense: 180, bright: .05 });
    // torii top seen from below
    const ky = 1080;
    const kk = [[-40, ky - 90, 1], [400, ky - 40], [900, ky - 20], [1300, ky - 30], [1560, ky - 70, 1], [1560, ky + 40, 1], [1300, ky + 50], [900, ky + 60], [400, ky + 70], [-40, ky + 60, 1]];
    cel(g, shape(kk, 1, 5), { f: '#1d1418', bands: [{ c: '#3a2628', off: [0, 14] }], lw: 4, lc: '#0c0709' });
    const sh = [[-40, ky + 60], [1560, ky + 40], [1560, ky + 120], [-40, ky + 130]];
    cel(g, shape(sh, 1, 5), { f: '#3b2022', bands: [{ c: '#25131a', off: [0, -18] }], lw: 3, lc: '#0c0709' });
    for (let i = 0; i < 200; i++) brush(g, rnd(0, 1500), ky + rnd(-40, 120), rnd(40, 120), rnd(-.05, .05), rnd(2, 5), jitc(R() < .5 ? '#4a2a2a' : '#170d10', 6));
    const pl = [[600, ky + 120], [700, ky + 120], [690, 1320], [610, 1320]];
    cel(g, shape(pl, 1, 5), { f: '#3b2022', bands: [{ c: '#22121a', off: [30, 0] }], lw: 3, lc: '#0c0709' });
    applyPaper(g, 1500, 1300, .26);
    BG.sky = c; BG.skyBeamY = ky;
  }
  // ---- aftermath: crater in the courtyard ----
  const crater = (g, cx, cy, rw, rh, P) => {
    seed('crater');
    const rim = []; for (let a = 0; a < 24; a++) { const an = a / 24 * TAU; rim.push([cx + Math.cos(an) * rw * rnd(.9, 1.1), cy + Math.sin(an) * rh * rnd(.85, 1.15)]); }
    const d = spline(rim, true, 4);
    cel(g, d, { f: mixc(P.stoneD, P.joint, .6), bands: [{ c: P.stoneL, off: [0, rh * .25] }], lw: 3, lc: P.joint });
    g.save(); poly(g, d); g.clip();
    for (let i = 0; i < 300; i++) brush(g, cx + rnd(-rw, rw), cy + rnd(-rh, rh), rnd(10, 40), rnd(-.3, .3), rnd(2, 6), jitc(R() < .5 ? P.stoneD : P.water, 5));
    const wp = rim.map(p => [cx + (p[0] - cx) * .55, cy + rh * .2 + (p[1] - cy) * .5]);
    fillD(g, spline(wp, true, 4), mixc(P.water, P.sheen, .3));
    g.restore();
    // radial cracks
    for (let i = 0; i < 22; i++) { const a = rnd(0, TAU); let p = [cx + Math.cos(a) * rw, cy + Math.sin(a) * rh]; const pts = [p]; for (let j = 0; j < 5; j++) { p = [p[0] + Math.cos(a + rnd(-.5, .5)) * rw * rnd(.1, .25), p[1] + Math.sin(a + rnd(-.5, .5)) * rh * rnd(.1, .25)]; pts.push(p); } ink(g, pts, { w: rnd(1.5, 3.5), c: P.joint, t0: .1, t1: .8 }); }
    paintRubble(g, cx - rw * 1.1, cy + rh * .4, rw * .25, P, 5, 7);
    paintRubble(g, cx + rw * 1.05, cy + rh * .3, rw * .22, P, 6, 6);
    paintRubble(g, cx + rw * .2, cy - rh * 1.05, rw * .18, P, 7, 5);
  };
  {
    const [c, g] = board(1700, 720);
    paintCourtyard(g, 1700, 720, P, {
      hz: 420, vx: 860, ms: 1, sd: 4,
      torii: [{ x: 860, y: 424, h: 250, sd: 1, broken: 1 }],
      cedarsBack: [{ x: 1500, y: 430, h: 300, sd: 11 }, { x: 1580, y: 436, h: 360, sd: 12 }, { x: 230, y: 432, h: 320, sd: 13 }, { x: 140, y: 438, h: 290, sd: 14 }],
      lanterns: [{ x: 700, y: 452, h: 70, sd: 1 }, { x: 1160, y: 500, h: 110, sd: 4, tilt: .15 }],
      cedars: [{ x: 40, y: 760, h: 760, sd: 21, wide: 1.2 }, { x: 1670, y: 760, h: 800, sd: 22, wide: 1.1 }],
      puddles: 14, rubble: [[560, 520, 60, 8, 7], [990, 470, 40, 9, 5]],
      post: g2 => crater(g2, 850, 560, 260, 70, P)
    });
    BG.crater = c;
  }
  {
    const PM = PAL.moon;
    const [c, g] = board(1700, 720);
    paintCourtyard(g, 1700, 720, PM, {
      hz: 420, vx: 860, ms: 1, sd: 6, moon: [1090, 120, 34],
      cloudRows: null, cloudScale: 1.2,
      torii: [{ x: 860, y: 424, h: 250, sd: 1, broken: 1 }],
      cedarsBack: [{ x: 1500, y: 430, h: 300, sd: 11 }, { x: 1580, y: 436, h: 360, sd: 12 }, { x: 230, y: 432, h: 320, sd: 13 }, { x: 140, y: 438, h: 290, sd: 14 }],
      lanterns: [{ x: 700, y: 452, h: 70, sd: 1 }, { x: 1160, y: 500, h: 110, sd: 4, tilt: .15 }],
      cedars: [{ x: 40, y: 760, h: 760, sd: 21, wide: 1.2 }, { x: 1670, y: 760, h: 800, sd: 22, wide: 1.1 }],
      puddles: 18, reflA: .42, rubble: [[560, 520, 60, 8, 7], [990, 470, 40, 9, 5]],
      post: g2 => { crater(g2, 850, 560, 260, 70, PM); paintLampSheen(g2, 1090, 424, 720, 30, '#c9d2ee', .35); }
    });
    BG.moon = c;
  }
  // ---- overhead: wet stones seen from straight above ----
  {
    const [c, g] = board(1400, 900);
    seed('top');
    g.fillStyle = css(P.joint); g.fillRect(0, 0, 1400, 900);
    for (let y = -40; y < 940; y += 0) {
      const hh = rnd(150, 230); let x = -rnd(0, 200);
      while (x < 1440) { const ww = rnd(180, 340); const q = jit([[x + 5, y + 5], [x + ww - 5, y + 5], [x + ww - 5, y + hh - 5], [x + 5, y + hh - 5]], 4); fillD(g, q, jitc(mixc(P.stone, P.stoneD, rnd(0, .6)), 6)); g.save(); poly(g, q); g.clip(); for (let i = 0; i < 70; i++) brush(g, rnd(x, x + ww), rnd(y, y + hh), rnd(20, 60), rnd(0, TAU), rnd(3, 8), jitc(R() < .5 ? P.stoneL : P.stoneD, 6)); g.restore(); x += ww; }
      y += hh;
    }
    for (let i = 0; i < 9; i++) { const px = rnd(0, 1400), py = rnd(0, 900), rw = rnd(60, 180); const pts = []; for (let a = 0; a < 12; a++) { const an = a / 12 * TAU; pts.push([px + Math.cos(an) * rw * rnd(.6, 1.1), py + Math.sin(an) * rw * .7 * rnd(.6, 1.1)]); } const d = spline(pts, true, 4); fillD(g, d, mixc(P.water, P.sheen, .25)); g.save(); poly(g, d); g.clip(); for (let j = 0; j < 30; j++) brush(g, rnd(px - rw, px + rw), rnd(py - rw, py + rw), rnd(20, 60), rnd(0, TAU), rnd(3, 8), jitc(R() < .5 ? P.sheen : P.water, 6), { nob: 1 }); g.restore(); ink(g, d, { dense: true, closed: true, w: 2, c: P.joint, a: .8 }); }
    for (let i = 0; i < 14; i++) { let p = [rnd(0, 1400), rnd(0, 900)]; const pts = [p]; const a = rnd(0, TAU); for (let j = 0; j < 6; j++) { p = [p[0] + Math.cos(a + rnd(-.6, .6)) * 40, p[1] + Math.sin(a + rnd(-.6, .6)) * 40]; pts.push(p); } ink(g, pts, { w: rnd(1.5, 3), c: P.joint, t0: .1, t1: .7 }); }
    paintRubble(g, 300, 200, 70, P, 11, 6); paintRubble(g, 1100, 700, 60, P, 12, 5); paintRubble(g, 1150, 150, 40, P, 13, 4);
    applyPaper(g, 1400, 900, .28);
    BG.top = c;
  }
}
