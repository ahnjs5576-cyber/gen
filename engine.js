/* 옷짝 — 색 분석과 코디 규칙 엔진
 * 순수 함수만 들어 있어 브라우저(window.Engine)와 Node(module.exports) 어디서나 같은 결과를 낸다.
 * 입력: 픽셀 데이터 또는 색 목록 + 옷 종류/스타일/계절. 출력: 팔레트, 어울리는 색, 코디 룩. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Engine = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // ---------- 상수 ----------
  const CATEGORIES = ['상의', '하의', '아우터', '원피스', '신발', '가방/액세서리'];
  const STYLES = ['캐주얼', '미니멀', '스트릿', '포멀', '러블리', '스포티'];
  const SEASONS = ['봄가을', '여름', '겨울'];
  const SLOTS = ['상의', '하의', '아우터', '원피스', '신발', '가방/액세서리'];

  // 종류별로 함께 맞춰야 하는 나머지 칸. 아우터는 여름이면 뺀다.
  const PARTNERS = {
    '상의': ['하의', '아우터', '신발', '가방/액세서리'],
    '하의': ['상의', '아우터', '신발', '가방/액세서리'],
    '아우터': ['상의', '하의', '신발', '가방/액세서리'],
    '원피스': ['아우터', '신발', '가방/액세서리'],
    '신발': ['상의', '하의', '아우터', '가방/액세서리'],
    '가방/액세서리': ['상의', '하의', '아우터', '신발'],
  };

  // ---------- 색 변환 ----------
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function hexToRgb(hex) {
    const h = String(hex).replace('#', '').trim();
    const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
    const n = parseInt(full, 16);
    if (Number.isNaN(n) || full.length !== 6) return { r: 128, g: 128, b: 128 };
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  function rgbToHex(r, g, b) {
    const to = v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0');
    return '#' + to(r) + to(g) + to(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const d = max - min;
    if (d < 1e-6) return { h: 0, s: 0, l };
    const s = d / (1 - Math.abs(2 * l - 1));
    let h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    return { h, s: clamp01(s), l };
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; s = clamp01(s); l = clamp01(l);
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function hslToHex(h, s, l) { const c = hslToRgb(h, s, l); return rgbToHex(c.r, c.g, c.b); }
  function hexToHsl(hex) { const c = hexToRgb(hex); return rgbToHsl(c.r, c.g, c.b); }

  // ---------- 색 이름 ----------
  // 옷 색을 부를 때 쓰는 이름으로 바꾼다. neutral 은 '무엇과도 무난한 색', warm 은 따뜻한 톤.
  function inRange(h, a, b) { return a <= b ? (h >= a && h < b) : (h >= a || h < b); }
  function nameColor(hsl) {
    const { h, s, l } = hsl;
    const warmHue = inRange(h, 330, 70);
    const mk = (name, neutral, warm) => ({ name, neutral, warm: warm === undefined ? warmHue : warm });
    if (l < 0.12) return mk('블랙', true, false);
    if (l > 0.93 && s < 0.18) return mk('화이트', true, false);
    if (s < 0.1) {
      if (l < 0.35) return mk('차콜', true, false);
      if (l < 0.68) return mk('그레이', true, false);
      return mk('라이트 그레이', true, false);
    }
    if (inRange(h, 25, 75) && l > 0.84 && s < 0.6) return mk('크림', true, true);
    if (inRange(h, 15, 55) && s < 0.55 && l >= 0.6) return mk('베이지', true, true);
    if (inRange(h, 15, 50) && l >= 0.36 && l < 0.6 && s < 0.5) return mk('카멜', true, true);
    if (inRange(h, 5, 50) && l < 0.36 && s < 0.7) return mk('브라운', true, true);
    if (inRange(h, 50, 100) && s < 0.6 && l >= 0.18 && l < 0.58) return mk('카키', true, true);
    if (inRange(h, 200, 255) && l < 0.3) return mk('네이비', true, false);
    if (inRange(h, 340, 12)) {
      if (l < 0.34) return mk('버건디', false, true);
      if (l > 0.62) return mk('핑크', false, true);
      return mk('레드', false, true);
    }
    if (inRange(h, 12, 28)) return l > 0.62 ? mk('코랄', false, true) : mk('테라코타', false, true);
    if (inRange(h, 28, 40)) return l > 0.78 ? mk('피치', false, true) : mk('오렌지', false, true);
    if (inRange(h, 40, 68)) return l < 0.55 ? mk('머스타드', false, true) : mk('옐로', false, true);
    if (inRange(h, 68, 165)) {
      if (l > 0.74) return mk('민트', false, false);
      if (l < 0.3) return mk('딥 그린', false, false);
      return mk('그린', false, false);
    }
    if (inRange(h, 165, 200)) return l > 0.7 ? mk('스카이 블루', false, false) : mk('틸', false, false);
    if (inRange(h, 200, 255)) return l > 0.7 ? mk('스카이 블루', false, false) : mk('블루', false, false);
    if (inRange(h, 255, 292)) return l > 0.7 ? mk('라벤더', false, false) : mk('퍼플', false, false);
    return l > 0.62 ? mk('핑크', false, true) : mk('마젠타', false, true);
  }
  function describeHex(hex) {
    const hsl = hexToHsl(hex);
    const n = nameColor(hsl);
    return { hex: hslToHex(hsl.h, hsl.s, hsl.l), name: n.name, neutral: n.neutral, warm: n.warm, hsl };
  }

  // ---------- 픽셀 → 팔레트 ----------
  // data: RGBA 바이트 배열(ImageData.data). 가운데 픽셀에 가중치를 주고,
  // 가장자리에 몰린 밝은 색은 배경으로 보고 뺀다.
  function paletteFromPixels(data, width, height, opts) {
    const max = (opts && opts.max) || 3;
    const bins = new Map();
    const cx = (width - 1) / 2, cy = (height - 1) / 2;
    const sigma = Math.max(width, height) * 0.38;
    const edgeX = width * 0.08, edgeY = height * 0.08;
    let total = 0, edgeTotal = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const a = data[i + 3];
        if (a < 128) continue;
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const dx = x - cx, dy = y - cy;
        const w = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
        const isEdge = x < edgeX || y < edgeY || x >= width - edgeX || y >= height - edgeY;
        const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        let bin = bins.get(key);
        if (!bin) { bin = { w: 0, edge: 0, r: 0, g: 0, b: 0 }; bins.set(key, bin); }
        bin.w += w; bin.r += r * w; bin.g += g * w; bin.b += b * w;
        if (isEdge) { bin.edge += 1; edgeTotal += 1; }
        total += w;
      }
    }
    if (!total) return [];
    let list = Array.from(bins.values()).map(bin => ({
      w: bin.w, edge: bin.edge, r: bin.r / bin.w, g: bin.g / bin.w, b: bin.b / bin.w,
    }));
    // 비슷한 색은 하나로 합친다 (RGB 거리 기준).
    list.sort((a, b) => b.w - a.w);
    const merged = [];
    for (const c of list) {
      const near = merged.find(m => dist(m, c) < 42);
      if (near) {
        const w = near.w + c.w;
        near.r = (near.r * near.w + c.r * c.w) / w;
        near.g = (near.g * near.w + c.g * c.w) / w;
        near.b = (near.b * near.w + c.b * c.w) / w;
        near.w = w; near.edge += c.edge;
      } else merged.push(Object.assign({}, c));
    }
    // 배경 제거: 가장자리 픽셀의 절반 이상을 차지하는 밝거나 단조로운 색은 뺀다. 단, 그것뿐이면 남긴다.
    const bg = merged.filter(m => {
      if (!edgeTotal) return false;
      const share = m.edge / edgeTotal;
      const hsl = rgbToHsl(m.r, m.g, m.b);
      const plain = hsl.s < 0.25 || hsl.l > 0.85;
      return share >= 0.45 && plain;
    });
    let fg = merged.filter(m => !bg.includes(m));
    if (!fg.length) fg = merged;
    const sum = fg.reduce((s, m) => s + m.w, 0);
    // 비중이 아주 작은 색(경계선 번짐 등)과 같은 이름의 색은 뺀다. 첫 색은 항상 남긴다.
    const seen = new Set();
    const out = [];
    for (const m of fg) {
      const d = describeHex(rgbToHex(m.r, m.g, m.b));
      const ratio = m.w / sum;
      if (out.length && (ratio < 0.04 || seen.has(d.name))) continue;
      seen.add(d.name);
      out.push({ hex: d.hex, name: d.name, neutral: d.neutral, warm: d.warm, ratio });
      if (out.length >= max) break;
    }
    const kept = out.reduce((s, c) => s + c.ratio, 0);
    out.forEach(c => { c.ratio = c.ratio / kept; });
    return out;
  }
  function dist(a, b) { const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b; return Math.sqrt(dr * dr + dg * dg + db * db); }

  // ---------- 조화 색 ----------
  const WARM_NEUTRALS = [['#f3ead8', '크림'], ['#dcc6a6', '베이지'], ['#b5885a', '카멜'], ['#5a3d2b', '브라운'], ['#f7f7f5', '화이트'], ['#1c1c1e', '블랙']];
  const COOL_NEUTRALS = [['#f7f7f5', '화이트'], ['#d6d8dc', '라이트 그레이'], ['#8a8f98', '그레이'], ['#1f2a44', '네이비'], ['#1c1c1e', '블랙'], ['#3a3d44', '차콜']];
  // 뉴트럴 옷에 잘 붙는 포인트 색
  const ACCENT_FOR_NEUTRAL = {
    '블랙': [['#7a1f2b', '버건디'], ['#c99a2e', '머스타드'], ['#b8343a', '레드'], ['#d6d8dc', '라이트 그레이']],
    '화이트': [['#2b5fa8', '블루'], ['#1f2a44', '네이비'], ['#b5885a', '카멜'], ['#e58f93', '핑크']],
    '차콜': [['#7a1f2b', '버건디'], ['#2b5fa8', '블루'], ['#f3ead8', '크림'], ['#c99a2e', '머스타드']],
    '그레이': [['#1f2a44', '네이비'], ['#e58f93', '핑크'], ['#2b5fa8', '블루'], ['#7a1f2b', '버건디']],
    '라이트 그레이': [['#1f2a44', '네이비'], ['#8fb9d8', '스카이 블루'], ['#c9a6d8', '라벤더'], ['#b8343a', '레드']],
    '네이비': [['#f7f7f5', '화이트'], ['#dcc6a6', '베이지'], ['#7a1f2b', '버건디'], ['#c99a2e', '머스타드']],
    '베이지': [['#1f2a44', '네이비'], ['#7a1f2b', '버건디'], ['#5a3d2b', '브라운'], ['#f7f7f5', '화이트'], ['#6b7f4a', '카키']],
    '크림': [['#1f2a44', '네이비'], ['#b5885a', '카멜'], ['#6b7f4a', '카키'], ['#8fb9d8', '스카이 블루']],
    '카멜': [['#f3ead8', '크림'], ['#1f2a44', '네이비'], ['#1c1c1e', '블랙'], ['#7a1f2b', '버건디']],
    '브라운': [['#f3ead8', '크림'], ['#dcc6a6', '베이지'], ['#1f2a44', '네이비'], ['#6b7f4a', '카키']],
    '카키': [['#f7f7f5', '화이트'], ['#1c1c1e', '블랙'], ['#d9772f', '오렌지'], ['#f3ead8', '크림']],
  };
  function swatch(hex, name, role, reason) { return { hex, name, role, reason }; }

  // 기준 색 하나를 받아 어울리는 색 후보를 역할(neutral / tone / accent)과 이유와 함께 돌려준다.
  function harmony(hex) {
    const base = describeHex(hex);
    const { h, s, l } = base.hsl;
    const out = [];
    const neutrals = (base.warm ? WARM_NEUTRALS : COOL_NEUTRALS).filter(([, n]) => n !== base.name);
    neutrals.forEach(([nh, nn]) => out.push(swatch(nh, nn, 'neutral',
      base.warm ? `${base.name}의 따뜻한 기운을 ${nn}이(가) 부드럽게 받아줘요` : `${base.name}의 차분한 톤과 ${nn}이(가) 깔끔하게 맞아요`)));
    if (base.neutral) {
      (ACCENT_FOR_NEUTRAL[base.name] || ACCENT_FOR_NEUTRAL['그레이']).forEach(([ah, an]) => {
        const isNeutral = describeHex(ah).neutral;
        out.push(swatch(ah, an, isNeutral ? 'neutral' : 'accent', isNeutral
          ? `${base.name}과(와) ${an}은(는) 함께 두면 늘 깔끔한 기본 조합이에요`
          : `${base.name}은(는) 어떤 색과도 무난해서 ${an}으로 포인트를 주기 좋아요`));
      });
      // 모노톤: 같은 계열에서 밝기를 바꾼 색
      const lighter = l < 0.5 ? Math.min(0.92, l + 0.35) : Math.max(0.12, l - 0.35);
      const tone = describeHex(hslToHex(h, Math.min(s, 0.25), lighter));
      if (tone.name !== base.name) out.push(swatch(tone.hex, tone.name, 'tone', `${base.name}과(와) ${tone.name}으로 밝기만 다르게 두면 정돈된 모노톤이 돼요`));
    } else {
      const lighter = describeHex(hslToHex(h, s * 0.75, Math.min(0.9, l + 0.28)));
      const darker = describeHex(hslToHex(h, s * 0.85, Math.max(0.15, l - 0.28)));
      [lighter, darker].forEach(t => {
        if (t.name !== base.name) out.push(swatch(t.hex, t.name, 'tone', `${base.name}과(와) 같은 계열의 ${t.name}으로 톤온톤을 만들면 세련돼 보여요`));
      });
      const comp = describeHex(hslToHex(h + 180, Math.min(0.55, s * 0.6), 0.48));
      out.push(swatch(comp.hex, comp.name, 'accent', `${base.name}의 보색인 ${comp.name}을(를) 채도를 낮춰 쓰면 서로를 살려줘요`));
      const analog = describeHex(hslToHex(h + 35, Math.min(0.5, s * 0.6), 0.55));
      if (analog.name !== base.name) out.push(swatch(analog.hex, analog.name, 'accent', `${base.name} 옆 색상인 ${analog.name}은(는) 자연스럽게 이어지는 느낌을 줘요`));
    }
    // 같은 이름은 한 번만
    const seen = new Set();
    return out.filter(c => { if (seen.has(c.name)) return false; seen.add(c.name); return true; });
  }

  // ---------- 아이템 카탈로그 ----------
  // 칸 → 스타일 → 계절 → 아이템 이름. 신발과 가방은 색을 보수적으로 고른다.
  const CATALOG = {
    '상의': {
      '캐주얼': { '봄가을': ['스웻셔츠', '긴팔 티셔츠', '옥스포드 셔츠'], '여름': ['반팔 티셔츠', '린넨 셔츠'], '겨울': ['라운드 니트', '후드 티셔츠'] },
      '미니멀': { '봄가을': ['무지 티셔츠', '셔츠 블라우스'], '여름': ['슬리브리스 탑', '린넨 셔츠'], '겨울': ['터틀넥 니트', '캐시미어 니트'] },
      '스트릿': { '봄가을': ['오버핏 후드', '그래픽 티셔츠'], '여름': ['오버핏 반팔 티셔츠', '저지 탑'], '겨울': ['헤비 후드', '플리스 집업'] },
      '포멀': { '봄가을': ['드레스 셔츠', '실크 블라우스'], '여름': ['반팔 셔츠', '얇은 블라우스'], '겨울': ['터틀넥', '울 니트'] },
      '러블리': { '봄가을': ['프릴 블라우스', '크롭 가디건'], '여름': ['퍼프 소매 블라우스', '리본 탑'], '겨울': ['앙고라 니트', '케이블 니트'] },
      '스포티': { '봄가을': ['트랙 탑', '기능성 긴팔 티셔츠'], '여름': ['드라이 티셔츠', '러닝 싱글렛'], '겨울': ['플리스 집업', '기모 후드'] },
    },
    '하의': {
      '캐주얼': { '봄가을': ['스트레이트 데님', '치노 팬츠'], '여름': ['린넨 팬츠', '버뮤다 쇼츠'], '겨울': ['코듀로이 팬츠', '기모 데님'] },
      '미니멀': { '봄가을': ['와이드 슬랙스', '테이퍼드 팬츠'], '여름': ['린넨 와이드 팬츠', '미디 스커트'], '겨울': ['울 슬랙스', '롱 스커트'] },
      '스트릿': { '봄가을': ['카고 팬츠', '와이드 데님'], '여름': ['나일론 쇼츠', '와이드 데님'], '겨울': ['카고 팬츠', '조거 팬츠'] },
      '포멀': { '봄가을': ['슬랙스', 'H라인 스커트'], '여름': ['얇은 슬랙스', '플리츠 스커트'], '겨울': ['울 슬랙스', '울 스커트'] },
      '러블리': { '봄가을': ['플레어 스커트', '하이웨스트 데님'], '여름': ['플리츠 미니 스커트', '린넨 쇼츠'], '겨울': ['니트 스커트', '코듀로이 스커트'] },
      '스포티': { '봄가을': ['조거 팬츠', '트랙 팬츠'], '여름': ['러닝 쇼츠', '테니스 스커트'], '겨울': ['기모 조거 팬츠', '트랙 팬츠'] },
    },
    '아우터': {
      '캐주얼': { '봄가을': ['데님 재킷', '가디건', '블루종'], '겨울': ['패딩', '더플 코트'] },
      '미니멀': { '봄가을': ['트렌치 코트', '맥 코트'], '겨울': ['울 싱글 코트', '숏 패딩'] },
      '스트릿': { '봄가을': ['워크 재킷', '바람막이'], '겨울': ['숏 패딩', '플리스 재킷'] },
      '포멀': { '봄가을': ['블레이저', '트렌치 코트'], '겨울': ['울 코트', '체스터 코트'] },
      '러블리': { '봄가을': ['트위드 재킷', '숏 가디건'], '겨울': ['더플 코트', '페이크 퍼 재킷'] },
      '스포티': { '봄가을': ['바람막이', '트랙 재킷'], '겨울': ['경량 패딩', '플리스 재킷'] },
    },
    '원피스': {
      '캐주얼': { '봄가을': ['셔츠 원피스'], '여름': ['린넨 원피스'], '겨울': ['니트 원피스'] },
      '미니멀': { '봄가을': ['슬립 원피스'], '여름': ['슬리브리스 원피스'], '겨울': ['울 원피스'] },
      '스트릿': { '봄가을': ['후드 원피스'], '여름': ['티셔츠 원피스'], '겨울': ['스웻 원피스'] },
      '포멀': { '봄가을': ['시스 원피스'], '여름': ['랩 원피스'], '겨울': ['울 원피스'] },
      '러블리': { '봄가을': ['플로럴 원피스'], '여름': ['퍼프 소매 원피스'], '겨울': ['벨벳 원피스'] },
      '스포티': { '봄가을': ['테니스 원피스'], '여름': ['저지 원피스'], '겨울': ['니트 원피스'] },
    },
    '신발': {
      '캐주얼': { '봄가을': ['스니커즈', '첼시 부츠'], '여름': ['캔버스 스니커즈', '샌들'], '겨울': ['첼시 부츠', '스니커즈'] },
      '미니멀': { '봄가을': ['로퍼', '미니멀 스니커즈'], '여름': ['뮬', '스트랩 샌들'], '겨울': ['앵클 부츠', '로퍼'] },
      '스트릿': { '봄가을': ['청키 스니커즈', '하이탑 스니커즈'], '여름': ['슬라이드', '하이탑 스니커즈'] , '겨울': ['워커 부츠', '청키 스니커즈'] },
      '포멀': { '봄가을': ['로퍼', '펌프스'], '여름': ['슬링백', '로퍼'], '겨울': ['앵클 부츠', '옥스포드 슈즈'] },
      '러블리': { '봄가을': ['메리제인', '발레 플랫'], '여름': ['스트랩 샌들', '발레 플랫'], '겨울': ['앵클 부츠', '메리제인'] },
      '스포티': { '봄가을': ['러닝화', '코트 스니커즈'], '여름': ['러닝화', '스포츠 샌들'], '겨울': ['러닝화', '하이킹 부츠'] },
    },
    '가방/액세서리': {
      '캐주얼': { '봄가을': ['크로스백', '볼캡'], '여름': ['에코백', '볼캡'], '겨울': ['머플러', '비니'] },
      '미니멀': { '봄가을': ['가죽 토트백', '얇은 실버 목걸이'], '여름': ['미니 숄더백', '얇은 뱅글'], '겨울': ['울 머플러', '가죽 토트백'] },
      '스트릿': { '봄가을': ['메신저백', '버킷햇'], '여름': ['나일론 크로스백', '버킷햇'], '겨울': ['비니', '메신저백'] },
      '포멀': { '봄가을': ['스트럭처드 토트백', '가죽 벨트'], '여름': ['미니 핸드백', '얇은 벨트'], '겨울': ['캐시미어 머플러', '가죽 토트백'] },
      '러블리': { '봄가을': ['미니 숄더백', '헤어 리본'], '여름': ['라탄 백', '진주 귀걸이'], '겨울': ['니트 머플러', '베레모'] },
      '스포티': { '봄가을': ['백팩', '볼캡'], '여름': ['벨트백', '스포츠 캡'], '겨울': ['백팩', '비니'] },
    },
  };
  function itemsFor(slot, style, season) {
    const bySlot = CATALOG[slot] || {};
    const byStyle = bySlot[style] || bySlot['캐주얼'] || {};
    return byStyle[season] || byStyle['봄가을'] || Object.values(byStyle)[0] || ['아이템'];
  }

  // ---------- 결정적 선택 ----------
  function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function pick(arr, seed, offset) { if (!arr.length) return undefined; return arr[(seed + (offset || 0)) % arr.length]; }

  // ---------- 추천 ----------
  // input: { colors: [{hex, name?, ratio?}], category, style, season }
  // 돌려주는 모양은 AI 분석 결과와 같다(화면에서 똑같이 그린다).
  function recommend(input) {
    const category = CATEGORIES.includes(input.category) ? input.category : '상의';
    const style = STYLES.includes(input.style) ? input.style : '캐주얼';
    const season = SEASONS.includes(input.season) ? input.season : '봄가을';
    const colors = (input.colors || []).slice(0, 3).map(c => Object.assign(describeHex(c.hex), c.ratio != null ? { ratio: c.ratio } : {}));
    if (!colors.length) colors.push(describeHex('#888888'));
    const main = colors[0];
    const seed = hashStr(main.hex + category + style + season);
    const pal = harmony(main.hex);
    const neutrals = pal.filter(c => c.role === 'neutral');
    const tones = pal.filter(c => c.role === 'tone');
    const accents = pal.filter(c => c.role === 'accent');
    let partners = PARTNERS[category].slice();
    if (season === '여름') partners = partners.filter(p => p !== '아우터');

    const lightNeutrals = neutrals.filter(c => hexToHsl(c.hex).l > 0.6);
    const darkNeutrals = neutrals.filter(c => hexToHsl(c.hex).l <= 0.6);
    const mainIsLight = main.hsl.l > 0.6;
    // 밝은 옷엔 어두운 뉴트럴, 어두운 옷엔 밝은 뉴트럴을 먼저 붙여 대비를 만든다.
    const contrastNeutrals = (mainIsLight ? darkNeutrals : lightNeutrals).concat(mainIsLight ? lightNeutrals : darkNeutrals);
    const shoeNeutrals = neutrals.filter(c => ['화이트', '블랙', '브라운', '카멜', '네이비', '차콜'].includes(c.name));

    function itemFor(slot, color, offset) {
      const name = pick(itemsFor(slot, style, season), seed, offset);
      let reason = color.reason;
      if (color.role === 'neutral') {
        if (slot === '신발') reason = `신발을 ${color.name}으로 두면 전체 룩이 가볍게 정돈돼요`;
        else if (slot === '가방/액세서리') reason = `소품은 ${color.name}으로 맞추면 과하지 않게 마무리돼요`;
        else if (slot === '아우터') reason = `${color.name} ${name}은(는) ${main.name}을(를) 가리지 않고 감싸 주는 색이에요`;
      }
      return { slot, name, colorHex: color.hex, colorName: color.name, reason };
    }
    function buildLook(title, concept, colorPlan, tip) {
      const items = partners.map((slot, i) => {
        let color;
        if (slot === '신발') color = colorPlan.shoes || pick(shoeNeutrals.length ? shoeNeutrals : neutrals, seed, i);
        else if (slot === '가방/액세서리') color = colorPlan.acc || pick(neutrals, seed, i + 1);
        else color = colorPlan.pick(slot, i);
        return itemFor(slot, color, i);
      });
      return { title, concept, items, tip };
    }

    const looks = [];
    // 1. 기본 룩: 전부 뉴트럴, 대비 우선
    looks.push(buildLook(
      '기본 룩',
      `${main.name} ${category}를 중심에 두고 나머지는 무난한 색으로만 채운 실패 없는 조합이에요.`,
      { pick: (slot, i) => pick(contrastNeutrals.length ? contrastNeutrals : neutrals, seed, i) },
      mainIsLight ? '밝은 옷이니 하의나 신발 중 하나는 어두운 색으로 눌러 주면 균형이 잡혀요.' : '어두운 옷이니 한 군데는 밝은 색을 넣어 무거워 보이지 않게 하세요.'
    ));
    // 2. 톤온톤 / 모노톤 룩
    const toneColor = tones[0] || pick(neutrals, seed, 2);
    const toneSlot = partners.find(p => p !== '신발' && p !== '가방/액세서리') || partners[0];
    looks.push(buildLook(
      main.neutral ? '모노톤 룩' : '톤온톤 룩',
      main.neutral
        ? `${main.name}과(와) 밝기만 다른 ${toneColor.name}을(를) 섞어 차분하고 정돈된 인상을 줘요.`
        : `${main.name} 계열의 ${toneColor.name}을(를) 더해 한 가지 색으로 깊이를 만든 조합이에요.`,
      { pick: (slot, i) => slot === toneSlot ? toneColor : pick(neutrals, seed, i + 3) },
      '같은 계열이라도 소재를 다르게(니트+데님, 셔츠+울) 쓰면 단조롭지 않아요.'
    ));
    // 3. 포인트 룩
    const accent = accents.find(c => !describeHex(c.hex).neutral) || accents[0] || pick(neutrals, seed, 4);
    const accentSlot = partners.find(p => p !== '신발') || partners[0];
    looks.push(buildLook(
      '포인트 룩',
      `${accent.name}을(를) 한 군데만 넣어 ${main.name} ${category}가 더 또렷해 보이는 조합이에요.`,
      {
        pick: (slot, i) => slot === accentSlot ? accent : pick(neutrals, seed, i + 5),
        acc: accentSlot === '가방/액세서리' ? accent : undefined,
      },
      '포인트 색은 한 곳에만 쓰고 나머지는 무채색으로 비워 두는 게 핵심이에요.'
    ));

    const summary = `${main.warm ? '따뜻한' : '차분한'} 톤의 ${main.name} ${category}` +
      (colors.length > 1 ? ` (${colors.slice(1).map(c => c.name).join(', ')} 포인트)` : '');
    return {
      source: 'engine',
      item: {
        category, style, season, name: `${main.name} ${category}`,
        colors: colors.map(c => ({ hex: c.hex, name: c.name, ratio: c.ratio })),
        pattern: '', material: '', summary,
      },
      palette: pal,
      looks,
    };
  }

  // ---------- 옷장 매칭 ----------
  // wardrobe: [{id, category, colors:[{hex,name}]}] 중 다른 칸에 있고 색이 어울리는 것을 점수순으로.
  function matchWardrobe(item, wardrobe) {
    if (!item || !item.colors || !item.colors.length) return [];
    const base = describeHex(item.colors[0].hex);
    const pal = harmony(base.hex);
    const rank = Object.fromEntries(pal.map((c, i) => [c.name, i]));
    const out = [];
    for (const w of wardrobe || []) {
      if (!w || w.category === item.category || !w.colors || !w.colors.length) continue;
      const main = describeHex(w.colors[0].hex);
      let score = 0, reason = '';
      if (rank[main.name] != null) {
        score = 4; reason = pal[rank[main.name]].reason;
      } else if (main.neutral) {
        score = 3; reason = `${main.name}은(는) 무난한 색이라 ${base.name}과(와)도 잘 어울려요`;
      } else if (base.neutral) {
        score = 2; reason = `${base.name}은(는) 무난해서 ${main.name} 포인트를 받아 주기 좋아요`;
      } else {
        const d = Math.abs(base.hsl.h - main.hsl.h);
        const diff = Math.min(d, 360 - d);
        if (diff <= 40) { score = 1; reason = `${base.name}과(와) ${main.name}은(는) 가까운 색이라 자연스럽게 이어져요`; }
        else if (Math.abs(diff - 180) <= 30) { score = 1; reason = `${base.name}과(와) ${main.name}은(는) 보색이라 서로를 또렷하게 살려요`; }
      }
      if (score) out.push({ entry: w, score, reason });
    }
    return out.sort((a, b) => b.score - a.score);
  }

  function currentSeason(month) {
    const m = month == null ? new Date().getMonth() + 1 : month;
    if (m >= 6 && m <= 8) return '여름';
    if (m === 12 || m <= 2) return '겨울';
    return '봄가을';
  }

  return {
    CATEGORIES, STYLES, SEASONS, SLOTS,
    hexToRgb, rgbToHex, rgbToHsl, hslToRgb, hslToHex, hexToHsl,
    nameColor, describeHex, paletteFromPixels, harmony, recommend, matchWardrobe, currentSeason, itemsFor,
  };
});
