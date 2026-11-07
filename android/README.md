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
service/KatalkNotificationListener.kt  ← 읽기: 알림 파싱 (MessagingStyle 우선)
service/ReplyActionCache.kt            ← 방별 직접답장 핸들(RemoteInput) 캐시
service/ReplySender.kt                 ← 쓰기: RemoteInput으로 전송
data/*                                 ← Room DB (본인 기기 내 보관, 보존기간 제한)
reply/ReplyDrafter.kt                  ← 답장 초안 생성 (기본: 오프라인 템플릿)
util/Prefs.kt                          ← 설정 + 암호화 키 저장
util/Redact.kt                         ← 로그에서 이름·본문 가림
ui/*                                   ← Jetpack Compose 화면
```

읽기(로컬 데이터 조회) · 쓰기(공식 답장 API) · 최신성(알림 수신)을 **분리**한다는
원래 원칙은 그대로 유지됩니다.

## 개인정보 보호 (기본값)

- **인터넷 권한 없음** — 기본 템플릿 드래프터는 네트워크를 쓰지 않아 데이터가 기기 밖으로
  나가지 않습니다. 원격 LLM을 붙일 때만 `INTERNET` 권한을 직접 추가하세요(감사 가능).
- **보존기간 제한** — `Prefs.retentionHours`(기본 24h). `0`이면 저장 자체를 하지 않는
  휘발 모드.
- **방 화이트리스트** — `Prefs.allowedRooms`에 담긴 방만 캡처(비어 있으면 전체).
- **전송 분리** — `manualSendOnly` 기본 켜짐 권장. 초안만 만들고 전송은 사용자가.
- **로그 가림** — `Redact`가 이름/본문을 로그에 남기지 않음.
- **키는 Keystore** — API 키는 `EncryptedSharedPreferences`에만.

## 답장 생성 확장 (LLM 연결)

기본은 오프라인 `TemplateReplyDrafter`입니다. LLM을 붙이려면:

1. `ReplyDrafter`를 구현한 `RemoteReplyDrafter`를 추가.
2. 키는 `Prefs.llmApiKey`(암호화 저장소)에서 읽기.
3. `AndroidManifest.xml`에 `<uses-permission android:name="android.permission.INTERNET"/>` 추가.
4. 보낼 컨텍스트에서 이름 등 식별정보를 최소화(가명화) 후 전송 권장.

## 빌드

Android Studio(Giraffe+)에서 `android/` 폴더를 열면 됩니다.
Gradle Wrapper jar는 저장소에 포함하지 않았으니, 최초 1회:

```bash
cd android
gradle wrapper        # 로컬에 gradle이 있으면
# 또는 Android Studio가 자동 생성
./gradlew assembleDebug
```

`minSdk 28 (Android 9.0)`, `targetSdk 34`.

## 설치 후 사용

1. 앱 실행 → "설정에서 알림 접근 켜기" → 목록에서 **카톡 답장 도우미** 허용.
2. 카카오톡으로 새 메시지가 오면 앱 '대화' 목록에 쌓입니다.
3. 방을 열면 답장 제안이 뜨고, **전송**(직접 답장 가능할 때) 또는 **복사**로 보냅니다.
