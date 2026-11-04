// ───────────────────────── hand-drawn effects animation ─────────────────────────
// rain: fresh drawing every 2 frames; streaks pick up colour from nearby light sources
function rain(c, t, o = {}) {
  const d = drawingIndex(t, o.on ?? 2), ar = o.area || { x: -40, y: -40, w: W + 80, h: H + 80 };
  const ang = o.ang ?? 0.22, ca = Math.sin(ang), cb = Math.cos(ang), lights = o.lights || [];
  const layers = o.layers || [{ n: 260, len: [10, 22], w: 0.7, a: 0.22 }, { n: 140, len: [22, 44], w: 1.1, a: 0.32 }, { n: 26, len: [50, 90], w: 2.0, a: 0.28 }];
  const base = rgb(o.col || '#a9c2e6');
  const dens = o.dens ?? 1;
  layers.forEach((L, li) => {
    const rng = mulberry((o.seed ?? 1) * 7919 + d * 131 + li * 17);
    const n = Math.round(L.n * dens);
    for (let i = 0; i < n; i++) {
      const x = ar.x + rng() * ar.w, y = ar.y + rng() * ar.h, len = lerp(L.len[0], L.len[1], rng()) * (o.lenK ?? 1);
      let col = base, a = L.a * (0.45 + rng() * 0.55);
      for (const lt of lights) { const dd = Math.hypot(x - lt.x, (y - lt.y) * (lt.sy ?? 1)); if (dd < lt.r) { const k = (1 - dd / lt.r) ** 1.4 * (lt.k ?? 1); col = mix(col, lt.col, Math.min(1, k * 1.6)); a = Math.min(0.95, a + k * (lt.a ?? 0.5)); } }
      if (o.gold) { const k = o.gold(x, y); if (k > 0) { col = mix(col, '#ffd27a', k); a = Math.min(1, a + k * 0.4); } }
      const x2 = x - ca * len, y2 = y - cb * len, w = L.w * (0.6 + rng() * 0.6);
      c.beginPath(); c.moveTo(x - cb * w * 0.5, y + ca * w * 0.5); c.lineTo(x2, y2); c.lineTo(x + cb * w * 0.5, y - ca * w * 0.5); c.closePath();
      c.fillStyle = css(col, a); c.fill();
      if (li === 2 && rng() < 0.3) { c.fillStyle = css(col, a * 0.6); c.fillRect(x - 0.6, y + 3, 1.2, 4); } // broken streak
    }
  });
}
function splashes(c, t, bands, o = {}) {
  const d = drawingIndex(t, 2), rng = mulberry((o.seed ?? 5) * 31 + d * 977);
  for (const b of bands) {
    const n = Math.round((b.n ?? 30) * (o.dens ?? 1));
    for (let i = 0; i < n; i++) {
      const x = b.x0 + rng() * (b.x1 - b.x0), y = b.y0 + rng() * (b.y1 - b.y0), s = (b.s ?? 1) * (0.6 + rng() * 0.8) * (0.5 + (y - b.y0) / Math.max(1, b.y1 - b.y0) * 0.7);
      let col = rgb(o.col || '#b8d0f0'); for (const lt of (o.lights || [])) { const dd = Math.hypot(x - lt.x, y - lt.y); if (dd < lt.r) col = mix(col, lt.col, 1 - dd / lt.r); }
      const ph = rng();
      c.strokeStyle = css(col, 0.5 + rng() * 0.3); c.lineWidth = 0.8 * s; c.lineCap = 'round'; c.beginPath();
      if (ph < 0.5) { for (let k = -2; k <= 2; k++) { c.moveTo(x + k * 1.2 * s, y); c.lineTo(x + k * 3.2 * s, y - (4 - Math.abs(k)) * 1.6 * s); } }
      else { c.ellipse(x, y, 4 * s, 1.1 * s, 0, 0, TAU); }
      c.stroke();
    }
  }
}
function ripples(c, t, poly, o = {}) {
  const d = drawingIndex(t, 2), bb = bbox(poly);
  c.save(); clipP(c, poly);
  const per = o.n ?? 10;
  for (let age = 0; age < 4; age++) {
    const dd = d - age, rng = mulberry((o.seed ?? 9) * 13 + dd * 7717);
    for (let i = 0; i < per; i++) {
      const x = bb.x + rng() * bb.w, y = bb.y + rng() * bb.h, s = (0.5 + (y - bb.y) / bb.h) * (o.s ?? 1);
      const r = (2 + age * 4.5) * s * (0.8 + rng() * 0.4);
      let col = rgb(o.col || '#9cc4e8'); for (const lt of (o.lights || [])) { const q = Math.hypot(x - lt.x, (y - lt.y)); if (q < lt.r) col = mix(col, lt.col, (1 - q / lt.r)); }
      c.strokeStyle = css(col, (0.55 - age * 0.12)); c.lineWidth = 0.9; c.beginPath(); c.ellipse(x, y, r, r * 0.28, 0, 0, TAU); c.stroke();
    }
  }
  c.restore();
}
// mirror the already-composited frame into a puddle, in strips with ripple displacement
const REF_SNAP = mkCanvas(W, H), REF_SC = REF_SNAP.getContext('2d');
function reflect(c, src, poly, axis, t, o = {}) {
  const bb = bbox(poly), d = drawingIndex(t, 2);
  if (src === c.canvas) { REF_SC.clearRect(0, 0, W, H); REF_SC.drawImage(src, 0, 0); src = REF_SNAP; } // one snapshot, not one per strip
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); clipP(c, poly);
  c.fillStyle = o.base || '#05070d'; c.fillRect(bb.x, bb.y, bb.w, bb.h);
  const st = 2, amp = o.amp ?? 2.2;
  c.globalAlpha = o.alpha ?? 0.8;
  for (let y = Math.floor(bb.y); y < bb.y + bb.h; y += st) {
    const sy = 2 * axis - y - (o.shift ?? 0); if (sy < 0 || sy > H - st) continue;
    const off = (Math.sin(y * 0.55 + d * 1.7) * 0.6 + (vn(y * 0.2 + d * 3.1, 4) - 0.5)) * amp * (0.4 + (y - bb.y) / bb.h);
    c.drawImage(src, 0, sy, W, st, off, y, W, st);
  }
  c.globalAlpha = 1;
  c.fillStyle = css(o.tint || '#0a1428', o.tintA ?? 0.35); c.fillRect(bb.x, bb.y, bb.w, bb.h);
  c.restore();
  // painted rim of the puddle
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  const P = wob(subdiv(poly, 6, true), 8, 1, 0.05, true);
  for (let i = 0; i < P.length * 0.55; i += 9) ink(c, P.slice(i, i + 5 + (i % 4)), 1.1, css(o.rimCol || '#6f9cc4', 0.3), { t0: 0.3, t1: 0.3 });
  c.restore();
}
// lightning: angular, single-frame shape
function bolt(c, x0, y0, x1, y1, seed, o = {}) {
  const rng = mulberry(seed);
  const main = [[x0, y0]]; const n = 9;
  for (let i = 1; i <= n; i++) { const t = i / n; main.push([lerp(x0, x1, t) + (rng() - 0.5) * 60 * (1 - t * 0.3), lerp(y0, y1, t) + (rng() - 0.5) * 12]); }
  const branches = [];
  for (let k = 0; k < 5; k++) { const i = 1 + (rng() * (n - 2) | 0), p = main[i]; const b = [p]; let x = p[0], y = p[1]; const dir = rng() < 0.5 ? -1 : 1; for (let j = 0; j < 4; j++) { x += dir * (14 + rng() * 26); y += 14 + rng() * 22; b.push([x, y]); } branches.push(b); }
  const g = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  const draw = (pts, w) => { setLWpx(); ink(c, pts, w * 3.5, css('#6f8cff', 0.35), { t0: 0.02, t1: 0.5, var: 0.1 }); ink(c, pts, w, '#ffffff', { t0: 0.02, t1: 0.6, var: 0.2 }); };
  draw(main, o.w ?? 5); for (const b of branches) draw(b, 2);
  c.globalCompositeOperation = g;
  return main;
}
function setLWpx() { LW = 1; }
// sparks: jagged bursts, smear frames, flying shards – every drawing different
function sparkBurst(c, x, y, size, seed, o = {}) {
  const rng = mulberry(seed), n = 7 + (rng() * 5 | 0), pts = [];
  const smear = o.smear ?? 0, sa = o.smearAng ?? 0;
  for (let i = 0; i < n * 2; i++) {
    const a = i / (n * 2) * TAU + (rng() - 0.5) * 0.3; let r = i % 2 ? size * (0.18 + rng() * 0.15) : size * (0.5 + rng() * 0.7);
    const al = Math.cos(a - sa); if (smear && al > 0) r *= 1 + smear * al * al * 2.5;
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  const g = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  air(c, x, y, size * 2.4, o.glow || '#5aa8ff', 0.5);
  fillP(c, pts, css(o.edge || '#7ac8ff', 0.9));
  fillP(c, pts.map(p => [lerp(x, p[0], 0.6), lerp(y, p[1], 0.6)]), '#ffffff');
  // shards and smear lines
  for (let k = 0; k < (o.shards ?? 7); k++) {
    const a = rng() * TAU, r0 = size * (0.8 + rng() * 1.6), l = size * (0.3 + rng() * 0.9) * (1 + smear);
    const sx = x + Math.cos(a) * r0, sy = y + Math.sin(a) * r0 + (o.grav ?? 0) * r0 * 0.3;
    c.strokeStyle = css(rng() < 0.5 ? '#ffffff' : (o.edge || '#9ad8ff'), 0.9); c.lineWidth = 1 + rng() * 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a) * l, sy + Math.sin(a) * l + (o.grav ?? 0) * l); c.stroke();
  }
  c.globalCompositeOperation = g;
}
// glowing cel line (rails of light): halo, colour line, white core
function lightLine(c, pts, w, col, a = 1, core = '#fff8e0') {
  if (pts.length < 2 || a <= 0) return;
  const g = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = css(col, 0.12 * a); c.lineWidth = w * 7; c.beginPath(); pathP(c, pts, false); c.stroke();
  c.strokeStyle = css(col, 0.28 * a); c.lineWidth = w * 3; c.beginPath(); pathP(c, pts, false); c.stroke();
  c.strokeStyle = css(col, 0.9 * a); c.lineWidth = w * 1.3; c.beginPath(); pathP(c, pts, false); c.stroke();
  c.strokeStyle = css(core, a); c.lineWidth = Math.max(0.8, w * 0.45); c.beginPath(); pathP(c, pts, false); c.stroke();
  c.globalCompositeOperation = g;
}
function lightPoly(c, pts, col, a = 1, core = '#fff8e0') {
  const g = c.globalCompositeOperation; c.globalCompositeOperation = 'lighter';
  const b = bbox(pts), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  air(c, cx, cy, Math.max(b.w, b.h) * 1.4, col, 0.35 * a);
  fillP(c, pts, css(col, 0.85 * a));
  fillP(c, pts.map(p => [lerp(cx, p[0], 0.55), lerp(cy, p[1], 0.4)]), css(core, a));
  c.globalCompositeOperation = g;
}
function hb(cx, cy, w, h, ang = 0) { const c2 = Math.cos(ang), s2 = Math.sin(ang); return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [cx + x * c2 - y * s2, cy + x * s2 + y * c2]); }
