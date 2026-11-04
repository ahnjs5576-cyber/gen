// usage: node tools/snap.mjs outdir t1 t2 ...   (renders exact frames headlessly)
import { createRequire } from 'node:module'; const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright'); import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [out, ...ts] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); else if (process.env.LOG) console.log('[page]', m.text()); });
await p.goto('file://' + path.join(root, 'moon-tram.html') + '?still' + (process.env.LOG ? '&log' : ''));
try { await p.waitForFunction(() => window.__ready === true, null, { timeout: +(process.env.TO || 240000) }); } catch (e) { console.log('TIMEOUT', errs.join('\n')); process.exit(1); }
for (const t of ts) {
  const t0 = Date.now();
  const url = await p.evaluate((t) => window.__renderAt(+t), t);
  fs.writeFileSync(path.join(out, `f_${String(t).padStart(5, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
  console.log(t, (Date.now() - t0) + 'ms');
}
if (errs.length) console.log('ERRORS:\n' + errs.join('\n'));
await b.close();
