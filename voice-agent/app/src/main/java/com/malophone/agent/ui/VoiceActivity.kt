package com.malophone.agent.ui

import android.content.Context
import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity

// STUB — 구현 담당: ui/voice 에이전트.
class VoiceActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        finish()
    }

    companion object {
        const val EXTRA_TEXT = "text"

        fun start(context: Context) {
            context.startActivity(
                Intent(context, VoiceActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        }
    }
}
