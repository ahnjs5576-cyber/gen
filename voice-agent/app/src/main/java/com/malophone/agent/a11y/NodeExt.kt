package com.malophone.agent.a11y

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo

// STUB — 구현 담당: a11y 에이전트.
val AccessibilityNodeInfo.textOrEmpty: String get() = text?.toString().orEmpty()
val AccessibilityNodeInfo.descOrEmpty: String get() = contentDescription?.toString().orEmpty()
val AccessibilityNodeInfo.label: String get() = textOrEmpty.ifBlank { descOrEmpty }
val AccessibilityNodeInfo.viewIdName: String get() = viewIdResourceName?.substringAfter(":id/").orEmpty()
fun AccessibilityNodeInfo.bounds(): Rect = Rect().also { getBoundsInScreen(it) }
fun AccessibilityNodeInfo.clickableAncestor(): AccessibilityNodeInfo? = null
fun AccessibilityNodeInfo.isEditTextLike(): Boolean = isEditable
