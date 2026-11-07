package com.example.katalkassist.data

import kotlinx.coroutines.flow.Flow

class Repository(private val dao: MessageDao) {

    fun roomSummaries(): Flow<List<MessageEntity>> = dao.roomSummaries()

    fun thread(roomKey: String): Flow<List<MessageEntity>> = dao.thread(roomKey)

    suspend fun recent(roomKey: String, limit: Int = 20): List<MessageEntity> =
        dao.recent(roomKey, limit)

    suspend fun add(message: MessageEntity): Long = dao.insert(message)

    suspend fun prune(retentionMillis: Long) {
        dao.prune(System.currentTimeMillis() - retentionMillis)
    }

    suspend fun clearAll() = dao.clearAll()

    suspend fun clearRoom(roomKey: String) = dao.clearRoom(roomKey)
}
