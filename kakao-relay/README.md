# kakao-relay

카카오톡 PC의 로컬 대화 DB(`chatLogs_*.edb`)를 **읽음 표시 없이** 읽어서,
`!`로 시작하는 메시지를 지시로 해석하고 PC에서 처리한 뒤, 결과를 **텔레그램**으로 보내는 서비스.

> ⚠️ **먼저 읽으세요 — 반드시 알아야 할 제약**
>
> - 이 방식은 카카오 공식 기능이 아니라 로컬 DB를 직접 복호화합니다. **본인 PC·본인 계정에 한해** 사용하세요.
> - 대화 DB는 채팅방마다 다른 키로 암호화돼 있고, 그 키는 **실행 중인 카카오톡 메모리에서만** 얻을 수 있습니다.
>   현재 공개된 분석 기준으로, 키를 얻으려면 **그 채팅방을 한 번 열어야** 합니다(=그 순간 한 번은 읽음 처리됨).
>   → 지시받을 방을 **최초 1회만 열어 키를 확보**하면, 이후로는 읽음 표시 없이 읽습니다.
> - 카카오톡 PC가 **업데이트로 암호화 방식을 바꾸면** 키 확보/복호화가 깨질 수 있습니다. 그때는 재분석이 필요합니다.
> - 이 저장소는 **키 확보 도구를 직접 포함하지 않습니다.** 키는 외부 도구(예: MoniKa)로 추출해 `keys.json`에 넣습니다.
>   아래 "1. 키 확보" 참고.

## 동작 개요

```
[키 추출] KakaoTalk.exe 메모리 스캔 → keyspec 후보 → edb 시험 복호화 → keys.json
         (최초 1회 + 키 깨질 때. py run.py --extract-keys)
        │
카카오톡 PC (실행 중)
  chat_data/chatLogs_<chatId>.edb (+ -wal)   ← 새 메시지가 계속 쌓임(방 안 열어도)
        │  (SQLCipher4, 방마다 다른 키)
        ▼
  [watcher]  파일 변경 감지
        ▼
  [kakaodb]  읽기전용 사본 열어 복호화 → logId 워터마크 이후 새 메시지만 추출
        ▼
  [parser]   허용된 방/발신자 + '!' 로 시작하는 메시지만 통과
        ▼
  [dispatcher] → handlers (program / files / memo / ai)
        ▼
  [notify]   결과를 텔레그램으로 전송
        │
  [health]   키 불일치·장시간 무신호 시 텔레그램 경고 (조용한 고장 방지)
```

## 설치 (윈도우)

```powershell
# Python 3.11+ 필요
py -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

`requirements.txt`의 `sqlcipher3-binary`가 SQLCipher 복호화를 담당합니다.
(설치 안 되면 README 하단 "복호화 백엔드" 참고)

## 설정

1. `config.example.toml` → `config.toml` 로 복사하고 값을 채웁니다.
2. 텔레그램 봇: `@BotFather`로 봇 생성 → `bot_token`. 봇과 대화 시작 후 `chat_id` 확인
   (`https://api.telegram.org/bot<token>/getUpdates`).
3. AI 해석을 쓰려면 `[claude] api_key` 에 Anthropic API 키.

## 1. 키 확보 (`keys.json`)

대화 DB 키는 실행 중인 카카오톡 메모리에만 있습니다. 이 저장소는 **키 추출기를 내장**합니다
(`--extract-keys`). 실행 중인 `KakaoTalk.exe` 메모리를 스캔해 SQLCipher keyspec 후보를 모으고,
각 방 edb 에 시험 복호화해서 맞는 키만 `keys.json`에 저장합니다.

### 자동 추출 (권장)

```powershell
# 1) 카카오톡 PC 로그인 상태로 실행
# 2) 지시받을 방(특정인 톡방, 단톡방)을 각각 한 번씩 연다  ← 키를 메모리에 올리는 유일한 단계이자, 읽음 처리되는 유일한 순간
# 3) (가능하면 관리자 권한 PowerShell에서) 추출 실행
py run.py --extract-keys
```

출력 예:

```
=== 키 추출 결과 ===
수집한 키 후보: 37개
확정된 방: 2개 → ['123456789', '987654321']
저장: ...\keys.json
```

- **못 찾은 방**이 있으면, 그 방을 카톡에서 한 번 더 연 뒤 `--extract-keys`를 다시 실행하세요.
  (키는 그 방이 열려 있을 때만 메모리에 있습니다.)
- 한 번 확보한 키는 보통 재시작/신규 메시지에도 유지된다는 보고가 있습니다(계정·버전마다 다를 수 있음).
  복호화가 깨지면 다시 추출하세요.
- 대상 방을 `config [filter] allowed_chat_ids` 로 지정하면 그 방만 추출합니다(비우면 모든 방 시도).
- 추출이 `KakaoTalk.exe`를 못 찾거나 `OpenProcess 실패`가 나면 **관리자 권한**으로 다시 실행하세요.
  프로세스 이름이 다르면 `config [kakao] process_name` 을 조정합니다.

### 수동 입력 (대안)

[MoniKa](https://github.com/maxswjeon/MoniKa) 등 외부 도구로 뽑은 키를 직접 넣어도 됩니다:

```json
{
  "123456789": "a1b2c3...(64 또는 96 hex)",
  "987654321": "d4e5f6..."
}
```

- 64 hex(키 32바이트)면 DB 선두 16바이트 salt 자동 사용, 96 hex(키 32 + salt 16)면 그대로 사용.

> `keys.json`에는 실제 키가 들어갑니다. **절대 커밋하지 마세요.** (`.gitignore`에 포함)

### 동작 원리와 한계

- 카톡이 대화방을 열 때 SQLCipher raw key(keyspec `x'<키><salt>'`)를 메모리에 올립니다.
  추출기는 `OpenProcess(VM_READ)` 로 그 문자열을 읽어 후보로 모은 뒤, edb 에 시험 복호화해 방과 매칭합니다.
- 카톡 PC가 업데이트로 keyspec 형식이나 암호화 방식을 바꾸면 스캔 패턴/파라미터 조정이 필요할 수 있습니다.
- 본인 PC·본인 계정 데이터에 한해 사용하세요.

## 2. 스키마 확인 (최초 1회 권장)

카카오톡 버전마다 테이블/컬럼명이 다를 수 있습니다. 먼저 확인하세요:

```powershell
py run.py --inspect
```

방별로 복호화에 성공한 DB의 테이블·컬럼을 출력합니다.
출력이 `config.toml [kakao.cipher]`의 `table`, `col_*` 와 다르면 맞게 수정하세요.

## 3. 실행

```powershell
py run.py
```

- 처음 실행 시 각 방의 **현재 최신 logId를 워터마크로 저장**하고, 그 이후 메시지만 처리합니다(과거 폭주 방지).
- 지시 예시(방에서 전송):
  - `!실행 notepad.exe` → 화이트리스트에 있으면 실행
  - `!메모 우유 사기` → `memo.md`에 추가
  - `!파일 목록 C:\work` → 파일 루트 안이면 폴더 목록
  - `!오늘 받은 견적서 바탕화면으로 모아줘` → AI가 해석해 처리(키 설정 시)
- 결과는 텔레그램으로 옵니다. (카톡으로 답하면 그 방이 읽음 처리되므로 안 함)

## 보안 기본값 (중요)

- `!실행`은 `[handlers] allowed_programs` **화이트리스트에 있는 것만** 실행. 비어 있으면 전부 거부.
- 파일 작업은 `[handlers] file_root` **하위 경로만** 허용.
- 발신자 제한(`[filter] allowed_user_ids`)을 걸면 그 사람이 보낸 `!`명령만 실행.
- AI 해석 결과도 위 두 가드(화이트리스트·루트)를 **똑같이** 통과해야 실행됩니다.

## 복호화 백엔드

기본은 `sqlcipher3-binary`(PyPI 휠). 설치가 안 되면:
- `pysqlcipher3` + 시스템 SQLCipher, 또는
- `sqlcipher.exe`를 받아 `config.toml [kakao] sqlcipher_exe` 에 경로 지정(해당 백엔드로 폴백).

## 한계

- 알림을 꺼둔 방/한 번도 키를 확보 안 한 방은 읽을 수 없습니다.
- 긴 메시지·사진·파일은 DB에 텍스트/첨부 메타로 저장되는 범위까지만 읽습니다.
- 개발/테스트는 윈도우 카카오톡 환경에서 직접 검증이 필요합니다(리눅스/CI에서 DB 복호화는 재현 불가).
