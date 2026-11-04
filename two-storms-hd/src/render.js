// Offline renderer: node render.js <workdir> [--draft]
// Paints every frame of film.html in headless Chromium (4 pages in parallel),
// renders the soundtrack with OfflineAudioContext, encodes H.264/AAC with
// ffmpeg, then embeds the MP4 (base64) into player.html -> ../index.html.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const SRC = __dirname, work = path.resolve(process.argv[2] || 'render-work'), draft = process.argv.includes('--draft');
const frames = path.join(work, 'frames'); fs.mkdirSync(frames, { recursive: true });
const film = 'file://' + path.join(SRC, 'film.html') + '?headless';
(async () => {
  const browser = await chromium.launch();
  const probe = await browser.newPage();
  await probe.goto(film);
  const { FPS, DUR } = await probe.evaluate(() => ({ FPS: FILM.FPS, DUR: FILM.DUR }));
  const N = Math.round(FPS * DUR), WORKERS = 4, t0 = Date.now();
  let done = 0;
  async function worker(w) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1040 } });
    page.on('pageerror', e => console.error('page error', e.message));
    await page.goto(film); await page.evaluate(() => FILM.build());
    for (let f = w; f < N; f += WORKERS) {
      const out = path.join(frames, `f_${String(f).padStart(5, '0')}.jpg`);
      if (fs.existsSync(out)) { done++; continue; }
      const d = await page.evaluate(([f, fps, dr]) => { FILM.render(f / fps, dr); return FILM.jpeg(.95); }, [f, FPS, draft]);
      fs.writeFileSync(out, Buffer.from(d.split(',')[1], 'base64'));
      if (++done % 48 === 0) console.log(`${done}/${N} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    await page.close();
  }
  await Promise.all([0, 1, 2, 3].map(worker));
  console.log('frames done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
  const wav = await probe.evaluate(() => FILM.audio());
  fs.writeFileSync(path.join(work, 'audio.wav'), Buffer.from(wav, 'base64'));
  await probe.evaluate(() => { FILM.render(20.4, false); });
  const poster = await probe.evaluate(() => FILM.jpeg(.82));
  await browser.close();
  const mp4 = path.join(work, 'film.mp4');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(frames, 'f_%05d.jpg'), '-i', path.join(work, 'audio.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', draft ? '26' : '20', '-tune', 'animation', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  const html = fs.readFileSync(path.join(SRC, 'player.html'), 'utf8')
    .replace('{{POSTER}}', poster.split(',')[1]).replace('{{REEL}}', fs.readFileSync(mp4).toString('base64'));
  const outHtml = path.join(SRC, '..', 'index.html');
  fs.writeFileSync(outHtml, html);
  console.log('mp4', (fs.statSync(mp4).size / 1e6).toFixed(1), 'MB -> index.html', (fs.statSync(outHtml).size / 1e6).toFixed(1), 'MB');
})();
