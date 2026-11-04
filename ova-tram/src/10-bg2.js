// ───────────────────────── background: under the boarding step (insert) ─────────────────────────
function buildUnder() {
  const cv = mkCanvas(W, H), c = cv.getContext('2d'), rng = mulberry(2201);
  c.fillStyle = '#04060b'; c.fillRect(0, 0, W, H);
  // out-of-focus street beyond the car (soft, big brush)
  const g = c.createLinearGradient(0, 200, 0, 660); g.addColorStop(0, '#0b1020'); g.addColorStop(1, '#151a2c');
  c.fillStyle = g; c.fillRect(0, 180, 560, 480);
  brushwork(c, { x: 0, y: 180, w: 560, h: 480 }, '#121828', { seed: 3, dens: 0.004, len: 70, wid: 30, alpha: 0.25, var: 0.4, ang: 1.4, angVar: 0.3 });
  // blurred house shapes
  for (let i = 0; i < 6; i++) { const x = i * 95 - 20, h = 120 + rng() * 120; c.fillStyle = css(mix('#0d1220', '#1a1e30', rng()), 0.8); c.fillRect(x, 560 - h, 80 + rng() * 30, h); }
  // bokeh – sodium lamp, windows, vending machine
  const bok = (x, y, r, col, a) => { c.save(); c.globalCompositeOperation = 'lighter'; air(c, x, y, r * 2.2, col, a * 0.35); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = css(col, a * 0.35); c.fill(); c.lineWidth = r * 0.12; c.strokeStyle = css(col, a * 0.25); c.stroke(); c.restore(); };
  bok(150, 300, 46, '#ff9a3a', 1); bok(70, 390, 18, '#ffc070', 0.8); bok(250, 360, 14, '#ffd090', 0.7); bok(330, 470, 34, '#9fe0ff', 0.9); bok(420, 420, 10, '#ffb860', 0.6); bok(30, 470, 12, '#ffb060', 0.5);
  // soft weeds silhouettes
  for (let i = 0; i < 40; i++) { const x = rng() * 560, h = 30 + rng() * 80; c.fillStyle = css('#080c12', 0.7); dab(c, x, 600 - h / 2, -1.57 + (rng() - 0.5) * 0.5, h, 6 + rng() * 6, css('#070a10', 0.75)); }
  // under-car darkness to the right
  const g2 = c.createLinearGradient(380, 0, 900, 0); g2.addColorStop(0, 'rgba(2,3,6,0)'); g2.addColorStop(0.4, 'rgba(2,3,6,0.92)'); c.fillStyle = g2; c.fillRect(380, 0, 600, 680);
  // ground: ballast & sleeper end, wet
  paintPoly(c, [[-10, 640], [970, 630], [970, 730], [-10, 730]], '#0d1018', { seed: 5, dens: 0.03, len: 14, wid: 4, var: 0.4 });
  for (let i = 0; i < 700; i++) { const x = rng() * W, y = 640 + rng() * 90, s = 2 + rng() * 6 * ((y - 600) / 120); const lit = Math.max(0, 1 - x / 600); c.fillStyle = css(mix('#151922', '#3a3634', rng() * 0.6 + lit * 0.4), 0.9); c.beginPath(); c.ellipse(x, y, s, s * 0.6, rng() * 3, 0, TAU); c.fill(); if (lit > 0.2 && rng() < 0.5) { c.fillStyle = css('#ffb060', 0.5 * lit); c.beginPath(); c.ellipse(x - s * 0.3, y - s * 0.35, s * 0.4, s * 0.2, 0, 0, TAU); c.fill(); } }
  paintPoly(c, [[560, 668], [960, 662], [960, 690], [560, 696]], '#1c1614', { dens: 0.05, len: 10, wid: 3 }); // sleeper
  paintPoly(c, [[560, 654], [960, 652], [960, 668], [560, 671]], '#2c2420', { dens: 0.08, len: 10, wid: 2 }); // rail
  bline(c, [[560, 655], [960, 653]], 2, '#a0b8cc', 0.45);
  applyPaper(c, W, H, 0.22);
  return cv;
}
const STEP_K = 19, STEP_X = (lx) => 470 + (lx + 120) * STEP_K, STEP_Y = (ly) => 410 + (ly + 13) * STEP_K;
const DRIPS = [[300, 1.6, 0.1], [395, 2.1, 0.5], [512, 1.3, 0.2], [606, 1.8, 0.8], [668, 2.4, 0.35]];
function underStep(c, t, o = {}) {
  const P = PAL0, L = o.L; setLW(1.6);
  // skirt panel (top band)
  const sk = wob(subdiv([[-20, -20], [980, -20], [980, 84], [-20, 88]], 8, true), 3, 1.2, 0.03, true);
  cel(c, sk, P.teal, {
    line: 3, inside: (c) => {
      c.fillStyle = P.teal1; c.fillRect(-20, 52, 1000, 40); c.fillStyle = P.teal2; c.fillRect(-20, 74, 1000, 20);
      const r = mulberry(31);
      air(c, 480, 18, 600, P.tealH, 0.12, 1, 0.08);
      for (let i = 0; i < 30; i++) rustBlot(c, r() * 960, 6 + r() * 60, 2 + r() * r() * 9, r, P.teal, P);
      for (let x = 12; x < 960; x += 23 + r() * 10) { const len = 8 + r() * r() * 70, w = 1 + r() * 2.2; c.fillStyle = css(mix(P.rust, P.teal, 0.4), 0.3 + r() * 0.4); c.beginPath(); c.moveTo(x - w, 31); c.quadraticCurveTo(x + (r() - 0.5) * 4, 31 + len * 0.6, x, 31 + len); c.quadraticCurveTo(x + w * 0.3, 31 + len * 0.5, x + w, 31); c.fill(); }
      if (L) air(c, 120, 50, 300, L.kc, 0.22 * (o.lamp ?? 1), 1, 0.25);
    }
  });
  for (let x = 20; x < 960; x += 46) rivetDome(c, x, 30, 4.2, P, P.teal);
  if (L) ink(c, subdiv([[-10, 86], [970, 82]], 10), 2, L.kc, { var: 0.6 });
  for (let i = 0; i < 40; i++) { const r = mulberry(70 + i); dot(c, r() * 960, 82 + r() * 4, 2 + r() * 3, P.moss); }
  // brackets
  for (const bx of [STEP_X(-129), STEP_X(-111)]) cel(c, [[bx - 9, 80], [bx + 9, 80], [bx + 8, 245], [bx - 8, 245]], P.steel1, { line: 2.2, inside: (c) => { c.fillStyle = P.steel2; c.fillRect(bx + 2, 80, 10, 170); c.fillStyle = css(P.rust, 0.8); c.fillRect(bx - 8, 150, 10, 40); }, rim: L ? [[L.kx, L.ky, L.kc, 1.8, 0.4]] : null });
  // step plate: front face with tread + underside
  const x0 = STEP_X(-133), x1 = STEP_X(-107);
  const face = wob(subdiv([[x0, 240], [x1, 238], [x1 + 2, 284], [x0 - 2, 287]], 8, true), 9, 1, 0.05, true);
  cel(c, face, P.steel, {
    line: 2.6, inside: (c) => {
      c.strokeStyle = css(P.steel1, 0.9); c.lineWidth = 2; c.beginPath(); for (let x = x0 - 40; x < x1; x += 14) { c.moveTo(x, 240); c.lineTo(x + 46, 288); } c.stroke();
      const r = mulberry(5); for (let i = 0; i < 34; i++) rustBlot(c, x0 + r() * (x1 - x0), 244 + r() * 36, 2 + r() * r() * 10, r, P.steel, P);
      c.fillStyle = P.steel1; c.fillRect(x0 - 10, 272, x1 - x0 + 20, 20);
      if (L) air(c, x0 + 40, 250, 120, L.kc, 0.4 * (o.lamp ?? 1), 1, 0.2);
    }, rim: L ? [[0, -1, L.cc, 2, 0.6], [L.kx, L.ky, L.kc, 2.2, 0.4]] : null
  });
  cel(c, wob(subdiv([[x0 - 2, 286], [x1 + 2, 283], [x1 - 6, 298], [x0 + 6, 300]], 8, true), 10, 0.8, 0.05, true), P.steel2, { line: 2 });
  // drips forming and falling from the plate edge (on twos)
  const tq = q(t, 2);
  for (const [dx, per, ph] of DRIPS) {
    const u = ((tq / per + ph) % 1);
    if (u < 0.72) { const s = 2 + u * 6; cel(c, cat(qb([dx - s * 0.6, 298], [dx - s, 298 + s * 1.2], [dx, 298 + s * 1.9], 5), qb([dx, 298 + s * 1.9], [dx + s, 298 + s * 1.2], [dx + s * 0.6, 298], 5)), css('#3a5a78', 0.85), { line: 1, inside: (c) => dot(c, dx - s * 0.3, 298 + s * 0.9, s * 0.25, '#e8f4ff') }); }
    else { const f = (u - 0.72) / 0.28, y = 304 + f * f * 380, s = 5; if (y < 650) { cel(c, ell(dx, y, s * 0.7, s * 1.4, 10), css('#5a80a0', 0.85), { line: 1, inside: (c) => dot(c, dx - 1.5, y - 2, 1.4, '#e8f4ff') }); ink(c, [[dx, y - s * 1.4], [dx, y - s * 1.4 - 20 * f]], 1, css('#9cc8ec', 0.5)); } }
    if (u > 0.98 || u < 0.05) splashes(c, t, [{ x0: dx - 8, x1: dx + 8, y0: 650, y1: 656, n: 1, s: 2.4 }], { seed: dx });
  }
  // the front wheel, enormous at this distance (same model as the side view)
  bigWheel(c, 905, 410, 247, 0.3 + (o.wrot || 0), P, L); setLW(1.6);
  // big ivy leaves on the wheel and hanging off the skirt
  const iv = mulberry(808);
  { const pts = []; for (let k = 0; k <= 24; k++) { const a = 2.6 - k * 0.11; pts.push([905 + Math.cos(a) * (150 + Math.sin(k) * 14), 410 + Math.sin(a) * (150 + Math.sin(k) * 14)]); } ink(c, pts, 4, P.ivy1, { t0: 0.05, t1: 0.3 }); ink(c, pts, 1.4, P.ivyH); pts.forEach((p, k) => { if (k % 2 === 0) leaf(c, p[0] + (iv() - 0.5) * 10, p[1], (iv() - 0.5) * 3, 16 + iv() * 14, P, L); }); }
  for (let i = 0; i < 12; i++) { const x = 680 + iv() * 120, y = 560 + iv() * 100; leaf(c, x, y, -1.57 + (iv() - 0.5) * 2, 16 + iv() * 18, P, L); }
  for (const [x, len] of [[120, 160], [210, 90], [760, 220], [860, 140]]) { const pts = []; for (let k = 0; k <= 10; k++) pts.push([x + Math.sin(k * 0.7 + (o.sway || 0)) * 5, 84 + k * len / 10]); ink(c, pts, 3.2, P.ivy1, { t0: 0.05, t1: 0.3 }); ink(c, pts, 1.2, P.ivyH); for (let k = 2; k <= 10; k += 2) leaf(c, pts[k][0], pts[k][1], (k % 4 ? 1 : -1) * 1.4 + 1.57, 14 + k, P, L); }
}
