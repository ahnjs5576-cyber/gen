// 콘텐츠 형식 검사: node scripts/validate.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
for (const f of ['warmups', 'sounds', 'passages', 'topics', 'upgrades']) require(path.join(root, 'content', f + '.js'));
const S = require(path.join(root, 'lib', 'score.js'));
const K = window.SPK;
let errors = 0;
const err = (where, msg) => { errors++; console.error(`✗ ${where}: ${msg}`); };
const str = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const noHtml = (where, v) => { if (/<[a-z/][^>]*>/i.test(v)) err(where, 'HTML 태그 금지'); };
const ids = new Set();
const uniq = (where, id) => { if (!str(id)) err(where, 'id 없음'); else if (ids.has(id)) err(where, `id 중복 ${id}`); ids.add(id); };
const wc = s => s.trim().split(/\s+/).length;

const need = { warmups: 14, sounds: 14, passages: 36, topics: 120, upgrades: 72 };
for (const [k, n] of Object.entries(need)) if (!Array.isArray(K[k]) || K[k].length < n) err(k, `${n}개 이상 필요 (현재 ${K[k] ? K[k].length : 0})`);

K.warmups.forEach(w => {
  const at = `warmups/${w.id}`; uniq(at, w.id);
  if (!str(w.title)) err(at, 'title');
  if (!(w.seconds >= 20 && w.seconds <= 60)) err(at, 'seconds 20~60');
  if (!Array.isArray(w.how) || w.how.length < 2 || w.how.length > 4) err(at, 'how 2~4개');
  [w.title, w.why, ...(w.how || [])].forEach(v => v && noHtml(at, v));
});
K.sounds.forEach(s => {
  const at = `sounds/${s.id}`; uniq(at, s.id);
  ['title', 'ko', 'tip'].forEach(f => { if (!str(s[f])) err(at, f); else noHtml(at, s[f]); });
  if (!Array.isArray(s.pairs) || s.pairs.length < 6) err(at, 'pairs 6개 이상');
  (s.pairs || []).forEach((p, i) => {
    if (!Array.isArray(p) || p.length !== 2) return err(at, `pairs[${i}] 형식`);
    const a = p[0].split('|').map(x => S.tokens(x).join(' ')), b = p[1].split('|').map(x => S.tokens(x).join(' '));
    if (a.some(x => !x) || b.some(x => !x)) err(at, `pairs[${i}] 빈 단어`);
    if (a.some(x => b.includes(x))) err(at, `pairs[${i}] 양쪽에 같은 철자`);
  });
  if (!Array.isArray(s.sentences) || s.sentences.length < 3) err(at, 'sentences 3개');
  (s.sentences || []).forEach(t => { const n = wc(t); if (n < 5 || n > 16) err(at, `문장 길이 ${n}: ${t}`); if (/\d/.test(t)) err(at, '숫자 금지'); });
});
const range = { 1: [35, 50], 2: [50, 70], 3: [70, 90] };
K.passages.forEach(p => {
  const at = `passages/${p.id}`; uniq(at, p.id);
  if (![1, 2, 3].includes(p.level)) err(at, 'level');
  if (!str(p.title) || !str(p.text)) err(at, 'title/text');
  const n = wc(p.text || '');
  if (range[p.level] && (n < range[p.level][0] || n > range[p.level][1])) err(at, `단어 수 ${n}`);
  if (/\d/.test(p.text)) err(at, '숫자 금지');
  if (p.focus && !K.sounds.some(s => s.id === p.focus)) err(at, `focus ${p.focus} 없음`);
});
const FW = ['prep', 'star', 'ppf', 'psb', 'wsn', 'cc'], CAT = ['daily', 'opinion', 'work', 'explain', 'story'];
K.topics.forEach(t => {
  const at = `topics/${t.id}`; uniq(at, t.id);
  if (!CAT.includes(t.cat)) err(at, 'cat');
  if (!FW.includes(t.fw)) err(at, 'fw');
  if (!str(t.q) || !str(t.ko)) err(at, 'q/ko');
  if (!Array.isArray(t.hints) || t.hints.length < 2 || t.hints.length > 4) err(at, 'hints 2~4');
});
CAT.forEach(c => { const n = K.topics.filter(t => t.cat === c).length; if (n < 20) err('topics', `${c} ${n}개 (20 이상)`); });
K.upgrades.forEach(u => {
  const at = `upgrades/${u.id}`; uniq(at, u.id);
  if (!str(u.plain) || !str(u.ko)) err(at, 'plain/ko');
  if (!Array.isArray(u.better) || u.better.length < 2 || u.better.length > 3) err(at, 'better 2~3');
  if (!Array.isArray(u.keys) || u.keys.length < 3 || u.keys.length > 6) err(at, 'keys 3~6');
  (u.keys || []).forEach(k => { if (!/^[a-z]+( [a-z]+)?$/.test(k)) err(at, `key 형식 '${k}'`); });
  if (u.keys && S.keysUsed(u.keys, u.plain).length) err(at, `plain 문장에 이미 key 포함: ${S.keysUsed(u.keys, u.plain)}`);
  if (u.keys && u.better && !u.better.some(b => S.keysUsed(u.keys, b).length)) err(at, 'better 문장에 key가 하나도 없음');
});
if (errors) { console.error(`\n${errors}개 문제`); process.exit(1); }
console.log(`✓ 콘텐츠 OK — 입 풀기 ${K.warmups.length}, 발음 ${K.sounds.length}, 지문 ${K.passages.length}, 주제 ${K.topics.length}, 표현 ${K.upgrades.length}`);
