package com.malophone.agent.core

import android.content.Context
import com.malophone.agent.App
import com.malophone.agent.a11y.UiDriver
import com.malophone.agent.actions.AppLauncher
import com.malophone.agent.actions.KakaoTalkAutomation
import com.malophone.agent.actions.SystemActions
import com.malophone.agent.actions.YouTubeActions
import com.malophone.agent.ai.ClaudeAgent

/** Action 하나를 실제로 실행한다. 규칙 파서 경로와 Claude 경로가 같이 쓴다. */
object ActionExecutor {

    suspend fun execute(context: Context, action: Action): ActionResult {
        val settings = App.instance.settings
        return when (action) {
            is Action.OpenApp -> AppLauncher.open(context, action.appName)

            is Action.YouTubePlay ->
                YouTubeActions.play(context, action.query, settings.youtubeApiKey.ifBlank { null })

            is Action.YouTubeSearch -> YouTubeActions.search(context, action.query)

            is Action.KakaoOpenChat -> KakaoTalkAutomation.openChat(context, action.room)

            is Action.KakaoSendMessage ->
                KakaoTalkAutomation.sendMessage(context, action.room, action.message) { room, message ->
                    Confirmer.confirm(
                        title = "카카오톡 보내기",
                        detail = "$room 에게\n\"$message\"",
                        spoken = "$room 에게 $message, 라고 보낼까요?",
                    )
                }

            is Action.Call -> SystemActions.call(context, action.target) { who, number ->
                Confirmer.confirm(
                    title = "전화 걸기",
                    detail = "$who\n$number",
                    spoken = "$who 에게 전화할까요?",
                )
            }

            is Action.SetAlarm -> SystemActions.setAlarm(context, action.hour, action.minute, action.label)

            is Action.SetTimer -> SystemActions.setTimer(context, action.seconds)

            is Action.WebSearch -> SystemActions.webSearch(context, action.query)

            Action.GoBack ->
                if (UiDriver.back()) ActionResult.ok("뒤로 갔어요.", speak = "")
                else ActionResult.fail("접근성 서비스가 꺼져 있어 뒤로 갈 수 없어요.")

            Action.GoHome ->
                if (UiDriver.home()) ActionResult.ok("홈 화면으로 갔어요.", speak = "")
                else ActionResult.fail("접근성 서비스가 꺼져 있어 홈으로 갈 수 없어요.")

            is Action.ScreenTask ->
                if (settings.hasClaudeKey) ClaudeAgent(context, settings).run(action.goal)
                else ActionResult.fail(
                    "이 명령은 AI 화면 조작이 필요해요. 설정에서 Claude API 키를 넣어 주세요.",
                )
        }
    }
}
