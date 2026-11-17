package com.malophone.agent.actions

import android.content.Context
import com.malophone.agent.core.ActionResult

// STUB — 구현 담당: actions 에이전트.
object YouTubeActions {
    const val PACKAGE = "com.google.android.youtube"
    suspend fun play(context: Context, query: String, apiKey: String?): ActionResult = ActionResult.fail("미구현")
    suspend fun search(context: Context, query: String): ActionResult = ActionResult.fail("미구현")
    suspend fun findVideoId(query: String, apiKey: String?): String? = null
    fun parseFirstVideoId(html: String): String? = null
}
