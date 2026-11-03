/* 자료구조 한 입 — 앱 본체
 * 화면: #home(오늘) · #map(커리큘럼) · #review(복습) · #day-N(레슨)
 * 기록은 이 브라우저의 localStorage에만 저장된다.
 */
(function () {
  const L = window.LESSONS;
  const DEMOS = window.DEMOS || {};
  const KEY = "dsbite.v1";
  const BOXES = [1, 3, 7]; // 복습 간격(일): 맞힐 때마다 다음 칸으로, 마지막 칸을 통과하면 졸업
  const app = document.getElementById("app");

  /* ---------- 저장 ---------- */
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  let S = Object.assign({ done: {}, days: [], review: [] }, load() || {});
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* 저장 불가 환경: 이번 방문 동안만 유지 */ }
  }

  /* ---------- 날짜 ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => ymd(new Date());
  function addDays(s, n) { const [y, m, d] = s.split("-").map(Number); return ymd(new Date(y, m - 1, d + n)); }
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = (s) => { const [y, m, d] = s.split("-").map(Number); return WEEK[new Date(y, m - 1, d).getDay()]; };

  /* ---------- 진도 ---------- */
  const doneCount = () => L.filter((l) => S.done[l.id]).length;
  const nextIndex = () => { const i = L.findIndex((l) => !S.done[l.id]); return i === -1 ? null : i; };
  const unlocked = (i) => i <= doneCount();
  const studiedToday = () => S.days.includes(today());
  function streak() {
    const set = new Set(S.days);
    let d = today();
    if (!set.has(d)) d = addDays(d, -1);
    let n = 0;
    while (set.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  const dueReviews = () => S.review.filter((r) => r.due <= today());
  function markStudied() { const t = today(); if (!S.days.includes(t)) S.days.push(t); }
  function addReview(li, qi) {
    const id = L[li].id;
    const ex = S.review.find((r) => r.l === id && r.q === qi);
    if (ex) { ex.box = 0; ex.due = addDays(today(), BOXES[0]); }
    else S.review.push({ l: id, q: qi, box: 0, due: addDays(today(), BOXES[0]) });
  }
  function passReview(item) {
    const r = S.review.find((x) => x.l === item.l && x.q === item.q);
    if (!r) return;
    r.box++;
    if (r.box >= BOXES.length) S.review = S.review.filter((x) => x !== r);
    else r.due = addDays(today(), BOXES[r.box]);
  }

  /* ---------- 문자열 도우미 ---------- */
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const inline = (s) => esc(s).replace(/`([^`]+)`/g, "<code>$1</code>");
  function cxClass(s) {
    const t = s.replace(/\s/g, "");
    if (/^O\(1\)|α/.test(t)) return "c-fast";
    if (/^O\(logn\)/.test(t)) return "c-log";
    if (/nlogn/.test(t)) return "c-nlog";
    if (/²/.test(t)) return "c-sq";
    return "c-lin";
  }
  const cell = (s) => (/^O\(/.test(s) ? `<span class="cx ${cxClass(s)}">${esc(s)}</span>` : inline(s));
  function hlPy(src) {
    const re = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(def|class|return|if|elif|else|for|while|in|not|and|or|is|None|True|False|import|from|as|lambda|pass|break|continue)\b|\b(\d[\d_]*)\b/g;
    let out = "", last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      const cls = m[1] ? "tk-c" : m[2] ? "tk-s" : m[3] ? "tk-k" : "tk-n";
      out += `<span class="${cls}">${esc(m[0])}</span>`;
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
  }
  const dayLabel = (i) => `Day ${i + 1}`;
  const idx = (i) => `[${pad(i)}]`;

  /* ---------- 공통 조각 ---------- */
  function header(active) {
    const due = dueReviews().length;
    const tab = (h, label, key, extra) => `<a class="tab${active === key ? " is-on" : ""}" href="#${h}"${active === key ? ' aria-current="page"' : ""}>${label}${extra || ""}</a>`;
    return `<header class="top">
      <a class="brand" href="#home" aria-label="자료구조 한 입 홈">
        <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
        <span class="brand-name">자료구조 한 입</span>
      </a>
      <span class="streak" title="연속 학습일"><span class="streak-n mono">${streak()}</span>일 연속</span>
    </header>
    <nav class="tabs" aria-label="화면">
      ${tab("home", "오늘", "home")}${tab("map", "커리큘럼", "map")}${tab("review", "복습", "review", due ? ` <span class="count mono">${due}</span>` : "")}
    </nav>`;
  }
  function weekBits() {
    const set = new Set(S.days);
    const days = []; for (let k = 6; k >= 0; k--) days.push(addDays(today(), -k));
    return `<div class="bits" aria-label="최근 7일 학습 기록">` + days.map((d) => {
      const on = set.has(d), isT = d === today();
      return `<div class="bit${on ? " is-on" : ""}${isT ? " is-today" : ""}" title="${d}${on ? " 학습함" : ""}"><span class="bit-v mono">${on ? 1 : 0}</span><span class="bit-d">${isT ? "오늘" : dow(d)}</span></div>`;
    }).join("") + `</div>`;
  }
  function progressArray(compact) {
    const dc = doneCount();
    return `<ol class="parr${compact ? " is-compact" : ""}">` + L.map((l, i) => {
      const st = S.done[l.id] ? "done" : i === dc ? "now" : "lock";
      const inner = `<span class="parr-i mono">${idx(i)}</span><span class="parr-t">${esc(l.title)}</span>` +
        (compact ? "" : `<span class="parr-s">${st === "done" ? "완료" : st === "now" ? "오늘 배울 차례" : "잠김"}</span>`);
      return `<li class="parr-c is-${st}">${st === "lock" ? `<span class="parr-a" aria-disabled="true">${inner}</span>` : `<a class="parr-a" href="#day-${i + 1}">${inner}</a>`}</li>`;
    }).join("") + `</ol>`;
  }

  /* ---------- 홈 ---------- */
  function renderHome() {
    const ni = nextIndex();
    const due = dueReviews().length;
    let main;
    if (ni === null) {
      main = `<section class="hero is-finished">
        <p class="eyebrow mono">curriculum.length == ${L.length}</p>
        <h1 class="hero-t">${L.length}일 과정을 모두 마쳤어요</h1>
        <p class="hero-sub">배운 내용이 흐려지지 않게 복습 문제를 풀거나, 아무 레슨이나 다시 열어 보세요.</p>
        <div class="row"><a class="btn btn-primary" href="#review">복습하기</a><a class="btn btn-ghost" href="#map">커리큘럼 보기</a></div>
      </section>`;
    } else if (studiedToday() && doneCount() > 0) {
      const n = L[ni];
      main = `<section class="hero is-rest">
        <p class="eyebrow">오늘 몫은 끝났어요</p>
        <h1 class="hero-t">내일은 <span class="mark">${esc(n.title)}</span></h1>
        <p class="hero-sub">${esc(n.tagline)}</p>
        <p class="hero-meta mono">${dayLabel(ni)} · 약 5분 · 퀴즈 ${n.quiz.length}문제</p>
        <div class="row"><a class="btn btn-ghost" href="#day-${ni + 1}">미리 하나 더 보기</a>${due ? `<a class="btn btn-primary" href="#review">복습 ${due}문제 풀기</a>` : ""}</div>
      </section>`;
    } else {
      const n = L[ni];
      main = `<section class="hero">
        <p class="eyebrow">오늘의 한 입 · <span class="mono">${dayLabel(ni)}</span></p>
        <h1 class="hero-t">${esc(n.title)} <span class="hero-en">${esc(n.en)}</span></h1>
        <p class="hero-sub">${esc(n.tagline)}</p>
        <p class="hero-meta mono">약 5분 · 핵심 ${n.points.length}가지${n.demo ? " · 직접 해보기" : ""} · 퀴즈 ${n.quiz.length}문제</p>
        <div class="row"><a class="btn btn-primary btn-lg" href="#day-${ni + 1}">시작하기</a></div>
      </section>`;
    }
    const reviewCard = due && !(studiedToday() && ni !== null)
      ? `<a class="notice" href="#review"><span><b>복습할 문제 ${due}개</b>가 기다리고 있어요. 틀렸던 문제를 간격을 두고 다시 풀면 오래 기억에 남아요.</span><span class="notice-go" aria-hidden="true">→</span></a>` : "";
    app.innerHTML = header("home") + `<main class="view">
      ${main}
      ${reviewCard}
      <section class="panel">
        <div class="panel-h"><h2 class="h2">이번 주</h2><span class="muted mono">${doneCount()} / ${L.length} 완료</span></div>
        ${weekBits()}
      </section>
      <section class="panel">
        <div class="panel-h"><h2 class="h2">진도</h2><a class="link" href="#map">전체 보기</a></div>
        ${progressArray(true)}
      </section>
      <p class="foot muted">하루에 하나씩, 18일 과정이에요. 기록은 이 브라우저에만 저장돼요.</p>
    </main>`;
  }

  /* ---------- 커리큘럼 ---------- */
  let confirmReset = false;
  function renderMap() {
    app.innerHTML = header("map") + `<main class="view">
      <section class="intro">
        <p class="eyebrow mono">const curriculum = new Array(${L.length})</p>
        <h1 class="h1">18일 커리큘럼</h1>
        <p class="muted">기초(빅오, 배열)에서 시작해 선형 구조, 해시, 트리, 그래프 순으로 쌓아 올려요. 한 칸이 하루치예요.</p>
      </section>
      ${progressArray(false)}
      <section class="panel danger-zone">
        <div class="panel-h"><h2 class="h2">학습 기록</h2></div>
        ${confirmReset
          ? `<p>완료 표시, 연속 학습일, 복습 문제가 모두 지워져요. 되돌릴 수 없어요.</p><div class="row"><button type="button" class="btn btn-danger" data-act="reset-yes">모두 지우기</button><button type="button" class="btn btn-ghost" data-act="reset-no">취소</button></div>`
          : `<p class="muted">처음부터 다시 시작하고 싶다면 기록을 지울 수 있어요.</p><div class="row"><button type="button" class="btn btn-ghost" data-act="reset">기록 지우기</button></div>`}
      </section>
    </main>`;
  }

  /* ---------- 레슨 ---------- */
  let cur = null; // { li, steps, i, answers }
  function buildSteps(l) {
    const s = [{ t: "intro", name: "핵심" }, { t: "points", name: "포인트" }];
    if (l.demo && DEMOS[l.demo]) s.push({ t: "demo", name: "해보기" });
    s.push({ t: "ops", name: "연산" }, { t: "code", name: "코드" });
    l.quiz.forEach((_, k) => s.push({ t: "quiz", k, name: `퀴즈 ${k + 1}` }));
    s.push({ t: "done", name: "완료" });
    return s;
  }
  function startLesson(li) {
    if (!cur || cur.li !== li) cur = { li, steps: buildSteps(L[li]), i: 0, answers: {} };
    renderLesson();
  }
  function quizHTML(q, picked, scope) {
    const answered = picked !== undefined;
    return `<div class="quiz" data-scope="${scope}">
      <p class="quiz-q">${inline(q.q)}</p>
      <div class="opts" role="group" aria-label="보기">
        ${q.options.map((o, k) => {
          const cls = ["opt"];
          if (answered && k === q.answer) cls.push("is-right");
          if (answered && k === picked && k !== q.answer) cls.push("is-wrong");
          return `<button type="button" class="${cls.join(" ")}" data-opt="${k}"${answered ? " disabled" : ""}><span class="opt-k mono">${"ABCD"[k]}</span><span>${cell(o)}</span></button>`;
        }).join("")}
      </div>
      ${answered ? `<div class="why ${picked === q.answer ? "is-right" : "is-wrong"}" role="status"><b>${picked === q.answer ? "정답이에요." : "아쉬워요. 복습 목록에 넣어 둘게요."}</b> ${inline(q.why)}</div>` : ""}
    </div>`;
  }
  function stepBody(l, st) {
    switch (st.t) {
      case "intro":
        return `<p class="eyebrow">핵심 한 줄</p>
          <h2 class="tagline"><span class="mark">${esc(l.tagline)}</span></h2>
          <div class="analogy"><p class="analogy-k">비유하면</p><p>${inline(l.analogy)}</p></div>`;
      case "points":
        return `<p class="eyebrow">꼭 기억할 ${l.points.length}가지</p>
          <ul class="points">${l.points.map((p) => `<li>${inline(p)}</li>`).join("")}</ul>
          ${l.pitfall ? `<div class="pitfall"><p class="pitfall-k">자주 하는 실수</p><p>${inline(l.pitfall)}</p></div>` : ""}`;
      case "demo":
        return `<p class="eyebrow">직접 해보기</p><div class="demo" id="demo-root"></div>`;
      case "ops":
        return `<p class="eyebrow">연산과 시간 복잡도</p>
          <div class="tbl-wrap"><table class="ops"><thead><tr>${l.ops.head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
          <tbody>${l.ops.rows.map((r) => `<tr>${r.map((c) => `<td>${cell(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>
          <p class="legend"><span class="cx c-fast">빠름</span><span class="cx c-log">로그</span><span class="cx c-lin">선형</span><span class="cx c-nlog">n log n</span><span class="cx c-sq">제곱</span></p>`;
      case "code":
        return `<p class="eyebrow">Python으로 보면</p>
          <div class="code"><div class="code-bar"><span class="mono">${esc(l.id)}.py</span><button type="button" class="btn btn-tiny" data-act="copy">복사</button></div><pre><code>${hlPy(l.code)}</code></pre></div>`;
      case "quiz":
        return `<p class="eyebrow">퀴즈 ${st.k + 1} / ${l.quiz.length}</p>` + quizHTML(l.quiz[st.k], cur.answers[st.k], "lesson");
      case "done": {
        const right = l.quiz.filter((q, k) => cur.answers[k] === q.answer).length;
        const ni = nextIndex();
        return `<div class="done">
          <p class="eyebrow mono">curriculum[${pad(cur.li)}].done = true</p>
          <h2 class="h1">${dayLabel(cur.li)} 완료</h2>
          <p class="done-score">퀴즈 <b class="mono">${right} / ${l.quiz.length}</b>${right === l.quiz.length ? " · 모두 맞혔어요" : " · 틀린 문제는 내일 복습에 나와요"}</p>
          <div class="recap"><p class="analogy-k">오늘의 한 줄</p><p><span class="mark">${esc(l.tagline)}</span></p></div>
          ${weekBits()}
          <div class="row">
            <a class="btn btn-primary" href="#home">홈으로</a>
            ${ni !== null ? `<a class="btn btn-ghost" href="#day-${ni + 1}">다음: ${esc(L[ni].title)}</a>` : `<a class="btn btn-ghost" href="#review">복습하기</a>`}
          </div>
        </div>`;
      }
    }
    return "";
  }
  function renderLesson() {
    const l = L[cur.li], st = cur.steps[cur.i];
    if (st.t === "done" && !S.done[l.id]) { S.done[l.id] = today(); markStudied(); save(); }
    const blocked = st.t === "quiz" && cur.answers[st.k] === undefined;
    const isLast = cur.i === cur.steps.length - 1;
    app.innerHTML = header("") + `<main class="view lesson">
      <div class="lesson-h">
        <a class="back" href="#home" aria-label="홈으로">←</a>
        <div class="lesson-ttl"><p class="mono muted">${dayLabel(cur.li)} ${idx(cur.li)}</p><p class="lesson-name">${esc(l.title)} <span class="hero-en">${esc(l.en)}</span></p></div>
      </div>
      <ol class="steps" aria-label="진행 단계">${cur.steps.map((s, k) =>
        `<li class="step${k < cur.i ? " is-done" : ""}${k === cur.i ? " is-on" : ""}" title="${esc(s.name)}"${k === cur.i ? ' aria-current="step"' : ""}><span class="sr">${esc(s.name)}</span></li>`).join("")}</ol>
      <article class="card" id="step-card">${stepBody(l, st)}</article>
      ${isLast ? "" : `<div class="nav">
        <button type="button" class="btn btn-ghost" data-act="prev"${cur.i === 0 ? " disabled" : ""}>이전</button>
        <span class="muted mono nav-c">${cur.i + 1} / ${cur.steps.length}</span>
        <button type="button" class="btn btn-primary" data-act="next"${blocked ? " disabled" : ""}>${blocked ? "답을 골라 주세요" : cur.steps[cur.i + 1].t === "done" ? "마치기" : "다음"}</button>
      </div>`}
    </main>`;
    if (st.t === "demo") DEMOS[l.demo](document.getElementById("demo-root"));
  }

  /* ---------- 복습 ---------- */
  let rv = null; // { items:[{li,qi,l,q,kind}], i, picked, right }
  function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function startReview(kind) {
    let items;
    if (kind === "due") {
      items = dueReviews().map((r) => ({ li: L.findIndex((l) => l.id === r.l), qi: r.q, l: r.l, q: r.q })).filter((x) => x.li >= 0);
    } else {
      const pool = [];
      L.forEach((l, li) => { if (S.done[l.id]) l.quiz.forEach((_, qi) => pool.push({ li, qi, l: l.id, q: qi })); });
      items = shuffle(pool).slice(0, 5);
    }
    rv = { kind, items: shuffle(items), i: 0, picked: undefined, right: 0 };
    renderReview();
  }
  function renderReview() {
    const due = dueReviews().length;
    let body;
    if (!rv) {
      const anyDone = doneCount() > 0;
      const upcoming = S.review.filter((r) => r.due > today()).sort((a, b) => (a.due < b.due ? -1 : 1));
      body = `<section class="intro">
          <p class="eyebrow">간격 반복 복습</p>
          <h1 class="h1">${due ? `오늘 복습할 문제 ${due}개` : "오늘 복습할 문제가 없어요"}</h1>
          <p class="muted">틀린 문제는 1일 뒤, 맞히면 3일 뒤, 또 맞히면 7일 뒤에 다시 나와요. 세 번 연속 맞히면 목록에서 빠져요.</p>
        </section>
        <div class="row">
          ${due ? `<button type="button" class="btn btn-primary btn-lg" data-act="rv-due">복습 시작</button>` : ""}
          ${anyDone ? `<button type="button" class="btn ${due ? "btn-ghost" : "btn-primary"}" data-act="rv-mix">배운 내용 섞어서 5문제</button>` : ""}
        </div>
        ${!anyDone ? `<p class="empty">첫 레슨을 마치면 여기서 복습할 수 있어요. <a class="link" href="#home">오늘의 레슨 시작하기</a></p>` : ""}
        ${upcoming.length ? `<section class="panel"><div class="panel-h"><h2 class="h2">예정된 복습</h2><span class="muted mono">${upcoming.length}개</span></div>
          <ul class="sched">${upcoming.slice(0, 8).map((r) => { const l = L.find((x) => x.id === r.l); return l ? `<li><span class="mono">${r.due.slice(5).replace("-", ".")}</span><span>${esc(l.title)} · 퀴즈 ${r.q + 1}</span><span class="muted mono">${r.box + 1}/${BOXES.length}단계</span></li>` : ""; }).join("")}</ul></section>` : ""}`;
    } else if (rv.i >= rv.items.length) {
      body = `<div class="card done"><p class="eyebrow">복습 끝</p><h2 class="h1">${rv.right} / ${rv.items.length} 맞혔어요</h2>
        <p class="muted">${rv.kind === "due" ? "맞힌 문제는 더 긴 간격 뒤에 다시 나와요." : "틀린 문제는 복습 목록에 넣어 뒀어요."}</p>
        <div class="row"><a class="btn btn-primary" href="#home">홈으로</a><button type="button" class="btn btn-ghost" data-act="rv-back">복습 화면으로</button></div></div>`;
    } else {
      const it = rv.items[rv.i], l = L[it.li];
      body = `<div class="lesson-h"><button type="button" class="back" data-act="rv-back" aria-label="복습 화면으로">←</button>
          <div class="lesson-ttl"><p class="mono muted">복습 ${rv.i + 1} / ${rv.items.length}</p><p class="lesson-name">${esc(l.title)}</p></div></div>
        <article class="card">${quizHTML(l.quiz[it.qi], rv.picked, "review")}</article>
        <div class="nav"><span></span><span></span>
          <button type="button" class="btn btn-primary" data-act="rv-next"${rv.picked === undefined ? " disabled" : ""}>${rv.picked === undefined ? "답을 골라 주세요" : rv.i === rv.items.length - 1 ? "결과 보기" : "다음"}</button></div>`;
    }
    app.innerHTML = header("review") + `<main class="view">${body}</main>`;
  }

  /* ---------- 라우팅 ---------- */
  function route() {
    const h = (location.hash || "#home").slice(1);
    window.scrollTo(0, 0);
    const m = /^day-(\d+)$/.exec(h);
    if (m) {
      const li = Number(m[1]) - 1;
      if (li >= 0 && li < L.length && unlocked(li)) return startLesson(li);
      location.replace("#map");
      return;
    }
    if (h === "map") return renderMap();
    if (h === "review") { rv = null; return renderReview(); }
    cur = null;
    renderHome();
  }

  /* ---------- 이벤트 ---------- */
  app.addEventListener("click", (e) => {
    const opt = e.target.closest("[data-opt]");
    if (opt && !opt.disabled) {
      const k = Number(opt.dataset.opt);
      const scope = opt.closest(".quiz").dataset.scope;
      if (scope === "lesson" && cur) {
        const st = cur.steps[cur.i];
        if (cur.answers[st.k] !== undefined) return;
        cur.answers[st.k] = k;
        if (k !== L[cur.li].quiz[st.k].answer) { addReview(cur.li, st.k); save(); }
        renderLesson();
      } else if (scope === "review" && rv) {
        if (rv.picked !== undefined) return;
        rv.picked = k;
        const it = rv.items[rv.i];
        const ok = k === L[it.li].quiz[it.qi].answer;
        if (ok) { rv.right++; if (rv.kind === "due") passReview(it); }
        else addReview(it.li, it.qi);
        markStudied();
        save();
        renderReview();
      }
      return;
    }
    const b = e.target.closest("[data-act]");
    if (!b || b.closest(".demo")) return;
    const act = b.dataset.act;
    if (act === "next" && cur) { if (cur.i < cur.steps.length - 1) { cur.i++; renderLesson(); focusCard(); } }
    else if (act === "prev" && cur) { if (cur.i > 0) { cur.i--; renderLesson(); focusCard(); } }
    else if (act === "copy" && cur) {
      const src = L[cur.li].code;
      const done = () => { b.textContent = "복사됨"; setTimeout(() => (b.textContent = "복사"), 1500); };
      const fallback = () => { const sel = window.getSelection(), r = document.createRange(); r.selectNodeContents(document.querySelector(".code pre")); sel.removeAllRanges(); sel.addRange(r); b.textContent = "선택됨, 복사하세요"; };
      try { navigator.clipboard.writeText(src).then(done, fallback); } catch (err) { fallback(); }
    }
    else if (act === "reset") { confirmReset = true; renderMap(); }
    else if (act === "reset-no") { confirmReset = false; renderMap(); }
    else if (act === "reset-yes") { S = { done: {}, days: [], review: [] }; save(); confirmReset = false; cur = null; renderMap(); }
    else if (act === "rv-due") startReview("due");
    else if (act === "rv-mix") startReview("mix");
    else if (act === "rv-next" && rv) { rv.i++; rv.picked = undefined; renderReview(); }
    else if (act === "rv-back") { rv = null; renderReview(); }
  });
  function focusCard() {
    const top = document.querySelector(".steps");
    if (top && top.getBoundingClientRect().top < 0) top.scrollIntoView({ block: "start" });
  }
  document.addEventListener("keydown", (e) => {
    if (!cur || e.target.closest("input, select, textarea")) return;
    if (e.key === "ArrowRight") { const n = document.querySelector('[data-act="next"]'); if (n && !n.disabled) n.click(); }
    if (e.key === "ArrowLeft") { const p = document.querySelector('[data-act="prev"]'); if (p && !p.disabled) p.click(); }
  });

  window.addEventListener("hashchange", route);
  route();
})();
