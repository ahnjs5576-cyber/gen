// ───────────────────────── painted town elements (night) ─────────────────────────
const NIGHT = {
  walls: ['#1d2334', '#232838', '#262536', '#1c2230', '#2a2736', '#202a36', '#2b2a33'],
  wood: ['#241f27', '#2a2228', '#211d24'], roof: ['#141a28', '#171c2a', '#121726', '#1a1d2b'],
  tileHi: '#46647e', winD: '#0b101c', winL: ['#ffcc78', '#ffb862', '#ffd894', '#f4e4b0'], winC: '#bfe6ff',
  shutter: '#2d3341', pole: '#2a2c33', poleHi: '#58606e',
};
function tileRoof(c, x0, x1, yTop, yBot, rng, o = {}) {
  const inset = o.inset ?? 10, col = rgb(o.col || NIGHT.roof[rng() * 4 | 0]);
  const P = [[x0 - 6, yBot], [x0 + inset, yTop], [x1 - inset, yTop], [x1 + 6, yBot]];
  paintPoly(c, P, col, { seed: rng() * 1e4 | 0, dens: 0.03, len: 10, wid: 3, alpha: 0.4, var: 0.15, ang: 0, angVar: 0.15 });
  // tile rows: scallops with wet highlight on the upper edge
  const rows = Math.max(2, Math.round((yBot - yTop) / 5.5));
  for (let i = 1; i <= rows; i++) {
    const y = lerp(yTop, yBot, i / rows), t = i / rows, xa = lerp(x0 + inset, x0 - 6, t), xb = lerp(x1 - inset, x1 + 6, t);
    c.strokeStyle = css(scl(col, 0.55), 0.9); c.lineWidth = 1.2; c.beginPath();
    for (let x = xa; x < xb; x += 5) { c.moveTo(x, y); c.quadraticCurveTo(x + 2.5, y + 1.8, x + 5, y); }
    c.stroke();
    c.strokeStyle = css(o.hi || NIGHT.tileHi, 0.22 + rng() * 0.18); c.lineWidth = 0.8; c.beginPath(); c.moveTo(xa, y - 1.4); c.lineTo(xb, y - 1.4); c.stroke();
  }
  // vertical tile courses
  c.strokeStyle = css(scl(col, 0.7), 0.5); c.lineWidth = 0.7; c.beginPath();
  for (let x = x0; x < x1; x += 5) { c.moveTo(lerp(x, x0 + (x - x0) * 0.98, 0) + inset * 0, yTop + 1); c.lineTo(x + (x - (x0 + x1) / 2) * 0.05, yBot); }
  c.stroke();
  // ridge cap + end ornaments
  paintRect(c, x0 + inset - 3, yTop - 4, x1 - x0 - 2 * inset + 6, 5, scl(col, 0.8), { dens: 0.05, len: 8, wid: 2 });
  bline(c, [[x0 + inset - 3, yTop - 4.2], [x1 - inset + 3, yTop - 4.2]], 1, o.hi || NIGHT.tileHi, 0.6);
  for (const ex of [x0 + inset - 4, x1 - inset + 4]) { c.fillStyle = css(scl(col, 0.7)); c.beginPath(); c.ellipse(ex, yTop - 4, 3.5, 4.5, 0, 0, TAU); c.fill(); }
  bline(c, [[x0 - 6, yBot], [x1 + 6, yBot]], 1.6, scl(col, 0.4), 0.9);
  return P;
}
function windowPainted(c, x, y, w, h, lit, rng, o = {}) {
  const fr = o.frame || '#3a3a44';
  paintRect(c, x - 1.5, y - 1.5, w + 3, h + 3, fr, { strokes: 0, wob: 0.5 });
  if (lit) {
    const col = o.col || NIGHT.winL[rng() * 4 | 0];
    paintRect(c, x, y, w, h, col, { dens: 0.05, len: 6, wid: 2, var: 0.08, alpha: 0.4, wob: 0.4 });
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    air(c, x + w * 0.5, y + h * 0.3, Math.max(w, h) * 0.8, '#fff3d0', 0.5);
    if (o.shoji !== false) { c.strokeStyle = css(scl(col, 0.45), 0.8); c.lineWidth = 0.8; c.beginPath(); for (let gx = x + w / 3; gx < x + w - 1; gx += w / 3) { c.moveTo(gx, y); c.lineTo(gx, y + h); } for (let gy = y + h / 4; gy < y + h - 1; gy += h / 4) { c.moveTo(x, gy); c.lineTo(x + w, gy); } c.stroke(); }
    if (o.curtain) { c.fillStyle = css(scl(col, 0.6), 0.7); c.fillRect(x, y, w * 0.3, h); }
    c.restore();
  } else {
    paintRect(c, x, y, w, h, NIGHT.winD, { dens: 0.03, len: 6, wid: 2, var: 0.3, alpha: 0.5, wob: 0.4 });
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    c.strokeStyle = css('#5a7a96', 0.25); c.lineWidth = 2; c.beginPath(); c.moveTo(x + w * 0.2, y + h); c.lineTo(x + w * 0.7, y); c.stroke();
    c.strokeStyle = css('#2a3446', 0.9); c.lineWidth = 0.8; c.beginPath(); c.moveTo(x + w / 2, y); c.lineTo(x + w / 2, y + h); c.stroke();
    c.restore();
  }
}
function litSpill(c, x, y, r, col, a = 0.35) { c.save(); c.globalCompositeOperation = 'lighter'; air(c, x, y, r, col, a); c.restore(); }
function antenna(c, x, y, h, rng) {
  bline(c, [[x, y], [x, y - h]], 1, '#3a4050', 1);
  for (let k = 0; k < 5; k++) { const yy = y - h + 3 + k * 3, ww = 8 - k; bline(c, [[x - ww, yy], [x + ww, yy + (rng() - 0.5)]], 0.7, '#3a4050', 0.9); }
  bline(c, [[x, y - h * 0.4], [x + h * 0.7, y + 2]], 0.4, '#2a303c', 0.7);
}
function acUnit(c, x, y, s) {
  paintRect(c, x, y, 16 * s, 11 * s, '#3c404a', { dens: 0.05, len: 4, wid: 1.5 });
  c.strokeStyle = css('#22252c'); c.lineWidth = 1; c.beginPath(); c.arc(x + 10 * s, y + 5.5 * s, 3.8 * s, 0, TAU); c.stroke();
  bline(c, [[x, y], [x + 16 * s, y]], 0.8, '#6a7484', 0.6);
}
function house(c, x, base, w, h, rng, o = {}) {
  const wall = rgb(o.wall || NIGHT.walls[rng() * NIGHT.walls.length | 0]);
  const top = base - h;
  paintRect(c, x, top, w, h, wall, { seed: rng() * 1e4 | 0, dens: 0.022, ang: Math.PI / 2, angVar: 0.12, len: 18, wid: 3, alpha: 0.35, var: 0.12 });
  // clapboard / boards
  c.strokeStyle = css(scl(wall, 0.65), 0.6); c.lineWidth = 0.7; c.beginPath();
  if (o.boards === 'h') for (let y = top + 4; y < base; y += 4.5) { c.moveTo(x, y); c.lineTo(x + w, y + (rng() - 0.5)); }
  else for (let xx = x + 5; xx < x + w; xx += 5 + rng() * 2) { c.moveTo(xx, top); c.lineTo(xx + (rng() - 0.5), base); }
  c.stroke();
  // grime gradient at base
  washPoly(c, [[x, top], [x + w, top], [x + w, base], [x, base]], 0, base - h * 0.4, 0, base, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(4,6,12,0.55)']]);
  const floors = o.floors || 2, fh = h / floors;
  for (let f = 0; f < floors; f++) {
    const fy = top + f * fh;
    const nw = Math.max(1, Math.floor(w / 34));
    for (let k = 0; k < nw; k++) {
      if (rng() < 0.15) continue;
      const ww = Math.min(26, w / nw - 10), wx = x + (k + 0.5) * w / nw - ww / 2, wy = fy + fh * 0.22, wh = fh * 0.45;
      const lit = rng() < (o.litP ?? 0.18);
      windowPainted(c, wx, wy, ww, wh, lit, rng, { curtain: rng() < 0.4 });
      if (lit) litSpill(c, wx + ww / 2, wy + wh / 2, ww * 1.6, '#ffb860', 0.18);
      if (rng() < 0.3) { bline(c, [[wx - 3, wy + wh + 3], [wx + ww + 3, wy + wh + 3]], 1.4, '#3e4250', 0.9); for (let bx = wx - 2; bx < wx + ww + 3; bx += 3) bline(c, [[bx, wy + wh + 3], [bx, wy + wh + 9]], 0.6, '#3e4250', 0.8); }
    }
    if (f > 0) { // eave between floors
      const ey = fy + 2;
      tileRoof(c, x - 2, x + w + 2, ey - 6, ey + 2, rng, { inset: 0 });
    }
  }
  if (o.roof !== 'flat') tileRoof(c, x - 4, x + w + 4, top - (o.roofH ?? 16), top + 2, rng, { inset: o.inset ?? 12 });
  else { paintRect(c, x - 2, top - 4, w + 4, 5, '#30343e', { dens: 0.04 }); bline(c, [[x - 2, top - 4.5], [x + w + 2, top - 4.5]], 1, '#5c6878', 0.7); }
  if (o.antenna) antenna(c, x + w * (0.3 + rng() * 0.4), top - (o.roofH ?? 16) - 2, 22 + rng() * 14, rng);
  if (o.ac) acUnit(c, x + w - 24, top + fh * 0.75, 0.9);
  if (o.pipe) { bline(c, [[x + 4, top + 4], [x + 4, base]], 2, '#3a3e48', 0.9); bline(c, [[x + 3.3, top + 4], [x + 3.3, base]], 0.6, '#6a7686', 0.6); }
  // wet highlight down one edge
  bline(c, [[x + w - 0.5, top + 2], [x + w - 0.5, base]], 1, '#4c6680', 0.35);
}
function shop(c, x, base, w, h, rng, o = {}) {
  house(c, x, base - h * 0.42, w, h * 0.58, rng, { ...o, floors: 1 });
  const sy = base - h * 0.42;
  paintRect(c, x, sy, w, h * 0.42, '#1b1f2a', { dens: 0.02 });
  // shutter
  const shx = x + 4, shw = w - 8, shy = sy + h * 0.1, shh = h * 0.32;
  paintRect(c, shx, shy, shw, shh, NIGHT.shutter, { dens: 0.03, len: 20, wid: 2, ang: 0, angVar: 0.05, var: 0.12 });
  c.strokeStyle = css('#171b24', 0.9); c.lineWidth = 0.9; c.beginPath(); for (let y = shy + 2; y < shy + shh; y += 3) { c.moveTo(shx, y); c.lineTo(shx + shw, y); } c.stroke();
  c.strokeStyle = css('#56627a', 0.35); c.lineWidth = 0.6; c.beginPath(); for (let y = shy + 3; y < shy + shh; y += 3) { c.moveTo(shx, y); c.lineTo(shx + shw, y); } c.stroke();
  for (let k = 0; k < 3; k++) { const gx = shx + rng() * shw; c.fillStyle = css('#0e1118', 0.4); c.fillRect(gx, shy + rng() * shh * 0.4, 2 + rng() * 6, shh * 0.6); } // graffiti-free grime
  paintRect(c, shx - 2, shy - 4, shw + 4, 4, '#3a3f4c', { strokes: 0 });
  // sign board with illegible glyphs
  const sc = o.sign || ['#6e2a2a', '#25406e', '#7a6a26', '#2c5a44'][rng() * 4 | 0];
  paintRect(c, x + 2, sy - 2, w - 4, h * 0.1, sc, { dens: 0.04, len: 8, wid: 2, alpha: 0.3 });
  glyphs(c, x + 8, sy - 1, w - 16, h * 0.08, '#e8e0c8', rng() * 1e4 | 0, false, 0.75);
  bline(c, [[x + 2, sy - 2], [x + w - 2, sy - 2]], 1, '#9aa0b0', 0.3);
  if (o.vsign) { const vx = x + w - 12; paintRect(c, vx, sy - h * 0.45, 10, h * 0.38, o.vsignCol || '#d8d0b0', { dens: 0.05, len: 5, wid: 1.5 }); glyphs(c, vx + 1, sy - h * 0.44, 8, h * 0.36, '#2a2020', rng() * 1e4 | 0, true, 0.85); }
}
function apt(c, x, base, w, h, rng, o = {}) {
  const wall = rgb(o.wall || '#262a36');
  paintRect(c, x, base - h, w, h, wall, { seed: rng() * 1e4 | 0, dens: 0.02, len: 22, wid: 4, ang: Math.PI / 2, angVar: 0.2, var: 0.14 });
  // rain stains
  for (let k = 0; k < 14; k++) { const sx = x + rng() * w, sy = base - h + rng() * h * 0.5; c.fillStyle = css('#0b0e16', 0.25); c.beginPath(); c.moveTo(sx - 1.5, sy); c.lineTo(sx + 1.5, sy); c.lineTo(sx + 0.4, sy + 20 + rng() * 60); c.closePath(); c.fill(); }
  const floors = o.floors || 3, fh = h / floors;
  for (let f = 0; f < floors; f++) {
    const fy = base - h + f * fh;
    bline(c, [[x - 2, fy + fh - 2], [x + w + 2, fy + fh - 2]], 2.2, '#3a3e4c', 0.9);
    for (let k = 0; k < Math.floor(w / 30); k++) {
      const wx = x + 6 + k * 30, lit = rng() < 0.2;
      windowPainted(c, wx, fy + fh * 0.25, 20, fh * 0.48, lit, rng, { shoji: false, curtain: true, col: lit && rng() < 0.4 ? NIGHT.winC : undefined });
      if (lit) litSpill(c, wx + 10, fy + fh * 0.5, 30, '#ffc070', 0.15);
      // railing
      c.strokeStyle = css('#4a5060', 0.8); c.lineWidth = 0.8; c.beginPath(); c.moveTo(wx - 3, fy + fh * 0.78); c.lineTo(wx + 23, fy + fh * 0.78); for (let rx = wx - 3; rx <= wx + 23; rx += 3.5) { c.moveTo(rx, fy + fh * 0.78); c.lineTo(rx, fy + fh * 0.95); } c.stroke();
    }
  }
  paintRect(c, x - 3, base - h - 5, w + 6, 6, '#323644', { dens: 0.04 });
  if (o.tank) { const tx = x + w * 0.6; paintRect(c, tx, base - h - 26, 22, 18, '#3c4250', { dens: 0.05, len: 5, wid: 1.5 }); bline(c, [[tx, base - h - 26], [tx + 22, base - h - 26]], 1, '#7a8698', 0.5); for (const lx of [tx + 3, tx + 19]) bline(c, [[lx, base - h - 8], [lx, base - h - 4]], 1.5, '#2a2e38', 1); }
  bline(c, [[x + w - 0.5, base - h], [x + w - 0.5, base]], 1.2, '#4a6478', 0.35);
}
function utilityPole(c, x, base, top, rng, o = {}) {
  const w0 = o.w ?? 7, w1 = w0 * 0.7;
  paintPoly(c, [[x - w0 / 2, base], [x + w0 / 2, base], [x + w1 / 2, top], [x - w1 / 2, top]], NIGHT.pole, { dens: 0.05, ang: Math.PI / 2, angVar: 0.1, len: 12, wid: 2, wob: 0.4 });
  bline(c, [[x - w1 / 2 + 1, top], [x - w0 / 2 + 1, base]], 1, NIGHT.poleHi, 0.5);
  for (let k = 0; k < 12; k++) bline(c, [[x - w1 / 2, top + 30 + k * 10], [x - w1 / 2 - 2, top + 30 + k * 10]], 1, '#1a1c22', 0.8);
  const arms = [];
  for (let k = 0; k < (o.arms ?? 2); k++) {
    const ay = top + 8 + k * 16, aw = 26 - k * 4;
    paintRect(c, x - aw, ay, aw * 2, 3, '#24262c', { strokes: 0, wob: 0.3 });
    for (const ix of [-aw + 3, -aw / 2, aw / 2, aw - 3]) { paintRect(c, x + ix - 1.5, ay - 4, 3, 4, '#5a5a5a', { strokes: 0, wob: 0 }); arms.push([x + ix, ay - 4]); }
  }
  if (o.trans) { const tx = x + w0; paintRect(c, tx, top + 46, 13, 22, '#3a3e46', { dens: 0.05, len: 5 }); bline(c, [[tx + 1, top + 46], [tx + 1, top + 68]], 1, '#6c7686', 0.5); bline(c, [[tx + 6, top + 46], [x, top + 26]], 0.8, '#1a1c22', 0.8); }
  if (o.sign) { paintRect(c, x - 5, top + 110, 10, 34, '#c8c0a0', { dens: 0.05, len: 4, wid: 1 }); glyphs(c, x - 4, top + 112, 8, 30, '#2a2a2a', rng() * 1e4 | 0, true, 0.8); }
  return arms;
}
function wires(c, pts, rng, n, o = {}) { // tangle of wires between attachment points
  for (let k = 0; k < n; k++) {
    const a = pts[k % pts.length], b = o.to ? o.to[(k * 7 + 3) % o.to.length] : pts[(k * 3 + 1) % pts.length];
    if (!a || !b || a === b) continue;
    const d = Math.abs(b[0] - a[0]);
    bline(c, sag(a[0], a[1], b[0], b[1], d * (0.04 + rng() * 0.06) + 4, 28), o.w ?? (0.8 + rng() * 0.8), o.col || '#06080e', 0.9, k);
    if (o.hi) bline(c, sag(a[0], a[1] - 0.6, b[0], b[1] - 0.6, d * 0.05 + 4, 28), 0.5, o.hi, 0.18);
  }
}
function weeds(c, x0, x1, base, hmax, rng, o = {}) {
  const n = Math.floor((x1 - x0) * (o.dens ?? 0.6));
  for (let i = 0; i < n; i++) {
    const x = x0 + rng() * (x1 - x0), h = hmax * (0.3 + rng() * 0.7) * Math.sin(Math.PI * (x - x0) / (x1 - x0)) ** 0.4;
    const lean = (rng() - 0.5) * 0.9, col = mix(o.col || '#0d1712', o.col2 || '#1d2c22', rng());
    c.beginPath(); c.moveTo(x - 1.5, base); c.quadraticCurveTo(x + lean * h * 0.4, base - h * 0.6, x + lean * h, base - h); c.quadraticCurveTo(x + lean * h * 0.3 + 1, base - h * 0.5, x + 1.5, base); c.fillStyle = css(col); c.fill();
    if (rng() < (o.hiP ?? 0.25)) bline(c, qb([x, base - h * 0.2], [x + lean * h * 0.4, base - h * 0.65], [x + lean * h, base - h]), 0.6, o.hi || '#5a8aa0', 0.35);
    if (o.seedHeads && rng() < 0.08) { c.fillStyle = css('#3a4030'); c.beginPath(); c.ellipse(x + lean * h, base - h - 3, 1.5, 4, lean, 0, TAU); c.fill(); }
  }
}
// rooftops seen from above, receding rows; optional second ctx m receives the moonlit highlights
function roofscape(c, m, x0, x1, yFar, yNear, rng, o = {}) {
  const rows = o.rows ?? 14, fog = rgb(o.fog || '#1c2442');
  for (let r = 0; r < rows; r++) {
    const u = r / (rows - 1), y = lerp(yFar, yNear, u ** 1.35), sc = lerp(o.s0 ?? 0.22, o.s1 ?? 1, u), fk = (1 - u) * 0.55;
    const F = (col) => mix(col, fog, fk);
    if (o.street && r % 5 === 3) { // a street with sodium lamps
      const sk = (rng() - 0.5) * 30 * sc;
      for (let x = x0 + rng() * 40 * sc; x < x1; x += (50 + rng() * 60) * sc) { const yy = y + sk * (x - x0) / (x1 - x0); litSpill(c, x, yy + 2 * sc, 18 * sc, '#ff9a3a', 0.45); c.fillStyle = css('#ffd890', 0.95); c.fillRect(x - 0.8, yy - 1, 1.4 + sc, 1.4 + sc); if (m) litSpill(m, x, yy, 4, '#ffd890', 0.1); }
      continue;
    }
    let x = x0 - rng() * 60 * sc;
    while (x < x1) {
      const w = (30 + rng() * 70) * sc, h = (12 + rng() * 20) * sc, wall = (7 + rng() * 10) * sc, type = rng(), yy = y + (rng() - 0.5) * 9 * sc, skew = (rng() - 0.5) * 8 * sc;
      const col = F(scl(NIGHT.roof[rng() * 4 | 0], 0.95 + rng() * 0.2)), back = F(mix(col, '#34506c', 0.22 + rng() * 0.12));
      if (type < 0.1) { // tree clump
        for (let k = 0; k < 5; k++) { const bx = x + rng() * w, by = yy - rng() * h; c.fillStyle = css(F(mix('#0a120e', '#16221c', rng()))); c.beginPath(); c.ellipse(bx, by, (8 + rng() * 10) * sc, (6 + rng() * 7) * sc, 0, 0, TAU); c.fill(); }
        if (m) bline(m, [[x + w * 0.2, yy - h * 0.8], [x + w * 0.7, yy - h]], 0.8, '#ffd27a', 0.4);
      } else if (type < 0.2) { // flat roof block with a water tank
        paintRect(c, x, yy - h * 0.6, w, h * 0.6 + wall, F(mix('#1e2232', '#262a3a', rng())), { dens: 0.04, len: 6 * sc + 2, wid: 2, wob: 0.4 });
        paintRect(c, x - 1, yy - h * 0.6 - 2 * sc, w + 2, 3 * sc, F('#2a3040'), { strokes: 0, wob: 0.3 });
        if (rng() < 0.6) paintRect(c, x + w * 0.6, yy - h * 0.6 - 9 * sc, 8 * sc, 7 * sc, F('#2a3040'), { strokes: 0, wob: 0.3 });
        if (rng() < 0.4) { c.fillStyle = css(NIGHT.winL[rng() * 4 | 0], 0.9); c.fillRect(x + w * 0.3, yy + wall * 0.2, 4 * sc + 1, wall * 0.4); }
        if (m) bline(m, [[x, yy - h * 0.6 - 2 * sc], [x + w, yy - h * 0.6 - 2 * sc]], 0.8, '#ffd27a', 0.6);
      } else if (type < 0.38) { // gable end toward us: wall + triangle
        const wl = F(mix(NIGHT.walls[rng() * 7 | 0], '#000', 0.15));
        paintPoly(c, [[x, yy - h * 0.2], [x + w * 0.5, yy - h * 1.05], [x + w, yy - h * 0.2], [x + w, yy + wall], [x, yy + wall]], wl, { dens: 0.05, len: 5, wid: 1.5, wob: 0.4 });
        paintPoly(c, [[x - 2 * sc, yy - h * 0.15], [x + w * 0.5, yy - h * 1.1], [x + w * 0.5 + 3 * sc, yy - h * 1.05], [x + 2 * sc, yy - h * 0.1]], col, { strokes: 0, wob: 0.3 });
        paintPoly(c, [[x + w + 2 * sc, yy - h * 0.15], [x + w * 0.5, yy - h * 1.1], [x + w * 0.5 - 3 * sc, yy - h * 1.05], [x + w - 2 * sc, yy - h * 0.1]], back, { strokes: 0, wob: 0.3 });
        if (rng() < (o.litP ?? 0.25)) { const wx = x + w * 0.35; c.fillStyle = css(NIGHT.winL[rng() * 4 | 0]); c.fillRect(wx, yy - h * 0.1, w * 0.3, wall * 0.6 + h * 0.2); litSpill(c, wx + w * 0.15, yy, 14 * sc, '#ffb860', 0.25); }
        if (m) bline(m, [[x + w * 0.5, yy - h * 1.1], [x + w + 2 * sc, yy - h * 0.15]], 1.1, '#ffd27a', 0.8);
      } else { // long side: back plane catches the sky, front plane dark
        paintRect(c, x + 2 * sc, yy, w - 4 * sc, wall, F(mix(NIGHT.walls[rng() * 7 | 0], '#000', 0.25)), { dens: 0.05, len: 5, wid: 1.5, wob: 0.3 });
        if (rng() < (o.litP ?? 0.25)) { const wx = x + w * (0.2 + rng() * 0.5); c.fillStyle = css(NIGHT.winL[rng() * 4 | 0]); c.fillRect(wx, yy + wall * 0.25, 5 * sc + 1, wall * 0.45); litSpill(c, wx + 3 * sc, yy + wall * 0.5, 12 * sc, '#ffb860', 0.25); }
        const ri = type < 0.7 ? w * 0.16 : 2 * sc;
        const bk = [[x + ri + skew, yy - h], [x + w - ri + skew, yy - h], [x + w + 2 * sc, yy - h * 0.5], [x - 2 * sc, yy - h * 0.5]];
        const fr = [[x - 2 * sc, yy - h * 0.5], [x + w + 2 * sc, yy - h * 0.5], [x + w + 3 * sc, yy + 1], [x - 3 * sc, yy + 1]];
        paintPoly(c, bk, back, { dens: 0.05, len: 6 * sc + 2, wid: 1.5, var: 0.15, wob: 0.35 });
        paintPoly(c, fr, col, { dens: 0.05, len: 6 * sc + 2, wid: 1.5, var: 0.15, wob: 0.35 });
        if (sc > 0.45) { c.strokeStyle = css(scl(col, 0.6), 0.6); c.lineWidth = 0.6; c.beginPath(); for (let k = 1; k < 3; k++) { const ly = lerp(yy - h * 0.5, yy, k / 3); c.moveTo(x - 2 * sc, ly); c.lineTo(x + w + 2 * sc, ly); } c.stroke(); }
        bline(c, [[x + ri + skew, yy - h], [x + w - ri + skew, yy - h]], 0.8, F('#4a6888'), 0.5);
        if (m) { bline(m, [[x + ri + skew, yy - h], [x + w - ri + skew, yy - h]], 1.1, '#ffd27a', 0.8); const g = m.globalAlpha; m.globalAlpha = 0.18; paintPoly(m, bk, '#c89a50', { strokes: 0, wob: 0.3 }); m.globalAlpha = g; }
        if (rng() < 0.15) antenna(c, x + w * 0.5, yy - h, 10 * sc + 4, rng);
      }
      x += w + (rng() < 0.2 ? 12 + rng() * 30 : 1 + rng() * 6) * sc;
    }
  }
}
