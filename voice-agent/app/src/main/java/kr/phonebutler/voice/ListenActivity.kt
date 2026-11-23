package kr.phonebutler.voice

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.inputmethod.EditorInfo
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import kr.phonebutler.agent.AgentRuntime
import kr.phonebutler.databinding.ActivityListenBinding

/**
 * 지금 보던 앱 위에 아래쪽 시트로 잠깐 떠서 말을 듣는다.
 *  MODE_COMMAND: 새 명령을 받아 에이전트를 시작
 *  MODE_ANSWER : 에이전트가 물어본 질문(예: "보낼까요?")의 대답을 받음
 */
class ListenActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_MODE = "mode"
        const val EXTRA_PROMPT = "prompt"
        const val MODE_COMMAND = "command"
        const val MODE_ANSWER = "answer"
        private const val REQ_MIC = 7
    }

    private lateinit var b: ActivityListenBinding
    private var recognizer: SpeechRecognizer? = null
    private var mode = MODE_COMMAND
    private var delivered = false
    private var listening = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityListenBinding.inflate(layoutInflater)
        setContentView(b.root)
        readIntent(intent)

        b.scrim.setOnClickListener { finishWith(null) }
        b.cancel.setOnClickListener { finishWith(null) }
        b.mic.setOnClickListener { if (listening) recognizer?.stopListening() else startListening() }
        b.send.setOnClickListener { sendTyped() }
        b.typed.setOnEditorActionListener { _, id, _ ->
            if (id == EditorInfo.IME_ACTION_SEND) { sendTyped(); true } else false
        }
        startListening()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        // 이전 요청이 남아 있으면 정리하고 새로 듣기
        if (!delivered && mode == MODE_ANSWER) AgentRuntime.deliverAnswer(null)
        delivered = false
        readIntent(intent)
        b.transcript.text = ""
        startListening()
    }

    private fun readIntent(i: Intent) {
        mode = i.getStringExtra(EXTRA_MODE) ?: MODE_COMMAND
        b.prompt.text = i.getStringExtra(EXTRA_PROMPT) ?: "무엇을 도와드릴까요?"
    }

    private fun startListening() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
            return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            b.hint.text = "이 기기에서 음성 인식을 쓸 수 없어요. 글자로 입력해 주세요."
            return
        }
        Speaker.stop()
        recognizer?.destroy()
        recognizer = SpeechRecognizer.createSpeechRecognizer(this).apply {
            setRecognitionListener(listener)
        }
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "ko-KR")
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            .putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500L)
        recognizer?.startListening(i)
        listening = true
        AgentRuntime.setListening(true)
        b.hint.text = "듣고 있어요… (마이크를 누르면 끝)"
        b.mic.alpha = 1f
    }

    private val listener = object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}
        override fun onBeginningOfSpeech() {}
        override fun onRmsChanged(rmsdB: Float) {
            val s = 1f + (rmsdB.coerceIn(0f, 10f) / 30f)
            b.mic.scaleX = s; b.mic.scaleY = s
        }
        override fun onBufferReceived(buffer: ByteArray?) {}
        override fun onEndOfSpeech() {
            listening = false
            b.hint.text = "알아듣는 중…"
        }
        override fun onError(error: Int) {
            listening = false
            AgentRuntime.setListening(false)
            b.mic.scaleX = 1f; b.mic.scaleY = 1f
            b.hint.text = when (error) {
                SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "잘 못 들었어요. 마이크를 눌러 다시 말해 주세요."
                SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "음성 인식에 인터넷이 필요해요."
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "마이크 권한이 필요해요."
                else -> "음성 인식 오류($error). 다시 눌러 주세요."
            }
        }
        override fun onResults(results: Bundle?) {
            listening = false
            val text = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
            if (text.isBlank()) { onError(SpeechRecognizer.ERROR_NO_MATCH); return }
            b.transcript.text = text
            finishWith(text)
        }
        override fun onPartialResults(partial: Bundle?) {
            partial?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let {
                if (it.isNotBlank()) b.transcript.text = it
            }
        }
        override fun onEvent(eventType: Int, params: Bundle?) {}
    }

    private fun sendTyped() {
        val t = b.typed.text?.toString().orEmpty().trim()
        if (t.isNotEmpty()) finishWith(t)
    }

    private fun finishWith(text: String?) {
        if (delivered) return
        delivered = true
        recognizer?.cancel()
        AgentRuntime.setListening(false)
        if (mode == MODE_ANSWER) AgentRuntime.deliverAnswer(text)
        else if (text != null) AgentRuntime.submit(this, text)
        finish()
        overridePendingTransition(0, 0)
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == REQ_MIC && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startListening()
        else b.hint.text = "마이크 권한이 없어서 글자로만 입력할 수 있어요."
    }

    override fun onDestroy() {
        recognizer?.destroy()
        recognizer = null
        if (!delivered) {
            if (mode == MODE_ANSWER) AgentRuntime.deliverAnswer(null)
            AgentRuntime.setListening(false)
        }
        super.onDestroy()
    }
}
