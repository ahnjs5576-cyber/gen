import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseVideoId, extractJsonObject, extractPlayerResponse, listTracks, pickDefaultTrack,
  parseJson3, parseTimedTextXml, decodeEntities, getTranscript, setFetch, TranscriptError,
} from '../lib/youtube.mjs';

test('parseVideoId: 여러 주소 형태', () => {
  const id = 'dQw4w9WgXcQ';
  for (const u of [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?feature=share&v=${id}&t=10s`,
    `youtube.com/watch?v=${id}`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://music.youtube.com/watch?v=${id}&list=RD`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}?autoplay=1`,
    `https://www.youtube.com/live/${id}`,
    `https://www.youtube-nocookie.com/embed/${id}`,
    `  https://youtu.be/${id}  `,
  ]) assert.equal(parseVideoId(u), id, u);

  for (const bad of ['', null, 'hello', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/channel/UCabc', 'https://youtu.be/short'])
    assert.equal(parseVideoId(bad), null, String(bad));
});

test('extractJsonObject: 문자열 속 중괄호와 이스케이프를 무시', () => {
  const src = 'x = {"a":"}\\"{","b":{"c":[1,2]}} ; var y';
  const json = extractJsonObject(src, src.indexOf('{'));
  assert.deepEqual(JSON.parse(json), { a: '}"{', b: { c: [1, 2] } });
});

const samplePR = {
  videoDetails: { videoId: 'abcdefghijk', title: '테스트 영상', author: '채널', lengthSeconds: '125', thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg' }] } },
  playabilityStatus: { status: 'OK' },
  captions: {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: 'https://www.youtube.com/api/timedtext?v=abcdefghijk&lang=en', name: { simpleText: '영어' }, vssId: '.en', languageCode: 'en', isTranslatable: true },
        { baseUrl: 'https://www.youtube.com/api/timedtext?v=abcdefghijk&lang=ko&kind=asr', name: { runs: [{ text: '한국어 (자동 생성됨)' }] }, vssId: 'a.ko', languageCode: 'ko', kind: 'asr', isTranslatable: true },
      ],
      translationLanguages: [{ languageCode: 'ko', languageName: { simpleText: '한국어' } }, { languageCode: 'ja', languageName: { simpleText: '일본어' } }],
    },
  },
};

test('extractPlayerResponse: HTML에서 객체를 찾는다', () => {
  const html = `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(samplePR)};var meta = {};</script></html>`;
  const pr = extractPlayerResponse(html);
  assert.equal(pr.videoDetails.title, '테스트 영상');
  assert.equal(extractPlayerResponse('<html>nothing</html>'), null);
});

test('listTracks / pickDefaultTrack', () => {
  const { tracks, translationLanguages } = listTracks(samplePR);
  assert.equal(tracks.length, 2);
  assert.deepEqual(tracks.map((t) => t.id), ['.en', 'a.ko']);
  assert.equal(tracks[1].kind, 'asr');
  assert.equal(tracks[1].name, '한국어 (자동 생성됨)');
  assert.equal(translationLanguages[1].name, '일본어');
  // 한국어 직접 자막이 없으면 직접 자막(영어)을 우선
  assert.equal(pickDefaultTrack(tracks).id, '.en');
  // 한국어 직접 자막이 있으면 그것을 우선
  const ko = { id: '.ko', code: 'ko', kind: 'manual' };
  assert.equal(pickDefaultTrack([tracks[0], ko]).id, '.ko');
  assert.equal(pickDefaultTrack([]), null);
});

test('parseJson3: 세그먼트 변환', () => {
  const segs = parseJson3({
    events: [
      { tStartMs: 0, dDurationMs: 1500, segs: [{ utf8: 'Hello ' }, { utf8: 'world' }] },
      { tStartMs: 1500, dDurationMs: 100, aAppend: 1, segs: [{ utf8: '\n' }] },
      { tStartMs: 2000, dDurationMs: 2500, segs: [{ utf8: '안녕\n하세요' }] },
      { tStartMs: 9999 },
    ],
  });
  assert.deepEqual(segs, [
    { start: 0, dur: 1.5, text: 'Hello world' },
    { start: 2, dur: 2.5, text: '안녕 하세요' },
  ]);
});

test('parseTimedTextXml: 구형 XML과 srv3', () => {
  const xml = `<?xml version="1.0"?><transcript><text start="1.2" dur="2">He said &amp;quot;hi&amp;quot; &amp;amp; left</text><text start="4" dur="1">&lt;i&gt;tag&lt;/i&gt;</text><text start="6">  </text></transcript>`;
  assert.deepEqual(parseTimedTextXml(xml), [
    { start: 1.2, dur: 2, text: 'He said "hi" & left' },
    { start: 4, dur: 1, text: 'tag' },
  ]);
  const srv3 = `<timedtext format="3"><body><p t="500" d="1200"><s>one</s><s> two</s></p><p t="3000">three</p></body></timedtext>`;
  assert.deepEqual(parseTimedTextXml(srv3), [
    { start: 0.5, dur: 1.2, text: 'one two' },
    { start: 3, dur: 0, text: 'three' },
  ]);
});

test('decodeEntities', () => {
  assert.equal(decodeEntities('&#39;a&#x41;&quot;&nbsp;&unknown;'), "'aA\" &unknown;");
});

/* ---- getTranscript: 네트워크를 흉내 내어 전체 흐름 검증 ---- */
function mockFetch(routes) {
  return async (input, init = {}) => {
    const url = typeof input === 'string' ? input : input.toString();
    for (const [match, handler] of routes) {
      if (url.includes(match)) {
        const r = await handler(url, init);
        const body = typeof r.body === 'string' ? r.body : JSON.stringify(r.body);
        return new Response(body, { status: r.status || 200, headers: { 'content-type': r.type || 'text/plain' } });
      }
    }
    throw new Error(`unmocked ${url}`);
  };
}

test('getTranscript: 기본 트랙, 번역, 트랙 지정', async (t) => {
  t.after(() => setFetch());
  const calls = [];
  setFetch(mockFetch([
    ['/watch?v=', () => ({ body: `<script>var ytInitialPlayerResponse = ${JSON.stringify(samplePR)};</script>` })],
    ['/api/timedtext', (url) => {
      calls.push(url);
      const u = new URL(url);
      const lang = u.searchParams.get('tlang') || u.searchParams.get('lang');
      return { body: { events: [{ tStartMs: 0, dDurationMs: 1000, segs: [{ utf8: `${lang} line` }] }] } };
    }],
  ]));

  const r = await getTranscript({ url: 'https://youtu.be/abcdefghijk' });
  assert.equal(r.video.title, '테스트 영상');
  assert.equal(r.video.lengthSeconds, 125);
  assert.equal(r.selected.id, '.en');
  assert.equal(r.selected.tlang, null);
  assert.equal('baseUrl' in r.selected, false, 'baseUrl은 응답에 노출하지 않음');
  assert.deepEqual(r.segments, [{ start: 0, dur: 1, text: 'en line' }]);
  assert.ok(calls[0].includes('fmt=json3'));

  const ko = await getTranscript({ url: 'abcdefghijk', tlang: 'ko' });
  assert.equal(ko.selected.tlang, 'ko');
  assert.equal(ko.segments[0].text, 'ko line');

  const asr = await getTranscript({ url: 'abcdefghijk', track: 'a.ko' });
  assert.equal(asr.selected.kind, 'asr');
  assert.equal(asr.segments[0].text, 'ko line');

  await assert.rejects(getTranscript({ url: 'abcdefghijk', track: '.zz' }), (e) => e instanceof TranscriptError && e.code === 'TRACK_NOT_FOUND');
  await assert.rejects(getTranscript({ url: 'not a url' }), (e) => e.code === 'INVALID_URL' && e.status === 400);
});

test('getTranscript: json3 실패 시 XML로 재시도', async (t) => {
  t.after(() => setFetch());
  let n = 0;
  setFetch(mockFetch([
    ['/watch?v=', () => ({ body: `ytInitialPlayerResponse = ${JSON.stringify({ ...samplePR, videoDetails: { ...samplePR.videoDetails, videoId: 'xmlxmlxmlxm' } })};` })],
    ['/api/timedtext', (url) => (++n === 1 ? { body: '' } : { body: '<transcript><text start="0" dur="1">from xml</text></transcript>' })],
  ]));
  const r = await getTranscript({ url: 'xmlxmlxmlxm' });
  assert.equal(n, 2);
  assert.equal(r.segments[0].text, 'from xml');
});

test('getTranscript: 자막 없음 / 재생 불가 / 봇 차단 / 네트워크 실패', async (t) => {
  t.after(() => setFetch());
  const noCaps = { ...samplePR, captions: undefined };
  setFetch(mockFetch([
    ['/watch?v=nocaps00000', () => ({ body: `ytInitialPlayerResponse = ${JSON.stringify(noCaps)};` })],
    ['/watch?v=private0000', () => ({ body: `ytInitialPlayerResponse = ${JSON.stringify({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: '비공개 동영상입니다' } })};` })],
    ['/watch?v=botblock000', () => ({ body: `ytInitialPlayerResponse = ${JSON.stringify({ playabilityStatus: { status: 'LOGIN_REQUIRED', reason: '로그인하여 봇이 아님을 확인하세요.' } })};` })],
    ['/watch?v=downdowndow', () => { throw new Error('ECONNRESET'); }],
    ['/youtubei/v1/player', (url, init) => {
      const { videoId } = JSON.parse(init.body);
      if (videoId === 'downdowndow') throw new Error('ECONNRESET');
      return { body: { playabilityStatus: { status: 'OK' } } };
    }],
  ]));
  await assert.rejects(getTranscript({ url: 'nocaps00000' }), (e) => e.code === 'NO_CAPTIONS' && e.status === 404);
  await assert.rejects(getTranscript({ url: 'private0000' }), (e) => e.code === 'VIDEO_UNAVAILABLE' && /비공개/.test(e.message));
  await assert.rejects(getTranscript({ url: 'botblock000' }), (e) => e.code === 'BLOCKED_BY_YOUTUBE' && e.status === 503);
  await assert.rejects(getTranscript({ url: 'downdowndow' }), (e) => e.code === 'FETCH_FAILED' && e.status === 502);
});
