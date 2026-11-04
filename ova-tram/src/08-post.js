// ───────────────────────── film transfer: halation, grain, gate weave, grade ─────────────────────────
const POST = (() => {
  const hal = mkCanvas(240, 180), hc = hal.getContext('2d', { willReadFrequently: true });
  const hal2 = mkCanvas(96, 72), h2 = hal2.getContext('2d');
  const grains = [];
  for (let k = 0; k < 6; k++) {
    const g = mkCanvas(320, 240), gc = g.getContext('2d'), id = gc.createImageData(320, 240), rng = mulberry(500 + k);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + ((rng() + rng() + rng() - 1.5) * 120) | 0; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    gc.putImageData(id, 0, 0); grains.push(g);
  }
  const vig = mkCanvas(W, H), vc = vig.getContext('2d');
  const vg = vc.createRadialGradient(W / 2, H * 0.48, H * 0.32, W / 2, H / 2, H * 0.92);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(0.7, 'rgba(4,4,10,0.22)'); vg.addColorStop(1, 'rgba(0,0,6,0.62)'); vc.fillStyle = vg; vc.fillRect(0, 0, W, H);
  function apply(S, O, frame, o = {}) {
    const c = O.getContext('2d');
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    // gate weave – slow drift plus a tiny per-frame jitter
    const wx = (vn(frame * 0.045, 11) - 0.5) * 1.1 + (h1(frame * 1.3) - 0.5) * 0.35;
    const wy = (vn(frame * 0.038, 23) - 0.5) * 1.4 + (h1(frame * 2.1 + 4) - 0.5) * 0.4;
    const z = 1.008; c.setTransform(z, 0, 0, z, -W * (z - 1) / 2 + wx, -H * (z - 1) / 2 + wy);
    c.drawImage(S, 0, 0);
    c.setTransform(1, 0, 0, 1, 0, 0);
    // halation: threshold a small copy, blur by downscale, screen it back
    hc.globalCompositeOperation = 'source-over'; hc.drawImage(S, 0, 0, 240, 180);
    const id = hc.getImageData(0, 0, 240, 180), d = id.data, th = o.th ?? 150;
    for (let i = 0; i < d.length; i += 4) { const l = Math.max(d[i], d[i + 1], d[i + 2]); const k = l > th ? (l - th) / (255 - th) : 0; d[i] = d[i] * k * 1.1; d[i + 1] = d[i + 1] * k * 0.92; d[i + 2] = d[i + 2] * k * 0.8; }
    hc.putImageData(id, 0, 0); h2.clearRect(0, 0, 96, 72); h2.drawImage(hal, 0, 0, 96, 72);
    c.globalCompositeOperation = 'screen'; c.globalAlpha = o.hal ?? 0.75;
    c.drawImage(hal2, -8, -6, W + 16, H + 12); c.globalAlpha = (o.hal ?? 0.75) * 0.6; c.drawImage(hal, 0, 0, W, H);
    // film base: lifted, slightly teal blacks; warm highlights
    c.globalAlpha = 1; c.fillStyle = '#0b0e15'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'soft-light'; c.fillStyle = 'rgba(255,214,170,0.10)'; c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = 'source-over'; c.drawImage(vig, 0, 0);
    // grain (changes every frame, low amplitude)
    c.globalCompositeOperation = 'overlay'; c.globalAlpha = o.grain ?? 0.085; c.imageSmoothingEnabled = true;
    const g = grains[frame % grains.length], ox = (h1(frame * 3.7) * 320) | 0, oy = (h1(frame * 5.3) * 240) | 0;
    c.save(); c.translate(-ox, -oy); c.scale(2, 2); for (let y = 0; y < H / 2 + 240; y += 240) for (let x = 0; x < W / 2 + 320; x += 320) c.drawImage(g, x, y); c.restore();
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // dust & hair, rare
    if (h1(frame * 0.77) < 0.05) { const x = h1(frame) * W, y = h1(frame + 9) * H; c.fillStyle = h1(frame + 3) < 0.5 ? 'rgba(10,8,6,0.5)' : 'rgba(255,250,235,0.35)'; c.beginPath(); c.ellipse(x, y, 1 + h1(frame + 5) * 1.5, 0.8 + h1(frame + 6), h1(frame + 2) * 3, 0, TAU); c.fill(); }
    if (h1(frame * 0.31 + 2) < 0.012) { const x = h1(frame + 1) * W, y = h1(frame + 8) * H; c.strokeStyle = 'rgba(12,10,8,0.35)'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 10, y + 8, x - 6, y + 18, x + 4, y + 28); c.stroke(); }
    if (o.fade !== undefined && o.fade < 1) { c.fillStyle = css('#000', 1 - o.fade); c.fillRect(0, 0, W, H); }
    if (o.white) { c.fillStyle = css('#f4f6ff', o.white); c.fillRect(0, 0, W, H); }
  }
  return { apply };
})();
