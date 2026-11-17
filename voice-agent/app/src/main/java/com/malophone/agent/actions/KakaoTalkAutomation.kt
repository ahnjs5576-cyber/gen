package com.malophone.agent.actions

import android.content.Context
import com.malophone.agent.core.ActionResult
import com.malophone.agent.core.ConfirmResult

// STUB — 구현 담당: actions 에이전트.
object KakaoTalkAutomation {
    const val PACKAGE = "com.kakao.talk"
    suspend fun openChat(context: Context, room: String): ActionResult = ActionResult.fail("미구현")
    suspend fun sendMessage(
        context: Context,
        room: String,
        message: String,
        confirm: suspend (room: String, message: String) -> ConfirmResult,
    ): ActionResult = ActionResult.fail("미구현")
}
