// ───────────────────────── streetcar, front elevation (same measurements as side model) ─────────────────────────
const TF = (() => {
  const r = mulberry(5151);
  const half = cat(bez([0, -150], [12, -150], [30, -149], [44, -145], 6), bez([44, -145], [58, -140], [64, -132], [66, -126], 5), bez([66, -126], [69, -116], [70, -100], [70, -84], 6), bez([70, -84], [70, -66], [68, -44], [64, -30], 6));
  const full = cat(half, ln([64, -30], [-64, -30], 4), half.slice().reverse().map(([x, y]) => [-x, y]));
  const B = wob(subdiv(full, 4, true), 61, 0.35, 0.05, true);
  const paneC = wob(subdiv(rrect(-24, -119, 48, 30, 3, 3), 3, true), 62, 0.3, 0.08, true);
  const paneL = wob(subdiv(cat(ln([-28, -89], [-28, -119]), qb([-28, -119], [-50, -120], [-63, -117], 4), qb([-63, -117], [-66, -104], [-65, -89], 4)), 3, true), 63, 0.3, 0.08, true);
  const paneR = paneL.map(([x, y]) => [-x, y]).reverse();
  const dest = wob(subdiv(rrect(-23, -137, 46, 12, 2, 3), 3, true), 64, 0.25, 0.08, true);
  const rivets = []; for (let x = -62; x <= 62; x += 7) { rivets.push([x, -79]); rivets.push([x * 0.97, -34]); } for (let x = -60; x <= 60; x += 9) rivets.push([x, -121.5]);
  for (const sx of [-30, 30]) for (let y = -74; y > -38; y -= 7) rivets.push([sx, y]);
  const streaks = []; for (const rv of rivets) if (r() < 0.6) { const len = 3 + r() * r() * 24, pts = []; let x = rv[0], y = rv[1] + 1; for (let k = 0; k <= 6; k++) { pts.push([x, y]); y += len / 6; x += (r() - 0.5) * 0.6; } streaks.push({ pts, w: 0.6 + r() * 0.8, a: 0.35 + r() * 0.5 }); }
  const chips = []; for (let i = 0; i < 18; i++) { const x = -60 + r() * 120, y = -80 + r() * 46, s = 0.8 + r() * r() * 4, n = 8, p = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = s * (0.5 + r() * 0.7); p.push([x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.8]); } chips.push(p); }
  const crack = []; { const rr = mulberry(71); for (let k = 0; k < 8; k++) { let a = k / 8 * TAU + rr(), x = -44, y = -106; const p = [[x, y]]; for (let s = 0; s < 4; s++) { a += (rr() - 0.5) * 0.7; x += Math.cos(a) * 4; y += Math.sin(a) * 4; p.push([x, y]); } crack.push(p); } }
  // front ivy: over the bumper, up the left corner pillar
  const ivy = [];
  const grow = (x, y, ang, len, seed) => { const pts = [[x, y]], leaves = []; let a = ang; for (let L = 0; L < len; L += 3) { a += (vn(L * 0.06, seed) - 0.5) * 0.35; a = lerp(a, -Math.PI / 2, 0.05); x += Math.cos(a) * 3; y += Math.sin(a) * 3; pts.push([x, y]); if ((L / 3 | 0) % 2 === 0) leaves.push({ x, y, a: a + ((L / 3 | 0) % 4 ? 1.3 : -1.3), s: 3.4 + r() * 3 }); } return { pts, leaves, w: 1.1 }; };
  ivy.push(grow(-60, 0, -1.7, 120, 3), grow(-48, 0, -1.4, 60, 4), grow(-20, 0, -1.6, 34, 5), grow(30, 0, -1.5, 40, 6), grow(56, 0, -1.7, 70, 7));
  { const pts = qb([-64, -30], [-10, -44], [40, -28], 14), leaves = []; pts.forEach((p, k) => { if (k % 2) leaves.push({ x: p[0], y: p[1], a: k * 1.9, s: 4 + r() * 2 }); }); ivy.push({ pts, leaves, w: 1.2 }); }
  for (const [cx, n] of [[-50, 16], [-10, 8], [40, 14]]) { const leaves = []; for (let k = 0; k < n; k++) leaves.push({ x: cx + (r() - 0.5) * 30, y: -2 - r() * r() * 28, a: -Math.PI / 2 + (r() - 0.5) * 2.6, s: 3.5 + r() * 3.5 }); leaves.sort((a, b) => a.y - b.y); ivy.push({ pts: [], leaves, w: 1 }); }
  return { B, paneC, paneL, paneR, dest, rivets, streaks, chips, crack, ivy };
})();
function tramFront(c, x, y, s, st = {}) {
  const P = st.pal || PAL0, L = st.L, lv = st.head || 0;
  c.save(); c.translate(x, y); c.scale(s, s); setLW(s * (st.lwBoost || 1));
  if (RM.paint) { c.save(); c.globalAlpha = 0.6; fillP(c, [[-72, -28], [72, -28], [90, 2], [-90, 2]], '#04060a'); c.restore(); }
  // wheels edge-on + bogie
  for (const wx of [-50, 50]) { cel(c, rrect(wx - 5, -27, 10, 27, 2, 2), P.steel, { line: 1.2, inside: (c) => { c.fillStyle = P.steel1; c.fillRect(wx, -30, 6, 30); c.fillStyle = P.rust; c.fillRect(wx - 5, -12, 10, 3); } }); }
  cel(c, rrect(-46, -27, 92, 8, 2, 2), P.steel1, { line: 1.0 });
  // body
  const B = TF.B;
  fillP(c, B, P.cream);
  if (RM.paint) {
    c.save(); clipP(c, B);
    c.fillStyle = P.teal; c.fillRect(-80, -82, 160, 60); c.fillStyle = P.roof; c.fillRect(-80, -200, 160, 68);
    c.fillStyle = P.teal1; c.fillRect(-80, -40, 160, 12); c.fillRect(-80, -81, 160, 2.6); c.fillStyle = P.teal2; c.fillRect(-80, -33, 160, 4);
    c.fillStyle = P.cream1; c.fillRect(-80, -132, 160, 3.6); c.fillStyle = P.roof1; c.fillRect(-80, -136, 160, 4.5);
    const lx = L ? Math.sign(L.kx || 1) : 1;
    // turned-away side edges: two hard tones
    for (const sg of [-1, 1]) {
      const shp = wob(subdiv([[sg * 60, -146], [sg * 63, -120], [sg * 64.5, -84], [sg * 62, -50], [sg * 57, -28], [sg * 90, -28], [sg * 90, -146]], 4, true), 70 + sg, 0.5, 0.1, true);
      c.save(); clipP(c, shp); c.fillStyle = sg === lx ? P.cream : P.cream1; c.fillRect(-90, -200, 180, 200); c.fillStyle = sg === lx ? P.teal : P.teal1; c.fillRect(-90, -82, 180, 60); c.fillStyle = sg === lx ? P.roof : P.roof1; c.fillRect(-90, -200, 180, 68); c.restore();
      if (sg !== lx) fillP(c, wob(subdiv([[sg * 66, -140], [sg * 68.5, -100], [sg * 68.5, -60], [sg * 62, -28], [sg * 90, -28], [sg * 90, -140]], 4, true), 72, 0.4, 0.1, true), P.teal2, 0.8);
    }
    for (const ch of TF.chips) { fillP(c, tf(ch, 0.35, 0.45), P.tealH, 0.35); fillP(c, ch, mixs(ch[0][1] > -40 ? P.rust : P.primer, P.teal, 0.45)); }
    for (const st2 of TF.streaks) { c.globalAlpha = st2.a; ink(c, st2.pts, st2.w * 0.7 / LW, P.rust, { t0: 0.05, t1: 0.8, var: 0.2 }); c.globalAlpha = 1; }
    if (L) { air(c, lx * 30, -60, 40, L.kc, 0.25 * (L.spec ?? 1), 0.5, 1); air(c, 0, -146, 60, L.cc, 0.3, 1, 0.08); }
    if (lv > 0) { c.globalCompositeOperation = 'lighter'; air(c, 0, -62, 60, '#ffb850', 0.3 * lv, 1, 0.8); c.globalCompositeOperation = 'source-over'; }
    c.restore();
  }
  // windscreens
  for (const pane of [TF.paneL, TF.paneC, TF.paneR]) {
    const lit = st.int || 0;
    cel(c, pane, lit > 0.05 ? mixs(P.glass, P.lit, lit * 0.8) : P.glass, { line: 1.2, inside: (c) => { c.fillStyle = P.glass1; c.fillRect(-70, -121, 140, 5); air(c, (L ? L.kx : 1) * 18 + pane[0][0] * 0.3, -104, 18, P.glassH, 0.45, 0.35, 1.3, 0.4); if (lit > 0.05) air(c, 0, -110, 40, P.litH, lit * 0.7, 1, 0.6); } });
  }
  for (const ray of TF.crack) ink(c, ray, 0.6, P.glassH, { t0: 0.1, t1: 0.9 });
  ink(c, [[6, -89.5], [-15, -113]], 1.1); dot(c, 6, -89.5, 1.4, P.steel);
  // destination box
  cel(c, rrect(-26, -139, 52, 16, 2.5, 3), P.cream1, { line: 1.0 });
  const dv = st.destLit || 0;
  cel(c, TF.dest, dv > 0.02 ? mixs('#1a1c1c', '#f4ecd0', dv) : '#141a1e', { line: 1.0, inside: (c) => { if (dv > 0.02 && st.destMoon) { dot(c, 0, -131, 3.6, css('#ffcf5a', dv)); dot(c, 1.6, -132, 3.2, mixs('#f4ecd0', '#1a1c1c', 0)); } air(c, -10, -134, 8, P.glassH, 0.4, 1, 0.4); } });
  // belt & seams & letterboard
  ink(c, subdiv([[-70, -82], [70, -82]], 6), 1.0); ink(c, subdiv([[-70, -85], [70, -85]], 6), 0.8); ink(c, subdiv([[-65, -132], [65, -132]], 6), 1.0); ink(c, subdiv([[-64, -36], [64, -36]], 6), 0.6);
  for (const sx of [-30, 30]) ink(c, [[sx, -80], [sx, -33]], 0.7);
  if (RM.paint) for (const rv of TF.rivets) { dot(c, rv[0], rv[1], 0.75, P.teal2); dot(c, rv[0] - 0.25, rv[1] - 0.3, 0.32, rv[1] < -84 ? P.creamH : P.tealH); }
  // bumper & coupler
  cel(c, wob(subdiv(rrect(-63, -38, 126, 9, 2, 3), 3, true), 80, 0.3, 0.1, true), P.steel, { line: 1.3, inside: (c) => { c.fillStyle = P.steel1; c.fillRect(-70, -33, 140, 6); for (let k = 0; k < 7; k++) { c.fillStyle = css(P.rust, 0.8); c.fillRect(-58 + k * 17, -37, 6, 7); } }, rim: L ? [[L.cx, L.cy, L.cc, 1, 0.5]] : null });
  cel(c, rrect(-8, -30, 16, 7, 1.5, 2), P.steel1, { line: 1.0 });
  // headlamp – the eye
  cel(c, rrect(-4, -52, 8, 6, 1, 2), P.brass1, { line: 0.9 });
  cel(c, wob(ell(0, -62, 11, 11, 24), 81, 0.25, 0.2, true), P.brass, { line: 1.6, inside: (c) => { c.fillStyle = P.brass1; c.beginPath(); c.arc(2, -60, 11, 0, TAU); c.fill(); air(c, -5, -67, 5, P.brassH, 0.9, 1.3, 0.7); }, rim: L ? [[L.kx, L.ky, L.kc, 1.4, 0.2]] : null });
  const lc = lv > 0.02 ? mix('#3a3a30', '#fff7dc', clamp(lv * 1.25)) : rgb('#232a30');
  cel(c, ell(0, -62, 7.6, 7.6, 22), css(lc), { line: 1.1, inside: (c) => { if (lv < 0.3) { air(c, -2.5, -65, 4, P.glassH, 0.7); } else { air(c, 0, -62, 7, '#ffffff', lv); } } });
  cel(c, cat(qb([-11.5, -66], [-10, -76], [0, -76], 5), qb([0, -76], [10, -76], [11.5, -66], 5), qb([11.5, -66], [0, -72], [-11.5, -66], 6)), P.brass1, { line: 1.0 });
  // route number plate + marker lamp
  cel(c, wob(ell(-42, -60, 8, 8, 20), 82, 0.2, 0.2, true), '#d6cfb3', { line: 1.2, inside: (c) => { if (RM.paint) glyphs(c, -47, -64, 10, 8, '#1d2a2a', 77); } });
  cel(c, ell(44, -60, 3.4, 3.4, 12), '#5a2a1a', { line: 0.9 });
  // roof: folded pantograph & bell
  cel(c, rrect(-38, -154, 76, 3, 1, 2), P.steel1, { line: 0.9 });
  for (const ix of [-30, 30]) ink(c, [[ix, -151], [ix * 0.2, -163]], 1.6);
  const ph = cat(qb([-46, -158], [-46, -165], [-38, -166], 4), ln([-38, -166], [38, -166]), qb([38, -166], [46, -165], [46, -158], 4));
  ink(c, ph, 2.4); ink(c, ph, 1.0, P.steelH);
  bellDraw(c, 22, -149, P, L, 0);
  inkC(c, B, 2.4, P.inkc, { seed: 61 });
  if (L) { rim(c, B, L.cx, L.cy, L.cc, 1.7, 0.4); rim(c, B, L.kx, L.ky, L.kc, 2.2, 0.3); }
  if (st.ivy !== 0) drawIvy(c, TF.ivy, P, L, st.ivy ?? 1);
  const m = c.getTransform(); const hp = m.transformPoint(new DOMPoint(0, -62));
  c.restore();
  return { head: [hp.x, hp.y] };
}
// painted "harmony" still: render, then repaint with dense sampled brush strokes, then re-ink
function harmony(paintFn, inkFn, o = {}) {
  const A = mkCanvas(W, H), a = A.getContext('2d', { willReadFrequently: true });
  RM.paint = true; RM.ink = o.inkUnder ?? false; paintFn(a); RM.ink = true;
  const id = a.getImageData(0, 0, W, H).data;
  const smp = (x, y) => { x = clamp(x | 0, 0, W - 1); y = clamp(y | 0, 0, H - 1); const i = (y * W + x) * 4; return [id[i], id[i + 1], id[i + 2]]; };
  const lum = (x, y) => { const p = smp(x, y); return p[0] * 0.3 + p[1] * 0.59 + p[2] * 0.11; };
  const rng = mulberry(o.seed || 1);
  const passes = o.passes || [{ n: 26000, len: [7, 18], wid: [2.5, 5.5], a: 0.75 }, { n: 22000, len: [4, 9], wid: [1.2, 2.6], a: 0.7 }];
  for (const ps of passes) for (let i = 0; i < ps.n; i++) {
    const x = rng() * W, y = rng() * H, col = smp(x, y);
    const gx = lum(x + 3, y) - lum(x - 3, y), gy = lum(x, y + 3) - lum(x, y - 3);
    const ang = (Math.abs(gx) + Math.abs(gy) > 6 ? Math.atan2(gy, gx) + Math.PI / 2 : (o.flow ? o.flow(x, y) : -0.3)) + (rng() - 0.5) * 0.5;
    const k = 0.94 + rng() * 0.12;
    dab(a, x, y, ang, lerp(ps.len[0], ps.len[1], rng()), lerp(ps.wid[0], ps.wid[1], rng()), `rgba(${col[0] * k | 0},${col[1] * k | 0},${col[2] * k | 0},${ps.a})`);
  }
  applyPaper(a, W, H, 0.3);
  if (inkFn) { RM.paint = false; inkFn(a); RM.paint = true; }
  if (o.after) o.after(a);
  return A;
}
