package com.malophone.agent.core

/**
 * 동작 하나의 결과.
 * @param message 실행 기록에 남길 설명(자세해도 됨)
 * @param speak 음성으로 읽어 줄 짧은 문장. null이면 message를 읽는다. 빈 문자열이면 읽지 않는다.
 * @param userCancelled 사용자가 확인 창에서 취소함. 이 경우 AI로 재시도하지 않는다.
 */
data class ActionResult(
    val ok: Boolean,
    val message: String,
    val speak: String? = null,
    val userCancelled: Boolean = false,
) {
    val spokenText: String get() = speak ?: message

    companion object {
        fun ok(message: String, speak: String? = null) = ActionResult(true, message, speak)
        fun fail(message: String, speak: String? = null) = ActionResult(false, message, speak)
        fun cancelled(message: String = "취소했어요.") = ActionResult(false, message, message, userCancelled = true)
    }
}
