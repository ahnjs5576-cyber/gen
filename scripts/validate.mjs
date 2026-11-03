// 콘텐츠 스키마 검증: node scripts/validate.mjs [content/파일.js ...]
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(root, 'content')).filter(f => f.endsWith('.js')).map(f => path.join('content', f));

let errors = 0;
const err = (where, msg) => { errors++; console.error(`✗ ${where}: ${msg}`); };
const str = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const seen = new Set();

for (const file of files) {
  const ctx = { window: {} };
  try {
    vm.runInNewContext(fs.readFileSync(path.resolve(root, file), 'utf8'), ctx, { filename: file });
  } catch (e) { err(file, `실행 실패 — ${e.message}`); continue; }
  const subjects = ctx.window.CS_SUBJECTS || [];
  if (subjects.length !== 1) { err(file, `과목 1개를 등록해야 함 (현재 ${subjects.length})`); continue; }
  const s = subjects[0];
  const expectId = path.basename(file, '.js');
  if (s.id !== expectId) err(file, `id(${s.id})가 파일 이름(${expectId})과 다름`);
  if (!str(s.title) || !str(s.tagline)) err(file, 'title/tagline 누락');
  if (!Array.isArray(s.lessons) || s.lessons.length === 0) { err(file, 'lessons 비어 있음'); continue; }
  const answerSpread = [0, 0, 0, 0];
  s.lessons.forEach((l, i) => {
    const w = `${file} #${i + 1} ${l.id || ''}`;
    const want = `${s.id}-${String(i + 1).padStart(2, '0')}`;
    if (l.id !== want) err(w, `id는 ${want} 이어야 함`);
    if (seen.has(l.id)) err(w, 'id 중복'); seen.add(l.id);
    for (const k of ['title', 'oneLiner', 'analogy']) if (!str(l[k])) err(w, `${k} 누락`);
    if (!(Number.isInteger(l.minutes) && l.minutes >= 2 && l.minutes <= 10)) err(w, 'minutes는 2~10 정수');
    if (!Array.isArray(l.points) || l.points.length < 3 || l.points.length > 6 || !l.points.every(p => str(p))) err(w, 'points 3~6개');
    if (l.example) {
      if (!str(l.example.caption)) err(w, 'example.caption 누락');
      if (!str(l.example.code) && !str(l.example.text)) err(w, 'example에 code 또는 text 필요');
    }
    if (!Array.isArray(l.terms) || l.terms.length < 1 || !l.terms.every(t => str(t.term) && str(t.desc))) err(w, 'terms 형식 오류');
    if (l.pitfall !== undefined && !str(l.pitfall)) err(w, 'pitfall 빈 문자열');
    if (!Array.isArray(l.quiz) || l.quiz.length < 2 || l.quiz.length > 3) err(w, 'quiz 2~3문항');
    (l.quiz || []).forEach((q, j) => {
      const qw = `${w} Q${j + 1}`;
      if (!str(q.q) || !str(q.why)) err(qw, 'q/why 누락');
      if (!Array.isArray(q.choices) || q.choices.length !== 4 || !q.choices.every(c => str(c))) err(qw, 'choices 4개');
      else if (new Set(q.choices).size !== 4) err(qw, '보기 중복');
      if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3)) err(qw, 'answer 0~3');
      else answerSpread[q.answer]++;
    });
    const all = JSON.stringify(l);
    if (/<\/?[a-z][^>]*>/i.test(all.replace(/`[^`]*`/g, '').replace(/"code":"(?:[^"\\]|\\.)*"/g, ''))) err(w, 'HTML 태그 사용 금지');
  });
  const total = answerSpread.reduce((a, b) => a + b, 0);
  if (total >= 8 && Math.max(...answerSpread) > total * 0.5) err(file, `정답 위치 편중 ${answerSpread.join('/')}`);
  console.log(`✓ ${file}: ${s.lessons.length}개 레슨, 정답 분포 ${answerSpread.join('/')}`);
}
if (errors) { console.error(`\n${errors}개 오류`); process.exit(1); }
console.log('\n모든 콘텐츠 통과');
