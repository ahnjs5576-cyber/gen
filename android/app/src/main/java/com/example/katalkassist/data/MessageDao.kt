package com.example.katalkassist.data

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface MessageDao {

    @Insert
    suspend fun insert(message: MessageEntity): Long

    /** Most recent message per room, newest first — drives the room list. */
    @Query(
        """
        SELECT * FROM messages
        WHERE id IN (SELECT MAX(id) FROM messages GROUP BY roomKey)
        ORDER BY receivedAt DESC
        """
    )
    fun roomSummaries(): Flow<List<MessageEntity>>

    /** Full thread for one room, oldest first. */
    @Query("SELECT * FROM messages WHERE roomKey = :roomKey ORDER BY receivedAt ASC")
    fun thread(roomKey: String): Flow<List<MessageEntity>>

    @Query("SELECT * FROM messages WHERE roomKey = :roomKey ORDER BY receivedAt DESC LIMIT :limit")
    suspend fun recent(roomKey: String, limit: Int): List<MessageEntity>

    /** Delete anything older than [cutoff] — enforces the retention window. */
    @Query("DELETE FROM messages WHERE receivedAt < :cutoff")
    suspend fun prune(cutoff: Long)

    @Query("DELETE FROM messages")
    suspend fun clearAll()

    @Query("DELETE FROM messages WHERE roomKey = :roomKey")
    suspend fun clearRoom(roomKey: String)
}
