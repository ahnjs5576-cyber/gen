package com.example.katalkassist.service

import android.app.Notification
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import com.example.katalkassist.App
import com.example.katalkassist.data.MessageEntity
import com.example.katalkassist.data.Repository
import com.example.katalkassist.util.Prefs
import com.example.katalkassist.util.Redact
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/**
 * The "read" side.
 *
 * Android delivers KakaoTalk's notifications here ONLY after the user enables
 * this listener in system settings. We parse sender / room / text from the
 * notification — we do not touch KakaoTalk's database or any encrypted storage.
 *
 * We also capture the notification's direct-reply action (RemoteInput), which
 * is the "write" side — the same official mechanism a smartwatch uses to reply.
 */
class KatalkNotificationListener : NotificationListenerService() {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private lateinit var repo: Repository
    private lateinit var prefs: Prefs

    override fun onCreate() {
        super.onCreate()
        repo = App.instance.repository
        prefs = Prefs(this)
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return
        if (sbn.packageName != KAKAO_PACKAGE) return

        val notification = sbn.notification ?: return
        // KakaoTalk posts a persistent "running" foreground notification too;
        // skip anything that isn't an actual message.
        if (notification.flags and Notification.FLAG_ONGOING_EVENT != 0) return

        val parsed = parse(notification) ?: return

        // Opt-in room filter: only capture rooms the user chose (empty = all).
        val allowed = prefs.allowedRooms
        if (allowed.isNotEmpty() && parsed.roomName !in allowed) return

        // Capture the reply handle (may be null for summary notifications).
        val handle = ReplyActionCache.fromAction(firstReplyAction(notification))
        if (handle != null) ReplyActionCache.put(parsed.roomKey, handle)

        scope.launch {
            // Ephemeral mode: retention 0 means "don't persist at all".
            if (prefs.retentionHours > 0) {
                repo.add(
                    MessageEntity(
                        roomKey = parsed.roomKey,
                        roomName = parsed.roomName,
                        sender = parsed.sender,
                        text = parsed.text,
                        receivedAt = sbn.postTime,
                        canReply = handle != null
                    )
                )
                repo.prune(prefs.retentionHours * 3_600_000L)
            }
            Redact.d {
                "msg room=${Redact.name(parsed.roomName)} " +
                    "from=${Redact.name(parsed.sender)} " +
                    "text=${Redact.body(parsed.text)} reply=${handle != null}"
            }
        }
    }

    private data class Parsed(
        val roomKey: String,
        val roomName: String,
        val sender: String,
        val text: String
    )

    /**
     * Prefer MessagingStyle (group chats carry per-message sender + conversation
     * title there). Fall back to the plain title/text extras for simple ones.
     */
    private fun parse(n: Notification): Parsed? {
        val extras: Bundle = n.extras ?: return null

        Notification.MessagingStyle.extractMessagingStyleFromNotification(n)?.let { style ->
            val last = style.messages.lastOrNull() ?: return@let
            val room = style.conversationTitle?.toString()
                ?: extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
                ?: return@let
            val text = last.text?.toString()?.takeIf { it.isNotBlank() } ?: return@let
            val sender = last.senderPerson?.name?.toString()
                ?: last.sender?.toString()
                ?: room
            return Parsed(roomKey = room, roomName = room, sender = sender, text = text)
        }

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: return null
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?.takeIf { it.isNotBlank() } ?: return null
        // In 1:1 chats KakaoTalk puts the sender in the title; sub-text (if any)
        // is the room. Keep it simple: title identifies the conversation.
        return Parsed(roomKey = title, roomName = title, sender = title, text = text)
    }

    private fun firstReplyAction(n: Notification): Notification.Action? =
        n.actions?.firstOrNull { action ->
            action.remoteInputs?.any { it.allowFreeFormInput } == true
        }

    override fun onListenerConnected() {
        Redact.d { "listener connected" }
    }

    override fun onDestroy() {
        scope.cancel()
        super.onDestroy()
    }

    companion object {
        const val KAKAO_PACKAGE = "com.kakao.talk"

        /** Is this listener currently enabled by the user? */
        fun isEnabled(context: Context): Boolean {
            val flat = android.provider.Settings.Secure.getString(
                context.contentResolver, "enabled_notification_listeners"
            ) ?: return false
            val me = "${context.packageName}/${KatalkNotificationListener::class.java.name}"
            return flat.split(":").any { it.equals(me, ignoreCase = true) }
        }

        /** Intent to the system screen where the user turns it on. */
        fun settingsIntent(): Intent =
            Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
}
