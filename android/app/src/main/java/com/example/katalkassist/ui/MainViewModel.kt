package com.example.katalkassist.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.katalkassist.App
import com.example.katalkassist.data.MessageEntity
import com.example.katalkassist.reply.ReplySuggestion
import com.example.katalkassist.reply.TemplateReplyDrafter
import com.example.katalkassist.service.ReplySender
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {

    private val repo = App.instance.repository
    private val drafter = TemplateReplyDrafter()

    val rooms: StateFlow<List<MessageEntity>> =
        repo.roomSummaries().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val selectedRoom = MutableStateFlow<String?>(null)

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val thread: StateFlow<List<MessageEntity>> =
        selectedRoom.flatMapLatest { key ->
            if (key == null) flowOf(emptyList()) else repo.thread(key)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val suggestions = MutableStateFlow<List<ReplySuggestion>>(emptyList())

    fun selectRoom(roomKey: String?) {
        selectedRoom.value = roomKey
        suggestions.value = emptyList()
        if (roomKey != null) refreshSuggestions(roomKey)
    }

    private fun refreshSuggestions(roomKey: String) {
        viewModelScope.launch {
            val recent = repo.recent(roomKey, limit = 20).reversed() // oldest first
            suggestions.value = drafter.draft(recent)
        }
    }

    /** True if a working direct-reply handle exists for the selected room. */
    fun canSend(roomKey: String): Boolean = ReplySender.canSend(roomKey)

    /** Returns true if dispatched; false → caller should copy & send manually. */
    fun send(context: android.content.Context, roomKey: String, text: String): Boolean {
        val ok = ReplySender.send(context, roomKey, text)
        if (ok) {
            viewModelScope.launch {
                repo.add(
                    MessageEntity(
                        roomKey = roomKey,
                        roomName = rooms.value.firstOrNull { it.roomKey == roomKey }?.roomName ?: roomKey,
                        sender = "나",
                        text = text,
                        receivedAt = System.currentTimeMillis(),
                        canReply = false,
                        isMine = true
                    )
                )
            }
        }
        return ok
    }

    fun clearRoom(roomKey: String) {
        viewModelScope.launch { repo.clearRoom(roomKey) }
    }

    fun clearAll() {
        viewModelScope.launch { repo.clearAll() }
    }
}
