package com.example.katalkassist.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {

    @Insert
    suspend fun insert(message: MessageEntity): Long

    /**
     * Most recent message per room, newest first — drives the room list.
     * The representative row is the latest by TIME (receivedAt), tie-broken by id.
     * (Not MAX(id): imported rows are inserted later but carry old timestamps, so
     * id-order != time-order once a room mixes live + imported messages.)
     */
    @Query(
        """
        SELECT * FROM messages m
        WHERE m.id = (
            SELECT id FROM messages
            WHERE roomKey = m.roomKey
            ORDER BY receivedAt DESC, id DESC
            LIMIT 1
        )
        ORDER BY m.receivedAt DESC
        """
    )
    fun roomSummaries(): Flow<List<MessageEntity>>

    /** Full thread for one room, oldest first. */
    @Query("SELECT * FROM messages WHERE roomKey = :roomKey ORDER BY receivedAt ASC")
    fun thread(roomKey: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE roomKey = :roomKey ORDER BY receivedAt DESC LIMIT :limit")
    suspend fun recent(roomKey: String, limit: Int): List<MessageEntity>

    /**
     * Delete live-captured rows older than [cutoff] — enforces the retention window.
     * Imported rows are exempt (they carry historical timestamps and are kept until
     * the user clears them explicitly).
     */
    @Query("DELETE FROM messages WHERE receivedAt < :cutoff AND imported = 0")
    suspend fun prune(cutoff: Long)

    @Query("DELETE FROM messages")
    suspend fun clearAll()

    @Query("DELETE FROM messages WHERE roomKey = :roomKey")
    suspend fun clearRoom(roomKey: String)
}
