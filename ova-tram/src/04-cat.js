// ───────────────────────── the stray cat ─────────────────────────
const CATP = { fur: '#56535c', fur1: '#34323b', fur2: '#16151b', furH: '#9a92a0', wht: '#a2a2ae', wht1: '#64646f', stripe: '#24222b', earIn: '#5e3e48', nose: '#74444c', eye: '#b6c45c' };
function ribbonShape(center, w0, w1) { // closed outline around a centre line, tapering w0→w1
  const n = center.length, L = [], R = [];
  for (let i = 0; i < n; i++) {
    const a = center[Math.max(0, i - 1)], b = center[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, i / (n - 1)) / 2; L.push([center[i][0] - dy / d * w, center[i][1] + dx / d * w]); R.push([center[i][0] + dy / d * w, center[i][1] - dx / d * w]);
  }
  return [...L, ...R.reverse()];
}
function catEye(c, x, y, rx, open, P, shine, look = 0) {
  if (open < 0.15) { ink(c, qb([x - rx, y], [x, y + rx * 0.45], [x + rx, y - 0.5], 6), 1.4); return; }
  const ry = rx * 0.75 * open;
  const e = cat(qb([x - rx, y], [x - rx * 0.2, y - ry * 1.3], [x + rx, y - ry * 0.4], 6), qb([x + rx, y - ry * 0.4], [x + rx * 0.2, y + ry * 1.1], [x - rx, y], 6));
  const ec = shine > 0 ? mix(P.eye, '#ffe27a', clamp(shine)) : rgb(P.eye);
  cel(c, e, css(ec), {
    line: 1.3, inside: (c) => {
      c.fillStyle = css(scl(ec, 0.6)); c.fillRect(x - rx, y - ry * 1.5, rx * 2, ry * 0.6);
      const pw = rx * (0.18 + 0.32 * open * (1 - shine * 0.3)); c.fillStyle = '#07060a'; c.beginPath(); c.ellipse(x + look, y - ry * 0.15, pw, ry * 1.05, 0, 0, TAU); c.fill();
      dot(c, x + look - rx * 0.35, y - ry * 0.55, rx * 0.2, '#fffbe8');
      if (shine > 0) glow(c, x, y - ry * 0.2, rx * 2.4, '#ffd060', 0.55 * shine);
    }
  });
}
// close insert, 3/4 view facing left. pose: 'loaf' | 'alert' | 'crouch' | 'stretch' | 'smear'
function catClose(c, x, y, s, pose, o = {}) {
  const P = CATP, L = o.L, ear = o.ear || 0, shine = o.shine || 0;
  c.save(); c.translate(x, y); c.scale(s, s); setLW(s);
  if (pose === 'smear') {
    const g = c.globalCompositeOperation;
    for (let k = 0; k < 9; k++) { const yy = -40 + k * 5; ink(c, [[-20 + k * 3, yy], [-150 - k * 8, yy + 6]], 6 - k * 0.4, css(k % 3 ? P.fur : P.fur1, 0.6), { t0: 0.02, t1: 0.95 }); }
    for (let k = 0; k < 6; k++) ink(c, [[30 - k * 10, -10 - k * 9], [-200, -16 - k * 9]], 0.9, css(P.furH, 0.5), { t0: 0.1, t1: 0.9 });
    c.globalCompositeOperation = g; c.restore(); return;
  }
  const sx = pose === 'crouch' ? 1.12 : pose === 'stretch' ? 1.7 : 1, sy = pose === 'crouch' ? 0.78 : pose === 'stretch' ? 0.62 : 1;
  const hx = pose === 'alert' ? -30 : pose === 'crouch' ? -40 : pose === 'stretch' ? -96 : -28;
  const hy = pose === 'alert' ? -60 : pose === 'crouch' ? -36 : pose === 'stretch' ? -34 : -50;
  const T = (p) => p.map(([a, b]) => [a * sx + (pose === 'stretch' ? 10 : 0), b * sy]);
  // tail
  const tail = pose === 'stretch' ? bez([60, -30], [90, -40], [120, -58], [140, -50], 10)
    : pose === 'alert' ? cat(bez([62, -12], [74, -6], [60, 6], [24, 3], 8), qb([24, 3], [-4, 1], [-12, -8 - (o.flick || 0)], 6))
      : bez([62, -10], [56, 6], [10, 4], [-20, -4], 12);
  cel(c, ribbonShape(T(tail), 10, 4.5), P.fur, { line: 1.6, inside: (c) => { c.fillStyle = P.fur1; c.fillRect(-60, -6, 200, 20); for (let k = 0; k < 4; k++) { const p = T(tail)[2 + k * 2]; c.fillStyle = P.stripe; c.beginPath(); c.ellipse(p[0], p[1], 3, 6, 0.3, 0, TAU); c.fill(); } }, rim: L ? [[L.kx, L.ky, L.kc, 1.5, 0.35]] : null });
  // body
  const body = wob(subdiv(T(cat(qb([-22, -30], [-16, -50], [10, -53], 6), qb([10, -53], [46, -54], [62, -36], 6), qb([62, -36], [72, -16], [62, -2], 5), ln([62, -2], [-24, 0], 4), qb([-24, 0], [-32, -14], [-22, -30], 5))), 3, true), 2, 0.5, 0.06, true);
  cel(c, body, P.fur, {
    line: 2.1, inside: (c) => {
      c.fillStyle = P.fur1; c.beginPath(); pathP(c, T([[30, -60], [70, -40], [70, 4], [-10, 4], [10, -12], [40, -20]])); c.fill();
      c.fillStyle = P.fur2; c.fillRect(-40, -7 * sy, 140, 10);
      c.fillStyle = P.stripe; for (let k = 0; k < 5; k++) { const bx = k * 11 - 2; c.beginPath(); pathP(c, T([[bx, -56], [bx + 5, -56], [bx + 9, -38], [bx + 4, -40]])); c.fill(); }
      air(c, -6 * sx, -48 * sy, 22, P.furH, 0.35, 1.2, 0.5);
    }, rim: L ? [[L.kx, L.ky, L.kc, 1.8, 0.3], [0, -1, L.cc, 1.2, 0.6]] : null
  });
  // front legs (alert / stretch)
  if (pose === 'stretch' || pose === 'crouch') {
    const legs = pose === 'stretch' ? [[[-50, -22], [-90, -8], [-112, -2]], [[-40, -20], [-70, -4], [-88, 0]], [[90, -20], [120, -10], [136, -4]]]
      : pose === 'crouch' ? [[[-30, -18], [-42, -8], [-48, 0]], [[-18, -18], [-28, -6], [-34, 0]]]
        : [[[-34, -34], [-35, -16], [-36, 0]], [[-18, -34], [-19, -16], [-20, 0]]];
    for (const lg of legs) { const sh = ribbonShape(qb(lg[0], lg[1], lg[2], 8), 9, 7); cel(c, sh, P.wht, { line: 1.4, inside: (c) => { c.fillStyle = P.wht1; c.fillRect(lg[1][0], -60, 20, 70); }, rim: L ? [[L.kx, L.ky, L.kc, 1.2, 0.4]] : null }); cel(c, ell(lg[2][0] - 1, lg[2][1] - 2, 5.5, 3.2, 10), P.wht, { line: 1.1 }); }
  } else {
    for (const px of [-34, -20]) cel(c, ell(px, -3, 6, 3.4, 12), P.wht, { line: 1.2, inside: (c) => { c.fillStyle = P.wht1; c.fillRect(px - 8, -2, 16, 6); } });
  }
  // chest
  if (pose !== 'stretch') cel(c, wob(subdiv(T([[-38, -34], [-14, -36], [-16, -18], [-24, -6], [-32, -8], [-38, -20]]), 3, true), 6, 0.6, 0.1, true), P.wht, { line: 0, inside: (c) => { c.fillStyle = P.wht1; c.fillRect(-26, -40, 20, 40); } });
  // head
  c.save(); c.translate(hx, hy); if (pose === 'crouch') c.rotate(0.15); if (pose === 'stretch') c.rotate(0.1);
  const earBack = pose === 'crouch' || pose === 'stretch' ? 1 : 0;
  const earL = earBack ? [[-20, -6], [-10, -14], [-34, -16]] : [[-20, -8], [-10, -16], [-24 - ear * 4, -32 + ear * 3]];
  const earR = earBack ? [[4, -16], [16, -10], [24, -22]] : [[4, -17], [18, -10], [16 + ear * 2, -33]];
  for (const e of [earL, earR]) {
    const ep = wob(subdiv(cat(qb(e[0], [lerp(e[0][0], e[2][0], 0.5) - 2, lerp(e[0][1], e[2][1], 0.55)], e[2], 4), qb(e[2], [lerp(e[1][0], e[2][0], 0.5) + 2, lerp(e[1][1], e[2][1], 0.5)], e[1], 4)), 2, true), e[0][0], 0.3, 0.1, true);
    cel(c, ep, P.fur, { line: 1.5, inside: (c) => { const ii = ep.map(p => [lerp((e[0][0] + e[1][0] + e[2][0]) / 3, p[0], 0.6), lerp((e[0][1] + e[1][1] + e[2][1]) / 3 + 2, p[1], 0.6)]); fillP(c, ii, P.earIn); }, rim: L ? [[L.kx, L.ky, L.kc, 1.4, 0.3]] : null });
  }
  const head = wob(subdiv(cat(qb([-22, -8], [-26, 6], [-14, 14], 5), qb([-14, 14], [-2, 21], [12, 14], 5), qb([12, 14], [24, 6], [22, -6], 5), qb([22, -6], [14, -20], [0, -18], 5), qb([0, -18], [-16, -18], [-22, -8], 5)), 3, true), 9, 0.4, 0.1, true);
  cel(c, head, P.fur, {
    line: 2.0, inside: (c) => {
      c.fillStyle = P.fur1; c.beginPath(); pathP(c, [[10, -20], [30, -10], [30, 24], [4, 24], [14, 6]]); c.fill();
      c.fillStyle = P.stripe; for (const [a, b] of [[-6, -18], [-1, -19], [4, -18]]) { c.beginPath(); c.moveTo(a - 1.2, b); c.lineTo(a + 1.2, b); c.lineTo(a + 0.3, b + 8); c.closePath(); c.fill(); }
      c.beginPath(); c.moveTo(16, 0); c.lineTo(24, -2); c.lineTo(23, 2); c.closePath(); c.fill();
      fillP(c, wob(subdiv([[-12, 6], [6, 6], [8, 14], [-2, 19], [-12, 14]], 2, true), 3, 0.4, 0.2, true), P.wht);
      air(c, -10, -8, 12, P.furH, 0.4, 1, 0.7);
    }, rim: L ? [[L.kx, L.ky, L.kc, 1.8, 0.3]] : null
  });
  const open = pose === 'alert' ? 1.25 : pose === 'loaf' ? (o.open ?? 0.1) : 0.8;
  catEye(c, -10, 0, 4.6, open, P, shine, o.look || 0); catEye(c, 9, -0.5, 4.2, open, P, shine, o.look || 0);
  cel(c, [[-2.6, 7], [2.4, 7], [0, 9.6]], P.nose, { line: 0.9 });
  ink(c, qb([0, 9.6], [-1, 12.5], [-4, 12.5], 4), 0.9); ink(c, qb([0, 9.6], [1, 12.5], [4, 12.2], 4), 0.9);
  for (const k of [-1, 1]) for (let j = 0; j < 3; j++) ink(c, qb([k * 6, 10 + j], [k * 16, 8 + j * 2.5], [k * 26, 9 + j * 4], 6), 0.55, css(P.furH, 0.8), { t0: 0.05, t1: 0.9 });
  c.restore();
  c.restore();
}
// small side view (final shot), facing right. pose 'walk' (phase 0..3) | 'sit' | 'look'
function catSide(c, x, y, s, pose, ph = 0, o = {}) {
  const P = CATP, L = o.L;
  c.save(); c.translate(x, y); c.scale(s, s); setLW(s * 1.6);
  const sit = pose !== 'walk';
  if (!sit) {
    const sw = [[6, -6], [2, 2], [-6, 6], [-2, -2]][ph % 4];
    const legs = [[14, sw[0]], [8, sw[1]], [-12, sw[2]], [-18, sw[3]]];
    legs.forEach(([lx, d], i) => { const far = i % 2; const lp = ribbonShape([[lx, -16], [lx + d * 0.5, -8], [lx + d, 0]], 4.2, 3.4); cel(c, lp, far ? P.fur1 : (i < 2 ? P.wht : P.fur), { line: 1.1 }); });
    const tail = bez([-22, -20], [-34, -26], [-36, -44], [-30, -52 + Math.sin(ph) * 2], 8);
    cel(c, ribbonShape(tail, 5, 2.5), P.fur, { line: 1.2, rim: L ? [[L.kx, L.ky, L.kc, 1.2, 0.3]] : null });
    const body = wob(subdiv(cat(qb([-24, -20], [-20, -30], [0, -29], 5), qb([0, -29], [16, -29], [22, -22], 5), qb([22, -22], [20, -12], [8, -12], 4), ln([8, -12], [-18, -12], 2), qb([-18, -12], [-26, -14], [-24, -20], 3)), 2, true), 4, 0.3, 0.1, true);
    cel(c, body, P.fur, { line: 1.6, inside: (c) => { c.fillStyle = P.fur1; c.fillRect(-30, -18, 60, 8); c.fillStyle = P.stripe; for (let k = 0; k < 4; k++) c.fillRect(-14 + k * 7, -29, 2.4, 7); }, rim: L ? [[L.kx, L.ky, L.kc, 1.4, 0.3], [0, -1, L.cc, 1, 0.6]] : null });
    c.save(); c.translate(24, -27 + (ph % 2) * 0.8);
    for (const e of [[[-4, -5], [0, -16], [3, -6]], [[2, -6], [7, -15], [8, -4]]]) cel(c, e, P.fur, { line: 1.1, inside: (c) => fillP(c, [[e[0][0] + 1, e[0][1]], [e[1][0], e[1][1] + 4], [e[2][0] - 1, e[2][1]]], P.earIn) });
    cel(c, wob(ell(1, 0, 8.5, 7.2, 16), 3, 0.3, 0.2, true), P.fur, { line: 1.5, inside: (c) => { fillP(c, ell(5, 3, 4, 3, 10), P.wht); c.fillStyle = P.fur1; c.fillRect(-9, 2, 6, 6); }, rim: L ? [[L.kx, L.ky, L.kc, 1.3, 0.3]] : null });
    inkDot(c, 4.5, -1.5, 1.2); c.restore();
  } else {
    const up = pose === 'look' ? 1 : 0;
    const tail = bez([-10, -2], [6, 4], [22, 2], [24, -4 - (o.flick || 0)], 8);
    cel(c, ribbonShape(tail, 5, 2.5), P.fur, { line: 1.2 });
    const body = wob(subdiv(cat(qb([-14, 0], [-20, -16], [-10, -30], 5), qb([-10, -30], [-4, -38], [6, -36], 4), qb([6, -36], [12, -20], [12, 0], 5), ln([12, 0], [-14, 0], 2)), 2, true), 6, 0.3, 0.1, true);
    cel(c, body, P.fur, { line: 1.6, inside: (c) => { c.fillStyle = P.fur1; c.beginPath(); pathP(c, [[-20, -20], [-8, -24], [-4, 0], [-20, 0]]); c.fill(); fillP(c, [[4, -34], [12, -26], [12, 0], [6, 0], [4, -18]], P.wht); }, rim: L ? [[L.kx, L.ky, L.kc, 1.4, 0.3], [0.4, -1, L.cc, 1.1, 0.5]] : null });
    for (const lx of [4, 9]) cel(c, ribbonShape([[lx, -14], [lx + 0.5, -6], [lx + 1, 0]], 3.8, 3.2), P.wht, { line: 1 });
    c.save(); c.translate(6, -40); c.rotate(-0.55 * up);
    for (const e of [[[-6, -4], [-4, -15], [0, -6]], [[1, -7], [6, -16], [8, -3]]]) cel(c, e, P.fur, { line: 1.1, inside: (c) => fillP(c, [[e[0][0] + 1, e[0][1]], [e[1][0], e[1][1] + 4], [e[2][0] - 1, e[2][1]]], P.earIn) });
    cel(c, wob(ell(1, 0, 8.5, 7.4, 16), 5, 0.3, 0.2, true), P.fur, { line: 1.5, inside: (c) => { fillP(c, ell(5, 3, 4, 3, 10), P.wht); }, rim: L ? [[L.kx, L.ky, L.kc, 1.3, 0.3], [0.5, -1, L.cc, 1.1, 0.4]] : null });
    inkDot(c, 4.8, -1.8, 1.25); if (o.shine) glow(c, 4.8, -1.8, 5, '#ffe08a', o.shine);
    c.restore();
  }
  c.restore();
}
