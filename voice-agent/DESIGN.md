# 말로폰 (Malophone) — 설계와 모듈 계약

음성(한국어)으로 안드로이드 폰을 조작하는 앱. 사용자는 STT로 말하므로 띄어쓰기·받침 오류가 많다고 가정한다.

## 흐름

```
[트리거]  플로팅 마이크 버튼 / 빠른 설정 타일 / 접근성 버튼 / 홈 길게 누르기(ASSIST) / 앱 안 마이크 버튼
   │
   ▼
VoiceActivity (반투명 창, SpeechRecognizer ko-KR) ──텍스트──▶ CommandRouter.submit()
                                                                │  (App.appScope에서 실행, 창은 즉시 닫힘)
                                                                ▼
                        RuleParser.parse() 확실? ──yes──▶ ActionExecutor.execute(Action)
                                │no / alwaysUseAi                 │ 화면 조작 실패 + API 키 있음
                                ▼                                 ▼
                        ClaudeAgent.run(text) ◀───────────────────┘
                          ├─ 고수준 도구(open_app, youtube_play, kakao_send_message …) → ActionExecutor
                          └─ 화면 도구(read_screen, tap, type_text, scroll, press …) → UiDriver/ScreenSnapshot
```

전송·전화처럼 되돌릴 수 없는 동작은 `Confirmer.confirm()`이 접근성 오버레이로 확인 창을 띄운다(설정에서 끌 수 있음).

## 패키지와 담당

| 패키지 | 파일 | 담당 |
|---|---|---|
| `core` | Action, ActionResult, AppSettings, StatusBus, Confirmer, ActionExecutor, CommandRouter | 완성(수정 시 계약 유지) |
| `parse` | KoreanText(완성), RuleParser | parse |
| `a11y` | AgentAccessibilityService, OverlayController, UiDriver, NodeExt, ScreenSnapshot | a11y |
| `actions` | AppLauncher, YouTubeActions, KakaoTalkAutomation, SystemActions | actions |
| `ai` | ClaudeAgent (+ 자유롭게 보조 파일) | ai |
| `voice` | Speaker, SpeechInput | ui |
| `ui`, `tile` | MainActivity, VoiceActivity, 테마/컴포넌트, VoiceTileService | ui |

**규칙: 자기 담당 파일만 고친다. 다른 패키지의 공개 시그니처(아래 계약)는 바꾸지 않는다.** 새 공개 함수를 추가하는 건 자기 패키지 안에서만. 보조 파일은 자기 패키지 폴더에 새로 만들어도 된다.

## 공개 계약 (시그니처 고정)

### core (이미 구현됨)
```kotlin
sealed interface Action { OpenApp(appName) | YouTubePlay(query) | YouTubeSearch(query) | KakaoOpenChat(room)
  | KakaoSendMessage(room, message) | Call(target) | SetAlarm(hour, minute, label?) | SetTimer(seconds)
  | WebSearch(query) | GoBack | GoHome | ScreenTask(goal) }
fun Action.describe(): String;  fun Action.isScreenAutomation(): Boolean
data class ParseResult(val actions: List<Action>, val confident: Boolean)
data class ActionResult(ok, message, speak: String? = null, userCancelled = false)
  // ActionResult.ok(msg, speak?) / fail(msg, speak?) / cancelled(msg)
  // speak == null → message를 읽음, speak == "" → 읽지 않음
enum class ConfirmResult { YES, NO, UNAVAILABLE }
object Confirmer { suspend fun confirm(title, detail, spoken): ConfirmResult }
object StatusBus { phase: StateFlow<Phase>; logs: StateFlow<List<LogEntry>>; statusLine: StateFlow<String>
  fun setPhase(Phase); fun log(LogEntry.Kind, String); fun clear() }
enum class Phase { IDLE, LISTENING, THINKING, ACTING, CONFIRMING, DONE, ERROR }
class AppSettings(context)  // claudeApiKey, claudeModel, effort, confirmBeforeSend, youtubeApiKey,
                            // alwaysUseAi, speakFeedback, showBubble, maxAgentSteps, bubbleX/Y, hasClaudeKey, prefs
object ActionExecutor { suspend fun execute(context, action): ActionResult }
object CommandRouter { fun submit(context, text); fun cancel(); val isBusy; suspend fun handle(context, text) }
App.instance.appScope / App.instance.settings
```

### parse
```kotlin
object KoreanText { normalize, decomposeJamo, choseong, levenshtein, similarity, matchScore(query, candidate),
                    parseKoreanNumber(s): Int?, stripTrailingParticle(word) }   // 완성
object RuleParser { fun parse(text: String): ParseResult? }                     // 순수 Kotlin
```

### a11y
```kotlin
class AgentAccessibilityService : AccessibilityService {
  lateinit var overlay: OverlayController   // instance가 세팅되기 전에 초기화되어 있어야 함
  companion object { @Volatile var instance: AgentAccessibilityService? (private set)
                     fun isEnabled(context): Boolean; fun openSettings(context) }
}
class OverlayController(service) {
  fun showBubble(); fun hideBubble(); fun showStatus(text: String)
  suspend fun confirm(title: String, detail: String, timeoutMs: Long = 30_000): Boolean
  fun destroy()
}
// NodeExt.kt
val AccessibilityNodeInfo.textOrEmpty / descOrEmpty / label / viewIdName : String
fun AccessibilityNodeInfo.bounds(): Rect
fun AccessibilityNodeInfo.clickableAncestor(): AccessibilityNodeInfo?   // 자신 포함, 위로 올라가며 isClickable
fun AccessibilityNodeInfo.isEditTextLike(): Boolean
object UiDriver {
  val service: AgentAccessibilityService?; val isReady: Boolean
  fun rootNode(): AccessibilityNodeInfo?          // 활성 앱 창의 루트(우리 오버레이 제외)
  fun currentPackage(): String?
  fun screenWidth(): Int; fun screenHeight(): Int
  suspend fun waitForPackage(packageName, timeoutMs = 6_000): Boolean
  suspend fun waitForNode(timeoutMs = 3_000, predicate): AccessibilityNodeInfo?
  suspend fun waitForIdle(quietMs = 400, timeoutMs = 3_000)
  fun findAll(root = rootNode(), predicate): List<AccessibilityNodeInfo>
  fun findFirst(root = rootNode(), predicate): AccessibilityNodeInfo?
  suspend fun click(node): Boolean                 // 클릭 가능한 조상에 ACTION_CLICK, 실패 시 중심 좌표 제스처 탭
  suspend fun longClick(node): Boolean
  suspend fun tap(x: Float, y: Float): Boolean
  suspend fun swipe(x1, y1, x2, y2, durationMs = 300): Boolean
  suspend fun setText(node, text): Boolean         // ACTION_SET_TEXT, 실패 시 포커스 + 클립보드 붙여넣기
  suspend fun scroll(forward: Boolean, node: AccessibilityNodeInfo? = null): Boolean
  suspend fun pressEnter(node: AccessibilityNodeInfo? = null): Boolean
  fun back(): Boolean; fun home(): Boolean; fun recents(): Boolean
}
class ScreenSnapshot(packageName: String?, text: String, nodes: Map<Int, AccessibilityNodeInfo>) {
  fun node(id: Int): AccessibilityNodeInfo?
  companion object { fun capture(maxNodes: Int = 200): ScreenSnapshot? }
}
```

### actions
```kotlin
object AppLauncher { data class AppInfo(label, packageName)
  fun installedApps(context): List<AppInfo>; fun find(context, name): AppInfo?
  fun launchPackage(context, packageName): Boolean
  fun startActivitySafely(context, intent): Boolean   // NEW_TASK, 접근성 서비스 컨텍스트 우선, 예외 삼킴
  suspend fun open(context, name): ActionResult }
object YouTubeActions { const val PACKAGE
  suspend fun play(context, query, apiKey: String?): ActionResult
  suspend fun search(context, query): ActionResult
  suspend fun findVideoId(query, apiKey: String?): String?
  fun parseFirstVideoId(html: String): String? }      // 순수 함수
object KakaoTalkAutomation { const val PACKAGE = "com.kakao.talk"
  suspend fun openChat(context, room): ActionResult
  suspend fun sendMessage(context, room, message, confirm: suspend (room, message) -> ConfirmResult): ActionResult }
object SystemActions {
  fun setAlarm(context, hour, minute, label: String?): ActionResult
  fun setTimer(context, seconds): ActionResult
  suspend fun call(context, target, confirm: suspend (who, number) -> ConfirmResult): ActionResult
  fun webSearch(context, query): ActionResult }
```

### ai
```kotlin
class ClaudeAgent(context: Context, settings: AppSettings) {
  suspend fun run(utterance: String, hint: String? = null): ActionResult
}
```

### voice / ui / tile
```kotlin
object Speaker { fun init(context); fun say(text); suspend fun sayAndWait(text, timeoutMs = 15_000); fun stop() }
sealed interface SpeechOutcome { Text(best, alternatives) | Error(code, message) | Cancelled }
class SpeechInput(context) { suspend fun listenOnce(onPartial = {}, onLevel = {}): SpeechOutcome; fun stop(); fun destroy()
  companion object { fun isAvailable(context): Boolean } }
class VoiceActivity { companion object { const val EXTRA_TEXT = "text"; fun start(context: Context) } }
class MainActivity; class VoiceTileService : TileService
```

## 공통 원칙

- 스레드: `UiDriver`의 함수는 어느 디스패처에서 불러도 안전해야 한다(오버레이·제스처는 내부에서 Main으로 전환).
  네트워크(유튜브 검색, Claude API)는 `Dispatchers.IO`. `SpeechRecognizer`·`TextToSpeech` 콜백은 Main.
- 백그라운드 액티비티 실행: 접근성 서비스가 켜져 있으면 시스템이 바인딩한 서비스로서 예외가 적용되므로,
  액티비티는 가능하면 `AgentAccessibilityService.instance` 컨텍스트로 `FLAG_ACTIVITY_NEW_TASK`와 함께 띄운다
  (`AppLauncher.startActivitySafely`).
- 사용자에게 보이는 문구는 모두 한국어, 존댓말, 짧게.
- 실패는 예외를 던지지 말고 `ActionResult.fail("무엇이 왜 안 됐는지")`로 돌려준다. 단 `CancellationException`은 다시 던진다.
- `AccessibilityNodeInfo`는 `recycle()`하지 않는다(API 33+에서 불필요, 이전 버전에서도 GC에 맡김) — 재사용 버그 방지.
- 개인정보: 화면 내용은 AI 경로에서만, 그 순간의 텍스트만 Claude API로 보낸다. 로그에 API 키를 남기지 않는다.
