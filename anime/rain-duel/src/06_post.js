// ===================================================================
//  FILM — photographed-on-film finish: weave, grain, halation, dust
// ===================================================================
const FILM = { grain: [], small: null, sg: null };
function makeFilm() {
  for (let i = 0; i < 6; i++) {
    const c = mkCanvas(640, 360), g = c.getContext('2d'); const id = g.createImageData(640, 360), a = id.data;
    seed('grain', i);
    for (let p = 0; p < a.length; p += 4) { const v = 128 + (R() + R() + R() - 1.5) * 70; a[p] = a[p + 1] = a[p + 2] = v; a[p + 3] = 255; }
    g.putImageData(id, 0, 0); FILM.grain.push(c);
  }
  FILM.small = mkCanvas(160, 90); FILM.sg = FILM.small.getContext('2d');
}
// src: composed frame canvas; out: display ctx; fi: film frame index (24fps)
function filmFinish(src, out, fi, o = {}) {
  seed('film', fi);
  // gate weave: slow wander + tiny per-frame jitter
  const wx = vnoise(fi * .13, 1) * 1.6 + rnd(-.25, .25), wy = vnoise(fi * .11, 2) * 1.3 + rnd(-.25, .25);
  out.fillStyle = '#050407'; out.fillRect(0, 0, W, H);
  out.drawImage(src, -6 + wx, -4 + wy, W + 12, H + 8);
  // halation / bloom from bright areas
  const sg = FILM.sg;
  sg.filter = 'brightness(.85) contrast(3.2) blur(1.5px)'; sg.globalCompositeOperation = 'source-over';
  sg.drawImage(src, 0, 0, 160, 90); sg.filter = 'none';
  out.save(); out.globalCompositeOperation = 'screen'; out.globalAlpha = (o.bloom ?? .22); out.imageSmoothingQuality = 'high';
  out.drawImage(FILM.small, -10, -10, W + 20, H + 20);
  out.restore();
  // exposure flicker
  const fl = rnd(-.025, .025);
  if (fl > 0) { out.fillStyle = `rgba(255,248,235,${fl * .6})`; out.globalCompositeOperation = 'screen'; out.fillRect(0, 0, W, H); }
  else { out.fillStyle = `rgba(0,0,0,${-fl})`; out.globalCompositeOperation = 'source-over'; out.fillRect(0, 0, W, H); }
  // grain
  out.globalCompositeOperation = 'overlay'; out.globalAlpha = o.grain ?? .2;
  const gi = FILM.grain[fi % 6]; const gx = -rnd(0, 300), gy = -rnd(0, 160);
  out.drawImage(gi, gx, gy, 1280 * 1.25, 720 * 1.25);
  out.globalAlpha = 1;
  // lifted blacks + slight warm print tone
  out.globalCompositeOperation = 'lighten'; out.fillStyle = '#110f17'; out.fillRect(0, 0, W, H);
  out.globalCompositeOperation = 'soft-light'; out.fillStyle = 'rgba(255,214,170,.10)'; out.fillRect(0, 0, W, H);
  out.globalCompositeOperation = 'source-over';
  // vignette
  const vg = out.createRadialGradient(W / 2, H / 2, H * .45, W / 2, H / 2, H * .98);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.42)');
  out.fillStyle = vg; out.fillRect(0, 0, W, H);
  // dust & hair
  const nd = rndi(0, 4);
  for (let i = 0; i < nd; i++) {
    const x = rnd(0, W), y = rnd(0, H), r = rnd(.6, 2.4);
    out.fillStyle = R() < .7 ? 'rgba(10,8,8,.55)' : 'rgba(240,235,225,.35)';
    out.beginPath(); out.ellipse(x, y, r, r * rnd(.5, 1), rnd(0, 3), 0, TAU); out.fill();
  }
  if (R() < .06) { const x = rnd(0, W), y = rnd(0, H); out.strokeStyle = 'rgba(15,10,10,.45)'; out.lineWidth = .8; out.beginPath(); out.moveTo(x, y); out.bezierCurveTo(x + rnd(-30, 30), y + rnd(-30, 30), x + rnd(-30, 30), y + rnd(-30, 30), x + rnd(-40, 40), y + rnd(-40, 40)); out.stroke(); }
  if (R() < .04) { const x = rnd(0, W); out.fillStyle = 'rgba(230,225,215,.08)'; out.fillRect(x, 0, 1, H); }
  if (o.fade != null) { out.fillStyle = `rgba(0,0,0,${o.fade})`; out.fillRect(0, 0, W, H); }
}
