# kakao-reply

카카오톡 대화를 읽고 **요약 + 답장 초안**을 만들어 주는 로컬 도구입니다.

## 데이터를 어디서 읽나 — 설계 원칙

| 원칙 | 이 도구에서 |
|---|---|
| 앱이 저장한 데이터를 원본으로 쓴다 | 카카오톡의 공식 **대화 내보내기** 파일(.txt / .csv)을 읽습니다 |
| 원본을 읽기 전용으로 연다 | 파일을 읽기 모드로만 열고, 아무것도 쓰거나 고치지 않습니다 |
| 암호화를 우회하지 않는다 | 맥 카카오톡의 로컬 DB는 암호화돼 있고 카카오가 키를 공식 제공하지 않으므로 **DB를 직접 열지 않습니다** |
| 비밀은 OS 비밀 저장소에 | Anthropic API 키는 macOS 키체인(`keyring`)에 저장합니다. 평문 파일 저장 안 함 |
| 필요한 만큼만 보낸다 | 기본으로 최근 200개 메시지만 전송, `--dry-run` 으로 전송 내용을 미리 확인 |

## 설치

```bash
cd kakao-reply
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
kakao-reply key set        # API 키를 키체인에 저장 (또는 ANTHROPIC_API_KEY 환경변수)
```

## 대화 내보내기 방법

- **Mac/PC**: 대화방 → 우측 상단 메뉴(≡) → 대화 내용 → 대화 내보내기 (텍스트 또는 CSV)
- **모바일**: 대화방 → 메뉴 → 설정(⚙) → 대화 내용 내보내기 → 텍스트만 보내기

카카오톡 버전에 따라 메뉴 위치와 파일 형식이 조금 다를 수 있습니다. 파싱이 안 되면 파일 앞부분 몇 줄(개인정보는 가리고)을 알려 주세요.

## 사용

```bash
# 대화 정보 + 내가 아직 답 안 한 메시지
kakao-reply show exports/민수.txt --me 철수

# 요약과 답장 초안 3개
kakao-reply suggest exports/민수.txt --me 철수
kakao-reply suggest exports/팀.txt --me 철수 --ask "내일 오전까지는 어렵다고 정중하게"

# 실제로 보낼 내용만 확인 (API 호출 안 함)
kakao-reply suggest exports/민수.txt --me 철수 --dry-run
```

`--me` 는 내보낸 파일에 표시된 본인 이름입니다. 파일에 `나`로 찍혀 있으면 생략해도 됩니다.

출력 예:

```
■ 요약
민수가 토요일 점심 약속을 제안했고, 12시 강남역을 물어본 상태.

■ 답해야 할 것
  - 12시 강남역 괜찮은지
  - 가고 싶은 식당

■ 답장 초안
  1. [가볍게] 좋아 12시 강남역 콜! 먹고 싶은 거 있어?
  2. [제안형] 12시 좋아~ 근처에 [식당] 어때?
  3. [시간 조정] 혹시 12시 반 괜찮아? 조금 늦을 수도 있어서
```

## 구조

```
kakao_reply/
  parser.py    내보내기 파일 파서 (PC·Android·iOS 텍스트, CSV) — 표준 라이브러리만 사용
  analyzer.py  Claude API 호출: 구조화 출력(JSON 스키마)으로 요약/미응답/답장 초안
  secrets.py   키체인에서 API 키 조회·저장
  cli.py       명령줄 인터페이스
tests/         unittest + 형식별 샘플 파일
```

- 모델: `claude-opus-5-5`, effort `medium`. 안전 분류기가 거절하면 서버 측 fallback(`fallbacks: "default"`)으로 다른 모델이 이어 받습니다.
- 대화 내용은 `<chat>` 태그 안의 **데이터**로만 다루도록 지시해, 대화 속 문장이 지시문처럼 동작하지 않게 합니다.
- 답장은 **초안만** 만들고 자동 전송하지 않습니다. 보내는 건 사용자가 직접.

## 테스트

```bash
python3 -m unittest -v
```
