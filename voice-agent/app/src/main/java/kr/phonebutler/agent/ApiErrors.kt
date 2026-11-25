package kr.phonebutler.agent

import com.anthropic.errors.AnthropicServiceException
import com.fasterxml.jackson.core.type.TypeReference

/** Claude API 오류를 사람이 알아들을 수 있는 한국어로 바꾼다. */
object ApiErrors {

    /** API가 돌려준 원래 오류 문구 (예: "Your credit balance is too low ...") */
    fun rawMessage(e: Throwable): String {
        if (e is AnthropicServiceException) {
            try {
                val body = e.body().convert(object : TypeReference<Map<String, Any?>>() {})
                val err = body?.get("error") as? Map<*, *>
                val msg = err?.get("message")?.toString()
                if (!msg.isNullOrBlank()) return "${e.statusCode()}: $msg"
            } catch (_: Exception) {}
            return "${e.statusCode()}: ${e.message}"
        }
        return "${e.javaClass.simpleName}: ${e.message}"
    }

    /** 소리로 읽어 줄 짧은 설명 */
    fun friendly(e: Throwable): String {
        val raw = rawMessage(e).lowercase()
        val status = (e as? AnthropicServiceException)?.statusCode()
        return when {
            "credit balance" in raw || "billing" in raw ->
                "Claude API 크레딧 잔액이 없어요. 콘솔의 결제 메뉴에서 크레딧을 충전해 주세요."
            status == 401 || "x-api-key" in raw || "authentication" in raw ->
                "API 키가 올바르지 않아요. 키를 다시 확인해 주세요."
            status == 403 ->
                "이 API 키로는 사용할 권한이 없어요. 키의 워크스페이스 설정을 확인해 주세요."
            status == 404 || ("model" in raw && "not" in raw) ->
                "선택한 모델을 이 계정에서 쓸 수 없어요. 설정에서 다른 모델을 골라 보세요."
            status == 429 ->
                "요청이 너무 많아 잠시 막혔어요. 조금 뒤에 다시 시도해 주세요."
            status == 529 || (status != null && status >= 500) ->
                "Claude 서버가 바빠요. 잠시 뒤에 다시 시도해 주세요."
            status == 400 ->
                "요청 형식 오류가 났어요. 진행 기록의 오류 내용을 알려 주세요."
            "timeout" in raw || "connect" in raw || "unknownhost" in raw || "ioexception" in raw ->
                "인터넷 연결이 불안정해서 처리하지 못했어요."
            else -> "처리하다가 문제가 생겼어요. 다시 한 번 말해 주세요."
        }
    }
}
