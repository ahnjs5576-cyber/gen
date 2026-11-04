// ───────────────────────── shots, act one ─────────────────────────
const SCN = {};
const CEL = mkCanvas(W, H), CC = CEL.getContext('2d');
const CEL_CACHE = new Map();
function celLayer(c, fn, o = {}) {
  if (o.cache) { // reuse the same drawing while it is held (cels change on twos/threes); drawn in layout space, camera applied on composite
    let e = CEL_CACHE.get(o.cache); if (!e) { e = { cv: mkCanvas(W, H), key: null }; CEL_CACHE.set(o.cache, e); }
    if (e.key !== o.key) {
      const k = e.cv.getContext('2d'); k.setTransform(1, 0, 0, 1, 0, 0); k.clearRect(0, 0, W, H); e.ret = fn(k);
      k.setTransform(1, 0, 0, 1, 0, 0); k.globalCompositeOperation = 'source-atop'; k.fillStyle = 'rgba(176,186,210,0.04)'; k.fillRect(0, 0, W, H);
      if (o.fall) { const f = o.fall, g = k.createLinearGradient(f[0], f[1], f[2], f[3]); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, css(f[4] || '#050814', f[5] ?? 0.55)); k.fillStyle = g; k.fillRect(0, 0, W, H); }
      k.globalCompositeOperation = 'source-over'; e.key = o.key;
    }
    c.drawImage(e.cv, 0, 0); return e.ret;
  }
  CC.setTransform(1, 0, 0, 1, 0, 0); CC.clearRect(0, 0, W, H); CC.setTransform(c.getTransform());
  const r = fn(CC);
  CC.setTransform(1, 0, 0, 1, 0, 0); CC.globalCompositeOperation = 'source-atop'; CC.fillStyle = 'rgba(176,186,210,0.04)'; CC.fillRect(0, 0, W, H);
  if (o.fall) { // airbrushed light falloff across the whole cel (BL pass)
    const f = o.fall, g = CC.createLinearGradient(f[0], f[1], f[2], f[3]); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, css(f[4] || '#050814', f[5] ?? 0.55));
    CC.fillStyle = g; CC.fillRect(0, 0, W, H);
  }
  CC.globalCompositeOperation = 'source-over';
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(CEL, 0, 0); c.restore();
  return r;
}
const PUD1 = [[110, 618], [260, 604], [470, 610], [700, 600], [890, 614], [935, 642], [850, 680], [620, 694], [360, 698], [160, 688], [92, 652]];
function lampFlicker(t) {
  const f = Math.floor(t * FPS), ev = [[46, 60], [126, 138], [170, 186]], pat = [0.25, 1, 0.08, 0.7, 0.04, 1, 0.35, 0.95, 0.12, 1, 0.45, 0.85, 0.1, 0.75];
  for (const [a, b] of ev) if (f >= a && f < b) return pat[(f - a) % pat.length];
  return 0.97 + 0.03 * h1(Math.floor(f / 3) * 0.37);
}
function buildFgWeeds(seed, side = 'both') {
  const cv = mkCanvas(W, H), c = cv.getContext('2d'), rng = mulberry(seed);
  if (side !== 'right') weeds(c, -20, 230, 735, 190, rng, { dens: 1.3, col: '#05080a', col2: '#0e1714', hi: '#6a9ab8', hiP: 0.45, seedHeads: true });
  if (side !== 'left') weeds(c, 790, 990, 735, 150, rng, { dens: 1.2, col: '#05080a', col2: '#0e1714', hi: '#6a9ab8', hiP: 0.4 });
  return cv;
}
function fgDraw(c, cv, t, k = 1) { // foreground book layer with gusting sway on threes
  const s = Math.sin(q(t, 3) * 1.7) * 0.012 * k + Math.sin(q(t, 3) * 4.3) * 0.004 * k;
  c.save(); c.transform(1, 0, s, 1, -s * 735, 0); c.drawImage(cv, 0, 0); c.restore();
}
const L_S1 = (f) => ({ kx: -0.9, ky: -0.45, kc: mixs('#3a2a30', '#ffae4a', f), cx: 0.15, cy: -1, cc: '#78c8ec', fall: '#4a5a7a', warm: 0.12 * f, spec: f, specX: -110 });
function shotWide(c, lt, t) {
  const A = SCN.term, z = 1 + 0.05 * ss(0, 9, lt), ox = 600 * (1 - z), oy = 450 * (1 - z);
  c.setTransform(z, 0, 0, z, ox, oy);
  c.drawImage(A.cv, 0, 0);
  const f = lampFlicker(t);
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = f; c.drawImage(A.lamp, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  if ((t % 4) < 0.25) glow(c, 54, 347, 14, '#fff2c0', 0.9);
  const L = L_S1(f);
  celLayer(c, (k) => {
    tramSide(k, 660, RAIL_Y, 1.45, { L, win: 0, head: 0, panto: 0, ivy: 1, ivySway: q(t, 3) * 1.3 });
    catClose(k, 486, RAIL_Y + 1, 0.12, 'loaf', { L: { ...L, cc: '#78c8ec' } });
  }, { cache: 's1', key: drawingIndex(t, 3) + '|' + Math.round(f * 8) });
  // reflection of everything above the rail line in the big puddle
  const P = PUD1.map(p => [p[0] * z + ox, p[1] * z + oy]);
  reflect(c, c.canvas, P, RAIL_Y * z + oy + 4, t, { amp: 2.4, alpha: 0.85, tint: '#08101e', tintA: 0.3 });
  c.setTransform(z, 0, 0, z, ox, oy);
  // the lamp's reflection: a long painted streak, flickering with it
  c.save(); clipP(c, PUD1); c.globalCompositeOperation = 'lighter';
  air(c, 226, 650, 60, '#ff9a3a', 0.55 * f, 0.45, 1.6); air(c, 226, 640, 18, '#ffd890', 0.6 * f, 0.6, 2.5);
  air(c, 396, 640, 30, '#9fe0ff', 0.4, 0.5, 1.8); air(c, 921, 640, 30, '#ff9a3a', 0.3, 0.4, 1.4);
  c.restore();
  ripples(c, t, PUD1, { n: 12, lights: [{ x: 226, y: 650, r: 120, col: '#ffb060' }, { x: 396, y: 640, r: 60, col: '#bfe8ff' }] });
  const lights = [{ x: 226, y: 220, r: 170, col: '#ffb050', a: 0.6, k: f }, { x: 240, y: 420, r: 150, col: '#ff9a3a', a: 0.35, k: f, sy: 0.6 }, { x: 396, y: 505, r: 70, col: '#bfe8ff', a: 0.5 }, { x: 921, y: 300, r: 100, col: '#ffb050', a: 0.45 }];
  splashes(c, t, [{ x0: 0, x1: 960, y0: 592, y1: 720, n: 46, s: 1.3 }, { x0: 450, x1: 870, y0: 340, y1: 346, n: 10, s: 0.8 }, { x0: 296, x1: 960, y0: 557, y1: 562, n: 12, s: 0.8 }], { lights: [{ x: 226, y: 620, r: 160, col: '#ffb060' }] });
  rain(c, t, { seed: 1, lights });
  fgDraw(c, SCN.fg1, t);
  c.setTransform(1, 0, 0, 1, 0, 0);
  return { fade: ss(0, 2.2, lt) };
}
// insert: cat under the step
const L_S2 = (lamp = 1) => ({ kx: -1, ky: -0.35, kc: mixs('#3a2a30', '#ffa848', lamp), cx: 0.3, cy: -1, cc: '#6cb4dc' });
function underScene(c, lt, t, o) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(SCN.under, 0, 0);
  const lamp = lampFlicker(t + 3.1);
  if (o.gold) { c.save(); c.globalCompositeOperation = 'lighter'; air(c, 160, 640, 360, '#ffc060', 0.4 * o.gold, 1.2, 0.45); air(c, 200, 420, 300, '#ffb050', 0.18 * o.gold); c.restore(); }
  rain(c, t, { seed: 4, area: { x: -40, y: 120, w: 480, h: 560 }, layers: [{ n: 120, len: [14, 30], w: 0.8, a: 0.22 }, { n: 40, len: [30, 60], w: 1.3, a: 0.3 }], lights: [{ x: 150, y: 300, r: 160, col: '#ffa048', a: 0.6, k: lamp }, { x: 330, y: 470, r: 90, col: '#bfe8ff', a: 0.4 }] });
  const L = L_S2(lamp);
  if (o.gold) { L.kc = mixs(L.kc, '#ffd070', o.gold); }
  celLayer(c, (k) => {
    underStep(k, t, { L, lamp, sway: q(t, 3) * 1.2 });
    if (o.cat) o.cat(k, L);
  }, { cache: 'under', key: drawingIndex(t, 2) + '|' + Math.round(lamp * 8) + '|' + (o.gold || 0) + '|' + lt.toFixed(0) + (o.cat ? o.cat.length : 'x') + (o.tag || '') });
  const pud = [[-10, 676], [200, 668], [430, 676], [560, 700], [500, 730], [-10, 730]];
  reflect(c, c.canvas, pud, 664, t, { amp: 1.6, alpha: 0.7, tint: '#08101e', tintA: 0.4 });
  ripples(c, t, pud, { n: 6, s: 1.8, lights: [{ x: 150, y: 690, r: 200, col: '#ffb060' }] });
  splashes(c, t, [{ x0: 0, x1: 300, y0: 642, y1: 700, n: 10, s: 1.8 }], { lights: [{ x: 150, y: 660, r: 220, col: '#ffb060' }] });
  if (o.flash) { c.fillStyle = css('#a8c0ff', o.flash); c.globalCompositeOperation = 'lighter'; c.fillRect(0, 0, W, H); c.globalCompositeOperation = 'source-over'; }
}
function shotCat1(c, lt, t) {
  const f = Math.floor(lt * FPS);
  const fl = (f === 82 || f === 83) ? 0.28 : (f === 85) ? 0.12 : 0;
  const open = lt < 3.5 ? 0.1 : lt < 3.7 ? 0.35 : 0.55;
  underScene(c, lt, t, {
    tag: 'a' + open + (lt > 1.6 && lt < 1.86 ? 'e' : ''), flash: fl, cat: (k, L) => catClose(k, 430, 668, 2.05, 'loaf', { L, open, ear: (lt > 1.6 && lt < 1.78) ? 1 : (lt > 1.78 && lt < 1.86) ? 0.5 : 0, look: lt > 3.6 ? -1.5 : 0, flick: 0 })
  });
  return {};
}
function shotCat2(c, lt, t) {
  let pose = 'alert'; if (lt > 0.95) pose = 'crouch'; if (lt > 1.2) pose = 'stretch'; if (lt > 1.29) pose = 'smear'; if (lt > 1.37) pose = null;
  underScene(c, lt, t, {
    tag: 'b' + pose, gold: 1, cat: pose ? (k, L) => {
      if (pose === 'smear') catClose(k, 360, 668, 2.05, 'smear', { L });
      else catClose(k, pose === 'stretch' ? 380 : 430, 668, 2.05, pose, { L, shine: pose === 'alert' ? 1 : 0.6, ear: lt < 0.3 ? 1 : 0, look: -1 });
    } : null
  });
  if (lt > 1.2 && lt < 1.9) splashes(c, t, [{ x0: 300, x1: 560, y0: 650, y1: 668, n: 14, s: 3 }], { seed: 91, lights: [{ x: 200, y: 660, r: 300, col: '#ffc060' }] });
  return {};
}
// lightning cut: white frame, then the terminus in negative with the headlamp burning
function buildSilhouette() {
  const cv = mkCanvas(W, H), c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 560); g.addColorStop(0, '#8ea6ff'); g.addColorStop(0.5, '#dfe6ff'); g.addColorStop(1, '#f6f4ff');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  // cloud shapes as slightly darker violet masses
  const rng = mulberry(17); for (let i = 0; i < 8; i++) { c.globalAlpha = 0.35; cloudMass(c, rng() * W, 60 + rng() * 200, 300 + rng() * 300, 90, '#6a76c8', null, { seed: i + 3 }); } c.globalAlpha = 1;
  const t2 = mkCanvas(W, H), k = t2.getContext('2d');
  k.drawImage(SCN.term.land, 0, 0);
  tramSide(k, 660, RAIL_Y, 1.45, { win: 0, head: 0, panto: 0, ivy: 1 });
  k.globalCompositeOperation = 'source-in'; k.fillStyle = '#05040a'; k.fillRect(0, 0, W, H);
  c.drawImage(t2, 0, 0);
  return cv;
}
function shotBolt(c, lt, t) {
  const f = Math.floor(lt * FPS + 1e-6);
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (f === 0) { c.fillStyle = '#f2f4ff'; c.fillRect(0, 0, W, H); return { hal: 0.2 }; }
  c.drawImage(SCN.sil, 0, 0);
  LW = 1; c.save(); c.globalCompositeOperation = 'source-over';
  const rng = mulberry(5);
  const draw = (pts, w) => { ink(c, pts, w * 2.2, '#5a5ad0', { t0: 0.02, t1: 0.5, var: 0.1 }); ink(c, pts, w, '#ffffff', { t0: 0.02, t1: 0.6 }); };
  const main = [[700, -10]]; for (let i = 1; i <= 8; i++) main.push([700 - i * 52 + (rng() - 0.5) * 70, i * 34 + (rng() - 0.5) * 16]);
  draw(main, 9); for (let b = 0; b < 4; b++) { const s = main[2 + b]; const br = [s]; let x = s[0], y = s[1]; for (let j = 0; j < 4; j++) { x += (rng() < 0.5 ? -1 : 1) * (16 + rng() * 26); y += 12 + rng() * 16; br.push([x, y]); } draw(br, 3); }
  c.restore();
  // headlamp in the afterimage
  glow(c, 418, 464, 70, '#ffc050', 0.9); glow(c, 418, 464, 18, '#fffbe0', 1); flare(c, 418, 464, 90, '#ffe0a0', 0.8, 0.1);
  return { hal: 0.5 };
}
function buildFrontStill() {
  const L = { kx: 0.8, ky: -0.6, kc: '#d8e4ff', cx: -0.3, cy: -1, cc: '#8fb4ff', spec: 1.4 };
  const pal = tintPal('#1a1f44', 0.6, 0, 'bolt');
  const paint = (c) => {
    c.save(); c.translate(W / 2, H / 2); c.rotate(-0.045); c.translate(-W / 2, -H / 2);
    rainSky(c, W, 600, { seed: 61, top: '#10163a', mid: '#2a3470', bot: '#5a62a8', glowCol: '#8a8ad0', glow: 0.5, gx: 700, clouds: { dark: '#121838', mid: '#2c376e', lit: '#9aaae8', dark2: '#1e2654', mid2: '#3a4682', lit2: '#c8d2ff', lx: 0.7 } });
    c.fillStyle = '#0a0c18'; c.fillRect(-40, 600, W + 80, 200);
    const rng = mulberry(12); let x = -30; while (x < W + 30) { const w = 60 + rng() * 80, h = 90 + rng() * 120; house(c, x, 640, w, h, rng, { wall: '#1a1e36', litP: 0.1, roofH: 16 }); x += w + 6; }
    bline(c, sag(-20, 260, 980, 300, 30), 2, '#06070e', 1); bline(c, sag(-20, 300, 980, 250, 24), 1.4, '#06070e', 1);
    paintPoly(c, [[-40, 640], [W + 40, 640], [W + 40, 800], [-40, 800]], '#0c0e1a', { dens: 0.03, len: 20, wid: 4 });
    // rails toward camera
    for (const rx of [-150, 150]) paintPoly(c, [[W / 2 + rx - 4, 690], [W / 2 + rx + 4, 690], [W / 2 + rx * 1.9 + 14, 800], [W / 2 + rx * 1.9 - 14, 800]], '#3a2a28', { dens: 0.05, len: 6 });
    tramFront(c, W / 2, 692, 3.05, { L, pal, head: 1, ivy: 1 });
    c.restore();
  };
  const inkp = (c) => { c.save(); c.translate(W / 2, H / 2); c.rotate(-0.045); c.translate(-W / 2, -H / 2); tramFront(c, W / 2, 692, 3.05, { L, pal, head: 1, ivy: 1 }); c.restore(); };
  return harmony(paint, inkp, {
    seed: 3, after: (c) => {
      // frozen rain, lit white
      const r = mulberry(4); c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * H, l = 10 + r() * 40; c.strokeStyle = css('#dfe8ff', 0.25 + r() * 0.4); c.lineWidth = 0.8 + r() * 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x - l * 0.2, y - l); c.stroke(); }
      c.restore();
      const hx = W / 2 + 0 - (692 - 62 * 3.05 - H / 2) * Math.sin(-0.045), hy = 692 - 62 * 3.05;
      glow(c, hx, hy, 160, '#ffb040', 0.55); glow(c, hx, hy, 46, '#fff0c0', 1); flare(c, hx, hy, 240, '#ffe8b0', 0.9, -0.05); flare(c, hx, hy, 120, '#ffffff', 0.6, 0.74);
    }
  });
}
function shotStill(cv) { return (c) => { c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(cv, 0, 0); return {}; }; }
