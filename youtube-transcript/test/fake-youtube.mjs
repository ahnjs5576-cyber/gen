// `node --import ./test/fake-youtube.mjs server.mjs` 로 실행하면 유튜브 대신 가짜 응답을 준다.
// 네트워크 없이 서버·프런트엔드를 시험할 때 사용한다.
const pr = (videoId, withCaptions) => ({
  videoDetails: { videoId, title: '가짜 영상', author: '테스트 채널', lengthSeconds: '95', thumbnail: { thumbnails: [{ url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` }] } },
  playabilityStatus: { status: 'OK' },
  captions: withCaptions ? {
    playerCaptionsTracklistRenderer: {
      captionTracks: [
        { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=ko`, name: { simpleText: '한국어' }, vssId: '.ko', languageCode: 'ko', isTranslatable: true },
        { baseUrl: `https://www.youtube.com/api/timedtext?v=${videoId}&lang=en&kind=asr`, name: { simpleText: '영어 (자동 생성됨)' }, vssId: 'a.en', languageCode: 'en', kind: 'asr', isTranslatable: true },
      ],
      translationLanguages: [{ languageCode: 'en', languageName: { simpleText: '영어' } }, { languageCode: 'ja', languageName: { simpleText: '일본어' } }],
    },
  } : undefined,
});

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input.url ?? input.toString();
  if (!url.includes('youtube.com')) return realFetch(input, init);
  const u = new URL(url);
  if (u.pathname === '/watch') {
    const id = u.searchParams.get('v');
    const body = `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(pr(id, id !== 'nocapsnocap'))};</script></html>`;
    return new Response(body, { status: 200, headers: { 'content-type': 'text/html' } });
  }
  if (u.pathname === '/api/timedtext') {
    const lang = u.searchParams.get('tlang') || u.searchParams.get('lang');
    const prefix = lang === 'ko' && !u.searchParams.get('tlang') ? '' : `${lang}: `;
    const lines = ['안녕하세요, 자막 뷰어 테스트입니다.', '이 줄은 두 번째 자막 줄입니다.', '마지막 줄입니다. 감사합니다.'];
    const events = lines.map((t, i) => ({ tStartMs: i * 4000 + 500, dDurationMs: 3500, segs: [{ utf8: prefix + t }] }));
    return new Response(JSON.stringify({ events }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  if (u.pathname.startsWith('/youtubei/')) {
    return new Response(JSON.stringify({ playabilityStatus: { status: 'OK' } }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return new Response('not found', { status: 404 });
};
