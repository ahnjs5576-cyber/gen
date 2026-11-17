// 콘텐츠 형식 검사: node scripts/validate.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
globalThis.window = {};
for (const f of ['warmups', 'sounds', 'passages', 'topics', 'upgrades', 'rhythm']) require(path.join(root, 'content', f + '.js'));
const S = require(path.join(root, 'lib', 'score.js'));
const K = window.SPK;
let errors = 0;
const err = (where, msg) => { errors++; console.error(`✗ ${where}: ${msg}`); };
const str = (v, min = 1) => typeof v === 'string' && v.trim().length >= min;
const noHtml = (where, v) => { if (/<[a-z/][^>]*>/i.test(v)) err(where, 'HTML 태그 금지'); };
const ids = new Set();
const uniq = (where, id) => { if (!str(id)) err(where, 'id 없음'); else if (ids.has(id)) err(where, `id 중복 ${id}`); ids.add(id); };
const wc = s => s.trim().split(/\s+/).length;

const need = { warmups: 14, sounds: 14, passages: 36, topics: 120, upgrades: 72, rhythm: 18 };
for (const [k, n] of Object.entries(need)) if (!Array.isArray(K[k]) || K[k].length < n) err(k, `${n}개 이상 필요 (현재 ${K[k] ? K[k].length : 0})`);

K.warmups.forEach(w => {
  const at = `warmups/${w.id}`; uniq(at, w.id);
  if (!str(w.title)) err(at, 'title');
  if (!(w.seconds >= 20 && w.seconds <= 60)) err(at, 'seconds 20~60');
  if (!Array.isArray(w.how) || w.how.length < 2 || w.how.length > 4) err(at, 'how 2~4개');
  [w.title, w.why, ...(w.how || [])].forEach(v => v && noHtml(at, v));
  // say는 TTS로 읽으므로 실제로 발음 가능한 음절·단어만 (괄호, 같은 글자 3번 이상 늘이기 금지)
  if (w.say !== undefined) {
    if (!str(w.say)) err(at, 'say 빈 문자열 (없으면 필드를 빼기)');
    else if (/[()\[\]{}<>]/.test(w.say)) err(at, `say에 괄호 금지: ${w.say}`);
    else if (/([a-z])\1\1/i.test(w.say)) err(at, `say에 늘인 글자 금지: ${w.say}`);
    else if (/\d/.test(w.say)) err(at, 'say 숫자 금지');
  }
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
const FW = ['prep', 'star', 'ppf', 'psb', 'wsn', 'cc', 'steps', 'desc'], CAT = ['daily', 'opinion', 'work', 'explain', 'story'];
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
  // gloss에 각 key의 단어가 나와야 함 (철자 변이는 앞 5글자 일치 허용: canceled/cancelled)
  const gt = S.tokens(u.gloss || '');
  (u.keys || []).forEach(k => S.tokens(k).forEach(w => {
    if (!gt.some(g => g === w || (g.length >= 5 && w.length >= 5 && g.slice(0, 5) === w.slice(0, 5)))) err(at, `gloss에 key '${k}' 설명 없음`);
  }));
  // avoid: plain의 밋밋한 말. key를 말했어도 avoid를 말하면 실패 처리되므로 better에는 없어야 함
  if (!Array.isArray(u.avoid) || u.avoid.length < 1 || u.avoid.length > 4) err(at, 'avoid 1~4');
  (u.avoid || []).forEach(a => {
    if (!/^[a-z]+( [a-z]+){0,2}$/.test(a)) return err(at, `avoid 형식 '${a}'`);
    if (!S.keysUsed([a], u.plain).length) err(at, `avoid '${a}'가 plain에 없음`);
    (u.better || []).forEach(b => { if (S.keysUsed([a], b).length) err(at, `better 문장에 avoid '${a}': ${b}`); });
    (u.keys || []).forEach(k => { if (S.keysUsed([a], k).length) err(at, `key '${k}'에 avoid '${a}' 포함`); });
  });
  if (u.keys && S.upgradeCheck(u, u.plain).ok) err(at, `plain 문장을 그대로 말해도 통과함: ${S.keysUsed(u.keys, u.plain)}`);
  if (u.keys && u.better && !u.better.some(b => S.keysUsed(u.keys, b).length)) err(at, 'better 문장에 key가 하나도 없음');
});
const RT = ['stress', 'schwa', 'linking', 'reduction', 'focus', 'twister'];
const letters = v => String(v).toLowerCase().replace(/[^a-z]/g, '');
(K.rhythm || []).forEach(r => {
  const at = `rhythm/${r.id}`; uniq(at, r.id);
  if (!RT.includes(r.type)) err(at, `type '${r.type}'`);
  ['title', 'ko', 'tip'].forEach(f => { if (!str(r[f])) err(at, f); else noHtml(at, r[f]); });
  if (!Array.isArray(r.lines) || r.lines.length < 4 || r.lines.length > 6) err(at, 'lines 4~6개');
  (r.lines || []).forEach((l, i) => {
    const li = `${at}/lines[${i}]`;
    if (!str(l.text) || !str(l.show) || !str(l.ko)) return err(li, 'text/show/ko');
    [l.text, l.show, l.ko].forEach(v => noHtml(li, v));
    if (/\d/.test(l.text) || /\d/.test(l.show)) err(li, '숫자 금지');
    if (r.type !== 'reduction' && letters(l.text) !== letters(l.show)) err(li, `show 글자가 text와 다름: ${l.show}`);
    if (r.type === 'reduction' && letters(l.text) === letters(l.show)) err(li, 'reduction인데 show가 축약형이 아님');
    if (r.type === 'twister') { const n = wc(l.text); if (n < 6 || n > 12) err(li, `잰말놀이 단어 수 ${n}`); }
    if ((r.type === 'stress' || r.type === 'focus') && !/[A-Z]{2,}/.test(l.show.replace(/^I\b/, ''))) err(li, '강세 표시(CAPS) 없음');
    if (r.type === 'linking' && !l.show.includes('‿')) err(li, '연음 표시(‿) 없음');
  });
  if (r.type === 'focus' && r.lines && new Set(r.lines.map(l => letters(l.text))).size !== 1) err(at, 'focus는 모든 줄이 같은 문장');
});
RT.forEach(t => { const n = (K.rhythm || []).filter(r => r.type === t).length; if (n < 3) err('rhythm', `${t} ${n}개 (3 이상)`); });
if (errors) { console.error(`\n${errors}개 문제`); process.exit(1); }
console.log(`✓ 콘텐츠 OK — 입 풀기 ${K.warmups.length}, 발음 ${K.sounds.length}, 지문 ${K.passages.length}, 주제 ${K.topics.length}, 표현 ${K.upgrades.length}, 리듬 ${K.rhythm.length}`);
