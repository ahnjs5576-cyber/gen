// ───────────────────────── timeline & playback ─────────────────────────
const SHOTS = [];
function shot(t0, t1, fn) { SHOTS.push({ t0, t1, fn }); }
const S = mkCanvas(W, H), SX = S.getContext('2d');
const OUT = document.getElementById('out');
async function buildAll(progress) {
  const steps = [
    ['term', () => buildTerminus('rain')], ['fg1', () => buildFgWeeds(31)], ['under', () => buildUnder()],
    ['sil', () => buildSilhouette()], ['front', () => buildFrontStill()], ['roof', () => buildRoofSky()], ['wheels', () => buildWheelsBG()], ['bluff', () => buildBluff()], ['strip', () => buildTrackStrip()], ['far', () => buildFarTown()], ['lift', () => buildLiftStill()], ['tower', () => buildTower()], ['bankA', () => buildCloudBank(141, 720, 520)], ['bankB', () => buildCloudBank(142, 760, 520)], ['c13', () => buildClouds13()], ['termEnd', () => buildTerminus('end')], ['fg14', () => buildFgWeeds(77)],
  ];
  for (const fn of (window.EXTRA_BUILD || [])) steps.push(fn);
  for (let i = 0; i < steps.length; i++) { progress(i / steps.length); await new Promise(r => setTimeout(r, 0)); const t0 = performance.now(); SCN[steps[i][0]] = steps[i][1](); if (/log/.test(location.search)) console.log(steps[i][0], (performance.now() - t0) | 0, 'ms'); }
  progress(1);
}
function defineShots() {
  shot(0, 9, shotWide);
  shot(9, 13.5, shotCat1);
  shot(13.5, 13.5 + 4 / 24, shotBolt);
  shot(13.5 + 4 / 24, 15.6, shotStill(SCN.front));
  shot(15.6, 18, shotCat2);
  shot(18, 25, shotPanto);
  shot(25, 30.5, shotInterior);
  shot(30.5, 34, shotRoller);
  shot(34, 40.5, shotWheels);
  shot(40.5, 49, shotStitch);
  shot(49, 54, shotTrack);
  shot(54, 55.6, shotStill(SCN.lift));
  shot(55.6, 65, shotTower);
  shot(65, 69.5, shotClouds);
  shot(69.5, 80.01, shotEnd);
  for (const s of (window.EXTRA_SHOTS || [])) shot(...s);
}
function renderFrame(t) {
  const frame = Math.floor(t * FPS + 1e-6); t = frame / FPS;
  const sh = SHOTS.find(s => t >= s.t0 - 1e-6 && t < s.t1 - 1e-6) || SHOTS[SHOTS.length - 1];
  SX.setTransform(1, 0, 0, 1, 0, 0); SX.globalAlpha = 1; SX.globalCompositeOperation = 'source-over'; LW = 1;
  SX.fillStyle = '#000'; SX.fillRect(0, 0, W, H);
  const po = sh.fn(SX, t - sh.t0, t) || {};
  POST.apply(S, OUT, frame, po);
}
