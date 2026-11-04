// ───────────────────────── player ─────────────────────────
(() => {
  const qs = new URLSearchParams(location.search), still = qs.has('still'), startAt = clamp(+(qs.get('t') || 0), 0, DUR - 0.5);
  const gate = document.getElementById('gate'), gs = document.getElementById('gs'), hud = document.getElementById('hud');
  let playing = false, lastFrame = -1, clock0 = 0, offset = startAt, ended = false;
  const now = () => AU.ctx ? AU.ctx.currentTime - AU.T0 : (performance.now() / 1000 - clock0);
  function loop() {
    if (!playing) return;
    const t = now();
    if (t >= DUR) { playing = false; ended = true; renderFrame(DUR - 0.001); gate.classList.remove('hide'); gs.textContent = '다시 보기'; if (AU.ctx) AU.ctx.close(); AU.ctx = null; return; }
    const f = Math.floor(Math.max(0, t) * FPS);
    if (f !== lastFrame) { lastFrame = f; renderFrame(Math.max(0, t)); }
    requestAnimationFrame(loop);
  }
  function start(from) {
    if (AU.ctx) { try { AU.ctx.close(); } catch (e) { } AU.ctx = null; }
    try { const ctx = audioStart(from); if (ctx.state === 'suspended') ctx.resume(); } catch (e) { clock0 = performance.now() / 1000 - from; }
    ended = false; playing = true; lastFrame = -1; gate.classList.add('hide');
    setTimeout(() => hud.classList.remove('show'), 4000);
    requestAnimationFrame(loop);
  }
  (async () => {
    await buildAll((p) => { gs.textContent = `그림을 그리는 중… ${Math.round(p * 100)}%`; });
    defineShots();
    renderFrame(startAt);
    window.__ready = true;
    window.__renderAt = (t) => { renderFrame(t); return OUT.toDataURL('image/png'); };
    if (still) { gate.style.display = 'none'; hud.style.display = 'none'; return; }
    gs.textContent = '클릭하면 재생됩니다 · 소리를 켜 주세요 (80초)';
    gate.addEventListener('click', () => start(ended ? 0 : offset));
  })();
  addEventListener('keydown', (e) => {
    if (!window.__ready || still) return;
    if (e.code === 'Space') { e.preventDefault(); if (!AU.ctx || ended) return; if (AU.ctx.state === 'running') { AU.ctx.suspend(); playing = false; } else { AU.ctx.resume(); playing = true; requestAnimationFrame(loop); } }
    else if (e.key === 'r' || e.key === 'R') start(0);
    else if (e.key === 'f' || e.key === 'F') { const el = document.documentElement; document.fullscreenElement ? document.exitFullscreen() : (el.requestFullscreen && el.requestFullscreen()); }
  });
})();
