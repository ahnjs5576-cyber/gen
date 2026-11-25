// 오늘의 영단어 — 날짜별 단어 고르기와 배경화면 그리기.
// 앱(index.html)과 배경화면 생성 페이지(wallpaper.html)가 함께 쓴다. words.js 다음에 불러올 것.
(function (g) {
  'use strict';

  const PER_DAY = 5;                 // 하루 단어 세트 크기(개수 설정 1~5는 앞에서부터 잘라 씀)
  const DAY = 864e5;
  const EPOCH = Date.UTC(2026, 0, 1) / DAY;
  const POS = { n: '명사', v: '동사', adj: '형용사', adv: '부사', conj: '접속사' };
  const FONT = '"Fraunces", Georgia, "Times New Roman", serif';

  const WORDS = (g.WORD_LIST || []).map(([w, pos, ko, ex, exKo]) => ({ w, pos, posKo: POS[pos] || pos, ko, ex, exKo }));

  // ── 날짜 (YYYY-MM-DD 문자열로 다룬다) ─────────────────────────
  const pad = n => String(n).padStart(2, '0');
  const fmt = t => `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  const today = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) / DAY; };
  const addDays = (s, k) => fmt(new Date((dayNum(s) + k) * DAY));
  const isDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;

  // ── 날짜 → 단어 ─────────────────────────────────────────────
  // 단어 목록을 주기마다 다른 순서로 섞고, 하루에 5개씩 차례로 쓴다.
  // 한 주기(목록 길이 ÷ 5일) 안에서는 같은 단어가 다시 나오지 않고,
  // 주기가 바뀌는 날에도 전날 단어와 겹치지 않게 맞춘다.
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function shuffled(n, cycle) {
    const a = Array.from({ length: n }, (_, i) => i);
    const r = rng(Math.imul(cycle + 1013, 2654435761) ^ 0x5EED);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const orders = new Map();
  function order(n, per, cycle) {
    const key = n + ':' + cycle;
    if (orders.has(key)) return orders.get(key);
    const a = shuffled(n, cycle);
    // 전 주기의 마지막 날 세트는 섞은 그대로 쓰이므로(아래 교환은 앞쪽만 건드림) 바로 비교할 수 있다.
    const prev = new Set(shuffled(n, cycle - 1).slice((per - 1) * PER_DAY, per * PER_DAY));
    let j = PER_DAY;
    for (let i = 0; i < PER_DAY; i++) {
      if (!prev.has(a[i])) continue;
      while (prev.has(a[j])) j++;
      [a[i], a[j]] = [a[j], a[i]];
      j++;
    }
    orders.set(key, a);
    return a;
  }
  function wordsFor(date, count = PER_DAY) {
    const n = WORDS.length, per = Math.floor(n / PER_DAY);
    const day = dayNum(date) - EPOCH;
    const cycle = Math.floor(day / per), pos = day - cycle * per;
    const k = Math.max(1, Math.min(PER_DAY, count | 0));
    return order(n, per, cycle).slice(pos * PER_DAY, pos * PER_DAY + k).map(i => WORDS[i]);
  }

  // 예문에서 단어(변화형 포함)를 찾아 [앞, 단어, 뒤]로 나눈다. 못 찾으면 null.
  function splitExample(word, sentence) {
    const w = word.toLowerCase();
    for (let len = w.length; len >= Math.max(3, w.length - 3); len--) {
      const re = new RegExp(`\\b(${w.slice(0, len).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z]*)`, 'i');
      const m = sentence.match(re);
      if (m) return [sentence.slice(0, m.index), m[1], sentence.slice(m.index + m[1].length)];
    }
    return null;
  }

  // ── 배경화면 ────────────────────────────────────────────────
  // 단어만 화면 가운데보다 조금 아래(잠금 화면 시계를 피해서)에 세로로 놓는다.
  function layout(ctx, W, H, words) {
    const k = words.length;
    const U = Math.min(W, H * 0.4615);               // 폰 세로 비율 기준 단위
    const base = U * [0, 0.19, 0.16, 0.14, 0.123, 0.11][k];
    const gap = base * (k <= 2 ? 1.75 : 1.6);
    const maxW = W * 0.84;
    const y0 = H * 0.6 - gap * (k - 1) / 2;
    return words.map((word, i) => {
      let size = base;
      ctx.font = `600 ${size}px ${FONT}`;
      let m = ctx.measureText(word.w);
      if (m.width > maxW) { size *= maxW / m.width; ctx.font = `600 ${size}px ${FONT}`; m = ctx.measureText(word.w); }
      const y = y0 + gap * i + size * 0.26;          // 소문자 높이의 가운데를 줄 위치에 맞춤
      return {
        word, size, x: W / 2, y, width: m.width,
        top: y - (m.actualBoundingBoxAscent || size * 0.75),
        bottom: y + (m.actualBoundingBoxDescent || size * 0.22),
      };
    });
  }

  let grain;
  function grainTile() {
    if (grain) return grain;
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const x = c.getContext('2d'), img = x.createImageData(128, 128), r = rng(7);
    for (let i = 0; i < img.data.length; i += 4) { const v = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0);
    return (grain = c);
  }

  function drawWallpaper(ctx, W, H, words) {
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#111a2e');
    bg.addColorStop(0.55, '#0b1120');
    bg.addColorStop(1, '#06080f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.5, H * 0.6, 0, W * 0.5, H * 0.6, Math.max(W, H) * 0.55);
    glow.addColorStop(0, 'rgba(126, 146, 255, 0.13)');
    glow.addColorStop(1, 'rgba(126, 146, 255, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 고운 입자를 살짝 깔아 그라데이션 줄무늬(밴딩)를 없앤다.
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    const items = layout(ctx, W, H, words);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f3eee3';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = items[0] ? items[0].size * 0.2 : 0;
    for (const it of items) {
      ctx.font = `600 ${it.size}px ${FONT}`;
      ctx.fillText(it.word.w, it.x, it.y);
    }
    ctx.shadowBlur = 0;
    return items;
  }

  // 웹 글꼴을 다 받은 뒤에 그려야 앱 화면과 이미지의 글자 모양이 같다.
  function fontsReady(timeout = 3000) {
    if (!g.document || !document.fonts) return Promise.resolve(false);
    const load = document.fonts.load(`600 64px "Fraunces"`).then(() => document.fonts.check(`600 64px "Fraunces"`)).catch(() => false);
    return Promise.race([load, new Promise(r => setTimeout(() => r(false), timeout))]);
  }

  function renderBlob(date, count, W, H, type = 'image/jpeg', quality = 0.92) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    drawWallpaper(c.getContext('2d'), W, H, wordsFor(date, count));
    return new Promise(r => c.toBlob(r, type, quality));
  }

  g.WordCore = { PER_DAY, WORDS, today, addDays, dayNum, isDate, wordsFor, splitExample, layout, drawWallpaper, fontsReady, renderBlob, FONT };
})(typeof window !== 'undefined' ? window : globalThis);
