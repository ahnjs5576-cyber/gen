package com.example.katalkassist.data

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * One incoming message as seen in a KakaoTalk notification.
 *
 * This is the user's OWN device data, captured from notifications the OS
 * delivered to us with the user's explicit consent. We never read KakaoTalk's
 * database and never decrypt anything.
 *
 * Retention is bounded — see [MessageDao.prune]. Transcripts are not kept
 * forever; the default window is short and configurable.
 */
@Entity(
    tableName = "messages",
    indices = [Index("roomKey"), Index("receivedAt")]
)
data class MessageEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,

    /** Stable-ish key for a conversation: the notification's conversation title. */
    val roomKey: String,

    /** Human-readable room/chat name as shown in the notification. */
    val roomName: String,

    /** Sender display name (null/"" for 1:1 where title == sender). */
    val sender: String,

    /** The message text. */
    val text: String,

    /** Epoch millis we received it. */
    val receivedAt: Long,

    /** True if this notification carried a working direct-reply action. */
    val canReply: Boolean,

    /**
     * True when this row represents OUR last sent reply (so the UI can compute
     * "is the last message mine?"). Populated when we send via RemoteInput.
     */
    val isMine: Boolean = false,

    /**
     * True for rows brought in from an official export import. Imported rows carry
     * HISTORICAL timestamps, so they must be exempt from the time-based retention
     * prune (which keys off receivedAt) — otherwise the first live message would
     * wipe the imported history the import was meant to provide.
     */
    val imported: Boolean = false
)
