package com.malophone.agent.core

import com.malophone.agent.App
import com.malophone.agent.a11y.AgentAccessibilityService
import com.malophone.agent.voice.Speaker

enum class ConfirmResult { YES, NO, UNAVAILABLE }

/**
 * 메시지 전송·전화 걸기처럼 되돌릴 수 없는 일 직전에 사용자에게 묻는다.
 * 확인 창은 접근성 서비스의 오버레이로 띄우므로 지금 보고 있는 앱(카카오톡 등)이 가려지지 않는다.
 */
object Confirmer {

    /**
     * @param title 확인 창 제목 (예: "카카오톡 보내기")
     * @param detail 확인 창 본문 (예: "엄마에게: 오늘 늦어")
     * @param spoken 음성으로 물어볼 문장 (예: "엄마에게 오늘 늦어, 라고 보낼까요?")
     * @return 설정에서 확인을 끈 경우 YES. 오버레이를 띄울 수 없으면 UNAVAILABLE.
     */
    suspend fun confirm(title: String, detail: String, spoken: String): ConfirmResult {
        val settings = App.instance.settings
        if (!settings.confirmBeforeSend) return ConfirmResult.YES
        val overlay = AgentAccessibilityService.instance?.overlay ?: return ConfirmResult.UNAVAILABLE
        val previous = StatusBus.phase.value
        StatusBus.setPhase(Phase.CONFIRMING)
        StatusBus.log(LogEntry.Kind.INFO, "확인 요청: $detail")
        if (settings.speakFeedback) Speaker.say(spoken)
        return try {
            if (overlay.confirm(title, detail)) ConfirmResult.YES else ConfirmResult.NO
        } finally {
            Speaker.stop()
            StatusBus.setPhase(previous)
        }
    }
}
