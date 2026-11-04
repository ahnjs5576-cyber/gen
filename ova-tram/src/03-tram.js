// ───────────────────────── the streetcar (side elevation model) ─────────────────────────
// local units: origin = rail top under body centre, y up = negative. Body 300 long, roof at -149.
const PAL0 = {
  teal: '#34605f', teal1: '#1e3a40', teal2: '#0b161c', tealH: '#86c2b8',
  cream: '#a39d86', cream1: '#625f50', cream2: '#26241f', creamH: '#e8ddb8',
  roof: '#3a414b', roof1: '#21262e', roof2: '#0b0d12',
  glass: '#132230', glass1: '#09111a', glassH: '#7ea8c0',
  lit: '#ffcf7e', lit1: '#d2843a', litH: '#fff5cc',
  brass: '#a9863f', brass1: '#5d4520', brass2: '#291c0b', brassH: '#ffe6a4',
  steel: '#3d3a3a', steel1: '#232122', steel2: '#0d0c0d', steelH: '#958f88',
  rust: '#8b4320', rustH: '#b85e2c', rustD: '#4b2412', primer: '#713b2a', under: '#5b6f68',
  moss: '#3f5b2b', mossH: '#86a84d', ivy: '#1f3b25', ivy1: '#0c1a10', ivyH: '#62925b',
  seat: '#2f5a3c', inkc: INK,
};
const PAL_CACHE = new Map();
function tintPal(col, amt, lift = 0, key = '') {
  const k = col + amt + lift + key; if (PAL_CACHE.has(k)) return PAL_CACHE.get(k);
  const p = {};
  for (const n in PAL0) { if (n === 'inkc') { p[n] = PAL0[n]; continue; } const m = mix(PAL0[n], col, amt); p[n] = css(mix(m, '#ffffff', lift)); }
  PAL_CACHE.set(k, p); return p;
}
const TG = (() => {
  const r = mulberry(4242);
  const body = cat(
    ln([-136, -30], [136, -30], 1),
    bez([136, -30], [144, -33], [149, -48], [150, -66], 6), ln([150, -66], [150, -84]),
    bez([150, -84], [150, -104], [148, -118], [143, -128], 6), bez([143, -128], [138, -136], [128, -141], [116, -143], 5),
    bez([116, -143], [60, -149.5], [-60, -149.5], [-116, -143], 14), bez([-116, -143], [-132, -141], [-142, -136], [-148, -127], 5),
    bez([-148, -127], [-153, -115], [-156, -101], [-156, -86], 6), bez([-156, -86], [-157, -70], [-155, -50], [-149, -38], 6),
    bez([-149, -38], [-145, -32], [-141, -30], [-136, -30], 3));
  const B = wob(subdiv(body, 4, true), 5, 0.35, 0.05, true);
  const wins = [];
  wins.push({ x: -131, w: 22, door: 1 });
  for (let i = 0; i < 6; i++) wins.push({ x: -101 + i * 34, w: 28 });
  wins.push({ x: 108, w: 22, door: 1 });
  wins.forEach((w, i) => { w.p = wob(subdiv(rrect(w.x, -117, w.w, 28, 3, 3), 3, true), 20 + i, 0.3, 0.08, true); w.sash = wob(subdiv(rrect(w.x - 2, -119, w.w + 4, 32, 3.5, 3), 3, true), 40 + i, 0.3, 0.08, true); });
  // nose wrap-around windscreen sliver
  const nose = wob(subdiv(cat(bez([-147, -120], [-151, -112], [-153.5, -102], [-153.6, -90], 5), ln([-153.6, -90], [-143, -90]), bez([-143, -90], [-143, -104], [-142, -113], [-140, -120], 4)), 3, true), 77, 0.3, 0.08, true);
  const rivets = [], streaks = [], chips = [], grime = [], moss = [];
  const addRow = (x0, x1, y, step) => { for (let x = x0; x <= x1; x += step) rivets.push([x + (r() - 0.5) * 0.6, y + (r() - 0.5) * 0.5]); };
  addRow(-140, 140, -77.5, 7.5); addRow(-134, 134, -34, 7.5); addRow(-140, 142, -121.5, 9);
  for (const sx of [-104, -36, 34, 102]) for (let y = -72; y > -38; y -= 7) rivets.push([sx + 2.2, y]);
  for (const d of [-131, 108]) for (let y = -112; y < -40; y += 9) { rivets.push([d - 3, y]); rivets.push([d + 25, y]); }
  for (const rv of rivets) if (r() < 0.62) {
    const len = 3 + r() * r() * 22, pts = []; let x = rv[0], y = rv[1] + 1;
    for (let k = 0; k <= 6; k++) { pts.push([x, y]); y += len / 6; x += (r() - 0.5) * 0.7; }
    streaks.push({ pts, w: 0.6 + r() * 0.9, a: 0.35 + r() * 0.5 });
  }
  const chip = (x, y, s, kind) => { const n = 7 + (r() * 5 | 0), p = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = s * (0.45 + r() * 0.75); p.push([x + Math.cos(a) * rr * 1.3, y + Math.sin(a) * rr * 0.8]); } chips.push({ p, kind }); };
  for (let i = 0; i < 22; i++) chip(-140 + r() * 280, -82 + r() * 46, 0.8 + r() * r() * 4, 'teal');
  for (let i = 0; i < 11; i++) chip(-140 + r() * 280, -130 + r() * 8, 1 + r() * 3, 'cream');
  for (let i = 0; i < 9; i++) chip(-120 + r() * 240, -88 + r() * 4, 1 + r() * 2.5, 'cream');
  for (const w of wins) for (const ex of [w.x + 2, w.x + w.w - 2]) if (r() < 0.7) grime.push({ x: ex, y0: -88, len: 8 + r() * 40, w: 1.5 + r() * 3, a: 0.12 + r() * 0.16 });
  for (let i = 0; i < 70; i++) moss.push([-142 + r() * 284, -31 - r() * 3.5, 0.5 + r() * 1.2]);
  for (let i = 0; i < 26; i++) { const sx = [-104, -36, 34, 102][i % 4]; moss.push([sx + 1 + r() * 2, -40 - r() * 30, 0.4 + r() * 0.8]); }
  for (let i = 0; i < 30; i++) moss.push([-140 + r() * 284, -82.6 + r() * 1.5, 0.4 + r() * 0.8]);
  const cracks = [];
  const crack = (cx, cy, n, len, seed) => { const rr = mulberry(seed); const rays = []; for (let k = 0; k < n; k++) { let a = k / n * TAU + rr() * 0.6, x = cx, y = cy; const p = [[x, y]]; const L = len * (0.4 + rr() * 0.8); for (let s = 0; s < 4; s++) { a += (rr() - 0.5) * 0.7; x += Math.cos(a) * L / 4; y += Math.sin(a) * L / 4; p.push([x, y]); } rays.push(p); } return rays; };
  cracks.push({ win: 2, rays: crack(-27, -108, 7, 16, 9) });
  cracks.push({ win: 1, rays: crack(-60, -96, 4, 12, 12) });
  cracks.push({ win: 6, rays: crack(84, -112, 5, 14, 15) });
  const hole = wob(subdiv([[44, -117], [56, -117], [58, -110], [52, -104], [57, -99], [49, -96], [45, -101], [41, -97], [36, -104], [39, -111]], 2, true), 31, 0.5, 0.1, true);
  return { B, wins, nose, rivets, streaks, chips, grime, moss, cracks, hole };
})();

// ivy: generated once, in tram-local space; same seed = same plant in every shot
const IVY = (() => {
  const r = mulberry(777), strands = [];
  const grow = (x, y, ang, len, curl, rootSeed, climb = 1) => {
    const pts = [[x, y]], leaves = []; let a = ang;
    for (let L = 0; L < len; L += 3) {
      a += (vn(L * 0.06, rootSeed) - 0.5) * curl * 0.22; a = lerp(a, -Math.PI / 2, 0.06 * climb);
      x += Math.cos(a) * 3; y += Math.sin(a) * 3; pts.push([x, y]);
      if (L > 4 && (L / 3 | 0) % 2 === 0 && r() < 0.8) leaves.push({ x, y, a: a + (((L / 3 | 0) % 4 === 0) ? 1.3 : -1.3) + (r() - 0.5) * 0.6, s: 3.2 + r() * 3.2 });
    }
    return { pts, leaves, w: 0.9 + r() * 0.5 };
  };
  const roots = [[-150, 2], [-128, 2], [-112, 1], [-96, 1], [-70, 2], [-58, 1], [-30, 2], [8, 2], [52, 1], [66, 2], [92, 2], [118, 1], [138, 2]];
  roots.forEach(([x, y], i) => {
    const n = 1 + (r() * 2 | 0);
    for (let k = 0; k < n; k++) strands.push(grow(x + (r() - 0.5) * 6, y, -Math.PI / 2 + (r() - 0.5) * 1.2, 22 + r() * (i % 3 === 0 ? 110 : 55), 1.6, i * 7 + k));
  });
  // strands threading through the wheel spokes
  for (const wx of [-102, -62, 62, 102]) {
    const pts = [], leaves = [];
    for (let k = 0; k <= 16; k++) { const a = Math.PI * 0.95 - k / 16 * Math.PI * 1.25; const rr = 8.5 + Math.sin(k * 0.8) * 1.5; pts.push([wx + Math.cos(a) * rr, -13 - Math.sin(a) * rr]); if (k % 3 === 1) leaves.push({ x: pts[k][0], y: pts[k][1], a: -a + (k % 2 ? 1 : -1), s: 3 + r() * 2 }); }
    strands.push({ pts: [[wx - 12, 1], ...pts], leaves, w: 1.1, wheel: 1 });
  }
  // long strand up the nose, across the dash under the headlamp, and one into the broken window
  strands.push(grow(-146, 0, -Math.PI / 2 - 0.25, 95, 1.0, 99, 0.6));
  { const pts = cat(qb([-132, -30], [-150, -50], [-158, -52], 10)), leaves = []; pts.forEach((p, k) => { if (k % 2) leaves.push({ x: p[0], y: p[1], a: k * 1.7, s: 3.5 + r() * 2 }); }); strands.push({ pts, leaves, w: 1.0 }); }
  { const pts = cat(qb([30, -32], [38, -70], [46, -102], 14)), leaves = []; pts.forEach((p, k) => { if (k % 2) leaves.push({ x: p[0], y: p[1], a: k * 2.1, s: 3.8 + r() * 2 }); }); strands.push({ pts, leaves, w: 1.2 }); }
  // dense ground clumps around the bogies and the nose
  for (const [cx, n] of [[-150, 16], [-110, 22], [-80, 14], [-55, 16], [-10, 8], [40, 10], [70, 18], [100, 22], [140, 14]]) {
    const leaves = []; for (let k = 0; k < n; k++) leaves.push({ x: cx + (r() - 0.5) * 30, y: -2 - r() * r() * 30, a: -Math.PI / 2 + (r() - 0.5) * 2.6, s: 3.5 + r() * 3.5 });
    leaves.sort((a, b) => a.y - b.y); strands.push({ pts: [], leaves, w: 1 });
  }
  // remnants that stay after tearing loose (hang from the skirt)
  const rem = [];
  for (const x of [-120, -44, 20, 84, 126]) { const len = 8 + r() * 14, pts = []; for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k * 0.9) * 1.5, -31 + k * len / 6]); rem.push({ pts, leaves: [{ x: pts[6][0], y: pts[6][1], a: Math.PI / 2, s: 3.5 }], w: 0.9 }); }
  return { strands, rem };
})();
const LEAF = [[0, -0.08], [0.35, 0.06], [0.58, -0.3], [0.62, -0.52], [0.28, -0.6], [0.12, -1.0], [0, -1.06], [-0.12, -1.0], [-0.28, -0.6], [-0.62, -0.52], [-0.58, -0.3], [-0.35, 0.06]];
function leaf(c, x, y, a, s, P, L) {
  const pts = LEAF.map(([u, v]) => { const ca = Math.cos(a + Math.PI / 2), sa = Math.sin(a + Math.PI / 2); return [x + (u * ca - v * sa) * s, y + (u * sa + v * ca) * s]; });
  fillP(c, pts, P.ivy);
  if (RM.paint) { c.save(); clipP(c, pts); const ca = Math.cos(a), sa = Math.sin(a); c.beginPath(); c.moveTo(x, y); c.lineTo(x + ca * s * 2 + sa * s * 2, y + sa * s * 2 - ca * s * 2); c.lineTo(x - ca * s * 2 + sa * s * 2, y - sa * s * 2 - ca * s * 2); c.closePath(); c.fillStyle = P.ivy1; c.globalAlpha = 0.85; c.fill(); c.restore(); }
  inkC(c, pts, 0.7, P.inkc);
  if (L) rim(c, pts, L.cx, L.cy, L.cc, 0.9, 0.2);
}
function drawIvy(c, list, P, L, k = 1, sway = 0) {
  for (const s of list) {
    let pts = s.pts; if (k < 1) pts = pts.slice(0, Math.max(2, Math.ceil(pts.length * k)));
    if (sway) pts = pts.map((p, i) => [p[0] + Math.sin(sway + i * 0.3) * i * 0.04, p[1]]);
    ink(c, pts, s.w * 1.6, P.ivy1, { t0: 0.05, t1: 0.4 });
    ink(c, pts, s.w * 0.6, P.ivyH, { t0: 0.1, t1: 0.4 });
    for (const lf of s.leaves) { if (k < 1 && pts.length < s.pts.length && !pts.some(p => Math.abs(p[0] - lf.x) < 2 && Math.abs(p[1] - lf.y) < 2)) continue; leaf(c, lf.x, lf.y, lf.a, lf.s, P, L); }
  }
}
function wheelDraw(c, x, y, r, rot, P, L, blur = 0) {
  const tire = ell(x, y, r, r, 30);
  cel(c, ell(x, y, r + 1.4, r + 1.4, 30), P.steel2, { line: 1.0 });
  cel(c, tire, P.steel, {
    line: 1.3, inside: (c) => {
      c.fillStyle = P.steel1; c.beginPath(); c.arc(x + r * 0.15, y + r * 0.25, r * 1.05, 0, TAU); c.fill();
      for (let k = 0; k < 6; k++) { const a = k * 1.9 + 0.4; c.fillStyle = k % 2 ? P.rust : P.rustD; c.beginPath(); c.ellipse(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.22, r * 0.09, a + 1.57, 0, TAU); c.fill(); }
    }, rim: L ? [[L.cx, L.cy, L.cc, 1.1, 0.4], [L.kx, L.ky, L.kc, 1.1, 0.5]] : null
  });
  const ri = r * 0.8;
  fillP(c, ell(x, y, ri, ri, 24), P.steel2);
  if (blur > 0.6) {
    // speed: spokes become a smear drawing
    c.save(); for (let k = 0; k < 3; k++) { c.strokeStyle = css(P.steelH, 0.35); c.lineWidth = 1.2 * LW; c.beginPath(); c.arc(x, y, ri * (0.45 + k * 0.17), rot + k, rot + k + 2.2); c.stroke(); } c.restore();
  } else {
    for (let k = 0; k < 8; k++) {
      const a = rot + k * TAU / 8, ca = Math.cos(a), sa = Math.sin(a), w0 = r * 0.09, w1 = r * 0.05;
      const sp = [[x + ca * r * 0.2 - sa * w0, y + sa * r * 0.2 + ca * w0], [x + ca * ri - sa * w1, y + sa * ri + ca * w1], [x + ca * ri + sa * w1, y + sa * ri - ca * w1], [x + ca * r * 0.2 + sa * w0, y + sa * r * 0.2 - ca * w0]];
      fillP(c, sp, sa > 0.3 ? P.steel1 : P.steel); inkC(c, sp, 0.6);
    }
  }
  inkC(c, ell(x, y, ri, ri, 24), 0.8);
  cel(c, ell(x, y, r * 0.26, r * 0.26, 16), P.steel, { line: 0.9, inside: (c) => { c.fillStyle = P.steel1; c.fillRect(x - r, y, 2 * r, r); } });
  dot(c, x - r * 0.06, y - r * 0.06, r * 0.08, P.steelH);
}
function bogie(c, bx, P, L, rot, blur) {
  wheelDraw(c, bx - 20, -13, 13, rot, P, L, blur);
  wheelDraw(c, bx + 20, -13, 13, rot + 0.4, P, L, blur);
  // side frame, axle boxes, leaf spring
  const fr = wob(subdiv([[bx - 34, -27], [bx + 34, -27], [bx + 32, -20], [bx + 24, -18], [bx + 16, -20], [bx - 16, -20], [bx - 24, -18], [bx - 32, -20]], 3, true), bx, 0.25, 0.1, true);
  cel(c, fr, P.steel, { line: 1.3, inside: (c) => { c.fillStyle = P.steel1; c.fillRect(bx - 40, -23, 80, 8); c.fillStyle = css(P.rust, 0.7); c.fillRect(bx - 30, -21, 9, 3); c.fillRect(bx + 8, -22, 14, 2); }, rim: L ? [[L.cx, L.cy, L.cc, 1, 0.5]] : null });
  for (const ax of [bx - 20, bx + 20]) cel(c, rrect(ax - 4.5, -20, 9, 11, 1.5, 2), P.steel1, { line: 1.0, inside: (c) => { c.fillStyle = P.steel2; c.fillRect(ax - 5, -14, 10, 6); } });
  for (let k = 0; k < 4; k++) { const sp = qb([bx - 12 + k, -26 + k * 1.6], [bx, -21 + k * 1.6], [bx + 12 - k, -26 + k * 1.6], 8); ink(c, sp, 1.3, k % 2 ? P.steel1 : INK); }
  ink(c, [[bx - 1, -28], [bx - 1, -20]], 1.4);
}
// pantograph – diamond frame; p 0 folded … 1 fully raised
function pantoGeom(p) { const th = lerp(0.105, 1.26, clamp(p)), L = 56, base = -153; return { th, L, base, kx: Math.cos(th) * L, ky: base - Math.sin(th) * L, top: base - 2 * Math.sin(th) * L }; }
function pantograph(c, p, P, L, jit = 0) {
  const g = pantoGeom(p);
  cel(c, rrect(-36, -152.5, 72, 3.4, 1, 2), P.steel1, { line: 1.0 });
  for (const ix of [-30, 30]) cel(c, rrect(ix - 3, -150, 6, 2.4, 1, 2), '#6f6458', { line: 0.8 });
  const arm = (a, b, w = 2.9) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy), nx = -dy / d * w / 2, ny = dx / d * w / 2;
    const q = [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny]];
    fillP(c, q, P.steel); ink(c, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny]], 0.8); ink(c, [[a[0] - nx, a[1] - ny], [b[0] - nx, b[1] - ny]], 0.8);
    if (L) ink(c, [[a[0] + nx * 0.6, a[1] + ny * 0.6], [b[0] + nx * 0.6, b[1] + ny * 0.6]], 0.6, L.cc);
  };
  const B = [0, g.base], KL = [-g.kx, g.ky], KR = [g.kx, g.ky], T = [jit, g.top];
  // far frame (offset, darker) then near frame
  c.save(); c.globalAlpha = 0.8; arm([B[0] + 3, B[1]], [KL[0] + 3, KL[1]], 1.6); arm([B[0] + 3, B[1]], [KR[0] + 3, KR[1]], 1.6); c.restore();
  arm(B, KL); arm(B, KR); arm(KL, T); arm(KR, T);
  arm([lerp(B[0], KL[0], 0.5), lerp(B[1], KL[1], 0.5)], [lerp(B[0], KR[0], 0.5), lerp(B[1], KR[1], 0.5)], 1.4);
  arm([lerp(T[0], KL[0], 0.45), lerp(T[1], KL[1], 0.45)], [lerp(T[0], KR[0], 0.45), lerp(T[1], KR[1], 0.45)], 1.2);
  // springs
  const spr = []; for (let k = 0; k <= 14; k++) { const t = k / 14; spr.push([lerp(-26, KL[0] * 0.5, t) + (k % 2 ? 1.2 : -1.2), lerp(-152, lerp(B[1], KL[1], 0.5), t)]); }
  ink(c, spr, 0.8, P.steelH);
  for (const k of [KL, KR, B]) { dot(c, k[0], k[1], 2, P.steel1); inkC(c, ell(k[0], k[1], 2, 2, 8), 0.7); }
  // pan head with horns + carbon shoe
  const ph = cat(qb([jit - 40, g.top + 6], [jit - 42, g.top - 1], [jit - 33, g.top - 2.4], 5), ln([jit - 33, g.top - 2.4], [jit + 33, g.top - 2.4]), qb([jit + 33, g.top - 2.4], [jit + 42, g.top - 1], [jit + 40, g.top + 6], 5));
  ink(c, ph, 2.6, INK); ink(c, ph, 1.2, P.steelH);
  cel(c, rrect(jit - 28, g.top - 4.6, 56, 2.6, 1, 2), '#2b2a2c', { line: 0.8 });
  return g;
}
function bellDraw(c, x, y, P, L, swing = 0) {
  cel(c, rrect(x - 4, y - 2.5, 8, 2.5, 1, 2), P.steel1, { line: 0.9 });
  c.save(); c.translate(x, y - 2.5); c.rotate(swing);
  const b = cat(qb([-6.5, 0], [-6, -6], [-3.2, -9.5], 6), qb([-3.2, -9.5], [0, -11.2], [3.2, -9.5], 4), qb([3.2, -9.5], [6, -6], [6.5, 0], 6));
  cel(c, b, P.brass, { line: 1.2, inside: (c) => { c.fillStyle = P.brass1; c.beginPath(); c.moveTo(1.5, -11); c.quadraticCurveTo(5, -6, 7, 0); c.lineTo(9, 0); c.lineTo(9, -12); c.fill(); air(c, -3, -6, 4, P.brassH, 0.9, 0.5, 1.2); }, rim: L ? [[L.kx, L.ky, L.kc, 1.1, 0.2]] : null });
  ink(c, [[-7, 0.2], [7, 0.2]], 1.4); dot(c, 0, -11.8, 1.1, P.brass);
  c.restore();
}
function headlampSide(c, P, lvl, L) {
  cel(c, [[-152, -70], [-160, -71.5], [-161, -60], [-152, -61]], P.brass1, { line: 1.0 });
  const hs = wob(subdiv(cat(qb([-158, -76], [-163, -76], [-166, -72], 4), qb([-166, -72], [-169, -66], [-166, -59], 5), qb([-166, -59], [-163, -56], [-158, -56], 4), ln([-158, -56], [-157, -76], 2)), 2, true), 66, 0.2, 0.1, true);
  cel(c, hs, P.brass, { line: 1.4, inside: (c) => { c.fillStyle = P.brass1; c.fillRect(-170, -63, 20, 9); c.fillStyle = P.brass2; c.fillRect(-170, -58, 20, 4); air(c, -161, -71, 3.5, P.brassH, 0.9, 1.6, 0.7); }, rim: L ? [[L.kx, L.ky, L.kc, 1.2, 0.2]] : null });
  const lens = ell(-166.3, -66, 2.6, 8.4, 16);
  const lc = lvl > 0.02 ? mix('#3a3a30', '#fff6d0', clamp(lvl * 1.3)) : rgb('#2a3036');
  cel(c, lens, css(lc), { line: 1.0, inside: (c) => { if (lvl < 0.3) air(c, -167, -69, 3, P.glassH, 0.7, 0.6, 1); } });
}
function tramSide(c, x, y, s, st = {}) {
  const P = st.pal || PAL0, L = st.L;
  c.save(); c.translate(x, y); if (st.flip) c.scale(-1, 1); if (st.tilt) c.rotate(st.tilt); c.scale(s, s); setLW(s * (st.lwBoost || 1));
  const out = {};
  // contact shadow cel under the car
  if (st.ground !== false && RM.paint) { c.save(); c.globalAlpha = 0.55; fillP(c, [[-146, -30], [146, -30], [156, 2], [-158, 2]], '#04060a'); c.restore(); }
  const rotW = st.wrot || 0;
  bogie(c, -82, P, L, rotW, st.blur || 0); bogie(c, 82, P, L, rotW + 1.1, st.blur || 0);
  // steps
  for (const sx of [-131, 108]) { cel(c, [[sx, -30], [sx + 22, -30], [sx + 21, -21], [sx + 1, -21]], P.steel1, { line: 1.1 }); cel(c, rrect(sx - 1, -22.5, 24, 3, 0.8, 2), P.steel, { line: 1.1, inside: (c) => { c.fillStyle = P.rust; c.fillRect(sx + 3, -21, 7, 2); } }); }
  if (st.ivy !== 0 && st.ivyBehind !== false) drawIvy(c, IVY.strands.filter(v => v.wheel), P, L, st.ivy ?? 1);
  // ── body group (rocks on its springs)
  c.save(); c.translate(0, -30); c.rotate(st.lean || 0); c.translate(0, 30 + (st.bob || 0));
  const B = TG.B;
  fillP(c, B, P.cream);
  if (RM.paint) {
    c.save(); clipP(c, B);
    c.fillStyle = P.teal; c.fillRect(-170, -81.5, 340, 60);
    c.fillStyle = P.roof; c.fillRect(-170, -200, 340, 68.5);
    // two hard shadow tones
    c.fillStyle = P.teal1; c.fillRect(-170, -40, 340, 12); c.fillRect(-170, -80.5, 340, 2.6);
    c.fillStyle = P.teal2; c.fillRect(-170, -33.5, 340, 4);
    c.fillStyle = P.cream1; c.fillRect(-170, -131.5, 340, 3.6);
    c.fillStyle = P.roof1; c.fillRect(-170, -136, 340, 4.5);
    const lx = L ? Math.sign(L.kx || -1) : -1;
    const endSh = (sgn) => { const ex = sgn * 150; return [[ex - sgn * 7, -146], [ex - sgn * 5, -124], [ex - sgn * 5.5, -86], [ex - sgn * 6.5, -50], [ex - sgn * 12, -28], [ex + sgn * 20, -28], [ex + sgn * 20, -146]]; };
    fillP(c, wob(subdiv(endSh(-lx), 4, true), 3, 0.6, 0.1, true), lx < 0 ? P.cream1 : P.cream1);
    c.save(); clipP(c, endSh(-lx)); c.fillStyle = P.teal1; c.fillRect(-170, -81.5, 340, 60); c.fillStyle = P.roof1; c.fillRect(-170, -200, 340, 68.5); c.restore();
    fillP(c, wob(subdiv([[-lx * 147.5, -140], [-lx * 146.5, -100], [-lx * 147, -60], [-lx * 144, -30], [-lx * 170, -30], [-lx * 170, -140]], 4, true), 4, 0.5, 0.1, true), P.teal2, 0.75);
    // light falloff across the body (airbrushed BL pass)
    if (L && L.fall) { c.globalCompositeOperation = 'multiply'; const fg = c.createLinearGradient(-160 * lx, 0, 160 * lx, 0); fg.addColorStop(0, '#ffffff'); fg.addColorStop(0.45, mixs('#ffffff', L.fall, 0.5)); fg.addColorStop(1, css(L.fall)); c.fillStyle = fg; c.fillRect(-170, -200, 340, 200); c.globalCompositeOperation = 'source-over'; }
    if (L && L.warm) { c.globalCompositeOperation = 'lighter'; air(c, 160 * lx, -70, 120, L.kc, L.warm, 1, 0.8); c.globalCompositeOperation = 'source-over'; }
    // weathering
    for (const g of TG.grime) { c.fillStyle = css(P.teal2, g.a); c.beginPath(); c.moveTo(g.x - g.w / 2, g.y0); c.lineTo(g.x + g.w / 2, g.y0); c.lineTo(g.x + g.w * 0.15, g.y0 + g.len); c.closePath(); c.fill(); }
    for (const ch of TG.chips) { const base = ch.kind === 'teal' ? (ch.p[0][1] > -40 ? P.rust : P.primer) : P.under; fillP(c, tf(ch.p, 0.35, 0.45), ch.kind === 'teal' ? P.tealH : P.creamH, 0.35); fillP(c, ch.p, mixs(base, ch.kind === 'teal' ? P.teal : P.cream, 0.45)); }
    for (const st2 of TG.streaks) { c.globalAlpha = st2.a; ink(c, st2.pts, st2.w * 0.7 / LW, P.rust, { t0: 0.05, t1: 0.8, var: 0.2 }); c.globalAlpha = 1; }
    // wet sheen + light reflections (airbrush)
    if (L) {
      air(c, 0, -147, 120, L.cc, 0.22 * (L.sheen ?? 1), 1, 0.05);
      air(c, -lx * -150, -66, 30, L.kc, 0.35 * (L.spec ?? 1), 0.18, 1);
      air(c, (L.specX ?? -60), -58, 60, L.kc, 0.18 * (L.spec ?? 1), 1, 0.12);
      air(c, (L.specX ?? -60), -104, 40, L.cc, 0.12, 1, 0.3);
    }
    c.restore();
  }
  // moss specks along seams
  if (RM.paint) for (const m of TG.moss) { dot(c, m[0], m[1], m[2], P.moss); if (m[2] > 1) dot(c, m[0] - 0.3, m[1] - 0.4, m[2] * 0.4, P.mossH); }
  // windows
  const win = st.win || [0, 0, 0, 0, 0, 0, 0, 0];
  TG.wins.forEach((w, i) => {
    cel(c, w.sash, P.cream1, { line: 0.8 });
    const lv = typeof win === 'number' ? win : (win[i] || 0);
    const gl = lv > 0.01 ? mixs(P.glass, P.lit, clamp(lv)) : P.glass;
    fillP(c, w.p, gl);
    if (RM.paint) {
      c.save(); clipP(c, w.p);
      if (lv > 0.01) {
        air(c, w.x + w.w / 2, -122, 24, P.litH, 0.85 * lv, 1, 0.8);
        // straps & far side seen through the glass
        for (const sx of [w.x + w.w * 0.3, w.x + w.w * 0.75]) { const sw = Math.sin((st.sway || 0) + sx * 0.1) * 1.5; c.strokeStyle = css(P.lit1, 0.9 * lv); c.lineWidth = 0.9; c.beginPath(); c.moveTo(sx, -117); c.lineTo(sx + sw, -108); c.stroke(); c.beginPath(); c.ellipse(sx + sw, -106.5, 1.6, 1.8, 0, 0, TAU); c.stroke(); }
        c.fillStyle = css(P.lit1, 0.8 * lv); c.fillRect(w.x - 2, -95, w.w + 4, 8);
        c.fillStyle = css(mix(P.lit1, P.glass, 0.5), 0.5 * lv); c.fillRect(w.x + 3, -113, w.w - 6, 14);
      } else {
        c.fillStyle = P.glass1; c.fillRect(w.x - 2, -119, w.w + 4, 5);
        air(c, w.x + w.w * 0.3, -104, 16, P.glassH, 0.35, 0.35, 1.2, 0.5);
      }
      if (w.door) { c.fillStyle = css(P.glass1, 0.5); c.fillRect(w.x - 2, -119, 3, 40); }
      c.restore();
    }
    inkC(c, w.p, 1.0);
  });
  // nose wrap-around glass
  cel(c, TG.nose, (st.win && (win[0] || 0) > 0.05) ? mixs(P.glass, P.lit, clamp(win[0]) * 0.7) : P.glass, { line: 1.0, inside: (c) => air(c, -149, -110, 8, P.glassH, 0.5, 0.4, 1.4) });
  // broken window hole + cracks
  if (RM.paint) { fillP(c, TG.hole, (win[5] || 0) > 0.05 ? css(mix(P.lit1, '#000', 0.2)) : '#05080c'); }
  ink(c, TG.hole, 0.8, P.glassH, { closed: true });
  for (const cr of TG.cracks) for (const ray of cr.rays) { ink(c, ray, 0.55, P.glassH, { t0: 0.1, t1: 0.9 }); }
  // doors: panel lines & handles
  for (const d of [-131, 108]) {
    ink(c, [[d - 2, -120], [d - 2, -34]], 0.9); ink(c, [[d + 24, -120], [d + 24, -34]], 0.9);
    ink(c, [[d + 11, -86], [d + 11, -36]], 0.6); ink(c, [[d + 1, -60], [d + 21, -60]], 0.6);
    dot(c, d + 19, -72, 1.1, P.brass); inkC(c, ell(d + 19, -72, 1.1, 1.1, 6), 0.5);
  }
  // seams, belt, gutter
  for (const sx of [-104, -36, 34, 102]) ink(c, [[sx, -80], [sx, -33]], 0.7);
  ink(c, subdiv([[-155, -81.5], [150, -81.5]], 6), 1.0);
  ink(c, subdiv([[-153, -84.5], [150, -84.5]], 6), 0.8);
  ink(c, subdiv([[-147, -131.5], [146, -131.5]], 6), 1.0);
  ink(c, subdiv([[-110, -140.5], [110, -140.5]], 6), 0.55);
  ink(c, subdiv([[-140, -36], [140, -36]], 6), 0.6);
  if (L) ink(c, subdiv([[-150, -85.5], [148, -85.5]], 6), 0.7, L.cc, { var: 0.6 });
  // rivets
  if (RM.paint) for (const rv of TG.rivets) { dot(c, rv[0], rv[1], 0.75, P.teal2); dot(c, rv[0] - 0.25, rv[1] - 0.3, 0.32, rv[1] < -84 ? P.creamH : P.tealH); }
  // route plate on the letterboard
  cel(c, rrect(-126, -130, 15, 7, 1, 2), '#d8d2b8', { line: 0.8 });
  if (RM.paint) glyphs(c, -124, -129.4, 11, 5.8, '#1d2a2a', 5);
  // roof furniture
  for (const vx of [-78, 78]) cel(c, cat(qb([vx - 9, -148], [vx - 8, -154], [vx, -154.5], 4), qb([vx, -154.5], [vx + 8, -154], [vx + 9, -148], 4)), P.roof, { line: 1.0, inside: (c) => { c.fillStyle = P.roof1; c.fillRect(vx, -156, 12, 9); }, rim: L ? [[L.cx, L.cy, L.cc, 1, 0.2]] : null });
  headlampSide(c, P, st.head || 0, L);
  bellDraw(c, -112, -148.5, P, L, st.bell || 0);
  const g = pantograph(c, st.panto || 0, P, L, st.pjit || 0);
  // silhouette ink + coloured held lines
  inkC(c, B, 2.3, P.inkc, { seed: 3 });
  if (L) { rim(c, B, L.cx, L.cy, L.cc, 1.7, 0.45); rim(c, B, L.kx, L.ky, L.kc, 2.0, 0.35); }
  const m = c.getTransform();
  const tp = (lx, ly) => { const p = m.transformPoint(new DOMPoint(lx, ly)); return [p.x, p.y]; };
  out.head = tp(-168, -66); out.pan = tp(st.pjit || 0, g.top - 3); out.bell = tp(-112, -158); out.nose = tp(-156, -66);
  c.restore(); // body group
  if (st.ivy !== 0) drawIvy(c, IVY.strands.filter(v => !v.wheel), P, L, st.ivy ?? 1, st.ivySway || 0);
  else if (st.rem !== false) drawIvy(c, IVY.rem, P, L, 1, st.ivySway || 0);
  c.restore();
  return out;
}
