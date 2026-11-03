// 브라우저 스모크 테스트: node scripts/smoke.mjs
// 로컬 정적 서버를 띄우고 오늘 → 레슨 → 퀴즈 → 복습 흐름을 확인한다.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname.replace(/\/$/, '/index.html')));
  if (!p.startsWith(root) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const base = `http://127.0.0.1:${server.address().port}/`;

const fail = m => { console.error('✗', m); process.exitCode = 1; };
const ok = m => console.log('✓', m);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(base + '#today');
  const tickets = await page.locator('.ticket').count();
  tickets === 2 ? ok('오늘 레슨 2개') : fail(`오늘 레슨 ${tickets}개`);

  await page.locator('.ticket').first().click();
  await page.waitForSelector('.card h1');
  const qs = await page.locator('.q').count();
  for (let i = 0; i < qs; i++) await page.locator('.q').nth(i).locator('.choice').first().click();
  await page.waitForSelector('#result:not([hidden])');
  ok(`퀴즈 ${qs}문항 풀고 결과 표시: ${(await page.locator('#result .score').textContent()).trim()}`);

  await page.goto(base + '#today');
  const doneCount = await page.locator('.ticket.done').count();
  doneCount === 1 ? ok('완료 표시 반영') : fail(`완료 ${doneCount}개`);

  // 하루 뒤로 시간을 옮겨 복습 큐 확인
  const tomorrow = Date.now() + 86400000 * 4;
  await page.addInitScript(t => { const D = Date; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; }, tomorrow);
  await page.reload();
  const badge = await page.locator('#review-badge').textContent();
  badge === '1' ? ok('4일 뒤 복습 1개') : fail(`복습 배지 ${badge}`);
  await page.goto(base + '#review');
  await page.waitForSelector('.q');
  ok('복습 화면 열림');

  for (const h of ['subjects', 's-os', 'stats', 'prefs']) {
    await page.goto(base + '#' + h);
    await page.waitForSelector('main h1');
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    wide ? fail(`#${h} 가로 넘침`) : ok(`#${h} 렌더`);
  }
  errors.length ? fail('페이지 오류: ' + errors.join(' | ')) : ok('스크립트 오류 없음');
} finally {
  await browser.close();
  server.close();
}
