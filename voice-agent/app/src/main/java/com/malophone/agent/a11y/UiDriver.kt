package com.malophone.agent.a11y

import android.view.accessibility.AccessibilityNodeInfo

// STUB — 구현 담당: a11y 에이전트.
object UiDriver {
    val service: AgentAccessibilityService? get() = AgentAccessibilityService.instance
    val isReady: Boolean get() = service != null
    fun rootNode(): AccessibilityNodeInfo? = null
    fun currentPackage(): String? = null
    fun screenWidth(): Int = 0
    fun screenHeight(): Int = 0
    suspend fun waitForPackage(packageName: String, timeoutMs: Long = 6_000): Boolean = false
    suspend fun waitForNode(timeoutMs: Long = 3_000, predicate: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo? = null
    suspend fun waitForIdle(quietMs: Long = 400, timeoutMs: Long = 3_000) {}
    fun findAll(root: AccessibilityNodeInfo? = rootNode(), predicate: (AccessibilityNodeInfo) -> Boolean): List<AccessibilityNodeInfo> = emptyList()
    fun findFirst(root: AccessibilityNodeInfo? = rootNode(), predicate: (AccessibilityNodeInfo) -> Boolean): AccessibilityNodeInfo? = null
    suspend fun click(node: AccessibilityNodeInfo): Boolean = false
    suspend fun longClick(node: AccessibilityNodeInfo): Boolean = false
    suspend fun tap(x: Float, y: Float): Boolean = false
    suspend fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, durationMs: Long = 300): Boolean = false
    suspend fun setText(node: AccessibilityNodeInfo, text: String): Boolean = false
    suspend fun scroll(forward: Boolean, node: AccessibilityNodeInfo? = null): Boolean = false
    suspend fun pressEnter(node: AccessibilityNodeInfo? = null): Boolean = false
    fun back(): Boolean = false
    fun home(): Boolean = false
    fun recents(): Boolean = false
}
