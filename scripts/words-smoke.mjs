// 오늘의 영단어 브라우저 스모크 테스트: node scripts/words-smoke.mjs [--shots 폴더]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { serve } from './lib-static.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const si = process.argv.indexOf('--shots');
const shots = si > 0 ? path.resolve(process.argv[si + 1]) : null;
if (shots) fs.mkdirSync(shots, { recursive: true });
const shot = async (page, name) => { if (shots) await page.screenshot({ path: path.join(shots, name + '.png') }); };

const { server, base } = serve(root);
const fail = m => { console.error('✗', m); process.exitCode = 1; };
const ok = m => console.log('✓', m);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base + 'words/');
  await page.evaluate(() => WordCore.fontsReady());
  await page.waitForTimeout(150);

  const n = await page.locator('.hit').count();
  n === 3 ? ok('기본 단어 3개') : fail(`단어 ${n}개`);
  const expected = await page.evaluate(() => WordCore.wordsFor(WordCore.today(), 3).map(w => w.w));
  const shown = await page.locator('.hit').allTextContents();
  JSON.stringify(shown) === JSON.stringify(expected) ? ok(`오늘 단어: ${shown.join(', ')}`) : fail(`표시 ${shown} ≠ 기대 ${expected}`);
  await shot(page, '1-home');

  await page.locator('.hit').first().click();
  await page.waitForSelector('#sheet[open]');
  const word = await page.textContent('#w-word');
  const ko = await page.textContent('#w-ko');
  const mark = await page.locator('#w-ex mark').count();
  word === expected[0] && ko && mark === 1 ? ok(`뜻 시트: ${word} — ${ko}`) : fail(`시트 내용 ${word}/${ko}/${mark}`);
  await shot(page, '2-sheet');
  await page.click('#w-next');
  (await page.textContent('#w-word')) === expected[1] ? ok('다음 단어로 이동') : fail('다음 단어 이동 실패');
  await page.keyboard.press('Escape');
  (await page.locator('#sheet[open]').count()) === 0 ? ok('시트 닫힘') : fail('시트 안 닫힘');

  await page.click('#open-prefs');
  await page.waitForSelector('#prefs[open]');
  await page.locator('#count-row label').nth(4).click();
  await shot(page, '3-prefs');
  await page.keyboard.press('Escape');
  const n5 = await page.locator('.hit').count();
  n5 === 5 ? ok('단어 수 5개로 변경') : fail(`변경 후 ${n5}개`);
  (await page.inputValue('#wall-url')).endsWith('/words/wall/5/today.jpg') ? ok('자동 변경 주소 반영') : fail('주소 미반영');
  await page.reload();
  (await page.locator('.hit').count()) === 5 ? ok('설정 저장 유지') : fail('새로고침 후 설정 사라짐');
  await shot(page, '4-five');

  await page.click('#prev');
  const yesterday = await page.evaluate(() => WordCore.wordsFor(WordCore.addDays(WordCore.today(), -1), 5).map(w => w.w));
  JSON.stringify(await page.locator('.hit').allTextContents()) === JSON.stringify(yesterday) ? ok('전날 단어 보기') : fail('전날 단어 다름');
  await page.click('#back-today');

  const [dl] = await Promise.all([page.waitForEvent('download'), (async () => { await page.click('#open-prefs'); await page.click('#save-wall'); })()]);
  /\.jpg$/.test(dl.suggestedFilename()) ? ok(`이미지 저장: ${dl.suggestedFilename()}`) : fail('이미지 저장 실패');
  await page.keyboard.press('Escape');

  for (const [w, h] of [[320, 568], [430, 932], [1280, 800]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(150);
    const bad = await page.evaluate(() => [...document.querySelectorAll('.hit')].some(b => { const r = b.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth || r.top < 50 || r.bottom > innerHeight; }));
    bad ? fail(`${w}×${h} 단어가 화면 밖`) : ok(`${w}×${h} 배치`);
  }
  errors.length ? fail('페이지 오류: ' + errors.join(' | ')) : ok('스크립트 오류 없음');
} finally {
  await browser.close();
  server.close();
}
