# 유튜브 자막 뷰어

유튜브 영상 주소를 붙여 넣으면 **영상 전체 자막을 한 화면에** 보여주는 웹 서비스입니다.

- 공식 자막과 자동 생성 자막 모두 지원, 자막 언어 전환
- 유튜브 자동 번역으로 다른 언어(한국어 등)로 보기
- 자막 안에서 검색(일치 줄만 보기), 타임스탬프 클릭 시 해당 장면 재생
- 재생 중인 위치의 자막 자동 하이라이트
- 전체 복사, TXT / SRT 파일로 내려받기, 문단으로 보기
- 최근 본 영상 목록, 라이트/다크 테마, 휴대폰 화면 대응

외부 패키지 없이 Node.js 내장 기능만 사용합니다.

## 실행

```bash
cd youtube-transcript
node server.mjs            # http://localhost:3000
PORT=8080 node server.mjs  # 포트 변경
```

브라우저에서 `http://localhost:3000`을 열고 영상 주소를 붙여 넣으면 됩니다.
`http://localhost:3000/?v=영상ID` 처럼 주소에 영상 ID를 붙여 바로 열 수도 있습니다.

Node.js 18 이상이 필요합니다(권장 22).

### 주의: 어디서 실행하느냐가 중요합니다

자막은 서버가 유튜브에서 직접 받아옵니다. 유튜브는 클라우드·데이터센터 IP의 요청을
"봇이 아님을 확인하세요"로 자주 차단하므로, **집이나 사무실 PC처럼 일반 네트워크에서 실행**하는 것이
가장 확실합니다. 차단되면 화면에 그 사실이 안내됩니다.

GitHub Pages 같은 정적 호스팅에는 올릴 수 없습니다(서버가 필요). Render, Railway, Fly.io 등
Node 앱을 돌릴 수 있는 곳이면 `node server.mjs`로 배포할 수 있지만, 위의 IP 차단 문제가 생길 수 있습니다.

## API

```
GET /api/transcript?url=<유튜브 주소 또는 영상 ID>[&track=<트랙 id>][&tlang=<번역 언어 코드>]
```

응답 예:

```json
{
  "video": { "videoId": "…", "title": "…", "author": "…", "lengthSeconds": 125, "thumbnail": "…" },
  "tracks": [{ "id": ".en", "code": "en", "name": "영어", "kind": "manual", "isTranslatable": true }],
  "translationLanguages": [{ "code": "ko", "name": "한국어" }],
  "selected": { "id": ".en", "code": "en", "kind": "manual", "tlang": null },
  "segments": [{ "start": 0.5, "dur": 3.2, "text": "…" }]
}
```

오류는 `{ "error": "코드", "message": "설명" }` 형식입니다.
코드: `INVALID_URL`(400), `NO_CAPTIONS`, `VIDEO_UNAVAILABLE`, `TRACK_NOT_FOUND`(404),
`FETCH_FAILED`, `EMPTY_TRANSCRIPT`(502), `BLOCKED_BY_YOUTUBE`(503).

## 구조

```
server.mjs            HTTP 서버: 정적 파일 + /api/transcript
lib/youtube.mjs       영상 ID 파싱, 자막 트랙 조회, 자막 본문 파싱(json3 / XML / srv3)
public/index.html     화면
public/app.js         검색·번역·내보내기·플레이어 연동
public/styles.css     디자인 토큰(라이트/다크)
test/*.test.mjs       단위 테스트와 서버 테스트 (네트워크 없이 실행)
test/fake-youtube.mjs 유튜브를 흉내 내는 테스트용 모듈
```

## 테스트

```bash
npm test
```

유튜브에 접속하지 않고 가짜 응답으로 전체 흐름을 검사합니다.
네트워크 없이 화면을 직접 보려면 가짜 유튜브 모드로 서버를 띄울 수 있습니다.

```bash
node --import ./test/fake-youtube.mjs server.mjs   # 어떤 영상 ID를 넣어도 가짜 자막이 나옴
```

## 동작 원리

1. 주소에서 11자리 영상 ID를 뽑습니다(`watch?v=`, `youtu.be/`, `shorts/`, `embed/`, `live/` 지원).
2. 유튜브 시청 페이지에 들어 있는 플레이어 정보에서 자막 트랙 목록과 영상 제목을 읽습니다.
3. 고른 트랙의 자막을 받아 `{시작 시각, 길이, 문장}` 배열로 정리해 돌려줍니다.
4. 영상 정보는 10분간 메모리에 캐시되어 언어를 바꿀 때 빠르게 응답합니다.

영상과 자막의 저작권은 각 제작자에게 있습니다. 개인 학습·참고 용도로 사용하세요.
