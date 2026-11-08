# 카톡 답장 도우미 (Android)

카카오톡 대화를 읽어 답장 초안을 제안하는 안드로이드 앱입니다.

## 설계 원칙 — 맥 방식과 다른 점

처음 구상하신 맥 방식은 "앱이 저장한 로컬 DB를 읽기 전용으로 조회"하는 것이었습니다.
**안드로이드에서는 이 방식을 정당하게 구현할 수 없습니다.**

- 카카오톡 DB는 `/data/data/com.kakao.talk/` 안의 **앱 전용 샌드박스**에 있어
  다른 앱이 접근하려면 **루팅 + 샌드박스 우회**가 필요합니다.
- 그 DB는 **암호화**되어 있고 공개 API가 없어, 읽으려면 **카카오톡의 암호화를
  역공학/우회**해야 합니다 — 이는 "다른 사람의 암호화를 우회하면 안 된다"는 원칙 위반입니다.

그래서 이 앱은 안드로이드가 **공식 제공**하는 경로만 씁니다.

| 역할 | 맥 방식 | 이 앱 (안드로이드) |
|---|---|---|
| **읽기** | 로컬 DB 조회 | `NotificationListenerService` — 사용자가 설정에서 켠 뒤, OS가 넘겨주는 카톡 **알림**의 발신자·방·메시지를 읽음 |
| **쓰기** | 화면 제어 | 알림의 `RemoteInput` **직접 답장** 액션 (워치 답장과 동일한 공식 API) |
| **최신성** | 앱 동기화 | 알림 수신 시점(실시간) |
| **키 보관** | OS 비밀 저장소 | Android Keystore 기반 `EncryptedSharedPreferences` |

### 트레이드오프 (솔직하게)
- 알림 기반이라 **알림에 뜨는 범위**까지만 읽힙니다. 뮤트/알림 끈 방, 지나간 과거
  대화는 들어오지 않습니다.
- 앱이 알림을 요약/묶어 올리면 일부 메시지만 보일 수 있습니다.
- 대신 루팅·우회 없이 Play 스토어 정책에 맞는 깨끗한 구조입니다.

## 모듈 구조

```
service/KatalkNotificationListener.kt  ← 읽기(실시간): 알림 파싱 (MessagingStyle 우선)
service/ReplyActionCache.kt            ← 방별 직접답장 핸들(RemoteInput) 캐시
service/ReplySender.kt                 ← 쓰기: RemoteInput으로 전송
importer/KakaoExportParser.kt          ← 읽기(과거): 공식 '대화 내보내기' .txt 파서
importer/ImportManager.kt              ← 내보내기 파일 → Room 저장
reply/ReplyDrafter.kt                  ← 답장 초안 인터페이스 + 오프라인 템플릿
reply/RemoteReplyDrafter.kt            ← LLM(Claude Messages API) 드래프터
data/*                                 ← Room DB (본인 기기 내 보관, 보존기간 제한)
util/Prefs.kt                          ← 설정 + 암호화 키 저장(Keystore)
util/Redact.kt                         ← 로그에서 이름·본문 가림
ui/*                                   ← Jetpack Compose 화면 (목록/대화/설정)
```

읽기(로컬 데이터 조회) · 쓰기(공식 답장 API) · 최신성(알림 수신)을 **분리**한다는
원래 원칙은 그대로 유지됩니다. 과거 전체 맥락은 **공식 내보내기 파일**로 보완합니다.

## 두 개의 읽기 소스

| 소스 | 범위 | 실시간성 | 방식 |
|---|---|---|---|
| 알림 리스너 | 알림에 뜨는 새 메시지 | 실시간 | `NotificationListenerService` |
| 내보내기 import | 그 방의 과거 전체(또는 긴) 히스토리 | 수동(사용자가 파일 선택) | 공식 '대화 내보내기' .txt 파싱 |

둘 다 루팅·복호화 없이, 안드로이드/카카오톡이 **정당하게 내주는 데이터**만 씁니다.
두 소스는 **방 이름을 같은 `roomKey`로** 저장하므로, 내보내기로 가져온 과거 대화가 같은 이름의
실시간 방에 합쳐져 답장 생성의 맥락으로 함께 쓰입니다.

## LLM 답장 생성 (Claude)

- 설정 화면에서 **Anthropic API 키**를 입력하면(암호화 저장소에 보관), 대화 맥락을
  `api.anthropic.com`에 보내 답장 후보 3개를 받습니다. 키가 없거나 꺼져 있으면
  자동으로 **오프라인 템플릿**으로 동작하고, LLM 호출이 실패해도 템플릿으로 폴백합니다.
- 모델 기본값은 `claude-opus-5-5`(고품질). 이 용도에는 **`claude-haiku-5-5`가
  저렴·빠름** — 설정에서 전환 가능. 응답은 `effort: low`로 빠르게 받습니다.
- **가명화(기본 ON):** LLM에 보내기 전에 실제 이름을 `상대/상대2…`로 치환해
  식별정보를 최소화합니다.
- ⚠️ 이 구조는 앱이 기기에서 사용자 본인의 키로 Claude를 직접 호출합니다. 개인용으로는
  괜찮지만, 배포용이라면 키가 단말에 실리지 않도록 **자체 백엔드로 프록시**하세요.

## 개인정보 보호 (기본값)

- **네트워크는 LLM 켤 때만** — `INTERNET` 권한은 오직 `RemoteReplyDrafter`가
  `api.anthropic.com`을 호출할 때만 쓰입니다. LLM을 끄면(기본값) 아무 데이터도 기기 밖으로
  나가지 않습니다.
- **보존기간 제한** — `Prefs.retentionHours`(기본 24h). `0`이면 저장 자체를 하지 않는
  휘발 모드.
- **방 화이트리스트** — 설정에서 캡처할 방 이름을 지정(비우면 전체). `Prefs.allowedRooms`로
  저장되고 알림 리스너가 이 목록으로 거릅니다.
- **전송 분리(기본 ON)** — `manualSendOnly`가 켜져 있으면 '전송' 버튼을 숨기고 '복사'만
  제공합니다. 초안은 앱이 만들고, 전송은 카톡에서 직접 — 대화방이 '읽음'으로 바뀌는 부작용을
  피합니다. 설정에서 끄면 알림 직접답장으로 앱에서 바로 보냅니다.
- **로그 가림** — `Redact`가 이름/본문을 로그에 남기지 않음.
- **키는 Keystore** — API 키는 `EncryptedSharedPreferences`에만.

## 답장 생성 구조

`ReplyDrafter` 인터페이스 뒤에 두 구현이 있습니다.

- `TemplateReplyDrafter` — 오프라인 휴리스틱(네트워크 無). 키 없이 바로 동작.
- `RemoteReplyDrafter` — Claude Messages API 호출(키 필요). 가명화 후 전송.

`MainViewModel`이 `Prefs.llmReady()`를 보고 둘 중 하나를 고르며, 원격 실패 시 템플릿으로
폴백합니다. 다른 LLM(사내 API 등)으로 바꾸려면 `ReplyDrafter`를 하나 더 구현해 끼우면 됩니다.

## 빌드

Android Studio(Giraffe+)에서 `android/` 폴더를 열면 됩니다.
Gradle Wrapper(`gradlew` + `gradle/wrapper/gradle-wrapper.jar`)가 포함돼 있어 바로 빌드됩니다:

```bash
cd android
./gradlew assembleDebug
```

> ⚠️ 이 저장소는 Android SDK가 없는 환경에서 작성돼 **실제 컴파일 검증은 하지 못했습니다.**
> 순수 로직인 내보내기 파서는 별도 테스트로 검증했고, 나머지는 정적 리뷰로 점검했습니다.
> 첫 빌드에서 의존성/버전 조정이 필요할 수 있습니다.

`minSdk 28 (Android 9.0)`, `targetSdk 34`.

## 설치 후 사용

1. 앱 실행 → "설정에서 알림 접근 켜기" → 목록에서 **카톡 답장 도우미** 허용.
2. 카카오톡으로 새 메시지가 오면 앱 '대화' 목록에 쌓입니다.
3. 방을 열면 답장 제안이 뜨고, **전송**(직접 답장 가능할 때) 또는 **복사**로 보냅니다.
