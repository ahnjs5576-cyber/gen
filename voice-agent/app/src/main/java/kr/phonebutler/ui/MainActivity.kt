package kr.phonebutler.ui

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.inputmethod.EditorInfo
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import com.anthropic.models.messages.MessageCreateParams
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kr.phonebutler.Prefs
import kr.phonebutler.R
import kr.phonebutler.access.PhoneAccessibilityService
import kr.phonebutler.agent.AgentRuntime
import kr.phonebutler.agent.ClaudeAgent
import kr.phonebutler.databinding.ActivityMainBinding

class MainActivity : AppCompatActivity() {
    private lateinit var b: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityMainBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.bigMic.setOnClickListener { AgentRuntime.startListening(this) }
        b.runButton.setOnClickListener { runTyped() }
        b.commandInput.setOnEditorActionListener { _, id, _ ->
            if (id == EditorInfo.IME_ACTION_SEND) { runTyped(); true } else false
        }
        b.stopButton.setOnClickListener { AgentRuntime.cancel() }

        b.micButton.setOnClickListener {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.RECORD_AUDIO), 1)
        }
        b.accButton.setOnClickListener { startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)) }
        b.appInfoButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName")))
        }
        b.notiButton.setOnClickListener {
            startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS))
        }

        // 설정
        b.apiKey.setText(Prefs.apiKey)
        b.saveKey.setOnClickListener {
            Prefs.apiKey = b.apiKey.text?.toString().orEmpty()
            toast("저장했어요")
            refresh()
        }
        b.testKey.setOnClickListener { testKey() }

        b.modelGroup.check(when (Prefs.model) {
            "claude-sonnet-5-5" -> R.id.modelSonnet
            "claude-haiku-5-5" -> R.id.modelHaiku
            else -> R.id.modelOpus
        })
        b.modelGroup.setOnCheckedChangeListener { _, id ->
            Prefs.model = when (id) {
                R.id.modelSonnet -> "claude-sonnet-5-5"
                R.id.modelHaiku -> "claude-haiku-5-5"
                else -> "claude-opus-5-5"
            }
        }
        b.effortGroup.check(when (Prefs.effort) {
            "high" -> R.id.effortHigh
            "medium" -> R.id.effortMedium
            else -> R.id.effortLow
        })
        b.effortGroup.setOnCheckedChangeListener { _, id ->
            Prefs.effort = when (id) { R.id.effortHigh -> "high"; R.id.effortMedium -> "medium"; else -> "low" }
        }
        b.confirmSwitch.isChecked = Prefs.confirmBeforeSend
        b.confirmSwitch.setOnCheckedChangeListener { _, v -> Prefs.confirmBeforeSend = v }
        b.bubbleSwitch.isChecked = Prefs.showBubble
        b.bubbleSwitch.setOnCheckedChangeListener { _, v ->
            Prefs.showBubble = v
            PhoneAccessibilityService.instance?.refreshBubble()
        }
        b.speakSwitch.isChecked = Prefs.speakReplies
        b.speakSwitch.setOnCheckedChangeListener { _, v -> Prefs.speakReplies = v }

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                launch {
                    AgentRuntime.state.collect { st ->
                        b.stateText.text = when (st) {
                            AgentRuntime.State.IDLE -> "대기 중 — 마이크를 누르고 말하세요"
                            AgentRuntime.State.LISTENING -> "듣는 중…"
                            AgentRuntime.State.WORKING -> "처리 중… (중지 버튼으로 멈출 수 있어요)"
                            AgentRuntime.State.SPEAKING -> "말하는 중…"
                        }
                    }
                }
                launch {
                    AgentRuntime.log.collect { lines -> b.logText.text = lines.asReversed().joinToString("\n") }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        refresh()
    }

    private fun refresh() {
        val mic = ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        val acc = isAccessibilityOn()
        val noti = NotificationManagerCompat.getEnabledListenerPackages(this).contains(packageName)
        val key = Prefs.apiKey.isNotBlank()
        b.micStatus.text = mark(mic) + " ① 마이크 권한"
        b.accStatus.text = mark(acc) + " ② 접근성(화면 조작)"
        b.notiStatus.text = mark(noti) + " ③ 알림 접근(카톡 읽기·답장)"
        b.micButton.isEnabled = !mic
        b.accButton.text = if (acc) "설정" else "켜기"
        b.notiButton.text = if (noti) "설정" else "켜기"
        b.restrictedHint.alpha = if (acc) 0.5f else 1f
        if (!key) b.apiKey.error = "API 키를 넣어 주세요"
    }

    private fun mark(ok: Boolean) = if (ok) "✅" else "⬜"

    private fun isAccessibilityOn(): Boolean {
        if (PhoneAccessibilityService.instance != null) return true
        val enabled = Settings.Secure.getString(contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: return false
        val me = ComponentName(this, PhoneAccessibilityService::class.java).flattenToString()
        return enabled.split(':').any { it.equals(me, ignoreCase = true) }
    }

    private fun runTyped() {
        val t = b.commandInput.text?.toString().orEmpty().trim()
        if (t.isEmpty()) return
        b.commandInput.setText("")
        AgentRuntime.submit(this, t)
        // 바로 휴대폰을 조작할 수 있게 홈으로 나간다 (지금 화면이 폰비서 자신이면 조작할 게 없으므로)
        moveTaskToBack(true)
    }

    private fun testKey() {
        Prefs.apiKey = b.apiKey.text?.toString().orEmpty()
        if (Prefs.apiKey.isBlank()) { toast("키를 먼저 넣어 주세요"); return }
        b.testKey.isEnabled = false
        lifecycleScope.launch {
            val msg = withContext(Dispatchers.IO) {
                try {
                    val params = MessageCreateParams.builder()
                        .model(Prefs.model)
                        .maxTokens(512L)
                        .addUserMessage("한 단어로 대답: 연결됐나요?")
                        .build()
                    ClaudeAgent.client().messages().create(params)
                    "연결 성공! (${Prefs.model})"
                } catch (e: Exception) {
                    "연결 실패: ${e.javaClass.simpleName} ${e.message?.take(120)}"
                }
            }
            b.testKey.isEnabled = true
            toast(msg)
            AgentRuntime.log(msg)
        }
    }

    private fun toast(s: String) = Toast.makeText(this, s, Toast.LENGTH_LONG).show()
}
