package com.malophone.agent.core

import android.content.Context
import com.malophone.agent.App
import com.malophone.agent.ai.ClaudeAgent
import com.malophone.agent.parse.RuleParser
import com.malophone.agent.voice.Speaker
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/**
 * 말(텍스트)을 받아 해석하고 실행한다.
 *
 * 1. 규칙 파서가 확실히 알아들으면 바로 실행한다 (빠르고 무료).
 * 2. 아니면 Claude API 키가 있을 때 Claude가 해석하고, 필요하면 화면을 보며 직접 조작한다.
 * 3. 규칙 실행이 화면 조작 단계에서 실패하면 (키가 있을 때) Claude가 이어받는다.
 *
 * 한 번에 명령 하나만 돈다. 새 명령이 오면 이전 명령은 취소된다.
 */
object CommandRouter {

    @Volatile
    private var job: Job? = null

    val isBusy: Boolean get() = job?.isActive == true

    fun submit(context: Context, text: String) {
        val appContext = context.applicationContext
        job?.cancel()
        job = App.instance.appScope.launch { handle(appContext, text) }
    }

    fun cancel() {
        job?.cancel()
        job = null
        Speaker.stop()
        StatusBus.log(LogEntry.Kind.INFO, "명령을 멈췄어요.")
        StatusBus.setPhase(Phase.IDLE)
    }

    suspend fun handle(context: Context, rawText: String) {
        val text = rawText.trim()
        if (text.isEmpty()) return
        val settings = App.instance.settings

        StatusBus.log(LogEntry.Kind.USER, text)
        StatusBus.setPhase(Phase.THINKING)

        val result = try {
            val parsed = RuleParser.parse(text)
            when {
                parsed != null && parsed.confident && !settings.alwaysUseAi ->
                    runParsed(context, parsed, text)

                settings.hasClaudeKey ->
                    ClaudeAgent(context, settings).run(text)

                parsed != null ->
                    runParsed(context, parsed, text)

                else -> ActionResult.fail(
                    "무슨 명령인지 알아듣지 못했어요: \"$text\". " +
                        "설정에서 Claude API 키를 넣으면 더 다양한 명령을 할 수 있어요.",
                    speak = "무슨 명령인지 알아듣지 못했어요.",
                )
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            ActionResult.fail("실행 중 오류가 났어요: ${e.message ?: e.javaClass.simpleName}", speak = "오류가 났어요.")
        }

        report(result)
    }

    private suspend fun runParsed(context: Context, parsed: ParseResult, text: String): ActionResult {
        val settings = App.instance.settings
        var last = ActionResult.ok("완료했어요.")
        for (action in parsed.actions) {
            StatusBus.setPhase(Phase.ACTING)
            StatusBus.log(LogEntry.Kind.ACTION, action.describe())
            val r = ActionExecutor.execute(context, action)
            if (!r.ok) {
                if (!r.userCancelled && settings.hasClaudeKey && action.isScreenAutomation()) {
                    StatusBus.log(LogEntry.Kind.INFO, "${r.message} → AI가 화면을 보며 다시 시도할게요.")
                    StatusBus.setPhase(Phase.THINKING)
                    return ClaudeAgent(context, settings).run(text, hint = r.message)
                }
                return r
            }
            last = r
        }
        return last
    }

    private fun report(result: ActionResult) {
        val settings = App.instance.settings
        StatusBus.log(if (result.ok) LogEntry.Kind.SUCCESS else LogEntry.Kind.ERROR, result.message)
        StatusBus.setPhase(if (result.ok) Phase.DONE else Phase.ERROR)
        val spoken = result.spokenText
        if (settings.speakFeedback && spoken.isNotBlank()) Speaker.say(spoken)
    }
}
