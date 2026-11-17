package com.malophone.agent.actions

import android.content.Context
import android.content.Intent
import com.malophone.agent.core.ActionResult

// STUB — 구현 담당: actions 에이전트.
object AppLauncher {
    data class AppInfo(val label: String, val packageName: String)
    fun installedApps(context: Context): List<AppInfo> = emptyList()
    fun find(context: Context, name: String): AppInfo? = null
    fun launchPackage(context: Context, packageName: String): Boolean = false
    fun startActivitySafely(context: Context, intent: Intent): Boolean = false
    suspend fun open(context: Context, name: String): ActionResult = ActionResult.fail("미구현")
}
