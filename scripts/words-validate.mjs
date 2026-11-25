// 영단어 데이터 검사: node scripts/words-validate.mjs
// 형식, 중복, 예문 속 단어 표시, 날짜별 배정(겹침 없음)을 확인한다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
ctx.globalThis = ctx.window;
vm.createContext(ctx);
for (const f of ['words/words.js', 'words/core.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
const C = ctx.window.WordCore;
const list = ctx.window.WORD_LIST;

let errors = 0;
const err = (w, m) => { errors++; console.error(`✗ ${w}: ${m}`); };
const POS = new Set(['n', 'v', 'adj', 'adv', 'conj']);
const seen = new Set();

list.forEach((row, i) => {
  const where = `#${i + 1} ${row && row[0]}`;
  if (!Array.isArray(row) || row.length !== 5 || !row.every(s => typeof s === 'string' && s.trim())) return err(where, '[단어, 품사, 뜻, 예문, 해석] 다섯 칸이 모두 필요');
  const [w, pos, ko, ex, exKo] = row;
  if (!/^[a-z][a-z-]*$/.test(w)) err(where, '단어는 영문 소문자');
  if (seen.has(w)) err(where, '중복 단어');
  seen.add(w);
  if (!POS.has(pos)) err(where, `품사 ${pos}`);
  if (/[a-z]{3,}/i.test(ko)) err(where, '뜻은 한국어로');
  if (!/^[A-Z"']/.test(ex) || !/[.!?]$/.test(ex)) err(where, '예문은 대문자로 시작해 문장부호로 끝나야 함');
  if (ex.length > 90) err(where, `예문이 너무 김 (${ex.length}자)`);
  if (!/[가-힣]/.test(exKo)) err(where, '해석은 한국어로');
  if (!C.splitExample(w, ex)) err(where, '예문에서 단어를 찾지 못함');
});

// 날짜별 배정: 1년 동안 하루 안, 이웃한 날 사이에 겹치는 단어가 없어야 한다.
let prev = null;
for (let d = 0, day = '2026-01-01'; d < 730; d++, day = C.addDays(day, 1)) {
  const ws = C.wordsFor(day, 5).map(w => w.w);
  if (ws.length !== 5 || new Set(ws).size !== 5) err(day, `하루 단어 ${ws.join(',')}`);
  if (prev && ws.some(w => prev.includes(w))) err(day, `전날과 겹침 ${ws.filter(w => prev.includes(w)).join(',')}`);
  prev = ws;
}
const per = Math.floor(list.length / 5);
const cycle = new Set();
for (let d = 0, day = '2026-01-01'; d < per; d++, day = C.addDays(day, 1)) C.wordsFor(day, 5).forEach(w => cycle.add(w.w));
if (cycle.size !== per * 5) err('주기', `${per}일 동안 ${cycle.size}개만 나옴`);

if (errors) { console.error(`\n${errors}개 문제`); process.exit(1); }
console.log(`✓ 단어 ${list.length}개 · 하루 5개 기준 ${per}일 동안 겹침 없음 · 2년치 배정 확인`);
