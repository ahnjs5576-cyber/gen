package com.example.katalkassist.service

import android.app.Notification
import android.app.PendingIntent
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

/**
 * Holds the most recent direct-reply handle per room.
 *
 * A notification's reply [PendingIntent] + [android.app.RemoteInput] cannot be
 * persisted (they belong to KakaoTalk's process and expire when the
 * notification is dismissed/updated). So we keep only the latest, in memory.
 * If it's gone, the UI falls back to "copy draft, send manually".
 */
object ReplyActionCache {

    data class Handle(
        val pendingIntent: PendingIntent,
        val remoteInput: android.app.RemoteInput,
        val resultKey: String,
        val capturedAt: Long = System.currentTimeMillis()
    )

    private val handles = HashMap<String, Handle>()

    /** Bumped whenever the handle set changes, so UI can recompute send-availability. */
    private val _changes = MutableStateFlow(0)
    val changes: StateFlow<Int> = _changes

    @Synchronized
    fun put(roomKey: String, handle: Handle) {
        handles[roomKey] = handle
        _changes.value++
    }

    @Synchronized
    fun get(roomKey: String): Handle? = handles[roomKey]

    @Synchronized
    fun remove(roomKey: String) {
        if (handles.remove(roomKey) != null) _changes.value++
    }

    /** Extract a usable reply handle from an action, or null if it isn't one. */
    fun fromAction(action: Notification.Action?): Handle? {
        val remoteInput = action?.remoteInputs?.firstOrNull { it.allowFreeFormInput } ?: return null
        return Handle(
            pendingIntent = action.actionIntent ?: return null,
            remoteInput = remoteInput,
            resultKey = remoteInput.resultKey
        )
    }
}
