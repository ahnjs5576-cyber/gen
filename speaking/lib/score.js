/* 하루 스피킹 — 채점 유틸리티 (순수 함수)
 * 브라우저에서는 window.SPKScore, Node에서는 module.exports 로 쓴다. */
(function (root) {
  'use strict';

  const NUM = {
    0: 'zero', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 9: 'nine',
    10: 'ten', 11: 'eleven', 12: 'twelve', 13: 'thirteen', 14: 'fourteen', 15: 'fifteen', 16: 'sixteen',
    17: 'seventeen', 18: 'eighteen', 19: 'nineteen', 20: 'twenty', 30: 'thirty', 40: 'forty', 50: 'fifty',
    60: 'sixty', 70: 'seventy', 80: 'eighty', 90: 'ninety', 100: 'hundred',
  };
  // 인식기가 다르게 적어도 같은 말로 보는 표기
  const SAME = {
    okay: 'ok', alright: 'all right', gonna: 'going to', wanna: 'want to', till: 'until',
    'e-mail': 'email', cannot: 'can not', percent: 'percent', mr: 'mister', ms: 'miss', mrs: 'missus',
    favourite: 'favorite', colour: 'color', centre: 'center', organise: 'organize', realise: 'realize',
    theatre: 'theater', travelling: 'traveling', grey: 'gray', practise: 'practice',
  };

  function numberWords(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return '';
    if (NUM[n]) return n === 100 ? 'one hundred' : NUM[n];
    if (n < 100) return NUM[Math.floor(n / 10) * 10] + ' ' + NUM[n % 10];
    if (n < 1000) {
      const h = Math.floor(n / 100), r = n % 100;
      return NUM[h] + ' hundred' + (r ? ' ' + numberWords(r) : '');
    }
    return String(n);
  }

  /** 소문자, 문장부호 제거, 숫자→단어, 표기 통일 후 단어 배열 */
  function tokens(text) {
    if (!text) return [];
    let s = String(text).toLowerCase()
      .replace(/[‘’ʼ`]/g, "'")
      .replace(/[–—]/g, ' ')
      .replace(/&/g, ' and ')
      .replace(/%/g, ' percent ')
      .replace(/(\d+)(st|nd|rd|th)\b/g, '$1')
      .replace(/\d+/g, m => ' ' + numberWords(m) + ' ')
      .replace(/-/g, ' ')
      .replace(/[^a-z' ]+/g, ' ');
    const out = [];
    s.split(/\s+/).forEach(w => {
      w = w.replace(/^'+|'+$/g, '');
      if (!w) return;
      w = w.replace(/'/g, '');
      const m = SAME[w];
      if (m) m.split(' ').forEach(x => out.push(x)); else out.push(w);
    });
    return out;
  }

  /** 정답 문장(target)과 말한 문장(spoken)을 LCS로 맞춰, 정답 단어마다 맞았는지 표시 */
  function align(target, spoken) {
    const T = Array.isArray(target) ? target : tokens(target);
    const S = Array.isArray(spoken) ? spoken : tokens(spoken);
    const n = T.length, m = S.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[i][j] = T[i] === S[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    const hit = new Array(n).fill(false);
    let i = 0, j = 0, extra = 0;
    while (i < n && j < m) {
      if (T[i] === S[j]) { hit[i] = true; i++; j++; }
      else if (dp[i + 1][j] >= dp[i][j + 1]) i++;
      else { j++; extra++; }
    }
    extra += m - j;
    const hits = hit.filter(Boolean).length;
    return { target: T, hit, hits, total: n, extra, accuracy: n ? hits / n : 0 };
  }

  /** 화면에 보이는 원문을 단어 단위로 쪼개되, 각 조각이 채점용 단어 몇 개에 해당하는지 기록 */
  function displayWords(text) {
    const parts = String(text).split(/(\s+)/);
    const out = [];
    let idx = 0;
    parts.forEach(p => {
      if (!p) return;
      if (/^\s+$/.test(p)) { out.push({ text: p, space: true }); return; }
      const tk = tokens(p);
      out.push({ text: p, from: idx, count: tk.length });
      idx += tk.length;
    });
    return out;
  }

  /** 한 단어 발화 판정: 'right|write' 형태의 정답 vs 짝 단어 */
  function judgeWord(target, partner, alternatives) {
    const ok = String(target).split('|').map(w => tokens(w).join(' '));
    const bad = String(partner || '').split('|').filter(Boolean).map(w => tokens(w).join(' '));
    const alts = (alternatives || []).map(a => tokens(a).join(' ')).filter(Boolean);
    if (!alts.length) return { verdict: 'none', heard: '' };
    const top = alts[0];
    const has = (phrase, list) => list.some(x => (' ' + phrase + ' ').includes(' ' + x + ' '));
    if (has(top, ok) && !has(top, bad)) return { verdict: 'ok', heard: top };
    if (has(top, bad)) return { verdict: 'partner', heard: top };
    // 1순위가 아니어도 후보에 정답만 있으면 ‘애매’로 본다
    if (alts.some(a => has(a, ok))) return { verdict: 'close', heard: top };
    return { verdict: 'other', heard: top };
  }

  // ---------- 말하기 분석 ----------
  const STOP = new Set(('a an the and or but so if then than that this these those there here it its it\'s is are was were be been being am ' +
    'i me my mine we us our you your he him his she her they them their to of in on at by for with from up down out over about into ' +
    'as do does did done have has had not no yes just very really also too can could would should will shall may might must ' +
    'what which who whom when where why how all any some more most much many one two get got go going went like um uh ' +
    'because actually basically literally maybe something anything everything thing things lot lots kind sort well oh yeah okay ok dont im its thats theres ive id youre were theyre cant wont didnt doesnt isnt').split(' '));

  const FILLER_SINGLE = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'mm', 'uhm', 'umm', 'basically', 'literally', 'actually']);
  const FILLER_PAIRS = ['you know', 'i mean', 'kind of', 'sort of'];
  // 'like' 앞에 오면 동사/전치사로 쓰인 것으로 보는 단어
  const LIKE_OK_BEFORE = new Set(['i', 'you', 'we', 'they', 'would', 'id', 'wed', 'youd', 'theyd', 'dont', 'didnt', 'doesnt', 'to', 'really',
    'feel', 'feels', 'felt', 'look', 'looks', 'looked', 'sound', 'sounds', 'sounded', 'seem', 'seems', 'something', 'anything', 'nothing',
    'people', 'he', 'she', 'it', 'also', 'still', 'always', 'never', 'more', 'most', 'just', 'exactly', 'much', 'things', 'thing', 'taste', 'tastes', 'smell', 'smells', 'act', 'acts', 'is', 'was', 'are', 'were', 'be', 'not']);

  function fillers(T) {
    const found = {};
    const add = k => { found[k] = (found[k] || 0) + 1; };
    for (let i = 0; i < T.length; i++) {
      const w = T[i], two = w + ' ' + (T[i + 1] || '');
      if (FILLER_PAIRS.includes(two)) {
        // 'kind of'·'sort of' 뒤에 명사가 바로 오는 경우(a kind of tea)는 제외
        if ((w === 'kind' || w === 'sort') && ['a', 'the', 'what', 'this', 'that', 'any', 'some', 'every', 'same'].includes(T[i - 1])) { continue; }
        add(two); i++; continue;
      }
      if (FILLER_SINGLE.has(w)) { add(w); continue; }
      if (w === 'like' && i > 0 && !LIKE_OK_BEFORE.has(T[i - 1])) add('like');
    }
    const total = Object.values(found).reduce((a, b) => a + b, 0);
    return { total, found };
  }

  /**
   * 즉흥 말하기 분석
   * @param {string} text 인식된 전체 문장
   * @param {number} seconds 말한 시간(초)
   * @param {object} opt { pauses: 긴 멈춤 횟수, hints: 추천 단어 }
   */
  function analyzeTalk(text, seconds, opt) {
    opt = opt || {};
    const T = tokens(text);
    const words = T.length;
    const secs = Math.max(1, seconds || 0);
    const wpm = Math.round(words / (secs / 60));
    const f = fillers(T);
    const perMin = +(f.total / (secs / 60)).toFixed(1);
    const content = T.filter(w => !STOP.has(w) && w.length > 2);
    const uniq = new Set(content);
    const variety = content.length ? Math.round(uniq.size / content.length * 100) : 0;
    const counts = {};
    content.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    const repeated = Object.entries(counts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, c]) => ({ w, c }));
    const rich = Array.from(uniq).filter(w => w.length >= 7).sort((a, b) => b.length - a.length).slice(0, 6);
    const hintsUsed = (opt.hints || []).filter(h => {
      const ht = tokens(h).join(' ');
      return ht && (' ' + T.join(' ') + ' ').includes(' ' + ht + ' ');
    });

    // 0~100 점수 네 가지. 학습자 기준으로 너그럽게 잡는다.
    const pace = words < 5 ? 0 : wpm < 70 ? 40 : wpm < 100 ? 70 : wpm <= 165 ? 100 : wpm <= 190 ? 75 : 50;
    const clean = Math.max(0, Math.round(100 - perMin * 15));
    const vocab = content.length < 5 ? 0 : Math.max(0, Math.min(100, Math.round((variety - 35) / 40 * 100)));
    const target = Math.round(secs / 60 * 110); // 1분에 110단어 정도면 충분히 채운 것
    const volume = Math.min(100, Math.round(words / Math.max(1, target) * 100));
    const score = Math.round(pace * 0.25 + clean * 0.25 + vocab * 0.2 + volume * 0.3);

    return {
      words, seconds: Math.round(secs), wpm, fillers: f.total, fillerFound: f.found, fillerPerMin: perMin,
      variety, repeated, rich, hintsUsed, pauses: opt.pauses || 0,
      parts: { pace, clean, vocab, volume }, score,
    };
  }

  function paceLabel(wpm) {
    if (wpm < 70) return '아주 느림';
    if (wpm < 100) return '느림';
    if (wpm < 130) return '차분함';
    if (wpm <= 165) return '적정';
    if (wpm <= 190) return '빠름';
    return '매우 빠름';
  }

  /** 핵심어(keys) 중 말한 것 */
  function keysUsed(keys, text) {
    const t = ' ' + tokens(text).join(' ') + ' ';
    return (keys || []).filter(k => {
      const kt = tokens(k).join(' ');
      return kt && t.includes(' ' + kt + ' ');
    });
  }

  /** 지문에서 요약 때 쓸 만한 핵심 단어 */
  function keywords(text, n) {
    const T = tokens(text).filter(w => !STOP.has(w) && w.length > 3);
    const c = {};
    T.forEach((w, i) => { c[w] = (c[w] || 0) + 1 + (i < 12 ? 0.2 : 0); });
    return Object.entries(c).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n || 6).map(([w]) => w);
  }

  const api = { tokens, align, displayWords, judgeWord, fillers, analyzeTalk, paceLabel, keysUsed, keywords, numberWords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SPKScore = api;
})(typeof window !== 'undefined' ? window : globalThis);
