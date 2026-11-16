// 브라우저 스모크 테스트: node scripts/smoke.mjs
// 음성 인식·합성을 가짜로 바꿔 끼우고, 오늘 세션 5단계 → 기록 → 복습 → 연습실 → 설정 흐름을 끝까지 돌린다.
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

// 화면에 보이는 연습 대상을 읽어 ‘말해’ 주는 가짜 인식기
const MOCK = () => {
  window.__mock = { partnerOnce: false, talk: 'My take is that walking to work is a wonderful habit. The main reason is that it clears my head before meetings. For example, yesterday I solved a tricky problem while walking. So that is why I recommend it.' };
  const pick = () => {
    const m = window.__mock;
    const big = document.querySelector('.big-word');
    if (big) {
      if (m.partnerOnce) { m.partnerOnce = false; return document.querySelector('.vs .en').textContent; }
      return big.textContent;
    }
    const s = document.querySelector('.sentence, .passage');
    const talk = document.querySelector('.transcript:not([hidden])');
    if (talk) return m.talk;
    if (s && !document.querySelector('.plain')) return s.textContent;
    const plain = document.querySelector('.better .en');
    if (plain) return plain.textContent;
    return m.upgrade || 'The movie was gripping from start to finish.';
  };
  class FakeSR {
    constructor() { this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; }
    start() {
      this._on = true;
      const text = pick();
      const mk = (t, fin) => { const alt = [{ transcript: t, confidence: 0.9 }]; alt.isFinal = fin; return alt; };
      setTimeout(() => {
        if (!this._on) return;
        const half = text.split(' ').slice(0, Math.ceil(text.split(' ').length / 2)).join(' ');
        if (this.interimResults) this.onresult && this.onresult({ resultIndex: 0, results: [mk(half, false)] });
        setTimeout(() => {
          if (!this._on) return;
          this.onresult && this.onresult({ resultIndex: 0, results: [mk(text, true)] });
          if (!this.continuous) { this._on = false; setTimeout(() => this.onend && this.onend(), 30); }
        }, 120);
      }, 120);
    }
    stop() { if (!this._on) return; this._on = false; setTimeout(() => this.onend && this.onend(), 30); }
    abort() { this.stop(); }
  }
  window.SpeechRecognition = FakeSR;
  window.webkitSpeechRecognition = FakeSR;
  const synth = {
    speak(u) { setTimeout(() => { u.onboundary && u.onboundary({ name: 'word', charIndex: 0 }); u.onend && u.onend(); }, 40); },
    cancel() {}, getVoices() { return [{ name: 'Mock US', lang: 'en-US', voiceURI: 'mock-us' }]; },
    addEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
};

const fail = m => { console.error('✗', m); process.exitCode = 1; };
const ok = m => console.log('✓', m);
const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
try {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 }, permissions: ['microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.addInitScript(MOCK);
  await page.addInitScript(() => { window.__spkTalkSeconds = 2; });
  await page.goto(base + '#today');

  const n = await page.locator('.ticket').count();
  n === 5 ? ok('오늘 세션 5단계') : fail(`단계 ${n}개`);
  (await page.locator('.intro').count()) ? ok('첫 방문 안내') : fail('안내 없음');
  await page.click('#skipintro');

  // 1. 입 풀기
  await page.waitForSelector('#wdone');
  await page.click('#wdone');
  await page.click('#nextbar a');
  ok('입 풀기 완료');

  // 2. 발음 드릴: 듣고 고르기 3 → 단어 말하기 6 (첫 단어는 짝 단어로 틀리게) → 문장
  for (let i = 0; i < 3; i++) {
    await page.waitForSelector('.choice:not([disabled])');
    await page.locator('.choice').first().click();
    await page.locator('.trial > .btn', { hasText: '다음' }).click();
  }
  await page.evaluate(() => { window.__mock.partnerOnce = true; });
  for (let i = 0; i < 6; i++) {
    await page.locator('#ph > p', { hasText: `${i + 1} / 6` }).waitFor();
    await page.waitForSelector('.big-word');
    await page.locator('[data-mic]').click();
    if (i === 0) {
      await page.waitForSelector('.verdict.bad');
      await page.locator('.trial > .btn', { hasText: '다음' }).click();
    } else {
      await page.waitForSelector('.verdict.good');
    }
  }
  await page.waitForSelector('.sentence');
  await page.locator('[data-mic]').click();
  await page.waitForSelector('#sfin .btn:not(.quiet)', { timeout: 8000 });
  const sentenceMsg = await page.locator('.heard').textContent();
  /100%/.test(sentenceMsg) ? ok('문장 100% 채점') : fail('문장 채점: ' + sentenceMsg);
  await page.click('#sfin .btn');
  await page.waitForSelector('#nextbar:not([hidden])');
  const st = await page.evaluate(() => window.__spk.state());
  const sr = st.days[await page.evaluate(() => window.__spk.today())].done.sound;
  sr.n === 6 && sr.ok === 5 ? ok('발음 드릴 5/6 기록') : fail('발음 기록 ' + JSON.stringify(sr));
  Object.keys(st.items).length === 1 ? ok('틀린 단어 복습 등록') : fail('복습 항목 ' + Object.keys(st.items).length);
  await page.click('#nextbar a');

  // 3. 섀도잉
  await page.waitForSelector('.passage');
  await page.locator('[data-mic]').click();
  await page.waitForSelector('#pdone', { timeout: 10000 });
  const acc = await page.locator('#presult .meter .v').first().textContent();
  acc.startsWith('100') ? ok('섀도잉 정확도 100%') : fail('섀도잉 ' + acc);
  await page.click('#pdone');
  await page.click('#nextbar a');

  // 4. Daily 60
  await page.waitForSelector('.prompt .q');
  await page.locator('[data-mic]').click();
  await page.waitForTimeout(1200);
  await page.locator('[data-mic]').click();
  await page.waitForSelector('.score-num', { timeout: 10000 });
  ok('Daily 60 점수: ' + (await page.locator('.score-num .mono').textContent()));
  (await page.locator('.coach li').count()) >= 2 ? ok('코치 피드백') : fail('코치 피드백 부족');
  await page.click('#tdone');
  await page.waitForSelector('#nextbar:not([hidden])');
  await page.click('#nextbar a');

  // 5. 표현 업그레이드
  await page.waitForSelector('.plain');
  await page.evaluate(() => { const u = window.SPK.upgrades.find(x => x.plain === document.querySelector('.plain').textContent); window.__mock.upgrade = u.better[0]; });
  await page.locator('[data-mic]').click();
  await page.waitForSelector('#uans:not([hidden])', { timeout: 8000 });
  (await page.locator('.live.good-text').count()) ? ok('업그레이드 핵심어 인식') : fail('핵심어 인식 실패: ' + await page.locator('.live').textContent());
  await page.click('#udone');
  await page.click('#nextbar a');

  await page.waitForSelector('.celebrate');
  ok('오늘 세션 완료 화면');
  const streak = await page.locator('.meter .v').first().textContent();
  streak.includes('1') ? ok('연속 1일') : fail('연속 ' + streak);

  // 연습실에서 Daily 60 한 번 더 → 그래프
  await page.goto(base + '#lib/topic/random');
  await page.waitForSelector('.prompt .q');
  await page.evaluate(() => { window.__mock.talk = 'Honestly I think um the best way to learn is like practice every single day and you know keep a simple routine'; });
  await page.locator('[data-mic]').click();
  await page.waitForTimeout(1000);
  await page.locator('[data-mic]').click();
  await page.waitForSelector('.score-num');
  (await page.locator('.tx mark').count()) >= 2 ? ok('군더더기 표시') : fail('군더더기 표시 없음');
  await page.click('#tdone');
  await page.waitForSelector('#nextbar:not([hidden])');

  await page.goto(base + '#stats');
  await page.waitForSelector('.chart');
  (await page.locator('.chart').count()) === 3 ? ok('기록: 그래프 3개') : fail('그래프 수');
  (await page.locator('.archive li').count()) >= 2 ? ok('목소리 기록 목록') : fail('목소리 기록');
  (await page.locator('.hbars li').count()) >= 1 ? ok('소리별 정확도') : fail('소리별 정확도');

  // 이틀 뒤로 이동해 복습
  const later = Date.now() + 86400000 * 1.2;
  await page.addInitScript(t => { const D = Date; globalThis.Date = class extends D { constructor(...a) { super(...(a.length ? a : [t])); } static now() { return t; } }; }, later);
  await page.goto(base + '#review');
  await page.reload();
  await page.waitForSelector('.big-word');
  ok('복습 화면: ' + await page.locator('.big-word').textContent());
  await page.locator('[data-mic]').click();
  await page.waitForSelector('.celebrate', { timeout: 8000 });
  ok('복습 완료');
  const badge = await page.locator('#review-badge').isHidden();
  badge ? ok('복습 배지 사라짐') : fail('복습 배지 남음');
  const ticketsNext = await page.evaluate(() => { location.hash = '#today'; return true; });
  await page.waitForSelector('.ticket');
  (await page.locator('.ticket.done').count()) === 0 ? ok('다음 날 새 세션') : fail('다음 날 세션 상태');
  const st2 = await page.locator('.meter .v').first().textContent();
  st2.includes('1') ? ok('어제 기록으로 연속 유지') : fail('연속 ' + st2);

  for (const h of ['library', 'lib/sound/r-l', 'lib/passage/p-001', 'lib/warmup/lip-trill', 'stats', 'prefs', 'review']) {
    await page.goto(base + '#' + h);
    await page.waitForSelector('main h1');
    const wide = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    wide ? fail(`#${h} 가로 넘침`) : ok(`#${h} 렌더`);
  }
  // 설정 바꾸기 → 세션 길이
  await page.goto(base + '#prefs');
  await page.locator('.seg label', { hasText: '15분' }).click();
  await page.goto(base + '#today');
  (await page.locator('.ticket').count()) === 6 ? ok('15분 세션 6단계') : fail('15분 세션 단계 수');

  // 음성 인식이 없는 브라우저
  const p2 = await ctx.newPage();
  await p2.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await p2.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; });
  p2.on('pageerror', e => errors.push('noSR: ' + e.message));
  await p2.goto(base + '#lib/sound/f-p');
  await p2.waitForSelector('.note.warn');
  ok('미지원 브라우저 안내');
  errors.length ? fail('페이지 오류: ' + errors.join(' | ')) : ok('스크립트 오류 없음');
} finally {
  await browser.close();
  server.close();
}
