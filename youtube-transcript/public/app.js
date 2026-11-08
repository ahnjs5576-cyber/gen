/* 유튜브 자막 뷰어 프런트엔드 */
(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const el = {
    form: $('form'), url: $('urlInput'), submit: $('submitBtn'), status: $('status'),
    recent: $('recent'), recentList: $('recentList'), clearRecent: $('clearRecent'),
    result: $('result'), empty: $('empty'), player: $('player'),
    title: $('vTitle'), author: $('vAuthor'), length: $('vLength'), count: $('vCount'), link: $('vLink'),
    trackSel: $('trackSel'), tlangSel: $('tlangSel'), search: $('searchInput'),
    ts: $('tsToggle'), para: $('paraToggle'), follow: $('followToggle'),
    copy: $('copyBtn'), txt: $('txtBtn'), srt: $('srtBtn'),
    matchInfo: $('matchInfo'), list: $('transcript'), theme: $('themeBtn'),
  };

  const state = {
    data: null,        // 서버 응답
    rows: [],          // 화면에 그릴 행 (세그먼트 또는 문단)
    activeIdx: -1,
    player: null,
    playerReady: false,
    playerVideoId: null,
    timer: null,
    loading: null,     // 진행 중인 요청의 AbortController
  };

  /* ---------- 유틸 ---------- */
  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0'), ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }
  function fmtSrtTime(sec) {
    const ms = Math.round(sec * 1000);
    const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), r = ms % 1000;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(r).padStart(3, '0')}`;
  }
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function safeName(s) { return (s || 'transcript').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 80) || 'transcript'; }

  let toastEl, toastTimer;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
  }
  function setStatus(msg, isError = false) {
    el.status.textContent = msg; el.status.classList.toggle('error', isError);
  }
  function download(filename, text, mime = 'text/plain') {
    const blob = new Blob([text], { type: `${mime};charset=utf-8` });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* ---------- 테마 ---------- */
  function applyTheme(t) {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
  }
  try { applyTheme(localStorage.getItem('yt-theme') || ''); } catch { /* ignore */ }
  el.theme.addEventListener('click', () => {
    const cur = document.documentElement.dataset.theme
      || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem('yt-theme', next); } catch { /* ignore */ }
  });

  /* ---------- 최근 본 영상 ---------- */
  const RECENT_KEY = 'yt-recent';
  function loadRecent() { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
  function saveRecent(list) { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch { /* ignore */ } }
  function pushRecent(video) {
    const list = loadRecent().filter((v) => v.videoId !== video.videoId);
    list.unshift({ videoId: video.videoId, title: video.title, thumbnail: video.thumbnail });
    saveRecent(list.slice(0, 8));
    renderRecent();
  }
  function renderRecent() {
    const list = loadRecent();
    el.recent.hidden = !list.length;
    el.recentList.innerHTML = '';
    for (const v of list) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.title = v.title;
      const img = document.createElement('img'); img.src = v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/mqdefault.jpg`; img.alt = ''; img.onerror = () => img.remove();
      const sp = document.createElement('span'); sp.textContent = v.title || v.videoId;
      b.append(img, sp);
      b.addEventListener('click', () => { el.url.value = `https://www.youtube.com/watch?v=${v.videoId}`; load({ url: el.url.value }); });
      li.appendChild(b); el.recentList.appendChild(li);
    }
  }
  el.clearRecent.addEventListener('click', () => { saveRecent([]); renderRecent(); });

  /* ---------- 데이터 로드 ---------- */
  async function load({ url, track, tlang }) {
    if (state.loading) state.loading.abort();
    const ctrl = new AbortController(); state.loading = ctrl;

    el.submit.disabled = true;
    setStatus(track || tlang ? '자막을 바꾸는 중…' : '자막을 가져오는 중…');
    const q = new URLSearchParams({ url });
    if (track) q.set('track', track);
    if (tlang) q.set('tlang', tlang);
    try {
      const res = await fetch(`api/transcript?${q}`, { signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || `오류 (HTTP ${res.status})`);
      state.data = data;
      render(data);
      setStatus(`${data.segments.length.toLocaleString()}개 자막 줄을 불러왔습니다.`);
      pushRecent(data.video);
      const next = new URL(location.href);
      next.search = `?v=${data.video.videoId}`;
      history.replaceState(null, '', next);
      document.title = `${data.video.title} - 유튜브 자막 뷰어`;
    } catch (e) {
      if (e.name === 'AbortError') return;
      setStatus(e.message || '자막을 가져오지 못했습니다.', true);
      if (!state.data) { el.result.hidden = true; el.empty.hidden = false; }
    } finally {
      if (state.loading === ctrl) { state.loading = null; el.submit.disabled = false; }
    }
  }

  el.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = el.url.value.trim();
    if (!url) return;
    load({ url });
  });
  el.url.addEventListener('paste', () => {
    // 붙여 넣기 직후 자동으로 가져오기
    setTimeout(() => { if (el.url.value.trim()) load({ url: el.url.value.trim() }); }, 0);
  });

  /* ---------- 렌더 ---------- */
  function render(data) {
    const { video, tracks, translationLanguages, selected } = data;
    el.empty.hidden = true; el.result.hidden = false;

    el.title.textContent = video.title || '(제목 없음)';
    el.author.textContent = video.author || '채널 정보 없음';
    el.length.textContent = video.lengthSeconds ? fmtTime(video.lengthSeconds) : (video.isLive ? '실시간' : '길이 정보 없음');
    el.link.href = `https://www.youtube.com/watch?v=${video.videoId}`;

    // 자막 트랙 목록
    el.trackSel.innerHTML = '';
    for (const t of tracks) {
      const o = document.createElement('option');
      o.value = t.id; o.textContent = t.kind === 'asr' ? `${t.name} (자동 생성)` : t.name;
      if (t.id === selected.id) o.selected = true;
      el.trackSel.appendChild(o);
    }
    // 번역 목록
    el.tlangSel.innerHTML = '';
    const none = document.createElement('option'); none.value = ''; none.textContent = '번역 안 함';
    el.tlangSel.appendChild(none);
    const canTranslate = selected.isTranslatable && translationLanguages.length;
    el.tlangSel.disabled = !canTranslate;
    if (canTranslate) {
      const sorted = [...translationLanguages].sort((a, b) => (a.code === 'ko' ? -1 : b.code === 'ko' ? 1 : a.code === 'en' ? -1 : b.code === 'en' ? 1 : a.name.localeCompare(b.name, 'ko')));
      for (const l of sorted) {
        if (l.code === selected.code) continue;
        const o = document.createElement('option'); o.value = l.code; o.textContent = `${l.name}로 번역`;
        if (l.code === selected.tlang) o.selected = true;
        el.tlangSel.appendChild(o);
      }
    }

    buildRows();
    renderRows();
    setupPlayer(video.videoId);
  }

  function buildRows() {
    const segs = state.data?.segments || [];
    if (!el.para.checked) { state.rows = segs.map((s) => ({ start: s.start, end: s.start + (s.dur || 0), text: s.text })); }
    else {
      const rows = [];
      let cur = null;
      for (const s of segs) {
        const gap = cur ? s.start - cur.end : 0;
        const endsSentence = cur && /[.!?。！？]["')\]]?$/.test(cur.text);
        if (!cur || gap > 3 || (cur.text.length >= 220 && endsSentence) || cur.text.length >= 500) {
          cur = { start: s.start, end: s.start + (s.dur || 0), text: s.text };
          rows.push(cur);
        } else {
          cur.text += ' ' + s.text; cur.end = Math.max(cur.end, s.start + (s.dur || 0));
        }
      }
      state.rows = rows;
    }
    el.count.textContent = `${segs.length.toLocaleString()}줄`;
  }

  function renderRows() {
    const query = el.search.value.trim();
    const re = query ? new RegExp(escapeRe(query), 'gi') : null;
    let hits = 0;
    const frag = document.createDocumentFragment();
    state.rows.forEach((r, i) => {
      const li = document.createElement('li');
      li.dataset.idx = i;
      let html = escapeHtml(r.text);
      if (re) {
        let matched = false;
        html = html.replace(re, (m) => { matched = true; return `<mark>${m}</mark>`; });
        if (matched) { li.classList.add('hit'); hits++; }
      }
      const a = document.createElement('a');
      a.className = 'ts'; a.href = `https://www.youtube.com/watch?v=${state.data.video.videoId}&t=${Math.floor(r.start)}s`;
      a.textContent = fmtTime(r.start); a.title = '이 장면으로 이동';
      a.addEventListener('click', (e) => { e.preventDefault(); seekTo(r.start); });
      const p = document.createElement('p'); p.className = 'txt'; p.innerHTML = html;
      li.append(a, p);
      frag.appendChild(li);
    });
    el.list.innerHTML = '';
    el.list.appendChild(frag);
    el.list.classList.toggle('no-ts', !el.ts.checked);
    el.list.classList.toggle('para', el.para.checked);
    el.list.classList.toggle('hide-nomatch', Boolean(re));
    el.matchInfo.hidden = !re;
    if (re) el.matchInfo.textContent = hits ? `"${query}" 일치 ${hits}곳` : `"${query}"와 일치하는 자막이 없습니다.`;
    state.activeIdx = -1;
  }

  el.trackSel.addEventListener('change', () => {
    if (!state.data) return;
    load({ url: state.data.video.videoId, track: el.trackSel.value, tlang: '' });
  });
  el.tlangSel.addEventListener('change', () => {
    if (!state.data) return;
    load({ url: state.data.video.videoId, track: el.trackSel.value, tlang: el.tlangSel.value });
  });
  el.ts.addEventListener('change', () => el.list.classList.toggle('no-ts', !el.ts.checked));
  el.para.addEventListener('change', () => { buildRows(); renderRows(); });
  let searchTimer;
  el.search.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(renderRows, 120); });

  /* ---------- 내보내기 ---------- */
  function plainText() {
    const withTs = el.ts.checked;
    return state.rows.map((r) => (withTs ? `[${fmtTime(r.start)}] ${r.text}` : r.text)).join('\n');
  }
  function srtText() {
    const segs = state.data.segments;
    return segs.map((s, i) => {
      const start = s.start;
      let end = s.dur ? s.start + s.dur : (segs[i + 1]?.start ?? s.start + 3);
      if (segs[i + 1] && end > segs[i + 1].start) end = segs[i + 1].start;
      if (end <= start) end = start + 1;
      return `${i + 1}\n${fmtSrtTime(start)} --> ${fmtSrtTime(end)}\n${s.text}\n`;
    }).join('\n');
  }
  function baseName() {
    const d = state.data;
    const lang = d.selected.tlang || d.selected.code;
    return `${safeName(d.video.title)} [${lang}]`;
  }
  el.copy.addEventListener('click', async () => {
    if (!state.data) return;
    const text = `${state.data.video.title}\nhttps://www.youtube.com/watch?v=${state.data.video.videoId}\n\n${plainText()}`;
    try { await navigator.clipboard.writeText(text); toast('자막을 복사했습니다'); }
    catch { download(`${baseName()}.txt`, text); toast('클립보드를 쓸 수 없어 파일로 저장했습니다'); }
  });
  el.txt.addEventListener('click', () => { if (state.data) { download(`${baseName()}.txt`, plainText()); toast('TXT 파일을 저장했습니다'); } });
  el.srt.addEventListener('click', () => { if (state.data) { download(`${baseName()}.srt`, srtText(), 'application/x-subrip'); toast('SRT 파일을 저장했습니다'); } });

  /* ---------- 플레이어 ---------- */
  let apiRequested = false;
  function ensureApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    return new Promise((resolve) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { prev && prev(); resolve(); };
      if (!apiRequested) {
        apiRequested = true;
        const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.async = true;
        s.onerror = () => resolve(); // 플레이어가 없어도 자막은 보인다
        document.head.appendChild(s);
      }
    });
  }
  async function setupPlayer(videoId) {
    if (state.playerVideoId === videoId && state.player) return;
    state.playerVideoId = videoId; state.playerReady = false;
    await ensureApi();
    if (!window.YT || !window.YT.Player) {
      el.player.innerHTML = `<img src="https://i.ytimg.com/vi/${videoId}/hqdefault.jpg" alt="">`;
      return;
    }
    if (state.player) { state.player.cueVideoById(videoId); state.playerReady = true; return; }
    state.player = new YT.Player('player', {
      videoId,
      playerVars: { rel: 0, playsinline: 1 },
      events: {
        onReady: () => { state.playerReady = true; },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) startFollow(); else stopFollow();
        },
      },
    });
  }
  function seekTo(sec) {
    if (state.player && state.playerReady) {
      state.player.seekTo(sec, true); state.player.playVideo();
      el.result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.open(`https://www.youtube.com/watch?v=${state.data.video.videoId}&t=${Math.floor(sec)}s`, '_blank', 'noopener');
    }
  }
  function startFollow() {
    stopFollow();
    state.timer = setInterval(() => {
      if (!state.player || !state.playerReady) return;
      const t = state.player.getCurrentTime();
      let idx = -1;
      for (let i = 0; i < state.rows.length; i++) { if (state.rows[i].start <= t + 0.05) idx = i; else break; }
      if (idx === state.activeIdx) return;
      const prev = el.list.children[state.activeIdx]; if (prev) prev.classList.remove('active');
      const cur = el.list.children[idx];
      if (cur) {
        cur.classList.add('active');
        if (el.follow.checked && !el.search.value) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
      state.activeIdx = idx;
    }, 400);
  }
  function stopFollow() { clearInterval(state.timer); state.timer = null; }

  /* ---------- 시작 ---------- */
  renderRecent();
  const params = new URLSearchParams(location.search);
  const initial = params.get('url') || params.get('v');
  if (initial) {
    el.url.value = /^[\w-]{11}$/.test(initial) ? `https://www.youtube.com/watch?v=${initial}` : initial;
    load({ url: initial });
  }
})();
