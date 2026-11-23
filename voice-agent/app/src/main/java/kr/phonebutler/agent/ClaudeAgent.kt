package kr.phonebutler.agent

import android.content.Context
import com.anthropic.client.AnthropicClient
import com.anthropic.client.okhttp.AnthropicOkHttpClient
import kr.phonebutler.Prefs
import java.text.SimpleDateFormat
import java.time.Duration
import java.util.Date
import java.util.Locale

/** 휴대폰 쪽 설정·도구를 AgentLoop에 연결한다. */
class ClaudeAgent(ctx: Context) {

    companion object {
        @Volatile private var cachedClient: AnthropicClient? = null
        @Volatile private var cachedKey: String = ""

        fun client(): AnthropicClient {
            val key = Prefs.apiKey
            cachedClient?.let { if (cachedKey == key) return it }
            return AnthropicOkHttpClient.builder()
                .apiKey(key)
                .maxRetries(2)
                .timeout(Duration.ofSeconds(120))
                .build()
                .also { cachedClient = it; cachedKey = key }
        }
    }

    private val tools = PhoneTools(ctx)

    suspend fun run(command: String, history: List<Pair<String, String>>): String {
        val loop = AgentLoop(
            client = client(),
            model = Prefs.model,
            effort = Prefs.effort,
            tools = ToolDefs.ALL,
            execute = { name, input -> tools.run(name, input) },
            log = AgentRuntime::log,
        )
        return loop.run(firstUserMessage(command, history))
    }

    private fun firstUserMessage(command: String, history: List<Pair<String, String>>): String {
        val now = SimpleDateFormat("yyyy-MM-dd (E) HH:mm", Locale.KOREA).format(Date())
        val sb = StringBuilder()
        sb.append("<상황>\n현재 시각: ").append(now).append('\n')
        sb.append("보내기 전 확인: ").append(if (Prefs.confirmBeforeSend) "켜짐" else "꺼짐").append('\n')
        sb.append("</상황>\n")
        if (history.isNotEmpty()) {
            sb.append("<최근 대화>\n")
            history.forEach { (q, a) -> sb.append("사용자: ").append(q).append("\n비서: ").append(a).append('\n') }
            sb.append("</최근 대화>\n")
        }
        sb.append("<현재 화면>\n").append(tools.currentScreen()).append("</현재 화면>\n")
        sb.append("<지시>\n").append(command).append("\n</지시>")
        return sb.toString()
    }
}
