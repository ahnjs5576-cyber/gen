// ───────────────────────── close-up parts: big wheel, weathered steel ─────────────────────────
function rustBlot(c, x, y, s, rng, base, P, streak = 1) {
  const n = 9, p = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, r = s * (0.45 + rng() * 0.75); p.push([x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 0.8]); }
  const P2 = wob(subdiv(p, Math.max(1, s * 0.3), true), rng() * 99 | 0, s * 0.12, 0.3, true);
  fillP(c, P2, mixs(P.rust, base, 0.5));
  fillP(c, P2.map(q => [lerp(x, q[0], 0.55), lerp(y, q[1], 0.55)]), mixs(P.rustD, base, 0.35));
  if (rng() < 0.5) fillP(c, P2.map(q => [lerp(x - s * 0.2, q[0], 0.25), lerp(y - s * 0.25, q[1], 0.2)]), mixs(P.rustH, base, 0.4));
  if (streak && rng() < 0.7) { const len = s * (2 + rng() * 5); c.fillStyle = css(mix(P.rust, base, 0.45), 0.55); c.beginPath(); c.moveTo(x - s * 0.35, y); c.quadraticCurveTo(x + (rng() - 0.5) * s, y + len * 0.5, x + (rng() - 0.5) * s * 0.4, y + len); c.quadraticCurveTo(x + s * 0.15, y + len * 0.4, x + s * 0.35, y); c.fill(); }
}
function rivetDome(c, x, y, r, P, base) {
  dot(c, x + r * 0.25, y + r * 0.35, r * 1.15, mixs(base, '#000', 0.55));
  dot(c, x, y, r, base); dot(c, x + r * 0.2, y + r * 0.25, r * 0.7, mixs(base, '#000', 0.3));
  dot(c, x - r * 0.35, y - r * 0.35, r * 0.3, P.tealH);
  inkC(c, ell(x, y, r, r, 10), 0.9);
}
// large spoked wheel for inserts. rot = radians. L = lights
function bigWheel(c, cx, cy, R, rot, P, L, o = {}) {
  setLW(R / 13 * 0.55);
  const W0 = 1.6; const rr = mulberry(o.seed || 41);
  const tireO = wob(ell(cx, cy, R, R, 72), 3, R * 0.004, 0.05, true), tireI = ell(cx, cy, R * 0.84, R * 0.84, 64);
  cel(c, ell(cx, cy, R * 1.07, R * 1.07, 72), P.steel2, { line: W0 });
  cel(c, tireO, P.steel, {
    line: W0 * 1.3, inside: (c) => {
      c.fillStyle = P.steel1; c.beginPath(); c.arc(cx + R * 0.12, cy + R * 0.16, R * 1.0, 0, TAU); c.fill();
      c.fillStyle = P.steel2; c.beginPath(); c.arc(cx + R * 0.3, cy + R * 0.34, R * 0.95, 0, TAU); c.fill();
      for (let k = 0; k < 14; k++) { const a = rot + k * 0.45 + rr() * 0.2, d = R * (0.88 + rr() * 0.08); rustBlot(c, cx + Math.cos(a) * d, cy + Math.sin(a) * d, R * (0.03 + rr() * 0.04), rr, P.steel, P, 0); }
      if (L) air(c, cx - R * 0.7, cy - R * 0.2, R * 0.6, L.kc, 0.4 * (L.spec ?? 1), 0.35, 1);
    }, rim: L ? [[L.kx, L.ky, L.kc, W0 * 1.4, 0.35], [L.cx, L.cy, L.cc, W0, 0.6]] : null
  });
  fillP(c, tireI, '#030406');
  // spokes (slightly curved, flared at the rim)
  for (let k = 0; k < 8; k++) {
    const a = rot + k * TAU / 8, ca = Math.cos(a), sa = Math.sin(a), bend = 0.08;
    const spine = qb([cx + ca * R * 0.22, cy + sa * R * 0.22], [cx + Math.cos(a + bend) * R * 0.55, cy + Math.sin(a + bend) * R * 0.55], [cx + ca * R * 0.84, cy + sa * R * 0.84], 10);
    const sh = []; const L2 = [], Rr = [];
    spine.forEach((p, i) => { const u = i / 10, w = R * (0.06 - 0.025 * u + 0.05 * u ** 6); L2.push([p[0] - sa * w, p[1] + ca * w]); Rr.push([p[0] + sa * w, p[1] - ca * w]); });
    sh.push(...L2, ...Rr.reverse());
    const lit = L ? (-sa * L.kx + ca * L.ky) : 0;
    cel(c, sh, sa > 0.2 ? P.steel1 : P.steel, { line: W0, inside: (c) => { c.fillStyle = P.steel2; c.beginPath(); pathP(c, Rr); c.lineTo(cx, cy); c.fill(); if (rr() < 0.6) rustBlot(c, spine[6][0], spine[6][1], R * 0.035, rr, P.steel, P, 0); } });
    if (L && lit > 0.2) ink(c, L2.slice(2, 9), W0 * 0.9, L.kc, { var: 0.5 });
  }
  inkC(c, tireI, W0);
  // hub
  cel(c, wob(ell(cx, cy, R * 0.27, R * 0.27, 30), 7, R * 0.004, 0.2, true), P.steel, { line: W0 * 1.2, inside: (c) => { c.fillStyle = P.steel1; c.beginPath(); c.arc(cx + R * 0.05, cy + R * 0.07, R * 0.26, 0, TAU); c.fill(); rustBlot(c, cx + R * 0.1, cy - R * 0.12, R * 0.05, rr, P.steel, P, 0); }, rim: L ? [[L.kx, L.ky, L.kc, W0, 0.35]] : null });
  for (let k = 0; k < 6; k++) { const a = rot + k * TAU / 6 + 0.3; const bx = cx + Math.cos(a) * R * 0.18, by = cy + Math.sin(a) * R * 0.18; cel(c, ell(bx, by, R * 0.025, R * 0.025, 8), P.steel1, { line: W0 * 0.6, inside: (c) => dot(c, bx - R * 0.008, by - R * 0.008, R * 0.01, P.steelH) }); }
  cel(c, ell(cx, cy, R * 0.1, R * 0.1, 18), P.steel1, { line: W0, inside: (c) => air(c, cx - R * 0.03, cy - R * 0.04, R * 0.05, P.steelH, 0.8) });
}
