// 오늘의 영단어 — 화면: 배경화면과 똑같이 그린 뒤, 단어를 누르면 뜻·예문 시트를 연다.
(() => {
  'use strict';
  const C = window.WordCore;
  const $ = s => document.querySelector(s);

  const store = {
    get(k, d) { try { const v = localStorage.getItem('words.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('words.' + k, JSON.stringify(v)); } catch (e) { /* 저장 불가 */ } },
  };
  const clamp = n => Math.max(1, Math.min(C.PER_DAY, Number(n) || 3));

  const qs = new URLSearchParams(location.search);
  const state = {
    today: C.today(),
    date: C.isDate(qs.get('date')) ? qs.get('date') : C.today(),
    count: clamp(qs.get('n') || store.get('count', 3)),
    items: [],
    idx: 0,
  };

  const canvas = $('#wall'), ctx = canvas.getContext('2d'), hits = $('#hits');
  const sheet = $('#sheet'), prefs = $('#prefs'), hint = $('#hint');

  // ── 배경 그리기 ─────────────────────────────────────────
  function draw() {
    const W = innerWidth, H = innerHeight, dpr = Math.min(devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    state.items = C.drawWallpaper(ctx, W, H, C.wordsFor(state.date, state.count));

    hits.replaceChildren(...state.items.map((it, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'hit';
      b.textContent = it.word.w;
      b.setAttribute('aria-label', `${it.word.w}, 뜻 보기`);
      b.lang = 'en';
      const padX = it.size * 0.25;
      const h = Math.max(48, it.bottom - it.top + it.size * 0.36);
      const mid = (it.top + it.bottom) / 2;
      Object.assign(b.style, {
        left: `${it.x - it.width / 2 - padX}px`, width: `${it.width + padX * 2}px`,
        top: `${mid - h / 2}px`, height: `${h}px`,
      });
      b.addEventListener('click', () => openWord(i));
      return b;
    }));
    renderBar();
    if (sheet.open) fillSheet();
  }

  const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
  function dateLabel(s) {
    const [, m, d] = s.split('-').map(Number);
    const w = WEEK[new Date(C.dayNum(s) * 864e5).getUTCDay()];
    const diff = C.dayNum(s) - C.dayNum(state.today);
    const rel = diff === 0 ? '오늘' : diff === -1 ? '어제' : diff === 1 ? '내일' : '';
    return `${rel ? rel + ' · ' : ''}${m}월 ${d}일 ${w}요일`;
  }
  function renderBar() {
    $('#date').textContent = dateLabel(state.date);
    $('#back-today').hidden = state.date === state.today;
    document.title = state.date === state.today ? '오늘의 영단어' : `영단어 · ${state.date}`;
  }
  function go(k) { state.date = C.addDays(state.date, k); syncUrl(); draw(); }
  function syncUrl() {
    const p = new URLSearchParams();
    if (state.date !== state.today) p.set('date', state.date);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  // ── 단어 시트 ───────────────────────────────────────────
  function openWord(i) {
    state.idx = i;
    fillSheet();
    if (!sheet.open) sheet.showModal();
    if (!store.get('hinted', false)) { store.set('hinted', true); hint.hidden = true; }
  }
  function fillSheet() {
    const n = state.items.length;
    state.idx = Math.min(state.idx, n - 1);
    const w = state.items[state.idx].word;
    $('#w-count').textContent = `${state.idx + 1} / ${n}`;
    $('#w-word').textContent = w.w;
    $('#w-pos').textContent = w.posKo;
    $('#w-ko').textContent = w.ko;
    const parts = C.splitExample(w.w, w.ex);
    const ex = $('#w-ex');
    if (parts) {
      const mark = document.createElement('mark');
      mark.textContent = parts[1];
      ex.replaceChildren(parts[0], mark, parts[2]);
    } else ex.textContent = w.ex;
    $('#w-exko').textContent = w.exKo;
    const prev = state.items[state.idx - 1], next = state.items[state.idx + 1];
    $('#w-prev').disabled = !prev;
    $('#w-next').disabled = !next;
    $('#w-prev-label').textContent = prev ? prev.word.w : '';
    $('#w-next-label').textContent = next ? next.word.w : '';
  }
  function step(k) {
    const j = state.idx + k;
    if (j >= 0 && j < state.items.length) { state.idx = j; fillSheet(); }
  }

  const canSpeak = 'speechSynthesis' in window;
  function speak(text) {
    if (!canSpeak) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 0.9;
    const v = speechSynthesis.getVoices().find(v => /^en[-_]US/i.test(v.lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  $('#say-word').hidden = $('#say-ex').hidden = !canSpeak;
  $('#say-word').addEventListener('click', () => speak(state.items[state.idx].word.w));
  $('#say-ex').addEventListener('click', () => speak(state.items[state.idx].word.ex));
  $('#w-prev').addEventListener('click', () => step(-1));
  $('#w-next').addEventListener('click', () => step(1));
  sheet.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
  let touchX = null, touchY = null;
  sheet.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; touchY = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener('touchend', e => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX, dy = e.changedTouches[0].clientY - touchY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
    touchX = null;
  });

  // 시트 바깥(배경)을 누르거나 닫기 버튼을 누르면 닫는다.
  for (const d of [sheet, prefs]) {
    d.addEventListener('click', e => {
      if (e.target === d || e.target.closest('[data-close]')) d.close();
    });
    d.addEventListener('close', () => { if (canSpeak) speechSynthesis.cancel(); });
  }

  // ── 설정 ────────────────────────────────────────────────
  const row = $('#count-row');
  for (let n = 1; n <= C.PER_DAY; n++) {
    const label = document.createElement('label');
    const input = Object.assign(document.createElement('input'), { type: 'radio', name: 'count', value: n, checked: n === state.count });
    input.setAttribute('aria-label', `${n}개`);
    const span = document.createElement('span');
    span.textContent = n;
    label.append(input, span);
    row.append(label);
  }
  row.addEventListener('change', e => {
    state.count = clamp(e.target.value);
    store.set('count', state.count);
    draw();
    refreshUrl();
  });

  function wallUrl() { return new URL(`wall/${state.count}/today.jpg`, location.href.split(/[?#]/)[0]).href; }
  let urlCheck = 0;
  async function refreshUrl() {
    const url = wallUrl(), status = $('#url-status'), me = ++urlCheck;
    $('#wall-url').value = url;
    status.textContent = '';
    if (!/^https?:$/.test(location.protocol)) return;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      if (me !== urlCheck) return;
      const ok = r.ok && (r.headers.get('content-type') || '').startsWith('image/');
      status.textContent = ok ? '' : '아직 이 주소에 이미지가 없어요. GitHub Pages 배포(README 참고)가 끝나면 생깁니다.';
    } catch (e) { /* 오프라인 */ }
  }
  $('#copy-url').addEventListener('click', async () => {
    const input = $('#wall-url'), btn = $('#copy-url');
    try { await navigator.clipboard.writeText(input.value); } catch (e) { input.select(); document.execCommand && document.execCommand('copy'); }
    btn.textContent = '복사됨';
    setTimeout(() => { btn.textContent = '복사'; }, 1500);
  });

  $('#save-wall').addEventListener('click', async () => {
    const btn = $('#save-wall'), status = $('#save-status');
    btn.disabled = true;
    status.textContent = '이미지를 만드는 중…';
    try {
      const dpr = devicePixelRatio || 1;
      // 화면이 회전돼 있어도 세로 배경화면 크기로 만든다.
      const sw = Math.min(screen.width, screen.height), sh = Math.max(screen.width, screen.height);
      const W = Math.round(sw * dpr), H = Math.round(sh * dpr);
      const blob = await C.renderBlob(state.date, state.count, W, H);
      const file = new File([blob], `words-${state.date}.jpg`, { type: 'image/jpeg' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); status.textContent = '‘이미지 저장’을 누른 뒤 사진 앱에서 배경화면으로 지정하세요.'; }
        catch (e) { status.textContent = e && e.name === 'AbortError' ? '' : '공유하지 못했어요.'; }
      } else {
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: file.name });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        status.textContent = `${W}×${H} 이미지를 내려받았어요. 갤러리에서 배경화면으로 지정하세요.`;
      }
    } catch (e) {
      status.textContent = '이미지를 만들지 못했어요.';
    } finally { btn.disabled = false; }
  });

  $('#open-prefs').addEventListener('click', () => { refreshUrl(); $('#save-status').textContent = ''; prefs.showModal(); });
  $('#prev').addEventListener('click', () => go(-1));
  $('#next').addEventListener('click', () => go(1));
  $('#back-today').addEventListener('click', () => { state.date = state.today; syncUrl(); draw(); });
  addEventListener('keydown', e => {
    if (sheet.open || prefs.open || e.target.closest('input')) return;
    if (e.key === 'ArrowLeft') go(-1);
    if (e.key === 'ArrowRight') go(1);
  });

  // 자정이 지나면 '오늘'을 보고 있던 화면을 새 날짜로 바꾼다.
  function checkDay() {
    const t = C.today();
    if (t === state.today) return;
    const wasToday = state.date === state.today;
    state.today = t;
    if (wasToday) state.date = t;
    syncUrl();
    draw();
  }
  setInterval(checkDay, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkDay(); });

  let resizeTimer;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 80); });

  hint.hidden = store.get('hinted', false);
  draw();
  C.fontsReady().then(draw);   // 글꼴을 받으면 같은 모양으로 다시 그림

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    try { navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* 지원 안 함 */ }
  }
})();
