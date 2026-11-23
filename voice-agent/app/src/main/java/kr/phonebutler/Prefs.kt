package kr.phonebutler

import android.content.Context
import android.content.SharedPreferences

/** 앱 설정. API 키는 이 앱만 읽을 수 있는 내부 저장소에 보관된다. */
object Prefs {
    private lateinit var sp: SharedPreferences

    fun init(ctx: Context) {
        sp = ctx.getSharedPreferences("phonebutler", Context.MODE_PRIVATE)
    }

    var apiKey: String
        get() = sp.getString("api_key", "") ?: ""
        set(v) = sp.edit().putString("api_key", v.trim()).apply()

    /** claude-opus-5-5 | claude-sonnet-5-5 | claude-haiku-5-5 */
    var model: String
        get() = sp.getString("model", "claude-opus-5-5") ?: "claude-opus-5-5"
        set(v) = sp.edit().putString("model", v).apply()

    /** low | medium | high */
    var effort: String
        get() = sp.getString("effort", "low") ?: "low"
        set(v) = sp.edit().putString("effort", v).apply()

    var confirmBeforeSend: Boolean
        get() = sp.getBoolean("confirm_send", true)
        set(v) = sp.edit().putBoolean("confirm_send", v).apply()

    var showBubble: Boolean
        get() = sp.getBoolean("show_bubble", true)
        set(v) = sp.edit().putBoolean("show_bubble", v).apply()

    var speakReplies: Boolean
        get() = sp.getBoolean("speak_replies", true)
        set(v) = sp.edit().putBoolean("speak_replies", v).apply()

    var bubbleY: Int
        get() = sp.getInt("bubble_y", -1)
        set(v) = sp.edit().putInt("bubble_y", v).apply()
}
