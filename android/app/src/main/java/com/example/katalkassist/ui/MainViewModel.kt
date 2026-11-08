package com.example.katalkassist.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.katalkassist.App
import com.example.katalkassist.data.MessageEntity
import com.example.katalkassist.importer.ImportManager
import com.example.katalkassist.reply.RemoteReplyDrafter
import com.example.katalkassist.reply.ReplySuggestion
import com.example.katalkassist.reply.TemplateReplyDrafter
import com.example.katalkassist.service.ReplyActionCache
import com.example.katalkassist.service.ReplySender
import com.example.katalkassist.util.Prefs
import com.example.katalkassist.util.Redact
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.flowOf
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainViewModel(app: Application) : AndroidViewModel(app) {

    private val repo = App.instance.repository
    val prefs = Prefs(app)
    private val template = TemplateReplyDrafter()
    private val remote = RemoteReplyDrafter(prefs)
    private val importer = ImportManager(app, repo, prefs)

    /** True while a draft request (esp. the LLM one) is in flight. */
    val loadingSuggestions = MutableStateFlow(false)

    val rooms: StateFlow<List<MessageEntity>> =
        repo.roomSummaries().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    private val selectedRoom = MutableStateFlow<String?>(null)

    @OptIn(kotlinx.coroutines.ExperimentalCoroutinesApi::class)
    val thread: StateFlow<List<MessageEntity>> =
        selectedRoom.flatMapLatest { key ->
            if (key == null) flowOf(emptyList()) else repo.thread(key)
        }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), emptyList())

    val suggestions = MutableStateFlow<List<ReplySuggestion>>(emptyList())

    /** Bumps when a direct-reply handle appears/expires, so the UI recomputes "can send". */
    val replyHandleVersion: StateFlow<Int> = ReplyActionCache.changes

    fun selectRoom(roomKey: String?) {
        selectedRoom.value = roomKey
        suggestions.value = emptyList()
        if (roomKey != null) refreshSuggestions(roomKey)
    }

    /** Re-generate suggestions for the open room (e.g. after new messages arrive). */
    fun reSuggest() {
        selectedRoom.value?.let { refreshSuggestions(it) }
    }

    private fun refreshSuggestions(roomKey: String) {
        viewModelScope.launch {
            loadingSuggestions.value = true
            try {
                // All drafting + the encrypted-pref read runs off the main thread.
                suggestions.value = withContext(Dispatchers.IO) {
                    val recent = repo.recent(roomKey, limit = 20).reversed() // oldest first
                    if (prefs.llmReady()) {
                        // LLM first; fall back to the offline template on any failure.
                        runCatching { remote.draft(recent) }
                            .onFailure { Redact.w("remote drafter failed, using template") }
                            .getOrNull()
                            ?.takeIf { it.isNotEmpty() }
                            ?: template.draft(recent)
                    } else {
                        template.draft(recent)
                    }
                }
            } finally {
                loadingSuggestions.value = false
            }
        }
    }

    fun importExport(uri: android.net.Uri, onDone: (String) -> Unit) {
        viewModelScope.launch {
            // Ephemeral mode means "don't persist to disk" — importing would violate
            // that (imported rows are exempt from prune, so they'd persist forever).
            if (prefs.retentionHours == 0) {
                onDone("휘발 모드에서는 가져오기가 저장되지 않아요. 설정에서 보존 시간을 1시간 이상으로 바꿔주세요.")
                return@launch
            }
            val msg = runCatching { importer.importFrom(uri) }
                .map { "‘${it.roomName}’에서 ${it.imported}개 메시지를 가져왔어요" }
                .getOrElse { "가져오기 실패: ${it.message}" }
            onDone(msg)
        }
    }

    fun saveSettings(
        apiKey: String?, useLlm: Boolean, model: String,
        pseudonymize: Boolean, retentionHours: Int, myName: String,
        manualSendOnly: Boolean, allowedRooms: Set<String>
    ) {
        // Off the main thread: writing llmApiKey touches EncryptedSharedPreferences.
        viewModelScope.launch(Dispatchers.IO) {
            if (apiKey != null) prefs.llmApiKey = apiKey.trim().ifBlank { null }
            prefs.useLlm = useLlm
            prefs.modelId = model
            prefs.pseudonymize = pseudonymize
            prefs.retentionHours = retentionHours
            prefs.myDisplayName = myName.trim()
            prefs.manualSendOnly = manualSendOnly
            prefs.allowedRooms = allowedRooms
        }
    }

    /** True if a working direct-reply handle exists for the selected room. */
    fun canSend(roomKey: String): Boolean = ReplySender.canSend(roomKey)

    /** Returns true if dispatched; false → caller should copy & send manually. */
    fun send(context: android.content.Context, roomKey: String, text: String): Boolean {
        val ok = ReplySender.send(context, roomKey, text)
        if (ok && prefs.retentionHours > 0) {   // honor ephemeral mode: don't persist
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
