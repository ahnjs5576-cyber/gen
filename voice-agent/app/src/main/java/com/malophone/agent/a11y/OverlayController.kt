package com.malophone.agent.a11y

// STUB — 구현 담당: a11y 에이전트.
class OverlayController(private val service: AgentAccessibilityService) {
    fun showBubble() {}
    fun hideBubble() {}
    fun showStatus(text: String) {}
    suspend fun confirm(title: String, detail: String, timeoutMs: Long = 30_000): Boolean = false
    fun destroy() {}
}
