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
    gotta: 'got to', lemme: 'let me', gimme: 'give me', kinda: 'kind of', sorta: 'sort of', dunno: 'do not know', outta: 'out of', coulda: 'could have', shoulda: 'should have', woulda: 'would have', hafta: 'have to', gotcha: 'got you',
    'e-mail': 'email', cannot: 'can not', percent: 'percent', mr: 'mister', ms: 'miss', mrs: 'missus',
    favourite: 'favorite', colour: 'color', centre: 'center', organise: 'organize', realise: 'realize',
    theatre: 'theater', travelling: 'traveling', grey: 'gray', practise: 'practice',
  };

  const ORD = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth', 5: 'fifth', 6: 'sixth', 7: 'seventh', 8: 'eighth', 9: 'ninth', 10: 'tenth', 11: 'eleventh', 12: 'twelfth', 20: 'twentieth', 30: 'thirtieth' };
  function numberWords(n) {
    n = parseInt(n, 10);
    if (isNaN(n)) return '';
    if (NUM[n]) return n === 100 ? 'one hundred' : NUM[n];
    if (n < 100) return NUM[Math.floor(n / 10) * 10] + ' ' + NUM[n % 10];
    if (n < 1000) {
      const h = Math.floor(n / 100), r = n % 100;
      return NUM[h] + ' hundred' + (r ? ' ' + numberWords(r) : '');
    }
    // 연도처럼 읽는 수(1100~2099, 00으로 끝나지 않음): 1995 → nineteen ninety five
    if (n >= 1100 && n < 2000 && n % 100 === 0) return numberWords(n / 100) + ' hundred';
    if (n >= 1100 && n < 2100 && n % 100 && (n < 2000 || n >= 2010)) return numberWords(Math.floor(n / 100)) + ' ' + numberWords(n % 100);
    if (n < 1000000) {
      const th = Math.floor(n / 1000), r = n % 1000;
      return numberWords(th) + ' thousand' + (r ? ' ' + numberWords(r) : '');
    }
    return n < 1e9 ? numberWords(Math.floor(n / 1e6)) + ' million' + (n % 1e6 ? ' ' + numberWords(n % 1e6) : '') : '';
  }

  /** 소문자, 문장부호 제거, 숫자→단어, 표기 통일 후 단어 배열 */
  function tokens(text) {
    if (!text) return [];
    let s = String(text).toLowerCase()
      .replace(/[‘’ʼ`]/g, "'")
      .replace(/[–—]/g, ' ')
      .replace(/&/g, ' and ')
      .replace(/%/g, ' percent ')
      .replace(/\be-mail/g, 'email')
      .replace(/(\d),(?=\d{3}\b)/g, '$1')
      .replace(/(\d+)(st|nd|rd|th)\b/g, (m, d) => ' ' + (ORD[+d] || numberWords(d)) + ' ')
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
  const HESITATION = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'mm', 'uhm', 'umm']);
  // 문장부호가 없는 받아쓰기라 문법적으로 쓰인 말을 군더더기로 세지 않도록 보수적으로 판단한다.
  // 'like': 바로 앞이 이런 말일 때만 군더더기(“it was like”, “and like”, “like like”)
  const LIKE_FILLER_BEFORE = new Set(['and', 'so', 'but', 'then', 'or', 'totally', 'literally', 'basically', 'like', 'um', 'uh', 'er']);
  // “it was like so crazy”처럼 was/were 뒤 like는 다음 말이 감탄·대명사일 때만 군더더기(“was like a sister”는 비유)
  const LIKE_AFTER_BE = new Set(['so', 'really', 'totally', 'um', 'uh', 'i', 'you', 'we', 'they', 'he', 'she', 'oh', 'wow', 'no', 'yes', 'what', 'okay', 'ok', 'whoa', 'seriously', 'super']);
  const DET = new Set(['a', 'an', 'the', 'what', 'this', 'that', 'these', 'those', 'any', 'some', 'every', 'same', 'different', 'other', 'another', 'one', 'new', 'right', 'wrong', 'certain', 'which', 'each', 'my', 'your', 'our', 'their', 'his', 'her', 'its', 'all']);
  const ASK_BEFORE = new Set(['do', 'did', 'dont', 'didnt', 'if', 'would', 'will', 'might', 'should', 'can', 'could', 'to', 'as', 'youd', 'what', 'that']);
  const OBJ_AFTER = new Set(['what', 'how', 'that', 'where', 'why', 'when', 'who', 'whether', 'if', 'about', 'him', 'her', 'them', 'me', 'us', 'to', 'your', 'his', 'their', 'our', 'more', 'everyone', 'everything', 'anything', 'someone', 'something', 'nothing', 'better', 'each', 'english', 'yourself', 'myself']);

  /** 군더더기 찾기. pos: 군더더기로 본 토큰 위치 */
  function fillers(T) {
    const found = {};
    const pos = [];
    const add = (k, ...idx) => { found[k] = (found[k] || 0) + 1; pos.push(...idx); };
    for (let i = 0; i < T.length; i++) {
      const w = T[i], nx = T[i + 1] || '', pv = T[i - 1] || '', pv2 = T[i - 2] || '';
      if ((w === 'kind' || w === 'sort') && nx === 'of') {
        // a kind of tea, a different kind of problem → 명사, that's kind of you → 형용사
        const n2 = T[i + 2] || '';
        if (!DET.has(pv) && !DET.has(pv2) && pv !== 'of' && !(w === 'kind' && ['you', 'him', 'her', 'them'].includes(n2) && !T[i + 3])) { add(w + ' of', i, i + 1); i++; }
        continue;
      }
      if (w === 'you' && nx === 'know') {
        if (!ASK_BEFORE.has(pv) && !OBJ_AFTER.has(T[i + 2] || '')) { add('you know', i, i + 1); i++; }
        continue;
      }
      if (w === 'i' && nx === 'mean') {
        const n2 = T[i + 2] || '';
        // “I mean it.”(진심이다)·“I mean that…”·“I mean to…”는 제외
        if (!ASK_BEFORE.has(pv) && !OBJ_AFTER.has(n2) && !(n2 === 'it' && !T[i + 3])) { add('i mean', i, i + 1); i++; }
        continue;
      }
      if (FILLER_SINGLE.has(w)) { add(w, i); continue; }
      if (w === 'like' && (LIKE_FILLER_BEFORE.has(pv) || HESITATION.has(nx) || ((pv === 'was' || pv === 'were' || pv === 'its') && LIKE_AFTER_BE.has(nx)))) add('like', i);
    }
    const total = Object.values(found).reduce((a, b) => a + b, 0);
    return { total, found, pos };
  }

  /**
   * 즉흥 말하기 분석
   * @param {string} text 인식된 전체 문장
   * @param {number} seconds 말한 시간(초)
   * @param {object} opt { pauses: 긴 멈춤 횟수, hints: 추천 단어, target: 주어진 시간(초),
   *                        confidence: 인식 신뢰도 평균(0~1, 없으면 0), topic: 질문 문장 }
   */
  function analyzeTalk(text, seconds, opt) {
    opt = opt || {};
    const T = tokens(text);
    const words = T.length;
    const secs = Math.max(1, seconds || 0);
    const given = Math.max(secs, opt.target || secs);
    const wpm = Math.round(words / (secs / 60));
    const f = fillers(T);
    const perMin = +(f.total / (secs / 60)).toFixed(1);
    const pauses = opt.pauses || 0;
    const content = T.filter(w => !STOP.has(w) && w.length > 2);
    const uniq = new Set(content);
    const variety = mattr(content, 25);
    const counts = {};
    content.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    const repeated = Object.entries(counts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([w, c]) => ({ w, c }));
    const rich = Array.from(uniq).filter(w => w.length >= 7).sort((a, b) => b.length - a.length).slice(0, 6);
    const hintsUsed = (opt.hints || []).filter(h => {
      const ht = tokens(h).join(' ');
      return ht && (' ' + T.join(' ') + ' ').includes(' ' + ht + ' ');
    });

    // 질문과 관련 있는 말을 했는지(질문·추천 단어의 내용어가 하나라도 나왔는지)
    const topicWords = new Set(tokens((opt.topic || '') + ' ' + (opt.hints || []).join(' ')).filter(w => !STOP.has(w) && w.length > 3));
    const onTopic = topicWords.size ? content.filter(w => topicWords.has(w) || topicWords.has(w.replace(/s$/, ''))).length : null;

    // 0~100 점수. 분량은 ‘주어진 시간 전체’ 기준이라 일찍 끝내면 깎인다.
    const pace = words < 5 ? 0 : wpm < 70 ? 40 : wpm < 100 ? 70 : wpm <= 165 ? 100 : wpm <= 190 ? 75 : 50;
    // 인식기가 um/uh를 빼먹기 쉬워서, 긴 멈춤도 망설임으로 함께 본다
    const clean = words < 10 ? 0 : Math.max(0, Math.round(100 - perMin * 15 - pauses / (given / 60) * 8));
    // 어휘: 내용어 25개 창으로 본 다양성(MATTR). 내용어가 적으면 그만큼 깎는다.
    const vocabRaw = clamp01((variety / 100 - 0.6) / 0.32);
    const vocab = Math.round(vocabRaw * Math.min(1, content.length / 30) * 100);
    const want = given / 60 * 110; // 1분에 110단어 정도면 충분히 채운 것
    // 같은 말을 되풀이하면 분량으로 치지 않는다: 서로 다른 3단어 묶음의 비율로 실제 분량을 줄인다
    const tri = [];
    for (let k = 0; k + 2 < T.length; k++) tri.push(T[k] + ' ' + T[k + 1] + ' ' + T[k + 2]);
    const fresh = tri.length >= 6 ? new Set(tri).size / tri.length : 1;
    const effective = words * Math.min(1, fresh / 0.85);
    const volume = Math.min(100, Math.round(effective / Math.max(1, want) * 100));
    const conf = opt.confidence > 0 && words >= 15 ? opt.confidence : 0;
    const clarity = conf ? Math.round(clamp01((conf - 0.55) / 0.37) * 100) : null;
    const W = clarity == null ? { pace: 0.2, clean: 0.2, vocab: 0.2, volume: 0.4, clarity: 0 } : { pace: 0.15, clean: 0.2, vocab: 0.15, volume: 0.35, clarity: 0.15 };
    let score = pace * W.pace + clean * W.clean + vocab * W.vocab + volume * W.volume + (clarity || 0) * W.clarity;
    if (onTopic === 0 && words >= 20) score *= 0.8; // 질문과 무관해 보이면 감점
    score = Math.round(score);
    // 주어진 시간의 75% 미만이면 ‘미완료’ — 점수는 참고용
    const complete = secs >= given * 0.75 - 0.5;

    return {
      words, seconds: Math.round(secs), given: Math.round(given), wpm, fillers: f.total, fillerFound: f.found, fillerPerMin: perMin,
      variety, fresh: Math.round(fresh * 100), contentWords: content.length, repeated, rich, hintsUsed, pauses, onTopic, confidence: conf, topicKeys: Array.from(topicWords).slice(0, 3),
      parts: { pace, clean, vocab, volume, clarity }, score, complete,
    };
  }
  function clamp01(x) { return Math.max(0, Math.min(1, x)); }
  /** 이동 창 어휘 다양성(MATTR, %) — 짧은 답이 100%가 되는 문제를 줄인다 */
  function mattr(list, win) {
    if (!list.length) return 0;
    if (list.length <= win) return Math.round(new Set(list).size / list.length * 100);
    let sum = 0, n = 0;
    for (let i = 0; i + win <= list.length; i++) { sum += new Set(list.slice(i, i + win)).size / win; n++; }
    return Math.round(sum / n * 100);
  }

  function paceLabel(wpm) {
    if (wpm < 70) return '아주 느림';
    if (wpm < 100) return '느림';
    if (wpm < 130) return '차분함';
    if (wpm <= 165) return '적정';
    if (wpm <= 190) return '빠름';
    return '매우 빠름';
  }

  /** 아주 단순한 어간 추출: concerns→concern, delivering→deliver, hundreds→hundred */
  function stem(w) {
    if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
    if (w.length > 5 && w.endsWith('ing')) return w.slice(0, -3).replace(/(.)\1$/, '$1');
    if (w.length > 4 && w.endsWith('ed')) return w.slice(0, -2).replace(/(.)\1$/, '$1');
    if (w.length > 4 && w.endsWith('es') && /(ss|sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
    if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
    return w;
  }
  /** 핵심어(keys) 중 말한 것 — 단·복수, -ing, -ed 형태가 달라도 인정 */
  function sameWord(a, b) { return a === b || stem(a) === b || a === stem(b) || stem(a) === stem(b); }
  function keysUsed(keys, text) {
    const T = tokens(text);
    return (keys || []).filter(k => {
      const K = tokens(k);
      if (!K.length) return false;
      for (let i = 0; i + K.length <= T.length; i++) {
        let ok = true;
        for (let j = 0; j < K.length && ok; j++) ok = sameWord(T[i + j], K[j]);
        if (ok) return true;
      }
      return false;
    });
  }

  /** 표현 업그레이드 판정: 핵심어를 쓰고, 밋밋한 말(avoid)은 쓰지 않아야 성공 */
  function upgradeCheck(item, text) {
    const used = keysUsed(item.keys, text);
    const weak = keysUsed(item.avoid || [], text);
    return { used, weak, ok: used.length > 0 && weak.length === 0 };
  }

  /** 지문에서 요약 때 쓸 만한 핵심 단어 */
  function keywords(text, n) {
    const T = tokens(text).filter(w => !STOP.has(w) && w.length > 3);
    const c = {};
    T.forEach((w, i) => { c[w] = (c[w] || 0) + 1 + (i < 12 ? 0.2 : 0); });
    return Object.entries(c).sort((a, b) => b[1] - a[1] || b[0].length - a[0].length).slice(0, n || 6).map(([w]) => w);
  }

  const api = { tokens, align, displayWords, judgeWord, fillers, analyzeTalk, paceLabel, keysUsed, upgradeCheck, keywords, mattr, numberWords };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SPKScore = api;
})(typeof window !== 'undefined' ? window : globalThis);
