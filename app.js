(() => {
  "use strict";

  const LESSONS = window.LESSONS;
  const WEEKS = window.WEEKS;
  const TOTAL = LESSONS.length;
  const STORE_KEY = "python-hanip-v1";
  const BRYTHON = "https://cdn.jsdelivr.net/npm/brython@3.13.2/";
  const app = document.getElementById("app");
  document.documentElement.lang = "ko";

  /* ---------------- state ---------------- */
  function freshState() {
    return { done: {}, log: [], code: {}, quiz: {}, oneADay: true };
  }
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) return Object.assign(freshState(), JSON.parse(raw));
    } catch (e) { /* storage unavailable */ }
    return freshState();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function dateStr(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  const today = () => dateStr(new Date());
  function addDays(str, n) {
    const [y, m, d] = str.split("-").map(Number);
    return dateStr(new Date(y, m - 1, d + n));
  }

  const lessonOf = (day) => LESSONS[day - 1];
  const isDone = (day) => Boolean(state.done[day]);
  function isOpen(day) {
    if (day === 1 || isDone(day)) return true;
    const prev = state.done[day - 1];
    if (!prev) return false;
    return state.oneADay ? prev < today() : true;
  }
  function nextDay() {
    for (let d = 1; d <= TOTAL; d++) if (!isDone(d)) return d;
    return null;
  }
  function doneCount() { return Object.keys(state.done).length; }
  function streak() {
    const set = new Set(state.log);
    let d = today();
    if (!set.has(d)) d = addDays(d, -1);
    let n = 0;
    while (set.has(d)) { n++; d = addDays(d, -1); }
    return n;
  }
  function weekOf(day) { return WEEKS.find((w) => day >= w.from && day <= w.to); }

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  // `code` 와 **형광펜** 만 지원하는 아주 작은 마크업
  function md(s) {
    const parts = String(s).split("`");
    return parts.map((p, i) => {
      if (i % 2 === 1) return `<code>${esc(p)}</code>`;
      return esc(p).replace(/\*\*(.+?)\*\*/g, "<mark>$1</mark>");
    }).join("");
  }
  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function normalize(s) {
    return String(s).replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, "")).join("\n").trim();
  }

  /* ---------------- python engine ---------------- */
  const engine = { ready: false, failed: false, waiters: [] };
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("load failed: " + src));
      document.head.appendChild(s);
    });
  }
  async function bootEngine() {
    try {
      await loadScript(BRYTHON + "brython.min.js");
      await loadScript(BRYTHON + "brython_stdlib.js");
      window.brython({ debug: 1, ids: ["pyrunner"] });
      const t0 = Date.now();
      while (typeof window.pyRun !== "function") {
        if (Date.now() - t0 > 20000) throw new Error("runner timeout");
        await new Promise((r) => setTimeout(r, 50));
      }
      engine.ready = true;
    } catch (e) {
      engine.failed = true;
      console.error(e);
    }
    document.querySelectorAll("[data-engine]").forEach(syncEngineUI);
    engine.waiters.forEach((f) => f());
  }
  function syncEngineUI(el) {
    if (el.matches("button")) {
      el.disabled = !engine.ready;
      if (engine.failed) el.title = "파이썬 엔진을 불러오지 못했어요";
    } else {
      el.hidden = engine.ready;
      el.textContent = engine.failed
        ? "파이썬 엔진을 불러오지 못했어요. 인터넷 연결을 확인하고 새로 고침해 주세요. 실습은 '정답 보기'로 넘어갈 수 있어요."
        : "파이썬 엔진을 불러오는 중이에요…";
    }
  }

  const HINTS = {
    SyntaxError: "문법이 틀렸어요. 괄호·따옴표 짝, 그리고 if/for/def 줄 끝의 콜론(:)을 확인해 보세요.",
    IndentationError: "들여쓰기가 맞지 않아요. 콜론(:) 다음 줄은 스페이스 4칸 들여 쓰고, 같은 영역은 칸 수를 맞춰 주세요.",
    NameError: "정의되지 않은 이름을 썼어요. 변수 이름 오타, 또는 문자열인데 따옴표를 빠뜨리지 않았는지 확인해 보세요.",
    TypeError: "자료형이 맞지 않아요. 예를 들어 문자열 + 숫자는 안 돼요. str()이나 int()로 바꾸거나 f-string을 써 보세요.",
    ValueError: "값이 알맞지 않아요. 예: int(\"abc\")처럼 숫자로 바꿀 수 없는 글자를 바꾸려 했어요.",
    ZeroDivisionError: "0으로 나눌 수 없어요.",
    IndexError: "리스트나 문자열의 범위를 벗어난 번호예요. 번호는 0부터 len()-1까지예요.",
    KeyError: "딕셔너리에 없는 키예요. 키 철자를 확인하거나 get()을 써 보세요.",
    AttributeError: "그 값에는 없는 기능(메서드·속성)이에요. 이름 철자나 self. 를 빠뜨리지 않았는지 확인해 보세요.",
    EOFError: "input()이 읽을 입력값이 부족해요. 아래 '입력값' 칸에 줄을 추가해 주세요.",
  };

  async function runPython(code, stdin) {
    if (!engine.ready) return { display: "", out: "", error: "파이썬 엔진이 아직 준비되지 않았어요.", kind: null };
    await new Promise((r) => setTimeout(r, 16));
    try {
      return JSON.parse(window.pyRun(code, stdin || ""));
    } catch (e) {
      return { display: "", out: "", error: String(e), kind: null };
    }
  }

  /* ---------------- editor ---------------- */
  function makeEditor({ id, code, stdin, label, onChange, original }) {
    const hasStdin = stdin !== undefined && stdin !== null;
    const el = h(`
      <div class="editor">
        <div class="editor-bar">
          <span class="editor-label">${esc(label || "main.py")}</span>
          <div class="editor-actions">
            <button type="button" class="e-btn reset">처음 코드</button>
            <button type="button" class="e-btn run" data-engine>▶ 실행</button>
          </div>
        </div>
        <textarea class="code" id="${id}" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" wrap="off" aria-label="코드 편집기"></textarea>
        ${hasStdin ? `<div class="stdin-wrap"><label for="${id}-in">입력값 · input()에 한 줄씩 들어가요</label><textarea class="stdin" id="${id}-in" rows="1" spellcheck="false"></textarea></div>` : ""}
        <div class="output" hidden aria-live="polite">
          <div class="output-head">실행 결과</div>
          <pre></pre>
          <p class="err-hint" hidden></p>
        </div>
      </div>`);
    const ta = el.querySelector(".code");
    const inp = el.querySelector(".stdin");
    const out = el.querySelector(".output");
    const pre = out.querySelector("pre");
    const hint = out.querySelector(".err-hint");
    const runBtn = el.querySelector(".run");
    ta.value = code;
    if (inp) inp.value = stdin;
    syncEngineUI(runBtn);

    const fit = () => { ta.style.height = "auto"; ta.style.height = ta.scrollHeight + 2 + "px"; };
    requestAnimationFrame(fit);
    let escaped = false;
    ta.addEventListener("input", () => { fit(); onChange && onChange(ta.value); });
    ta.addEventListener("keydown", (e) => {
      if (e.key === "Escape") { escaped = true; return; }
      if (e.key === "Tab" && !escaped && !e.shiftKey) {
        e.preventDefault();
        insert("    ");
      } else if (e.key === "Enter" && !e.isComposing) {
        const before = ta.value.slice(0, ta.selectionStart);
        const line = before.split("\n").pop();
        let indent = (line.match(/^ */) || [""])[0];
        if (/:\s*(#.*)?$/.test(line)) indent += "    ";
        if (indent) { e.preventDefault(); insert("\n" + indent); }
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        run();
      }
      if (e.key !== "Tab") escaped = false;
    });
    function insert(text) {
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.setRangeText(text, s, en, "end");
      ta.dispatchEvent(new Event("input"));
    }

    async function run() {
      runBtn.disabled = true;
      const res = await runPython(ta.value, inp ? inp.value : "");
      runBtn.disabled = !engine.ready;
      out.hidden = false;
      pre.innerHTML = esc(res.display);
      if (res.error) {
        pre.innerHTML += (res.display && !res.display.endsWith("\n") ? "\n" : "") + `<span class="err">${esc(res.error)}</span>`;
        const tip = HINTS[res.kind];
        hint.hidden = !tip;
        hint.textContent = tip ? "도움말: " + tip : "";
      } else {
        hint.hidden = true;
        if (!res.display) pre.innerHTML = `<span style="color:var(--term-dim)">(출력 없음 · print()로 값을 출력해 보세요)</span>`;
      }
      return res;
    }
    runBtn.addEventListener("click", run);
    el.querySelector(".reset").addEventListener("click", () => {
      ta.value = original !== undefined ? original : code;
      ta.dispatchEvent(new Event("input"));
      out.hidden = true;
    });
    return {
      el,
      run,
      get code() { return ta.value; },
      set code(v) { ta.value = v; ta.dispatchEvent(new Event("input")); },
    };
  }

  /* ---------------- quiz ---------------- */
  function makeQuiz(quiz, idPrefix, onRight) {
    const looksCode = (o) => /[()[\]="'.{}%*+]/.test(o) && !/[가-힣]{3,}/.test(o.replace(/"[^"]*"/g, ""));
    const el = h(`
      <div class="quiz">
        <p class="q-text">${md(quiz.q)}</p>
        ${quiz.code ? `<pre class="snippet"><code>${esc(quiz.code)}</code></pre>` : ""}
        <div class="options" role="group" aria-label="보기">
          ${quiz.options.map((o, i) => `
            <button type="button" class="option${looksCode(o) ? " mono" : ""}" id="${idPrefix}-o${i}" data-i="${i}">
              <span class="o-key">${"ABCD"[i]}</span><span class="o-text">${esc(o)}</span>
            </button>`).join("")}
        </div>
        <div class="feedback" hidden aria-live="polite"></div>
      </div>`);
    el.querySelectorAll(".snippet code").forEach((c) => { c.style.background = "none"; c.style.padding = "0"; });
    const fb = el.querySelector(".feedback");
    el.querySelectorAll(".option").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.dataset.i);
        fb.hidden = false;
        if (i === quiz.answer) {
          btn.classList.add("right");
          el.querySelectorAll(".option").forEach((b) => { b.disabled = true; });
          fb.className = "feedback ok";
          fb.innerHTML = `<strong>정답!</strong>${md(quiz.explain)}`;
          onRight && onRight();
        } else {
          btn.classList.add("wrong");
          btn.disabled = true;
          fb.className = "feedback no";
          fb.innerHTML = `<strong>아쉬워요.</strong>다른 보기를 골라 보세요.`;
        }
      });
    });
    return el;
  }

  /* ---------------- views ---------------- */
  function setNav(which) {
    document.querySelectorAll("[data-nav]").forEach((a) => {
      if (a.dataset.nav === which) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    document.getElementById("streak-num").textContent = streak();
  }

  function sheetHTML() {
    const nd = nextDay();
    return `<div class="sheet" role="list">${LESSONS.map((l) => {
      const open = isOpen(l.day);
      const cls = isDone(l.day) ? "done" : open ? "open" : "locked";
      const cur = l.day === nd && open ? " current" : "";
      const label = `${l.day}일차 ${l.title}${isDone(l.day) ? " (완료)" : open ? "" : " (잠김)"}`;
      return `<a role="listitem" class="cell ${cls}${cur}" href="#day-${l.day}" aria-label="${esc(label)}"${open ? "" : ' tabindex="-1" aria-disabled="true"'}>
        <span class="c-day">${l.day}</span><span class="c-tok">${esc(l.token)}</span></a>`;
    }).join("")}</div>`;
  }

  function keysHTML(keys) {
    return `<ul class="keys">${keys.map((k, i) => `<li><span class="k-num">${i + 1}</span><span>${md(k)}</span></li>`).join("")}</ul>`;
  }

  function renderHome() {
    setNav("home");
    const nd = nextDay();
    const n = doneCount();
    let todayCard;
    if (nd === null) {
      todayCard = `
        <section class="today">
          <div class="today-token"><span class="prompt">&gt;&gt;&gt;</span><span>print("수료!")</span><span class="cursor"></span></div>
          <div class="today-body">
            <p class="eyebrow">30일 완주</p>
            <h1>30일 코스를 모두 마쳤어요</h1>
            <p>이제 내 컴퓨터에 파이썬을 설치하고, 매일 반복하는 작은 일을 자동화하는 스크립트를 만들어 보세요. 아래 진도표에서 언제든 복습할 수 있어요.</p>
          </div>
        </section>`;
    } else {
      const l = lessonOf(nd);
      const open = isOpen(nd);
      const w = weekOf(nd);
      todayCard = `
        <section class="today" aria-labelledby="today-title">
          <div class="today-token"><span class="prompt">&gt;&gt;&gt;</span><span>${esc(l.token)}</span><span class="cursor"></span></div>
          <div class="today-body">
            <p class="eyebrow">${open ? "오늘의 한 입" : "내일의 한 입"} · ${l.day}일차</p>
            <h1 id="today-title">${esc(l.title)}</h1>
            <div class="today-meta"><span>${w.n}주차 ${esc(w.name)}</span><span>약 ${l.minutes}분</span><span>핵심 3줄 · 퀴즈 1 · 실습 1</span></div>
            ${keysHTML(l.keys)}
            ${open
              ? `<div class="row"><a class="btn" href="#day-${l.day}">${n === 0 ? "첫 레슨 시작하기" : "오늘 레슨 시작하기"}</a></div>`
              : `<div class="feedback ok"><strong>오늘 분량 끝!</strong>${l.day}일차는 내일 열려요. 오늘 배운 걸 아래 복습 퀴즈로 한 번 더 다져 보세요.</div>`}
          </div>
        </section>`;
    }

    app.innerHTML = `
      <div class="stack-lg">
        ${todayCard}
        <section class="stack" aria-labelledby="sheet-title">
          <div class="section-head">
            <h2 id="sheet-title">진도표</h2>
            <div class="stats"><span><b>${n}</b>/ ${TOTAL} 완료</span><span><b>${streak()}</b>일 연속</span><span><b>${state.log.length}</b>일 공부함</span></div>
          </div>
          ${sheetHTML()}
        </section>
        <section class="stack" id="review-slot" hidden aria-labelledby="review-title"></section>
        <section class="panel stack" aria-labelledby="set-title">
          <h3 id="set-title">학습 설정</h3>
          <label class="setting" for="one-a-day">
            <input type="checkbox" id="one-a-day" ${state.oneADay ? "checked" : ""}>
            <span><b>하루에 한 레슨씩 열기</b><br><span class="muted">켜 두면 레슨을 마친 다음 날 새 레슨이 열려요. 끄면 바로 다음 레슨으로 넘어갈 수 있어요.</span></span>
          </label>
          <div class="row"><button type="button" class="btn-quiet btn-danger" id="reset-btn">학습 기록 초기화</button><span class="muted" id="reset-note"></span></div>
        </section>
      </div>`;

    // 복습 퀴즈: 이미 끝낸 레슨 중 하나
    const doneDays = Object.keys(state.done).map(Number);
    if (doneDays.length) {
      const pick = doneDays[Math.floor(Math.random() * doneDays.length)];
      const l = lessonOf(pick);
      const slot = document.getElementById("review-slot");
      slot.hidden = false;
      slot.innerHTML = `
        <div class="section-head"><h2 id="review-title">복습 한 입</h2><a href="#day-${pick}">${pick}일차 · ${esc(l.title)} 다시 보기</a></div>
        <div class="panel"></div>`;
      slot.querySelector(".panel").appendChild(makeQuiz(l.quiz, "review"));
    }

    document.getElementById("one-a-day").addEventListener("change", (e) => {
      state.oneADay = e.target.checked;
      save();
      renderHome();
    });
    let armed = null;
    const resetBtn = document.getElementById("reset-btn");
    resetBtn.addEventListener("click", () => {
      const note = document.getElementById("reset-note");
      if (!armed) {
        resetBtn.textContent = "한 번 더 누르면 모두 지워져요";
        note.textContent = "진도·연속 기록·작성한 코드가 삭제돼요.";
        armed = setTimeout(() => { armed = null; resetBtn.textContent = "학습 기록 초기화"; note.textContent = ""; }, 4000);
        return;
      }
      clearTimeout(armed);
      state = freshState();
      save();
      renderHome();
    });
  }

  function renderCourse() {
    setNav("course");
    const nd = nextDay();
    app.innerHTML = `
      <div class="stack-lg">
        <div class="stack">
          <p class="eyebrow">30일 코스</p>
          <h1>전체 과정</h1>
          <p class="muted">하루에 한 레슨, 5~8분. 레슨마다 핵심 3줄을 읽고, 예제를 실행해 보고, 퀴즈와 실습 하나로 마무리해요.</p>
        </div>
        ${WEEKS.map((w) => `
          <section class="week" aria-labelledby="week-${w.n}">
            <h2 id="week-${w.n}">${w.n}주차 · ${esc(w.name)}</h2>
            <ul class="lesson-list">
              ${LESSONS.filter((l) => l.day >= w.from && l.day <= w.to).map((l) => {
                const open = isOpen(l.day);
                const pill = isDone(l.day) ? `<span class="pill done">완료</span>`
                  : l.day === nd && open ? `<span class="pill now">오늘</span>`
                  : open ? `<span class="pill">열림</span>` : `<span class="pill">잠김</span>`;
                return `<li><a class="lesson-row${open ? "" : " locked"}" href="#day-${l.day}"${open ? "" : ' tabindex="-1" aria-disabled="true"'}>
                  <span class="l-day">Day ${String(l.day).padStart(2, "0")}</span>
                  <div><span class="l-title">${esc(l.title)}</span><span class="l-sum">${esc(l.summary)}</span></div>
                  ${pill}</a></li>`;
              }).join("")}
            </ul>
          </section>`).join("")}
      </div>`;
  }

  function renderLocked(day) {
    setNav("");
    const l = lessonOf(day);
    const prevDone = state.done[day - 1];
    const why = prevDone
      ? `${day - 1}일차를 오늘 마쳤어요. ${day}일차는 내일 열려요. 바로 하고 싶다면 홈의 학습 설정에서 '하루에 한 레슨씩 열기'를 끄세요.`
      : `먼저 ${day - 1}일차를 마쳐야 열려요.`;
    app.innerHTML = `
      <div class="stack locked-box">
        <p class="eyebrow">${day}일차 · 잠김</p>
        <h1>${esc(l.title)}</h1>
        <p>${esc(why)}</p>
        <div class="row"><a class="btn" href="#">홈으로</a><a class="btn btn-line" href="#course">전체 과정</a></div>
      </div>`;
  }

  function renderLesson(day) {
    if (!isOpen(day)) return renderLocked(day);
    setNav("");
    const l = lessonOf(day);
    const w = weekOf(day);
    const progress = { quiz: Boolean(state.quiz[day]) || isDone(day), task: isDone(day), peek: false };

    app.innerHTML = `
      <article class="stack-lg">
        <div class="lesson-head">
          <div class="crumbs"><a href="#course">전체 과정</a><span aria-hidden="true">/</span><span>${w.n}주차 ${esc(w.name)}</span></div>
          <p class="eyebrow">${day}일차 · 약 ${l.minutes}분</p>
          <h1>${esc(l.title)}</h1>
          <p class="muted">${esc(l.summary)}</p>
        </div>

        <section class="keybox" aria-labelledby="keys-title">
          <h2 id="keys-title" class="step-title"><span class="s-num">1</span>오늘의 핵심 3줄</h2>
          ${keysHTML(l.keys)}
        </section>

        <section class="stack" aria-labelledby="ex-title">
          <h2 id="ex-title" class="step-title"><span class="s-num">2</span>직접 실행해 보기</h2>
          <p class="engine-note" data-engine></p>
          <div class="prose" id="body"></div>
        </section>

        <section class="stack" aria-labelledby="quiz-title">
          <h2 id="quiz-title" class="step-title"><span class="s-num">3</span>확인 퀴즈</h2>
          <div id="quiz-slot"></div>
        </section>

        <section class="stack" aria-labelledby="task-title">
          <h2 id="task-title" class="step-title"><span class="s-num">4</span>실습</h2>
          <div class="task-prompt">${md(l.task.prompt)}</div>
          <div id="task-slot" class="stack"></div>
        </section>

        <section class="finish" id="finish" aria-live="polite"></section>

        <nav class="pager" aria-label="레슨 이동">
          ${day > 1 ? `<a class="btn-quiet" href="#day-${day - 1}">← ${day - 1}일차</a>` : "<span></span>"}
          ${day < TOTAL && isOpen(day + 1) ? `<a class="btn-quiet" href="#day-${day + 1}">${day + 1}일차 →</a>` : ""}
        </nav>
      </article>`;
    app.querySelectorAll("[data-engine]").forEach(syncEngineUI);

    // 본문
    const body = document.getElementById("body");
    let exN = 0;
    l.body.forEach((b) => {
      if (b.t === "p") body.appendChild(h(`<p>${md(b.s)}</p>`));
      else {
        exN++;
        body.appendChild(makeEditor({ id: `ex-${day}-${exN}`, code: b.code, stdin: b.stdin, label: `예제 ${exN}.py` }).el);
      }
    });

    // 퀴즈
    const quizEl = makeQuiz(l.quiz, `q${day}`, () => {
      progress.quiz = true;
      state.quiz[day] = true;
      save();
      renderFinish();
    });
    document.getElementById("quiz-slot").appendChild(quizEl);
    if (progress.quiz && isDone(day)) {
      const fb = quizEl.querySelector(".feedback");
      fb.hidden = false;
      fb.className = "feedback ok";
      fb.innerHTML = `<strong>지난번에 맞혔어요.</strong>${md(l.quiz.explain)} (정답: ${"ABCD"[l.quiz.answer]})`;
    }

    // 실습
    const slot = document.getElementById("task-slot");
    let saveTimer = null;
    const editor = makeEditor({
      id: `task-${day}`,
      code: state.code[day] !== undefined ? state.code[day] : l.task.starter,
      original: l.task.starter,
      stdin: l.task.stdin,
      label: `실습-${day}.py`,
      onChange: (v) => {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => { state.code[day] = v; save(); }, 400);
      },
    });
    slot.appendChild(editor.el);
    const controls = h(`
      <div class="stack">
        <div class="row">
          <button type="button" class="btn" id="check-btn" data-engine>채점하기</button>
          <button type="button" class="btn-quiet" id="hint-btn">힌트</button>
          <button type="button" class="btn-quiet" id="sol-btn">정답 보기</button>
        </div>
        <div class="feedback" id="task-fb" hidden aria-live="polite"></div>
        <div class="reveal" id="hint-box" hidden><b>힌트</b><p>${md(l.task.hint)}</p></div>
        <div class="reveal" id="sol-box" hidden><b>예시 정답</b><pre class="snippet"><code>${esc(l.task.solution)}</code></pre>
          <div class="row"><button type="button" class="btn-quiet" id="use-sol">편집기에 넣기</button></div></div>
      </div>`);
    slot.appendChild(controls);
    controls.querySelectorAll(".snippet code").forEach((c) => { c.style.background = "none"; c.style.padding = "0"; });
    const checkBtn = controls.querySelector("#check-btn");
    syncEngineUI(checkBtn);
    const fb = controls.querySelector("#task-fb");

    checkBtn.addEventListener("click", async () => {
      checkBtn.disabled = true;
      const res = await editor.run();
      checkBtn.disabled = !engine.ready;
      fb.hidden = false;
      if (res.error) {
        fb.className = "feedback no";
        fb.innerHTML = `<strong>오류가 났어요.</strong>실행 결과의 빨간 메시지와 도움말을 확인해 보세요.`;
        return;
      }
      if (normalize(res.out) !== normalize(l.task.expect)) {
        fb.className = "feedback no";
        fb.innerHTML = `<strong>결과가 달라요.</strong>기대한 출력:<pre class="snippet" style="margin-top:.4rem"><code>${esc(l.task.expect)}</code></pre>`;
        fb.querySelectorAll(".snippet code").forEach((c) => { c.style.background = "none"; c.style.padding = "0"; });
        return;
      }
      const missing = (l.task.need || []).filter((k) => !editor.code.includes(k));
      if (missing.length) {
        fb.className = "feedback no";
        fb.innerHTML = `<strong>결과는 맞았어요!</strong>이번에는 ${missing.map((m) => `<code>${esc(m)}</code>`).join(", ")}을(를) 써서 풀어 보세요.`;
        return;
      }
      fb.className = "feedback ok";
      fb.innerHTML = `<strong>통과!</strong>출력이 정확히 맞았어요.`;
      progress.task = true;
      renderFinish();
    });
    controls.querySelector("#hint-btn").addEventListener("click", () => {
      const box = controls.querySelector("#hint-box");
      box.hidden = !box.hidden;
    });
    controls.querySelector("#sol-btn").addEventListener("click", () => {
      const box = controls.querySelector("#sol-box");
      box.hidden = !box.hidden;
      if (!box.hidden) { progress.peek = true; renderFinish(); }
    });
    controls.querySelector("#use-sol").addEventListener("click", () => { editor.code = l.task.solution; });

    // 완료
    function renderFinish() {
      const box = document.getElementById("finish");
      if (isDone(day)) {
        const nd = nextDay();
        const nextOpen = nd !== null && isOpen(nd);
        box.innerHTML = `
          <div class="stamp-big">${day}일차 완료</div>
          <p>${state.done[day] === today() ? `오늘의 한 입을 마쳤어요. 연속 학습 <b>${streak()}일</b>째예요.` : `${esc(state.done[day])}에 완료한 레슨이에요. 복습은 언제든 좋아요.`}</p>
          ${nd === null ? `<p>30일 코스를 모두 마쳤어요. 정말 수고했어요!</p>`
            : nextOpen ? `<div class="row"><a class="btn" href="#day-${nd}">${nd}일차로 가기</a><a class="btn btn-line" href="#">홈으로</a></div>`
            : `<p class="muted">${nd}일차는 내일 열려요. 내일 다시 만나요.</p><div class="row"><a class="btn btn-line" href="#">홈으로</a></div>`}`;
        return;
      }
      const taskOk = progress.task || progress.peek;
      const ready = progress.quiz && taskOk;
      box.innerHTML = `
        <h2 class="step-title"><span class="s-num">5</span>오늘의 한 입 마치기</h2>
        <ul class="checklist">
          <li class="${progress.quiz ? "ok" : ""}">퀴즈 맞히기</li>
          <li class="${taskOk ? "ok" : ""}">실습 통과하기${progress.peek && !progress.task ? " (정답 확인함)" : ""}</li>
        </ul>
        <div class="row"><button type="button" class="btn" id="done-btn" ${ready ? "" : "disabled"}>${day}일차 완료하기</button>
        ${ready ? "" : `<span class="muted">퀴즈와 실습을 마치면 눌러요.</span>`}</div>`;
      const btn = box.querySelector("#done-btn");
      btn.addEventListener("click", () => {
        const t = today();
        state.done[day] = t;
        if (!state.log.includes(t)) state.log.push(t);
        save();
        setNav("");
        renderFinish();
        const pager = app.querySelector(".pager");
        if (pager && day < TOTAL && isOpen(day + 1) && !pager.querySelector(`[href="#day-${day + 1}"]`)) {
          pager.appendChild(h(`<a class="btn-quiet" href="#day-${day + 1}">${day + 1}일차 →</a>`));
        }
      });
    }
    renderFinish();
  }

  /* ---------------- router ---------------- */
  function route() {
    const hash = location.hash.slice(1);
    const m = /^day-(\d+)$/.exec(hash);
    if (m && Number(m[1]) >= 1 && Number(m[1]) <= TOTAL) renderLesson(Number(m[1]));
    else if (hash === "course") renderCourse();
    else renderHome();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  route();
  bootEngine();
})();
