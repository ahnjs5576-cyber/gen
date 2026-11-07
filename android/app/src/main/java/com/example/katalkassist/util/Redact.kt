package com.example.katalkassist.util

import android.util.Log

/**
 * Privacy-by-design logging. Names and message bodies must never reach logcat
 * in the clear, because logs can be read by `adb` and crash reporters.
 */
object Redact {

    private const val TAG = "KatalkAssist"

    /** Keep first char, mask the rest: "민수" -> "민*", "Alice" -> "A****". */
    fun name(value: String?): String {
        if (value.isNullOrEmpty()) return "∅"
        return value.first() + "*".repeat((value.length - 1).coerceAtLeast(1))
    }

    /** Never log body text; log only its length. */
    fun body(value: String?): String = "<${value?.length ?: 0} chars>"

    fun d(message: () -> String) {
        if (Log.isLoggable(TAG, Log.DEBUG)) Log.d(TAG, message())
    }

    fun w(message: String, t: Throwable? = null) = Log.w(TAG, message, t)
}
