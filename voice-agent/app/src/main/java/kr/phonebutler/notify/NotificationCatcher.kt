package kr.phonebutler.notify

import android.app.Notification
import android.os.Build
import android.os.Bundle
import android.os.Parcelable
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification

/** 카카오톡·문자 등 메시지 알림을 받아 NotificationStore에 넣는다. */
class NotificationCatcher : NotificationListenerService() {

    override fun onListenerConnected() {
        NotificationStore.listenerConnected = true
        try { activeNotifications?.forEach { handle(it) } } catch (_: Exception) {}
    }

    override fun onListenerDisconnected() {
        NotificationStore.listenerConnected = false
    }

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        try { handle(sbn) } catch (_: Exception) {}
    }

    private fun handle(sbn: StatusBarNotification) {
        if (sbn.packageName == packageName) return
        val n = sbn.notification ?: return
        if (n.flags and Notification.FLAG_GROUP_SUMMARY != 0) return
        if (n.flags and Notification.FLAG_ONGOING_EVENT != 0) return // 음악 재생, 다운로드 등
        val ex = n.extras ?: return

        val title = ex.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
        val subText = ex.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString().orEmpty()
        val conv = ex.getCharSequence(Notification.EXTRA_CONVERSATION_TITLE)?.toString().orEmpty()
        var text = ex.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: ex.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
        var sender = title

        // MessagingStyle이면 마지막 메시지를 쓴다
        val msgs = messages(ex)
        if (msgs.isNotEmpty()) {
            val last = msgs.last()
            last.getCharSequence("text")?.let { text = it.toString() }
            val person = if (Build.VERSION.SDK_INT >= 28) {
                @Suppress("DEPRECATION")
                (last.getParcelable<android.app.Person>("sender_person"))?.name?.toString()
            } else null
            (person ?: last.getCharSequence("sender")?.toString())?.takeIf { it.isNotBlank() }?.let { sender = it }
        }

        // 카카오톡 단톡방: 제목=보낸 사람, subText(또는 conversationTitle)=방 이름 / 1:1: 제목=상대 이름
        val room = conv.ifEmpty { subText.ifEmpty { title } }
        val reply = n.actions?.firstOrNull { a -> a.remoteInputs?.any { it.allowFreeFormInput } == true }
        val appName = try {
            packageManager.getApplicationLabel(packageManager.getApplicationInfo(sbn.packageName, 0)).toString()
        } catch (_: Exception) { sbn.packageName }

        // 메시지형 알림이 아니고 답장도 안 되는 알림(광고, 시스템 알림)은 짧게만 보관
        if (text.isBlank() && title.isBlank()) return
        NotificationStore.add(sbn.packageName, appName, room, sender, text.take(500), sbn.postTime, reply)
    }

    private fun messages(ex: Bundle): List<Bundle> {
        @Suppress("DEPRECATION")
        val arr: Array<Parcelable>? = ex.getParcelableArray(Notification.EXTRA_MESSAGES)
        return arr?.mapNotNull { it as? Bundle } ?: emptyList()
    }
}
