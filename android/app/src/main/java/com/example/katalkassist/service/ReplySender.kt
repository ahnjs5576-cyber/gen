package com.example.katalkassist.service

import android.app.RemoteInput
import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.example.katalkassist.util.Redact

/**
 * The "write" side. Sends text back through the notification's direct-reply
 * action — the same path a smartwatch reply uses. No screen control, no
 * accessibility hacks, no simulated taps.
 *
 * Returns true if the reply was dispatched. If the handle has expired (the
 * notification was dismissed/updated), returns false and the UI should fall
 * back to manual send.
 */
object ReplySender {

    fun send(context: Context, roomKey: String, text: String): Boolean {
        val handle = ReplyActionCache.get(roomKey) ?: return false
        return try {
            val intent = Intent()
            val results = Bundle().apply { putCharSequence(handle.resultKey, text) }
            RemoteInput.addResultsToIntent(arrayOf(handle.remoteInput), intent, results)
            handle.pendingIntent.send(context, 0, intent)
            Redact.d { "reply sent room=${Redact.name(roomKey)} len=${text.length}" }
            // A reply typically updates the notification; drop the stale handle.
            ReplyActionCache.remove(roomKey)
            true
        } catch (e: Exception) {
            Redact.w("reply send failed", e)
            ReplyActionCache.remove(roomKey)
            false
        }
    }

    fun canSend(roomKey: String): Boolean = ReplyActionCache.get(roomKey) != null
}
