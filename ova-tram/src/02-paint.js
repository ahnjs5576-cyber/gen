// ───────────────────────── background painting (poster colour) ─────────────────────────
function dab(c, x, y, ang, len, wid, col) {
  const ca = Math.cos(ang), sa = Math.sin(ang), hx = ca * len * 0.5, hy = sa * len * 0.5, nx = -sa * wid * 0.5, ny = ca * wid * 0.5;
  c.beginPath(); c.moveTo(x - hx, y - hy);
  c.quadraticCurveTo(x + nx * 1.3 + hx * 0.2, y + ny * 1.3 + hy * 0.2, x + hx, y + hy);
  c.quadraticCurveTo(x - nx * 0.9 - hx * 0.1, y - ny * 0.9 - hy * 0.1, x - hx, y - hy);
  c.fillStyle = col; c.fill();
}
// visible brushwork inside a bounding box (caller clips)
function brushwork(c, bb, base, o = {}) {
  const rng = mulberry(o.seed ?? 7), b = rgb(base);
  const n = Math.min(o.max ?? 9000, Math.floor(bb.w * bb.h * (o.dens ?? 0.01)));
  const v = o.var ?? 0.1, ang = o.ang ?? 0, av = o.angVar ?? 0.35, len = o.len ?? 16, wid = o.wid ?? 4, al = o.alpha ?? 0.35;
  const warm = o.warm ?? 0;
  for (let i = 0; i < n; i++) {
    const x = bb.x + rng() * bb.w, y = bb.y + rng() * bb.h;
    const k = 1 + (rng() - 0.5) * 2 * v, hshift = (rng() - 0.5) * v * 40;
    let col = [b[0] * k + hshift * warm + hshift * 0.2, b[1] * k, b[2] * k - hshift * warm * 0.6];
    if (o.tintFn) col = o.tintFn(x, y, col, rng);
    const a = (o.angFn ? o.angFn(x, y) : ang) + (rng() - 0.5) * 2 * av;
    dab(c, x, y, a, len * (0.5 + rng()), wid * (0.6 + rng() * 0.8), css(col, al * (0.4 + rng() * 0.6)));
  }
}
function paintPoly(c, pts, col, o = {}) {
  const P = o.wob === 0 ? pts : wob(subdiv(pts, 6, true), o.seed ?? 3, o.wob ?? 1.1, 0.06, true);
  c.beginPath(); pathP(c, P); c.fillStyle = typeof col === 'string' ? col : css(col); c.fill();
  if (o.strokes !== 0) { c.save(); clipP(c, P); brushwork(c, o.bb ?? bbox(P), col, o); if (o.after) o.after(c, P); c.restore(); }
  return P;
}
function paintRect(c, x, y, w, h, col, o = {}) { return paintPoly(c, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], col, o); }
function washPoly(c, pts, x0, y0, x1, y1, stops, comp) {
  c.save(); clipP(c, pts);
  const g = c.createLinearGradient(x0, y0, x1, y1); for (const s of stops) g.addColorStop(s[0], s[1]);
  if (comp) c.globalCompositeOperation = comp;
  c.fillStyle = g; const b = bbox(pts); c.fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4); c.restore();
}
function radialWash(c, x, y, r, col, a, comp = 'source-over', sy = 1) {
  c.save(); c.globalCompositeOperation = comp; air(c, x, y, r, col, a, 1, sy); c.restore();
}
// thin painted line (BG wires, poles detail) – brush, not ink
function bline(c, pts, w, col, a = 1, seed = 1) {
  const P = wob(subdiv(pts, 6), seed, 0.5, 0.08);
  c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = css(col, a); c.lineWidth = w;
  c.beginPath(); pathP(c, P, false); c.stroke(); c.restore();
}
function sag(x0, y0, x1, y1, s, n = 24) { const r = []; for (let i = 0; i <= n; i++) { const t = i / n; r.push([lerp(x0, x1, t), lerp(y0, y1, t) + s * 4 * t * (1 - t)]); } return r; }
// painted cloud mass: union of wobbly billows, crisp lit crescents on top, brushed body, darker belly
function cloudMass(c, cx, cy, w, h, col, litCol, o = {}) {
  const rng = mulberry(o.seed ?? 11), n = o.bumps ? o.bumps * 2 + 4 : 14, blobs = [];
  for (let i = 0; i < n; i++) {
    const u = rng() * 2 - 1, r = h * (0.25 + rng() * 0.55) * (1 - Math.abs(u) * 0.55);
    blobs.push(wob(ell(cx + u * w * 0.45, cy - r * 0.35 + (rng() - 0.3) * h * 0.35, r * (1 + rng() * 0.5), r, 22), rng() * 99 | 0, r * 0.06, 0.08, true));
  }
  const flat = wob(subdiv([[cx - w * 0.5, cy + h * 0.05], [cx + w * 0.5, cy + h * 0.05], [cx + w * 0.42, cy + h * 0.32], [cx - w * 0.46, cy + h * 0.3]], 8, true), o.seed ?? 11, h * 0.05, 0.03, true);
  const all = [...blobs, flat];
  const path = (dx, dy) => { c.beginPath(); for (const b of all) { c.moveTo(b[0][0] + dx, b[0][1] + dy); for (let i = 1; i < b.length; i++) c.lineTo(b[i][0] + dx, b[i][1] + dy); c.closePath(); } };
  path(0, 0); c.fillStyle = css(litCol || col); c.fill();
  c.save(); path(0, 0); c.clip();
  if (litCol) { const off = o.rimOff ?? h * 0.09; path(o.rimDx ?? -off * 0.4, off); c.fillStyle = css(mix(col, litCol, 0.35)); c.fill(); path((o.rimDx ?? -off * 0.4) * 1.6, off * 2.2); c.fillStyle = css(col); c.fill(); }
  else { path(0, 0); c.fillStyle = css(col); c.fill(); }
  brushwork(c, { x: cx - w * 0.6, y: cy - h * 1.2, w: w * 1.2, h: h * 1.7 }, col, { seed: (o.seed ?? 11) + 1, dens: 0.016, len: 30, wid: 8, alpha: 0.28, var: 0.2, ang: o.ang ?? -0.12, angVar: 0.6 });
  const g = c.createLinearGradient(0, cy - h * 0.6, 0, cy + h * 0.4); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, css(o.under || scl(col, 0.55), 0.6)); c.fillStyle = g; c.fillRect(cx - w, cy - h * 1.5, w * 2, h * 2.5);
  c.restore();
  return blobs;
}
// noise-driven painted cloud field: posterised light side (2–3 hard-ish tones) over soft cover
function paintClouds(c, x0, y0, w, h, o = {}) {
  x0 |= 0; y0 |= 0; w |= 0; h |= 0;
  const id = c.getImageData(x0, y0, w, h), d = id.data;
  const sc = o.scale ?? 170, st = o.stretch ?? 0.42, seed = o.seed ?? 1, th = o.th ?? 0.5, soft = o.soft ?? 0.05;
  const ox = (o.lx ?? 0.2) * (o.lw ?? 0.05), oy = (o.ly ?? -1) * (o.lw ?? 0.05);
  const cA = rgb(o.dark || '#0c111f'), cB = rgb(o.mid || '#1c2440'), cC = rgb(o.lit || '#3a4870'), al = o.alpha ?? 1;
  const f = (X, Y) => vn2(X, Y, seed) * 0.62 + vn2(X * 2.1, Y * 2.1, seed + 5) * 0.27 + vn2(X * 4.3, Y * 4.3, seed + 9) * 0.11;
  for (let j = 0; j < h; j++) {
    const v = j / h, prof = o.prof ? o.prof(v) : 0, Y = (y0 + j) / (sc * st);
    for (let i = 0; i < w; i++) {
      const X = (x0 + i) / sc + (o.shear ?? 0) * Y;
      const n = f(X, Y) + prof, cov = n <= th ? 0 : n >= th + soft ? 1 : ((n - th) / soft) ** 2 * (3 - 2 * (n - th) / soft);
      if (cov <= 0.001) continue;
      const n2 = f(X + ox / st * 0.5, Y + oy) + prof, lit = n - n2;
      const t1 = lit < (o.l1 ?? 0.008) ? 0 : lit > (o.l1 ?? 0.008) + 0.012 ? 1 : (lit - (o.l1 ?? 0.008)) / 0.012;
      const t2 = lit < (o.l2 ?? 0.03) ? 0 : lit > (o.l2 ?? 0.03) + 0.01 ? 1 : (lit - (o.l2 ?? 0.03)) / 0.01;
      const deep = clamp((n - th - 0.08) * 4) * (o.deep ?? 0.4);
      let r = lerp(cA[0], cB[0], t1), g = lerp(cA[1], cB[1], t1), b = lerp(cA[2], cB[2], t1);
      r = lerp(r, cC[0], t2); g = lerp(g, cC[1], t2); b = lerp(b, cC[2], t2);
      r *= 1 - deep; g *= 1 - deep; b *= 1 - deep * 0.7;
      if (o.tint) { const tt = o.tint(i + x0, j + y0); r = lerp(r, tt[0], tt[3]); g = lerp(g, tt[1], tt[3]); b = lerp(b, tt[2], tt[3]); }
      const k = (i + j * w) * 4, a = cov * al;
      if (o.alphaOut) { const a0 = d[k + 3] / 255, na = a + a0 * (1 - a); d[k] = (r * a + d[k] * a0 * (1 - a)) / na; d[k + 1] = (g * a + d[k + 1] * a0 * (1 - a)) / na; d[k + 2] = (b * a + d[k + 2] * a0 * (1 - a)) / na; d[k + 3] = na * 255; continue; }
      d[k] = lerp(d[k], r, a); d[k + 1] = lerp(d[k + 1], g, a); d[k + 2] = lerp(d[k + 2], b, a);
    }
  }
  c.putImageData(id, x0, y0);
  if (o.brush !== false) brushwork(c, { x: x0, y: y0, w, h }, o.mid || '#1c2440', { seed: seed + 3, dens: 0.006, len: 34, wid: 9, alpha: 0.16, var: 0.35, ang: o.ang ?? -0.12, angVar: 0.5 });
}
// paper / brush grain overlay applied once to each painted background
let _paperTex = null;
function paperTex() {
  if (_paperTex) return _paperTex;
  const t = mkCanvas(512, 512), c = t.getContext('2d'); const rng = mulberry(99);
  c.fillStyle = '#808080'; c.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 14000; i++) {
    const v = 128 + (rng() - 0.5) * 90 | 0;
    dab(c, rng() * 512, rng() * 512, (rng() - 0.5) * 0.6, 4 + rng() * 14, 1 + rng() * 2.5, `rgba(${v},${v},${v},0.35)`);
  }
  return (_paperTex = t);
}
function applyPaper(c, w, h, a = 0.18) {
  c.save(); c.globalCompositeOperation = 'overlay'; c.globalAlpha = a;
  const t = paperTex(); for (let y = 0; y < h; y += 512) for (let x = 0; x < w; x += 512) c.drawImage(t, x, y);
  c.restore();
}
// illegible painted sign glyphs (never real text)
function glyphs(c, x, y, w, h, col, seed, vertical = false, a = 1) {
  const rng = mulberry(seed); const n = Math.max(1, Math.round((vertical ? h / w : w / h) * 0.9));
  c.save(); c.strokeStyle = css(col, a); c.lineCap = 'round'; c.lineWidth = Math.max(0.8, Math.min(w, h) * 0.09);
  for (let k = 0; k < n; k++) {
    const gx = vertical ? x + w * 0.5 : x + (k + 0.5) * w / n, gy = vertical ? y + (k + 0.5) * h / n : y + h * 0.5;
    const s = (vertical ? w : h) * 0.36;
    const m = 2 + (rng() * 4 | 0);
    c.beginPath();
    for (let j = 0; j < m; j++) {
      const ax = gx + (rng() - 0.5) * 2 * s, ay = gy + (rng() - 0.5) * 2 * s;
      const hor = rng() < 0.5;
      c.moveTo(ax, ay); c.lineTo(hor ? ax + (rng() * 0.9 + 0.3) * s * (ax > gx ? -1 : 1) : ax + (rng() - 0.5) * s * 0.3, hor ? ay + (rng() - 0.5) * s * 0.3 : ay + (rng() * 0.9 + 0.3) * s * (ay > gy ? -1 : 1));
    }
    c.stroke();
  }
  c.restore();
}
