package kr.phonebutler.notify

import android.app.Notification
import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.os.Bundle
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** 최근에 온 메시지 알림 한 개 */
class MessageItem(
    val id: Int,
    val pkg: String,
    val appName: String,
    val room: String,
    val sender: String,
    val text: String,
    val time: Long,
    val replyAction: Notification.Action?,
) {
    fun describe(): String {
        val t = SimpleDateFormat("M/d HH:mm", Locale.KOREA).format(Date(time))
        val where = if (room.isNotEmpty() && room != sender) "방=\"$room\" 보낸사람=\"$sender\"" else "보낸사람=\"$sender\""
        return "[$id] $appName $where $t: \"$text\"" + if (replyAction != null) " (바로답장 가능)" else ""
    }
}

/**
 * 알림으로 들어온 메시지를 메모리에만 잠깐 보관한다(앱을 끄면 사라짐).
 * 알림의 '답장' 버튼(RemoteInput)을 그대로 써서 앱을 열지 않고 답장할 수 있다.
 */
object NotificationStore {
    private const val MAX = 120
    private val items = ArrayDeque<MessageItem>()
    private var nextId = 1
    @Volatile var listenerConnected = false

    @Synchronized
    fun add(pkg: String, appName: String, room: String, sender: String, text: String, time: Long, reply: Notification.Action?) {
        if (text.isBlank()) return
        // 같은 알림이 갱신되며 여러 번 오는 경우 중복 제거
        if (items.any { it.pkg == pkg && it.room == room && it.sender == sender && it.text == text }) {
            // 답장 액션은 최신 것으로 갱신
            if (reply != null) {
                val idx = items.indexOfLast { it.pkg == pkg && it.room == room && it.text == text }
                if (idx >= 0) {
                    val o = items[idx]
                    items[idx] = MessageItem(o.id, o.pkg, o.appName, o.room, o.sender, o.text, o.time, reply)
                }
            }
            return
        }
        items.addLast(MessageItem(nextId++, pkg, appName, room, sender, text, time, reply))
        while (items.size > MAX) items.removeFirst()
    }

    @Synchronized
    fun recent(appFilter: String?, limit: Int = 30): List<MessageItem> {
        val f = appFilter?.trim()?.lowercase()?.takeIf { it.isNotEmpty() }
        return items.filter {
            f == null || it.appName.lowercase().contains(f) || it.pkg.lowercase().contains(f) || matchesAlias(f, it.pkg)
        }.takeLast(limit)
    }

    @Synchronized
    fun get(id: Int): MessageItem? = items.firstOrNull { it.id == id }

    /** 같은 대화방의 가장 최근 답장 가능한 알림 (오래된 알림의 답장 버튼은 무효일 수 있어서) */
    @Synchronized
    fun latestReplyable(item: MessageItem): MessageItem? =
        items.lastOrNull { it.pkg == item.pkg && it.room == item.room && it.replyAction != null } ?: item.takeIf { it.replyAction != null }

    private fun matchesAlias(f: String, pkg: String): Boolean {
        val kakao = listOf("카톡", "카카오", "kakao")
        val sms = listOf("문자", "메시지", "sms")
        return when {
            kakao.any { f.contains(it) } -> pkg == "com.kakao.talk"
            sms.any { f.contains(it) } -> pkg.contains("messaging") || pkg.contains("mms") || pkg.contains("message")
            else -> false
        }
    }

    /** 알림의 답장 버튼으로 text를 보낸다. */
    fun reply(ctx: Context, item: MessageItem, text: String): Boolean {
        val action = item.replyAction ?: return false
        val inputs = action.remoteInputs ?: return false
        val intent = Intent()
        val results = Bundle()
        for (ri in inputs) results.putCharSequence(ri.resultKey, text)
        RemoteInput.addResultsToIntent(inputs, intent, results)
        return try {
            action.actionIntent.send(ctx, 0, intent)
            true
        } catch (e: Exception) {
            false
        }
    }
}
