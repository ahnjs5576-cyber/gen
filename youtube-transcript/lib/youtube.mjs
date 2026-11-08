// YouTube 자막(캡션) 추출 모듈. 외부 의존성 없음 (Node 18+ 내장 fetch 사용).

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const WATCH_HEADERS = {
  'User-Agent': UA,
  'Accept-Language': 'ko,en;q=0.8',
  Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
  // EU 동의 화면·연령 확인 화면을 건너뛰기 위한 쿠키
  Cookie: 'CONSENT=YES+cb; SOCS=CAI',
};

let fetchFn = (...args) => globalThis.fetch(...args);
/** 테스트에서 네트워크를 흉내 낼 때 사용. 인자 없이 호출하면 기본 fetch로 되돌린다. */
export function setFetch(fn) {
  fetchFn = fn || ((...args) => globalThis.fetch(...args));
}

export class TranscriptError extends Error {
  constructor(code, message, status = 404) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** 다양한 형태의 유튜브 주소(또는 11자리 ID)에서 영상 ID를 뽑아낸다. 없으면 null. */
export function parseVideoId(input) {
  const s = String(input ?? '').trim();
  if (!s) return null;
  if (ID_RE.test(s)) return s;

  let u;
  try {
    u = new URL(/^[a-z]+:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music|gaming)\./, '');

  let id = null;
  if (host === 'youtu.be') {
    id = u.pathname.split('/')[1] || null;
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    id = u.searchParams.get('v');
    if (!id) {
      const m = u.pathname.match(/^\/(?:embed|shorts|live|v|e)\/([^/?#]+)/);
      if (m) id = m[1];
    }
    if (!id) {
      // /attribution_link?u=/watch%3Fv%3D...
      const inner = u.searchParams.get('u');
      if (inner) {
        try {
          id = new URL(inner, 'https://www.youtube.com').searchParams.get('v');
        } catch {
          /* ignore */
        }
      }
    }
  } else {
    return null;
  }
  return id && ID_RE.test(id) ? id : null;
}

/** text[startIndex]가 '{'일 때, 짝이 맞는 '}'까지의 JSON 문자열을 돌려준다. */
export function extractJsonObject(text, startIndex) {
  if (text[startIndex] !== '{') return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = startIndex; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return text.slice(startIndex, i + 1);
    }
  }
  return null;
}

/** watch 페이지 HTML에서 ytInitialPlayerResponse 객체를 찾는다. */
export function extractPlayerResponse(html) {
  const key = 'ytInitialPlayerResponse';
  let idx = html.indexOf(key);
  while (idx !== -1) {
    const brace = html.indexOf('{', idx + key.length);
    if (brace === -1) break;
    const between = html.slice(idx + key.length, brace);
    if (/^\s*=\s*$/.test(between)) {
      const json = extractJsonObject(html, brace);
      if (json) {
        try {
          return JSON.parse(json);
        } catch {
          /* 다음 후보로 */
        }
      }
    }
    idx = html.indexOf(key, idx + key.length);
  }
  return null;
}

function runsText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.simpleText) return node.simpleText;
  if (Array.isArray(node.runs)) return node.runs.map((r) => r.text || '').join('');
  return '';
}

/** playerResponse에서 자막 트랙 목록과 번역 가능 언어 목록을 정리한다. */
export function listTracks(pr) {
  const r = pr?.captions?.playerCaptionsTracklistRenderer;
  const tracks = (r?.captionTracks || [])
    .filter((t) => t && t.baseUrl)
    .map((t) => {
      const kind = t.kind === 'asr' ? 'asr' : 'manual';
      return {
        id: t.vssId || `${kind === 'asr' ? 'a' : ''}.${t.languageCode}`,
        code: t.languageCode,
        name: runsText(t.name) || t.languageCode,
        kind,
        isTranslatable: Boolean(t.isTranslatable),
        baseUrl: t.baseUrl,
      };
    });
  const translationLanguages = (r?.translationLanguages || []).map((l) => ({
    code: l.languageCode,
    name: runsText(l.languageName) || l.languageCode,
  }));
  return { tracks, translationLanguages };
}

/** 기본 트랙 선택: 한국어 직접 자막 > 아무 직접 자막 > 한국어 자동 자막 > 첫 트랙 */
export function pickDefaultTrack(tracks, preferred = ['ko']) {
  if (!tracks.length) return null;
  const isPref = (t) => preferred.some((p) => t.code === p || t.code.startsWith(`${p}-`));
  return (
    tracks.find((t) => t.kind === 'manual' && isPref(t)) ||
    tracks.find((t) => t.kind === 'manual') ||
    tracks.find((t) => t.kind === 'asr' && isPref(t)) ||
    tracks[0]
  );
}

export function describeVideo(pr, videoId) {
  const d = pr?.videoDetails || {};
  const thumbs = d.thumbnail?.thumbnails || [];
  return {
    videoId,
    title: d.title || '',
    author: d.author || '',
    channelId: d.channelId || '',
    lengthSeconds: Number(d.lengthSeconds) || 0,
    isLive: Boolean(d.isLive || d.isLiveContent),
    thumbnail: thumbs.length ? thumbs[thumbs.length - 1].url : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

async function fetchWatchPage(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}&hl=ko&bpctr=9999999999&has_verified=1`;
  const res = await fetchFn(url, { headers: WATCH_HEADERS, redirect: 'follow' });
  if (!res.ok) throw new Error(`watch page HTTP ${res.status}`);
  return res.text();
}

async function fetchInnertubePlayer(videoId) {
  // 유튜브 웹 플레이어가 쓰는 공개 엔드포인트. watch 페이지에 playerResponse가 없을 때 보조로 사용한다.
  const body = {
    context: { client: { clientName: 'WEB', clientVersion: '2.20250312.04.00', hl: 'ko', gl: 'KR' } },
    videoId,
    contentCheckOk: true,
    racyCheckOk: true,
  };
  const res = await fetchFn('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Accept-Language': 'ko,en;q=0.8',
      Origin: 'https://www.youtube.com',
      Referer: `https://www.youtube.com/watch?v=${videoId}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`innertube HTTP ${res.status}`);
  return res.json();
}

/**
 * 영상의 playerResponse를 얻는다. watch 페이지 → innertube 순으로 시도하며
 * 자막 트랙이 있는 응답을 우선 돌려준다.
 */
export async function fetchPlayerResponse(videoId) {
  const errors = [];
  let fallback = null;

  try {
    const html = await fetchWatchPage(videoId);
    const pr = extractPlayerResponse(html);
    if (pr) {
      if (listTracks(pr).tracks.length) return pr;
      fallback = pr;
    } else {
      errors.push(new Error('watch page: playerResponse not found'));
    }
  } catch (e) {
    errors.push(e);
  }

  try {
    const pr = await fetchInnertubePlayer(videoId);
    if (pr && listTracks(pr).tracks.length) return pr;
    if (pr && !fallback) fallback = pr;
  } catch (e) {
    errors.push(e);
  }

  if (fallback) return fallback;
  throw new TranscriptError(
    'FETCH_FAILED',
    `유튜브에서 영상 정보를 가져오지 못했습니다. (${errors.map((e) => e.message).join('; ') || '알 수 없는 오류'})`,
    502,
  );
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function cleanText(s) {
  return decodeEntities(decodeEntities(s))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** fmt=json3 응답을 {start, dur, text}[] (초 단위)로 변환 */
export function parseJson3(data) {
  const out = [];
  for (const ev of data?.events || []) {
    if (!Array.isArray(ev.segs)) continue;
    const text = ev.segs
      .map((s) => s.utf8 || '')
      .join('')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) continue;
    out.push({
      start: (ev.tStartMs || 0) / 1000,
      dur: (ev.dDurationMs || 0) / 1000,
      text,
    });
  }
  return out;
}

/** 구형 XML(<text start dur>) 및 srv3(<p t d>) 형식을 파싱 */
export function parseTimedTextXml(xml) {
  const out = [];
  const textRe = /<text\s+start="([^"]+)"(?:\s+dur="([^"]+)")?[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = textRe.exec(xml))) {
    const text = cleanText(m[3]);
    if (text) out.push({ start: Number(m[1]) || 0, dur: Number(m[2]) || 0, text });
  }
  if (out.length) return out;

  const pRe = /<p\s+t="(\d+)"(?:\s+d="(\d+)")?[^>]*>([\s\S]*?)<\/p>/g;
  while ((m = pRe.exec(xml))) {
    const text = cleanText(m[3]);
    if (text) out.push({ start: Number(m[1]) / 1000, dur: Number(m[2] || 0) / 1000, text });
  }
  return out;
}

/** 트랙의 자막 본문을 가져온다. tlang을 주면 유튜브 자동 번역을 요청한다. */
export async function fetchSegments(track, tlang) {
  const u = new URL(track.baseUrl);
  u.searchParams.set('fmt', 'json3');
  if (tlang) u.searchParams.set('tlang', tlang);
  else u.searchParams.delete('tlang');

  const headers = { 'User-Agent': UA, 'Accept-Language': 'ko,en;q=0.8' };
  let res = await fetchFn(u, { headers });
  if (!res.ok) throw new TranscriptError('FETCH_FAILED', `자막 요청 실패 (HTTP ${res.status})`, 502);
  let body = await res.text();

  let segs = [];
  try {
    segs = parseJson3(JSON.parse(body));
  } catch {
    segs = parseTimedTextXml(body);
  }
  if (!segs.length) {
    // 일부 트랙은 json3를 지원하지 않아 기본(XML) 형식으로 다시 시도
    u.searchParams.delete('fmt');
    res = await fetchFn(u, { headers });
    if (res.ok) {
      body = await res.text();
      segs = parseTimedTextXml(body);
    }
  }
  return segs;
}

const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getPlayerResponseCached(videoId) {
  const hit = cache.get(videoId);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.pr;
  const pr = await fetchPlayerResponse(videoId);
  cache.set(videoId, { pr, time: Date.now() });
  if (cache.size > 200) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].time - b[1].time)[0];
    if (oldest) cache.delete(oldest[0]);
  }
  return pr;
}

function explainUnavailable(pr) {
  const ps = pr?.playabilityStatus || {};
  const reason = runsText(ps.reason) || runsText(ps.errorScreen?.playerErrorMessageRenderer?.reason) || ps.reason || '';
  if (/bot|봇|로봇/i.test(reason)) {
    return (
      '유튜브가 이 서버의 접속을 봇으로 의심해 차단했습니다. ' +
      '클라우드·데이터센터 IP에서 자주 발생하며, 집이나 사무실 네트워크의 PC에서 서버를 실행하면 보통 해결됩니다.'
    );
  }
  switch (ps.status) {
    case 'LOGIN_REQUIRED':
      return `로그인이 필요한 영상입니다(연령 제한 또는 비공개). ${reason}`.trim();
    case 'UNPLAYABLE':
    case 'ERROR':
      return reason || '재생할 수 없는 영상입니다.';
    case 'LIVE_STREAM_OFFLINE':
      return '아직 시작하지 않은 실시간 스트림입니다.';
    default:
      return reason;
  }
}

/**
 * 메인 진입점. url(또는 ID), 선택 트랙 id, 번역 언어를 받아 전체 결과를 돌려준다.
 */
export async function getTranscript({ url, track: trackId, tlang } = {}) {
  const videoId = parseVideoId(url);
  if (!videoId) {
    throw new TranscriptError('INVALID_URL', '유튜브 영상 주소를 인식하지 못했습니다. 예: https://www.youtube.com/watch?v=영상ID', 400);
  }

  const pr = await getPlayerResponseCached(videoId);
  const video = describeVideo(pr, videoId);
  const { tracks, translationLanguages } = listTracks(pr);

  if (!tracks.length) {
    const why = explainUnavailable(pr);
    const status = pr?.playabilityStatus?.status;
    if (status && status !== 'OK') {
      const blocked = /봇으로 의심/.test(why);
      throw new TranscriptError(blocked ? 'BLOCKED_BY_YOUTUBE' : 'VIDEO_UNAVAILABLE', why || '영상을 볼 수 없습니다.', blocked ? 503 : 404);
    }
    throw new TranscriptError('NO_CAPTIONS', '이 영상에는 자막(자동 생성 포함)이 없습니다.', 404);
  }

  let track = trackId ? tracks.find((t) => t.id === trackId || t.code === trackId) : null;
  if (trackId && !track) {
    throw new TranscriptError('TRACK_NOT_FOUND', `요청한 자막 트랙(${trackId})이 없습니다.`, 404);
  }
  track = track || pickDefaultTrack(tracks);

  const useTlang = tlang && tlang !== track.code && track.isTranslatable ? tlang : null;
  const segments = await fetchSegments(track, useTlang);
  if (!segments.length) {
    throw new TranscriptError('EMPTY_TRANSCRIPT', '자막 트랙은 있지만 내용을 받아오지 못했습니다.', 502);
  }

  const publicTrack = ({ baseUrl, ...rest }) => rest;
  return {
    video,
    tracks: tracks.map(publicTrack),
    translationLanguages,
    selected: { ...publicTrack(track), tlang: useTlang },
    segments,
  };
}
