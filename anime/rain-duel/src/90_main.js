// ===================================================================
//  MAIN — projector: loads the boards, runs the film off the audio clock
// ===================================================================
const SCR = document.getElementById('scr'), SX = SCR.getContext('2d');
const CMP = mkCanvas(W, H), CX = CMP.getContext('2d');
let lastFi = -1, lastKey = '';
// shots that have something moving on ones (effects, shakes, impact strobes)
const ONES = new Set(['puddle', 'clash', 'exchange', 'graze', 'punch', 'kick', 'fire', 'elec', 'charge', 'impact']);
function renderFrame(t, force) {
  const fi = Math.min(Math.floor(t * FPS), DUR * FPS - 1), tq = fi / FPS;
  const S = shotAt(tq), lt = tq - S.t0, k = Math.floor(lt * 12);
  const key = S.name + ':' + (ONES.has(S.name) ? fi : k) + (tq > 78.2 ? fi : '');
  if (key === lastKey && !force) { filmFinish(CMP, SX, fi, { fade: tq > 78.2 ? clamp((tq - 78.2) / 1.6, 0, 1) : null }); lastFi = fi; return; }
  lastKey = key;
  CX.setTransform(1, 0, 0, 1, 0, 0); CX.globalAlpha = 1; CX.globalCompositeOperation = 'source-over'; CX.filter = 'none';
  CX.fillStyle = '#000'; CX.fillRect(0, 0, W, H);
  S.draw(CX, lt, k, tq);
  CX.setTransform(1, 0, 0, 1, 0, 0); CX.globalAlpha = 1; CX.globalCompositeOperation = 'source-over'; CX.filter = 'none';
  const fade = tq > 78.2 ? clamp((tq - 78.2) / 1.6, 0, 1) : null;
  filmFinish(CMP, SX, fi, { fade });
  lastFi = fi;
}
window.__render = t => { renderFrame(t, true); return shotAt(t).name; };

const UI = document.getElementById('ui'), MSG = document.getElementById('msg');
let ready = false, playing = false, t0 = 0, pausedAt = 0, actx = null, master = null;
const step = (msg, fn) => new Promise(res => { MSG.textContent = msg; setTimeout(() => { fn(); res(); }, 30); });
(async () => {
  await step('종이를 펴는 중…', makePaper);
  await step('배경을 그리는 중…', buildBackgrounds);
  await step('비를 그리는 중…', makeRain);
  await step('필름을 감는 중…', makeFilm);
  ready = true; window.__ready = true;
  const q = new URLSearchParams(location.search);
  const ts = parseFloat(q.get('t') || '0');
  renderFrame(ts || 0);
  MSG.textContent = '▶ 클릭해서 상영';
})();
function now() { return actx ? actx.currentTime - t0 : 0; }
function loop() {
  if (!playing) return;
  const t = now();
  if (t >= DUR) { playing = false; renderFrame(DUR - .01); UI.classList.remove('hide'); MSG.textContent = '↻ 다시 보기'; pausedAt = 0; return; }
  if (Math.floor(t * FPS) !== lastFi) renderFrame(t);
  requestAnimationFrame(loop);
}
function play(from = 0) {
  if (!ready) return;
  if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  if (actx.state === 'suspended') actx.resume();
  if (master) { try { master.disconnect(); } catch (e) { } }
  master = actx.createGain(); master.gain.value = .9; master.connect(actx.destination);
  t0 = actx.currentTime + .15 - from;
  try { scoreAudio(actx, master, t0, from); } catch (e) { console.warn(e); }
  playing = true; UI.classList.add('hide'); lastFi = -1; requestAnimationFrame(loop);
}
function pause() {
  if (!playing) return; pausedAt = now(); playing = false;
  if (master) { master.gain.setTargetAtTime(0, actx.currentTime, .02); const m = master; setTimeout(() => { try { m.disconnect(); } catch (e) { } }, 200); master = null; }
}
UI.addEventListener('click', () => play(pausedAt || 0));
SCR.addEventListener('click', () => { if (playing) pause(); else play(pausedAt); });
addEventListener('keydown', e => {
  if (e.code === 'Space') { e.preventDefault(); if (playing) pause(); else play(pausedAt); }
  if (e.code === 'KeyR') { pause(); pausedAt = 0; play(0); }
});
