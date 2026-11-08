// 브라우저 스모크 테스트: node scripts/smoke.mjs
// 로컬 정적 서버를 띄우고 사진 업로드 → 색 분석 → 추천 → 옷장 저장 흐름과,
// SDK 번들 로딩 및 (가짜 응답으로) AI 분석 경로를 확인한다. 실제 API 호출은 하지 않는다.
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

let failed = 0;
const fail = m => { console.error('✗', m); failed++; };
const ok = m => console.log('✓', m);
const check = (cond, m) => (cond ? ok(m) : fail(m));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto(base + '#home');
  await page.waitForSelector('#drop');
  ok('홈 화면 표시');

  // 테스트용 사진: 흰 배경 가운데 버건디 니트
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 480;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f2'; x.fillRect(0, 0, 400, 480);
    x.fillStyle = '#7a1f2b'; x.fillRect(90, 70, 220, 360);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#file-input', { name: 'knit.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
  await page.waitForSelector('.analyze .pal');
  const firstColor = (await page.locator('.pal.main b').textContent()).trim();
  check(firstColor === '버건디', `기준 색 인식: ${firstColor}`);
  check(!(await page.locator('.analyze .pal b', { hasText: '화이트' }).count()), '흰 배경은 색에서 제외');

  await page.locator('[data-chip="style"][data-v="미니멀"]').click();
  await page.locator('[data-chip="season"][data-v="겨울"]').click();
  await page.locator('#btn-go').click();
  await page.waitForSelector('.look');
  check((await page.locator('.look').count()) === 3, '추천 룩 3개 표시');
  check((await page.locator('.harm-item').count()) >= 4, '어울리는 색 목록 표시');
  const tag = await page.locator('.tag').textContent();
  check(tag.includes('미니멀') && tag.includes('겨울'), `선택한 옵션 반영: ${tag.trim()}`);
  check(!(await page.locator('.look .items li:not(.me) small', { hasText: '상의' }).count()), '내 옷 칸(상의)은 추천 아이템에 없음');

  await page.locator('#btn-save').click();
  await page.waitForSelector('#btn-save[disabled]');
  check((await page.locator('#closet-badge').textContent()).trim() === '1', '옷장 배지 1');
  await page.goto(base + '#closet');
  await page.waitForSelector('.cl');
  check((await page.locator('.cl').count()) === 1, '옷장에 1개 저장');
  await page.locator('.cl .btn.sm', { hasText: '코디 보기' }).click();
  await page.waitForSelector('.look');
  ok('옷장에서 코디 다시 보기');

  // 두 번째 옷(베이지 하의)을 올리면 옷장의 버건디 니트가 "어울리는 옷"으로 뜬다
  const png2 = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 500;
    const x = c.getContext('2d');
    x.fillStyle = '#ffffff'; x.fillRect(0, 0, 300, 500);
    x.fillStyle = '#dcc6a6'; x.fillRect(70, 30, 160, 450);
    return c.toDataURL('image/png').split(',')[1];
  });
  await page.setInputFiles('#file-input', { name: 'pants.png', mimeType: 'image/png', buffer: Buffer.from(png2, 'base64') });
  await page.waitForSelector('.analyze .pal');
  check((await page.locator('[data-chip="category"].on').textContent()).trim() === '하의', '세로로 긴 사진은 하의로 추정');
  await page.locator('#btn-go').click();
  await page.waitForSelector('.look');
  check((await page.locator('.h2', { hasText: '내 옷장에서 어울리는 옷' }).count()) === 1, '옷장 매칭 섹션 표시');

  // SDK 번들이 브라우저에서 로드되고 클라이언트를 만들 수 있다
  const sdkInfo = await page.evaluate(async () => {
    const m = await window.AI.loadSdk();
    const client = new m.default({ apiKey: 'sk-ant-test', dangerouslyAllowBrowser: true });
    return { hasDefault: typeof m.default === 'function', hasBeta: !!(client.beta && client.beta.messages), hasErrors: typeof m.AuthenticationError === 'function' };
  });
  check(sdkInfo.hasDefault && sdkInfo.hasBeta && sdkInfo.hasErrors, 'SDK 번들 로드 및 클라이언트 생성');

  // AI 경로: API를 가짜 응답으로 대신해 요청 모양과 화면 반영을 확인한다
  let captured = null;
  await page.route('https://api.anthropic.com/**', async route => {
    const req = route.request();
    captured = { headers: req.headers(), body: JSON.parse(req.postData() || '{}') };
    const payload = {
      item: { category: '하의', name: '베이지 치노 팬츠', colors: [{ hex: '#dcc6a6', name: '베이지' }], style: '캐주얼', season: '봄가을', pattern: '무지', material: '코튼', summary: '부드러운 베이지 치노 팬츠' },
      looks: [1, 2, 3].map(i => ({ title: `테스트 룩 ${i}`, concept: '콘셉트', tip: '팁', items: [
        { slot: '상의', name: '옥스포드 셔츠', colorHex: '#f7f7f5', colorName: '화이트', reason: '깔끔해요' },
        { slot: '신발', name: '로퍼', colorHex: '#5a3d2b', colorName: '브라운', reason: '따뜻해요' }] })),
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 'msg_test', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: 'end_turn', stop_sequence: null,
      content: [{ type: 'text', text: JSON.stringify(payload) }], usage: { input_tokens: 1, output_tokens: 1 },
    }) });
  });
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('otjjak.v1')); s.prefs.apiKey = 'sk-ant-test'; localStorage.setItem('otjjak.v1', JSON.stringify(s)); });
  await page.reload();
  await page.setInputFiles('#file-input', { name: 'pants.png', mimeType: 'image/png', buffer: Buffer.from(png2, 'base64') });
  await page.waitForSelector('#btn-ai');
  await page.locator('#btn-ai').click();
  await page.waitForSelector('.look');
  check(!!captured, 'AI 분석 요청 전송');
  if (captured) {
    const b = captured.body;
    check(b.model === 'claude-opus-5-5' && b.fallbacks === 'default', `요청 모델/대체: ${b.model}, ${b.fallbacks}`);
    check(String(captured.headers['anthropic-beta'] || '').includes('server-side-fallback-2026-07-01'), '대체 모델 베타 헤더');
    check(captured.headers['anthropic-dangerous-direct-browser-access'] === 'true', '브라우저 직접 호출 헤더');
    check(b.output_config && b.output_config.format && b.output_config.format.type === 'json_schema', '구조화 출력 스키마 전송');
    const img = b.messages[0].content.find(c => c.type === 'image');
    check(img && img.source.type === 'base64' && img.source.media_type === 'image/jpeg' && img.source.data.length > 1000, '사진을 base64 JPEG로 전송');
    check(b.messages[0].content.some(c => c.type === 'text' && c.text.includes('하의')), '사용자가 고른 종류를 힌트로 전달');
  }
  check((await page.locator('.tag').textContent()).includes('AI 분석'), 'AI 결과로 표시');
  check((await page.locator('.look h3').first().textContent()).trim() === '테스트 룩 1', 'AI 룩 렌더링');

  // 설정 화면
  await page.goto(base + '#prefs');
  await page.waitForSelector('#api-key');
  check((await page.locator('#api-key').inputValue()) === 'sk-ant-test', '설정에 API 키 표시');

  // 데스크톱 폭에서도 오류 없이 그려진다
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.goto(base + '#home');
  await page.waitForSelector('#drop');
  ok('데스크톱 폭 렌더링');

  check(errors.length === 0, errors.length ? `페이지 오류: ${errors.join(' | ')}` : '페이지 오류 없음');
} catch (e) {
  fail(`예외: ${e.message}`);
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exitCode = failed ? 1 : 0;
