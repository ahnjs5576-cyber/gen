package kr.phonebutler.agent

import com.anthropic.client.okhttp.AnthropicOkHttpClient
import com.anthropic.core.jsonMapper
import com.anthropic.models.messages.ContentBlockParam
import com.anthropic.models.messages.MessageParam
import com.anthropic.models.messages.TextBlockParam
import com.fasterxml.jackson.databind.JsonNode
import kotlinx.coroutines.runBlocking
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class AgentLoopTest {
    private lateinit var server: MockWebServer
    private val mapper = jsonMapper()

    @Before fun setUp() { server = MockWebServer().also { it.start() } }
    @After fun tearDown() { server.shutdown() }

    private fun client() = AnthropicOkHttpClient.builder()
        .apiKey("test-key")
        .baseUrl(server.url("/").toString().trimEnd('/'))
        .maxRetries(0)
        .build()

    private fun userMsg(t: String) = MessageParam.ofUserOfContentBlockParams(
        listOf(ContentBlockParam.ofText(TextBlockParam.builder().text(t).build())))

    private fun bodyJson(model: String): JsonNode {
        val p = AgentLoop.buildParams(model, "low", ToolDefs.ALL, listOf(userMsg("hi")))
        return mapper.readTree(mapper.writeValueAsString(p._body()))
    }

    @Test fun requestShape_opus() {
        val p = AgentLoop.buildParams("claude-opus-5-5", "low", ToolDefs.ALL, listOf(userMsg("hi")))
        val body = mapper.readTree(mapper.writeValueAsString(p._body()))
        assertEquals("claude-opus-5-5", body["model"].asText())
        assertEquals("low", body["output_config"]["effort"].asText())
        assertEquals("ephemeral", body["cache_control"]["type"].asText())
        assertEquals("default", body["fallbacks"].asText())
        assertEquals(ToolDefs.ALL.size, body["tools"].size())
        assertFalse("thinking must not be disabled on Opus 5.5", body.has("thinking"))
        assertFalse("no forced tool_choice on Opus 5.5", body.has("tool_choice"))
        assertTrue(p._headers().values("anthropic-beta").contains("server-side-fallback-2026-07-01"))
        // 모든 도구는 object 스키마이고, required 항목은 properties에 있어야 한다
        for (t in body["tools"]) {
            assertEquals("object", t["input_schema"]["type"].asText())
            t["input_schema"]["required"]?.forEach { r ->
                assertTrue("${t["name"]} requires ${r.asText()}", t["input_schema"]["properties"].has(r.asText()))
            }
        }
    }

    @Test fun requestShape_haikuHasNoFallbacks() {
        val body = bodyJson("claude-haiku-5-5")
        assertFalse(body.has("fallbacks"))
    }

    @Test fun loop_runsToolThenAnswers_andReplaysThinking() = runBlocking {
        server.enqueue(json("""
            {"id":"msg_1","type":"message","role":"assistant","model":"claude-opus-5-5",
             "content":[
               {"type":"thinking","thinking":"","signature":"sig-abc"},
               {"type":"tool_use","id":"toolu_1","name":"youtube_search","input":{"query":"아이유 좋은날"}}
             ],
             "stop_reason":"tool_use","stop_sequence":null,
             "usage":{"input_tokens":10,"output_tokens":5}}
        """))
        server.enqueue(json("""
            {"id":"msg_2","type":"message","role":"assistant","model":"claude-opus-5-5",
             "content":[{"type":"text","text":"아이유 좋은 날을 틀었어요."}],
             "stop_reason":"end_turn","stop_sequence":null,
             "usage":{"input_tokens":20,"output_tokens":7}}
        """))

        val calls = mutableListOf<Pair<String, Map<String, Any?>>>()
        val loop = AgentLoop(client(), "claude-opus-5-5", "low", ToolDefs.ALL, execute = { n, i ->
            calls += n to i
            ToolOutput("유튜브 검색 결과를 열었어요.")
        })
        val answer = loop.run("유튜브 아이유 조은날 트러줘")

        assertEquals("아이유 좋은 날을 틀었어요.", answer)
        assertEquals(listOf("youtube_search"), calls.map { it.first })
        assertEquals("아이유 좋은날", calls[0].second["query"])

        server.takeRequest() // 첫 요청
        val second = mapper.readTree(server.takeRequest().body.readUtf8())
        val msgs = second["messages"]
        assertEquals(3, msgs.size())
        // 어시스턴트 턴: thinking 블록(서명 포함)이 그대로 되돌아가야 한다
        val assistant = msgs[1]
        assertEquals("assistant", assistant["role"].asText())
        assertEquals("thinking", assistant["content"][0]["type"].asText())
        assertEquals("sig-abc", assistant["content"][0]["signature"].asText())
        // 사용자 턴: tool_result
        val result = msgs[2]["content"][0]
        assertEquals("tool_result", result["type"].asText())
        assertEquals("toolu_1", result["tool_use_id"].asText())
        assertEquals("유튜브 검색 결과를 열었어요.", result["content"].asText())
    }

    @Test fun refusal_isHandled() = runBlocking {
        server.enqueue(json("""
            {"id":"msg_r","type":"message","role":"assistant","model":"claude-opus-5-5",
             "content":[],"stop_reason":"refusal","stop_sequence":null,
             "usage":{"input_tokens":1,"output_tokens":1}}
        """))
        val loop = AgentLoop(client(), "claude-opus-5-5", "low", ToolDefs.ALL, execute = { _, _ -> ToolOutput("x") })
        assertTrue(loop.run("...").contains("도와드릴 수 없어요"))
    }

    @Test fun imageToolResult_serializes() {
        val r = AgentLoop.toolResult("toolu_9", ToolOutput("목록", image = "AAAA", isError = false))
        val node = mapper.readTree(mapper.writeValueAsString(r))
        assertEquals("image", node["content"][0]["type"].asText())
        assertEquals("image/jpeg", node["content"][0]["source"]["media_type"].asText())
        assertEquals("text", node["content"][1]["type"].asText())
    }

    @Test fun confirm_understandsKoreanYesNo() {
        listOf("응", "네", "어", "어어", "응 보내", "그래 보내줘", "좋아", "넵", "ㅇㅇ").forEach { assertTrue(it, Confirm.isYes(it)) }
        listOf("아니", "아니 보내지 마", "취소", "잠깐만", "보내지마", "", null, "음 글쎄").forEach { assertFalse("$it", Confirm.isYes(it)) }
    }

    private fun json(s: String) = MockResponse().setResponseCode(200)
        .setHeader("Content-Type", "application/json").setBody(s.trimIndent())
}
