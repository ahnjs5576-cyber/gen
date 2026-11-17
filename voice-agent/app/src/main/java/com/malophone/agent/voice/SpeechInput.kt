package com.malophone.agent.voice

import android.content.Context

// STUB — 구현 담당: ui/voice 에이전트.
sealed interface SpeechOutcome {
    data class Text(val best: String, val alternatives: List<String>) : SpeechOutcome
    data class Error(val code: Int, val message: String) : SpeechOutcome
    data object Cancelled : SpeechOutcome
}

class SpeechInput(private val context: Context) {
    suspend fun listenOnce(onPartial: (String) -> Unit = {}, onLevel: (Float) -> Unit = {}): SpeechOutcome = SpeechOutcome.Cancelled
    fun stop() {}
    fun destroy() {}

    companion object {
        fun isAvailable(context: Context): Boolean = false
    }
}
