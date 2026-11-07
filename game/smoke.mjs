// 메이플 어드벤처 브라우저 스모크 테스트: node game/smoke.mjs  (먼저 python3 -m http.server 8765 실행)
// 시작 → 이동/점프 → 사냥 → 포션 → 로프 → NPC 대화/퀘스트 → 포탈 → 보스맵 → 사망/부활 → 저장을 확인하고 스크린샷을 남긴다.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import os from 'node:os';
import fs from 'node:fs';
const out = process.env.SHOT_DIR || fs.mkdtempSync(os.tmpdir() + '/maple-shots-');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto('http://localhost:8765/game/');
await page.waitForTimeout(700);
await page.screenshot({ path: out + '/01-title.png' });
await page.keyboard.press('Space');
await page.waitForTimeout(500);
const st = () => page.evaluate(() => { const g = window.__maple; const p = g.player; return { mode: g.mode, x: Math.round(p.x), y: Math.round(p.y), lv: p.lv, exp: p.exp, hp: p.hp, meso: p.meso, map: g.map.name, mobs: g.mobs.filter(m=>!m.dead).length }; });
console.log('after start', await st());
// 오른쪽 이동 + 점프
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(600); await page.keyboard.press('Space'); await page.waitForTimeout(400); await page.keyboard.up('ArrowRight');
console.log('after move', await st());
// 가장 가까운 몬스터 옆으로 순간이동해 공격
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => { const g = window.__maple, p = g.player; const m = g.mobs.filter(m => !m.dead).sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0]; if (m) { p.x = m.x - 45; p.y = m.y; p.face = 1; p.invul = 200; } });
  for (let k = 0; k < 5; k++) { await page.keyboard.press('KeyZ'); await page.waitForTimeout(350); }
  await page.waitForTimeout(500);
}
await page.screenshot({ path: out + '/02-play.png' });
console.log('after hunting', await st());
// 스킬 사용 (레벨 조건 미달이면 토스트)
await page.keyboard.press('KeyX'); await page.waitForTimeout(300); await page.keyboard.press('KeyC'); await page.waitForTimeout(300);
// 포션
await page.evaluate(() => { window.__maple.player.hp = 10; });
await page.keyboard.press('Digit1'); await page.waitForTimeout(200);
console.log('after potion', await st());
// 로프 타기 테스트
await page.evaluate(() => { const p = window.__maple.player; p.x = 450; p.y = 440; });
await page.keyboard.down('ArrowUp'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowUp');
console.log('after rope', await st());
await page.screenshot({ path: out + '/03-rope.png' });
// NPC 대화
await page.evaluate(() => { const p = window.__maple.player; p.x = 110; p.y = 440; p.climbing = false; p.onGround = true; });
await page.waitForTimeout(100);
await page.keyboard.press('ArrowUp'); await page.waitForTimeout(300);
console.log('dialog visible', await page.evaluate(() => !document.getElementById('dialog').hidden), await page.textContent('#dlg-text'));
await page.screenshot({ path: out + '/04-npc.png' });
await page.keyboard.press('Digit1'); await page.waitForTimeout(200);
console.log('quest text', await page.textContent('#dlg-text'));
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
// 포탈 이동
await page.evaluate(() => { const p = window.__maple.player; p.x = 2540; p.y = 440; p.onGround = true; });
await page.waitForTimeout(100); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(600);
console.log('after portal', await st());
await page.screenshot({ path: out + '/05-ellinia.png' });
// 보스맵
await page.evaluate(() => { const p = window.__maple.player; p.x = 2740; p.y = 440; p.onGround = true; });
await page.waitForTimeout(100); await page.keyboard.press('ArrowUp'); await page.waitForTimeout(600);
await page.evaluate(() => { const g = window.__maple, p = g.player; const m = g.mobs.find(m => m.def.boss); p.x = m.x - 90; p.y = 440; p.face = 1; p.invul = 300; });
await page.waitForTimeout(200);
await page.screenshot({ path: out + '/06-boss.png' });
console.log('boss map', await st());
// 사망 → 부활
await page.evaluate(() => { const p = window.__maple.player; p.invul = 0; p.hp = 1; });
await page.waitForTimeout(1500);
console.log('after boss contact', await st());
await page.screenshot({ path: out + '/07-dead.png' });
await page.keyboard.press('KeyZ'); await page.waitForTimeout(500);
console.log('after revive', await st());
// 저장 확인
console.log('save', await page.evaluate(() => localStorage.getItem('maple-adv.v1')));
console.log('ERRORS', errors);
console.log('screenshots in', out);
if (errors.length) process.exitCode = 1;
await browser.close();
// 모바일(터치) 레이아웃 + 도움말 확인
const b2 = await chromium.launch();
const ctx2 = await b2.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
const m = await ctx2.newPage();
await m.goto('http://localhost:8765/game/'); await m.waitForTimeout(500);
await m.tap('#game'); await m.waitForTimeout(400);
await m.screenshot({ path: out + '/08-mobile.png' });
console.log('touch visible', await m.evaluate(() => !document.getElementById('touch').hidden));
await m.keyboard.press('KeyH'); await m.waitForTimeout(200);
await m.screenshot({ path: out + '/09-help.png' });
await b2.close();
