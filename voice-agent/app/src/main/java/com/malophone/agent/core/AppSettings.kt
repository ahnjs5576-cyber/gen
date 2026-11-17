package com.malophone.agent.core

import android.content.Context
import android.content.SharedPreferences

/**
 * 앱 설정. 이 기기의 앱 전용 저장소(SharedPreferences)에만 저장된다.
 * API 키는 저장소 밖으로 나가지 않고, Claude API를 부를 때만 사용된다.
 */
class AppSettings(context: Context) {

    val prefs: SharedPreferences =
        context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    var claudeApiKey: String
        get() = prefs.getString(KEY_CLAUDE_API_KEY, "").orEmpty()
        set(value) = prefs.edit().putString(KEY_CLAUDE_API_KEY, value.trim()).apply()

    var claudeModel: String
        get() = prefs.getString(KEY_CLAUDE_MODEL, DEFAULT_MODEL) ?: DEFAULT_MODEL
        set(value) = prefs.edit().putString(KEY_CLAUDE_MODEL, value).apply()

    /** "low" | "medium" | "high" — 낮을수록 빠르고 싸다. */
    var effort: String
        get() = prefs.getString(KEY_EFFORT, DEFAULT_EFFORT) ?: DEFAULT_EFFORT
        set(value) = prefs.edit().putString(KEY_EFFORT, value).apply()

    /** 카카오톡 전송·전화 걸기 전에 확인 창을 띄운다. */
    var confirmBeforeSend: Boolean
        get() = prefs.getBoolean(KEY_CONFIRM, true)
        set(value) = prefs.edit().putBoolean(KEY_CONFIRM, value).apply()

    /** 선택: YouTube Data API 키. 없으면 검색 페이지에서 첫 영상을 찾는다. */
    var youtubeApiKey: String
        get() = prefs.getString(KEY_YOUTUBE_API_KEY, "").orEmpty()
        set(value) = prefs.edit().putString(KEY_YOUTUBE_API_KEY, value.trim()).apply()

    /** 켜면 규칙 파서가 알아들어도 항상 Claude가 해석한다. */
    var alwaysUseAi: Boolean
        get() = prefs.getBoolean(KEY_ALWAYS_AI, false)
        set(value) = prefs.edit().putBoolean(KEY_ALWAYS_AI, value).apply()

    /** 결과를 음성으로 읽어 준다. */
    var speakFeedback: Boolean
        get() = prefs.getBoolean(KEY_SPEAK, true)
        set(value) = prefs.edit().putBoolean(KEY_SPEAK, value).apply()

    /** 다른 앱 위에 떠 있는 마이크 버튼. */
    var showBubble: Boolean
        get() = prefs.getBoolean(KEY_BUBBLE, true)
        set(value) = prefs.edit().putBoolean(KEY_BUBBLE, value).apply()

    /** AI 화면 조작의 최대 단계 수. */
    var maxAgentSteps: Int
        get() = prefs.getInt(KEY_MAX_STEPS, 20)
        set(value) = prefs.edit().putInt(KEY_MAX_STEPS, value.coerceIn(3, 50)).apply()

    /** 플로팅 버튼 위치(픽셀). -1이면 기본 위치. */
    var bubbleX: Int
        get() = prefs.getInt(KEY_BUBBLE_X, -1)
        set(value) = prefs.edit().putInt(KEY_BUBBLE_X, value).apply()

    var bubbleY: Int
        get() = prefs.getInt(KEY_BUBBLE_Y, -1)
        set(value) = prefs.edit().putInt(KEY_BUBBLE_Y, value).apply()

    val hasClaudeKey: Boolean get() = claudeApiKey.isNotBlank()

    companion object {
        const val PREFS_NAME = "malophone"

        const val KEY_CLAUDE_API_KEY = "claude_api_key"
        const val KEY_CLAUDE_MODEL = "claude_model"
        const val KEY_EFFORT = "effort"
        const val KEY_CONFIRM = "confirm_before_send"
        const val KEY_YOUTUBE_API_KEY = "youtube_api_key"
        const val KEY_ALWAYS_AI = "always_use_ai"
        const val KEY_SPEAK = "speak_feedback"
        const val KEY_BUBBLE = "show_bubble"
        const val KEY_MAX_STEPS = "max_agent_steps"
        const val KEY_BUBBLE_X = "bubble_x"
        const val KEY_BUBBLE_Y = "bubble_y"

        const val DEFAULT_MODEL = "claude-opus-5-5"
        const val DEFAULT_EFFORT = "low"

        /** 설정 화면의 모델 선택지 (id to 설명). */
        val MODELS: List<Pair<String, String>> = listOf(
            "claude-opus-5-5" to "Claude Opus 5.5 — 가장 정확함 (기본)",
            "claude-sonnet-5-5" to "Claude Sonnet 5.5 — 빠르고 정확함",
            "claude-haiku-5-5" to "Claude Haiku 5.5 — 가장 빠르고 저렴함",
        )

        val EFFORTS: List<Pair<String, String>> = listOf(
            "low" to "빠르게 (추천)",
            "medium" to "보통",
            "high" to "꼼꼼하게 (느림)",
        )
    }
}
