package com.malophone.agent.ai

import android.content.Context
import com.malophone.agent.core.ActionResult
import com.malophone.agent.core.AppSettings

// STUB — 구현 담당: ai 에이전트.
class ClaudeAgent(private val context: Context, private val settings: AppSettings) {
    suspend fun run(utterance: String, hint: String? = null): ActionResult = ActionResult.fail("미구현")
}
