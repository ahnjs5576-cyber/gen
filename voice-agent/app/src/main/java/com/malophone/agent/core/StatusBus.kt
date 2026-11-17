package com.malophone.agent.core

import android.util.Log
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import java.util.concurrent.atomic.AtomicLong

enum class Phase { IDLE, LISTENING, THINKING, ACTING, CONFIRMING, DONE, ERROR }

data class LogEntry(val id: Long, val timeMillis: Long, val kind: Kind, val text: String) {
    enum class Kind { USER, INFO, ACTION, AI, SUCCESS, ERROR }
}

/** 지금 무엇을 하는 중인지와 실행 기록. 앱 화면과 플로팅 버튼이 구독한다. 어느 스레드에서 불러도 된다. */
object StatusBus {
    private const val TAG = "Malophone"
    private const val MAX_LOGS = 200

    private val nextId = AtomicLong(1)

    private val _phase = MutableStateFlow(Phase.IDLE)
    val phase: StateFlow<Phase> = _phase.asStateFlow()

    private val _logs = MutableStateFlow<List<LogEntry>>(emptyList())
    val logs: StateFlow<List<LogEntry>> = _logs.asStateFlow()

    /** 화면 위에 잠깐 띄울 진행 상황 한 줄(플로팅 상태 표시용). */
    private val _statusLine = MutableStateFlow("")
    val statusLine: StateFlow<String> = _statusLine.asStateFlow()

    fun setPhase(phase: Phase) {
        _phase.value = phase
    }

    fun log(kind: LogEntry.Kind, text: String) {
        Log.d(TAG, "[$kind] $text")
        val entry = LogEntry(nextId.getAndIncrement(), System.currentTimeMillis(), kind, text)
        _logs.update { (it + entry).takeLast(MAX_LOGS) }
        if (kind != LogEntry.Kind.USER) _statusLine.value = text
    }

    fun clear() {
        _logs.value = emptyList()
        _statusLine.value = ""
    }
}
