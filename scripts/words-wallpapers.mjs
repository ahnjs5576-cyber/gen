// 배경화면 이미지 만들기: node scripts/words-wallpapers.mjs [--out 폴더] [--days 30] [--size 1290x2796]
// 한국 시간 기준 어제부터 N일 동안, 단어 수 1~5개별 JPG를 만든다.
//   <out>/<단어 수>/<YYYY-MM-DD>.jpg   날짜별
//   <out>/<단어 수>/today.jpg          오늘 (단축어·자동화 앱이 받아 가는 주소)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './lib-static.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const out = path.resolve(arg('out', path.join(root, 'words', 'wall')));
const days = Number(arg('days', 30));
const [W, H] = arg('size', '1290x2796').split('x').map(Number);
const quality = Number(arg('quality', 0.9));
const tz = arg('tz', 'Asia/Seoul');

const today = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const { server, base } = serve(root);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(base + 'words/wallpaper.html?nopreview');
  const fontOk = await page.evaluate(() => window.wallReady);
  if (!fontOk) console.warn('! Fraunces 글꼴을 받지 못해 대체 글꼴로 그립니다.');

  let made = 0;
  for (let d = -1; d < days; d++) {
    const date = await page.evaluate(([t, k]) => WordCore.addDays(t, k), [today, d]);
    for (let n = 1; n <= 5; n++) {
      const url = await page.evaluate(([date, n, W, H, q]) => renderDataURL(date, n, W, H, q), [date, n, W, H, quality]);
      const buf = Buffer.from(url.split(',')[1], 'base64');
      fs.mkdirSync(path.join(out, String(n)), { recursive: true });
      fs.writeFileSync(path.join(out, String(n), `${date}.jpg`), buf);
      if (date === today) fs.writeFileSync(path.join(out, String(n), 'today.jpg'), buf);
      made++;
    }
  }
  const words = await page.evaluate(t => WordCore.wordsFor(t, 5).map(w => w.w), today);
  fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ today, timeZone: tz, size: [W, H], days, words, generatedAt: new Date().toISOString() }, null, 2));
  console.log(`✓ ${made}장 (${W}×${H}) → ${path.relative(root, out) || out}  오늘(${today}): ${words.join(', ')}`);
} finally {
  await browser.close();
  server.close();
}
