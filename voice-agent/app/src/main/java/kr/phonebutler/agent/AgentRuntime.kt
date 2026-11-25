package kr.phonebutler.agent

import android.content.Context
import android.content.Intent
import android.os.VibrationEffect
import android.os.Vibrator
import android.util.Log
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kr.phonebutler.Prefs
import kr.phonebutler.voice.ListenActivity
import kr.phonebutler.voice.Speaker
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * 앱 전체의 상태를 갖고 있는 곳.
 * 음성 명령을 받아 Claude 에이전트를 돌리고, 결과를 말해 주고, 중간에 사용자에게 되묻는 일을 맡는다.
 */
object AgentRuntime {
    enum class State { IDLE, LISTENING, WORKING, SPEAKING }

    private const val TAG = "PhoneButler"
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val _state = MutableStateFlow(State.IDLE)
    val state: StateFlow<State> = _state

    private val _log = MutableStateFlow<List<String>>(emptyList())
    val log: StateFlow<List<String>> = _log

    private var job: Job? = null
    private var pendingAnswer: CompletableDeferred<String?>? = null
    private var lastQuestion: String = ""
    private lateinit var appContext: Context

    /** 최근 명령과 답(다음 명령에서 "그거", "다시" 같은 말을 이해하는 데 씀) */
    private val history = ArrayDeque<Pair<String, String>>()

    fun log(line: String) {
        Log.d(TAG, line)
        val time = SimpleDateFormat("HH:mm:ss", Locale.KOREA).format(Date())
        _log.value = (_log.value + "$time  $line").takeLast(200)
    }

    fun isBusy() = _state.value == State.WORKING || _state.value == State.SPEAKING

    /** 새 명령을 듣는 화면을 띄운다. */
    fun startListening(ctx: Context) {
        appContext = ctx.applicationContext
        if (isWaitingForAnswer()) {
            // 에이전트가 질문하고 대답을 기다리는 중이면 그 대답을 다시 듣는다
            Speaker.stop()
            ctx.startActivity(
                Intent(ctx, ListenActivity::class.java)
                    .putExtra(ListenActivity.EXTRA_MODE, ListenActivity.MODE_ANSWER)
                    .putExtra(ListenActivity.EXTRA_PROMPT, lastQuestion)
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
            )
            return
        }
        if (isBusy()) cancel()
        Speaker.stop()
        ctx.startActivity(
            Intent(ctx, ListenActivity::class.java)
                .putExtra(ListenActivity.EXTRA_MODE, ListenActivity.MODE_COMMAND)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        )
    }

    fun setListening(on: Boolean) {
        if (on) _state.value = State.LISTENING
        else if (_state.value == State.LISTENING) _state.value = if (job?.isActive == true) State.WORKING else State.IDLE
    }

    /** 명령 실행 시작 */
    fun submit(ctx: Context, command: String) {
        appContext = ctx.applicationContext
        val text = command.trim()
        if (text.isEmpty()) return
        job?.cancel()
        job = scope.launch {
            _state.value = State.WORKING
            log("🗣 $text")
            buzz()
            val reply = try {
                if (Prefs.apiKey.isBlank()) {
                    "먼저 폰비서 앱에서 Claude API 키를 넣어 주세요."
                } else {
                    delay(300) // 듣기 화면이 닫히고 원래 앱이 다시 보일 때까지
                    withContext(Dispatchers.IO) {
                        ClaudeAgent(appContext).run(text, history.toList())
                    }
                }
            } catch (e: CancellationException) {
                log("⏹ 중지됨")
                _state.value = State.IDLE
                throw e
            } catch (e: Exception) {
                Log.e(TAG, "agent failed", e)
                log("⚠ 오류: ${ApiErrors.rawMessage(e)}")
                ApiErrors.friendly(e)
            }
            history.addLast(text to reply)
            while (history.size > 4) history.removeFirst()
            log("🤖 $reply")
            if (Prefs.speakReplies) {
                _state.value = State.SPEAKING
                Speaker.say(reply)
            }
            _state.value = State.IDLE
        }
    }

    fun cancel() {
        job?.cancel()
        job = null
        pendingAnswer?.complete(null)
        pendingAnswer = null
        Speaker.stop()
        _state.value = State.IDLE
    }

    /**
     * 사용자에게 소리로 묻고 음성 대답을 받는다. 대답이 없으면 null.
     * 에이전트(백그라운드 스레드)에서 호출한다.
     */
    suspend fun askUser(question: String): String? = withContext(Dispatchers.Main) {
        log("❓ $question")
        val answer = CompletableDeferred<String?>()
        pendingAnswer = answer
        lastQuestion = question
        _state.value = State.SPEAKING
        Speaker.say(question)
        appContext.startActivity(
            Intent(appContext, ListenActivity::class.java)
                .putExtra(ListenActivity.EXTRA_MODE, ListenActivity.MODE_ANSWER)
                .putExtra(ListenActivity.EXTRA_PROMPT, question)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
        )
        val result = withTimeoutOrNull(45_000) { answer.await() }
        pendingAnswer = null
        _state.value = State.WORKING
        log("💬 ${result ?: "(대답 없음)"}")
        result
    }

    fun deliverAnswer(text: String?) {
        pendingAnswer?.complete(text)
    }

    fun isWaitingForAnswer() = pendingAnswer?.isActive == true

    private fun buzz() {
        try {
            val v = appContext.getSystemService(Vibrator::class.java)
            v?.vibrate(VibrationEffect.createOneShot(30, VibrationEffect.DEFAULT_AMPLITUDE))
        } catch (_: Exception) {}
    }
}
