package com.example.katalkassist.reply

import com.example.katalkassist.data.MessageEntity
import com.example.katalkassist.util.Prefs
import com.example.katalkassist.util.Redact
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * LLM-backed drafter — calls the Claude Messages API directly.
 *
 * Privacy: when [Prefs.pseudonymize] is on (default), real sender names are
 * replaced with stable labels (상대 / 상대A·B) before anything is sent. The key
 * is read from EncryptedSharedPreferences and sent only to api.anthropic.com.
 *
 * Note: this calls Claude from the device with the user's own key. That's fine
 * for a personal tool; for a published app you'd normally proxy through your own
 * backend so the key isn't shipped to clients.
 */
class RemoteReplyDrafter(private val prefs: Prefs) : ReplyDrafter {

    private val http = OkHttpClient.Builder()
        .callTimeout(30, TimeUnit.SECONDS)
        .build()

    override suspend fun draft(thread: List<MessageEntity>): List<ReplySuggestion> {
        if (thread.isEmpty()) return emptyList()

        return withContext(Dispatchers.IO) {
            // Read the encrypted key + build the body on IO — EncryptedSharedPreferences
            // does Keystore + disk work that must not run on the main thread.
            val key = prefs.llmApiKey?.takeIf { it.isNotBlank() }
                ?: return@withContext emptyList()
            val conversation = formatConversation(thread, prefs.pseudonymize)
            val body = buildRequest(prefs.modelId, conversation)

            val request = Request.Builder()
                .url("https://api.anthropic.com/v1/messages")
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                // Opt into server-side refusal fallbacks (recommended for 5.x models).
                .header("anthropic-beta", "server-side-fallback-2026-07-01")
                .header("content-type", "application/json")
                .post(body.toRequestBody(JSON))
                .build()

            http.newCall(request).execute().use { resp ->
                val text = resp.body?.string().orEmpty()
                if (!resp.isSuccessful) {
                    Redact.w("LLM http ${resp.code}")
                    throw RuntimeException("LLM 호출 실패 (${resp.code})")
                }
                parseSuggestions(text)
            }
        }
    }

    private fun buildRequest(model: String, conversation: String): String {
        val messages = JSONArray().put(
            JSONObject()
                .put("role", "user")
                .put("content", conversation)
        )
        return JSONObject()
            .put("model", model)
            .put("max_tokens", 1024)
            // Low effort keeps this fast/cheap for a quick reply-suggestion task.
            .put("output_config", JSONObject().put("effort", "low"))
            .put("fallbacks", "default")
            .put("system", SYSTEM_PROMPT)
            .put("messages", messages)
            .toString()
    }

    /** Pull the first text block, then parse the JSON array of suggestions from it. */
    private fun parseSuggestions(responseJson: String): List<ReplySuggestion> {
        val root = JSONObject(responseJson)

        if (root.optString("stop_reason") == "refusal") {
            Redact.w("LLM refused")
            return emptyList()
        }

        val content = root.optJSONArray("content") ?: return emptyList()
        val sb = StringBuilder()
        for (i in 0 until content.length()) {
            val block = content.optJSONObject(i) ?: continue
            if (block.optString("type") == "text") sb.append(block.optString("text"))
        }
        val raw = sb.toString()
        val arr = extractJsonArray(raw) ?: return emptyList()

        val out = ArrayList<ReplySuggestion>()
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val t = o.optString("text").trim()
            if (t.isNotEmpty()) out.add(ReplySuggestion(t, o.optString("tone", "제안").trim()))
        }
        return out
    }

    /** Model should return a bare JSON array; be tolerant of stray prose around it. */
    private fun extractJsonArray(raw: String): JSONArray? {
        val start = raw.indexOf('[')
        val end = raw.lastIndexOf(']')
        if (start < 0 || end <= start) return null
        return runCatching { JSONArray(raw.substring(start, end + 1)) }.getOrNull()
    }

    private fun formatConversation(thread: List<MessageEntity>, pseudonymize: Boolean): String {
        val labels = HashMap<String, String>()
        fun labelFor(sender: String): String {
            if (!pseudonymize) return sender
            return labels.getOrPut(sender) {
                if (labels.isEmpty()) "상대" else "상대${labels.size + 1}"
            }
        }

        val lines = thread.takeLast(30).joinToString("\n") { m ->
            val who = if (m.isMine) "나" else labelFor(m.sender)
            "$who: ${m.text}"
        }
        return "다음은 카카오톡 대화야. '나'가 보낼 답장 후보를 만들어줘.\n\n$lines"
    }

    companion object {
        private val JSON = "application/json; charset=utf-8".toMediaType()

        private const val SYSTEM_PROMPT =
            "너는 한국어 카카오톡 답장 도우미야. 주어진 대화 맥락을 보고, '나' 입장에서 " +
                "자연스럽게 보낼 수 있는 답장 후보 3개를 제안해. 세 후보는 서로 톤이 달라야 해 " +
                "(예: 긍정/보류/되묻기). 반드시 JSON 배열만 출력하고 다른 설명은 하지 마. " +
                "형식: [{\"text\":\"답장 내용\",\"tone\":\"톤(두세 글자)\"}]"
    }
}
