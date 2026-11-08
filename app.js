/* 옷짝 — 옷 사진을 올리면 어울리는 코디를 추천하는 단일 페이지 앱
 * 화면은 location.hash(#home, #result, #closet, #prefs)로 전환한다.
 * 색 분석과 추천 규칙은 engine.js, Claude 비전 분석은 ai.js 가 맡는다. */
(function () {
  'use strict';
  const E = window.Engine;
  const AI = window.AI;

  // ---------- 저장소 ----------
  const KEY = 'otjjak.v1';
  const defaultState = () => ({ prefs: { theme: 'system', apiKey: '', defaultStyle: '캐주얼' }, closet: [] });
  let state = load();
  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return normalize(JSON.parse(raw)); } catch (e) { /* 저장소 없음 */ }
    return defaultState();
  }
  function normalize(s) {
    const d = defaultState();
    if (!s || typeof s !== 'object') return d;
    const prefs = Object.assign({}, d.prefs, s.prefs || {});
    if (!E.STYLES.includes(prefs.defaultStyle)) prefs.defaultStyle = d.prefs.defaultStyle;
    const closet = Array.isArray(s.closet) ? s.closet.filter(c => c && c.id && c.colors && c.colors.length) : [];
    return { prefs, closet };
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { toast('저장 공간이 부족해 옷장을 저장하지 못했어요.'); } }

  // 현재 분석 중인 옷 (새로 고치면 사라진다)
  let current = null;

  // ---------- 유틸 ----------
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function textOn(hex) { const { l } = E.hexToHsl(hex); return l > 0.6 ? '#1c1c1e' : '#ffffff'; }
  let toastTimer;
  function toast(msg) {
    let el = $('#toast');
    if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }
  function applyTheme() {
    const t = state.prefs.theme;
    if (t === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }

  // ---------- 이미지 처리 ----------
  async function decodeImage(file) {
    if (typeof createImageBitmap === 'function') {
      try { return await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { /* 아래로 */ }
    }
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('이미지를 열 수 없어요')); };
      img.src = url;
    });
  }
  function draw(img, maxEdge) {
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    const scale = Math.min(1, maxEdge / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale)); c.height = Math.max(1, Math.round(h * scale));
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { canvas: c, ctx };
  }
  async function processFile(file) {
    if (!file || !/^image\//.test(file.type)) { toast('이미지 파일을 올려 주세요.'); return; }
    let img;
    try { img = await decodeImage(file); } catch (e) { toast(e.message); return; }
    const small = draw(img, 120);
    const data = small.ctx.getImageData(0, 0, small.canvas.width, small.canvas.height).data;
    const colors = E.paletteFromPixels(data, small.canvas.width, small.canvas.height, { max: 3 });
    const thumb = draw(img, 480).canvas.toDataURL('image/jpeg', 0.82);
    const closetThumb = draw(img, 220).canvas.toDataURL('image/jpeg', 0.72);
    const aiUrl = draw(img, 1024).canvas.toDataURL('image/jpeg', 0.85);
    const category = guessCategory(img);
    if (img.close) img.close(); // ImageBitmap 은 닫으면 크기가 0이 되므로 종류 추정 뒤에 닫는다
    current = {
      thumb, closetThumb, ai: { data: aiUrl.split(',')[1], mediaType: 'image/jpeg' },
      colors, category, style: state.prefs.defaultStyle, season: E.currentSeason(),
      result: null, savedId: null,
    };
    location.hash = '#home';
    render();
  }
  function guessCategory(img) {
    const w = img.width || img.naturalWidth, h = img.height || img.naturalHeight;
    return h / w > 1.35 ? '하의' : '상의'; // 세로로 긴 사진은 바지일 가능성이 높다
  }

  // ---------- 추천 실행 ----------
  function runEngine() {
    current.result = E.recommend({ colors: current.colors, category: current.category, style: current.style, season: current.season });
    location.hash = '#result';
  }
  async function runAI() {
    if (!state.prefs.apiKey) { location.hash = '#prefs'; toast('먼저 설정에서 API 키를 넣어 주세요.'); return; }
    const btn = $('#btn-ai');
    if (btn) { btn.disabled = true; btn.textContent = 'AI가 사진을 보고 있어요…'; }
    $$('.analyze button').forEach(b => { b.disabled = true; });
    try {
      const result = await AI.analyze({
        apiKey: state.prefs.apiKey, image: current.ai,
        hints: { category: current.category, style: current.style, season: current.season },
      });
      // AI가 읽은 색을 현재 옷 색으로 쓴다(사용자가 고른 종류/스타일은 그대로)
      current.colors = result.item.colors.map(c => Object.assign(E.describeHex(c.hex), { name: c.name }));
      current.category = result.item.category; current.style = result.item.style; current.season = result.item.season;
      current.result = result;
      location.hash = '#result';
    } catch (err) {
      toast(await AI.describeError(err));
      render();
    }
  }

  // ---------- 화면 공통 ----------
  const main = $('#main');
  function route() {
    const h = (location.hash || '#home').slice(1);
    const [r] = h.split('-');
    return r;
  }
  function render() {
    const r = route();
    $$('.nav a').forEach(a => a.classList.toggle('on', a.dataset.r === (r === 'result' ? 'home' : r)));
    const badge = $('#closet-badge');
    badge.textContent = state.closet.length; badge.hidden = !state.closet.length;
    if (r === 'result') { if (!current || !current.result) { location.hash = '#home'; return; } renderResult(); }
    else if (r === 'closet') renderCloset();
    else if (r === 'prefs') renderPrefs();
    else renderHome();
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function swatchHtml(c, extra) {
    return `<span class="sw" style="background:${esc(c.hex)}" title="${esc(c.name)}"></span>${extra || ''}`;
  }
  function chips(name, list, value) {
    return `<div class="chips" role="group" aria-label="${esc(name)}">${list.map(v =>
      `<button type="button" class="chip${v === value ? ' on' : ''}" data-chip="${esc(name)}" data-v="${esc(v)}" aria-pressed="${v === value}">${esc(v)}</button>`).join('')}</div>`;
  }

  // ---------- 홈 ----------
  function renderHome() {
    if (current && !current.result) { renderAnalyze(); return; }
    const recent = state.closet.slice(-6).reverse();
    main.innerHTML = `
      <section class="hero">
        <h1>옷 사진 한 장으로<br>오늘의 코디를 찾아요</h1>
        <p class="lead">가진 옷을 찍어 올리면 색을 읽고, 어울리는 상·하의, 아우터, 신발, 소품을 세 가지 룩으로 제안해요.</p>
      </section>
      <div class="drop" id="drop" tabindex="0" role="button" aria-label="옷 사진 올리기">
        <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0 4 4m-4-4-4 4M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        <strong>여기를 눌러 사진 선택</strong>
        <span>또는 끌어다 놓기 · 붙여넣기(Ctrl+V)</span>
      </div>
      <div class="row gap">
        <button type="button" class="btn" id="btn-camera">📷 카메라로 찍기</button>
        <button type="button" class="btn ghost" id="btn-sample">샘플로 체험하기</button>
      </div>
      <section class="how">
        <div class="step"><b>1</b><div><strong>색 읽기</strong><p>사진의 가운데를 중심으로 옷의 주요 색 1~3개를 뽑아요. 배경은 걸러요.</p></div></div>
        <div class="step"><b>2</b><div><strong>종류·스타일 고르기</strong><p>상의인지 하의인지, 어떤 분위기로 입을지 한 번씩 눌러 고르면 돼요.</p></div></div>
        <div class="step"><b>3</b><div><strong>세 가지 룩 받기</strong><p>안전한 기본 룩, 톤온톤 룩, 포인트 룩을 아이템과 이유까지 보여 드려요.</p></div></div>
      </section>
      ${recent.length ? `<section><h2 class="h2">최근 옷장 <a class="more" href="#closet">전체 보기</a></h2>
        <div class="strip">${recent.map(c => `<a class="mini" href="#closet-${esc(c.id)}"><img src="${c.thumb}" alt="${esc(c.name)}"><span>${esc(c.name)}</span></a>`).join('')}</div></section>` : ''}
      <p class="fine">사진과 기록은 이 기기 브라우저에만 저장돼요. ${state.prefs.apiKey ? 'AI 정밀 분석을 켠 상태예요.' : '<a href="#prefs">설정</a>에서 Claude API 키를 넣으면 AI가 옷의 소재와 무늬까지 보고 추천해요.'}</p>`;
    const drop = $('#drop');
    drop.addEventListener('click', () => openPicker(false));
    drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(false); } });
    drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files && e.dataTransfer.files[0]; if (f) processFile(f); });
    $('#btn-camera').addEventListener('click', () => openPicker(true));
    $('#btn-sample').addEventListener('click', loadSample);
  }
  const fileInput = $('#file-input');
  function openPicker(camera) {
    if (camera) fileInput.setAttribute('capture', 'environment'); else fileInput.removeAttribute('capture');
    fileInput.value = ''; fileInput.click();
  }
  fileInput.addEventListener('change', () => { const f = fileInput.files && fileInput.files[0]; if (f) processFile(f); });
  document.addEventListener('paste', e => {
    const items = e.clipboardData && e.clipboardData.items; if (!items) return;
    for (const it of items) if (it.type.startsWith('image/')) { processFile(it.getAsFile()); break; }
  });
  function loadSample() {
    // 네이비 니트 느낌의 샘플 이미지를 만들어 흐름을 체험할 수 있게 한다.
    const c = document.createElement('canvas'); c.width = 480; c.height = 560;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f2f2f0'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#243a66';
    ctx.beginPath(); ctx.moveTo(120, 110); ctx.lineTo(200, 80); ctx.lineTo(280, 80); ctx.lineTo(360, 110); ctx.lineTo(430, 220); ctx.lineTo(370, 250);
    ctx.lineTo(350, 210); ctx.lineTo(350, 500); ctx.lineTo(130, 500); ctx.lineTo(130, 210); ctx.lineTo(110, 250); ctx.lineTo(50, 220); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8e2d2'; ctx.fillRect(130, 440, 220, 24);
    c.toBlob(b => processFile(new File([b], 'sample.png', { type: 'image/png' })), 'image/png');
  }

  // ---------- 분석 패널 ----------
  function renderAnalyze() {
    const c = current;
    main.innerHTML = `
      <section class="analyze card">
        <div class="an-grid">
          <img class="preview" src="${c.thumb}" alt="올린 옷 사진">
          <div class="an-side">
            <h1 class="h1">이 옷, 어떻게 입을까요?</h1>
            <h3 class="h3">읽어낸 색 <span class="hint">눌러서 기준 색 바꾸기</span></h3>
            <div class="palette">${c.colors.map((col, i) => `<button type="button" class="pal${i === 0 ? ' main' : ''}" data-col="${i}" style="background:${esc(col.hex)};color:${textOn(col.hex)}"><b>${esc(col.name)}</b><small>${Math.round((col.ratio || 0) * 100)}%</small></button>`).join('')}</div>
            <h3 class="h3">옷 종류</h3>${chips('category', E.CATEGORIES, c.category)}
            <h3 class="h3">스타일</h3>${chips('style', E.STYLES, c.style)}
            <h3 class="h3">계절</h3>${chips('season', E.SEASONS, c.season)}
            <div class="row gap actions">
              <button type="button" class="btn primary" id="btn-go">코디 추천 받기</button>
              ${state.prefs.apiKey ? '<button type="button" class="btn" id="btn-ai">✨ AI 정밀 분석</button>' : '<a class="btn ghost" href="#prefs">AI 분석 켜기</a>'}
              <button type="button" class="btn ghost" id="btn-reset">다른 사진</button>
            </div>
          </div>
        </div>
      </section>`;
    $$('[data-chip]').forEach(b => b.addEventListener('click', () => { c[b.dataset.chip] = b.dataset.v; renderAnalyze(); }));
    $$('.pal').forEach(b => b.addEventListener('click', () => {
      const i = Number(b.dataset.col); if (!i) return;
      const [picked] = c.colors.splice(i, 1); c.colors.unshift(picked); renderAnalyze();
    }));
    $('#btn-go').addEventListener('click', runEngine);
    const ai = $('#btn-ai'); if (ai) ai.addEventListener('click', runAI);
    $('#btn-reset').addEventListener('click', () => { current = null; render(); });
  }

  // ---------- 결과 ----------
  function renderResult() {
    const c = current, r = c.result, it = r.item;
    const matches = E.matchWardrobe({ category: it.category, colors: it.colors }, state.closet.filter(w => w.id !== c.savedId));
    main.innerHTML = `
      <section class="card item-card">
        <img class="preview sm" src="${c.thumb}" alt="올린 옷 사진">
        <div>
          <div class="tag">${r.source === 'ai' ? '✨ AI 분석' : '색 분석'} · ${esc(it.style)} · ${esc(it.season)}</div>
          <h1 class="h1">${esc(it.name || (it.colors[0].name + ' ' + it.category))}</h1>
          <p class="lead sm">${esc(it.summary)}${it.pattern && it.pattern !== '무지' ? ` · ${esc(it.pattern)}` : ''}${it.material ? ` · ${esc(it.material)}` : ''}</p>
          <div class="palette sm">${it.colors.map(col => `<span class="pal" style="background:${esc(col.hex)};color:${textOn(col.hex)}"><b>${esc(col.name)}</b></span>`).join('')}</div>
          <div class="row gap actions">
            <button type="button" class="btn primary" id="btn-save" ${c.savedId ? 'disabled' : ''}>${c.savedId ? '옷장에 저장됨' : '옷장에 저장'}</button>
            ${r.source !== 'ai' && state.prefs.apiKey ? '<button type="button" class="btn" id="btn-ai">✨ AI로 다시 분석</button>' : ''}
            <button type="button" class="btn ghost" id="btn-back">옵션 바꾸기</button>
            <button type="button" class="btn ghost" id="btn-new">다른 사진</button>
          </div>
        </div>
      </section>
      <section>
        <h2 class="h2">어울리는 색</h2>
        <div class="harm">${r.palette.map(p => `<div class="harm-item"><span class="sw lg" style="background:${esc(p.hex)}"></span><div><b>${esc(p.name)}</b> <em class="role ${p.role}">${p.role === 'neutral' ? '뉴트럴' : p.role === 'tone' ? '톤온톤' : '포인트'}</em><p>${esc(p.reason)}</p></div></div>`).join('')}</div>
      </section>
      <section>
        <h2 class="h2">추천 룩</h2>
        <div class="looks">${r.looks.map((l, i) => `
          <article class="look card">
            <header><span class="num">${i + 1}</span><h3>${esc(l.title)}</h3></header>
            <p class="concept">${esc(l.concept)}</p>
            <ul class="items">
              <li class="me"><span class="sw" style="background:${esc(it.colors[0].hex)}"></span><div><small>${esc(it.category)} · 내 옷</small><b>${esc(it.name || (it.colors[0].name + ' ' + it.category))}</b></div></li>
              ${l.items.map(x => `<li><span class="sw" style="background:${esc(x.colorHex)}"></span><div><small>${esc(x.slot)}</small><b>${esc(x.colorName)} ${esc(x.name)}</b><p>${esc(x.reason)}</p></div></li>`).join('')}
            </ul>
            ${l.tip ? `<p class="tip">💡 ${esc(l.tip)}</p>` : ''}
          </article>`).join('')}</div>
      </section>
      ${matches.length ? `<section>
        <h2 class="h2">내 옷장에서 어울리는 옷</h2>
        <div class="grid">${matches.slice(0, 6).map(m => `<a class="cl" href="#closet-${esc(m.entry.id)}"><img src="${m.entry.thumb}" alt=""><div><small>${esc(m.entry.category)}</small><b>${esc(m.entry.name)}</b><p>${esc(m.reason)}</p></div></a>`).join('')}</div>
      </section>` : (state.closet.length ? '' : '<p class="fine">옷장에 옷을 저장해 두면 다음부터는 가진 옷 중에 어울리는 것도 함께 골라 드려요.</p>')}
      ${r.source === 'ai' ? '<p class="fine">AI 추천은 사진과 설명을 바탕으로 한 제안이에요. 실제 색은 조명에 따라 다르게 보일 수 있어요.</p>' : ''}`;
    $('#btn-save').addEventListener('click', saveToCloset);
    const ai = $('#btn-ai'); if (ai) ai.addEventListener('click', runAI);
    $('#btn-back').addEventListener('click', () => { c.result = null; location.hash = '#home'; });
    $('#btn-new').addEventListener('click', () => { current = null; location.hash = '#home'; });
  }
  function saveToCloset() {
    const it = current.result.item;
    const entry = {
      id: uid(), ts: Date.now(), thumb: current.closetThumb,
      name: it.name || `${it.colors[0].name} ${it.category}`, category: it.category, style: it.style, season: it.season,
      colors: it.colors.map(c => ({ hex: c.hex, name: c.name })),
    };
    state.closet.push(entry);
    if (state.closet.length > 60) state.closet.shift();
    current.savedId = entry.id;
    save(); toast('옷장에 저장했어요.'); render();
  }

  // ---------- 옷장 ----------
  function renderCloset() {
    const id = (location.hash.match(/^#closet-(.+)$/) || [])[1];
    if (id) { const e = state.closet.find(w => w.id === id); if (e) { openClosetItem(e); return; } }
    const list = state.closet.slice().reverse();
    main.innerHTML = `
      <h1 class="h1">내 옷장 <span class="hint">${list.length}개</span></h1>
      ${list.length ? `<div class="grid">${list.map(w => `
        <article class="cl card">
          <a href="#closet-${esc(w.id)}"><img src="${w.thumb}" alt="${esc(w.name)}"></a>
          <div><small>${esc(w.category)} · ${esc(w.style)}</small><b>${esc(w.name)}</b>
            <div class="row">${w.colors.map(c => swatchHtml(c)).join('')}</div>
            <div class="row gap"><a class="btn sm" href="#closet-${esc(w.id)}">코디 보기</a><button type="button" class="btn sm ghost" data-del="${esc(w.id)}">삭제</button></div>
          </div>
        </article>`).join('')}</div>`
      : `<div class="empty"><p>아직 저장한 옷이 없어요.</p><p>추천 결과에서 <b>옷장에 저장</b>을 누르면 여기에 모여요. 옷이 쌓이면 가진 옷끼리 어울리는 조합도 찾아 드려요.</p><a class="btn primary" href="#home">옷 올리기</a></div>`}`;
    $$('[data-del]').forEach(b => b.addEventListener('click', () => {
      const w = state.closet.find(x => x.id === b.dataset.del);
      if (!w || !confirm(`"${w.name}"을(를) 옷장에서 지울까요?`)) return;
      state.closet = state.closet.filter(x => x.id !== w.id); save(); render();
    }));
  }
  function openClosetItem(w) {
    current = {
      thumb: w.thumb, closetThumb: w.thumb, ai: null,
      colors: w.colors.map(c => Object.assign(E.describeHex(c.hex), { name: c.name })),
      category: w.category, style: w.style, season: E.currentSeason(), result: null, savedId: w.id,
    };
    current.result = E.recommend({ colors: current.colors, category: w.category, style: w.style, season: current.season });
    current.result.item.name = w.name;
    location.hash = '#result';
  }

  // ---------- 설정 ----------
  function renderPrefs() {
    const p = state.prefs;
    main.innerHTML = `
      <h1 class="h1">설정</h1>
      <section class="card">
        <h2 class="h2">✨ AI 정밀 분석</h2>
        <p>Claude가 사진을 직접 보고 옷의 종류·소재·무늬까지 읽어 더 구체적인 코디를 제안해요. 본인의 <a href="https://platform.claude.com/" target="_blank" rel="noopener">Claude API 키</a>가 필요하고, 키는 이 브라우저에만 저장되며 분석 요청 때만 Anthropic 서버로 보내요. 사진 한 장 분석에 보통 몇 센트 정도의 비용이 들어요.</p>
        <label class="field"><span>API 키</span>
          <input type="password" id="api-key" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(p.apiKey)}"></label>
        <div class="row gap">
          <button type="button" class="btn primary" id="save-key">저장</button>
          ${p.apiKey ? '<button type="button" class="btn ghost" id="clear-key">키 지우기</button>' : ''}
        </div>
        <p class="fine">모델: ${esc(AI.MODEL)}. 분석을 거절당하면 Anthropic이 권장하는 대체 모델로 자동 재시도해요.</p>
      </section>
      <section class="card">
        <h2 class="h2">기본값</h2>
        <label class="field"><span>기본 스타일</span>
          <select id="def-style">${E.STYLES.map(s => `<option ${s === p.defaultStyle ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label class="field"><span>테마</span>
          <select id="theme"><option value="system" ${p.theme === 'system' ? 'selected' : ''}>기기 설정 따르기</option><option value="light" ${p.theme === 'light' ? 'selected' : ''}>라이트</option><option value="dark" ${p.theme === 'dark' ? 'selected' : ''}>다크</option></select></label>
      </section>
      <section class="card">
        <h2 class="h2">데이터</h2>
        <p>옷장 ${state.closet.length}개가 이 브라우저에 저장돼 있어요.</p>
        <button type="button" class="btn ghost danger" id="reset-all">옷장과 설정 모두 지우기</button>
      </section>`;
    $('#save-key').addEventListener('click', () => {
      const v = $('#api-key').value.trim();
      if (v && !/^sk-ant-/.test(v)) { toast('키는 보통 sk-ant- 로 시작해요. 다시 확인해 주세요.'); return; }
      p.apiKey = v; save(); toast(v ? 'API 키를 저장했어요.' : 'API 키를 지웠어요.'); render();
    });
    const clr = $('#clear-key'); if (clr) clr.addEventListener('click', () => { p.apiKey = ''; save(); toast('API 키를 지웠어요.'); render(); });
    $('#def-style').addEventListener('change', e => { p.defaultStyle = e.target.value; save(); });
    $('#theme').addEventListener('change', e => { p.theme = e.target.value; save(); applyTheme(); });
    $('#reset-all').addEventListener('click', () => {
      if (!confirm('옷장과 설정을 모두 지울까요? 되돌릴 수 없어요.')) return;
      state = defaultState(); current = null; save(); applyTheme(); location.hash = '#home'; render(); toast('초기화했어요.');
    });
  }

  // ---------- 시작 ----------
  applyTheme();
  window.addEventListener('hashchange', render);
  render();
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* 오프라인 캐시는 선택 사항 */ });
  }
})();
