// 엔진 단위 테스트: node scripts/test-engine.mjs
// 색 이름, 팔레트 추출(배경 제거), 추천 구조, 결정성, 옷장 매칭을 확인한다.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const E = require('../engine.js');

let failed = 0;
const ok = m => console.log('✓', m);
const fail = m => { console.error('✗', m); failed++; };
const eq = (a, b, m) => (a === b ? ok(m) : fail(`${m} — 기대 ${JSON.stringify(b)}, 실제 ${JSON.stringify(a)}`));
const truthy = (v, m) => (v ? ok(m) : fail(m));

// 색 이름
const names = {
  '#1c1c1e': '블랙', '#ffffff': '화이트', '#8a8f98': '그레이', '#1f2a44': '네이비', '#dcc6a6': '베이지',
  '#b5885a': '카멜', '#5a3d2b': '브라운', '#6b7f4a': '카키', '#b8343a': '레드', '#7a1f2b': '버건디',
  '#2b5fa8': '블루', '#8fb9d8': '스카이 블루', '#e58f93': '핑크', '#c99a2e': '머스타드', '#f3ead8': '크림',
};
for (const [hex, name] of Object.entries(names)) eq(E.describeHex(hex).name, name, `색 이름 ${hex} → ${name}`);
truthy(E.describeHex('#1f2a44').neutral && !E.describeHex('#b8343a').neutral, '네이비는 뉴트럴, 레드는 포인트');

// 팔레트: 가운데 네이비 옷, 가장자리 흰 배경 → 네이비가 첫 색이고 흰색은 배경으로 빠진다
function pixels(w, h, fn) {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fn(x, y); const i = (y * w + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
  return d;
}
const W = 80, H = 100;
const navyOnWhite = pixels(W, H, (x, y) => (x > 18 && x < 62 && y > 15 && y < 90) ? [31, 42, 68] : [245, 245, 243]);
const pal = E.paletteFromPixels(navyOnWhite, W, H, { max: 3 });
eq(pal[0] && pal[0].name, '네이비', '흰 배경 위 네이비 옷 → 첫 색 네이비');
truthy(!pal.some(c => c.name === '화이트'), '가장자리 흰 배경은 팔레트에서 제외');
const striped = pixels(W, H, (x, y) => (x > 18 && x < 62 && y > 15 && y < 90) ? (Math.floor(y / 6) % 2 ? [184, 52, 58] : [247, 247, 245]) : [120, 120, 120]);
const pal2 = E.paletteFromPixels(striped, W, H, { max: 3 });
truthy(pal2.length >= 2 && pal2.map(c => c.name).includes('레드'), `줄무늬 옷은 두 색 이상 (${pal2.map(c => c.name).join(', ')})`);
const onlyWhite = E.paletteFromPixels(pixels(20, 20, () => [250, 250, 250]), 20, 20, { max: 3 });
eq(onlyWhite.length, 1, '단색 이미지는 배경 제거 뒤에도 색 하나는 남는다');

// 어울리는 색
const h = E.harmony('#1f2a44');
truthy(h.some(c => c.role === 'neutral') && h.some(c => c.role === 'accent'), '네이비 → 뉴트럴과 포인트 색이 모두 있다');
truthy(new Set(h.map(c => c.name)).size === h.length, '어울리는 색 이름은 중복이 없다');
const hr = E.harmony('#b8343a');
truthy(hr.some(c => c.role === 'tone'), '레드 → 톤온톤 후보가 있다');

// 추천
const r = E.recommend({ colors: [{ hex: '#1f2a44', ratio: 0.8 }, { hex: '#f3ead8', ratio: 0.2 }], category: '상의', style: '미니멀', season: '봄가을' });
eq(r.looks.length, 3, '룩 3개');
eq(r.item.category, '상의', '종류 유지');
for (const l of r.looks) {
  const slots = l.items.map(i => i.slot);
  truthy(!slots.includes('상의') && slots.includes('하의') && slots.includes('아우터') && slots.includes('신발'), `${l.title}: 내 옷 칸은 빼고 나머지 칸을 채운다 (${slots.join(', ')})`);
  truthy(l.items.every(i => /^#[0-9a-f]{6}$/.test(i.colorHex) && i.name && i.colorName && i.reason), `${l.title}: 아이템마다 색/이름/이유가 있다`);
}
const summer = E.recommend({ colors: [{ hex: '#b8343a' }], category: '원피스', style: '러블리', season: '여름' });
truthy(summer.looks.every(l => !l.items.some(i => i.slot === '아우터' || i.slot === '상의' || i.slot === '하의')), '여름 원피스 → 아우터·상의·하의 없음');
const r2 = E.recommend({ colors: [{ hex: '#1f2a44', ratio: 0.8 }, { hex: '#f3ead8', ratio: 0.2 }], category: '상의', style: '미니멀', season: '봄가을' });
eq(JSON.stringify(r2.looks), JSON.stringify(r.looks), '같은 입력이면 같은 추천(결정적)');
truthy(r.looks[2].items.some(i => E.describeHex(i.colorHex).neutral === false), '포인트 룩에는 포인트 색이 하나 있다');
const shoes = E.recommend({ colors: [{ hex: '#e58f93' }], category: '하의', style: '캐주얼', season: '봄가을' }).looks[0].items.find(i => i.slot === '신발');
truthy(shoes && E.describeHex(shoes.colorHex).neutral, '기본 룩 신발은 뉴트럴 색');
const bad = E.recommend({ colors: [], category: '모자', style: '없음', season: '장마' });
eq(bad.item.category, '상의', '잘못된 입력은 기본값으로');

// 옷장 매칭
const closet = [
  { id: 'a', category: '하의', colors: [{ hex: '#dcc6a6', name: '베이지' }] },
  { id: 'b', category: '상의', colors: [{ hex: '#b8343a', name: '레드' }] },
  { id: 'c', category: '신발', colors: [{ hex: '#39b54a', name: '그린' }] },
];
const m = E.matchWardrobe({ category: '상의', colors: [{ hex: '#1f2a44', name: '네이비' }] }, closet);
truthy(m.length >= 1 && m[0].entry.id === 'a', '네이비 상의 ↔ 베이지 하의가 가장 잘 맞는다');
truthy(!m.some(x => x.entry.id === 'b'), '같은 칸(상의)은 매칭에서 제외');

eq(E.currentSeason(7), '여름', '7월은 여름'); eq(E.currentSeason(1), '겨울', '1월은 겨울'); eq(E.currentSeason(10), '봄가을', '10월은 봄가을');

console.log(failed ? `\n${failed}개 실패` : '\n모두 통과');
process.exitCode = failed ? 1 : 0;
