package kr.phonebutler.agent

import android.app.SearchManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.accessibilityservice.AccessibilityService
import kotlinx.coroutines.delay
import kr.phonebutler.Prefs
import kr.phonebutler.access.PhoneAccessibilityService
import kr.phonebutler.notify.NotificationStore

/**
 * Claude가 쓸 수 있는 휴대폰 조작 도구들.
 * 화면을 바꾸는 도구는 실행 후 바뀐 화면을 함께 돌려줘서 왕복 횟수를 줄인다.
 */
class PhoneTools(private val ctx: Context) {

    private val svc: PhoneAccessibilityService? get() = PhoneAccessibilityService.instance

    // ───────── 실행 ─────────

    suspend fun run(name: String, input: Map<String, Any?>): ToolOutput {
        AgentRuntime.log("🔧 $name ${input.entries.joinToString(" ") { "${it.key}=${it.value}" }}".take(200))
        return try {
            when (name) {
                "read_screen" -> needSvc { ToolOutput(it.readScreen().text) }
                "screenshot" -> needSvc { s ->
                    val snap = s.readScreen()
                    val img = s.screenshotWithMarks(snap)
                    if (img == null) ToolOutput("스크린샷을 찍지 못했어요(Android 11 이상 필요 또는 보안 화면). 화면 목록:\n" + snap.text)
                    else ToolOutput("빨간 상자 숫자 = 요소 번호. 아래 목록과 같은 번호다.\n" + snap.text, img)
                }
                "tap", "long_press" -> needSvc { s ->
                    val long = name == "long_press"
                    val el = input.int("element")?.let { s.element(it) ?: return@needSvc ToolOutput("${it}번 요소가 없어요. read_screen으로 다시 확인하세요.", isError = true) }
                    val ok = if (el != null) s.tapElement(el, long) else {
                        val x = input.int("x"); val y = input.int("y")
                        if (x == null || y == null) return@needSvc ToolOutput("element 또는 x,y가 필요해요.", isError = true)
                        s.tapAt(x.toFloat(), y.toFloat(), long)
                    }
                    afterAction(s, if (ok) "눌렀어요." else "누르기에 실패했어요.", 700)
                }
                "type_text" -> needSvc { s ->
                    val el = input.int("element")?.let { s.element(it) }
                    val msg = s.typeText(el, input.str("text") ?: "", input["append"] == true)
                    afterAction(s, msg, 400)
                }
                "press_key" -> needSvc { s ->
                    val key = input.str("key")
                    val ok = when (key) {
                        "back" -> s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
                        "home" -> s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_HOME)
                        "recents" -> s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_RECENTS)
                        "notifications" -> s.performGlobalAction(AccessibilityService.GLOBAL_ACTION_NOTIFICATIONS)
                        "enter" -> s.pressEnter()
                        else -> false
                    }
                    afterAction(s, if (ok) "$key 키를 눌렀어요." else "$key 키를 누르지 못했어요" + if (key == "enter") "(입력창에 커서가 없거나 Android 11 미만). 검색 버튼을 tap 하세요." else ".", 800)
                }
                "scroll" -> needSvc { s ->
                    val el = input.int("element")?.let { s.element(it) }
                    val ok = s.scroll(el, input.str("direction") ?: "down")
                    afterAction(s, if (ok) "스크롤했어요." else "스크롤에 실패했어요.", 600)
                }
                "swipe" -> needSvc { s ->
                    val ok = s.swipe(
                        (input.int("x1") ?: 0).toFloat(), (input.int("y1") ?: 0).toFloat(),
                        (input.int("x2") ?: 0).toFloat(), (input.int("y2") ?: 0).toFloat(),
                        (input.int("duration_ms") ?: 350).toLong().coerceIn(50, 3000))
                    afterAction(s, if (ok) "쓸어 넘겼어요." else "실패했어요.", 600)
                }
                "open_app" -> openApp(input.str("name") ?: "")
                "youtube_search" -> youtubeSearch(input.str("query") ?: "")
                "open_url" -> openUrl(input.str("url") ?: "")
                "wait" -> {
                    val sec = ((input["seconds"] as? Number)?.toDouble() ?: 1.0).coerceIn(0.2, 8.0)
                    delay((sec * 1000).toLong())
                    svc?.let { ToolOutput(it.readScreen().text) } ?: ToolOutput("기다렸어요.")
                }
                "list_notifications" -> listNotifications(input.str("app"))
                "reply_notification" -> replyNotification(input.int("id"), input.str("text") ?: "")
                "ask_user" -> {
                    val answer = AgentRuntime.askUser(input.str("question") ?: "")
                    ToolOutput(if (answer.isNullOrBlank()) "(사용자가 대답하지 않았어요)" else "사용자 대답: \"$answer\"")
                }
                else -> ToolOutput("알 수 없는 도구: $name", isError = true)
            }
        } catch (e: kotlinx.coroutines.CancellationException) {
            throw e
        } catch (e: Exception) {
            ToolOutput("도구 실행 오류: ${e.javaClass.simpleName}: ${e.message}", isError = true)
        }
    }

    /** 첫 메시지에 넣을 현재 화면 */
    fun currentScreen(): String = svc?.readScreen()?.text
        ?: "(접근성 서비스가 꺼져 있어서 화면을 읽을 수 없음. 앱 열기·유튜브 검색·알림 답장만 가능)"

    // ───────── 개별 구현 ─────────

    private suspend fun afterAction(s: PhoneAccessibilityService, msg: String, settleMs: Long): ToolOutput {
        delay(settleMs)
        return ToolOutput("$msg\n\n[바뀐 화면]\n" + s.readScreen().text)
    }

    private suspend fun needSvc(block: suspend (PhoneAccessibilityService) -> ToolOutput): ToolOutput {
        val s = svc ?: return ToolOutput(
            "접근성 서비스가 꺼져 있어서 화면을 조작할 수 없어요. 사용자에게 폰비서 앱에서 접근성을 켜 달라고 말하세요.",
            isError = true)
        return block(s)
    }

    private suspend fun launched(msg: String, waitMs: Long = 1500): ToolOutput {
        delay(waitMs)
        val s = svc ?: return ToolOutput(msg)
        return ToolOutput("$msg\n\n[바뀐 화면]\n" + s.readScreen().text)
    }

    private suspend fun openApp(name: String): ToolOutput {
        val match = AppFinder.find(ctx, name)
            ?: return ToolOutput("'$name' 앱을 찾지 못했어요. 비슷한 앱: ${AppFinder.suggest(ctx, name).joinToString(", ").ifEmpty { "없음" }}", isError = true)
        val intent = ctx.packageManager.getLaunchIntentForPackage(match.pkg)
            ?: return ToolOutput("${match.label} 앱을 열 수 없어요.", isError = true)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(intent)
        return launched("${match.label} 앱을 열었어요.")
    }

    private suspend fun youtubeSearch(q: String): ToolOutput {
        val yt = "com.google.android.youtube"
        val installed = try { ctx.packageManager.getPackageInfo(yt, 0); true } catch (_: PackageManager.NameNotFoundException) { false }
        val intent = if (installed) {
            Intent(Intent.ACTION_SEARCH).setPackage(yt).putExtra(SearchManager.QUERY, q)
        } else {
            Intent(Intent.ACTION_VIEW, Uri.parse("https://m.youtube.com/results?search_query=" + Uri.encode(q)))
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        ctx.startActivity(intent)
        return launched("유튜브에서 '$q' 검색 결과를 열었어요.", 2200)
    }

    private suspend fun openUrl(url: String): ToolOutput {
        val uri = Uri.parse(url.trim())
        val ok = uri.scheme?.lowercase() in setOf("http", "https", "tel", "geo", "market", "mailto", "smsto", "sms", "vnd.youtube")
        if (!ok) return ToolOutput("이 주소 형식은 열 수 없어요: $url", isError = true)
        val action = if (uri.scheme == "tel") Intent.ACTION_DIAL else Intent.ACTION_VIEW
        ctx.startActivity(Intent(action, uri).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        return launched("열었어요: $url")
    }

    private fun listNotifications(app: String?): ToolOutput {
        if (!NotificationStore.listenerConnected) {
            return ToolOutput("알림 접근 권한이 꺼져 있어서 알림을 볼 수 없어요. 앱에서 직접 확인해야 해요.", isError = true)
        }
        val list = NotificationStore.recent(app)
        if (list.isEmpty()) return ToolOutput("폰비서가 켜진 뒤로 받은 ${app ?: ""} 메시지 알림이 없어요.")
        return ToolOutput("최근 메시지 알림(오래된 것 → 최신):\n" + list.joinToString("\n") { it.describe() })
    }

    private suspend fun replyNotification(id: Int?, text: String): ToolOutput {
        val item = id?.let { NotificationStore.get(it) } ?: return ToolOutput("그 번호의 알림이 없어요.", isError = true)
        val target = NotificationStore.latestReplyable(item)
            ?: return ToolOutput("이 알림은 바로 답장을 지원하지 않아요. 앱을 열어서 보내세요.", isError = true)
        if (text.isBlank()) return ToolOutput("보낼 내용이 비어 있어요.", isError = true)
        val who = target.room.ifEmpty { target.sender }
        if (Prefs.confirmBeforeSend) {
            val answer = AgentRuntime.askUser("${who}에게 \"$text\" 라고 보낼까요?")
            if (!Confirm.isYes(answer)) {
                return ToolOutput("사용자가 보내지 말라고 했거나 대답이 없어서 보내지 않았어요. (대답: ${answer ?: "없음"}) 다른 내용으로 보내 달라고 했다면 그 내용으로 다시 시도하세요.")
            }
        }
        val ok = NotificationStore.reply(ctx, target, text)
        return if (ok) ToolOutput("${who}에게 \"$text\" 보냈어요.")
        else ToolOutput("알림 답장이 실패했어요(알림이 만료됨). 앱을 열어서 보내세요.", isError = true)
    }

    // ───────── 헬퍼 ─────────

    private fun Map<String, Any?>.int(k: String): Int? = when (val v = this[k]) {
        is Number -> v.toInt()
        is String -> v.trim().toIntOrNull()
        else -> null
    }
    private fun Map<String, Any?>.str(k: String): String? = this[k]?.toString()
}

/** 음성 대답이 '네'인지 판단 */
object Confirm {
    private val no = listOf("아니", "아뇨", "취소", "보내지 마", "보내지마", "하지 마", "하지마", "말고", "그만", "잠깐", "싫어", "no", "stop")
    private val yes = listOf("응", "네", "예", "보내", "좋아", "그래", "맞아", "ㅇㅇ", "yes", "ok", "오케이", "고고", "해줘", "해 줘", "부탁", "그렇게")
    private val shortYes = Regex("^(어+|응+|엉+|웅+|넵|네+|예+|넹|ㅇ+)[.!~ ]*$")

    fun isYes(answer: String?): Boolean {
        val a = answer?.trim()?.lowercase() ?: return false
        if (a.isEmpty()) return false
        if (no.any { a.contains(it) }) return false
        return shortYes.matches(a) || yes.any { a.contains(it) }
    }
}
