package com.malophone.agent.a11y

import android.view.accessibility.AccessibilityNodeInfo

// STUB — 구현 담당: a11y 에이전트.
class ScreenSnapshot(
    val packageName: String?,
    val text: String,
    private val nodes: Map<Int, AccessibilityNodeInfo>,
) {
    fun node(id: Int): AccessibilityNodeInfo? = nodes[id]

    companion object {
        fun capture(maxNodes: Int = 200): ScreenSnapshot? = null
    }
}
