package com.example.katalkassist.reply

import com.example.katalkassist.data.MessageEntity

/** A suggested reply the user can tap to insert/send. */
data class ReplySuggestion(val text: String, val tone: String)

/**
 * Turns recent conversation context into reply drafts.
 *
 * Pluggable on purpose: the default is fully offline (no network, no data
 * leaves the device). To use an LLM, implement [RemoteReplyDrafter] with a key
 * from EncryptedSharedPreferences and declare the INTERNET permission — then
 * the privacy trade-off is explicit and the user opted in.
 */
interface ReplyDrafter {
    suspend fun draft(thread: List<MessageEntity>): List<ReplySuggestion>
}

/**
 * Offline heuristic drafter. No ML, no network — just context-aware templates.
 * It reads the last incoming message and offers a few tones. Good enough to be
 * useful on day one and to prove the pipeline end-to-end without any API key.
 */
class TemplateReplyDrafter : ReplyDrafter {

    override suspend fun draft(thread: List<MessageEntity>): List<ReplySuggestion> {
        val lastIncoming = thread.lastOrNull { !it.isMine } ?: return emptyList()
        val t = lastIncoming.text.trim()
        val suggestions = mutableListOf<ReplySuggestion>()

        val isQuestion = t.endsWith("?") || QUESTION_WORDS.any { t.contains(it) }
        val looksLikeTime = TIME_HINT.containsMatchIn(t)

        when {
            looksLikeTime -> {
                suggestions += ReplySuggestion("네, 그 시간 괜찮아요. 그때 뵐게요!", "수락")
                suggestions += ReplySuggestion("조금 애매한데 30분만 늦춰도 될까요?", "조정")
                suggestions += ReplySuggestion("확인해보고 다시 알려드릴게요.", "보류")
            }
            isQuestion -> {
                suggestions += ReplySuggestion("네 맞아요!", "긍정")
                suggestions += ReplySuggestion("음, 확인해보고 알려드릴게요.", "보류")
                suggestions += ReplySuggestion("조금 더 자세히 말해줄 수 있어요?", "되묻기")
            }
            else -> {
                suggestions += ReplySuggestion("넵 확인했어요!", "확인")
                suggestions += ReplySuggestion("ㅎㅎ 알겠어요~", "친근")
                suggestions += ReplySuggestion("고마워요 :)", "감사")
            }
        }
        return suggestions
    }

    companion object {
        private val QUESTION_WORDS =
            listOf("어때", "될까", "할까", "맞아", "언제", "어디", "누구", "뭐", "왜", "어떻게")
        private val TIME_HINT =
            Regex("(\\d{1,2})(시|:\\d{2})|오전|오후|내일|모레|주말|월요일|화요일|수요일|목요일|금요일|토요일|일요일")
    }
}
