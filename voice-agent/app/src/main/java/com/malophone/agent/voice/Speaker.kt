package com.malophone.agent.voice

import android.content.Context

// STUB — 구현 담당: ui/voice 에이전트.
object Speaker {
    fun init(context: Context) {}
    fun say(text: String) {}
    suspend fun sayAndWait(text: String, timeoutMs: Long = 15_000) {}
    fun stop() {}
}
