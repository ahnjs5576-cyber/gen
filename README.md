# 옷짝

옷 사진을 올리면 색을 읽고, **그 옷에 어울리는 코디**를 세 가지 룩으로 추천해 주는 웹 앱입니다.
서버 없이 브라우저에서만 동작하고, 원하면 Claude 비전으로 더 정밀하게 분석할 수 있습니다.

## 무엇을 해 주나요

| 화면 | 하는 일 |
| --- | --- |
| **추천** | 사진 선택·촬영·끌어놓기·붙여넣기로 옷을 올립니다. 사진 가운데를 중심으로 주요 색 1~3개를 뽑고(배경은 걸러냄), 옷 종류·스타일·계절을 고르면 추천을 만듭니다. |
| **결과** | 어울리는 색 목록(뉴트럴 / 톤온톤 / 포인트와 이유), 그리고 **기본 룩 · 톤온톤(모노톤) 룩 · 포인트 룩** 세 가지. 룩마다 상·하의, 아우터, 신발, 가방·액세서리를 색과 이유까지 보여 줍니다. |
| **옷장** | 분석한 옷을 저장해 둡니다. 새 옷을 분석하면 옷장에 있는 옷 중 어울리는 것도 함께 골라 줍니다. |
| **설정** | Claude API 키(선택), 기본 스타일, 테마, 초기화 |

### 두 가지 분석 방식

- **색 분석(기본, 오프라인)** — `engine.js`가 사진의 픽셀에서 팔레트를 뽑고, 색 조화 규칙(따뜻한/차가운 뉴트럴, 톤온톤, 보색·유사색)과 스타일별 아이템 카탈로그로 룩을 조합합니다. 같은 입력이면 항상 같은 결과를 냅니다.
- **AI 정밀 분석(선택)** — 설정에 본인의 Claude API 키를 넣으면 `ai.js`가 공식 SDK로 사진을 보내 옷의 종류·소재·무늬까지 읽고 룩을 제안합니다. 모델은 `claude-opus-5-5`이며, 구조화 출력(JSON 스키마)으로 엔진과 같은 모양의 결과를 받아 화면에서 똑같이 그립니다. 분석을 거절당하면 Anthropic이 권장하는 대체 모델로 서버에서 자동 재시도합니다(`fallbacks: "default"`). 키는 브라우저 localStorage에만 저장되고 분석 요청 때만 Anthropic 서버로 전송됩니다.

## 실행

빌드 과정이 없는 정적 사이트입니다.

```bash
python3 -m http.server 8000   # 그다음 http://localhost:8000 열기
```

`index.html`을 파일로 바로 열어도 색 분석은 동작합니다(오프라인 캐시와 AI 분석은 http(s)에서만).

### 휴대폰에서 쓰기

GitHub 저장소의 **Settings → Pages**에서 이 브랜치의 루트(`/`)를 배포하면 `https://<아이디>.github.io/<저장소>/` 주소가 생깁니다.
휴대폰에서 열고 "홈 화면에 추가"하면 앱처럼 쓸 수 있고, **카메라로 찍기** 버튼으로 바로 옷을 찍어 분석할 수 있습니다.

## 구조

```
index.html               앱 셸
styles.css               디자인 토큰과 화면 스타일 (라이트/다크)
engine.js                색 추출, 색 이름, 조화 규칙, 아이템 카탈로그, 룩 조합, 옷장 매칭 (순수 함수)
ai.js                    Claude 비전 분석 (구조화 출력, 대체 모델, 오류 문구)
app.js                   화면 전환, 이미지 처리, 옷장, 설정
vendor/anthropic-sdk.js  @anthropic-ai/sdk 1.6.0 을 브라우저용으로 번들한 파일 (AI 분석을 켤 때만 로드)
sw.js                    오프라인 캐시
scripts/test-engine.mjs  엔진 단위 테스트 (Node)
scripts/smoke.mjs        브라우저 스모크 테스트 (Playwright, API는 가짜 응답으로 대체)
```

## 테스트

```bash
node scripts/test-engine.mjs   # 색 이름·팔레트·추천·옷장 매칭 규칙
node scripts/smoke.mjs         # 업로드 → 분석 → 추천 → 옷장, SDK 로드, AI 요청 모양
```

## SDK 번들 다시 만들기

```bash
npm install @anthropic-ai/sdk@1.6.0 esbuild
npx esbuild --bundle --format=esm --platform=browser --minify --target=es2020 \
  --outfile=vendor/anthropic-sdk.js node_modules/@anthropic-ai/sdk/index.mjs
```
