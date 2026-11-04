// ===================================================================
//  TIMELINE helpers — exposure sheet logic
// ===================================================================
// night colour model: deeper, bluer
LM.night = { mul: [.4, .44, .67], add: [5, 7, 20], sh: .66, hl: '#56689a', lc: '#140e1a' };
LM.moon = { mul: [.52, .58, .8], add: [10, 12, 26], sh: .7, hl: '#7d8cc0', lc: '#161222' };
const SHOTS = [];
function shot(t0, t1, name, draw) { SHOTS.push({ t0, t1, name, draw }); }
function shotAt(t) { for (const s of SHOTS) if (t >= s.t0 && t < s.t1) return s; return SHOTS[SHOTS.length - 1]; }
const FLASH_T = [4.6, 13.55, 35.0, 50.9];
function flashAt(t) {
  let v = 0;
  for (const te of FLASH_T) {
    const d = t - te; if (d < 0 || d > .7) continue;
    v = Math.max(v, d < .084 ? 1 : d < .125 ? .1 : d < .21 ? .85 : Math.max(0, .7 * (1 - (d - .21) / .45)));
  }
  return v;
}
// keys: [[t, value, moveDur, easeName]] — holds a key, then moves into the next one during its moveDur
const EZ = { io: easeIO, o: easeOut, i: easeIn, l: t => t };
function seq(lt, keys) {
  let j = 0; for (let i = 0; i < keys.length; i++) if (keys[i][0] <= lt) j = i;
  const a = keys[j], b = keys[j + 1];
  if (b && b[2] && lt >= b[0] - b[2]) {
    const u = clamp((lt - (b[0] - b[2])) / b[2], 0, 1), e = EZ[b[3] || 'io'](u);
    return typeof a[1] === 'number' ? { v: lerp(a[1], b[1], e), id: 'm' + j + '_' + Math.round(u * 12) } : { v: lerpPose(a[1], b[1], e), id: 'm' + j + '_' + Math.round(u * 12) };
  }
  if (lt < keys[0][0]) return { v: keys[0][1], id: 'k0' };
  return { v: a[1], id: 'k' + j };
}
const sv = (lt, keys) => seq(lt, keys).v;
// screen position of a joint for a pose placed with o {x,y,s,f}
function jpos(p, o, path) {
  const J = fk(p); let q = J; for (const k of path.split('.')) q = q[k];
  return [o.x + (o.f || 1) * q[0] * o.s, o.y + q[1] * o.s];
}
// head-local point to screen (matches drawHead projection)
function headPt(o, x, y) { const T = o.tilt || 0, c = Math.cos(T), s = Math.sin(T); return [o.x + (o.f || 1) * (x * c - y * s) * o.r, o.y + (x * s + y * c) * o.r]; }
// temp canvas for reflections and silhouettes
const TMP = mkCanvas(W, H), TX = TMP.getContext('2d');
function reflectDraw(ctx, groundY, fn, al = .22) {
  TX.setTransform(1, 0, 0, 1, 0, 0); TX.clearRect(0, 0, W, H); fn(TX);
  ctx.save(); ctx.globalAlpha = al; ctx.translate(0, groundY * 2 + 4); ctx.scale(1, -.85);
  ctx.drawImage(TMP, 0, groundY * .15); ctx.restore();
}
function bg(ctx, img, x, y, s = 1, fl = 0) {
  if (fl > .02) ctx.filter = `brightness(${1 + fl * .75}) saturate(${1 - fl * .3})`;
  ctx.drawImage(img, -x, -y, img.width * s, img.height * s);
  ctx.filter = 'none';
}
function flashRim(fl, d = [.7, -.7]) { return fl > .4 ? { d, c: '#e8eeff', lc: '#b8c8ff', k: 3.5 } : null; }
function lmFor(fl, base = 'night') { return fl > .4 ? 'flash' : base; }
// falling drips (from hair tips / chin): drawn drops cycling
function drips(ctx, pts, lt, sc, sd) {
  pts.forEach((p, i) => {
    seed('drip', sd, i);
    const per = rnd(.6, 1.1), off = rnd(0, per); const u = ((lt + off) % per) / per;
    const k = Math.floor(u * 6) / 6; // on twos-ish
    const y = p[1] + k * k * 260 * sc, x = p[0] + k * 20 * sc;
    const r = 3.2 * sc;
    if (k < .12) { const d = spline([[p[0], p[1] - r * .5], [p[0] + r * .9, p[1] + r * k * 8], [p[0], p[1] + r * (1 + k * 8)], [p[0] - r * .9, p[1] + r * k * 8]], true, 1.5); cel(ctx, d, { f: '#b9c6e6', lw: 1, lc: '#3a4466' }); }
    else { const d = spline([[x, y - r * 2.2, 1], [x + r, y], [x, y + r], [x - r, y]], true, 1.5); cel(ctx, d, { f: '#b9c6e6', bands: [{ c: '#7f8db8', off: [-r * .4, -r * .4] }], lw: 1, lc: '#3a4466' }); }
  });
}
// rain running down a surface (on the face): small streak lines
function wetStreaks(ctx, x, y, w, h, lt, sd) {
  seed('wet', sd, Math.floor(lt * 6));
  for (let i = 0; i < 4; i++) { const px = x + rnd(0, w), py = y + rnd(0, h); ink(ctx, [[px, py], [px + rnd(-2, 2), py + rnd(12, 30)]], { w: 1.4, c: '#c8d2ee', a: .5 }); }
}
