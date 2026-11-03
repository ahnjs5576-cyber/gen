/* 하루 수리통계 — 앱 로직
 * 화면: #today(오늘) · #course(커리큘럼) · #lesson-N(레슨) · #review(복습)
 * 진도는 이 브라우저의 localStorage에만 저장된다.
 */
(function () {
  'use strict';

  const UNITS = window.STAT_UNITS || [];
  const LESSONS = (window.STAT_LESSONS || []).slice().sort((a, b) => a.id - b.id);
  const byId = new Map(LESSONS.map((l) => [l.id, l]));
  const STORE_KEY = 'haru-suritong-v1';
  const INTERVALS = [1, 3, 7, 14, 30, 60]; // 복습 상자별 다음 복습까지 일수

  /* ───────── 저장소 ───────── */
  const blank = () => ({ completed: {}, activity: {}, reviewDays: {}, cards: {}, quiz: {} });
  let state = load();

  function load() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      if (!raw) return blank();
      return Object.assign(blank(), JSON.parse(raw));
    } catch (e) {
      return blank();
    }
  }
  function save() {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경: 세션 동안만 유지 */ }
  }

  /* ───────── 날짜 ───────── */
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return ymd(new Date(y, m - 1, d + n));
  }
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function prettyToday() {
    const d = new Date();
    return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEK[d.getDay()]}요일`;
  }

  /* ───────── 진도 계산 ───────── */
  const isDone = (id) => Boolean(state.completed[id]);
  const doneCount = () => LESSONS.filter((l) => isDone(l.id)).length;
  const nextLesson = () => LESSONS.find((l) => !isDone(l.id)) || null;
  const lessonsToday = () => LESSONS.filter((l) => state.completed[l.id] === today()).length;
  const activeOn = (d) => (state.activity[d] || 0) > 0 || Boolean(state.reviewDays[d]);

  function streak() {
    let d = today();
    if (!activeOn(d)) d = addDays(d, -1);
    let n = 0;
    while (activeOn(d)) { n += 1; d = addDays(d, -1); }
    return n;
  }
  function dueCardKeys() {
    const t = today();
    return Object.keys(state.cards)
      .filter((k) => state.cards[k].due <= t)
      .sort((a, b) => state.cards[a].due.localeCompare(state.cards[b].due) || cardOrder(a) - cardOrder(b));
  }
  const cardOrder = (k) => { const [l, i] = k.split('-').map(Number); return l * 100 + i; };
  function cardByKey(k) {
    const [lid, idx] = k.split('-').map(Number);
    const lesson = byId.get(lid);
    return lesson && lesson.cards[idx] ? { lesson, card: lesson.cards[idx] } : null;
  }
  const dayLabel = (id) => `Day ${pad(id)}`;
  const unitOf = (l) => UNITS.find((u) => u.id === l.unit) || { title: '' };

  /* ───────── 유틸 ───────── */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function seededShuffle(arr, seed) {
    const a = arr.slice();
    let s = seed % 2147483647; if (s <= 0) s += 2147483646;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function toast(msg) {
    document.querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  /* ───────── 수식 렌더링 (MathJax) ───────── */
  let pendingTypeset = null;
  function typeset(el) {
    const mj = window.MathJax;
    if (mj && mj.typesetPromise && mj.startup && mj.startup.promise) {
      mj.startup.promise = mj.startup.promise
        .then(() => mj.typesetPromise([el]))
        .catch((e) => console.warn('MathJax', e));
    } else {
      pendingTypeset = el;
    }
  }
  function clearTypeset() {
    const mj = window.MathJax;
    if (mj && mj.typesetClear) { try { mj.typesetClear(); } catch (e) { /* noop */ } }
  }
  window.__haruMathReady = function () {
    if (pendingTypeset) { typeset(pendingTypeset); pendingTypeset = null; }
  };

  /* ───────── 라우팅 ───────── */
  const app = document.getElementById('app');
  const tabbar = document.getElementById('tabbar');
  let session = { answers: {}, review: null, confirmReset: false };
  let widgetCleanup = null;

  function route() {
    const h = (location.hash || '').replace('#', '');
    const m = /^lesson-(\d+)$/.exec(h);
    if (m && byId.has(Number(m[1]))) return { view: 'lesson', id: Number(m[1]) };
    if (h === 'course') return { view: 'course' };
    if (h === 'review') return { view: 'review' };
    return { view: 'today' };
  }

  function render(opts) {
    const r = route();
    if (widgetCleanup) { widgetCleanup(); widgetCleanup = null; }
    clearTypeset();
    let html = '';
    if (r.view === 'lesson') html = viewLesson(byId.get(r.id));
    else if (r.view === 'course') html = viewCourse();
    else if (r.view === 'review') html = viewReview();
    else html = viewToday();
    app.innerHTML = `<div class="wrap">${html}</div>`;
    renderTabbar(r.view);
    if (r.view === 'lesson') mountWidget(byId.get(r.id));
    typeset(app);
    if (!opts || !opts.keepScroll) window.scrollTo(0, 0);
    const titles = { today: '오늘', course: '커리큘럼', review: '복습' };
    document.title = r.view === 'lesson' ? `${dayLabel(r.id)} ${byId.get(r.id).title} · 하루 수리통계` : `하루 수리통계 · ${titles[r.view]}`;
  }

  function renderTabbar(view) {
    const due = dueCardKeys().length;
    const cur = (v) => (view === v || (v === 'course' && view === 'lesson') ? ' aria-current="page"' : '');
    tabbar.innerHTML = `<div class="tabbar-inner">
      <a class="tab" href="#today"${cur('today')}><span class="glyph" aria-hidden="true">∂</span>오늘</a>
      <a class="tab" href="#course"${cur('course')}><span class="glyph" aria-hidden="true">∑</span>커리큘럼</a>
      <a class="tab" href="#review"${cur('review')}><span class="glyph" aria-hidden="true">↻</span>복습${due ? `<span class="badge" aria-label="복습할 카드 ${due}장">${due}</span>` : ''}</a>
    </div>`;
  }

  /* ───────── 화면: 오늘 ───────── */
  function viewToday() {
    const next = nextLesson();
    const doneToday = lessonsToday();
    const due = dueCardKeys().length;
    const s = streak();

    let main = '';
    if (!next) {
      main = `<section class="sheet today">
        <span class="eyebrow">완주</span>
        <h2 class="title">32일 과정을 모두 마쳤어요</h2>
        <p class="muted">이제는 복습 카드가 기억을 지켜 줍니다. 매일 복습 탭만 비워 주세요.</p>
        <a class="btn" href="#review">복습하러 가기</a>
      </section>`;
    } else if (doneToday > 0) {
      main = `<section class="sheet today">
        <span class="done-badge">✓ 오늘 분량 완료</span>
        <h2 class="title">내일은 ${esc(next.title)}</h2>
        <p class="hook">${next.hook}</p>
        <p class="muted">하루 한 레슨이면 한 달 남짓에 수리통계 핵심을 한 바퀴 돕니다. 여유가 있으면 미리 봐도 좋아요.</p>
        <div class="row">
          ${due ? `<a class="btn" href="#review">복습 ${due}장 하기</a>` : ''}
          <a class="btn ${due ? 'quiet' : 'ghost'}" href="#lesson-${next.id}">하나 더 하기 · ${dayLabel(next.id)}</a>
        </div>
      </section>`;
    } else {
      main = `<section class="sheet today">
        <div class="row spread"><span class="eyebrow"><span class="day-tag">${dayLabel(next.id)}</span> · ${esc(unitOf(next).title)}</span><span class="eyebrow">약 5분</span></div>
        <h2 class="title">${esc(next.title)}</h2>
        <p class="hook">${next.hook}</p>
        <a class="btn block" href="#lesson-${next.id}">오늘의 레슨 시작</a>
      </section>`;
    }

    const reviewBox = `<section class="sheet">
      <div class="row spread">
        <h3>복습 카드</h3>
        <span class="readout">${Object.keys(state.cards).length}장 보관 중</span>
      </div>
      ${due
        ? `<p>오늘 다시 볼 카드가 <b>${due}장</b> 있어요. 기억이 흐려지기 직전에 꺼내 보는 게 가장 오래 남습니다.</p>
           <a class="btn ${doneToday || !next ? '' : 'ghost'}" href="#review">복습 시작</a>`
        : `<p class="muted">${Object.keys(state.cards).length ? '오늘 복습할 카드가 없어요. 다음 카드는 ' + nextDueText() + '에 돌아옵니다.' : '레슨을 끝내면 핵심 공식이 카드로 저장되고, 1·3·7·14·30일 간격으로 다시 나타나요.'}</p>`}
    </section>`;

    const strip = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(today(), -i);
      strip.push(`<span class="${activeOn(d) ? 'on' : ''}${i === 0 ? ' today' : ''}" title="${d}"></span>`);
    }

    const units = UNITS.map((u) => {
      const ls = LESSONS.filter((l) => l.unit === u.id);
      const d = ls.filter((l) => isDone(l.id)).length;
      return `<div class="unit-row"><span class="name">${u.id}. ${esc(u.title)}</span><span class="count">${d}/${ls.length}</span><span class="bar"><i style="width:${ls.length ? (100 * d) / ls.length : 0}%"></i></span></div>`;
    }).join('');

    return `
      <header class="masthead">
        <div class="brand">
          <span class="eyebrow">${prettyToday()}</span>
          <span class="brand-name">하루 수리통계 <span class="theta">θ̂</span></span>
        </div>
        <div class="streak" aria-label="연속 학습 ${s}일"><b>${s}</b><span class="muted">일 연속</span></div>
      </header>
      ${main}
      ${reviewBox}
      <section class="sheet">
        <div class="row spread"><h3>최근 2주</h3><span class="readout">${doneCount()}/${LESSONS.length} 레슨</span></div>
        <div class="strip" aria-label="최근 14일 학습 기록">${strip.join('')}</div>
        <div class="strip-legend"><span>2주 전</span><span>오늘</span></div>
      </section>
      <section class="sheet">
        <h3>단원별 진도</h3>
        <div class="units">${units}</div>
      </section>`;
  }

  function nextDueText() {
    const ds = Object.values(state.cards).map((c) => c.due).sort();
    if (!ds.length) return '';
    const d = ds[0];
    if (d === addDays(today(), 1)) return '내일';
    const [, m, dd] = d.split('-').map(Number);
    return `${m}월 ${dd}일`;
  }

  /* ───────── 화면: 커리큘럼 ───────── */
  function viewCourse() {
    const next = nextLesson();
    const blocks = UNITS.map((u) => {
      const items = LESSONS.filter((l) => l.unit === u.id).map((l) => {
        const st = isDone(l.id) ? '<span class="state done">완료</span>'
          : next && next.id === l.id ? '<span class="state next">다음</span>'
          : '<span class="state todo">·</span>';
        return `<li><a class="lesson-link" href="#lesson-${l.id}"><span class="day-tag">${dayLabel(l.id)}</span><span class="t">${esc(l.title)}</span>${st}</a></li>`;
      }).join('');
      return `<section class="unit-block">
        <div class="unit-head"><h3>${u.id}. ${esc(u.title)}</h3><span class="eyebrow">${esc(u.blurb)}</span></div>
        <ul class="lesson-list">${items}</ul>
      </section>`;
    }).join('');

    const reset = session.confirmReset
      ? `<p>정말 모든 진도와 복습 카드를 지울까요? 되돌릴 수 없어요.</p>
         <div class="row"><button class="btn" data-action="reset-yes" style="background:var(--bad);border-color:var(--bad)">모두 지우기</button><button class="btn quiet" data-action="reset-no">취소</button></div>`
      : `<button class="btn quiet" data-action="reset-ask">진도 초기화</button>`;

    return `
      <header class="masthead">
        <div class="brand"><span class="eyebrow">7개 단원 · ${LESSONS.length}일</span><h1>커리큘럼</h1></div>
        <span class="readout">${doneCount()}/${LESSONS.length} 완료</span>
      </header>
      <p class="muted">확률의 언어에서 시작해 추정과 검정까지, 수리통계 교재의 뼈대를 하루 5분 분량으로 나눴어요. 순서대로 가는 걸 추천하지만 어느 레슨이든 바로 열 수 있어요.</p>
      ${blocks}
      <section class="danger-zone">${reset}<span class="muted">진도는 이 기기의 브라우저에만 저장됩니다.</span></section>`;
  }

  /* ───────── 화면: 레슨 ───────── */
  function viewLesson(l) {
    const unit = unitOf(l);
    const ans = session.answers[l.id] || {};
    const prev = byId.get(l.id - 1);
    const nxt = byId.get(l.id + 1);

    const formulas = l.formulas.map((f) => `<div class="formula"><span class="lbl">${esc(f.label)}</span><div class="tex">$$${f.tex}$$</div></div>`).join('');

    const quiz = l.quiz.map((q, qi) => {
      const order = seededShuffle(q.choices.map((_, i) => i), l.id * 97 + qi * 13 + 7);
      const chosen = ans[qi];
      const answered = chosen !== undefined;
      const choices = order.map((ci, pos) => {
        let cls = 'choice';
        if (answered && ci === 0) cls += ' correct';
        else if (answered && ci === chosen) cls += ' wrong';
        return `<button class="${cls}" data-action="answer" data-l="${l.id}" data-q="${qi}" data-c="${ci}"${answered ? ' disabled' : ''}><span class="key">${'ABCD'[pos]}</span><span>${q.choices[ci]}</span></button>`;
      }).join('');
      const verdict = answered ? (chosen === 0 ? '<span class="verdict ok">정답</span>' : '<span class="verdict no">아쉬워요</span>') : '<span class="verdict"></span>';
      return `<div class="q" id="q-${l.id}-${qi}">
        <p class="q-text"><span class="q-num">Q${qi + 1}</span>${q.q}</p>
        <div class="choices">${choices}</div>
        <p class="why"${answered ? '' : ' hidden'}>${verdict}${q.why}</p>
      </div>`;
    }).join('');

    const answeredN = Object.keys(ans).length;
    const correctN = Object.values(ans).filter((c) => c === 0).length;
    const done = isDone(l.id);

    const completeBox = done
      ? `<span class="done-badge">✓ ${state.completed[l.id]} 완료</span>
         ${nxt ? `<a class="btn" href="#lesson-${nxt.id}">다음 레슨 · ${esc(nxt.title)}</a>` : `<a class="btn" href="#review">복습하러 가기</a>`}
         <a class="btn quiet" href="#today">오늘 화면으로</a>`
      : `<p class="muted" id="quiz-progress">${quizProgressText(l, answeredN, correctN)}</p>
         <button class="btn block" data-action="complete" data-l="${l.id}">학습 완료 · 카드 ${l.cards.length}장 저장</button>`;

    return `
      <nav class="crumbs">
        <a class="back" href="#course">← 커리큘럼</a>
        <span class="eyebrow"><span class="day-tag">${dayLabel(l.id)}</span> / ${LESSONS.length}</span>
      </nav>
      <header class="lesson-head">
        <span class="eyebrow">Unit ${l.unit} · ${esc(unit.title)}</span>
        <h1>${esc(l.title)}</h1>
        <p class="hook">${l.hook}</p>
      </header>

      <section class="sheet">
        <h3 class="section-label">핵심 아이디어</h3>
        <div class="prose">${l.body.map((p) => `<p>${p}</p>`).join('')}</div>
      </section>

      <section class="sheet">
        <h3 class="section-label">외워 둘 공식</h3>
        <div class="formulas">${formulas}</div>
      </section>

      ${l.widget ? `<section class="sheet widget" id="widget" data-kind="${l.widget}"></section>` : ''}

      <section class="sheet">
        <h3 class="section-label">예제</h3>
        <p>${l.example.q}</p>
        <details class="example"><summary>풀이 보기</summary><div class="sol">${l.example.a}</div></details>
        <div class="pitfall"><span class="eyebrow">자주 하는 실수</span><p>${l.pitfall}</p></div>
      </section>

      <section class="sheet">
        <h3 class="section-label">확인 퀴즈</h3>
        <div class="quiz">${quiz}</div>
      </section>

      <section class="sheet">
        <h3 class="section-label">오늘의 한 줄</h3>
        <p class="summary-line">${l.summary}</p>
        <div class="complete-box">${completeBox}</div>
      </section>

      <nav class="pager">
        ${prev ? `<a class="back" href="#lesson-${prev.id}"><span>← <small>${dayLabel(prev.id)}</small>${esc(prev.title)}</span></a>` : '<span></span>'}
        ${nxt ? `<a class="back" href="#lesson-${nxt.id}" style="justify-content:flex-end"><span><small>${dayLabel(nxt.id)}</small>${esc(nxt.title)} →</span></a>` : '<span></span>'}
      </nav>`;
  }

  function quizProgressText(l, answeredN, correctN) {
    if (answeredN < l.quiz.length) return `퀴즈 ${answeredN}/${l.quiz.length} 풀었어요. 다 풀고 완료하면 더 오래 기억납니다.`;
    return correctN === l.quiz.length ? `퀴즈 ${correctN}/${l.quiz.length} 정답. 완벽해요.` : `퀴즈 ${correctN}/${l.quiz.length} 정답. 틀린 문제의 해설을 한 번 더 읽고 완료하세요.`;
  }

  function answer(lid, qi, ci) {
    const l = byId.get(lid);
    session.answers[lid] = session.answers[lid] || {};
    if (session.answers[lid][qi] !== undefined) return;
    session.answers[lid][qi] = ci;
    const box = document.getElementById(`q-${lid}-${qi}`);
    if (!box) return;
    box.querySelectorAll('.choice').forEach((b) => {
      const c = Number(b.dataset.c);
      b.disabled = true;
      if (c === 0) b.classList.add('correct');
      else if (c === ci) b.classList.add('wrong');
    });
    const why = box.querySelector('.why');
    const v = why.querySelector('.verdict');
    v.textContent = ci === 0 ? '정답' : '아쉬워요';
    v.className = 'verdict ' + (ci === 0 ? 'ok' : 'no');
    why.hidden = false;
    const ans = session.answers[lid];
    const prog = document.getElementById('quiz-progress');
    if (prog) prog.textContent = quizProgressText(l, Object.keys(ans).length, Object.values(ans).filter((c) => c === 0).length);
  }

  function complete(lid) {
    const l = byId.get(lid);
    if (isDone(lid)) return;
    const t = today();
    state.completed[lid] = t;
    state.activity[t] = (state.activity[t] || 0) + 1;
    const ans = session.answers[lid] || {};
    state.quiz[lid] = Object.values(ans).filter((c) => c === 0).length;
    l.cards.forEach((_, i) => {
      const k = `${lid}-${i}`;
      if (!state.cards[k]) state.cards[k] = { box: 0, due: addDays(t, 1) };
    });
    save();
    toast(`${dayLabel(lid)} 완료. 복습 카드 ${l.cards.length}장이 내일 돌아와요.`);
    render({ keepScroll: true });
  }

  /* ───────── 화면: 복습 ───────── */
  function startReview(mode) {
    let keys;
    if (mode === 'free') {
      keys = seededShuffle(Object.keys(state.cards), Date.now() % 100000 + 1).slice(0, 5);
    } else {
      keys = dueCardKeys();
    }
    session.review = { mode, queue: keys, idx: 0, shown: false, again: {}, remembered: 0, total: keys.length };
  }

  function viewReview() {
    const rv = session.review;
    if (rv && rv.idx < rv.queue.length) return viewFlash(rv);
    if (rv && rv.idx >= rv.queue.length && rv.total > 0) {
      const finished = rv;
      session.review = null;
      const left = dueCardKeys().length;
      return `<header class="masthead"><div class="brand"><span class="eyebrow">복습</span><h1>복습 끝</h1></div></header>
        <section class="sheet empty">
          <span class="done-badge">✓ ${finished.total}장 완료</span>
          <p>${finished.mode === 'free' ? '자유 복습이라 다음 일정은 바뀌지 않았어요.' : `한 번에 기억난 카드 ${finished.remembered}장은 더 긴 간격으로, 헷갈린 카드는 내일 다시 나와요.`}</p>
          ${left ? `<button class="btn" data-action="review-start">남은 카드 ${left}장 계속</button>` : ''}
          <a class="btn ${left ? 'quiet' : ''}" href="#today">오늘 화면으로</a>
        </section>`;
    }
    const due = dueCardKeys().length;
    const total = Object.keys(state.cards).length;
    return `<header class="masthead"><div class="brand"><span class="eyebrow">간격 반복</span><h1>복습</h1></div><span class="readout">${total}장 보관 중</span></header>
      <section class="sheet empty">
        ${due
          ? `<h3>오늘 볼 카드 ${due}장</h3><p class="muted">질문을 보고 먼저 머릿속으로 답한 뒤 뒤집어 보세요. 기억나면 다음 복습 간격이 1→3→7→14→30→60일로 늘어나고, 헷갈리면 내일 다시 나와요.</p>
             <button class="btn block" data-action="review-start">복습 시작</button>`
          : total
            ? `<h3>오늘 복습은 비어 있어요</h3><p class="muted">다음 카드는 ${nextDueText()}에 돌아와요. 손이 심심하면 아무 카드나 5장 뽑아 볼 수 있어요. 자유 복습은 일정을 바꾸지 않아요.</p>
               <button class="btn ghost" data-action="review-free">자유 복습 5장</button>`
            : `<h3>아직 카드가 없어요</h3><p class="muted">레슨을 끝내면 그날의 핵심 공식이 카드로 저장돼요.</p><a class="btn" href="#today">첫 레슨 하러 가기</a>`}
      </section>`;
  }

  function viewFlash(rv) {
    const key = rv.queue[rv.idx];
    const found = cardByKey(key);
    if (!found) { rv.idx += 1; return viewReview(); }
    const { lesson, card } = found;
    const dots = rv.queue.map((_, i) => `<i class="${i < rv.idx ? 'on' : ''}"></i>`).join('');
    return `<header class="masthead"><div class="brand"><span class="eyebrow">${rv.mode === 'free' ? '자유 복습' : '오늘의 복습'}</span><h1>${rv.idx + 1} / ${rv.queue.length}</h1></div>
        <button class="btn quiet" data-action="review-quit">그만하기</button></header>
      <div class="progress-dots" aria-hidden="true">${dots}</div>
      <section class="sheet flash">
        <div class="flash-meta"><span><span class="day-tag">${dayLabel(lesson.id)}</span> ${esc(lesson.title)}</span>${rv.mode === 'free' ? '' : `<span>상자 ${(state.cards[key] || { box: 0 }).box + 1}</span>`}</div>
        <p class="front">${card.q}</p>
        <div class="back-side" id="flash-back" hidden>${card.a}</div>
        <div id="flash-actions">
          <button class="btn block" data-action="flip">정답 보기</button>
        </div>
        <div class="grade" id="flash-grade" hidden>
          <button class="btn quiet" data-action="grade" data-g="0">헷갈려요</button>
          <button class="btn" data-action="grade" data-g="1">기억났어요</button>
        </div>
      </section>
      <a class="back" href="#lesson-${lesson.id}">레슨 다시 보기 →</a>`;
  }

  function grade(ok) {
    const rv = session.review;
    if (!rv) return;
    const key = rv.queue[rv.idx];
    const t = today();
    if (rv.mode !== 'free' && state.cards[key] && !rv.again[key]) {
      const c = state.cards[key];
      if (ok) {
        c.box = Math.min(c.box + 1, INTERVALS.length - 1);
        c.due = addDays(t, INTERVALS[c.box]);
        rv.remembered += 1;
      } else {
        c.box = 0;
        c.due = addDays(t, 1);
      }
    }
    if (!ok && !rv.again[key]) { rv.again[key] = true; rv.queue.push(key); }
    rv.idx += 1;
    if (rv.idx >= rv.queue.length) {
      state.reviewDays[t] = true;
    }
    save();
    render();
  }

  /* ───────── 이벤트 ───────── */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const a = el.dataset.action;
    if (a === 'answer') answer(Number(el.dataset.l), Number(el.dataset.q), Number(el.dataset.c));
    else if (a === 'complete') complete(Number(el.dataset.l));
    else if (a === 'review-start') { startReview('due'); render(); }
    else if (a === 'review-free') { startReview('free'); render(); }
    else if (a === 'review-quit') { session.review = null; render(); }
    else if (a === 'flip') {
      document.getElementById('flash-back').hidden = false;
      document.getElementById('flash-actions').hidden = true;
      document.getElementById('flash-grade').hidden = false;
    } else if (a === 'grade') grade(el.dataset.g === '1');
    else if (a === 'reset-ask') { session.confirmReset = true; render({ keepScroll: true }); }
    else if (a === 'reset-no') { session.confirmReset = false; render({ keepScroll: true }); }
    else if (a === 'reset-yes') {
      state = blank(); session = { answers: {}, review: null, confirmReset: false };
      save(); toast('진도를 초기화했어요.'); location.hash = '#today'; render();
    }
  });
  window.addEventListener('hashchange', () => {
    if (route().view !== 'review' && session.review) session.review = null;
    session.confirmReset = false;
    render();
  });

  /* ───────── 위젯 (캔버스) ───────── */
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || 300;
    const h = canvas.clientHeight || 200;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function axisLabels(ctx, w, h, labels, pad) {
    ctx.fillStyle = css('--muted');
    ctx.font = '11px ' + css('--font-mono');
    ctx.textBaseline = 'bottom';
    labels.forEach(([x, text, align]) => { ctx.textAlign = align || 'center'; ctx.fillText(text, x, h - 4); });
    ctx.strokeStyle = css('--rule');
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pad, h - 20.5); ctx.lineTo(w - pad, h - 20.5); ctx.stroke();
  }

  function mountWidget(lesson) {
    const host = document.getElementById('widget');
    if (!host || !lesson.widget) return;
    const builders = { binom: widgetBinom, lln: widgetLLN, clt: widgetCLT };
    const b = builders[lesson.widget];
    if (!b) return;
    const redraw = b(host);
    const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
    const onTheme = () => requestAnimationFrame(redraw);
    if (mq && mq.addEventListener) mq.addEventListener('change', onTheme);
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    let rt = null;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(redraw, 120); };
    window.addEventListener('resize', onResize);
    widgetCleanup = () => {
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onTheme);
      mo.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }

  // 이항분포 PMF 탐색기
  function widgetBinom(host) {
    host.innerHTML = `<h3 class="section-label">직접 움직여 보기</h3>
      <canvas id="w-canvas" role="img" aria-label="이항분포 확률질량함수 막대그래프"></canvas>
      <div class="controls">
        <label for="w-n">n</label><input id="w-n" type="range" min="1" max="50" value="10"><output id="w-n-out">10</output>
        <label for="w-p">p</label><input id="w-p" type="range" min="1" max="99" value="30"><output id="w-p-out">0.30</output>
      </div>
      <p class="readout" id="w-read"></p>`;
    const nIn = host.querySelector('#w-n');
    const pIn = host.querySelector('#w-p');
    const canvas = host.querySelector('#w-canvas');
    function draw() {
      const n = Number(nIn.value);
      const p = Number(pIn.value) / 100;
      host.querySelector('#w-n-out').textContent = n;
      host.querySelector('#w-p-out').textContent = p.toFixed(2);
      const pmf = [Math.pow(1 - p, n)];
      for (let k = 0; k < n; k++) pmf.push(pmf[k] * ((n - k) / (k + 1)) * (p / (1 - p)));
      const { ctx, w, h } = setupCanvas(canvas);
      const pad = 14, top = 12, base = h - 21;
      const maxP = Math.max(...pmf);
      const slot = (w - 2 * pad) / (n + 1);
      const bw = Math.max(1, slot * 0.72);
      const mean = n * p;
      pmf.forEach((v, k) => {
        const bh = (v / maxP) * (base - top);
        const x = pad + k * slot + (slot - bw) / 2;
        ctx.fillStyle = Math.abs(k - mean) <= Math.sqrt(n * p * (1 - p)) ? css('--accent') : css('--muted');
        ctx.globalAlpha = Math.abs(k - mean) <= Math.sqrt(n * p * (1 - p)) ? 1 : 0.45;
        ctx.fillRect(x, base - bh, bw, bh);
      });
      ctx.globalAlpha = 1;
      const mx = pad + (mean + 0.5) * slot;
      ctx.strokeStyle = css('--ink'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mx, top); ctx.lineTo(mx, base); ctx.stroke(); ctx.setLineDash([]);
      axisLabels(ctx, w, h, [[pad + slot / 2, '0', 'center'], [mx, 'np', 'center'], [pad + (n + 0.5) * slot, String(n), 'center']], pad);
      host.querySelector('#w-read').textContent = `E[X] = np = ${mean.toFixed(2)}   Var(X) = np(1−p) = ${(n * p * (1 - p)).toFixed(2)}   진한 막대: 평균 ± 1σ`;
    }
    nIn.addEventListener('input', draw);
    pIn.addEventListener('input', draw);
    draw();
    return draw;
  }

  // 큰 수의 법칙: 동전 던지기 누적 비율
  function widgetLLN(host) {
    host.innerHTML = `<h3 class="section-label">직접 던져 보기</h3>
      <canvas id="w-canvas" role="img" aria-label="동전 던지기 누적 앞면 비율 그래프"></canvas>
      <div class="seg">
        <button data-k="10">+10번</button><button data-k="100">+100번</button><button data-k="1000">+1000번</button><button data-k="0">다시</button>
      </div>
      <p class="readout" id="w-read"></p>`;
    const canvas = host.querySelector('#w-canvas');
    let heads = 0;
    let path = [];
    function flip(k) {
      for (let i = 0; i < k && path.length < 5000; i++) {
        heads += Math.random() < 0.5 ? 1 : 0;
        path.push(heads / (path.length + 1));
      }
      draw();
    }
    function draw() {
      const { ctx, w, h } = setupCanvas(canvas);
      const pad = 14, top = 10, base = h - 21;
      const N = Math.max(50, path.length);
      const y = (v) => base - v * (base - top);
      const x = (i) => pad + (i / N) * (w - 2 * pad);
      ctx.strokeStyle = css('--rule'); ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
      [0.25, 0.75].forEach((v) => { ctx.beginPath(); ctx.moveTo(pad, y(v) + 0.5); ctx.lineTo(w - pad, y(v) + 0.5); ctx.stroke(); });
      ctx.setLineDash([]);
      ctx.strokeStyle = css('--ink'); ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(pad, y(0.5)); ctx.lineTo(w - pad, y(0.5)); ctx.stroke(); ctx.globalAlpha = 1;
      if (path.length) {
        ctx.strokeStyle = css('--accent'); ctx.lineWidth = 2;
        ctx.beginPath();
        path.forEach((v, i) => (i ? ctx.lineTo(x(i + 1), y(v)) : ctx.moveTo(x(1), y(v))));
        ctx.stroke();
        ctx.fillStyle = css('--accent');
        ctx.beginPath(); ctx.arc(x(path.length), y(path[path.length - 1]), 3.5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = css('--muted'); ctx.font = '11px ' + css('--font-mono'); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('0.5', pad + 2, y(0.5) - 8);
      axisLabels(ctx, w, h, [[pad, '1', 'left'], [w - pad, `${N}번`, 'right']], pad);
      host.querySelector('#w-read').textContent = path.length
        ? `${path.length}번 던짐 · 앞면 비율 ${(heads / path.length).toFixed(3)} · 0.5와의 차이 ${Math.abs(heads / path.length - 0.5).toFixed(3)}`
        : '버튼을 눌러 동전을 던져 보세요. 처음엔 크게 출렁이다가 0.5 근처로 모입니다.';
    }
    host.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
      const k = Number(b.dataset.k);
      if (!k) { heads = 0; path = []; draw(); } else flip(k);
    }));
    flip(30);
    return draw;
  }

  // 중심극한정리: 표본평균 히스토그램
  function widgetCLT(host) {
    const pops = {
      dice: { name: '주사위', mu: 3.5, sd: Math.sqrt(35 / 12), lo: 1, hi: 6, draw: () => 1 + Math.floor(Math.random() * 6) },
      exp: { name: '지수분포', mu: 1, sd: 1, lo: 0, hi: 3.5, draw: () => -Math.log(1 - Math.random()) },
      bern: { name: '찌그러진 동전 p=0.2', mu: 0.2, sd: Math.sqrt(0.16), lo: 0, hi: 1, draw: () => (Math.random() < 0.2 ? 1 : 0) },
    };
    let popKey = 'exp';
    host.innerHTML = `<h3 class="section-label">직접 뽑아 보기</h3>
      <div class="seg" role="group" aria-label="모집단 선택">
        ${Object.entries(pops).map(([k, p]) => `<button data-pop="${k}" aria-pressed="${k === popKey}">${p.name}</button>`).join('')}
      </div>
      <canvas id="w-canvas" role="img" aria-label="표본평균 2000개의 히스토그램과 정규 근사 곡선"></canvas>
      <div class="controls">
        <label for="w-n">표본 크기 n</label><input id="w-n" type="range" min="1" max="50" value="1"><output id="w-n-out">1</output>
      </div>
      <div class="row spread"><p class="readout" id="w-read"></p><button class="btn quiet" data-resample>다시 뽑기</button></div>`;
    const canvas = host.querySelector('#w-canvas');
    const nIn = host.querySelector('#w-n');
    let means = [];
    function sample() {
      const pop = pops[popKey];
      const n = Number(nIn.value);
      host.querySelector('#w-n-out').textContent = n;
      means = [];
      for (let r = 0; r < 2000; r++) {
        let s = 0;
        for (let i = 0; i < n; i++) s += pop.draw();
        means.push(s / n);
      }
      draw();
    }
    function draw() {
      const pop = pops[popKey];
      const n = Number(nIn.value);
      const { ctx, w, h } = setupCanvas(canvas);
      const pad = 14, top = 10, base = h - 21;
      const bins = 40;
      const lo = pop.lo, hi = pop.hi, width = (hi - lo) / bins;
      const counts = new Array(bins).fill(0);
      means.forEach((m) => { if (m < lo || m > hi) return; const b = Math.min(bins - 1, Math.floor((m - lo) / width)); counts[b] += 1; });
      const se = pop.sd / Math.sqrt(n);
      const peakNormal = (means.length * width) / (se * Math.sqrt(2 * Math.PI));
      const maxC = Math.max(...counts, Math.min(peakNormal, Math.max(...counts) * 1.6));
      const X = (v) => pad + ((v - lo) / (hi - lo)) * (w - 2 * pad);
      const Y = (c) => base - (c / maxC) * (base - top);
      ctx.fillStyle = css('--accent'); ctx.globalAlpha = 0.75;
      counts.forEach((c, i) => {
        const x0 = X(lo + i * width), x1 = X(lo + (i + 1) * width);
        ctx.fillRect(x0 + 0.5, Y(c), Math.max(1, x1 - x0 - 1), base - Y(c));
      });
      ctx.globalAlpha = 1;
      ctx.strokeStyle = css('--ink'); ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const v = lo + ((hi - lo) * i) / 200;
        const dens = Math.exp(-((v - pop.mu) ** 2) / (2 * se * se)) / (se * Math.sqrt(2 * Math.PI));
        const yy = Math.max(top - 6, Y(dens * means.length * width));
        i ? ctx.lineTo(X(v), yy) : ctx.moveTo(X(v), yy);
      }
      ctx.stroke();
      axisLabels(ctx, w, h, [[X(lo), String(lo), 'left'], [X(pop.mu), `μ=${pop.mu}`, 'center'], [X(hi), String(hi), 'right']], pad);
      const m = means.reduce((a, b) => a + b, 0) / means.length;
      const sd = Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / (means.length - 1));
      host.querySelector('#w-read').textContent = `표본평균 2000개의 표준편차 ${sd.toFixed(3)} · 이론값 σ/√n = ${se.toFixed(3)} · 선: 정규 근사`;
    }
    host.querySelectorAll('[data-pop]').forEach((b) => b.addEventListener('click', () => {
      popKey = b.dataset.pop;
      host.querySelectorAll('[data-pop]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.pop === popKey)));
      sample();
    }));
    nIn.addEventListener('input', sample);
    host.querySelector('[data-resample]').addEventListener('click', sample);
    sample();
    return draw;
  }

  /* ───────── 시작 ───────── */
  document.documentElement.lang = 'ko';
  render();
})();
