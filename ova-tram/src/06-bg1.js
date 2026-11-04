// ───────────────────────── backgrounds: night sky & the terminus ─────────────────────────
function rainSky(c, w, h, o = {}) { // eslint-disable-line
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, o.top || '#060914'); g.addColorStop(0.55, o.mid || '#121a30'); g.addColorStop(1, o.bot || '#2c2a40');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  brushwork(c, { x: 0, y: 0, w, h }, o.mid || '#121a30', { seed: o.seed || 3, dens: 0.004, len: 60, wid: 14, alpha: 0.18, var: 0.3, ang: -0.08, angVar: 0.2 });
  // town glow under the clouds
  if (o.glow !== 0) { air(c, o.gx ?? w * 0.3, h, w * 0.6, o.glowCol || '#6a3a4a', o.glow ?? 0.5, 1, 0.35); }
  const rng = mulberry(o.seed || 3);
  const cl = o.clouds || {};
  { // clouds painted at half resolution on a reduced copy, then laid back (soft); brushwork stays full-res
    const hw = Math.ceil(w / 2), hh = Math.ceil(h / 2), hc0 = mkCanvas(hw, hh), hc = hc0.getContext('2d', { willReadFrequently: true });
    hc.drawImage(c.canvas, 0, 0, w, h, 0, 0, hw, hh);
    const c0 = c; c = hc;
  paintClouds(c, 0, 0, hw, hh, { seed: o.seed || 3, scale: (cl.scale ?? 210) / 2, th: 0.42, soft: 0.07, dark: cl.dark || '#0a0e1b', mid: cl.mid || '#182038', lit: cl.lit || '#34405e', lx: cl.lx ?? 0.3, ly: -1, prof: (v) => 0.12 - v * 0.22, deep: 0.35, tint: cl.tint });
  paintClouds(c, 0, hh * 0.35, hw, hh * 0.65, { seed: (o.seed || 3) + 40, scale: (cl.scale ?? 210) * 0.57 / 2, stretch: 0.35, th: 0.52, soft: 0.05, dark: cl.dark2 || '#141a2e', mid: cl.mid2 || '#262c48', lit: cl.lit2 || '#4a4c6e', lx: cl.lx ?? 0.3, ly: -1, prof: (v) => -Math.abs(v - 0.45) * 0.3, deep: 0.25, tint: cl.tint2 });
    c = c0; c.drawImage(hc0, 0, 0, hw, hh, 0, 0, w, h);
    brushwork(c, { x: 0, y: 0, w, h }, cl.mid || '#182038', { seed: (o.seed || 3) + 7, dens: 0.005, len: 30, wid: 8, alpha: 0.15, var: 0.35, ang: -0.12, angVar: 0.5 });
  }
  // falling rain veils
  c.save(); c.globalAlpha = 0.12; for (let i = 0; i < 26; i++) { const x = rng() * w, ww = 20 + rng() * 60; const gg = c.createLinearGradient(x, h * 0.3, x - 30, h); gg.addColorStop(0, 'rgba(120,140,180,0)'); gg.addColorStop(1, 'rgba(120,140,180,0.6)'); c.fillStyle = gg; c.beginPath(); c.moveTo(x, h * 0.25); c.lineTo(x + ww, h * 0.25); c.lineTo(x + ww - 40, h); c.lineTo(x - 40, h); c.fill(); } c.restore();
}
// S1 / S14 : the dead end of the branch line, low camera
const RAIL_Y = 560;
function buildTerminus(variant) {
  const bw = W, bh = H, cv = mkCanvas(bw, bh), sky = mkCanvas(bw, bh), land = mkCanvas(bw, bh), rng = mulberry(variant === 'end' ? 1201 : 1101);
  let c = sky.getContext('2d');
  const end = variant === 'end';
  if (!end) rainSky(c, bw, 470, { seed: 21, glowCol: '#5e3446', gx: 160, glow: 0.55 });
  else {
    // after the storm: torn clouds, deep clear sky with stars, moonlit cloud edges
    const g = c.createLinearGradient(0, 0, 0, 470); g.addColorStop(0, '#04071a'); g.addColorStop(0.6, '#0b1430'); g.addColorStop(1, '#22284a');
    c.fillStyle = g; c.fillRect(0, 0, bw, 470);
    brushwork(c, { x: 0, y: 0, w: bw, h: 470 }, '#0b1430', { seed: 5, dens: 0.004, len: 60, wid: 14, alpha: 0.16, var: 0.3, ang: -0.1 });
    for (let i = 0; i < 260; i++) { const x = rng() * bw, y = rng() * 330, r = rng() < 0.08 ? 1.3 : 0.6; c.fillStyle = css('#dfe8ff', 0.35 + rng() * 0.55); c.fillRect(x, y, r, r); }
    air(c, 160, 470, 560, '#5e3446', 0.45, 1, 0.3);
    paintClouds(c, 0, 0, bw, 470, { seed: 77, scale: 190, th: 0.56, soft: 0.06, dark: '#0c1230', mid: '#1c2448', lit: '#8a8fb8', lx: 0.6, ly: -0.8, prof: (v) => -Math.abs(v - 0.3) * 0.25, deep: 0.3 });
    paintClouds(c, 0, 280, bw, 190, { seed: 78, scale: 110, stretch: 0.3, th: 0.55, soft: 0.05, dark: '#141a38', mid: '#2a2c50', lit: '#a08aa0', lx: 0.6, ly: -1, prof: (v) => -Math.abs(v - 0.5) * 0.3 });
  }
  c = land.getContext('2d');
  // far cape, sea and the lower town beyond the edge (left third)
  paintPoly(c, [[-10, 400], [40, 372], [110, 360], [190, 352], [260, 366], [330, 380], [330, 440], [-10, 440]], '#0d1222', { seed: 4, dens: 0.02, len: 20, wid: 5, var: 0.2 });
  for (let i = 0; i < 26; i++) { const x = rng() * 320, y = 362 + rng() * 34 + Math.abs(x - 190) * 0.05; c.fillStyle = css(rng() < 0.7 ? '#ffc070' : '#d8f0ff', 0.6 + rng() * 0.4); c.fillRect(x, y, 1.4, 1.2); litSpill(c, x, y, 5, '#ffb050', 0.25); }
  // lighthouse on the cape
  paintRect(c, 52, 350, 4, 16, '#cfc8b4', { strokes: 0, wob: 0 }); paintRect(c, 51, 346, 6, 5, '#2a2a30', { strokes: 0, wob: 0 });
  paintPoly(c, [[-10, 432], [330, 428], [330, 470], [-10, 470]], '#0a1222', { seed: 6, dens: 0.03, len: 30, wid: 2, ang: 0, angVar: 0.03, var: 0.25 });
  for (let i = 0; i < 40; i++) { const x = rng() * 330, y = 433 + rng() * 34; bline(c, [[x, y], [x + 4 + rng() * 14, y]], 0.8, rng() < 0.6 ? '#c89050' : '#6a88b0', 0.25 + rng() * 0.3); }
  // roofs of the lower town (left, below the bluff)
  let x = -20; while (x < 330) { const w = 26 + rng() * 34, h = 10 + rng() * 16; tileRoof(c, x, x + w, 452 - h, 462, rng, { inset: 6, hi: '#3a5068' }); if (rng() < 0.5) { c.fillStyle = css('#ffc070', 0.8); c.fillRect(x + w * 0.4, 464, 4, 3); } x += w + 4 + rng() * 6; }
  paintPoly(c, [[-10, 462], [330, 458], [330, 520], [-10, 520]], '#0b0f1a', { seed: 8, dens: 0.02 });
  // ── buildings behind the line (right two thirds); every one different
  const B = [
    () => apt(c, 610, 540, 150, 230, rng, { floors: 4, tank: true, wall: '#232836' }),
    () => house(c, 330, 540, 112, 150, rng, { antenna: true, ac: true, pipe: true, wall: '#262436', litP: 0.35 }),
    () => shop(c, 436, 540, 92, 170, rng, { vsign: true, sign: '#6e2c2c', vsignCol: '#c8c2a8' }),
    () => house(c, 524, 540, 86, 136, rng, { boards: 'h', roofH: 20, wall: '#1f2533', litP: 0.3 }),
    () => house(c, 756, 540, 104, 158, rng, { antenna: true, roofH: 18, wall: '#29283a' }),
    () => shop(c, 858, 540, 120, 150, rng, { sign: '#284070' }),
  ];
  B.forEach(f => f());
  // laundry pole + plants on the shop roof, a satellite of clutter
  bline(c, [[548, 404], [604, 398]], 1, '#3a404c', 0.9); for (let k = 0; k < 4; k++) paintRect(c, 552 + k * 12, 400, 8, 10 + rng() * 6, ['#3a3448', '#2e3a44', '#443a3a'][k % 3], { dens: 0.05, len: 4 });
  // utility poles and tangled wires
  const pA = utilityPole(c, 318, 545, 150, rng, { trans: true, sign: true, w: 8 });
  const pB = utilityPole(c, 742, 545, 140, rng, { arms: 3, w: 8 });
  const roofs = [[330, 395], [470, 378], [600, 300], [860, 392], [960, 370], [1010, 330], [-30, 360], [200, 330]];
  wires(c, pA, rng, 7, { to: pB, hi: '#6a86a8' });
  wires(c, pB, rng, 6, { to: roofs.slice(2, 6), hi: '#6a86a8' });
  wires(c, pA, rng, 5, { to: [roofs[0], roofs[1], roofs[6], roofs[7]], hi: '#6a86a8' });
  // catenary pole for the dead tram wire (right) + the wire itself
  paintPoly(c, [[928, 545], [938, 545], [936, 150], [930, 150]], '#30302e', { dens: 0.05, ang: Math.PI / 2, angVar: 0.1, wob: 0.3 });
  bline(c, [[933, 186], [856, 192]], 3, '#26262a', 1); bline(c, [[933, 178], [870, 191]], 1, '#26262a', 1);
  // the dead tram wire across the frame
  bline(c, sag(856, 192, 318, 206, 7, 40), 1.6, '#08090c', 1); bline(c, sag(856, 191, 318, 205, 7, 40), 0.6, '#7d96b4', 0.35);
  bline(c, [[318, 206], [312, 200]], 1, '#08090c', 1);
  // vending machine (cool light source left of the nose)
  paintRect(c, 380, 486, 32, 56, '#3a4450', { dens: 0.05, len: 5, wid: 1.5 });
  paintRect(c, 383, 490, 26, 30, '#d6ecf4', { dens: 0.06, len: 4, wid: 1.2, var: 0.06 });
  for (let r2 = 0; r2 < 3; r2++) for (let k = 0; k < 5; k++) { c.fillStyle = css(['#c04040', '#3a70c0', '#e0c050', '#40a070', '#e07040'][(k + r2 * 2) % 5], 0.85); c.fillRect(385 + k * 5, 492 + r2 * 9, 3.4, 6); }
  paintRect(c, 383, 524, 26, 6, '#1a2028', { strokes: 0 }); paintRect(c, 386, 532, 20, 6, '#101418', { strokes: 0 });
  litSpill(c, 396, 505, 60, '#bfe8ff', 0.35); litSpill(c, 396, 548, 50, '#bfe8ff', 0.2);
  // a second, distant sodium lamp beyond the car (warms the rear and the shutters)
  bline(c, [[905, 545], [905, 300]], 3, '#2e2e32', 1); bline(c, qb([905, 302], [908, 288], [924, 290], 8), 2.4, '#2e2e32', 1);
  litSpill(c, 922, 294, 14, '#ffd890', 0.9); litSpill(c, 920, 300, 70, '#ff9a3a', 0.35); litSpill(c, 900, 470, 110, '#ff9a3a', 0.22);
  // embankment, ballast, sleepers and rails
  paintPoly(c, [[-10, 545], [970, 540], [970, 600], [-10, 600]], '#181c22', { seed: 30, dens: 0.05, len: 6, wid: 3, var: 0.35, angVar: 1.5 });
  for (let i = 0; i < 900; i++) { const gx = rng() * bw, gy = 548 + rng() * 44; c.fillStyle = css(mix('#2a2e36', '#4a5260', rng()), 0.6); c.beginPath(); c.ellipse(gx, gy, 1.2 + rng() * 2, 0.8 + rng() * 1.2, rng() * 3, 0, TAU); c.fill(); }
  for (let sx = 290; sx < bw + 20; sx += 22 + rng() * 4) { const skew = (rng() - 0.5) * 2; paintPoly(c, [[sx, 565 + skew], [sx + 15, 565], [sx + 16, 572], [sx - 1, 572 + skew]], '#2a2220', { dens: 0.1, len: 4, wid: 1.5, wob: 0.4 }); bline(c, [[sx, 565.4], [sx + 15, 565.4]], 0.7, '#5a6678', 0.4); }
  const rail = (y0, xEnd) => {
    paintPoly(c, [[xEnd, y0], [bw + 10, y0 - 0.5], [bw + 10, y0 + 6], [xEnd, y0 + 6]], '#3a2a22', { dens: 0.08, len: 8, wid: 1.5, var: 0.3, wob: 0.3 });
    bline(c, [[xEnd, y0 + 0.6], [bw + 10, y0]], 1.2, '#9ab4c8', 0.55); bline(c, [[xEnd, y0 + 6], [bw + 10, y0 + 6]], 1, '#0a0808', 0.8);
    for (let k = 0; k < 60; k++) { c.fillStyle = css('#8a4a24', 0.5); c.fillRect(xEnd + rng() * (bw - xEnd), y0 + 1 + rng() * 4, 2 + rng() * 6, 1); }
  };
  rail(RAIL_Y, 296);
  // broken, bent-up rail end
  paintPoly(c, [[296, 560], [281, 551], [268, 546], [266, 549], [279, 557], [296, 566]], '#3a2620', { dens: 0.1, len: 4, wob: 0.5 });
  bline(c, [[296, 560.5], [282, 551.5], [268, 546.5]], 1, '#b0c4d4', 0.5);
  paintPoly(c, [[248, 570], [268, 566], [270, 572], [250, 577]], '#2a2220', { dens: 0.1, len: 4 });
  // weeds swallowing the rail end + streetlamp pole
  weeds(c, 140, 340, 556, 70, rng, { dens: 0.9, seedHeads: true });
  paintPoly(c, [[176, 586], [186, 586], [184, 210], [178, 210]], '#3c3c40', { dens: 0.06, ang: Math.PI / 2, angVar: 0.1, len: 14, wid: 2, wob: 0.3 });
  bline(c, [[179, 586], [180, 212]], 1, '#7a7a80', 0.4);
  bline(c, qb([181, 214], [186, 190], [214, 192], 10), 4, '#38383e', 1);
  paintPoly(c, [[210, 188], [238, 190], [240, 198], [208, 196]], '#2c2c30', { strokes: 0, wob: 0.3 });
  weeds(c, 150, 220, 586, 40, rng, { dens: 1 });
  // foreground ground: wet dirt & asphalt
  paintPoly(c, [[-10, 590], [970, 586], [970, 730], [-10, 730]], '#10131b', { seed: 41, dens: 0.03, len: 24, wid: 5, ang: 0, angVar: 0.2, var: 0.3 });
  for (let i = 0; i < 260; i++) { const gx = rng() * bw, gy = 592 + rng() * 128; c.fillStyle = css(mix('#1a1e28', '#2c3240', rng()), 0.7); c.beginPath(); c.ellipse(gx, gy, 1.5 + rng() * 3 * (gy / 600), 0.8 + rng() * 1.5, 0, 0, TAU); c.fill(); }
  const cc = cv.getContext('2d'); cc.drawImage(sky, 0, 0); cc.drawImage(land, 0, 0); applyPaper(cc, bw, bh, 0.22);
  // lamp light layer (added with flicker)
  const lamp = mkCanvas(bw, bh), l = lamp.getContext('2d');
  l.globalCompositeOperation = 'lighter';
  air(l, 225, 196, 26, '#ffd890', 1); air(l, 225, 200, 120, '#ff9a3a', 0.4);
  air(l, 230, 470, 190, '#ff9a3a', 0.28, 1.3, 0.75);
  air(l, 260, 560, 120, '#ffb050', 0.5, 1.8, 0.35);
  air(l, 340, 420, 120, '#ff9a3a', 0.25, 0.8, 1.6);
  // cone
  l.save(); const cg = l.createLinearGradient(0, 200, 0, 590); cg.addColorStop(0, 'rgba(255,170,80,0.16)'); cg.addColorStop(0.6, 'rgba(255,150,60,0.06)'); cg.addColorStop(1, 'rgba(255,150,60,0.0)'); l.fillStyle = cg; l.beginPath(); l.moveTo(214, 198); l.lineTo(236, 198); l.lineTo(390, 590); l.lineTo(90, 590); l.closePath(); l.fill(); l.restore();
  // sodium highlights picked out on the rail and wet ground
  l.globalCompositeOperation = 'lighter';
  bline(l, [[296, 560], [520, 559.6]], 1.2, '#ffb050', 0.6); bline(l, [[282, 551.5], [268, 546.5]], 1.2, '#ffc060', 0.8);
  // vending machine glow (cool) is steady: bake into bg
  return { cv, lamp, end, land, sky };
}
