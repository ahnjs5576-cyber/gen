package kr.phonebutler.voice

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/** 한국어 TTS. say()는 다 읽을 때까지 기다린다. */
object Speaker {
    private var tts: TextToSpeech? = null
    @Volatile private var ready = false
    private val pending = ConcurrentHashMap<String, CompletableDeferred<Unit>>()

    fun init(ctx: Context) {
        tts = TextToSpeech(ctx.applicationContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale.KOREAN
                tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(id: String) {}
                    override fun onDone(id: String) { pending.remove(id)?.complete(Unit) }
                    @Deprecated("old API")
                    override fun onError(id: String) { pending.remove(id)?.complete(Unit) }
                    override fun onStop(id: String, interrupted: Boolean) { pending.remove(id)?.complete(Unit) }
                })
                ready = true
            }
        }
    }

    suspend fun say(text: String) {
        val engine = tts
        if (!ready || engine == null || text.isBlank()) return
        val id = UUID.randomUUID().toString()
        val done = CompletableDeferred<Unit>()
        pending[id] = done
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, id)
        // 한 글자당 넉넉히 0.3초 + 3초
        withTimeoutOrNull(3_000L + text.length * 300L) { done.await() }
        pending.remove(id)
    }

    fun stop() {
        tts?.stop()
        pending.values.forEach { it.complete(Unit) }
        pending.clear()
    }
}
