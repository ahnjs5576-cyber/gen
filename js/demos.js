/* 자료구조 한 입 — 레슨별 인터랙티브 데모
 * 각 데모는 root 요소 하나를 받아 그 안에 UI를 그린다.
 * 패턴: 컨트롤은 한 번만 그리고(입력 포커스 유지), stage와 log만 다시 그린다.
 */
(function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const rand = () => 10 + Math.floor(Math.random() * 90);
  const reduceMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STEP_MS = () => (reduceMotion() ? 250 : 600);

  function shell(root, controls, hint) {
    root.innerHTML =
      `<div class="demo-stage" aria-live="polite"></div>` +
      `<div class="demo-ctl">${controls}</div>` +
      `<p class="demo-log">${hint || ""}</p>`;
    return {
      stage: root.querySelector(".demo-stage"),
      log: (html) => (root.querySelector(".demo-log").innerHTML = html),
      ctl: root.querySelector(".demo-ctl")
    };
  }
  const btn = (act, label, cls) => `<button type="button" class="btn ${cls || "btn-ghost"}" data-act="${act}">${label}</button>`;
  function onAct(root, map) {
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (b && map[b.dataset.act]) map[b.dataset.act](b);
    });
  }
  function onEnter(input, fn) {
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); fn(); } });
  }
  function cells(arr, opts) {
    opts = opts || {};
    return `<div class="cells ${opts.vertical ? "is-vertical" : ""}">` + arr.map((v, i) => {
      const cls = ["cell"];
      if (opts.hi && opts.hi.includes(i)) cls.push("is-hi");
      if (opts.dim && opts.dim.includes(i)) cls.push("is-dim");
      if (v === null || v === undefined) cls.push("is-empty");
      const top = opts.top ? `<span class="cell-top">${esc(opts.top(i))}</span>` : "";
      const bot = opts.bottom ? `<span class="cell-bot">${esc(opts.bottom(i))}</span>` : "";
      return `<div class="${cls.join(" ")}">${top}<span class="cell-v">${v === null || v === undefined ? "" : esc(v)}</span>${bot}</div>`;
    }).join("") + `</div>`;
  }

  /* ---------- 트리 SVG (중위 순서로 x, 깊이로 y) ---------- */
  function treeSVG(root, o) {
    o = o || {};
    const nodes = [];
    let x = 0, maxD = 0;
    (function walk(n, d) {
      if (!n) return;
      walk(n.l, d + 1);
      n._x = x++; n._d = d; maxD = Math.max(maxD, d);
      nodes.push(n);
      walk(n.r, d + 1);
    })(root, 0);
    if (!nodes.length) return `<p class="demo-empty">비어 있어요</p>`;
    const GX = 46, GY = 58, R = 17, PAD = 24;
    const W = Math.max(1, x) * GX + PAD, H = (maxD + 1) * GY + 10;
    const px = (n) => PAD / 2 + n._x * GX + GX / 2, py = (n) => 26 + n._d * GY;
    let edges = "", circles = "";
    nodes.forEach((n) => {
      [n.l, n.r].forEach((c) => {
        if (c) {
          const on = o.path && o.path.includes(n.id) && o.path.includes(c.id);
          edges += `<line class="t-edge${on ? " is-on" : ""}" x1="${px(n)}" y1="${py(n)}" x2="${px(c)}" y2="${py(c)}"/>`;
        }
      });
    });
    nodes.forEach((n) => {
      const cls = ["t-node"];
      if (o.path && o.path.includes(n.id)) cls.push("is-path");
      if (o.hi && o.hi.includes(n.id)) cls.push("is-hi");
      if (o.found === n.id) cls.push("is-found");
      const badge = o.badge && o.badge[n.id] !== undefined
        ? `<circle class="t-badge" cx="${px(n) + 14}" cy="${py(n) - 14}" r="9"/><text class="t-badge-t" x="${px(n) + 14}" y="${py(n) - 14}">${o.badge[n.id]}</text>` : "";
      const sub = o.sub ? `<text class="t-sub" x="${px(n)}" y="${py(n) + R + 12}">${esc(o.sub(n))}</text>` : "";
      circles += `<g class="${cls.join(" ")}"><circle cx="${px(n)}" cy="${py(n)}" r="${R}"/><text x="${px(n)}" y="${py(n)}">${esc(n.v)}</text>${badge}${sub}</g>`;
    });
    const h = H + (o.sub ? 14 : 0);
    return `<div class="svg-wrap"><svg viewBox="0 0 ${W} ${h}" width="${W}" height="${h}" role="img" aria-label="트리 그림">${edges}${circles}</svg></div>`;
  }
  const treeHeight = (n) => (n ? 1 + Math.max(treeHeight(n.l), treeHeight(n.r)) : 0);

  /* ---------- 그래프 (14, 15일차 공통) ---------- */
  const G = {
    pos: { A: [34, 84], B: [108, 30], C: [108, 138], D: [188, 30], E: [188, 138], F: [262, 84] },
    edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "E"], ["D", "F"], ["E", "F"]]
  };
  G.names = Object.keys(G.pos);
  G.adj = {};
  G.names.forEach((n) => (G.adj[n] = []));
  G.edges.forEach(([u, v]) => { G.adj[u].push(v); G.adj[v].push(u); });

  function graphSVG(o) {
    o = o || {};
    let s = "";
    G.edges.forEach(([u, v]) => {
      const on = o.edgeOn && o.edgeOn(u, v);
      const [x1, y1] = G.pos[u], [x2, y2] = G.pos[v];
      s += `<line class="t-edge${on ? " is-on" : ""}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    });
    G.names.forEach((n) => {
      const [x, y] = G.pos[n];
      const cls = ["t-node", "is-click"];
      if (o.cur === n) cls.push("is-found");
      else if (o.hi && o.hi.includes(n)) cls.push("is-hi");
      else if (o.path && o.path.includes(n)) cls.push("is-path");
      const badge = o.badge && o.badge[n] !== undefined
        ? `<circle class="t-badge" cx="${x + 15}" cy="${y - 15}" r="9"/><text class="t-badge-t" x="${x + 15}" y="${y - 15}">${o.badge[n]}</text>` : "";
      s += `<g class="${cls.join(" ")}" data-node="${n}" tabindex="0" role="button" aria-label="정점 ${n}"><circle cx="${x}" cy="${y}" r="18"/><text x="${x}" y="${y}">${n}</text>${badge}</g>`;
    });
    return `<div class="svg-wrap"><svg viewBox="0 0 296 168" width="296" height="168" role="img" aria-label="그래프 그림">${s}</svg></div>`;
  }

  const D = {};

  /* 1. 빅오 성장 비교 */
  D.growth = function (root) {
    root.innerHTML = `
      <div class="demo-ctl demo-ctl-col">
        <label class="lbl" for="growth-n">데이터 개수 n = <b class="mono" id="growth-nv"></b></label>
        <input id="growth-n" type="range" min="1" max="6" step="0.01" value="3">
      </div>
      <div class="demo-stage"></div>
      <p class="demo-log">막대 길이는 로그 눈금이에요. 한 칸 차이가 10배 차이입니다.</p>`;
    const stage = root.querySelector(".demo-stage"), inp = root.querySelector("#growth-n"), nv = root.querySelector("#growth-nv");
    const fns = [
      ["O(1)", () => 1, "c-fast"],
      ["O(log n)", (n) => Math.max(1, Math.log2(n)), "c-log"],
      ["O(n)", (n) => n, "c-lin"],
      ["O(n log n)", (n) => n * Math.max(1, Math.log2(n)), "c-nlog"],
      ["O(n²)", (n) => n * n, "c-sq"]
    ];
    const fmt = (v) => v >= 1e12 ? (v / 1e12).toFixed(1) + "조" : v >= 1e8 ? (v / 1e8).toFixed(1) + "억" : v >= 1e4 ? (v / 1e4).toFixed(1) + "만" : Math.round(v).toLocaleString("ko-KR");
    function draw() {
      const n = Math.round(Math.pow(10, Number(inp.value)));
      nv.textContent = n.toLocaleString("ko-KR");
      stage.innerHTML = `<div class="bars">` + fns.map(([name, f, c]) => {
        const v = f(n), w = Math.max(2, (Math.log10(v + 1) / 12) * 100);
        return `<div class="bar-row"><span class="mono bar-name">${name}</span><span class="bar-track"><span class="bar ${c}" style="width:${w.toFixed(1)}%"></span></span><span class="mono bar-val">${fmt(v)}번</span></div>`;
      }).join("") + `</div>`;
    }
    inp.addEventListener("input", draw);
    draw();
  };

  /* 2. 배열: 주소 계산과 밀기 */
  D.array = function (root) {
    let arr = [90, 72, 85, 64, 98];
    const CAP = 9;
    const ui = shell(root,
      `<label class="lbl" for="arr-i">i =</label><input id="arr-i" class="inp inp-num" type="number" min="0" value="2">` +
      btn("read", "arr[i] 읽기", "btn-primary") + btn("front", "맨 앞에 넣기") + btn("reset", "처음으로"),
      "칸 아래 숫자가 메모리 주소예요. 시작 주소 1000, 칸 하나 4바이트.");
    const iInp = root.querySelector("#arr-i");
    function draw(hi, dim) {
      const view = arr.concat(Array(CAP - arr.length).fill(null));
      ui.stage.innerHTML = cells(view, { hi: hi || [], dim: dim || [], top: (i) => `[${i}]`, bottom: (i) => 1000 + i * 4 });
    }
    const read = () => {
      const i = Number(iInp.value);
      if (!Number.isInteger(i) || i < 0 || i >= arr.length) { ui.log(`i는 0부터 ${arr.length - 1} 사이여야 해요. 범위를 벗어나면 IndexError예요.`); draw(); return; }
      draw([i]);
      ui.log(`주소 = 1000 + ${i} × 4 = <b>${1000 + i * 4}</b>. 계산 한 번으로 바로 도착, <span class="cx c-fast">O(1)</span>`);
    };
    onEnter(iInp, read);
    onAct(root, {
      read,
      front: () => {
        if (arr.length >= CAP) { ui.log("칸이 꽉 찼어요. '처음으로'를 눌러 비워 주세요."); return; }
        const moved = arr.length;
        arr = [rand()].concat(arr);
        draw([0], []);
        ui.log(`새 값을 0번에 넣으려고 기존 원소 <b>${moved}개</b>를 한 칸씩 뒤로 밀었어요. <span class="cx c-lin">O(n)</span>`);
      },
      reset: () => { arr = [90, 72, 85, 64, 98]; draw(); ui.log("처음 상태로 돌아왔어요."); }
    });
    draw();
  };

  /* 3. 동적 배열: 용량 두 배 */
  D.dynarray = function (root) {
    let size = 0, cap = 1, data = [null], copies = 0, appends = 0;
    const ui = shell(root, btn("add", "append", "btn-primary") + btn("add5", "append × 5") + btn("reset", "처음으로"),
      "빈 칸은 확보만 해 둔 용량이에요. 꽉 찬 상태에서 append해 보세요.");
    function draw(hi) {
      ui.stage.innerHTML = cells(data, { hi: hi || [], top: (i) => `[${i}]` }) +
        `<dl class="stats"><div><dt>크기</dt><dd class="mono">${size}</dd></div><div><dt>용량</dt><dd class="mono">${cap}</dd></div>` +
        `<div><dt>총 복사</dt><dd class="mono">${copies}</dd></div><div><dt>append당 평균 복사</dt><dd class="mono">${appends ? (copies / appends).toFixed(2) : "0"}</dd></div></dl>`;
    }
    function append() {
      let msg;
      if (size === cap) {
        if (cap >= 32) { ui.log("데모는 용량 32까지만 보여 줘요. '처음으로'를 눌러 다시 해 보세요."); return false; }
        copies += size;
        msg = `꽉 찼어요! 용량 ${cap} → <b>${cap * 2}</b>, 원소 ${size}개를 복사했어요. <span class="cx c-lin">O(n)</span>`;
        cap *= 2;
        data = data.concat(Array(cap - data.length).fill(null));
      } else {
        msg = `빈 칸에 바로 넣었어요. <span class="cx c-fast">O(1)</span>`;
      }
      data[size] = rand(); size++; appends++;
      draw([size - 1]);
      ui.log(msg);
      return true;
    }
    onAct(root, {
      add: append,
      add5: () => { for (let k = 0; k < 5; k++) if (!append()) break; ui.log(`다섯 번 넣었어요. 평균 복사 횟수가 1 근처에 머무는 게 보이나요? 이게 분할 상환 O(1)이에요.`); },
      reset: () => { size = 0; cap = 1; data = [null]; copies = 0; appends = 0; draw(); ui.log("처음 상태로 돌아왔어요."); }
    });
    draw();
  };

  /* 4. 연결 리스트 */
  D.linked = function (root) {
    let list = [12, 7, 33];
    let busy = false;
    const ui = shell(root,
      btn("head", "앞에 추가", "btn-primary") + btn("tail", "뒤에 추가") + btn("del", "앞에서 삭제") +
      `<span class="ctl-group"><label class="lbl" for="ll-q">찾을 값</label><input id="ll-q" class="inp inp-num" type="number" value="33">` + btn("find", "찾기") + `</span>`,
      "head에서 시작해 화살표(next)를 따라가요.");
    const q = root.querySelector("#ll-q");
    function draw(hi, found) {
      if (!list.length) { ui.stage.innerHTML = `<div class="chain"><span class="chain-head mono">head</span><span class="arrow">→</span><span class="mono null">None</span></div>`; return; }
      ui.stage.innerHTML = `<div class="chain"><span class="chain-head mono">head</span><span class="arrow">→</span>` +
        list.map((v, i) => `<span class="node${hi === i ? " is-hi" : ""}${found === i ? " is-found" : ""}"><span class="node-v">${v}</span><span class="node-p mono">next</span></span><span class="arrow">→</span>`).join("") +
        `<span class="mono null">None</span></div>`;
    }
    const find = () => {
      if (busy) return;
      const target = Number(q.value);
      busy = true;
      let i = 0;
      const step = () => {
        if (i >= list.length) { draw(); ui.log(`끝(None)까지 ${list.length}칸을 다 봤지만 ${target}은 없어요. <span class="cx c-lin">O(n)</span>`); busy = false; return; }
        if (list[i] === target) { draw(null, i); ui.log(`${i + 1}번째 노드에서 찾았어요. head부터 ${i + 1}칸 따라왔어요.`); busy = false; return; }
        draw(i); ui.log(`${list[i]} ≠ ${target}, next로 이동…`);
        i++; setTimeout(step, STEP_MS());
      };
      step();
    };
    onEnter(q, find);
    onAct(root, {
      head: () => { if (busy) return; if (list.length >= 7) { ui.log("데모는 노드 7개까지예요. 먼저 삭제해 주세요."); return; } list.unshift(rand()); draw(null, 0); ui.log(`새 노드의 next를 기존 head로 잇고, head를 새 노드로 바꿨어요. <span class="cx c-fast">O(1)</span>`); },
      tail: () => { if (busy) return; if (list.length >= 7) { ui.log("데모는 노드 7개까지예요. 먼저 삭제해 주세요."); return; } const n = list.length; list.push(rand()); draw(null, n); ui.log(`tail 포인터가 없어서 끝을 찾느라 ${n}칸을 따라갔어요. <span class="cx c-lin">O(n)</span>`); },
      del: () => { if (busy) return; if (!list.length) { ui.log("지울 노드가 없어요."); return; } const v = list.shift(); draw(); ui.log(`head를 다음 노드로 옮기면 ${v}는 빠져요. <span class="cx c-fast">O(1)</span>`); },
      find
    });
    draw();
  };

  /* 5~7. 스택 · 큐 · 덱 */
  function seqDemo(root, kind) {
    let seq = kind === "stack" ? [14, 27] : [14, 27, 35];
    const MAX = 7;
    const conf = {
      stack: { ctl: btn("push", "push", "btn-primary") + btn("pop", "pop") + btn("peek", "peek"), hint: "위쪽이 top이에요. 넣고 빼는 곳이 한 군데뿐이에요." },
      queue: { ctl: btn("enq", "enqueue", "btn-primary") + btn("deq", "dequeue") + btn("front", "front 보기"), hint: "왼쪽이 front(나가는 곳), 오른쪽이 rear(들어오는 곳)예요." },
      deque: { ctl: btn("pushL", "appendleft", "btn-primary") + btn("pushR", "append", "btn-primary") + btn("popL", "popleft") + btn("popR", "pop"), hint: "양쪽 끝 어디서든 넣고 뺄 수 있어요." }
    }[kind];
    const ui = shell(root, conf.ctl, conf.hint);
    function draw(hi) {
      if (kind === "stack") {
        const view = seq.slice().reverse();
        ui.stage.innerHTML = `<div class="stack-wrap">${cells(view.length ? view : [null], { vertical: true, hi: hi === "top" && view.length ? [0] : [], top: (i) => (i === 0 && view.length ? "top" : "") })}</div>`;
      } else {
        const last = seq.length - 1;
        const label = (i) => (i === 0 ? "front" : i === last ? "rear" : "");
        ui.stage.innerHTML = cells(seq.length ? seq : [null], { hi: hi === "front" ? [0] : hi === "rear" ? [last] : [], top: seq.length ? label : () => "" });
      }
    }
    const full = () => { if (seq.length >= MAX) { ui.log(`데모는 ${MAX}칸까지예요. 먼저 빼 주세요.`); return true; } return false; };
    const empty = (what) => { if (!seq.length) { ui.log(`비어 있어서 ${what}할 수 없어요. 실제 코드에선 오류가 나요.`); draw(); return true; } return false; };
    const O1 = `<span class="cx c-fast">O(1)</span>`;
    onAct(root, {
      push: () => { if (full()) return; const v = rand(); seq.push(v); draw("top"); ui.log(`push(${v}) → 맨 위에 올렸어요. ${O1}`); },
      pop: () => { if (kind === "stack") { if (empty("pop")) return; const v = seq.pop(); draw(); ui.log(`pop() → <b>${v}</b>. 가장 나중에 넣은 값이 먼저 나와요. ${O1}`); } else { if (empty("pop")) return; const v = seq.pop(); draw(); ui.log(`pop() → 뒤에서 <b>${v}</b>를 뺐어요. ${O1}`); } },
      peek: () => { if (empty("peek")) return; draw("top"); ui.log(`peek() → ${seq[seq.length - 1]}. 꺼내지 않고 보기만 해요. ${O1}`); },
      enq: () => { if (full()) return; const v = rand(); seq.push(v); draw("rear"); ui.log(`enqueue(${v}) → 줄 맨 뒤에 섰어요. ${O1}`); },
      deq: () => { if (empty("dequeue")) return; const v = seq.shift(); draw(); ui.log(`dequeue() → <b>${v}</b>. 가장 먼저 온 값이 먼저 나가요. ${O1}`); },
      front: () => { if (empty("확인")) return; draw("front"); ui.log(`front → ${seq[0]}. 다음에 나갈 값이에요.`); },
      pushL: () => { if (full()) return; const v = rand(); seq.unshift(v); draw("front"); ui.log(`appendleft(${v}) → 앞에 넣었어요. ${O1}`); },
      pushR: () => { if (full()) return; const v = rand(); seq.push(v); draw("rear"); ui.log(`append(${v}) → 뒤에 넣었어요. ${O1}`); },
      popL: () => { if (empty("popleft")) return; const v = seq.shift(); draw(); ui.log(`popleft() → 앞에서 <b>${v}</b>를 뺐어요. ${O1}`); },
      popR: () => { if (empty("pop")) return; const v = seq.pop(); draw(); ui.log(`pop() → 뒤에서 <b>${v}</b>를 뺐어요. ${O1}`); }
    });
    draw();
  }
  D.stack = (r) => seqDemo(r, "stack");
  D.queue = (r) => seqDemo(r, "queue");
  D.deque = (r) => seqDemo(r, "deque");

  /* 8. 해시 테이블 (체이닝) */
  D.hash = function (root) {
    const M = 7;
    const hashOf = (s) => { let t = 0; for (const ch of s) t = t * 31 + ch.codePointAt(0); return t; };
    let buckets;
    const seed = () => { buckets = Array.from({ length: M }, () => []); ["사과", "딸기", "수박", "귤"].forEach((w) => buckets[hashOf(w) % M].push(w)); };
    seed();
    const ui = shell(root,
      `<label class="lbl" for="hash-k">키</label><input id="hash-k" class="inp" type="text" maxlength="6" value="포도" autocomplete="off">` +
      btn("put", "넣기", "btn-primary") + btn("get", "찾기") + btn("reset", "처음으로"),
      "해시 함수: 글자 코드를 h = h × 31 + 코드로 섞어 큰 수를 만든 뒤, 칸 수 7로 나눈 나머지를 칸 번호로 써요. '포도'를 넣어 보세요.");
    const k = root.querySelector("#hash-k");
    function draw(hiB, hiW) {
      ui.stage.innerHTML = `<div class="buckets">` + buckets.map((b, i) =>
        `<div class="bucket${hiB === i ? " is-hi" : ""}"><span class="bucket-i mono">${i}</span><span class="bucket-chain">${b.length ? b.map((w) => `<span class="chip${hiW === w && hiB === i ? " is-found" : ""}">${esc(w)}</span>`).join(`<span class="arrow">→</span>`) : `<span class="null mono">비어 있음</span>`}</span></div>`).join("") + `</div>`;
    }
    const explain = (w) => { const h = hashOf(w); return `'${esc(w)}' → 해시값 ${h} → ${h} % 7 = <b>${h % M}번 칸</b>`; };
    const put = () => {
      const w = k.value.trim();
      if (!w) { ui.log("키를 입력해 주세요."); return; }
      const i = hashOf(w) % M;
      if (buckets[i].includes(w)) { draw(i, w); ui.log(`${explain(w)}. 이미 있는 키예요.`); return; }
      if (buckets.reduce((a, b) => a + b.length, 0) >= 14) { ui.log("데모는 키 14개까지예요. '처음으로'를 눌러 주세요."); return; }
      const collide = buckets[i].length > 0;
      buckets[i].push(w);
      draw(i, w);
      ui.log(`${explain(w)}.` + (collide ? ` 이미 다른 키가 있어서 <b>충돌</b>! 같은 칸에 이어 달았어요(체이닝).` : ` 빈 칸이라 바로 넣었어요. <span class="cx c-fast">O(1)</span>`));
    };
    const get = () => {
      const w = k.value.trim();
      if (!w) { ui.log("키를 입력해 주세요."); return; }
      const i = hashOf(w) % M;
      const hit = buckets[i].includes(w);
      draw(i, hit ? w : null);
      ui.log(`${explain(w)}. 그 칸만 보면 돼요. ` + (hit ? "찾았어요!" : "그 칸에 없으니 테이블에 없는 키예요."));
    };
    onEnter(k, put);
    onAct(root, { put, get, reset: () => { seed(); draw(); ui.log("처음 상태로 돌아왔어요."); } });
    draw();
  };

  /* 9. 트리 순회 */
  D.traverse = function (root) {
    const N = (v, l, r) => ({ v, id: v, l: l || null, r: r || null });
    const tree = N("F", N("B", N("A"), N("D", N("C"), N("E"))), N("G", null, N("I", N("H"))));
    const orders = {
      pre: [], ino: [], post: [], level: []
    };
    (function pre(n) { if (!n) return; orders.pre.push(n.id); pre(n.l); pre(n.r); })(tree);
    (function ino(n) { if (!n) return; ino(n.l); orders.ino.push(n.id); ino(n.r); })(tree);
    (function post(n) { if (!n) return; post(n.l); post(n.r); orders.post.push(n.id); })(tree);
    (function () { const q = [tree]; while (q.length) { const n = q.shift(); orders.level.push(n.id); if (n.l) q.push(n.l); if (n.r) q.push(n.r); } })();
    const names = { pre: "전위 (나→왼→오)", ino: "중위 (왼→나→오)", post: "후위 (왼→오→나)", level: "레벨 (위층부터)" };
    let timer = null;
    const ui = shell(root, btn("pre", "전위") + btn("ino", "중위", "btn-primary") + btn("post", "후위") + btn("level", "레벨"),
      "버튼을 누르면 방문 순서대로 번호가 붙어요.");
    function draw(badge, cur) { ui.stage.innerHTML = treeSVG(tree, { badge, found: cur }); }
    function play(kind) {
      clearTimeout(timer);
      const ord = orders[kind];
      let k = 0;
      const badge = {};
      const tick = () => {
        if (k >= ord.length) { draw(badge); ui.log(`${names[kind]}: <b class="mono">${ord.join(" → ")}</b>`); return; }
        badge[ord[k]] = k + 1;
        draw(badge, ord[k]);
        ui.log(`${names[kind]}: <span class="mono">${ord.slice(0, k + 1).join(" → ")}</span>`);
        k++;
        timer = setTimeout(tick, STEP_MS());
      };
      tick();
    }
    onAct(root, { pre: () => play("pre"), ino: () => play("ino"), post: () => play("post"), level: () => play("level") });
    draw({});
  };

  /* 10. 이진 탐색 트리 */
  D.bst = function (root) {
    let tree = null;
    const ins = (n, v) => { if (!n) return { v, id: v, l: null, r: null }; if (v < n.v) n.l = ins(n.l, v); else if (v > n.v) n.r = ins(n.r, v); return n; };
    const has = (n, v) => { while (n) { if (n.v === v) return true; n = v < n.v ? n.l : n.r; } return false; };
    const pathTo = (v) => { const p = []; let n = tree; while (n) { p.push(n.id); if (n.v === v) break; n = v < n.v ? n.l : n.r; } return p; };
    const count = (n) => (n ? 1 + count(n.l) + count(n.r) : 0);
    const seed = () => { tree = null; [50, 30, 70, 20, 40, 60, 80].forEach((v) => (tree = ins(tree, v))); };
    seed();
    const ui = shell(root,
      `<label class="lbl" for="bst-v">값</label><input id="bst-v" class="inp inp-num" type="number" value="45">` +
      btn("ins", "넣기", "btn-primary") + btn("find", "찾기") + btn("skew", "정렬된 값 넣기") + btn("reset", "처음으로"),
      "작으면 왼쪽, 크면 오른쪽. 지나간 길이 표시돼요.");
    const vin = root.querySelector("#bst-v");
    function draw(o) { ui.stage.innerHTML = treeSVG(tree, o || {}) + `<p class="stage-note mono">노드 ${count(tree)}개 · 높이 ${treeHeight(tree)}</p>`; }
    const getV = () => { const v = Number(vin.value); if (!Number.isInteger(v) || v < 0 || v > 999) { ui.log("0~999 사이의 정수를 넣어 주세요."); return null; } return v; };
    const insert = () => {
      const v = getV(); if (v === null) return;
      if (has(tree, v)) { const p = pathTo(v); draw({ path: p, found: v }); ui.log(`${v}는 이미 있어요. 같은 값은 넣지 않았어요.`); return; }
      if (count(tree) >= 15) { ui.log("데모는 노드 15개까지예요. '처음으로'를 눌러 주세요."); return; }
      tree = ins(tree, v);
      const p = pathTo(v);
      draw({ path: p, found: v });
      ui.log(`${p.length - 1}번 비교하고 자리를 찾았어요: <span class="mono">${p.join(" → ")}</span>`);
    };
    onEnter(vin, insert);
    onAct(root, {
      ins: insert,
      find: () => {
        const v = getV(); if (v === null) return;
        const p = pathTo(v), hit = has(tree, v);
        draw({ path: p, found: hit ? v : undefined });
        ui.log(hit ? `${p.length}번 비교해서 찾았어요: <span class="mono">${p.join(" → ")}</span>` : `<span class="mono">${p.join(" → ")}</span> 다음이 비어 있어요. ${v}는 없어요.`);
      },
      skew: () => {
        tree = null;
        [10, 20, 30, 40, 50, 60, 70].forEach((v) => (tree = ins(tree, v)));
        draw();
        ui.log("10, 20, …, 70을 순서대로 넣었더니 오른쪽 일자가 됐어요. 높이 7, 검색이 <span class=\"cx c-lin\">O(n)</span>이 됩니다.");
      },
      reset: () => { seed(); draw(); ui.log("처음 상태로 돌아왔어요. 높이 3에 노드 7개, 균형이 잘 잡혀 있어요."); }
    });
    draw();
  };

  /* 11. 회전 */
  D.rotate = function (root) {
    const N = (v, l, r) => ({ v, id: v, l: l || null, r: r || null });
    let rotated = false;
    const ui = shell(root, btn("rot", "왼쪽으로 회전", "btn-primary"), "1, 2, 3을 순서대로 넣어 오른쪽으로 쏠린 BST예요.");
    function draw() {
      const t = rotated ? N(2, N(1), N(3)) : N(1, null, N(2, null, N(3)));
      ui.stage.innerHTML = treeSVG(t, { hi: [2] }) + `<p class="stage-note mono">높이 ${treeHeight(t)}</p>`;
      root.querySelector('[data-act="rot"]').textContent = rotated ? "되돌리기" : "왼쪽으로 회전";
    }
    onAct(root, {
      rot: () => {
        rotated = !rotated; draw();
        ui.log(rotated ? "2가 루트로 올라가고 1이 2의 왼쪽 자식으로 내려왔어요. 높이 3 → 2. 바꾼 포인터는 2개뿐이에요." : "쏠린 상태로 되돌렸어요.");
      }
    });
    draw();
  };

  /* 12. 힙 */
  D.heap = function (root) {
    let h;
    const seed = () => { h = [5, 12, 8, 20, 15, 30]; };
    seed();
    const ui = shell(root, btn("push", "push (무작위 값)", "btn-primary") + btn("pop", "최솟값 꺼내기") + btn("reset", "처음으로"),
      "트리와 아래 배열은 같은 데이터예요. i의 자식은 2i+1, 2i+2.");
    const build = (i) => (i < h.length ? { v: h[i], id: i, l: build(2 * i + 1), r: build(2 * i + 2) } : null);
    function draw(path, found) {
      ui.stage.innerHTML = treeSVG(build(0), { path: path || [], found, sub: (n) => `[${n.id}]` }) +
        cells(h, { hi: found !== undefined ? [found] : [], top: (i) => `[${i}]` });
    }
    onAct(root, {
      push: () => {
        if (h.length >= 15) { ui.log("데모는 15개까지예요. 꺼내거나 '처음으로'를 눌러 주세요."); return; }
        const v = 1 + Math.floor(Math.random() * 40);
        h.push(v);
        let i = h.length - 1; const path = [i]; let swaps = 0;
        while (i > 0) { const p = (i - 1) >> 1; if (h[p] <= h[i]) break; [h[p], h[i]] = [h[i], h[p]]; i = p; path.push(i); swaps++; }
        draw(path, i);
        ui.log(`${v}를 맨 끝에 넣고 부모와 ${swaps}번 자리를 바꿔 [${i}]에 멈췄어요. <span class="cx c-log">O(log n)</span>`);
      },
      pop: () => {
        if (!h.length) { ui.log("비어 있어요."); draw(); return; }
        const min = h[0], last = h.pop();
        let swaps = 0; const path = [0];
        if (h.length) {
          h[0] = last; let i = 0;
          for (;;) {
            const l = 2 * i + 1, r = l + 1; let m = i;
            if (l < h.length && h[l] < h[m]) m = l;
            if (r < h.length && h[r] < h[m]) m = r;
            if (m === i) break;
            [h[m], h[i]] = [h[i], h[m]]; i = m; path.push(i); swaps++;
          }
        }
        draw(path);
        ui.log(`최솟값 <b>${min}</b>을 꺼냈어요. 맨 끝 값(${last})을 루트로 옮기고 ${swaps}번 아래로 내렸어요. <span class="cx c-log">O(log n)</span>`);
      },
      reset: () => { seed(); draw(); ui.log("처음 상태로 돌아왔어요."); }
    });
    draw();
  };

  /* 13. 트라이 */
  D.trie = function (root) {
    let words;
    const seed = () => { words = ["가방", "가게", "가구", "가구점", "나무", "나비"]; };
    seed();
    const ui = shell(root,
      `<label class="lbl" for="trie-p">접두사</label><input id="trie-p" class="inp" type="text" maxlength="6" value="가구" autocomplete="off">` +
      btn("add", "단어로 추가") + btn("reset", "처음으로"),
      "입력하는 동안 접두사가 지나가는 길과 자동 완성 결과가 바로 보여요.");
    const p = root.querySelector("#trie-p");
    function buildTrie() {
      const t = {};
      words.forEach((w) => { let n = t; for (const ch of w) n = n[ch] = n[ch] || {}; n.$ = true; });
      return t;
    }
    function render(node, prefix, path, depth) {
      const keys = Object.keys(node).filter((k) => k !== "$").sort();
      if (!keys.length) return "";
      return `<ul class="trie">` + keys.map((ch) => {
        const full = prefix + ch;
        const onPath = path.startsWith(full) && path.length >= full.length && depth < path.length;
        const inSub = path && full.startsWith(path);
        const cls = ["trie-n"];
        if (onPath) cls.push("is-path");
        else if (inSub) cls.push("is-hi");
        const end = node[ch].$ ? `<span class="trie-end mono" title="단어 끝">$</span>` : "";
        return `<li><span class="${cls.join(" ")}">${esc(ch)}${end}</span>${render(node[ch], full, path, depth + 1)}</li>`;
      }).join("") + `</ul>`;
    }
    function draw() {
      const t = buildTrie(), pre = p.value.trim();
      let n = t, ok = true;
      for (const ch of pre) { if (!n[ch]) { ok = false; break; } n = n[ch]; }
      ui.stage.innerHTML = `<div class="trie-wrap"><span class="trie-root mono">root</span>${render(t, "", ok ? pre : "", 0)}</div>`;
      if (!pre) { ui.log("접두사를 입력해 보세요."); return; }
      if (!ok) { ui.log(`'${esc(pre)}'로 시작하는 단어가 없어요. 내려가다 길이 끊겼어요.`); return; }
      const hits = words.filter((w) => w.startsWith(pre)).sort();
      ui.log(`${[...pre].length}글자만 내려가서 찾았어요(<span class="cx c-lin">O(L)</span>). 자동 완성: ` + hits.map((w) => `<span class="chip">${esc(w)}</span>`).join(" "));
    }
    p.addEventListener("input", draw);
    onEnter(p, () => root.querySelector('[data-act="add"]').click());
    onAct(root, {
      add: () => {
        const w = p.value.trim();
        if (!w) { ui.log("추가할 단어를 입력해 주세요."); return; }
        if (words.includes(w)) { draw(); ui.log(`'${esc(w)}'는 이미 있어요.`); return; }
        if (words.length >= 14) { ui.log("데모는 단어 14개까지예요. '처음으로'를 눌러 주세요."); return; }
        words.push(w); draw(); ui.log(`'${esc(w)}'를 추가했어요. 없는 글자만 새 노드가 생겼어요.`);
      },
      reset: () => { seed(); p.value = "가구"; draw(); }
    });
    draw();
  };

  /* 14. 그래프 표현 */
  D.graph = function (root) {
    let sel = "D";
    root.innerHTML = `<div class="demo-stage"></div><p class="demo-log"></p>`;
    const stage = root.querySelector(".demo-stage"), log = root.querySelector(".demo-log");
    function draw() {
      const nb = G.adj[sel];
      const matrix = `<div class="tbl-wrap"><table class="mtx mono"><thead><tr><th></th>${G.names.map((c) => `<th>${c}</th>`).join("")}</tr></thead><tbody>` +
        G.names.map((r) => `<tr class="${r === sel ? "is-row" : ""}"><th>${r}</th>${G.names.map((c) => `<td class="${G.adj[r].includes(c) ? "on" : ""}">${G.adj[r].includes(c) ? 1 : 0}</td>`).join("")}</tr>`).join("") +
        `</tbody></table></div>`;
      const list = `<ul class="adjl mono">` + G.names.map((r) => `<li class="${r === sel ? "is-row" : ""}"><b>${r}</b> → [${G.adj[r].join(", ")}]</li>`).join("") + `</ul>`;
      stage.innerHTML = graphSVG({ cur: sel, hi: nb, edgeOn: (u, v) => u === sel || v === sel }) +
        `<div class="rep-grid"><div><p class="rep-t">인접 행렬 <span class="cx c-sq">O(V²)</span></p>${matrix}</div><div><p class="rep-t">인접 리스트 <span class="cx c-lin">O(V + E)</span></p>${list}</div></div>`;
      log.innerHTML = `정점을 눌러 보세요. ${sel}의 이웃: <b class="mono">${nb.join(", ")}</b>. 행렬은 0이 대부분이라 낭비가 많아요.`;
    }
    const pick = (e) => { const g = e.target.closest("[data-node]"); if (g) { sel = g.dataset.node; draw(); } };
    root.addEventListener("click", pick);
    root.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { const g = e.target.closest("[data-node]"); if (g) { e.preventDefault(); sel = g.dataset.node; draw(); root.querySelector(`[data-node="${sel}"]`).focus(); } } });
    draw();
  };

  /* 15. BFS / DFS */
  D.search = function (root) {
    let timer = null;
    const ui = shell(root, btn("bfs", "BFS 실행", "btn-primary") + btn("dfs", "DFS 실행"), "A에서 출발해요. 번호는 방문 순서예요.");
    function steps(kind) {
      const out = [], visited = new Set(["A"]), box = ["A"], order = [];
      if (kind === "bfs") {
        while (box.length) {
          const n = box.shift(); order.push(n);
          G.adj[n].forEach((m) => { if (!visited.has(m)) { visited.add(m); box.push(m); } });
          out.push({ cur: n, order: order.slice(), box: box.slice() });
        }
      } else {
        const seen = new Set();
        const st = ["A"];
        while (st.length) {
          const n = st.pop();
          if (seen.has(n)) continue;
          seen.add(n); order.push(n);
          G.adj[n].slice().reverse().forEach((m) => { if (!seen.has(m)) st.push(m); });
          out.push({ cur: n, order: order.slice(), box: st.filter((m) => !seen.has(m)) });
        }
      }
      return out;
    }
    function draw(s, kind) {
      const badge = {};
      if (s) s.order.forEach((n, i) => (badge[n] = i + 1));
      const boxName = kind === "bfs" ? "큐 (앞 → 뒤)" : "스택 (아래 → 위)";
      ui.stage.innerHTML = graphSVG({ cur: s && s.cur, path: s ? s.order : [], badge }) +
        (s ? `<div class="box-line"><span class="rep-t">${boxName}</span>${cells(s.box.length ? s.box : [null])}</div>` : "");
    }
    function play(kind) {
      clearTimeout(timer);
      const ss = steps(kind);
      let k = 0;
      const tick = () => {
        const s = ss[k];
        draw(s, kind);
        ui.log(`${kind.toUpperCase()} 방문 순서: <b class="mono">${s.order.join(" → ")}</b>` + (k === ss.length - 1 ? (kind === "bfs" ? ". 가까운 B, C를 먼저 다 보고 다음 층으로 갔어요." : ". B 쪽으로 F까지 깊이 들어간 뒤, 되돌아오며 E와 C를 방문했어요.") : ""));
        k++;
        if (k < ss.length) timer = setTimeout(tick, STEP_MS() + 200);
      };
      tick();
    }
    onAct(root, { bfs: () => play("bfs"), dfs: () => play("dfs") });
    draw(null);
  };

  /* 16. 유니온 파인드 */
  D.uf = function (root) {
    const n = 8;
    let parent, pick = null;
    const seed = () => { parent = Array.from({ length: n }, (_, i) => i); pick = null; };
    seed();
    const find = (x) => (parent[x] === x ? x : (parent[x] = find(parent[x])));
    const ui = shell(root, btn("reset", "처음으로"), "원소 두 개를 차례로 눌러 union 하세요. 같은 색이 같은 그룹이에요.");
    function draw() {
      const roots = parent.map((_, i) => find(i));
      const order = [...new Set(roots)];
      ui.stage.innerHTML = `<div class="uf-items">` + parent.map((_, i) =>
        `<button type="button" class="uf-item g${order.indexOf(roots[i]) % 8}${pick === i ? " is-pick" : ""}" data-uf="${i}" aria-pressed="${pick === i}"><span class="mono">${i}</span><small>대표 ${roots[i]}</small></button>`).join("") +
        `</div><div class="uf-arr"><span class="rep-t">parent 배열</span>${cells(parent, { top: (i) => `[${i}]` })}</div>` +
        `<p class="stage-note mono">그룹 ${order.length}개</p>`;
    }
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-uf]");
      if (!b) return;
      const i = Number(b.dataset.uf);
      if (pick === null) { pick = i; draw(); ui.log(`${i}를 골랐어요. 합칠 상대를 눌러 주세요.`); return; }
      if (pick === i) { pick = null; draw(); ui.log("선택을 취소했어요."); return; }
      const a = pick, ra = find(a), rb = find(i);
      pick = null;
      if (ra === rb) { draw(); ui.log(`find(${a}) = find(${i}) = ${ra}. 이미 같은 그룹이에요. 그래프라면 이 간선은 사이클을 만들어요.`); return; }
      parent[rb] = ra;
      draw();
      ui.log(`union(${a}, ${i}): 대표 ${rb}가 대표 ${ra} 밑으로 들어갔어요. parent[${rb}] = ${ra}`);
    });
    onAct(root, { reset: () => { seed(); draw(); ui.log("모두 자기 자신이 대표인 상태로 돌아왔어요."); } });
    draw();
  };

  /* 17. 누적 합 */
  D.prefix = function (root) {
    const a = [3, 1, 4, 1, 5, 9, 2, 6];
    const P = [0];
    a.forEach((x) => P.push(P[P.length - 1] + x));
    const opt = (sel) => a.map((_, i) => `<option value="${i}"${i === sel ? " selected" : ""}>${i}</option>`).join("");
    root.innerHTML = `
      <div class="demo-ctl">
        <label class="lbl" for="ps-i">i</label><select id="ps-i" class="inp">${opt(2)}</select>
        <label class="lbl" for="ps-j">j</label><select id="ps-j" class="inp">${opt(5)}</select>
      </div>
      <div class="demo-stage"></div>
      <p class="demo-log"></p>`;
    const si = root.querySelector("#ps-i"), sj = root.querySelector("#ps-j");
    const stage = root.querySelector(".demo-stage"), log = root.querySelector(".demo-log");
    function draw() {
      let i = Number(si.value), j = Number(sj.value);
      if (i > j) [i, j] = [j, i];
      const range = []; for (let k = i; k <= j; k++) range.push(k);
      stage.innerHTML = `<div class="ps-row"><span class="rep-t">a</span>${cells(a, { hi: range, top: (k) => `[${k}]` })}</div>` +
        `<div class="ps-row"><span class="rep-t">P</span>${cells(P, { hi: [i, j + 1], top: (k) => `[${k}]` })}</div>`;
      const direct = range.map((k) => a[k]).join(" + ");
      log.innerHTML = `a[${i}..${j}] = ${direct} = <b>${P[j + 1] - P[i]}</b><br>누적 합으로는 P[${j + 1}] − P[${i}] = ${P[j + 1]} − ${P[i]} = <b>${P[j + 1] - P[i]}</b>. 뺄셈 한 번, <span class="cx c-fast">O(1)</span>`;
    }
    si.addEventListener("change", draw);
    sj.addEventListener("change", draw);
    draw();
  };

  window.DEMOS = D;
})();
