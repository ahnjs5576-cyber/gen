// 레슨 데이터 점검: 구조, 선택지 수, 짝이 안 맞는 $, 이스케이프 누락으로 사라진 백슬래시
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
vm.createContext(ctx);
for (const f of ['src/content/part1.js', 'src/content/part2.js']) vm.runInContext(readFileSync(join(root, f), 'utf8'), ctx);
const { STAT_LESSONS: L, STAT_UNITS: U } = ctx.window;

const errors = [];
const strings = [];
const walk = (o, p) => {
  if (typeof o === 'string') strings.push([p, o]);
  else if (o && typeof o === 'object') for (const k of Object.keys(o)) walk(o[k], `${p}.${k}`);
};
L.forEach((l, i) => {
  if (l.id !== i + 1) errors.push(`id 순서: ${l.id}`);
  if (!U.some((u) => u.id === l.unit)) errors.push(`L${l.id}: 없는 단원 ${l.unit}`);
  for (const k of ['title', 'hook', 'body', 'formulas', 'example', 'pitfall', 'quiz', 'cards', 'summary']) if (!l[k]) errors.push(`L${l.id}: ${k} 없음`);
  l.quiz.forEach((q, qi) => {
    if (q.choices.length !== 4) errors.push(`L${l.id} Q${qi + 1}: 선택지 ${q.choices.length}개`);
    if (new Set(q.choices).size !== q.choices.length) errors.push(`L${l.id} Q${qi + 1}: 중복 선택지`);
  });
  walk(l, `L${l.id}`);
});
const lost = /(^|[^\\a-zA-Z])(frac|mid|lambda|sigma|sqrt|operatorname|theta|alpha|infty|binom|cdot|varepsilon|partial|approx|chi|rho|xrightarrow|overset|mathbf|hat|bar)(?![a-zA-Z])/;
for (const [p, s] of strings) {
  if (/[\n\r\t\b\f\v]/.test(s)) errors.push(`${p}: 제어 문자 (이스케이프 누락?)`);
  const dollars = (s.match(/\$/g) || []).length;
  if (dollars % 2) errors.push(`${p}: $ 개수가 홀수`);
  for (const m of s.match(/\$[^$]+\$/g) || []) {
    const stripped = m.replace(/\\text\{[^}]*\}/g, '').replace(/\\[a-zA-Z]+/g, '');
    if (lost.test(stripped)) errors.push(`${p}: 백슬래시가 빠진 듯한 수식 ${m}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`OK: 단원 ${U.length}개, 레슨 ${L.length}개, 퀴즈 ${L.reduce((a, l) => a + l.quiz.length, 0)}문항, 카드 ${L.reduce((a, l) => a + l.cards.length, 0)}장`);
