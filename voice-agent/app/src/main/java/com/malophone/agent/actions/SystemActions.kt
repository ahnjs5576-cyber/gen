package com.malophone.agent.actions

import android.content.Context
import com.malophone.agent.core.ActionResult
import com.malophone.agent.core.ConfirmResult

// STUB — 구현 담당: actions 에이전트.
object SystemActions {
    fun setAlarm(context: Context, hour: Int, minute: Int, label: String?): ActionResult = ActionResult.fail("미구현")
    fun setTimer(context: Context, seconds: Int): ActionResult = ActionResult.fail("미구현")
    suspend fun call(
        context: Context,
        target: String,
        confirm: suspend (who: String, number: String) -> ConfirmResult,
    ): ActionResult = ActionResult.fail("미구현")
    fun webSearch(context: Context, query: String): ActionResult = ActionResult.fail("미구현")
}
