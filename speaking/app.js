/* 하루 스피킹 — 매일 10분 영어 아티큘레이션 트레이닝
 * 빌드 없이 동작하는 단일 페이지 앱. 콘텐츠는 content/*.js 가 window.SPK 에 등록한다.
 * 화면 주소: #today, #do/<단계>, #review, #library, #lib/<종류>/<id>, #stats, #prefs */
(function () {
  'use strict';

  const SPK = window.SPK || {};
  const S = window.SPKScore;
  const WARMUPS = SPK.warmups || [];
  const SOUNDS = SPK.sounds || [];
  const PASSAGES = SPK.passages || [];
  const TOPICS = SPK.topics || [];
  const UPGRADES = SPK.upgrades || [];
  const RHYTHMS = SPK.rhythm || [];
  const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
  const WARMUP = byId(WARMUPS), SOUND = byId(SOUNDS), PASSAGE = byId(PASSAGES), TOPIC = byId(TOPICS), UPGRADE = byId(UPGRADES), RHYTHM = byId(RHYTHMS);

  const FRAMEWORKS = {
    prep: { name: 'PREP', ko: '주장 → 이유 → 예시 → 다시 주장', steps: [
      ['Point', '결론부터', 'My take is that…'],
      ['Reason', '왜 그런지', 'The main reason is…'],
      ['Example', '구체적 예', 'For example, …'],
      ['Point', '한 번 더 정리', 'So that’s why I think…'],
    ] },
    star: { name: 'STAR', ko: '상황 → 과제 → 행동 → 결과', steps: [
      ['Situation', '언제, 어디서', 'A while ago, I was…'],
      ['Task', '해야 했던 일', 'I needed to…'],
      ['Action', '내가 한 일', 'So I decided to…'],
      ['Result', '결과와 배운 점', 'In the end, … and I learned…'],
    ] },
    ppf: { name: 'Past–Present–Future', ko: '예전 → 지금 → 앞으로', steps: [
      ['Past', '예전에는', 'When I was younger, …'],
      ['Present', '지금은', 'These days, …'],
      ['Future', '앞으로는', 'Going forward, I’d like to…'],
    ] },
    psb: { name: 'Problem–Solution–Benefit', ko: '문제 → 해결책 → 이점', steps: [
      ['Problem', '무엇이 문제인지', 'The problem is that…'],
      ['Solution', '어떻게 풀지', 'What I’d suggest is…'],
      ['Benefit', '그러면 좋아지는 점', 'That way, we could…'],
    ] },
    wsn: { name: 'What–So what–Now what', ko: '무엇 → 왜 중요한지 → 그래서 어떻게', steps: [
      ['What', '무엇인지', 'Simply put, it’s…'],
      ['So what', '왜 중요한지', 'This matters because…'],
      ['Now what', '그래서 어떻게', 'So what you can do is…'],
    ] },
    cc: { name: 'Compare–Contrast–Conclude', ko: '공통점 → 차이점 → 결론', steps: [
      ['Compare', '비슷한 점', 'Both of them…'],
      ['Contrast', '다른 점', 'The big difference is…'],
      ['Conclude', '내 결론', 'Overall, I’d go with…'],
    ] },
  };
  const CATS = { daily: '일상', opinion: '의견', work: '일·학교', explain: '설명', story: '이야기' };

  const STEPS = {
    warmup: { label: '입 풀기', en: 'Warm-up', min: 1, desc: '입술·혀·턱을 깨우는 1분' },
    sound: { label: '발음 드릴', en: 'Sound drill', min: 2, desc: '헷갈리는 소리 듣고 구별하고 말하기' },
    rhythm: { label: '리듬·강세', en: 'Rhythm', min: 1, desc: '강세·연음·축약 — 한국어식 ‘또박또박’에서 벗어나기' },
    passage: { label: '섀도잉', en: 'Shadowing', min: 2, desc: '원어민 음성을 듣고 따라 읽기' },
    retell: { label: '요약해 말하기', en: 'Retell', min: 1, desc: '방금 읽은 글을 내 말로 30초' },
    talk: { label: 'Daily 60', en: 'Impromptu', min: 2, desc: '오늘의 질문에 60초 즉흥 답변' },
    upgrade: { label: '표현 업그레이드', en: 'Upgrade', min: 1, desc: '밋밋한 문장을 정확한 표현으로' },
  };
  const PLANS = {
    5: ['sound', 'talk'],
    10: ['warmup', 'sound', 'rhythm', 'passage', 'talk', 'upgrade'],
    15: ['warmup', 'sound', 'rhythm', 'passage', 'retell', 'talk', 'upgrade'],
  };
  const INTERVALS = [1, 3, 7, 14, 30];
  // 처음 설정의 발음 진단 세트이자, 소리를 돌아가며 연습하는 우선순위
  const DIAG = ['r-l', 'f-p', 'v-b', 'th-s', 'i-ih', 'ae-e', 'z-j', 's-sh'];

  // ---------- 기능 감지 ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const TTS = 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';
  const CAN_REC = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
  const IS_ANDROID = /Android/i.test(navigator.userAgent);

  // ---------- 저장소 ----------
  const KEY = 'haru-speak.v1';
  const defaultState = () => ({
    v: 1,
    prefs: {
      minutes: 10, accent: 'en-US', rate: 0.9, voice: '', focus: [], level: 'auto',
      theme: 'system', saveAudio: true, remindAt: '08:00',
    },
    onboarded: false,
    curLevel: 1,
    days: {},
    items: {},
    soundStats: {},
    talks: [],
    passLog: [],
    seen: { topics: [], passages: [], upgrades: [], rhythm: [] },
    freezes: 0,
    freezeDays: [],
    lastSeen: '',
  });
  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* 저장소를 못 쓰면 메모리에서만 동작 */ }
    return defaultState();
  }
  function normalize(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const out = Object.assign(d, s);
    out.prefs = Object.assign(defaultState().prefs, s.prefs || {});
    if (![5, 10, 15].includes(+out.prefs.minutes)) out.prefs.minutes = 10;
    out.prefs.minutes = +out.prefs.minutes;
    out.prefs.rate = clamp(+out.prefs.rate || 0.9, 0.6, 1.2);
    out.prefs.focus = (out.prefs.focus || []).filter(id => SOUND[id]);
    out.seen = Object.assign({ topics: [], passages: [], upgrades: [], rhythm: [] }, s.seen || {});
    ['days', 'items', 'soundStats'].forEach(k => { if (!out[k] || typeof out[k] !== 'object') out[k] = {}; });
    ['talks', 'passLog', 'freezeDays'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
    out.curLevel = clamp(parseInt(out.curLevel, 10) || 1, 1, 3);
    out.freezes = clamp(parseInt(out.freezes, 10) || 0, 0, 2);
    return out;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 날짜 ----------
  function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function today() { return ymd(new Date()); }
  function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); return ymd(new Date(y, m - 1, d + n)); }
  function dayNumber(s) { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86400000); }
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function prettyDate(s) { const [y, m, d] = s.split('-').map(Number); return `${m}월 ${d}일 ${WEEK[new Date(y, m - 1, d).getDay()]}요일`; }
  function shortDate(s) { const [, m, d] = s.split('-').map(Number); return `${m}/${d}`; }

  // ---------- 간단한 시드 난수 ----------
  function seeded(seed) {
    let t = seed >>> 0;
    return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(arr, rnd) { const a = arr.slice(); rnd = rnd || Math.random; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ---------- 하루 기록과 연속 기록 ----------
  function dayRec(date) {
    if (!state.days[date]) state.days[date] = { plan: null, done: {}, active: false, complete: false, secs: 0 };
    const d = state.days[date];
    if (!d.done) d.done = {};
    return d;
  }
  function isActive(date) { const d = state.days[date]; return !!(d && d.active); }

  /** 앱을 열 때: 빠진 날 수만큼 보호권이 있으면 자동으로 써서 연속 기록을 지킨다. */
  function reconcileFreeze() {
    const t = today();
    if (state.lastSeen === t) return;
    const covered = d => isActive(d) || state.freezeDays.includes(d);
    let gap = 0, d = addDays(t, -1);
    while (!covered(d) && gap < 3) { gap++; d = addDays(d, -1); }
    if (gap > 0 && covered(d) && gap <= state.freezes && streakEnding(d) > 0) {
      for (let i = 1; i <= gap; i++) state.freezeDays.push(addDays(t, -i));
      state.freezes -= gap;
      state.freezeDays = state.freezeDays.slice(-60);
      setTimeout(() => toast(gap === 1 ? '어제 빠진 하루를 ‘연속 보호권’으로 지켰어요.' : `빠진 ${gap}일을 연속 보호권 ${gap}개로 지켰어요.`), 600);
    }
    state.lastSeen = t;
    save();
  }
  function streakEnding(date) {
    let n = 0, d = date, guard = 0;
    while (guard++ < 4000) {
      if (isActive(d)) n++;
      else if (!state.freezeDays.includes(d)) break;
      d = addDays(d, -1);
    }
    return n;
  }
  function currentStreak() {
    const t = today();
    return isActive(t) ? streakEnding(t) : streakEnding(addDays(t, -1));
  }
  function longestStreak() {
    const dates = Object.keys(state.days).filter(isActive).sort();
    let best = 0;
    dates.forEach(d => { if (!isActive(addDays(d, 1))) best = Math.max(best, streakEnding(d)); });
    return best;
  }
  /** 오늘 처음 연습을 끝냈을 때 호출 */
  function markActive(secs) {
    const t = today();
    const d = dayRec(t);
    const first = !d.active;
    d.active = true;
    d.secs = (d.secs || 0) + Math.round(secs || 0);
    if (first) {
      const st = streakEnding(t);
      const MILESTONE = { 3: '3일 연속! 습관이 시작됐어요.', 7: '7일 연속! 일주일을 채웠어요.', 14: '2주 연속!', 30: '30일 연속! 한 달 동안 매일 말했어요.', 50: '50일 연속!', 100: '100일 연속! 대단해요.', 200: '200일 연속!', 365: '1년 연속!' };
      let msg = MILESTONE[st] || '';
      if (st > 0 && st % 7 === 0 && state.freezes < 2) {
        state.freezes += 1;
        msg = (msg ? msg + ' ' : `${st}일 연속! `) + '연속 보호권 1개를 받았어요.';
      }
      if (MILESTONE[st]) { state.milestones = (state.milestones || []).concat([{ n: st, date: t }]).slice(-20); }
      if (msg) setTimeout(() => toast(msg), 400);
    }
    save();
  }

  // ---------- 오늘 계획 ----------
  function levelNow() {
    if (state.prefs.level !== 'auto') return clamp(+state.prefs.level || 1, 1, 3);
    return state.curLevel;
  }
  function adjustLevel() {
    const recent = state.passLog.slice(-4);
    if (recent.length < 3) return;
    const avg = recent.reduce((a, r) => a + r.acc, 0) / recent.length;
    const lv = state.curLevel;
    const same = recent.every(r => r.level === lv);
    if (!same) return;
    if (avg >= 0.9 && lv < 3) { state.curLevel = lv + 1; toast(`섀도잉 난이도를 ${lv + 1}단계로 올렸어요.`); }
    else if (avg < 0.7 && lv > 1) { state.curLevel = lv - 1; toast(`섀도잉 난이도를 ${lv - 1}단계로 낮췄어요.`); }
  }
  function pickUnseen(list, seenList, rnd) {
    if (!list.length) return null;
    const seen = new Set(seenList);
    const fresh = list.filter(x => !seen.has(x.id));
    const pool = fresh.length ? fresh : list.filter(x => x.id !== seenList[seenList.length - 1]);
    return pool[Math.floor(rnd() * pool.length)] || list[0];
  }
  function weakestSound() {
    let worst = null, rate = 1;
    Object.entries(state.soundStats).forEach(([id, s]) => {
      if (!SOUND[id] || s.n < 8) return;
      const r = s.ok / s.n;
      if (r < 0.75 && r < rate) { rate = r; worst = id; }
    });
    return worst;
  }
  function buildPlan(date) {
    const dn = dayNumber(date);
    const rnd = seeded(dn * 7919);
    const steps = PLANS[state.prefs.minutes] || PLANS[10];
    // 처음 쓰는 날부터 중요한 소리(진단 세트) 순서로 돌아간다
    if (!state.startDay) state.startDay = dn;
    const order = DIAG.filter(id => SOUND[id]).concat(SOUNDS.map(s => s.id).filter(id => !DIAG.includes(id)));
    const focus = state.prefs.focus.length ? order.filter(id => state.prefs.focus.includes(id)) : order;
    const weak = weakestSound();
    let sound = focus[Math.max(0, dn - state.startDay) % Math.max(1, focus.length)];
    if (weak && dn % 2 === 0 && (!state.prefs.focus.length || state.prefs.focus.includes(weak))) sound = weak;
    const lv = levelNow();
    const passPool = PASSAGES.filter(p => p.level === lv);
    const cat = Object.keys(CATS)[dn % 5];
    const topicPool = TOPICS.filter(t => t.cat === cat);
    const pass = pickUnseen(passPool.length ? passPool : PASSAGES, state.seen.passages, rnd);
    const topic = pickUnseen(topicPool.length ? topicPool : TOPICS, state.seen.topics, rnd);
    const up = pickUnseen(UPGRADES, state.seen.upgrades, rnd);
    const rh = RHYTHMS.length ? (RHYTHMS.find(x => !state.seen.rhythm.includes(x.id)) || RHYTHMS[dn % RHYTHMS.length]) : null;
    const plan = {
      steps: steps.slice(),
      warmup: WARMUPS.length ? WARMUPS[dn % WARMUPS.length].id : null,
      sound: SOUND[sound] ? sound : (SOUNDS[0] && SOUNDS[0].id),
      passage: pass && pass.id,
      topic: topic && topic.id,
      upgrade: up && up.id,
      rhythm: rh && rh.id,
    };
    plan.steps = plan.steps.filter(s => itemForStep(plan, s));
    return plan;
  }
  function itemForStep(plan, step) {
    switch (step) {
      case 'warmup': return WARMUP[plan.warmup];
      case 'sound': return SOUND[plan.sound];
      case 'passage': case 'retell': return PASSAGE[plan.passage];
      case 'talk': return TOPIC[plan.topic];
      case 'upgrade': return UPGRADE[plan.upgrade];
      case 'rhythm': return RHYTHM[plan.rhythm];
    }
    return null;
  }
  function todayPlan() {
    const t = today();
    const d = dayRec(t);
    const want = PLANS[state.prefs.minutes] || PLANS[10];
    if (!d.plan || !d.plan.steps || !d.plan.steps.every(s => itemForStep(d.plan, s))) {
      d.plan = buildPlan(t);
      save();
    } else if (want.join() !== d.plan.steps.join()) {
      // 설정에서 길이를 바꾼 경우: 이미 정한 항목은 두고 단계만 맞춘다
      const fresh = buildPlan(t);
      d.plan = Object.assign(fresh, Object.fromEntries(['warmup', 'sound', 'passage', 'topic', 'upgrade', 'rhythm'].map(k => [k, d.plan[k] || fresh[k]])));
      d.plan.steps = want.filter(s => itemForStep(d.plan, s));
      save();
    }
    return d.plan;
  }
  function stepsLeft() {
    const d = dayRec(today());
    return todayPlan().steps.filter(s => !d.done[s]);
  }
  function markSeen(kind, id) {
    const list = state.seen[kind];
    if (!list || !id) return;
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1);
    list.push(id);
  }

  // ---------- 복습(간격 반복) ----------
  function addReview(key, data) {
    const t = today();
    state.items[key] = Object.assign({}, state.items[key] || {}, data, { box: 0, due: addDays(t, 1) });
  }
  function reviewResult(key, ok) {
    const it = state.items[key];
    if (!it) return;
    if (ok) {
      it.box = (it.box || 0) + 1;
      if (it.box >= INTERVALS.length) { delete state.items[key]; return; }
      it.due = addDays(today(), INTERVALS[it.box]);
    } else {
      it.box = 0;
      it.due = addDays(today(), 1);
    }
  }
  function dueItems() {
    const t = today();
    return Object.entries(state.items).filter(([k, it]) => it.due <= t && (k.startsWith('u:') ? UPGRADE[it.id] : SOUND[it.sound]))
      .sort((a, b) => a[1].due.localeCompare(b[1].due)).map(([k, it]) => Object.assign({ key: k }, it));
  }

  // ---------- 오디오 보관(IndexedDB) ----------
  const audioDB = {
    db: null,
    open() {
      if (this.db) return Promise.resolve(this.db);
      return new Promise((res, rej) => {
        try {
          const r = indexedDB.open('haru-speak-audio', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('audio');
          r.onsuccess = () => { this.db = r.result; res(this.db); };
          r.onerror = () => rej(r.error);
        } catch (e) { rej(e); }
      });
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction('audio', mode);
        const out = fn(tx.objectStore('audio'));
        tx.oncomplete = () => res(out && 'result' in out ? out.result : undefined);
        tx.onerror = () => rej(tx.error);
      });
    },
    put(key, blob) { return this.run('readwrite', s => s.put(blob, key)).catch(() => null); },
    get(key) { return this.run('readonly', s => s.get(key)).catch(() => null); },
    del(key) { return this.run('readwrite', s => s.delete(key)).catch(() => null); },
    clear() { return this.run('readwrite', s => s.clear()).catch(() => null); },
  };
  const AUDIO_KEEP = 40;
  async function keepAudio(blob) {
    if (!blob || !blob.size) return '';
    const key = 'a-' + Date.now();
    await audioDB.put(key, blob);
    const withAudio = state.talks.filter(t => t.audio);
    if (withAudio.length >= AUDIO_KEEP) {
      // 가장 오래된 녹음부터 지우되, 맨 처음 녹음은 성장 비교용으로 남긴다
      const victims = withAudio.slice(1, withAudio.length - AUDIO_KEEP + 2);
      victims.forEach(t => { audioDB.del(t.audio); t.audio = ''; });
    }
    return key;
  }

  // ---------- 음성 합성(듣기) ----------
  let voices = [];
  function loadVoices() { try { voices = window.speechSynthesis.getVoices() || []; } catch (e) { voices = []; } }
  if (TTS) { loadVoices(); try { window.speechSynthesis.addEventListener('voiceschanged', loadVoices); } catch (e) { /* 구형 브라우저 */ } }
  function englishVoices() { return voices.filter(v => /^en[-_]/i.test(v.lang)); }
  function pickVoice() {
    const lang = state.prefs.accent.toLowerCase();
    const en = englishVoices();
    if (state.prefs.voice) { const v = en.find(x => x.voiceURI === state.prefs.voice); if (v) return v; }
    const same = en.filter(v => v.lang.replace('_', '-').toLowerCase() === lang);
    const good = /(natural|neural|enhanced|premium|google|samantha|daniel|karen|serena|aria|jenny|guy|sonia|libby|ryan)/i;
    return same.find(v => good.test(v.name)) || same[0] || en.find(v => v.lang.toLowerCase().startsWith(lang.slice(0, 2))) || null;
  }
  let speakToken = 0;
  /** 문장 단위로 나눠 읽는다(크롬의 긴 문장 끊김 방지). onWord(charIndex)로 읽는 위치를 알려 준다. */
  function say(text, opt) {
    opt = opt || {};
    if (!TTS) return Promise.resolve(false);
    const token = ++speakToken;
    try { window.speechSynthesis.cancel(); } catch (e) { /* 무시 */ }
    const chunks = [];
    const re = /[^.!?]+[.!?]*["”’)]*\s*/g;
    let m;
    while ((m = re.exec(text))) { if (m[0].trim()) chunks.push({ text: m[0], at: m.index }); }
    if (!chunks.length) chunks.push({ text, at: 0 });
    const voice = pickVoice();
    return chunks.reduce((p, c) => p.then(go => {
      if (!go || token !== speakToken) return false;
      return new Promise(res => {
        const u = new SpeechSynthesisUtterance(c.text);
        u.lang = voice ? voice.lang : state.prefs.accent;
        if (voice) { try { u.voice = voice; } catch (e) { /* 음성 객체가 맞지 않으면 기본 음성 */ } }
        u.rate = opt.rate || state.prefs.rate;
        u.onboundary = e => { if (opt.onWord && (e.name === 'word' || !e.name)) opt.onWord(c.at + e.charIndex); };
        let finished = false;
        const end = ok => { if (!finished) { finished = true; res(ok && token === speakToken); } };
        u.onend = () => end(true);
        u.onerror = () => end(false);
        // 일부 브라우저는 onend를 빠뜨린다: 글자 수로 대략 시간 계산해 안전장치
        setTimeout(() => end(true), 2000 + c.text.length * 120 / (u.rate || 1));
        window.speechSynthesis.speak(u);
      });
    }), Promise.resolve(true)).then(r => { if (opt.onWord) opt.onWord(-1); return r; });
  }
  function stopSpeaking() { speakToken++; if (TTS) { try { window.speechSynthesis.cancel(); } catch (e) { /* 무시 */ } } }

  // ---------- 녹음 ----------
  async function startRecorder(force) {
    if (!CAN_REC || (!force && !state.prefs.saveAudio)) return null;
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch (e) { return { error: e.name || 'mic' }; }
    let mr;
    try { mr = new MediaRecorder(stream); } catch (e) { stream.getTracks().forEach(t => t.stop()); return null; }
    const chunks = [];
    mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.start(500);
    return {
      stop() {
        return new Promise(res => {
          const done = () => { stream.getTracks().forEach(t => t.stop()); res(chunks.length ? new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) : null); };
          if (mr.state === 'inactive') return done();
          mr.onstop = done;
          try { mr.stop(); } catch (e) { done(); }
        });
      },
    };
  }

  // ---------- 음성 인식 ----------
  const SR_ERRORS = {
    'not-allowed': '마이크 권한이 막혀 있어요. 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.',
    'service-not-allowed': '이 브라우저에서 음성 인식을 쓸 수 없어요. Chrome이나 Safari에서 열어 주세요.',
    'audio-capture': '마이크를 찾지 못했어요. 다른 앱이 마이크를 쓰고 있지 않은지 확인해 주세요.',
    network: '음성 인식 서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.',
    'language-not-supported': '이 기기에서 선택한 영어 억양의 인식을 지원하지 않아요. 설정에서 억양을 바꿔 보세요.',
    conflict: '녹음과 음성 인식이 함께 동작하지 않아 녹음 저장을 껐어요. 한 번 더 해 주세요.',
  };
  /**
   * 음성 인식 세션. opt: { continuous, maxAlt, autoStopSilence(ms), maxSeconds, onUpdate(text, info) }
   * 반환: { stop(), done: Promise<{text, alts, span, pauses, error}> }
   */
  function listen(opt) {
    opt = Object.assign({ continuous: true, maxAlt: 1, interim: true }, opt);
    let rec = null, active = true, error = '', resolveDone;
    const finals = [];       // 이전 세션(재시작 전)까지 확정된 문장
    let sess = [];           // 지금 세션의 확정 문장 (결과 인덱스별)
    let interim = '', alts = [];
    const confs = [];
    const t0 = performance.now();
    let firstAt = 0, lastAt = 0, lastEvt = 0, pauses = 0, restarts = 0;
    const done = new Promise(r => { resolveDone = r; });
    const all = () => finals.concat(sess.filter(Boolean));
    const text = () => (all().join(' ') + ' ' + interim).replace(/\s+/g, ' ').trim();

    function make() {
      rec = new SR();
      rec.lang = state.prefs.accent;
      rec.continuous = !!opt.continuous;
      rec.interimResults = !!opt.interim;
      rec.maxAlternatives = opt.maxAlt;
      sess = [];
      rec.onresult = e => {
        const now = performance.now();
        if (!firstAt) firstAt = now;
        if (lastEvt && now - lastEvt > 2500) pauses++;
        lastEvt = lastAt = now;
        interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          const t = (r[0].transcript || '').trim();
          if (r.isFinal) {
            // 인덱스별로 저장해 같은 결과가 다시 와도 두 번 붙지 않게 한다.
            // 일부 안드로이드 크롬은 앞 문장을 포함한 누적 문장을 새 결과로 보낸다 → 앞 문장을 대체
            const prev = sess[i - 1];
            if (prev && t.toLowerCase().startsWith(prev.toLowerCase()) && t.length > prev.length) sess[i - 1] = '';
            sess[i] = t;
            alts = Array.from(r).map(a => a.transcript);
            if (r[0].confidence > 0) confs.push(r[0].confidence);
          } else interim += ' ' + t;
        }
        if (opt.onUpdate) opt.onUpdate(text(), { finals: all().length });
        if (!opt.continuous && all().length) stop();
      };
      rec.onerror = e => {
        if (e.error === 'no-speech' || e.error === 'aborted') return;
        error = e.error || 'error';
      };
      rec.onend = () => {
        if (active && opt.continuous && !error && restarts < 40) {
          restarts++;
          // 확정 못 된 중간 결과는 세션이 끝나면 사라지므로 보존한다
          finals.push(...sess.filter(Boolean));
          if (interim.trim()) finals.push(interim.trim());
          interim = '';
          try { make(); rec.start(); return; } catch (e) { /* 재시작 실패 → 종료 */ }
        }
        finish();
      };
    }
    let finished = false;
    function finish() {
      if (finished) return;
      finished = true;
      active = false;
      clearInterval(timer);
      const spanMs = firstAt ? (lastAt - firstAt) + 900 : 0;
      const tx = text();
      const conf = confs.length ? confs.reduce((a, b) => a + b, 0) / confs.length : 0;
      resolveDone({ text: tx, alts: alts.length ? alts : (tx ? [tx] : []), span: spanMs / 1000, lead: firstAt ? (firstAt - t0) / 1000 : 0, untilLast: lastAt ? (lastAt - t0) / 1000 : 0, pauses, error, conf, elapsed: (performance.now() - t0) / 1000 });
    }
    function stop() {
      if (!active) return;
      active = false;
      try { rec && rec.stop(); } catch (e) { /* 무시 */ }
      setTimeout(finish, 1800);
    }
    const timer = setInterval(() => {
      const now = performance.now();
      if (opt.maxSeconds && now - t0 > opt.maxSeconds * 1000) stop();
      else if (opt.autoStopSilence && firstAt && now - lastEvt > opt.autoStopSilence) stop();
      else if (!opt.continuous && !firstAt && now - t0 > 7000) stop();
    }, 250);
    try { make(); rec.start(); }
    catch (e) { error = 'start'; finish(); }
    return { stop, done, text };
  }

  /** 녹음 + 인식을 함께 시작. 인식이 안 되는 브라우저면 녹음만. */
  async function capture(opt) {
    const rec = await startRecorder(!SR || !!opt.forceRecord);
    if (rec && rec.error) {
      return { error: 'not-allowed', stop() {}, done: Promise.resolve({ text: '', alts: [], span: 0, pauses: 0, error: 'not-allowed', elapsed: 0 }) };
    }
    if (!SR) {
      const t0 = performance.now();
      let resolveDone;
      const done = new Promise(r => { resolveDone = r; });
      let stopped = false;
      const stop = async () => {
        if (stopped) return; stopped = true;
        clearInterval(tm);
        const blob = rec ? await rec.stop() : null;
        const el = (performance.now() - t0) / 1000;
        resolveDone({ text: '', alts: [], span: el, pauses: 0, error: rec ? '' : 'no-recorder', elapsed: el, blob });
      };
      const tm = setInterval(() => { if (opt.maxSeconds && performance.now() - t0 > opt.maxSeconds * 1000) stop(); }, 250);
      return { stop, done, text: () => '' };
    }
    const l = listen(opt);
    return {
      stop: l.stop,
      text: l.text,
      done: l.done.then(async r => {
        r.blob = rec ? await rec.stop() : null;
        // 녹음 중에 인식기가 마이크를 못 잡는 기기(일부 안드로이드): 녹음 저장을 끄고 다시 하게 한다
        if (rec && (r.error === 'audio-capture' || (!r.text && r.elapsed > 3 && opt.continuous && state.prefs.saveAudio && IS_ANDROID))) {
          state.prefs.saveAudio = false;
          save();
          r.error = r.error || 'conflict';
          toast('이 기기는 녹음과 음성 인식을 동시에 못 해요. 녹음 저장을 껐으니 다시 해 주세요.');
        }
        return r;
      }),
    };
  }

  // ---------- 화면 공통 ----------
  const main = document.getElementById('main');
  const toastEl = document.getElementById('toast');
  let cleanups = [];
  function onLeave(fn) { cleanups.push(fn); }
  function leave() { cleanups.forEach(fn => { try { fn(); } catch (e) { /* 무시 */ } }); cleanups = []; stopSpeaking(); }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function md(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function firstSpelling(w) { return String(w).split('|')[0]; }
  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 3200);
  }
  const ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
    mic: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2" fill="currentColor"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    flame: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1 3.5 5.5 6 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.4-4.2 2.6-5.4.2 1.8 1 3 2.2 3.4-.6-3.4.2-6.4.7-9z" fill="currentColor"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l7 3v5.5c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5V6z" fill="currentColor"/></svg>',
  };
  function speakBtn(text, label, cls) {
    const iconOnly = label === '';
    return `<button type="button" class="btn quiet sm ${iconOnly ? 'icon' : ''} ${cls || ''}" data-say="${esc(text)}" ${iconOnly ? 'aria-label="듣기"' : ''} ${TTS ? '' : 'disabled title="이 브라우저는 음성 합성을 지원하지 않아요"'}>${ICON.speaker}${iconOnly ? '' : `<span>${esc(label || '듣기')}</span>`}</button>`;
  }
  // data-say 버튼은 어디서든 동작
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-say]');
    if (!b || b.disabled) return;
    e.preventDefault();
    const rate = b.dataset.rate ? +b.dataset.rate : undefined;
    b.classList.add('playing');
    say(b.dataset.say, { rate }).then(() => b.classList.remove('playing'));
  });

  function supportNote() {
    if (SR) return '';
    return `<div class="note warn"><strong>이 브라우저는 영어 음성 인식을 지원하지 않아요.</strong>
      Android·PC는 <strong>Chrome</strong>, 아이폰은 <strong>Safari</strong>에서 열면 자동 채점이 됩니다.
      지금은 <strong>녹음 → 다시 듣기 → 스스로 평가</strong> 방식으로 진행해요.</div>`;
  }
  function errorText(code) { return SR_ERRORS[code] || (code ? `음성 인식 오류(${code}). 잠시 뒤 다시 해 보세요.` : ''); }

  function micButton(label) {
    return `<button type="button" class="btn mic" data-mic>${ICON.mic}<span>${esc(label || '말하기')}</span></button>`;
  }
  function setMic(btn, on, labelOn, labelOff) {
    if (!btn) return;
    btn.classList.toggle('on', on);
    btn.innerHTML = on ? `${ICON.stop}<span>${esc(labelOn || '그만 말하기')}</span>` : `${ICON.mic}<span>${esc(labelOff || '말하기')}</span>`;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function audioPlayer(blob) {
    if (!blob) return '';
    const url = URL.createObjectURL(blob);
    onLeave(() => URL.revokeObjectURL(url));
    return `<audio controls preload="metadata" src="${url}"></audio>`;
  }

  // ---------- 단계 컴포넌트 ----------
  // 각 컴포넌트는 el 안에 그리고, 끝나면 done(result)를 부른다. result.secs 는 실제로 말한 시간.

  function WarmupStep(el, w, done) {
    let left = w.seconds, timer = 0, running = false, finished = false;
    el.innerHTML = `
      <div class="step-body">
        <p class="lead">${md(w.why || '')}</p>
        <ol class="how">${w.how.map(s => `<li>${md(s)}</li>`).join('')}</ol>
        ${w.say ? `<div class="say-line"><span class="en">${esc(w.say)}</span>${speakBtn(w.say, '시범 듣기')}</div>` : ''}
        <div class="timer-wrap">
          ${ring(1)}
          <div class="timer-num mono" aria-live="off"><span id="wl">${left}</span><small>초</small></div>
        </div>
        <div class="row center">
          <button type="button" class="btn" id="wgo">시작</button>
          <button type="button" class="btn quiet" id="wdone">${finished ? '완료' : '건너뛰고 완료'}</button>
        </div>
      </div>`;
    const go = el.querySelector('#wgo'), lbl = el.querySelector('#wl'), fin = el.querySelector('#wdone');
    const tick = () => {
      left = Math.max(0, left - 0.25);
      lbl.textContent = Math.ceil(left);
      setRing(el, left / w.seconds);
      if (left <= 0) { stopT(); finished = true; go.textContent = '다시'; fin.textContent = '완료'; fin.classList.remove('quiet'); beep(); }
    };
    const stopT = () => { clearInterval(timer); running = false; };
    go.onclick = () => {
      if (running) { stopT(); go.textContent = '계속'; return; }
      if (left <= 0) { left = w.seconds; finished = false; }
      running = true; go.textContent = '잠시 멈춤';
      timer = setInterval(tick, 250);
    };
    fin.onclick = () => { stopT(); done({ secs: 0, finished }); };
    onLeave(stopT);
  }
  function beep() {
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      const ctx = new C(); const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.06; o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.15); setTimeout(() => ctx.close(), 400);
    } catch (e) { /* 무시 */ }
    try { navigator.vibrate && navigator.vibrate(80); } catch (e) { /* 무시 */ }
  }
  function ring(frac) {
    const r = 52, c = 2 * Math.PI * r;
    return `<svg class="ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" class="track"/><circle cx="60" cy="60" r="${r}" class="fill" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - frac)).toFixed(1)}"/></svg>`;
  }
  function setRing(el, frac) {
    const f = el.querySelector('.ring .fill');
    if (!f) return;
    const c = 2 * Math.PI * 52;
    f.setAttribute('stroke-dashoffset', (c * (1 - clamp(frac, 0, 1))).toFixed(1));
  }

  /** 한 단어 말하기 시도. 결과: 'ok' | 'partner' | 'close' | 'other' | 'none' | 'self-ok' | 'self-no' */
  async function wordTrial(box, target, partner, topt) {
    topt = topt || {};
    const word = firstSpelling(target);
    box.innerHTML = `
      <div class="trial">
        <div class="big-word">${esc(word)}</div>
        <p class="vs muted small">헷갈리기 쉬운 짝: <span class="en">${esc(firstSpelling(partner))}</span></p>
        <div class="row center">${topt.noListenFirst ? '' : speakBtn(word, '듣기')}${micButton('말하기')}</div>
        <p class="verdict" aria-live="polite"></p>
      </div>`;
    const btn = box.querySelector('[data-mic]'), out = box.querySelector('.verdict');
    return new Promise(resolve => {
      let ses = null, tries = 0;
      btn.onclick = async () => {
        if (ses) { ses.stop(); return; }
        stopSpeaking();
        setMic(btn, true, '듣는 중… 멈추기');
        out.className = 'verdict';
        out.textContent = SR ? '지금 말하세요' : '녹음 중… 말한 뒤 멈추기를 누르세요';
        ses = await capture({ continuous: false, maxAlt: 5, interim: false, maxSeconds: SR ? 8 : 6 });
        if (ses.error) { out.textContent = errorText(ses.error); setMic(btn, false); ses = null; return; }
        onLeave(() => ses && ses.stop());
        const r = await ses.done;
        ses = null;
        setMic(btn, false, '', '다시 말하기');
        if (!SR) {
          out.innerHTML = `${audioPlayer(r.blob)}<span class="muted small">원어민 발음과 비교해 보세요.</span>
            <span class="row center"><button type="button" class="btn sm" data-self="1">비슷했다</button><button type="button" class="btn quiet sm" data-self="0">아직 다르다</button></span>`;
          out.querySelectorAll('[data-self]').forEach(b => { b.onclick = () => resolve(b.dataset.self === '1' ? 'self-ok' : 'self-no'); });
          return;
        }
        if (r.error) { out.textContent = errorText(r.error); return; }
        const j = S.judgeWord(target, partner, r.alts);
        tries++;
        if (j.verdict === 'ok') { out.className = 'verdict good'; out.innerHTML = `${ICON.check} 정확해요 — “${esc(j.heard)}”`; setTimeout(() => resolve('ok'), r.blob ? 1500 : 900); }
        else if (j.verdict === 'partner') { out.className = 'verdict bad'; out.innerHTML = `“${esc(j.heard)}”로 들렸어요. 짝 단어와 섞였어요.`; showNext(box, () => resolve('partner')); }
        else if (j.verdict === 'none') { out.textContent = '소리를 듣지 못했어요. 마이크 가까이에서 또렷하게 다시 해 보세요.'; }
        else if (tries >= 3) { out.className = 'verdict bad'; out.textContent = `“${j.heard}”로 들렸어요. 이번 단어는 틀린 것으로 하고 복습에 넣을게요.`; showNext(box, () => resolve(j.verdict)); }
        else { out.className = 'verdict'; out.textContent = `“${j.heard}”로 들렸어요. 한 번 더 해 보세요. (${tries}/3)`; }
        if (r.blob && j.verdict !== 'ok') abCompare(out, word, r.blob);
      };
    });
  }
  /** 원어민 → 내 발음 순서로 이어 듣기 */
  function abCompare(holder, text, blob) {
    const url = URL.createObjectURL(blob);
    onLeave(() => URL.revokeObjectURL(url));
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn quiet sm ab';
    b.innerHTML = `${ICON.speaker}<span>원어민 → 내 발음 비교</span>`;
    b.onclick = async () => {
      b.disabled = true;
      await say(text);
      const a = new Audio(url);
      a.onended = a.onerror = () => { b.disabled = false; };
      a.play().catch(() => { b.disabled = false; });
    };
    holder.appendChild(b);
  }
  function showNext(box, fn) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn sm'; b.textContent = '다음';
    b.onclick = fn;
    box.querySelector('.trial').appendChild(b);
    b.focus();
  }

  /** 문장 따라 말하기(정답 문장 대비 단어별 채점). onResult(accuracy, missed) */
  function SentenceTry(el, sentence, opt) {
    opt = opt || {};
    const dw = S.displayWords(sentence);
    el.innerHTML = `
      <p class="sentence en" lang="en">${dw.map(w => w.space ? w.text : `<span class="w" data-from="${w.from}" data-n="${w.count}">${esc(w.text)}</span>`).join('')}</p>
      <div class="row">${speakBtn(sentence, '듣기')}${speakBtn(sentence, '천천히', 'slow')}${micButton('따라 말하기')}</div>
      <p class="heard small muted" aria-live="polite"></p>`;
    const slow = el.querySelector('.slow'); if (slow) slow.dataset.rate = '0.7';
    const btn = el.querySelector('[data-mic]'), heard = el.querySelector('.heard');
    let ses = null, best = -1;
    btn.onclick = async () => {
      if (ses) { ses.stop(); return; }
      stopSpeaking();
      setMic(btn, true);
      el.querySelectorAll('.w').forEach(w => w.classList.remove('hit', 'miss'));
      heard.textContent = SR ? '듣는 중…' : '녹음 중…';
      ses = await capture({ continuous: true, autoStopSilence: 2200, maxSeconds: 30, onUpdate: t => { heard.textContent = t; paint(t, false); } });
      if (ses.error) { heard.textContent = errorText(ses.error); setMic(btn, false); ses = null; return; }
      onLeave(() => ses && ses.stop());
      const r = await ses.done;
      ses = null;
      setMic(btn, false, '', '다시 말하기');
      if (!SR) {
        heard.innerHTML = `${audioPlayer(r.blob)} <span class="row"><button type="button" class="btn sm" data-self="1">거의 같았다</button><button type="button" class="btn quiet sm" data-self="0">아직 어렵다</button></span>`;
        heard.querySelectorAll('[data-self]').forEach(b => { b.onclick = () => { const acc = b.dataset.self === '1' ? 1 : 0.5; best = Math.max(best, acc); opt.onResult && opt.onResult(best, [], r); }; });
        return;
      }
      if (r.error) { heard.textContent = errorText(r.error); return; }
      if (!r.text) { heard.textContent = '소리를 듣지 못했어요. 다시 해 보세요.'; return; }
      const a = paint(r.text, true);
      heard.innerHTML = `들린 문장: <span class="en">“${esc(r.text)}”</span> · <strong>${Math.round(a.accuracy * 100)}%</strong>`;
      if (r.blob) abCompare(heard, sentence, r.blob);
      const missed = [];
      a.target.forEach((w, i) => { if (!a.hit[i]) missed.push(w); });
      if (a.accuracy > best) best = a.accuracy;
      opt.onResult && opt.onResult(a.accuracy, missed, r);
    };
    function paint(text, final) {
      const a = S.align(sentence, text);
      el.querySelectorAll('.w').forEach(w => {
        const from = +w.dataset.from, n = +w.dataset.n;
        if (!n) return;
        let ok = true;
        for (let k = from; k < from + n; k++) if (!a.hit[k]) ok = false;
        w.classList.toggle('hit', ok);
        w.classList.toggle('miss', final && !ok);
      });
      return a;
    }
  }

  /** 강세 표기(대문자 음절)를 굵게, 연음 기호(‿)를 강조해 보여 준다 */
  function stressHtml(show) {
    return esc(show).replace(/[A-Z]{2,}|\b[A-Z](?=[a-z]*[A-Z])/g, m => `<b class="st">${m}</b>`).replace(/‿/g, '<span class="link">‿</span>');
  }
  const RTYPE = { stress: '단어 강세', schwa: '약하게 말하기', linking: '연음', reduction: '축약', focus: '문장 강세', twister: '혀 꼬기' };

  function RhythmStep(el, item, done) {
    const isTw = item.type === 'twister';
    const lines = isTw ? item.lines.slice() : shuffle(item.lines).slice(0, 3);
    let i = 0, sum = 0, n = 0;
    el.innerHTML = `
      <div class="step-body">
        <details class="tipbox" open><summary><span class="ipa">${esc(RTYPE[item.type] || '')}</span> <span class="small">요령</span></summary>
          <p>${md(item.ko)}</p><p class="how-to">${md(item.tip)}</p></details>
        <p class="small muted">${isTw ? '원어민 속도로 들어 본 뒤, <strong>세 번 연속</strong> 최대한 빠르고 정확하게 말해 보세요.' : '먼저 듣고, 굵게 표시된 부분을 <strong>길고·크고·높게</strong> 살려 따라 말하세요. 인식기는 단어만 확인하니 강세·리듬은 <strong>원어민 → 내 발음 비교</strong>로 직접 들어 보세요.'}</p>
        <div id="rl"></div>
        <div class="row end" id="rfin"></div>
      </div>`;
    const box = el.querySelector('#rl'), fin = el.querySelector('#rfin');
    if (isTw) twister(); else line();

    function line() {
      const L = lines[i];
      box.innerHTML = `<p class="muted small">${i + 1} / ${lines.length}</p>
        <p class="show en" lang="en">${stressHtml(L.show || L.text)}</p>
        ${L.ko ? `<p class="small muted">${esc(L.ko)}</p>` : ''}
        <div id="rs"></div>`;
      fin.innerHTML = `<button type="button" class="btn quiet sm">${i + 1 < lines.length ? '다음 문장' : '완료'}</button>`;
      let got = null;
      SentenceTry(box.querySelector('#rs'), L.text, { onResult(acc) { got = Math.max(got || 0, acc); fin.querySelector('button').className = 'btn sm'; } });
      fin.querySelector('button').onclick = () => {
        if (got != null) { sum += got; n++; }
        i++;
        if (i < lines.length) line(); else finish();
      };
    }
    function twister() {
      const L = lines[Math.floor(Math.random() * lines.length)];
      const target = [L.text, L.text, L.text].join(' ');
      const bestKey = 'tw:' + item.id;
      const best = (state.best || {})[bestKey];
      box.innerHTML = `<p class="show en big" lang="en">${esc(L.text)}</p>
        <div class="row">${speakBtn(L.text, '듣기')}${speakBtn(L.text, '천천히', 'slow')}${micButton('3번 연속 말하기')}</div>
        <p class="small muted">${best ? `내 최고 기록: ${best.secs}초 · 정확도 ${Math.round(best.acc * 100)}%` : '첫 기록에 도전해 보세요.'}</p>
        <p class="heard small" aria-live="polite"></p>`;
      const slow = box.querySelector('.slow'); if (slow) slow.dataset.rate = '0.7';
      const btn = box.querySelector('[data-mic]'), heard = box.querySelector('.heard');
      let ses = null;
      fin.innerHTML = `<button type="button" class="btn quiet sm">건너뛰고 완료</button>`;
      fin.querySelector('button').onclick = finish;
      btn.onclick = async () => {
        if (ses) { ses.stop(); return; }
        stopSpeaking();
        setMic(btn, true, '다 했어요');
        heard.textContent = SR ? '시작! 세 번 연속으로' : '녹음 중…';
        ses = await capture({ continuous: true, autoStopSilence: 1800, maxSeconds: 40, onUpdate: t => { heard.textContent = t; } });
        if (ses.error) { heard.textContent = errorText(ses.error); setMic(btn, false); ses = null; return; }
        onLeave(() => ses && ses.stop());
        const r = await ses.done;
        ses = null;
        setMic(btn, false, '', '다시 도전');
        if (!SR) { heard.innerHTML = audioPlayer(r.blob); sum += 0.8; n++; fin.innerHTML = '<button type="button" class="btn sm">완료</button>'; fin.querySelector('button').onclick = finish; return; }
        if (r.error || !r.text) { heard.textContent = r.error ? errorText(r.error) : '소리를 듣지 못했어요.'; return; }
        const a = S.align(target, r.text);
        const secs = Math.round(Math.max(1, (r.untilLast || r.span) - 0.3) * 10) / 10;
        const rec = { acc: a.accuracy, secs };
        const better = a.accuracy >= 0.85 && (!best || secs < best.secs);
        if (better) { state.best = Object.assign({}, state.best, { [bestKey]: rec }); save(); }
        heard.innerHTML = `<strong>${secs}초</strong> · 정확도 <strong>${Math.round(a.accuracy * 100)}%</strong>${better ? ' — 새 최고 기록!' : a.accuracy < 0.85 ? ' — 정확도 85% 이상이어야 기록돼요' : ''}<br><span class="en muted">“${esc(r.text)}”</span>`;
        if (r.blob) abCompare(heard, L.text, r.blob);
        sum = Math.max(sum, a.accuracy); n = 1;
        fin.innerHTML = '<button type="button" class="btn sm">완료</button>';
        fin.querySelector('button').onclick = finish;
      };
    }
    function finish() { done({ secs: 25, acc: n ? sum / n : null }); }
  }

  function SoundStep(el, s, done) {
    const pairs = s.pairs.slice();
    const rnd = Math.random;
    const listenQs = TTS ? shuffle(pairs, rnd).slice(0, 3).map(p => ({ pair: p, side: rnd() < 0.5 ? 0 : 1 })) : [];
    const speakQs = shuffle(pairs, rnd).slice(0, 6).map(p => ({ pair: p, side: rnd() < 0.5 ? 0 : 1 }));
    const res = { listenOk: 0, listenN: 0, ok: 0, n: 0, sentence: null, missed: [] };
    el.innerHTML = `
      <div class="step-body">
        <details class="tipbox" ${state.soundStats[s.id] ? '' : 'open'}>
          <summary><span class="ipa mono">${esc(s.ipa || '')}</span> <span class="small">입 모양 팁</span></summary>
          <p>${md(s.ko)}</p>
          <p class="how-to">${md(s.tip)}</p>
        </details>
        <ol class="phase-list" aria-label="진행 순서">
          ${listenQs.length ? '<li data-ph="1">듣고 고르기</li>' : ''}<li data-ph="2">단어 말하기</li><li data-ph="3">문장 말하기</li>
        </ol>
        <div id="ph"></div>
      </div>`;
    const ph = el.querySelector('#ph');
    const mark = n => el.querySelectorAll('.phase-list li').forEach(li => { li.classList.toggle('cur', +li.dataset.ph === n); li.classList.toggle('past', +li.dataset.ph < n); });

    let qi = 0;
    function listenPhase() {
      if (qi >= listenQs.length) { qi = 0; return speakPhase(); }
      mark(1);
      const q = listenQs[qi];
      const target = firstSpelling(q.pair[q.side]);
      ph.innerHTML = `
        <div class="trial">
          <p class="muted small">${qi + 1} / ${listenQs.length} · 들리는 단어를 고르세요</p>
          <div class="row center">${speakBtn(target, '다시 듣기')}</div>
          <div class="choices two">${q.pair.map((w, i) => `<button type="button" class="choice en" data-i="${i}">${esc(firstSpelling(w))}</button>`).join('')}</div>
          <p class="verdict" aria-live="polite"></p>
        </div>`;
      say(target);
      ph.querySelectorAll('.choice').forEach(b => {
        b.onclick = () => {
          const right = +b.dataset.i === q.side;
          res.listenN++; if (right) res.listenOk++;
          ph.querySelectorAll('.choice').forEach(x => { x.disabled = true; if (+x.dataset.i === q.side) x.classList.add('right'); });
          if (!right) b.classList.add('wrong');
          const v = ph.querySelector('.verdict');
          v.className = 'verdict ' + (right ? 'good' : 'bad');
          v.textContent = right ? '맞아요!' : `정답은 “${target}”. 두 단어를 번갈아 들어 보세요.`;
          if (!right) v.insertAdjacentHTML('beforeend', `<span class="row center">${q.pair.map(w => speakBtn(firstSpelling(w), firstSpelling(w))).join('')}</span>`);
          showNext(ph, () => { qi++; listenPhase(); });
        };
      });
    }
    async function speakPhase() {
      mark(2);
      for (let i = 0; i < speakQs.length; i++) {
        const q = speakQs[i];
        ph.innerHTML = `<p class="muted small">${i + 1} / ${speakQs.length} · 단어를 또박또박 말하세요</p><div id="tb"></div>`;
        const v = await wordTrial(ph.querySelector('#tb'), q.pair[q.side], q.pair[1 - q.side]);
        if (!document.body.contains(ph)) return;
        // 세 번 시도해도 정답으로 안 들린 경우(close/other)도 틀린 것으로 센다
        res.n++;
        const good = v === 'ok' || v === 'self-ok';
        if (good) res.ok++;
        else {
          const w = firstSpelling(q.pair[q.side]);
          res.missed.push(w);
          addReview(`w:${s.id}:${w}`, { kind: 'word', sound: s.id, target: q.pair[q.side], partner: q.pair[1 - q.side] });
        }
      }
      sentencePhase();
    }
    function sentencePhase() {
      mark(3);
      const sent = s.sentences[Math.floor(Math.random() * s.sentences.length)];
      ph.innerHTML = `<p class="muted small">이 소리가 몰린 문장입니다. 먼저 듣고, 따라 말하세요.</p><div id="sb"></div><div class="row end" id="sfin"></div>`;
      const fin = ph.querySelector('#sfin');
      SentenceTry(ph.querySelector('#sb'), sent, {
        onResult(acc) {
          res.sentence = Math.max(res.sentence || 0, acc);
          fin.innerHTML = `<button type="button" class="btn">드릴 완료</button>`;
          fin.querySelector('button').onclick = finish;
        },
      });
      fin.innerHTML = `<button type="button" class="btn quiet sm">문장은 건너뛰기</button>`;
      fin.querySelector('button').onclick = finish;
    }
    function finish() {
      const st = state.soundStats[s.id] || { n: 0, ok: 0 };
      st.n += res.n; st.ok += res.ok;
      state.soundStats[s.id] = st;
      save();
      done(Object.assign({ secs: 30 + res.n * 3 }, res));
    }
    listenQs.length ? listenPhase() : speakPhase();
  }

  function PassageStep(el, p, done, opt) {
    opt = opt || {};
    const dw = S.displayWords(p.text);
    let offset = 0;
    dw.forEach(w => { w.at = offset; offset += w.text.length; });
    const total = S.tokens(p.text).length;
    let best = null;
    el.innerHTML = `
      <div class="step-body">
        <p class="muted small">${esc(p.ko || '')} · <span class="mono">${total} words${p.level ? ' · Lv.' + p.level : ''}</span></p>
        <ol class="mini-steps"><li>원어민 음성을 한 번 듣는다</li><li>소리 내어 따라 읽는다 — 끝까지 멈추지 말고</li><li>빨간 단어만 다시 들어 본다</li></ol>
        <div class="passage en" lang="en">${dw.map(w => w.space ? w.text : `<span class="w" data-from="${w.from}" data-n="${w.count}" data-at="${w.at}">${esc(w.text)}</span>`).join('')}</div>
        <div class="row">
          <button type="button" class="btn quiet sm" id="plisten" ${TTS ? '' : 'disabled'}>${ICON.speaker}<span>원어민 듣기</span></button>
          <label class="rate small muted">속도 <select id="prate">
            ${[0.7, 0.8, 0.9, 1, 1.1].map(r => `<option value="${r}" ${Math.abs(r - state.prefs.rate) < 0.01 ? 'selected' : ''}>${r}×</option>`).join('')}</select></label>
          ${micButton('따라 읽기')}
        </div>
        <p class="live small muted" aria-live="polite"></p>
        <div id="presult"></div>
      </div>`;
    const words = Array.from(el.querySelectorAll('.w'));
    const listenBtn = el.querySelector('#plisten');
    const rateSel = el.querySelector('#prate');
    let playing = false;
    listenBtn.onclick = () => {
      if (playing) { stopSpeaking(); return; }
      playing = true; listenBtn.classList.add('playing');
      listenBtn.querySelector('span').textContent = '멈추기';
      say(p.text, {
        rate: +rateSel.value,
        onWord(at) {
          words.forEach(w => w.classList.remove('now'));
          if (at < 0) return;
          let cur = null;
          for (const w of words) { if (+w.dataset.at <= at) cur = w; else break; }
          if (cur) cur.classList.add('now');
        },
      }).then(() => { playing = false; listenBtn.classList.remove('playing'); listenBtn.querySelector('span').textContent = '원어민 듣기'; words.forEach(w => w.classList.remove('now')); });
    };
    const btn = el.querySelector('[data-mic]'), live = el.querySelector('.live'), out = el.querySelector('#presult');
    let ses = null;
    btn.onclick = async () => {
      if (ses) { ses.stop(); return; }
      stopSpeaking();
      words.forEach(w => w.classList.remove('hit', 'miss'));
      setMic(btn, true, '다 읽었어요');
      live.textContent = SR ? '읽기 시작하세요. 끝나면 자동으로 멈춰요.' : '녹음 중… 다 읽으면 버튼을 누르세요.';
      out.innerHTML = '';
      ses = await capture({
        continuous: true, maxSeconds: 120, autoStopSilence: 4000, forceRecord: !!opt.baseline,
        onUpdate(t) {
          const a = paint(t, false);
          live.textContent = `${a.hits} / ${a.total} 단어`;
          if (a.hits >= a.total) ses && ses.stop();
        },
      });
      if (ses.error) { live.textContent = errorText(ses.error); setMic(btn, false, '', '따라 읽기'); ses = null; return; }
      onLeave(() => ses && ses.stop());
      const r = await ses.done;
      ses = null;
      setMic(btn, false, '', '다시 읽기');
      live.textContent = '';
      if (!SR) { selfResult(r); return; }
      if (r.error) { live.textContent = errorText(r.error); return; }
      if (!r.text) { live.textContent = '소리를 듣지 못했어요. 다시 해 보세요.'; return; }
      const a = paint(r.text, true);
      // 인식 결과가 한꺼번에 늦게 오면 첫~마지막 결과 간격이 너무 짧아진다 → ‘시작~마지막 결과’로 보정
      const secs = Math.max(3, r.span, (r.untilLast || 0) - 0.8);
      const rawWpm = Math.round(S.tokens(r.text).length / (secs / 60));
      const wpm = Math.min(rawWpm, 240);
      const missed = [];
      a.target.forEach((w, i) => { if (!a.hit[i] && !missed.includes(w)) missed.push(w); });
      const cur = { acc: a.accuracy, wpm, secs, missed, blob: r.blob };
      if (!best || cur.acc > best.acc) best = cur;
      out.innerHTML = `
        <div class="result">
          <div class="meter three">
            <div><span class="v">${Math.round(a.accuracy * 100)}<small>%</small></span><span class="k">정확도</span></div>
            <div><span class="v">${wpm}</span><span class="k">WPM · ${S.paceLabel(wpm)}</span></div>
            <div><span class="v">${a.hits}<small>/${a.total}</small></span><span class="k">인식된 단어</span></div>
          </div>
          ${missed.length ? `<div class="missed"><p class="small muted">놓친 단어 — 눌러서 들어 보세요</p><div class="chips">${missed.slice(0, 16).map(w => `<button type="button" class="chip en" data-say="${esc(w)}">${esc(w)}</button>`).join('')}</div></div>` : '<p class="good-text">한 단어도 놓치지 않았어요!</p>'}
          ${audioPlayer(r.blob)}
          <p class="small muted">원어민 속도는 보통 140–160 WPM. 정확도가 90% 이상이면 속도를 올려 보세요.</p>
          <div class="row end"><button type="button" class="btn" id="pdone">${opt.doneLabel || '섀도잉 완료'}</button></div>
        </div>`;
      out.querySelector('#pdone').onclick = finish;
    };
    function selfResult(r) {
      out.innerHTML = `<div class="result">${audioPlayer(r.blob)}
        <p class="small">원어민 음성과 비교해 스스로 평가해 보세요.</p>
        <div class="row"><button type="button" class="btn sm" data-self="0.95">거의 똑같았다</button><button type="button" class="btn quiet sm" data-self="0.8">몇 군데 막혔다</button><button type="button" class="btn quiet sm" data-self="0.6">많이 어려웠다</button></div></div>`;
      out.querySelectorAll('[data-self]').forEach(b => { b.onclick = () => { best = { acc: +b.dataset.self, wpm: Math.round(total / (Math.max(3, r.span) / 60)), secs: r.span, missed: [], self: true }; finish(); }; });
    }
    function paint(text, final) {
      const a = S.align(p.text, text);
      words.forEach(w => {
        const from = +w.dataset.from, n = +w.dataset.n;
        if (!n) return;
        let ok = true;
        for (let k = from; k < from + n; k++) if (!a.hit[k]) ok = false;
        w.classList.toggle('hit', ok);
        w.classList.toggle('miss', final && !ok);
      });
      return a;
    }
    function finish() {
      if (!best) return;
      if (opt.baseline) {
        const b = el.querySelector('#pdone'); if (b) b.disabled = true;
        keepAudio(best.blob).then(audio => done({ secs: best.secs, acc: best.acc, wpm: best.wpm, missed: best.missed, audio }));
        return;
      }
      state.passLog.push({ date: today(), id: p.id, level: p.level, acc: +best.acc.toFixed(3), wpm: best.wpm });
      state.passLog = state.passLog.slice(-200);
      adjustLevel();
      save();
      done({ secs: best.secs, acc: best.acc, wpm: best.wpm, missed: best.missed });
    }
  }

  /** 즉흥 말하기(60초) — retell 모드면 30초, 키워드 커버리지 계산 */
  function TalkStep(el, topic, done, opt) {
    opt = opt || {};
    const seconds = window.__spkTalkSeconds || opt.seconds || 60; // __spkTalkSeconds: 테스트용
    const fw = FRAMEWORKS[topic.fw] || FRAMEWORKS.prep;
    const hints = opt.keywords ? [] : (topic.hints || []);
    const attempts = [];
    renderPrep();

    function renderPrep() {
      el.innerHTML = `
        <div class="step-body">
          ${opt.retell ? `<p class="lead">방금 따라 읽은 글을 <strong>보지 않고</strong> 자기 말로 ${seconds}초 동안 요약하세요. 핵심 단어를 많이 쓸수록 좋아요.</p>
            <details class="peek"><summary>글 다시 보기</summary><p class="en small">${esc(opt.passage.text)}</p></details>` : `
          <div class="prompt">
            <span class="cat">${esc(CATS[topic.cat] || '')}</span>
            <p class="q en" lang="en">${esc(topic.q)}</p>
            <p class="ko muted">${esc(topic.ko)}</p>
            <div class="row">${speakBtn(topic.q, '질문 듣기')}</div>
          </div>
          <div class="fw">
            <p class="eyebrow">말하기 틀 · ${esc(fw.name)} <span class="muted">${esc(fw.ko)}</span></p>
            <ol>${fw.steps.map(s => `<li><strong>${esc(s[0])}</strong> <span class="muted small">${esc(s[1])}</span><span class="starter en">${esc(s[2])}</span></li>`).join('')}</ol>
          </div>
          ${hints.length ? `<p class="small">써 보면 좋은 단어: ${hints.map(h => `<button type="button" class="chip en" data-say="${esc(h)}">${esc(h)}</button>`).join(' ')}</p>` : ''}`}
          <div class="timer-wrap">
            ${ring(1)}
            <div class="timer-num mono"><span id="tl">${opt.retell ? seconds : 15}</span><small>${opt.retell ? '초' : '초 준비'}</small></div>
          </div>
          <div class="row center">
            ${opt.retell ? '' : '<button type="button" class="btn quiet" id="tprep">15초 생각하기</button>'}
            ${micButton(`바로 말하기 (${seconds}초)`)}
          </div>
          <p class="live small muted" aria-live="polite"></p>
          <p class="transcript en" lang="en" hidden></p>
        </div>`;
      const prepBtn = el.querySelector('#tprep');
      const tl = el.querySelector('#tl');
      let prepTimer = 0;
      if (prepBtn) prepBtn.onclick = () => {
        prepBtn.disabled = true;
        let left = 15;
        prepTimer = setInterval(() => {
          left -= 0.25;
          tl.textContent = Math.ceil(Math.max(0, left));
          setRing(el, left / 15);
          if (left <= 0) { clearInterval(prepTimer); beep(); startTalk(); }
        }, 250);
      };
      onLeave(() => clearInterval(prepTimer));
      el.querySelector('[data-mic]').onclick = () => { clearInterval(prepTimer); startTalk(); };
    }

    let ses = null;
    async function startTalk() {
      if (ses) { ses.stop(); return; }
      stopSpeaking();
      const btn = el.querySelector('[data-mic]');
      const tl = el.querySelector('#tl');
      const live = el.querySelector('.live');
      const tr = el.querySelector('.transcript');
      const prepBtn = el.querySelector('#tprep'); if (prepBtn) prepBtn.hidden = true;
      el.querySelector('.timer-num small').textContent = '초';
      setMic(btn, true, '끝내기');
      tl.textContent = seconds; setRing(el, 1);
      live.textContent = SR ? '지금 말하세요! 멈추지 말고 끝까지.' : '녹음 중… 끝까지 말해 보세요.';
      tr.hidden = !SR; tr.textContent = '';
      const t0 = performance.now();
      ses = await capture({
        continuous: true, maxSeconds: seconds,
        onUpdate(t) {
          tr.textContent = t;
          const f = S.fillers(S.tokens(t)).total;
          live.textContent = f ? `군더더기 ${f}번` : '좋아요, 계속!';
        },
      });
      if (ses.error) { live.textContent = errorText(ses.error); setMic(btn, false, '', `바로 말하기 (${seconds}초)`); ses = null; return; }
      const tick = setInterval(() => {
        const el2 = (performance.now() - t0) / 1000;
        tl.textContent = Math.max(0, Math.ceil(seconds - el2));
        setRing(el, 1 - el2 / seconds);
      }, 200);
      onLeave(() => { clearInterval(tick); ses && ses.stop(); });
      const r = await ses.done;
      clearInterval(tick);
      ses = null;
      if (!document.body.contains(el)) return;
      beep();
      const elapsed = Math.min(seconds, r.elapsed);
      if (SR && r.error && !r.text) { live.textContent = errorText(r.error); setMic(btn, false, '', '다시 말하기'); return; }
      if (SR && !r.text) { live.textContent = '말소리를 듣지 못했어요. 마이크를 확인하고 다시 해 보세요.'; setMic(btn, false, '', '다시 말하기'); return; }
      // 말한 시간 = 시작부터 마지막 말소리까지 (생각하느라 늦게 시작한 시간도 포함)
      const secs = SR ? Math.max(3, Math.min(elapsed, (r.untilLast || r.span) + 0.4)) : elapsed;
      const a = SR ? S.analyzeTalk(r.text, secs, { pauses: r.pauses, hints, target: seconds, confidence: r.conf, topic: opt.retell ? '' : topic.q }) : null;
      let kw = null;
      if (opt.keywords && SR) {
        const used = S.keysUsed(opt.keywords, r.text);
        kw = { used, all: opt.keywords };
      }
      attempts.push({ a, r, secs, kw });
      renderResult();
    }

    function renderResult() {
      const cur = attempts[attempts.length - 1];
      const prev = attempts.length > 1 ? attempts[attempts.length - 2] : null;
      const { a, r, kw } = cur;
      if (!a) {
        el.innerHTML = `<div class="step-body">
          <p class="lead">녹음을 다시 들으며 스스로 점검해 보세요.</p>${audioPlayer(r.blob)}
          ${checklist()}
          <div class="row end"><button type="button" class="btn quiet" id="tagain">한 번 더</button><button type="button" class="btn" id="tdone">저장하고 완료</button></div></div>`;
        bindResult(cur);
        return;
      }
      const delta = (k, better) => {
        if (!prev || !prev.a) return '';
        const d = a[k] - prev.a[k];
        if (!d) return '';
        const good = better === 'up' ? d > 0 : d < 0;
        return ` <span class="delta ${good ? 'up' : 'down'}">${d > 0 ? '+' : ''}${k === 'fillerPerMin' ? d.toFixed(1) : d}</span>`;
      };
      const tips = coachTips(a, kw);
      el.innerHTML = `
        <div class="step-body">
          ${a.complete ? '' : `<div class="note warn"><strong>${a.seconds}초만 말했어요.</strong> ${a.given}초 중 ${Math.ceil(a.given * 0.75)}초 이상 말해야 기록에 점수가 남아요. 아래 점수는 참고용이에요.</div>`}
          <div class="score-head ${a.complete ? '' : 'partial'}">
            <div class="score-num"><span class="mono">${a.score}</span><small>/100</small>${delta('score', 'up')}</div>
            <div class="parts">
              ${part('분량', a.parts.volume)}${part('속도', a.parts.pace)}${part('막힘 없음', a.parts.clean)}${part('어휘 다양성', a.parts.vocab)}${a.parts.clarity != null ? part('또렷함', a.parts.clarity) : ''}
            </div>
          </div>
          <details class="how-score small muted"><summary>점수는 이렇게 매겨요</summary>
            <p><strong>분량</strong> ${a.given}초 동안 1분에 110단어 정도면 만점 · <strong>속도</strong> 100–165 WPM이 만점 · <strong>막힘 없음</strong> 군더더기와 2.5초 넘는 멈춤이 적을수록 · <strong>어휘 다양성</strong> 같은 단어를 되풀이하지 않을수록(내용어 30개 이상일 때 만점 가능)${a.parts.clarity != null ? ' · <strong>또렷함</strong> 음성 인식기가 내 말을 얼마나 확신했는지' : ''}. 질문과 관련된 단어가 하나도 없으면 20% 깎여요. 문법과 내용의 깊이는 평가하지 않아요.</p>
          </details>
          <div class="meter four">
            <div><span class="v">${a.wpm}</span><span class="k">WPM · ${S.paceLabel(a.wpm)}${delta('wpm', 'none')}</span></div>
            <div><span class="v">${a.fillerPerMin}</span><span class="k">군더더기/분${delta('fillerPerMin', 'down')}</span></div>
            <div><span class="v">${a.words}</span><span class="k">단어 · ${a.seconds}초${delta('words', 'up')}</span></div>
            <div><span class="v">${a.variety}<small>%</small></span><span class="k">어휘 다양성${delta('variety', 'up')}</span></div>
          </div>
          ${kw ? `<p class="small">핵심어 ${kw.used.length}/${kw.all.length}: ${kw.all.map(k => `<span class="chip en ${kw.used.includes(k) ? 'on' : ''}">${esc(k)}</span>`).join(' ')}</p>` : ''}
          <div class="coach">
            <p class="eyebrow">코치 피드백</p>
            <ul>${tips.map(t => `<li>${md(t)}</li>`).join('')}</ul>
          </div>
          <details class="tx" open>
            <summary>내가 한 말 (자동 받아쓰기)</summary>
            <p class="en" lang="en">${highlightFillers(r.text)}</p>
            <p class="small muted">음성 인식은 um·uh 같은 소리를 빼고 적는 경우가 많아 군더더기가 실제보다 적게 잡힐 수 있어요. 녹음을 들어 직접 확인해 보세요.</p>
          </details>
          ${audioPlayer(r.blob)}
          ${opt.retell ? '' : checklist()}
          <div class="row end">
            <button type="button" class="btn quiet" id="tagain">같은 주제로 한 번 더</button>
            <button type="button" class="btn" id="tdone">저장하고 완료</button>
          </div>
        </div>`;
      bindResult(cur);
    }
    function part(label, v) {
      return `<div class="part"><span class="small">${label}</span><span class="bar"><i style="width:${v}%"></i></span><span class="mono small">${v}</span></div>`;
    }
    function checklist() {
      return `<fieldset class="check"><legend class="eyebrow">셀프 체크 · ${esc(fw.name)}</legend>
        <p class="small muted">녹음을 들어 보고, 말한 칸에 체크하세요.</p>
        ${fw.steps.map((s, i) => `<label><input type="checkbox" data-ck="${i}"> <span><strong>${esc(s[0])}</strong> · ${esc(s[1])}</span></label>`).join('')}
        <label><input type="checkbox" data-ck="eye"> <span>첫 문장에서 바로 요점을 말했다</span></label></fieldset>`;
    }
    function bindResult(cur) {
      el.querySelector('#tagain').onclick = () => { renderPrep(); setTimeout(startTalk, 50); };
      el.querySelector('#tdone').onclick = async () => {
        const b = el.querySelector('#tdone'); b.disabled = true;
        const checks = Array.from(el.querySelectorAll('[data-ck]')).filter(x => x.checked).length;
        const best = attempts.filter(x => x.a && x.a.complete).sort((x, y) => y.a.score - x.a.score)[0] || cur;
        const audio = state.prefs.saveAudio || !SR ? await keepAudio(cur.r.blob) : '';
        const a = best.a;
        const entry = {
          date: today(), at: Date.now(), kind: opt.retell ? 'retell' : 'talk', topic: topic.id, q: opt.retell ? opt.passage.title : topic.q,
          secs: Math.round(best.secs), words: a ? a.words : 0, wpm: a ? a.wpm : 0, fpm: a ? a.fillerPerMin : 0, variety: a ? a.variety : 0,
          score: a && a.complete ? a.score : null, partial: !!(a && !a.complete), text: best.r.text || '', audio, checks, tries: attempts.length,
          kw: best.kw ? best.kw.used.length + '/' + best.kw.all.length : '',
        };
        state.talks.push(entry);
        if (state.talks.length > 400) state.talks = state.talks.slice(-400);
        save();
        done({ secs: attempts.reduce((s, x) => s + x.secs, 0), score: entry.score, partial: entry.partial, wpm: entry.wpm, fpm: entry.fpm, kw: entry.kw, self: !a });
      };
    }
    function highlightFillers(text) {
      const T = String(text).split(/(\s+)/);
      const toks = T.map(w => S.tokens(w)[0] || '');
      const f = S.fillers(toks.filter(Boolean));
      if (!f.total) return esc(text);
      // 간단히: 단일어 군더더기와 like만 표시
      const single = new Set(['um', 'uh', 'er', 'erm', 'ah', 'hmm', 'basically', 'literally', 'actually', 'like']);
      return T.map((w, i) => single.has(toks[i]) ? `<mark>${esc(w)}</mark>` : esc(w)).join('');
    }
  }
  function coachTips(a, kw) {
    const tips = [];
    if (a.onTopic === 0 && a.words >= 20) tips.push('**질문에 답했나요?** 질문에 나온 단어가 하나도 들리지 않았어요. 첫 문장에서 질문의 핵심 단어를 그대로 받아 말해 보세요. (예: “My typical commute is…”)');
    if (!a.complete) tips.push(`**끝까지 말해 보세요.** 할 말이 떨어지면 “Another thing is…”, “On top of that…”으로 이유나 예시를 하나 더 붙이면 ${a.given}초를 채울 수 있어요.`);
    else if (a.words < 60) tips.push('**분량을 늘려 보세요.** 처음 한 문장에 결론을 말하고, “The main reason is…”로 이유를, “For example…”로 예시를 붙이면 금방 채워져요.');
    if (a.wpm > 175) tips.push(`**조금 천천히.** ${a.wpm} WPM은 빠른 편이에요. 문장 끝마다 반 박자 쉬면 더 또렷하게 들려요.`);
    else if (a.wpm && a.wpm < 95 && a.words >= 25) tips.push(`**흐름을 이어 가세요.** ${a.wpm} WPM은 느린 편이에요. 완벽한 단어를 찾느라 멈추기보다 쉬운 단어로 계속 말하는 게 낫습니다.`);
    if (a.fillerPerMin >= 4) {
      const top = Object.entries(a.fillerFound).sort((x, y) => y[1] - x[1])[0];
      tips.push(`**군더더기 줄이기.** “${top[0]}”를 ${top[1]}번 썼어요. 생각할 시간이 필요하면 말 대신 **잠깐 침묵**하세요 — 침묵은 자신감 있게 들립니다.`);
    }
    if (a.repeated.length) tips.push(`**같은 단어 반복:** ${a.repeated.map(r => `“${r.w}” ${r.c}번`).join(', ')}. 다음엔 바꿔 말할 단어를 하나 준비해 보세요.`);
    if (a.parts.clarity != null && a.parts.clarity < 50) tips.push('**또렷함이 낮아요.** 인식기가 내 말을 자주 헷갈렸어요. 문장 끝 자음(-t, -d, -s)을 살리고 입을 조금 더 크게 벌려 보세요.');
    if (a.pauses >= 3) tips.push(`**긴 멈춤 ${a.pauses}번.** 말하기 틀의 다음 칸(예: “For example…”)을 떠올리면 멈춤이 줄어요.`);
    if (a.hintsUsed && a.hintsUsed.length) tips.push(`추천 단어 ${a.hintsUsed.map(h => `**${h}**`).join(', ')}를 활용했어요. 좋아요!`);
    if (a.rich.length) tips.push(`오늘 쓴 좋은 단어: ${a.rich.slice(0, 4).map(w => `**${w}**`).join(', ')}`);
    if (kw && kw.all.length && kw.used.length < Math.ceil(kw.all.length / 2)) tips.push('**핵심어를 더 넣어 보세요.** 요약할 때는 원문의 중요한 명사를 그대로 가져와도 괜찮아요.');
    if (!a.fillers && a.words >= 40) tips.push('군더더기가 인식되지 않았어요. 다만 인식기는 um·uh를 자주 빼고 적으니 녹음으로 한 번 확인해 보세요.');
    if (tips.length < 2) tips.push('**구조 확인:** 결론 → 이유 → 예시 → 결론 순서였는지 녹음으로 확인해 보세요.');
    return tips.slice(0, 5);
  }

  function UpgradeStep(el, u, done, opt) {
    opt = opt || {};
    el.innerHTML = `
      <div class="step-body">
        <p class="eyebrow">밋밋한 문장</p>
        <p class="plain en" lang="en">${esc(u.plain)}</p>
        <p class="muted">${md(u.ko)}</p>
        <p class="small">이 문장을 <strong>더 정확하고 생생하게</strong> 바꿔서 말해 보세요. 정답은 하나가 아니에요.</p>
        <div class="row">${micButton('내 버전 말하기')}<button type="button" class="btn quiet sm" id="ureveal">예시 먼저 보기</button></div>
        <p class="live small" aria-live="polite"></p>
        <div id="uans" hidden>
          <p class="eyebrow">이렇게 바꿀 수 있어요</p>
          <ul class="better">${u.better.map(b => `<li><span class="en" lang="en">${esc(b)}</span>${speakBtn(b, '')}</li>`).join('')}</ul>
          <p class="small muted">${esc(u.gloss || '')}</p>
          <p class="small">마음에 드는 문장 하나를 소리 내어 두 번 따라 말해 보세요.</p>
          <div class="row end"><button type="button" class="btn" id="udone">${opt.doneLabel || '완료'}</button></div>
        </div>
      </div>`;
    const btn = el.querySelector('[data-mic]'), live = el.querySelector('.live'), ans = el.querySelector('#uans');
    let ses = null, hit = null, said = '';
    const reveal = () => { ans.hidden = false; };
    el.querySelector('#ureveal').onclick = () => { reveal(); if (hit === null) hit = false; };
    btn.onclick = async () => {
      if (ses) { ses.stop(); return; }
      stopSpeaking();
      setMic(btn, true);
      live.className = 'live small';
      live.textContent = SR ? '듣는 중…' : '녹음 중…';
      ses = await capture({ continuous: true, autoStopSilence: 2500, maxSeconds: 25, onUpdate: t => { live.textContent = t; } });
      if (ses.error) { live.textContent = errorText(ses.error); setMic(btn, false); ses = null; return; }
      onLeave(() => ses && ses.stop());
      const r = await ses.done;
      ses = null;
      setMic(btn, false, '', '다시 말하기');
      if (!SR) {
        live.innerHTML = `${audioPlayer(r.blob)}`;
        if (hit === null) hit = 'self';
        reveal();
        return;
      }
      if (r.error) { live.textContent = errorText(r.error); return; }
      if (!r.text) { live.textContent = '소리를 듣지 못했어요. 다시 해 보세요.'; return; }
      said = r.text;
      const chk = S.upgradeCheck(u, r.text);
      const plainSame = S.align(u.plain, r.text).accuracy > 0.8 && S.tokens(r.text).length <= S.tokens(u.plain).length + 2;
      if (chk.ok) {
        hit = hit === false ? false : true;
        live.className = 'live small good-text';
        live.innerHTML = `${ICON.check} “${esc(r.text)}” — <strong>${chk.used.map(esc).join(', ')}</strong> 좋아요! 밋밋한 표현도 없어졌어요.`;
      } else if (chk.used.length && chk.weak.length) {
        live.className = 'live small';
        live.innerHTML = `“${esc(r.text)}” — <strong>${chk.used.map(esc).join(', ')}</strong>는 좋은데, 밋밋한 <strong>${chk.weak.map(esc).join(', ')}</strong>가 아직 남아 있어요. 빼고 다시 말해 보세요.`;
        return;
      } else if (plainSame) {
        live.className = 'live small';
        live.innerHTML = `“${esc(r.text)}” — 원래 문장과 거의 같아요. 단어 하나라도 바꿔 보세요.`;
        return;
      } else {
        if (hit === null) hit = 'own';
        live.className = 'live small';
        live.innerHTML = `“${esc(r.text)}” — 나만의 표현이네요. 자동으로 확인할 수 있는 핵심 표현은 아니어서, 아래 예시와 비교해 보고 며칠 뒤 복습에서 다시 만나요.`;
      }
      reveal();
    };
    el.querySelector('#udone').onclick = () => {
      const ok = hit === true || hit === 'self';
      if (!ok && !opt.review) addReview('u:' + u.id, { kind: 'upgrade', id: u.id });
      done({ secs: 20, hit: hit === true ? 'key' : hit === 'own' ? 'own' : hit === 'self' ? 'self' : 'peek', said });
    };
  }

  // ---------- 화면: 오늘 ----------
  function weekStrip() {
    const t = today();
    const [y, m, d] = t.split('-').map(Number);
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7; // 월요일 시작
    let html = '';
    let count = 0;
    for (let i = 0; i < 7; i++) {
      const ds = addDays(t, i - dow);
      const rec = state.days[ds];
      const cls = rec && rec.complete ? 'full' : rec && rec.active ? 'some' : state.freezeDays.includes(ds) ? 'frozen' : '';
      if (rec && rec.active) count++;
      html += `<li class="${cls} ${ds === t ? 'today' : ''} ${ds > t ? 'future' : ''}"><span class="dw">${WEEK[(i + 1) % 7]}</span><span class="dot" title="${shortDate(ds)}">${cls === 'frozen' ? ICON.shield : cls ? ICON.check : ''}</span></li>`;
    }
    return { html: `<ol class="week" aria-label="이번 주 연습 기록">${html}</ol>`, count };
  }

  function viewToday() {
    const plan = todayPlan();
    const t = today();
    const d = dayRec(t);
    const left = stepsLeft();
    const doneN = plan.steps.length - left.length;
    const streak = currentStreak();
    const wk = weekStrip();
    const due = dueItems().length;
    const mins = plan.steps.reduce((s, k) => s + STEPS[k].min, 0);
    const greet = d.complete ? '오늘 세션 완료!' : doneN ? '이어서 해 볼까요?' : streak ? `${streak}일째 이어 가는 중` : '오늘의 10분, 시작해 볼까요?';

    let html = `
      <section class="today-head">
        <p class="date">${prettyDate(t)}</p>
        <h1>${esc(greet)}</h1>
      </section>
      <div class="meter three">
        <div><span class="v">${ICON.flame}${streak}<small>일</small></span><span class="k">연속 기록${state.freezes ? ` · 보호권 ${state.freezes}` : ''}</span></div>
        <div><span class="v">${wk.count}<small>/7</small></span><span class="k">이번 주</span></div>
        <div><span class="v">${doneN}<small>/${plan.steps.length}</small></span><span class="k">오늘 단계</span></div>
      </div>
      ${wk.html}
      ${supportNote()}`;

    if (!state.onboarded) {
      html += `
      <section class="intro card-lite">
        <h2>매일 10분, 또렷하게 말하는 근육 만들기</h2>
        <ul class="intro-list">
          <li><strong>입 풀기 → 발음 드릴</strong> 한국어에 없는 소리(R/L, F/P, TH…)를 듣고 구별하고 말해요.</li>
          <li><strong>섀도잉</strong> 원어민 음성을 따라 읽으면 인식된 단어가 초록색으로 채워져요.</li>
          <li><strong>Daily 60</strong> 매일 바뀌는 질문에 60초 즉흥 답변. 속도·군더더기·어휘를 분석해요.</li>
          <li><strong>표현 업그레이드</strong> “very good” 같은 말을 정확한 표현으로 바꿔요.</li>
        </ul>
        <p class="small muted">녹음과 기록은 이 기기 브라우저에만 저장돼요. 음성 인식은 브라우저가 제공하는 기능을 써요.</p>
        <div class="row">
          <a class="btn" href="#start">${ICON.mic}<span>3분 시작 설정 · 발음 진단</span></a>
          <button type="button" class="btn quiet" id="skipintro">바로 시작</button>
        </div>
      </section>`;
    }

    html += `<section class="stack"><div class="sec-head"><h2>오늘의 세션</h2><span class="mono small muted">약 ${mins}분 · <a href="#prefs">길이 바꾸기</a></span></div><ol class="tickets">`;
    plan.steps.forEach((k, i) => {
      const it = itemForStep(plan, k);
      const r = d.done[k];
      const sub = k === 'rhythm' ? `${esc(RTYPE[it.type] || '')} · ${esc(it.title)}` : k === 'warmup' ? it.title : k === 'sound' ? `${it.title} <span class="mono muted">${esc(it.ipa || '')}</span>` : k === 'passage' ? `Lv.${it.level} · ${esc(it.title)}` : k === 'retell' ? `“${esc(it.title)}” 요약` : k === 'talk' ? `<span class="en">${esc(it.q)}</span>` : `<span class="en">${esc(it.plain)}</span>`;
      html += `<li><a class="ticket ${r ? 'done' : ''} ${!r && left[0] === k ? 'next' : ''}" href="#do/${k}">
        <span class="num mono">${r ? ICON.check : i + 1}</span>
        <span class="body"><span class="title">${STEPS[k].label} <span class="en-label">${STEPS[k].en}</span></span><span class="one">${sub}</span></span>
        <span class="meta mono">${r ? esc(resultLabel(k, r)) : STEPS[k].min + '분'}</span></a></li>`;
    });
    html += `</ol>`;
    if (left.length) {
      html += `<a class="btn big" href="#do/${left[0]}">${doneN ? '이어서 하기' : '오늘 세션 시작'} →</a>`;
      if (!d.active && plan.steps.includes('talk') && left[0] !== 'talk') html += `<p class="small muted center-text">바쁜 날엔 <a href="#do/talk">Daily 60만 하기 (1분)</a> — 그것만 해도 연속 기록이 이어져요.</p>`;
    } else {
      const sum = d.secs ? Math.max(1, Math.round(d.secs / 60)) : 0;
      html += `<div class="celebrate">
        <p class="big-emoji" aria-hidden="true">${ICON.flame}</p>
        <h3>${streak}일 연속 달성!</h3>
        <p class="muted">오늘 영어로 약 ${sum}분 말했어요. 내일도 같은 시간에 만나요.</p>
        <div class="row center"><a class="btn quiet" href="#lib/topic/random">보너스 Daily 60</a><button type="button" class="btn quiet" id="ics">캘린더에 매일 알림 추가</button></div>
      </div>`;
    }
    html += `</section>`;
    const lastBase = (state.baselines || []).slice(-1)[0];
    if (state.onboarded && SR && lastBase && dayNumber(t) - dayNumber(lastBase.date) >= 7) {
      html += `<div class="callout"><p><strong>주간 체크 (1분)</strong> 첫날 읽은 글을 다시 녹음해서 발음과 속도가 얼마나 변했는지 비교해요.</p><a class="btn ghost" href="#baseline">녹음하기</a></div>`;
    }
    if (due) html += `<div class="callout"><p><strong>복습 ${due}개</strong>가 기다리고 있어요. 틀렸던 단어와 표현을 다시 말해 봐요.</p><a class="btn ghost" href="#review">복습하기</a></div>`;
    main.innerHTML = html;

    const ics = document.getElementById('ics'); if (ics) ics.onclick = downloadICS;
    const skip = document.getElementById('skipintro');
    if (skip) skip.onclick = () => { state.onboarded = true; save(); location.hash = '#do/' + (left[0] || plan.steps[0]); };
  }

  // ---------- 화면: 처음 설정(목표 → 마이크 → 발음 진단 → 첫 녹음 → 알림) ----------
  function viewStart() {
    const p = state.prefs;
    const steps = ['goal', 'mic', 'diag', 'base', 'remind'];
    let i = 0;
    main.innerHTML = `<div class="stepper start">${steps.map((s, k) => `<span data-k="${k}"><span>${k + 1}</span></span>`).join('')}</div><article class="card" id="st"></article>`;
    const box = document.getElementById('st');
    const mark = () => main.querySelectorAll('.stepper.start > span').forEach((x, k) => { x.className = k < i ? 'ok' : k === i ? 'cur' : ''; });
    const next = () => { i++; show(); };
    const nav = (label, skipLabel) => `<div class="row end">${skipLabel ? `<button type="button" class="btn quiet" data-skip>${skipLabel}</button>` : ''}<button type="button" class="btn" data-next>${label || '다음'}</button></div>`;
    const bindNav = () => {
      const n = box.querySelector('[data-next]'); if (n) n.onclick = next;
      const sk = box.querySelector('[data-skip]'); if (sk) sk.onclick = next;
    };
    function show() {
      mark();
      window.scrollTo(0, 0);
      const k = steps[i];
      if (k === 'goal') {
        box.innerHTML = `<header class="card-head"><p class="crumb mono">시작 설정 1/5</p><h1>하루에 얼마나 할까요?</h1><p class="muted">짧게라도 매일 하는 게 길게 가끔 하는 것보다 효과적이에요. 나중에 바꿀 수 있어요.</p></header>
          <div class="seg col">${[5, 10, 15].map(m => `<label><input type="radio" name="m" value="${m}" ${p.minutes === m ? 'checked' : ''}><span>${m}분<small>${PLANS[m].map(x => STEPS[x].label).join(' · ')}</small></span></label>`).join('')}</div>
          <p class="eyebrow">원어민 억양</p>
          <div class="seg">${[['en-US', '미국식'], ['en-GB', '영국식']].map(([v, l]) => `<label><input type="radio" name="acc" value="${v}" ${p.accent === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          ${nav()}`;
        box.querySelectorAll('[name=m]').forEach(x => { x.onchange = () => { p.minutes = +x.value; save(); }; });
        box.querySelectorAll('[name=acc]').forEach(x => { x.onchange = () => { p.accent = x.value; p.voice = ''; save(); }; });
        bindNav();
      } else if (k === 'mic') {
        box.innerHTML = `<header class="card-head"><p class="crumb mono">시작 설정 2/5</p><h1>마이크 확인</h1><p class="muted">버튼을 누르고 브라우저가 묻는 <strong>마이크 허용</strong>을 눌러 주세요. 그다음 영어 한 문장을 말해 보세요.</p></header>
          ${supportNote()}
          <div class="row"><button type="button" class="btn mic" id="mictest">${ICON.mic}<span>마이크 확인</span></button></div>
          <p class="small" id="mtout" aria-live="polite"></p>
          ${nav('다음', '나중에')}`;
        const mt = box.querySelector('#mictest');
        mt.onclick = () => micTest(box.querySelector('#mtout'), mt);
        bindNav();
      } else if (k === 'diag') {
        if (!SR) { next(); return; }
        diagnose();
      } else if (k === 'base') {
        if (!SR) { next(); return; }
        box.innerHTML = `<header class="card-head"><p class="crumb mono">시작 설정 4/5</p><h1>첫 녹음 남기기</h1><p class="muted">아래 글을 한 번 읽어 주세요. 일주일마다 같은 글을 다시 녹음해 <strong>오늘의 나와 비교</strong>할 수 있어요.</p></header><div id="bb"></div>${nav('다음', '건너뛰기')}`;
        box.querySelector('[data-next]').hidden = true;
        BaselineStep(box.querySelector('#bb'), () => { box.querySelector('[data-next]').hidden = false; box.querySelector('[data-skip]').hidden = true; });
        bindNav();
      } else if (k === 'remind') {
        box.innerHTML = `<header class="card-head"><p class="crumb mono">시작 설정 5/5</p><h1>매일 같은 시간에</h1><p class="muted">습관은 ‘언제 할지’ 정해 둘 때 붙어요. 출근길, 점심 직후처럼 이미 매일 하는 일 바로 뒤가 좋아요. 휴대폰 캘린더에 매일 알림을 넣어 드릴게요.</p></header>
          <div class="row"><input type="time" id="rt" value="${esc(p.remindAt)}" aria-label="알림 시각"><button type="button" class="btn quiet" id="ics">캘린더에 알림 추가</button></div>
          ${state.prefs.focus.length ? `<p class="small">진단 결과로 <strong>${state.prefs.focus.map(id => esc(SOUND[id].title)).join(', ')}</strong>을(를) 집중 연습 소리로 정했어요. 설정에서 바꿀 수 있어요.</p>` : ''}
          <div class="row end"><button type="button" class="btn big" id="go">오늘 세션 시작 →</button></div>`;
        box.querySelector('#rt').onchange = e => { p.remindAt = e.target.value || '08:00'; save(); };
        box.querySelector('#ics').onclick = downloadICS;
        box.querySelector('#go').onclick = () => {
          state.onboarded = true;
          const d = dayRec(today());
          if (!Object.keys(d.done).length) d.plan = null; // 진단 결과를 오늘 계획에 반영
          save();
          location.hash = '#today';
        };
      }
    }
    async function diagnose() {
      const sets = DIAG.map(id => SOUND[id]).filter(Boolean);
      const missed = [];
      for (let n = 0; n < sets.length; n++) {
        const snd = sets[n];
        const pair = snd.pairs[Math.floor(Math.random() * snd.pairs.length)];
        const side = Math.random() < 0.5 ? 0 : 1;
        box.innerHTML = `<header class="card-head"><p class="crumb mono">시작 설정 3/5 · 발음 진단 ${n + 1}/${sets.length}</p><h1>단어를 읽어 주세요</h1><p class="muted">미리 듣지 말고 평소처럼 읽어 보세요. 잘 안 들린 소리를 집중 연습 소리로 정해요.</p></header><div id="db"></div>
          <div class="row end"><button type="button" class="btn quiet sm" id="dskip">진단 그만하기</button></div>`;
        let stop = false;
        box.querySelector('#dskip').onclick = () => { stop = true; finishDiag(); };
        const v = await wordTrial(box.querySelector('#db'), pair[side], pair[1 - side], { noListenFirst: true });
        if (stop || !document.body.contains(box)) return;
        const st = state.soundStats[snd.id] || { n: 0, ok: 0 }; st.n++;
        if (v === 'ok') st.ok++; else missed.push(snd.id);
        state.soundStats[snd.id] = st;
        save();
      }
      finishDiag();
      function finishDiag() {
        if (missed.length) state.prefs.focus = missed.slice();
        save();
        box.innerHTML = `<header class="card-head"><p class="crumb mono">시작 설정 3/5</p><h1>진단 결과</h1></header>
          ${missed.length ? `<p>헷갈리게 들린 소리: <strong>${missed.map(id => esc(SOUND[id].title)).join(', ')}</strong></p><p class="muted small">이 소리들을 먼저 돌아가며 연습해요. 전부 연습하고 싶으면 설정에서 집중 소리를 모두 해제하세요.</p>` : '<p>진단한 소리는 모두 또렷하게 들렸어요! 전체 소리를 돌아가며 연습할게요.</p>'}
          ${nav()}`;
        bindNav();
      }
    }
    show();
  }

  // 일주일마다 같은 글을 녹음해 비교하는 기준 녹음
  const BASELINE_TEXT = 'Last Friday, three of us walked to the river with a few bottles of fresh water. The light was very bright, so we sat in the shade, played a vocabulary game, and laughed about our worst first jobs. It was a relaxing way to think about the year ahead.';
  function BaselineStep(el, after) {
    PassageStep(el, { id: 'baseline', level: 0, title: 'Weekly check', text: BASELINE_TEXT, ko: '매주 같은 글' }, res => {
      state.baselines = (state.baselines || []).concat([{ date: today(), acc: +res.acc.toFixed(3), wpm: res.wpm, audio: res.audio || '' }]).slice(-60);
      markActive(res.secs || 0);
      save();
      after && after(res);
    }, { baseline: true, doneLabel: '저장' });
  }
  function viewBaseline() {
    main.innerHTML = `<article class="card"><header class="card-head"><p class="crumb mono"><a href="#today">오늘</a> · 주간 체크</p><h1>주간 체크</h1>
      <p class="muted">첫날과 같은 글이에요. 다 읽고 나면 <a href="#stats">기록</a>에서 예전 녹음과 비교해 들을 수 있어요.</p></header><div id="bb"></div><footer class="next-bar" id="nextbar" hidden></footer></article>`;
    BaselineStep(document.getElementById('bb'), () => {
      const bar = document.getElementById('nextbar');
      bar.hidden = false;
      bar.innerHTML = `<p class="small muted">${ICON.check} 저장했어요</p><a class="btn" href="#stats">비교해 듣기 →</a>`;
    });
  }
  function resultLabel(k, r) {
    if (k === 'warmup') return '완료';
    if (k === 'sound') return r.n ? `${r.ok}/${r.n}${r.sentence != null ? ` · 문장 ${Math.round(r.sentence * 100)}%` : ''}` : '완료';
    if (k === 'passage') return `${Math.round(r.acc * 100)}% · ${r.wpm}wpm`;
    if (k === 'talk' || k === 'retell') return r.score != null ? `${r.score}점 · ${r.wpm}wpm` : r.partial ? '짧게 끝냄' : '완료';
    if (k === 'upgrade') return r.hit === 'key' ? '핵심어 ✓' : '완료';
    if (k === 'rhythm') return r.acc != null ? `${Math.round(r.acc * 100)}%` : '완료';
    return '완료';
  }
  async function micTest(out, btn) {
    if (!SR) {
      if (!CAN_REC) { out.textContent = '이 브라우저는 녹음도 지원하지 않아요. Chrome이나 Safari 최신 버전에서 열어 주세요.'; return; }
      out.textContent = '3초 동안 녹음합니다. 아무 말이나 해 보세요.';
      const s = await capture({ maxSeconds: 3 });
      if (s.error) { out.textContent = errorText(s.error); return; }
      const r = await s.done;
      out.innerHTML = r.blob ? `녹음은 됩니다(자동 채점은 불가). ${audioPlayer(r.blob)}` : '녹음에 실패했어요.';
      return;
    }
    btn.disabled = true;
    out.textContent = '“Hello, nice to meet you.” 라고 말해 보세요.';
    const l = listen({ continuous: true, autoStopSilence: 1800, maxSeconds: 8, onUpdate: t => { out.textContent = '들리는 말: ' + t; } });
    const r = await l.done;
    btn.disabled = false;
    if (r.error) { out.textContent = errorText(r.error); return; }
    if (!r.text) { out.textContent = '아무 소리도 듣지 못했어요. 마이크 권한과 볼륨을 확인해 주세요.'; return; }
    out.innerHTML = `${ICON.check} 잘 들려요: <span class="en">“${esc(r.text)}”</span>`;
    state.onboarded = true; save();
  }

  // ---------- 화면: 단계 진행 ----------
  function viewStep(step) {
    const plan = todayPlan();
    if (!plan.steps.includes(step)) { location.replace('#today'); return; }
    const d = dayRec(today());
    const it = itemForStep(plan, step);
    const idx = plan.steps.indexOf(step);
    const prev = d.done[step];
    main.innerHTML = `
      <div class="stepper" aria-label="오늘 진행">${plan.steps.map((k, i) => `<a href="#do/${k}" class="${d.done[k] ? 'ok' : ''} ${k === step ? 'cur' : ''}" title="${STEPS[k].label}"><span>${i + 1}</span></a>`).join('')}</div>
      <article class="card">
        <header class="card-head">
          <p class="crumb mono"><a href="#today">오늘</a> · ${idx + 1}/${plan.steps.length} · ${STEPS[step].en}</p>
          <h1>${esc(stepTitle(step, it))}</h1>
          <p class="muted">${esc(STEPS[step].desc)}</p>
          ${prev ? `<p class="small done-note">${ICON.check} 오늘 이미 끝냈어요 (${esc(resultLabel(step, prev))}). 다시 해도 돼요.</p>` : ''}
        </header>
        ${SR ? '' : supportNote()}
        <div id="stage"></div>
        <footer class="next-bar" id="nextbar" hidden></footer>
      </article>`;
    const stage = document.getElementById('stage');
    const finish = res => {
      const first = !d.done[step];
      d.done[step] = Object.assign({ at: Date.now() }, res);
      if (step === 'talk') markSeen('topics', plan.topic);
      if (step === 'passage') markSeen('passages', plan.passage);
      if (step === 'upgrade') markSeen('upgrades', plan.upgrade);
      if (step === 'rhythm') markSeen('rhythm', plan.rhythm);
      // 입 풀기만 하고 넘기면 그날 연습으로 치지 않는다(말하기를 한 단계부터 인정)
      if (step !== 'warmup') markActive(first ? res.secs : 0);
      const left = stepsLeft();
      if (!left.length && !d.complete) { d.complete = true; d.completedAt = Date.now(); }
      save();
      updateBadge();
      const bar = document.getElementById('nextbar');
      bar.hidden = false;
      if (left.length) {
        bar.innerHTML = `<p class="small muted">${ICON.check} ${STEPS[step].label} 완료</p><a class="btn" href="#do/${left[0]}">다음: ${STEPS[left[0]].label} →</a>`;
      } else {
        bar.innerHTML = `<p class="small muted">${ICON.check} 오늘 세션을 모두 마쳤어요</p><a class="btn" href="#today">결과 보기 →</a>`;
      }
      bar.querySelector('a').focus();
    };
    runStep(step, stage, it, finish, plan);
  }
  function stepTitle(step, it) {
    if (step === 'warmup') return it.title;
    if (step === 'sound') return `${it.title}`;
    if (step === 'passage') return it.title;
    if (step === 'retell') return `요약해 말하기 · ${it.title}`;
    if (step === 'talk') return 'Daily 60';
    if (step === 'upgrade') return '표현 업그레이드';
    if (step === 'rhythm') return it.title;
    return '';
  }
  function runStep(step, stage, it, finish, plan) {
    if (step === 'warmup') return WarmupStep(stage, it, finish);
    if (step === 'sound') return SoundStep(stage, it, finish);
    if (step === 'passage') return PassageStep(stage, it, finish);
    if (step === 'retell') return TalkStep(stage, { id: it.id, q: it.title, fw: 'wsn' }, finish, { seconds: 30, retell: true, passage: it, keywords: S.keywords(it.text, 6) });
    if (step === 'talk') return TalkStep(stage, it, finish);
    if (step === 'upgrade') return UpgradeStep(stage, it, finish);
    if (step === 'rhythm') return RhythmStep(stage, it, finish);
  }

  // ---------- 화면: 복습 ----------
  function viewReview() {
    const items = dueItems().slice(0, 12);
    if (!items.length) {
      const all = Object.keys(state.items).length;
      const next = Object.values(state.items).map(x => x.due).sort()[0];
      main.innerHTML = `<h1>복습</h1>
        <div class="empty"><p>오늘 복습할 항목이 없어요.</p>
        <p class="small muted">발음 드릴에서 짝 단어와 섞인 단어, 표현 업그레이드에서 핵심어를 못 쓴 문장이 1 → 3 → 7 → 14 → 30일 간격으로 다시 나와요.${all ? ` 대기 중 ${all}개 · 다음 복습 ${shortDate(next)}` : ''}</p>
        <a class="btn ghost" href="#today">오늘로</a></div>`;
      return;
    }
    let i = 0, ok = 0;
    main.innerHTML = `<h1>복습</h1><p class="muted">${items.length}개 · 맞히면 다음 복습이 더 뒤로 밀려요.</p><div class="progress"><i id="rvbar"></i></div><article class="card" id="rv"></article>`;
    const box = document.getElementById('rv');
    const bar = document.getElementById('rvbar');
    async function next() {
      bar.style.width = (i / items.length * 100) + '%';
      if (i >= items.length) {
        markActive(items.length * 4);
        save(); updateBadge();
        box.innerHTML = `<div class="celebrate"><h3>복습 완료 ${ok}/${items.length}</h3><p class="muted">틀린 항목은 내일 다시 나와요.</p><a class="btn" href="#today">오늘로</a></div>`;
        return;
      }
      const it = items[i];
      if (it.kind === 'upgrade' || it.key.startsWith('u:')) {
        box.innerHTML = `<p class="eyebrow">표현 업그레이드 복습</p><div id="rb"></div>`;
        UpgradeStep(box.querySelector('#rb'), UPGRADE[it.id], r => {
          const good = r.hit === 'key' || r.hit === 'self';
          reviewResult(it.key, good); if (good) ok++; save(); i++; next();
        }, { review: true, doneLabel: '다음' });
      } else {
        const snd = SOUND[it.sound];
        box.innerHTML = `<p class="eyebrow">발음 복습 · ${esc(snd.title)}</p><p class="small muted">${md(snd.tip)}</p><div id="rb"></div>`;
        const v = await wordTrial(box.querySelector('#rb'), it.target, it.partner);
        if (!document.body.contains(box)) return;
        const good = v === 'ok' || v === 'self-ok';
        const st = state.soundStats[it.sound] || { n: 0, ok: 0 }; st.n++; if (good) st.ok++; state.soundStats[it.sound] = st;
        reviewResult(it.key, good); if (good) ok++; save(); i++; next();
      }
    }
    next();
  }

  // ---------- 화면: 연습실(자유 연습) ----------
  function viewLibrary() {
    const lv = [1, 2, 3];
    main.innerHTML = `
      <h1>연습실</h1>
      <p class="muted">오늘 세션 말고도 원하는 것을 골라 더 연습할 수 있어요. 여기서 한 연습도 연속 기록에 들어가요.</p>
      <div class="row"><a class="btn" href="#lib/topic/random">${ICON.mic}<span>랜덤 Daily 60</span></a><a class="btn quiet" href="#lib/upgrade/random">랜덤 표현 업그레이드</a></div>
      <section class="stack">
        <h2>발음 드릴</h2>
        <div class="grid">${SOUNDS.map(s => {
          const st = state.soundStats[s.id];
          const pct = st && st.n ? Math.round(st.ok / st.n * 100) : null;
          return `<a class="tile" href="#lib/sound/${s.id}"><span class="name">${esc(s.title)}</span><span class="mono small muted">${esc(s.ipa || '')}</span><span class="bar"><i style="width:${pct || 0}%"></i></span><span class="mono small muted">${pct == null ? '아직 안 함' : `정확도 ${pct}% · ${st.n}회`}</span></a>`;
        }).join('')}</div>
      </section>
      <section class="stack">
        <h2>섀도잉 지문</h2>
        ${lv.map(l => `<details ${l === levelNow() ? 'open' : ''}><summary>Lv.${l} ${['', '쉬움', '보통', '도전'][l]} <span class="muted small">${PASSAGES.filter(p => p.level === l).length}개</span></summary>
          <ul class="list">${PASSAGES.filter(p => p.level === l).map(p => {
            const log = state.passLog.filter(x => x.id === p.id);
            const bestAcc = log.length ? Math.max(...log.map(x => x.acc)) : null;
            return `<li><a href="#lib/passage/${p.id}"><span>${esc(p.title)}</span><span class="mono small ${bestAcc != null ? 'ok' : 'muted'}">${bestAcc != null ? Math.round(bestAcc * 100) + '%' : ''}</span></a></li>`;
          }).join('')}</ul></details>`).join('')}
      </section>
      <section class="stack">
        <h2>Daily 60 주제</h2>
        ${Object.entries(CATS).map(([c, name]) => `<details><summary>${name} <span class="muted small">${TOPICS.filter(t => t.cat === c).length}개</span></summary>
          <ul class="list">${TOPICS.filter(t => t.cat === c).map(t => `<li><a href="#lib/topic/${t.id}"><span class="en">${esc(t.q)}</span><span class="mono small ok">${state.talks.some(x => x.topic === t.id) ? '✓' : ''}</span></a></li>`).join('')}</ul></details>`).join('')}
      </section>
      ${RHYTHMS.length ? `<section class="stack">
        <h2>리듬·강세</h2>
        <ul class="list">${RHYTHMS.map(r => `<li><a href="#lib/rhythm/${r.id}"><span>${esc(r.title)}</span><span class="small muted">${esc(RTYPE[r.type] || '')}${state.best && state.best['tw:' + r.id] ? ` · 최고 ${state.best['tw:' + r.id].secs}초` : ''}</span></a></li>`).join('')}</ul>
      </section>` : ''}
      <section class="stack">
        <h2>입 풀기</h2>
        <ul class="list">${WARMUPS.map(w => `<li><a href="#lib/warmup/${w.id}"><span>${esc(w.title)}</span><span class="mono small muted">${w.seconds}초</span></a></li>`).join('')}</ul>
      </section>`;
  }
  function viewLibItem(kind, id) {
    const pools = { sound: SOUNDS, passage: PASSAGES, topic: TOPICS, upgrade: UPGRADES, warmup: WARMUPS, rhythm: RHYTHMS };
    const maps = { sound: SOUND, passage: PASSAGE, topic: TOPIC, upgrade: UPGRADE, warmup: WARMUP, rhythm: RHYTHM };
    if (!pools[kind]) { location.replace('#library'); return; }
    let it = maps[kind][id];
    if (id === 'random') {
      const pool = pools[kind];
      const seenTopics = new Set(state.talks.map(t => t.topic));
      const fresh = kind === 'topic' ? pool.filter(t => !seenTopics.has(t.id)) : pool;
      it = (fresh.length ? fresh : pool)[Math.floor(Math.random() * (fresh.length ? fresh.length : pool.length))];
      if (it) { history.replaceState(null, '', `#lib/${kind}/${it.id}`); }
    }
    if (!it) { location.replace('#library'); return; }
    const titles = { sound: it.title, passage: it.title, topic: 'Daily 60 · 자유 연습', upgrade: '표현 업그레이드', warmup: it.title, rhythm: it.title };
    main.innerHTML = `
      <article class="card">
        <header class="card-head">
          <p class="crumb mono"><a href="#library">연습실</a> · ${esc({ sound: '발음 드릴', passage: '섀도잉', topic: 'Daily 60', upgrade: '표현', warmup: '입 풀기', rhythm: '리듬·강세' }[kind])}</p>
          <h1>${esc(titles[kind])}</h1>
        </header>
        ${SR ? '' : supportNote()}
        <div id="stage"></div>
        <footer class="next-bar" id="nextbar" hidden></footer>
      </article>`;
    const stage = document.getElementById('stage');
    const finish = res => {
      if (kind !== 'warmup') markActive(res.secs || 0);
      if (kind === 'topic') markSeen('topics', it.id);
      save();
      const bar = document.getElementById('nextbar');
      bar.hidden = false;
      const again = (kind === 'topic' || kind === 'upgrade') ? `<a class="btn quiet" href="#lib/${kind}/random" data-reload>다른 것 하나 더</a>` : '';
      bar.innerHTML = `<p class="small muted">${ICON.check} 연습 완료</p><span class="row">${again}<a class="btn" href="#library">연습실로</a></span>`;
      const rl = bar.querySelector('[data-reload]'); if (rl) rl.onclick = e => { e.preventDefault(); location.hash = `#lib/${kind}/random`; route(); };
    };
    if (kind === 'sound') SoundStep(stage, it, finish);
    else if (kind === 'passage') PassageStep(stage, it, finish, { free: true, doneLabel: '연습 완료' });
    else if (kind === 'topic') TalkStep(stage, it, finish);
    else if (kind === 'upgrade') UpgradeStep(stage, it, finish);
    else if (kind === 'rhythm') RhythmStep(stage, it, finish);
    else WarmupStep(stage, it, finish);
  }

  // ---------- 화면: 기록 ----------
  function viewStats() {
    const streak = currentStreak();
    const longest = Math.max(longestStreak(), streak);
    const activeDays = Object.keys(state.days).filter(isActive);
    const totalSecs = activeDays.reduce((s, d) => s + (state.days[d].secs || 0), 0);
    const talks = state.talks.filter(t => t.kind === 'talk' && t.score != null);
    const recent = talks.slice(-20);
    main.innerHTML = `
      <h1>기록</h1>
      <div class="meter four">
        <div><span class="v">${streak}<small>일</small></span><span class="k">연속</span></div>
        <div><span class="v">${longest}<small>일</small></span><span class="k">최장 연속</span></div>
        <div><span class="v">${activeDays.length}<small>일</small></span><span class="k">연습한 날</span></div>
        <div><span class="v">${Math.round(totalSecs / 60)}<small>분</small></span><span class="k">영어로 말한 시간</span></div>
      </div>
      ${weekCompare()}
      <section class="stack">
        <div class="sec-head"><h2>최근 15주</h2><span class="small muted">${ICON.shield} 연속 보호권 ${state.freezes}/2 · 7일 연속마다 1개</span></div>
        ${calendar()}
      </section>
      <section class="stack">
        <h2>Daily 60 추이 <span class="muted small">최근 ${recent.length}회</span></h2>
        ${recent.length < 2 ? '<p class="muted small">Daily 60을 두 번 이상 하면 그래프가 나타나요.</p>' : `
        <div class="charts">
          ${lineChart('점수', recent.map(t => t.score), recent, { min: 0, max: 100, unit: '점' })}
          ${lineChart('말하기 속도 (WPM)', recent.map(t => t.wpm), recent, { band: [130, 165], unit: 'WPM', bandLabel: '적정 130–165' })}
          ${lineChart('군더더기 (분당)', recent.map(t => t.fpm), recent, { min: 0, unit: '회/분', lowerBetter: true })}
        </div>`}
      </section>
      ${baselineSection()}
      <section class="stack">
        <h2>소리별 발음 정확도</h2>
        ${soundBars()}
      </section>
      <section class="stack">
        <div class="sec-head"><h2>내 목소리 기록</h2><span class="small muted">첫 녹음과 오늘을 비교해 들어 보세요</span></div>
        ${voiceArchive()}
      </section>`;
    main.querySelectorAll('[data-play]').forEach(b => {
      b.onclick = async () => {
        const blob = await audioDB.get(b.dataset.play);
        if (!blob) { toast('녹음 파일을 찾지 못했어요.'); return; }
        const holder = b.parentElement.querySelector('.player');
        holder.innerHTML = audioPlayer(blob);
        const a = holder.querySelector('audio'); a && a.play().catch(() => {});
      };
    });
  }
  /** 이번 주(최근 7일) vs 지난주(그 전 7일) */
  function weekCompare() {
    const t = today();
    const range = (from, to) => {
      const days = [];
      for (let i = from; i < to; i++) days.push(addDays(t, -i));
      const set = new Set(days);
      const tk = state.talks.filter(x => x.kind === 'talk' && x.score != null && set.has(x.date));
      const avg = k => tk.length ? Math.round(tk.reduce((s, x) => s + x[k], 0) / tk.length * 10) / 10 : null;
      return { days: days.filter(isActive).length, mins: Math.round(days.reduce((s, d) => s + ((state.days[d] && state.days[d].secs) || 0), 0) / 60), score: avg('score'), wpm: avg('wpm'), fpm: avg('fpm'), n: tk.length };
    };
    const a = range(0, 7), b = range(7, 14);
    if (!a.days && !b.days) return '';
    const cell = (label, v, pv, unit, lower) => {
      let d = '';
      if (v != null && pv != null && v !== pv) {
        const diff = Math.round((v - pv) * 10) / 10;
        const good = lower ? diff < 0 : diff > 0;
        d = ` <span class="delta ${good ? 'up' : 'down'}">${diff > 0 ? '+' : ''}${diff}</span>`;
      }
      return `<div><span class="v">${v == null ? '–' : v}<small>${unit}</small></span><span class="k">${label}${d}</span></div>`;
    };
    return `<section class="stack"><div class="sec-head"><h2>이번 주 vs 지난주</h2><span class="small muted">최근 7일 기준</span></div>
      <div class="meter four">
        ${cell('연습한 날', a.days, b.days, '일')}${cell('말한 시간', a.mins, b.mins, '분')}${cell('Daily 60 평균', a.score, b.score, '점')}${cell('군더더기/분', a.fpm, b.fpm, '', true)}
      </div></section>`;
  }
  function baselineSection() {
    const list = state.baselines || [];
    if (!list.length) return SR ? `<section class="stack"><h2>주간 체크</h2><p class="muted small">같은 글을 매주 녹음해 발음 변화를 비교해요. <a href="#baseline">첫 녹음 하기</a></p></section>` : '';
    const first = list[0], last = list[list.length - 1];
    const rows = list.length > 6 ? [first].concat(list.slice(-5)) : list;
    return `<section class="stack"><div class="sec-head"><h2>주간 체크</h2><span class="small muted">같은 글 · 첫 기록 대비 정확도 ${Math.round((last.acc - first.acc) * 100) >= 0 ? '+' : ''}${Math.round((last.acc - first.acc) * 100)}%p</span></div>
      <ul class="archive">${rows.map((b, k) => `<li><div class="a-head"><span class="mono small">${shortDate(b.date)}${k === 0 ? ' · 첫 기록' : ''}</span><span class="mono small">정확도 ${Math.round(b.acc * 100)}% · ${b.wpm}wpm</span></div>
        ${b.audio ? `<div class="row"><button type="button" class="btn quiet sm" data-play="${esc(b.audio)}">${ICON.play}<span>듣기</span></button><span class="player"></span></div>` : ''}</li>`).join('')}</ul>
      <a class="btn quiet sm" href="#baseline">지금 다시 녹음하기</a></section>`;
  }
  function calendar() {
    const t = today();
    const [y, m, d] = t.split('-').map(Number);
    const dow = (new Date(y, m - 1, d).getDay() + 6) % 7;
    const start = addDays(t, -dow - 7 * 14);
    let cells = '';
    for (let i = 0; i < 15 * 7; i++) {
      const ds = addDays(start, i);
      const rec = state.days[ds];
      const lvl = ds > t ? 'f' : rec && rec.complete ? 3 : rec && rec.active ? (rec.secs > 240 ? 2 : 1) : state.freezeDays.includes(ds) ? 'z' : 0;
      cells += `<i class="c c${lvl}" title="${shortDate(ds)}${rec && rec.active ? ` · ${Math.round((rec.secs || 0) / 60)}분` : ''}"></i>`;
    }
    return `<div class="cal" role="img" aria-label="최근 15주 연습 달력">${cells}</div>
      <p class="legend small muted"><i class="c c0"></i>쉼 <i class="c c1"></i>조금 <i class="c c2"></i>많이 <i class="c c3"></i>세션 완료 <i class="c cz"></i>보호권</p>`;
  }
  function lineChart(title, vals, rows, opt) {
    const W = 320, H = 120, P = { l: 30, r: 10, t: 12, b: 20 };
    const lo = opt.min != null ? opt.min : Math.min(...vals, opt.band ? opt.band[0] : Infinity);
    let hi = opt.max != null ? opt.max : Math.max(...vals, opt.band ? opt.band[1] : -Infinity);
    if (hi === lo) hi = lo + 1;
    const lo2 = opt.min != null ? lo : Math.floor(lo * 0.9), hi2 = opt.max != null ? hi : Math.ceil(hi * 1.1);
    const x = i => P.l + (vals.length === 1 ? 0 : i * (W - P.l - P.r) / (vals.length - 1));
    const yy = v => P.t + (1 - (v - lo2) / (hi2 - lo2)) * (H - P.t - P.b);
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${yy(v).toFixed(1)}`).join(' ');
    const band = opt.band ? `<rect x="${P.l}" y="${yy(opt.band[1]).toFixed(1)}" width="${W - P.l - P.r}" height="${(yy(opt.band[0]) - yy(opt.band[1])).toFixed(1)}" class="band"/>` : '';
    const last = vals[vals.length - 1], first = vals[0];
    const trend = last === first ? '' : (opt.lowerBetter ? last < first : last > first) ? 'up' : 'down';
    return `<figure class="chart">
      <figcaption><span>${esc(title)}</span><span class="mono">${last}${opt.unit ? ' ' + esc(opt.unit) : ''}${trend ? ` <span class="delta ${trend}">${trend === 'up' ? '좋아짐' : '주의'}</span>` : ''}</span></figcaption>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)} 추이: ${vals.join(', ')}">
        ${band}
        <line x1="${P.l}" x2="${W - P.r}" y1="${H - P.b}" y2="${H - P.b}" class="axis"/>
        <text x="${P.l - 6}" y="${yy(hi2) + 4}" class="tick" text-anchor="end">${hi2}</text>
        <text x="${P.l - 6}" y="${yy(lo2) + 4}" class="tick" text-anchor="end">${lo2}</text>
        <text x="${P.l}" y="${H - 4}" class="tick">${shortDate(rows[0].date)}</text>
        <text x="${W - P.r}" y="${H - 4}" class="tick" text-anchor="end">${shortDate(rows[rows.length - 1].date)}</text>
        <polyline points="${pts}" class="line"/>
        ${vals.map((v, i) => `<g class="pt"><circle cx="${x(i).toFixed(1)}" cy="${yy(v).toFixed(1)}" r="10" class="hit"/><circle cx="${x(i).toFixed(1)}" cy="${yy(v).toFixed(1)}" r="${i === vals.length - 1 ? 4.5 : 3}" class="dot"/><title>${shortDate(rows[i].date)} · ${v}${opt.unit ? ' ' + opt.unit : ''}</title></g>`).join('')}
      </svg>
      ${opt.bandLabel ? `<p class="small muted">음영: ${esc(opt.bandLabel)}</p>` : ''}
    </figure>`;
  }
  function soundBars() {
    const rows = SOUNDS.map(s => ({ s, st: state.soundStats[s.id] })).filter(r => r.st && r.st.n);
    if (!rows.length) return '<p class="muted small">발음 드릴을 하면 소리별 정확도가 쌓여요.</p>';
    rows.sort((a, b) => a.st.ok / a.st.n - b.st.ok / b.st.n);
    return `<ul class="hbars">${rows.map(({ s, st }) => {
      const p = Math.round(st.ok / st.n * 100);
      return `<li><a href="#lib/sound/${s.id}"><span class="name">${esc(s.title)}</span><span class="bar"><i style="width:${p}%"></i></span><span class="mono small">${p}% <span class="muted">(${st.ok}/${st.n})</span></span></a></li>`;
    }).join('')}</ul><p class="small muted">위에 있을수록 약한 소리예요. 정확도 75% 미만이면 오늘 세션에 더 자주 나와요.</p>`;
  }
  function voiceArchive() {
    const list = state.talks.slice().reverse().slice(0, 30);
    if (!list.length) return '<p class="muted small">Daily 60을 하면 녹음과 받아쓰기가 여기에 쌓여요.</p>';
    const first = state.talks[0];
    const show = list.includes(first) ? list : list.concat([first]);
    return `<ul class="archive">${show.map(t => `<li>
      <div class="a-head"><span class="mono small">${shortDate(t.date)}${t === first ? ' · 첫 기록' : ''}</span><span class="mono small">${t.score != null ? t.score + '점 · ' + t.wpm + 'wpm' : '자가 평가'}</span></div>
      <p class="en small">${esc(t.q || '')}</p>
      ${t.text ? `<details><summary class="small">받아쓰기</summary><p class="en small muted">${esc(t.text)}</p></details>` : ''}
      ${t.audio ? `<div class="row"><button type="button" class="btn quiet sm" data-play="${esc(t.audio)}">${ICON.play}<span>녹음 듣기</span></button><span class="player"></span></div>` : ''}
    </li>`).join('')}</ul>`;
  }

  // ---------- 화면: 설정 ----------
  function viewPrefs() {
    const p = state.prefs;
    const en = englishVoices();
    main.innerHTML = `
      <h1>설정</h1>
      <form class="prefs" id="pf" onsubmit="return false">
        <fieldset><legend>하루 세션 길이</legend>
          <div class="seg">${[5, 10, 15].map(m => `<label><input type="radio" name="minutes" value="${m}" ${p.minutes === m ? 'checked' : ''}><span>${m}분<small>${PLANS[m].map(k => STEPS[k].label).join(' · ')}</small></span></label>`).join('')}</div>
        </fieldset>
        <fieldset><legend>집중할 소리 <span class="muted small">(안 고르면 전부 돌아가며)</span></legend>
          <div class="chips">${SOUNDS.map(s => `<label class="chip-check"><input type="checkbox" name="focus" value="${s.id}" ${p.focus.includes(s.id) ? 'checked' : ''}><span>${esc(s.title)}</span></label>`).join('')}</div>
        </fieldset>
        <fieldset><legend>억양과 음성</legend>
          <div class="seg">${[['en-US', '미국식'], ['en-GB', '영국식']].map(([v, l]) => `<label><input type="radio" name="accent" value="${v}" ${p.accent === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          <label class="field">원어민 음성 <select name="voice"><option value="">자동 선택</option>${en.map(v => `<option value="${esc(v.voiceURI)}" ${p.voice === v.voiceURI ? 'selected' : ''}>${esc(v.name)} (${esc(v.lang)})</option>`).join('')}</select></label>
          <label class="field">기본 듣기 속도 <span class="mono" id="ratev">${p.rate}×</span><input type="range" name="rate" min="0.6" max="1.2" step="0.05" value="${p.rate}"></label>
          <div class="row">${speakBtn('Practice makes progress, not perfection.', '음성 들어 보기')}</div>
        </fieldset>
        <fieldset><legend>섀도잉 난이도</legend>
          <div class="seg">${[['auto', `자동 (지금 Lv.${state.curLevel})`], ['1', 'Lv.1'], ['2', 'Lv.2'], ['3', 'Lv.3']].map(([v, l]) => `<label><input type="radio" name="level" value="${v}" ${String(p.level) === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
          <p class="small muted">자동: 최근 섀도잉 정확도가 90% 이상이면 올리고 70% 미만이면 내려요.</p>
        </fieldset>
        <fieldset><legend>녹음</legend>
          <label class="switch"><input type="checkbox" name="saveAudio" ${p.saveAudio ? 'checked' : ''}><span>내 목소리 녹음 저장 (Daily 60 다시 듣기·성장 비교)</span></label>
          <p class="small muted">일부 안드로이드 폰은 녹음과 음성 인식을 동시에 못 해요. 인식이 안 되면 이 옵션을 끄세요. 녹음은 이 기기에만 저장돼요.</p>
          <div class="row"><button type="button" class="btn quiet sm" id="mictest">${ICON.mic}<span>마이크 확인</span></button></div>
          <p class="small" id="mtout" aria-live="polite"></p>
        </fieldset>
        <fieldset><legend>매일 알림</legend>
          <p class="small muted">브라우저 앱은 정해진 시각에 스스로 알림을 보낼 수 없어서, 휴대폰 캘린더에 매일 반복 일정을 추가해 드려요.</p>
          <div class="row"><input type="time" name="remindAt" value="${esc(p.remindAt)}" aria-label="알림 시각"><button type="button" class="btn quiet sm" id="ics">캘린더 파일 받기 (.ics)</button></div>
        </fieldset>
        <fieldset><legend>화면</legend>
          <div class="seg">${[['system', '시스템'], ['light', '밝게'], ['dark', '어둡게']].map(([v, l]) => `<label><input type="radio" name="theme" value="${v}" ${p.theme === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>
        </fieldset>
        <fieldset><legend>기록 옮기기</legend>
          <p class="small muted">다른 기기로 옮길 때 백업 코드를 복사해 붙여 넣으세요. (녹음 파일은 포함되지 않아요)</p>
          <div class="row"><button type="button" class="btn quiet sm" id="exp">백업 코드 복사</button><button type="button" class="btn quiet sm" id="imp">백업 코드 붙여 넣기</button></div>
          <textarea id="bk" rows="3" hidden aria-label="백업 코드"></textarea>
        </fieldset>
        <fieldset><legend>초기화</legend>
          <button type="button" class="btn danger sm" id="reset">모든 기록 지우기</button>
        </fieldset>
      </form>`;
    const f = document.getElementById('pf');
    f.addEventListener('change', e => {
      const n = e.target.name;
      if (n === 'minutes') p.minutes = +e.target.value;
      else if (n === 'focus') p.focus = Array.from(f.querySelectorAll('[name=focus]:checked')).map(x => x.value);
      else if (n === 'accent') { p.accent = e.target.value; p.voice = ''; const vs = f.querySelector('[name=voice]'); if (vs) vs.value = ''; }
      else if (n === 'voice') p.voice = e.target.value;
      else if (n === 'rate') p.rate = +e.target.value;
      else if (n === 'level') p.level = e.target.value;
      else if (n === 'saveAudio') p.saveAudio = e.target.checked;
      else if (n === 'remindAt') p.remindAt = e.target.value || '08:00';
      else if (n === 'theme') { p.theme = e.target.value; applyTheme(); }
      if (n === 'focus') {
        // 집중 소리를 바꾸면 아직 드릴을 안 했을 때 오늘 소리도 바꾼다
        const d = dayRec(today());
        if (d.plan && !d.done.sound && p.focus.length && !p.focus.includes(d.plan.sound)) d.plan.sound = p.focus[dayNumber(today()) % p.focus.length];
      }
      if (n === 'level') { const d = dayRec(today()); if (d.plan && !d.done.passage) d.plan = null; }
      save();
      toast('저장했어요');
    });
    f.querySelector('[name=rate]').addEventListener('input', e => { document.getElementById('ratev').textContent = e.target.value + '×'; });
    document.getElementById('ics').onclick = downloadICS;
    document.getElementById('mictest').onclick = e => micTest(document.getElementById('mtout'), e.currentTarget);
    const bk = document.getElementById('bk');
    document.getElementById('exp').onclick = async () => {
      const code = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      bk.hidden = false; bk.value = code; bk.select();
      try { await navigator.clipboard.writeText(code); toast('백업 코드를 복사했어요'); } catch (e) { toast('코드를 길게 눌러 복사하세요'); }
    };
    document.getElementById('imp').onclick = () => {
      if (bk.hidden || !bk.value.trim()) { bk.hidden = false; bk.value = ''; bk.placeholder = '여기에 백업 코드를 붙여 넣고 다시 누르세요'; bk.focus(); return; }
      try {
        const obj = JSON.parse(decodeURIComponent(escape(atob(bk.value.trim()))));
        if (!obj || !obj.prefs) throw new Error('bad');
        if (!confirm('지금 기기의 기록을 백업 코드의 기록으로 바꿀까요?')) return;
        state = normalize(obj); save(); applyTheme(); toast('기록을 불러왔어요'); route();
      } catch (e) { toast('백업 코드가 올바르지 않아요'); }
    };
    document.getElementById('reset').onclick = () => {
      if (!confirm('연속 기록, 녹음, 모든 설정을 지울까요? 되돌릴 수 없어요.')) return;
      state = defaultState(); save(); audioDB.clear(); applyTheme(); toast('초기화했어요'); location.hash = '#today';
    };
  }

  function downloadICS() {
    const [hh, mm] = (state.prefs.remindAt || '08:00').split(':');
    const t = today().replace(/-/g, '');
    const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const url = location.href.split('#')[0] + '#today';
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//haru-speaking//KO', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:haru-speaking-daily-${t}@haru`, `DTSTAMP:${now}`,
      `DTSTART:${t}T${hh}${mm}00`, `DURATION:PT${state.prefs.minutes}M`, 'RRULE:FREQ=DAILY',
      `SUMMARY:하루 스피킹 ${state.prefs.minutes}분`, `DESCRIPTION:오늘의 Daily 60 하러 가기 ${url}`, `URL:${url}`,
      'BEGIN:VALARM', 'TRIGGER:PT0M', 'ACTION:DISPLAY', 'DESCRIPTION:하루 스피킹 할 시간', 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ];
    const blob = new Blob([lines.join('\r\n') + '\r\n'], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'haru-speaking.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('캘린더 파일을 열어 일정을 추가하세요');
  }

  // ---------- 라우터 ----------
  function applyTheme() {
    const t = state.prefs.theme;
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  function updateBadge() {
    const b = document.getElementById('review-badge');
    const n = dueItems().length;
    b.hidden = !n;
    b.textContent = n ? String(n) : '';
  }
  function route() {
    leave();
    reconcileFreeze();
    const h = (location.hash || '#today').slice(1);
    const [a, b, c] = h.split('/');
    const tab = a === 'do' ? 'today' : a === 'lib' ? 'library' : a;
    document.querySelectorAll('.nav a').forEach(x => { if (x.dataset.r === tab) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); });
    if (!SOUNDS.length || !TOPICS.length) { main.innerHTML = '<p>콘텐츠를 불러오지 못했어요. 새로고침해 주세요.</p>'; return; }
    if (a === 'do') viewStep(b);
    else if (a === 'review') viewReview();
    else if (a === 'library') viewLibrary();
    else if (a === 'lib') viewLibItem(b, c);
    else if (a === 'stats') viewStats();
    else if (a === 'prefs') viewPrefs();
    else if (a === 'start') viewStart();
    else if (a === 'baseline') viewBaseline();
    else viewToday();
    updateBadge();
    window.scrollTo(0, 0);
    main.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', route);
  applyTheme();
  route();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  // 테스트용 훅
  window.__spk = { state: () => state, today, S };
})();
