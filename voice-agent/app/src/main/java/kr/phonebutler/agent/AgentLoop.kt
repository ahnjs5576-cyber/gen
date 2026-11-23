package kr.phonebutler.agent

import com.anthropic.client.AnthropicClient
import com.anthropic.core.JsonValue
import com.anthropic.models.messages.Base64ImageSource
import com.anthropic.models.messages.CacheControlEphemeral
import com.anthropic.models.messages.ContentBlockParam
import com.anthropic.models.messages.Message
import com.anthropic.models.messages.MessageCreateParams
import com.anthropic.models.messages.MessageParam
import com.anthropic.models.messages.OutputConfig
import com.anthropic.models.messages.StopReason
import com.anthropic.models.messages.TextBlockParam
import com.anthropic.models.messages.Tool
import com.anthropic.models.messages.ToolResultBlockParam
import com.fasterxml.jackson.core.type.TypeReference
import kotlinx.coroutines.runInterruptible

/** 도구 실행 결과. image는 JPEG base64(스크린샷). */
class ToolOutput(val text: String, val image: String? = null, val isError: Boolean = false)

/**
 * Claude Messages API의 도구 사용 루프 (안드로이드에 의존하지 않아서 JVM에서 테스트할 수 있다).
 * 도구는 모두 휴대폰 안에서 실행되므로 루프도 휴대폰에서 직접 돌린다.
 */
class AgentLoop(
    private val client: AnthropicClient,
    private val model: String,
    private val effort: String,
    private val tools: List<Tool>,
    private val execute: suspend (name: String, input: Map<String, Any?>) -> ToolOutput,
    private val log: (String) -> Unit = {},
    private val maxSteps: Int = 30,
) {
    suspend fun run(firstUserMessage: String): String {
        val messages = mutableListOf<MessageParam>()
        messages += MessageParam.ofUserOfContentBlockParams(listOf(
            ContentBlockParam.ofText(TextBlockParam.builder().text(firstUserMessage).build())
        ))

        repeat(maxSteps) {
            log("… Claude 생각 중")
            val params = buildParams(model, effort, tools, messages)
            val response = runInterruptible { client.messages().create(params) }
            // 생각(thinking) 블록까지 그대로 다시 넘겨야 하므로 응답 전체를 대화에 붙인다
            messages += response.toParam()

            when (response.stopReason().orElse(StopReason.END_TURN)) {
                StopReason.REFUSAL -> return "죄송해요, 그 요청은 도와드릴 수 없어요."
                StopReason.TOOL_USE -> {
                    val results = mutableListOf<ContentBlockParam>()
                    for (block in response.content()) {
                        val use = block.toolUse().orElse(null) ?: continue
                        val input: Map<String, Any?> = try {
                            use._input().convert(object : TypeReference<Map<String, Any?>>() {}) ?: emptyMap()
                        } catch (_: Exception) { emptyMap() }
                        val out = execute(use.name(), input)
                        results += ContentBlockParam.ofToolResult(toolResult(use.id(), out))
                    }
                    // 여러 도구 결과는 한 메시지에 모아서 보낸다
                    messages += MessageParam.ofUserOfContentBlockParams(results)
                }
                StopReason.PAUSE_TURN -> { /* 서버가 이어서 하라고 한 경우: 그대로 다시 호출 */ }
                StopReason.MAX_TOKENS -> return finalText(response).ifEmpty { "답이 너무 길어져서 중간에 멈췄어요." }
                else -> return finalText(response).ifEmpty { "다 했어요." }
            }
        }
        return "단계가 너무 많아져서 중간에 멈췄어요. 조금 더 구체적으로 말해 주세요."
    }

    companion object {
        fun buildParams(model: String, effort: String, tools: List<Tool>, messages: List<MessageParam>): MessageCreateParams {
            val eff = when (effort) {
                "high" -> OutputConfig.Effort.HIGH
                "medium" -> OutputConfig.Effort.MEDIUM
                else -> OutputConfig.Effort.LOW
            }
            val builder = MessageCreateParams.builder()
                .model(model)
                .maxTokens(16000L)
                .systemOfTextBlockParams(listOf(TextBlockParam.builder().text(SystemPrompt.TEXT).build()))
                .messages(messages)
                .outputConfig(OutputConfig.builder().effort(eff).build())
                // 자동 프롬프트 캐싱: 도구 정의·시스템 프롬프트·앞선 대화를 재사용해 속도와 비용을 줄인다
                .cacheControl(CacheControlEphemeral.builder().build())
            tools.forEach { builder.addTool(it) }

            // 안전 분류기가 거절하면 서버가 알아서 다른 모델로 다시 시도 (Haiku는 미지원)
            if (!model.contains("haiku")) {
                builder.putAdditionalHeader("anthropic-beta", "server-side-fallback-2026-07-01")
                builder.putAdditionalBodyProperty("fallbacks", JsonValue.from("default"))
            }
            return builder.build()
        }

        fun toolResult(id: String, out: ToolOutput): ToolResultBlockParam {
            val b = ToolResultBlockParam.builder().toolUseId(id)
            if (out.image != null) {
                b.contentOfBlocks(listOf(
                    ToolResultBlockParam.Content.Block.ofImage(
                        Base64ImageSource.builder()
                            .mediaType(Base64ImageSource.MediaType.IMAGE_JPEG)
                            .data(out.image)
                            .build()),
                    ToolResultBlockParam.Content.Block.ofText(out.text),
                ))
            } else {
                b.content(out.text)
            }
            if (out.isError) b.isError(true)
            return b.build()
        }

        fun finalText(m: Message): String =
            m.content().mapNotNull { it.text().orElse(null)?.text() }.joinToString(" ").trim()
    }
}
