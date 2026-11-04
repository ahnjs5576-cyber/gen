import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const b = await chromium.launch({ args: ['--enable-gpu-rasterization', '--ignore-gpu-blocklist'] }); const p = await b.newPage();
await p.goto('file://' + path.join(root, 'moon-tram.html') + '?still'); await p.waitForFunction(() => window.__ready === true, null, { timeout: 240000 });
const r = await p.evaluate(() => { const out = []; for (let t = 0; t < 80; t += 2.5) { const t0 = performance.now(); for (let k = 0; k < 3; k++) renderFrame(t + k / 24); out.push([t, ((performance.now() - t0) / 3).toFixed(0)]); } return out; });
console.log(r.map(x => x.join(':')).join('  ')); await b.close();
