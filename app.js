/* 하루 CS — 매일 조금씩 배우는 CS 핵심
 * 빌드 없이 동작하는 단일 페이지 앱. 콘텐츠는 content/*.js 가 window.CS_SUBJECTS 에 등록한다.
 * 화면은 location.hash(#today, #subjects, #s-<과목>, #l-<레슨>, #review, #stats, #prefs)로 전환한다. */
(function () {
  'use strict';

  // ---------- 과목 메타 ----------
  const ORDER = ['algorithm', 'os', 'database', 'architecture', 'ml', 'dl'];
  const CODE = { algorithm: 'ALGO', os: 'OS', database: 'DB', architecture: 'ARCH', ml: 'ML', dl: 'DL' };
  const subjects = (window.CS_SUBJECTS || [])
    .slice()
    .sort((a, b) => idx(a.id) - idx(b.id));
  function idx(id) { const i = ORDER.indexOf(id); return i < 0 ? 99 : i; }
  const subjectById = Object.fromEntries(subjects.map(s => [s.id, s]));
  const lessonById = {};
  subjects.forEach(s => s.lessons.forEach((l, i) => { lessonById[l.id] = { lesson: l, subject: s, index: i }; }));

  // 간격 반복 주기(일). box 0 → 1일 뒤, box 4 → 30일 뒤
  const INTERVALS = [1, 3, 7, 14, 30];

  // ---------- 저장소 ----------
  const KEY = 'haru-cs.v1';
  const defaultState = () => ({
    prefs: { subjects: subjects.map(s => s.id), perDay: 2, theme: 'system' },
    lessons: {},
    days: {},
  });
  let state = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { /* 저장소를 쓸 수 없으면 메모리에서만 동작 */ }
    return defaultState();
  }
  function normalize(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const prefs = Object.assign({}, d.prefs, s.prefs || {});
    prefs.subjects = (prefs.subjects || []).filter(id => subjectById[id]);
    if (!prefs.subjects.length) prefs.subjects = d.prefs.subjects;
    prefs.perDay = clamp(parseInt(prefs.perDay, 10) || 2, 1, 6);
    return { prefs, lessons: s.lessons || {}, days: s.days || {} };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 무시 */ }
  }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 날짜 ----------
  function ymd(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  function today() { return ymd(new Date()); }
  function addDays(s, n) {
    const [y, m, d] = s.split('-').map(Number);
    return ymd(new Date(y, m - 1, d + n));
  }
  function dayNumber(s) {
    const [y, m, d] = s.split('-').map(Number);
    return Math.round(Date.UTC(y, m - 1, d) / 86400000);
  }
  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function prettyDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    const w = new Date(y, m - 1, d).getDay();
    return `${y}. ${m}. ${d}. (${WEEK[w]})`;
  }

  // ---------- 학습 로직 ----------
  function rec(id) { return state.lessons[id]; }
  function isDone(id) { return !!(rec(id) && rec(id).doneAt); }
  function dayRec(date) {
    if (!state.days[date]) state.days[date] = { plan: [], learned: 0, reviewed: 0 };
    return state.days[date];
  }
  function nextLessonOf(subjectId, exclude) {
    const s = subjectById[subjectId];
    if (!s) return null;
    return s.lessons.find(l => !isDone(l.id) && !(exclude && exclude.has(l.id))) || null;
  }
  /** 오늘 계획: 선택한 과목을 날마다 다른 순서로 돌며 다음 레슨을 고른다. 이미 끝낸 항목은 유지. */
  function buildPlan(date, keepDone) {
    const day = dayRec(date);
    const kept = keepDone ? day.plan.filter(id => isDone(id) && lessonById[id]) : [];
    const picked = new Set(kept);
    const subs = ORDER.filter(id => state.prefs.subjects.includes(id) && subjectById[id]);
    const plan = kept.slice();
    if (subs.length) {
      const offset = dayNumber(date) % subs.length;
      const rotated = subs.slice(offset).concat(subs.slice(0, offset));
      let guard = 0;
      while (plan.length < state.prefs.perDay && guard < 100) {
        let added = false;
        for (const sid of rotated) {
          if (plan.length >= state.prefs.perDay) break;
          const l = nextLessonOf(sid, picked);
          if (l) { plan.push(l.id); picked.add(l.id); added = true; }
        }
        if (!added) break;
        guard++;
      }
    }
    day.plan = plan;
    save();
    return plan;
  }
  function todayPlan() {
    const t = today();
    const day = state.days[t];
    if (!day || !day.plan || !day.plan.length) return buildPlan(t, false);
    return day.plan.filter(id => lessonById[id]);
  }
  function addExtraLesson() {
    const t = today();
    const plan = todayPlan();
    const picked = new Set(plan);
    const subs = ORDER.filter(id => state.prefs.subjects.includes(id) && subjectById[id]);
    const offset = (dayNumber(t) + plan.length) % Math.max(subs.length, 1);
    const rotated = subs.slice(offset).concat(subs.slice(0, offset));
    for (const sid of rotated) {
      const l = nextLessonOf(sid, picked);
      if (l) { dayRec(t).plan.push(l.id); save(); return l.id; }
    }
    return null;
  }
  function dueReviews(date) {
    const d = date || today();
    return Object.entries(state.lessons)
      .filter(([id, r]) => lessonById[id] && r.doneAt && r.due && r.due <= d && r.lastReviewed !== d && r.doneAt !== d)
      .sort((a, b) => (a[1].due < b[1].due ? -1 : a[1].due > b[1].due ? 1 : 0))
      .map(([id]) => id);
  }
  /** 퀴즈를 마쳤을 때 기록. kind: 'learn' | 'review' | 'retry' */
  function recordQuiz(id, correct, total) {
    const t = today();
    const r = state.lessons[id] || (state.lessons[id] = { box: 0, attempts: 0, correct: 0, answered: 0 });
    const perfect = correct === total;
    let kind;
    if (!r.doneAt) {
      kind = 'learn';
      r.doneAt = t;
      r.box = perfect ? 1 : 0;
      r.due = addDays(t, INTERVALS[r.box]);
      dayRec(t).learned++;
    } else if (r.due && r.due <= t && r.lastReviewed !== t && r.doneAt !== t) {
      kind = 'review';
      r.box = perfect ? Math.min(r.box + 1, INTERVALS.length - 1) : 0;
      r.due = addDays(t, INTERVALS[r.box]);
      r.lastReviewed = t;
      dayRec(t).reviewed++;
    } else {
      kind = 'retry';
      if (!perfect) { r.box = 0; r.due = addDays(t, 1); }
    }
    r.attempts++;
    r.correct += correct;
    r.answered += total;
    r.last = `${correct}/${total}`;
    save();
    return kind;
  }
  function activeDays() {
    return new Set(Object.entries(state.days).filter(([, d]) => (d.learned || 0) + (d.reviewed || 0) > 0).map(([k]) => k));
  }
  function streak() {
    const act = activeDays();
    let d = today();
    if (!act.has(d)) d = addDays(d, -1);
    let n = 0;
    while (act.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function doneCount(s) { return s.lessons.filter(l => isDone(l.id)).length; }
  const totalLessons = subjects.reduce((a, s) => a + s.lessons.length, 0);
  const totalDone = () => Object.keys(state.lessons).filter(id => lessonById[id] && isDone(id)).length;

  // ---------- 렌더 유틸 ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  /** 콘텐츠 문자열의 **굵게**, `코드`만 지원 */
  function md(s) {
    const parts = String(s).split(/(`[^`]+`)/g);
    return parts.map(p => {
      if (/^`[^`]+`$/.test(p)) return `<code>${esc(p.slice(1, -1))}</code>`;
      return esc(p).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    }).join('');
  }
  const color = id => `var(--s-${id})`;
  const $main = document.getElementById('main');
  function setView(html, title) {
    $main.innerHTML = html;
    document.title = title ? `${title} · 하루 CS` : '하루 CS';
    window.scrollTo(0, 0);
    updateNav();
  }
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }
  function updateNav() {
    const route = (location.hash || '#today').slice(1);
    const top = route.startsWith('s-') || route.startsWith('l-') ? 'subjects' : route || 'today';
    document.querySelectorAll('.nav a').forEach(a => {
      if (a.dataset.r === top) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    const n = dueReviews().length;
    const badge = document.getElementById('review-badge');
    if (badge) { badge.hidden = n === 0; badge.textContent = n; }
  }

  // ---------- 화면: 오늘 ----------
  function ticket(id, done) {
    const { lesson: l, subject: s, index } = lessonById[id];
    return `<a class="ticket${done ? ' done' : ''}" href="#l-${l.id}" style="--c:${color(s.id)}">
      <span class="tag" aria-hidden="true">${CODE[s.id]} ${String(index + 1).padStart(2, '0')}</span>
      <span class="body">
        <span class="subj">${esc(s.title)}</span>
        <span class="title">${esc(l.title)}</span>
        <span class="one">${md(l.oneLiner)}</span>
      </span>
      <span class="meta">${done ? '완료' : `${l.minutes}분`}</span>
    </a>`;
  }
  function viewToday() {
    const t = today();
    const plan = todayPlan();
    const doneToday = plan.filter(isDone).length;
    const reviews = dueReviews();
    const allDone = plan.length > 0 && doneToday === plan.length;
    const nothingLeft = subjects.every(s => state.prefs.subjects.includes(s.id) ? doneCount(s) === s.lessons.length : true);
    const remainingMin = plan.filter(id => !isDone(id)).reduce((a, id) => a + lessonById[id].lesson.minutes, 0);

    let head;
    if (!plan.length && nothingLeft) head = '선택한 과목을 모두 끝냈어요';
    else if (allDone) head = '오늘 분량 끝! 잘했어요';
    else if (doneToday) head = `${plan.length - doneToday}개 남았어요`;
    else head = `오늘은 ${plan.length}개, 약 ${remainingMin}분`;

    setView(`
      <div class="stack-lg">
        <section class="today-head" aria-labelledby="h-today">
          <p class="date">${prettyDate(t)}</p>
          <h1 id="h-today">${esc(head)}</h1>
        </section>

        <div class="meter" role="group" aria-label="학습 현황">
          <div><span class="v">${streak()}<small>일</small></span><span class="k">연속 학습</span></div>
          <div><span class="v">${doneToday}<small>/${plan.length}</small></span><span class="k">오늘 레슨</span></div>
          <div><span class="v">${totalDone()}<small>/${totalLessons}</small></span><span class="k">전체 진도</span></div>
        </div>

        ${reviews.length ? `<div class="callout">
          <p><strong>복습할 레슨 ${reviews.length}개</strong><br><span class="small muted">잊어버릴 때쯤 다시 풀면 오래 기억에 남아요.</span></p>
          <a class="btn" href="#review">복습 시작</a>
        </div>` : ''}

        <section class="stack" aria-labelledby="h-plan">
          <div class="row" style="justify-content:space-between">
            <h2 id="h-plan" class="eyebrow">오늘의 레슨</h2>
          </div>
          ${plan.length ? `<div class="tickets">${plan.map(id => ticket(id, isDone(id))).join('')}</div>`
            : `<div class="empty">${nothingLeft ? '설정에서 다른 과목을 켜거나, 복습으로 실력을 다져 보세요.' : '설정에서 과목을 선택해 주세요.'}</div>`}
          ${allDone && !nothingLeft ? `<div class="row"><button class="btn ghost" id="extra" type="button">한 개 더 배우기</button></div>` : ''}
        </section>

        <section class="stack" aria-labelledby="h-subj">
          <h2 id="h-subj" class="eyebrow">과목별 진도</h2>
          ${subjectGrid()}
        </section>
      </div>`, '오늘');

    const extra = document.getElementById('extra');
    if (extra) extra.addEventListener('click', () => {
      const id = addExtraLesson();
      if (id) location.hash = `l-${id}`;
      else toast('더 배울 레슨이 없어요');
    });
  }
  function subjectGrid() {
    return `<div class="subjects">${subjects.map(s => {
      const d = doneCount(s);
      const pct = Math.round(d / s.lessons.length * 100);
      return `<a class="subject" href="#s-${s.id}" style="--c:${color(s.id)}">
        <span class="top"><span class="name">${esc(s.title)}</span><span class="code">${CODE[s.id]}</span></span>
        <span class="tagline">${esc(s.tagline)}</span>
        <span class="bar" role="img" aria-label="${pct}% 완료"><i style="width:${pct}%"></i></span>
        <span class="count">${d} / ${s.lessons.length} 레슨</span>
      </a>`;
    }).join('')}</div>`;
  }

  // ---------- 화면: 과목 ----------
  function viewSubjects() {
    setView(`<div class="stack-lg">
      <div class="stack"><p class="eyebrow">6 과목 · ${totalLessons} 레슨</p><h1>과목</h1>
      <p class="muted">순서대로 하나씩 배우면 앞에서 배운 개념이 다음 레슨의 발판이 돼요. 원하는 레슨을 바로 열어도 괜찮아요.</p></div>
      ${subjectGrid()}
    </div>`, '과목');
  }
  function viewSubject(id) {
    const s = subjectById[id];
    if (!s) return viewNotFound();
    const next = nextLessonOf(id);
    const t = today();
    setView(`<div class="stack-lg" style="--c:${color(id)}">
      <div class="stack">
        <p class="eyebrow" style="color:var(--c)">${CODE[id]} · ${doneCount(s)} / ${s.lessons.length} 완료</p>
        <h1>${esc(s.title)}</h1>
        <p class="muted">${esc(s.tagline)}</p>
        <span class="bar"><i style="width:${Math.round(doneCount(s) / s.lessons.length * 100)}%"></i></span>
        ${next ? `<div class="row"><a class="btn" href="#l-${next.id}" style="background:var(--c);border-color:var(--c)">다음 레슨: ${esc(next.title)}</a></div>` : '<p class="small muted">이 과목을 모두 끝냈어요. 복습으로 기억을 굳혀 보세요.</p>'}
      </div>
      <ol class="lesson-list">${s.lessons.map((l, i) => {
        const r = rec(l.id);
        let st = '<span class="st todo">' + l.minutes + '분</span>';
        if (r && r.doneAt) st = r.due <= t && r.doneAt !== t ? '<span class="st rev">복습</span>' : `<span class="st ok">✓ ${esc(r.last || '')}</span>`;
        else if (next && next.id === l.id) st = '<span class="st next">다음</span>';
        return `<li><a href="#l-${l.id}"><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(l.title)}</span>${st}</a></li>`;
      }).join('')}</ol>
    </div>`, s.title);
  }

  // ---------- 화면: 레슨 ----------
  function lessonBody(l) {
    const ex = l.example;
    return `
      <p class="one-liner">${md(l.oneLiner)}</p>
      <section class="section"><h2 class="eyebrow">쉽게 말하면</h2><p class="analogy">${md(l.analogy)}</p></section>
      <section class="section"><h2 class="eyebrow">핵심</h2><ol class="points">${l.points.map(p => `<li><span>${md(p)}</span></li>`).join('')}</ol></section>
      ${ex ? `<section class="section example"><h2 class="eyebrow">예시</h2><figure>
        <figcaption>${md(ex.caption)}</figcaption>
        ${ex.code ? `<pre><code>${esc(ex.code)}</code></pre>` : `<div class="example-text">${md(ex.text)}</div>`}
      </figure></section>` : ''}
      ${l.terms && l.terms.length ? `<section class="section"><h2 class="eyebrow">용어</h2><dl class="terms">${l.terms.map(t => `<div><dt>${esc(t.term)}</dt><dd>${md(t.desc)}</dd></div>`).join('')}</dl></section>` : ''}
      ${l.pitfall ? `<p class="pitfall"><b>주의</b><span>${md(l.pitfall)}</span></p>` : ''}`;
  }
  function quizHtml(l) {
    return `<section class="section" aria-labelledby="h-quiz"><h2 class="eyebrow" id="h-quiz">확인 퀴즈 · ${l.quiz.length}문항</h2>
      <div class="quiz">${l.quiz.map((q, qi) => `<div class="q" data-q="${qi}">
        <fieldset><legend>${qi + 1}. ${md(q.q)}</legend>
          <div class="choices">${q.choices.map((c, ci) => `<button type="button" class="choice" data-c="${ci}"><span class="k">${'ABCD'[ci]}</span><span>${md(c)}</span></button>`).join('')}</div>
        </fieldset>
        <div class="why" hidden></div>
      </div>`).join('')}</div>
      <div class="result" id="result" hidden></div>
    </section>`;
  }
  /** 퀴즈 상호작용. 모두 답하면 onFinish(정답 수) 호출 */
  function bindQuiz(l, onFinish) {
    let answered = 0, correct = 0;
    $main.querySelectorAll('.q').forEach(qEl => {
      const q = l.quiz[Number(qEl.dataset.q)];
      qEl.querySelectorAll('.choice').forEach(btn => btn.addEventListener('click', () => {
        const pick = Number(btn.dataset.c);
        const ok = pick === q.answer;
        qEl.querySelectorAll('.choice').forEach(b => {
          b.disabled = true;
          const c = Number(b.dataset.c);
          if (c === q.answer) b.classList.add('correct');
          else if (c === pick) b.classList.add('wrong');
        });
        const why = qEl.querySelector('.why');
        why.innerHTML = `<span class="verdict ${ok ? 'ok' : 'no'}">${ok ? '정답' : `오답 · 정답은 ${'ABCD'[q.answer]}`}</span>${md(q.why)}`;
        why.hidden = false;
        answered++;
        if (ok) correct++;
        if (answered === l.quiz.length) onFinish(correct);
      }));
    });
  }
  function nextAfter(id) {
    const plan = todayPlan();
    const pending = plan.find(pid => pid !== id && !isDone(pid));
    if (pending) return { id: pending, label: '오늘의 다음 레슨' };
    const { subject: s } = lessonById[id];
    const n = nextLessonOf(s.id);
    if (n) return { id: n.id, label: `${s.title} 다음 레슨` };
    return null;
  }
  function viewLesson(id) {
    const entry = lessonById[id];
    if (!entry) return viewNotFound();
    const { lesson: l, subject: s, index } = entry;
    const prev = s.lessons[index - 1], next = s.lessons[index + 1];
    const r = rec(id);
    setView(`<article class="stack-lg">
      <div class="card" style="--c:${color(s.id)}">
        <header class="card-head">
          <p class="crumb"><a href="#s-${s.id}">${CODE[s.id]} ${String(index + 1).padStart(2, '0')}</a><span>${esc(s.title)}</span><span>· ${l.minutes}분</span>${r && r.doneAt ? `<span>· 최근 ${esc(r.last)}</span>` : ''}</p>
          <h1>${esc(l.title)}</h1>
        </header>
        ${lessonBody(l)}
        ${quizHtml(l)}
      </div>
      <nav class="pager" aria-label="레슨 이동">
        ${prev ? `<a class="btn quiet" href="#l-${prev.id}">← ${esc(prev.title)}</a>` : '<span></span>'}
        ${next ? `<a class="btn quiet" href="#l-${next.id}">${esc(next.title)} →</a>` : ''}
      </nav>
    </article>`, l.title);

    bindQuiz(l, correct => {
      const total = l.quiz.length;
      const kind = recordQuiz(id, correct, total);
      const nx = nextAfter(id);
      const res = document.getElementById('result');
      const r2 = rec(id);
      const msg = {
        learn: correct === total ? `완벽해요. ${INTERVALS[r2.box]}일 뒤에 복습으로 다시 만나요.` : `틀린 문제는 내일 복습에 다시 나와요.`,
        review: correct === total ? `복습 성공. 다음 복습은 ${INTERVALS[r2.box]}일 뒤예요.` : '복습 주기를 처음부터 다시 시작해요. 내일 한 번 더!',
        retry: correct === total ? '다시 풀어도 다 맞혔어요.' : '헷갈린 문제는 내일 복습에 넣어 둘게요.',
      }[kind];
      res.innerHTML = `<p class="eyebrow">${kind === 'learn' ? '레슨 완료' : kind === 'review' ? '복습 완료' : '다시 풀기'}</p>
        <p class="score">${correct} / ${total}</p>
        <p class="small muted">${msg}</p>
        <div class="row">
          ${nx ? `<a class="btn" href="#l-${nx.id}">${esc(nx.label)}</a>` : ''}
          <a class="btn ${nx ? 'quiet' : ''}" href="#today">오늘 화면으로</a>
        </div>`;
      res.hidden = false;
      res.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      updateNav();
    });
  }

  // ---------- 화면: 복습 ----------
  let reviewQueue = null;
  function viewReview() {
    if (!reviewQueue) reviewQueue = { ids: dueReviews(), pos: 0, score: 0, total: 0 };
    const q = reviewQueue;
    if (!q.ids.length) {
      reviewQueue = null;
      const upcoming = Object.entries(state.lessons).filter(([id, r]) => lessonById[id] && r.doneAt && r.due).sort((a, b) => a[1].due < b[1].due ? -1 : 1)[0];
      return setView(`<div class="stack-lg"><div class="stack"><p class="eyebrow">간격 반복</p><h1>지금 복습할 레슨이 없어요</h1>
        <p class="muted">배운 레슨은 1일 → 3일 → 7일 → 14일 → 30일 간격으로 다시 나와요. 틀리면 1일부터 다시 시작해요.</p>
        ${upcoming ? `<p class="small">다음 복습: <strong>${esc(lessonById[upcoming[0]].lesson.title)}</strong> · <span class="mono">${prettyDate(upcoming[1].due)}</span></p>` : ''}
        </div><div class="row"><a class="btn" href="#today">오늘의 레슨으로</a></div></div>`, '복습');
    }
    if (q.pos >= q.ids.length) {
      const done = q;
      reviewQueue = null;
      return setView(`<div class="stack-lg"><div class="stack"><p class="eyebrow">복습 끝</p><h1>${done.ids.length}개 레슨을 복습했어요</h1>
        <p class="score mono" style="font-size:var(--t-xl)">${done.score} / ${done.total}</p>
        <p class="muted">맞힌 레슨은 다음 복습까지 간격이 늘어나고, 틀린 레슨은 내일 다시 나와요.</p></div>
        <div class="row"><a class="btn" href="#today">오늘 화면으로</a></div></div>`, '복습');
    }
    const id = q.ids[q.pos];
    const { lesson: l, subject: s, index } = lessonById[id];
    setView(`<article class="stack-lg">
      <div class="stack"><p class="eyebrow">복습 ${q.pos + 1} / ${q.ids.length}</p></div>
      <div class="card" style="--c:${color(s.id)}">
        <header class="card-head">
          <p class="crumb"><a href="#s-${s.id}">${CODE[s.id]} ${String(index + 1).padStart(2, '0')}</a><span>${esc(s.title)}</span></p>
          <h1>${esc(l.title)}</h1>
        </header>
        <p class="one-liner">${md(l.oneLiner)}</p>
        <details><summary class="small muted" style="cursor:pointer">핵심 다시 보기</summary>
          <ol class="points" style="margin-top:12px">${l.points.map(p => `<li><span>${md(p)}</span></li>`).join('')}</ol>
        </details>
        ${quizHtml(l)}
      </div>
    </article>`, '복습');
    bindQuiz(l, correct => {
      recordQuiz(id, correct, l.quiz.length);
      q.score += correct; q.total += l.quiz.length;
      const res = document.getElementById('result');
      res.innerHTML = `<p class="score">${correct} / ${l.quiz.length}</p>
        <div class="row"><button class="btn" type="button" id="next-review">${q.pos + 1 < q.ids.length ? '다음 복습' : '복습 마치기'}</button></div>`;
      res.hidden = false;
      document.getElementById('next-review').addEventListener('click', () => { q.pos++; viewReview(); });
      updateNav();
    });
  }

  // ---------- 화면: 기록 ----------
  function viewStats() {
    const t = today();
    const weeks = 10;
    // 이번 주 토요일까지 채우고, 일요일부터 시작
    const end = addDays(t, 6 - new Date().getDay());
    const start = addDays(end, -(weeks * 7 - 1));
    let cells = '';
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i);
      const rd = state.days[d];
      const n = rd ? (rd.learned || 0) + (rd.reviewed || 0) : 0;
      const lv = n === 0 ? '' : n <= 1 ? 'l1' : n <= 3 ? 'l2' : 'l3';
      const future = d > t;
      cells += `<i class="${lv}${d === t ? ' today' : ''}" title="${d}${future ? '' : ` · ${n}개`}" style="${future ? 'opacity:.35' : ''}"></i>`;
    }
    const act = activeDays();
    const rows = subjects.map(s => {
      const recs = s.lessons.map(l => rec(l.id)).filter(r => r && r.answered);
      const ans = recs.reduce((a, r) => a + r.answered, 0), cor = recs.reduce((a, r) => a + r.correct, 0);
      return `<tr><td><span style="color:${color(s.id)};font-family:var(--f-mono);font-weight:600;margin-right:8px">${CODE[s.id]}</span>${esc(s.title)}</td>
        <td class="num">${doneCount(s)}/${s.lessons.length}</td><td class="num">${ans ? Math.round(cor / ans * 100) + '%' : '–'}</td></tr>`;
    }).join('');
    setView(`<div class="stack-lg">
      <div class="stack"><p class="eyebrow">기록</p><h1>꾸준함이 실력이 돼요</h1></div>
      <div class="meter">
        <div><span class="v">${streak()}<small>일</small></span><span class="k">연속 학습</span></div>
        <div><span class="v">${act.size}<small>일</small></span><span class="k">총 학습일</span></div>
        <div><span class="v">${Math.round(totalDone() / totalLessons * 100)}<small>%</small></span><span class="k">전체 진도</span></div>
      </div>
      <section class="stack"><h2 class="eyebrow">최근 ${weeks}주</h2>
        <div class="heat" role="img" aria-label="최근 ${weeks}주 학습 기록">${cells}</div>
        <div class="heat-legend">적게 <i style="background:var(--surface-2);border:1px solid var(--line)"></i><i class="l1" style="background:color-mix(in srgb,var(--accent) 30%,var(--surface))"></i><i style="background:color-mix(in srgb,var(--accent) 60%,var(--surface))"></i><i style="background:var(--accent)"></i> 많이</div>
      </section>
      <section class="stack"><h2 class="eyebrow">과목별</h2>
        <div class="table-wrap"><table><thead><tr><th>과목</th><th class="num">완료</th><th class="num">정답률</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>
    </div>`, '기록');
  }

  // ---------- 화면: 설정 ----------
  function viewPrefs() {
    const p = state.prefs;
    setView(`<div class="stack-lg">
      <div class="stack"><p class="eyebrow">설정</p><h1>나에게 맞게</h1></div>
      <section class="panel" aria-labelledby="h-subs">
        <h2 class="h3" id="h-subs" style="font-size:var(--t-lg)">배울 과목</h2>
        <div>${subjects.map(s => `<label class="check" style="--c:${color(s.id)}"><input type="checkbox" id="sub-${s.id}" value="${s.id}" ${p.subjects.includes(s.id) ? 'checked' : ''}><span class="dot"></span>${esc(s.title)}</label>`).join('')}</div>
      </section>
      <section class="panel" aria-labelledby="h-per">
        <h2 id="h-per" style="font-size:var(--t-lg)">하루 레슨 수</h2>
        <p class="small muted">레슨 하나에 5분 안팎이에요. 바꾸면 오늘 남은 레슨이 다시 짜여요.</p>
        <div class="seg" role="group" aria-label="하루 레슨 수">${[1, 2, 3, 4, 6].map(n => `<button type="button" data-per="${n}" aria-pressed="${p.perDay === n}">${n}개</button>`).join('')}</div>
      </section>
      <section class="panel" aria-labelledby="h-theme">
        <h2 id="h-theme" style="font-size:var(--t-lg)">화면 테마</h2>
        <div class="seg" role="group" aria-label="화면 테마">${[['system', '시스템'], ['light', '밝게'], ['dark', '어둡게']].map(([v, k]) => `<button type="button" data-theme-v="${v}" aria-pressed="${p.theme === v}">${k}</button>`).join('')}</div>
      </section>
      <section class="panel" aria-labelledby="h-backup">
        <h2 id="h-backup" style="font-size:var(--t-lg)">기록 옮기기</h2>
        <p class="small muted">학습 기록은 이 브라우저에만 저장돼요. 다른 기기로 옮기려면 아래 코드를 복사해 그쪽에 붙여 넣으세요.</p>
        <textarea id="backup" spellcheck="false" aria-label="백업 코드"></textarea>
        <div class="row">
          <button class="btn quiet" type="button" id="export">내 기록 코드 만들기</button>
          <button class="btn quiet" type="button" id="import">붙여 넣은 코드로 복원</button>
        </div>
      </section>
      <section class="panel" aria-labelledby="h-reset">
        <h2 id="h-reset" style="font-size:var(--t-lg)">초기화</h2>
        <p class="small muted">모든 진도와 복습 기록을 지워요. 되돌릴 수 없어요.</p>
        <div class="row"><button class="btn danger" type="button" id="reset">기록 모두 지우기</button></div>
      </section>
    </div>`, '설정');

    $main.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
      const sel = [...$main.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
      if (!sel.length) { cb.checked = true; toast('과목을 하나 이상 골라 주세요'); return; }
      state.prefs.subjects = sel;
      buildPlan(today(), true);
      toast('오늘 레슨을 다시 짰어요');
    }));
    $main.querySelectorAll('[data-per]').forEach(b => b.addEventListener('click', () => {
      state.prefs.perDay = Number(b.dataset.per);
      buildPlan(today(), true);
      $main.querySelectorAll('[data-per]').forEach(x => x.setAttribute('aria-pressed', x === b));
      toast(`하루 ${b.dataset.per}개로 바꿨어요`);
    }));
    $main.querySelectorAll('[data-theme-v]').forEach(b => b.addEventListener('click', () => {
      state.prefs.theme = b.dataset.themeV;
      save();
      applyTheme();
      $main.querySelectorAll('[data-theme-v]').forEach(x => x.setAttribute('aria-pressed', x === b));
    }));
    const ta = document.getElementById('backup');
    document.getElementById('export').addEventListener('click', () => {
      ta.value = btoa(unescape(encodeURIComponent(JSON.stringify(state))));
      ta.select();
      const done = () => toast('복사했어요');
      try {
        navigator.clipboard.writeText(ta.value).then(done, () => toast('코드를 길게 눌러 복사하세요'));
      } catch (e) { toast('코드를 길게 눌러 복사하세요'); }
    });
    document.getElementById('import').addEventListener('click', () => {
      try {
        const obj = JSON.parse(decodeURIComponent(escape(atob(ta.value.trim()))));
        if (!obj || !obj.lessons) throw new Error('형식');
        state = normalize(obj);
        save();
        applyTheme();
        toast('기록을 복원했어요');
        viewPrefs();
      } catch (e) {
        toast('코드를 읽지 못했어요. 끝까지 복사됐는지 확인해 주세요');
      }
    });
    const reset = document.getElementById('reset');
    reset.addEventListener('click', () => {
      if (reset.dataset.armed) {
        const prefs = state.prefs;
        state = defaultState();
        state.prefs = prefs;
        save();
        reviewQueue = null;
        toast('기록을 지웠어요');
        location.hash = 'today';
      } else {
        reset.dataset.armed = '1';
        reset.textContent = '정말 지울까요? 한 번 더 누르세요';
        setTimeout(() => { if (reset.isConnected) { delete reset.dataset.armed; reset.textContent = '기록 모두 지우기'; } }, 4000);
      }
    });
  }

  function viewNotFound() {
    setView(`<div class="stack"><h1>페이지를 찾을 수 없어요</h1><div class="row"><a class="btn" href="#today">오늘 화면으로</a></div></div>`);
  }

  function applyTheme() {
    const t = state.prefs.theme;
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }

  // ---------- 라우터 ----------
  function route() {
    const h = decodeURIComponent((location.hash || '').slice(1));
    if (h !== 'review') reviewQueue = null;
    if (!subjects.length) return setView('<div class="empty">콘텐츠를 불러오지 못했어요.</div>');
    if (!h || h === 'today') return viewToday();
    if (h === 'subjects') return viewSubjects();
    if (h === 'review') return viewReview();
    if (h === 'stats') return viewStats();
    if (h === 'prefs') return viewPrefs();
    if (h.startsWith('s-')) return viewSubject(h.slice(2));
    if (h.startsWith('l-')) return viewLesson(h.slice(2));
    return viewNotFound();
  }
  window.addEventListener('hashchange', route);
  // 자정을 넘겨 다시 열었을 때 오늘 계획을 새로 보여 준다
  let lastDay = today();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && today() !== lastDay) { lastDay = today(); route(); }
  });
  applyTheme();
  route();

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* 지원 안 함 */ }
  }
})();
