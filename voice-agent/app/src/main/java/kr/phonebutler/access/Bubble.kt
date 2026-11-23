package kr.phonebutler.access

import android.annotation.SuppressLint
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.view.Gravity
import android.view.MotionEvent
import android.view.ViewConfiguration
import android.view.WindowManager
import android.widget.ImageView
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kr.phonebutler.Prefs
import kr.phonebutler.R
import kr.phonebutler.agent.AgentRuntime
import kr.phonebutler.ui.MainActivity
import kotlin.math.abs

/**
 * 어느 앱 위에서나 떠 있는 동그란 마이크 버튼.
 *  - 누르기: 말하기 (작업 중이면 중지)
 *  - 길게 누르기: 폰비서 앱 열기
 *  - 끌기: 위치 옮기기
 * 접근성 오버레이 창을 쓰므로 '다른 앱 위에 표시' 권한이 따로 필요 없다.
 */
class Bubble(private val service: PhoneAccessibilityService) {
    private val wm = service.getSystemService(WindowManager::class.java)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var view: ImageView? = null
    private var params: WindowManager.LayoutParams? = null

    fun syncVisibility() {
        if (Prefs.showBubble) show() else remove()
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun show() {
        if (view != null) return
        val density = service.resources.displayMetrics.density
        val size = (56 * density).toInt()
        val bg = GradientDrawable().apply { shape = GradientDrawable.OVAL }
        val iv = ImageView(service).apply {
            setImageResource(R.drawable.ic_mic_white)
            background = bg
            val pad = (14 * density).toInt()
            setPadding(pad, pad, pad, pad)
            contentDescription = "폰비서에게 말하기"
            elevation = 8 * density
        }
        val lp = WindowManager.LayoutParams(
            size, size,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.END
            x = (8 * density).toInt()
            val h = service.resources.displayMetrics.heightPixels
            y = Prefs.bubbleY.takeIf { it in 0..h } ?: (h * 0.55).toInt()
        }

        val slop = ViewConfiguration.get(service).scaledTouchSlop
        val longPressMs = ViewConfiguration.getLongPressTimeout().toLong()
        var downY = 0f
        var startY = 0
        var dragging = false
        var longFired = false
        val longPress = Runnable {
            longFired = true
            service.startActivity(Intent(service, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        }
        iv.setOnTouchListener { v, ev ->
            when (ev.action) {
                MotionEvent.ACTION_DOWN -> {
                    downY = ev.rawY; startY = lp.y; dragging = false; longFired = false
                    v.postDelayed(longPress, longPressMs)
                }
                MotionEvent.ACTION_MOVE -> {
                    val dy = ev.rawY - downY
                    if (!dragging && abs(dy) > slop) { dragging = true; v.removeCallbacks(longPress) }
                    if (dragging) { lp.y = (startY + dy).toInt().coerceAtLeast(0); wm.updateViewLayout(v, lp) }
                }
                MotionEvent.ACTION_UP -> {
                    v.removeCallbacks(longPress)
                    if (dragging) Prefs.bubbleY = lp.y
                    else if (!longFired) onTap()
                }
                MotionEvent.ACTION_CANCEL -> v.removeCallbacks(longPress)
            }
            true
        }
        try {
            wm.addView(iv, lp)
        } catch (e: Exception) {
            return
        }
        view = iv
        params = lp
        scope.launch {
            AgentRuntime.state.collect { st ->
                val color = when (st) {
                    AgentRuntime.State.IDLE -> R.color.bubble_idle
                    AgentRuntime.State.LISTENING -> R.color.bubble_listen
                    else -> R.color.bubble_busy
                }
                bg.setColor(ContextCompat.getColor(service, color))
                iv.contentDescription = if (st == AgentRuntime.State.IDLE) "폰비서에게 말하기" else "폰비서 중지"
            }
        }
    }

    private fun onTap() {
        if (AgentRuntime.isBusy() && !AgentRuntime.isWaitingForAnswer()) {
            AgentRuntime.cancel()
            AgentRuntime.log("⏹ 버튼으로 중지")
        } else {
            AgentRuntime.startListening(service)
        }
    }

    /** 에이전트가 화면을 터치하는 동안에는 버튼이 터치를 가로채지 않게 한다. */
    fun setTouchThrough(on: Boolean) {
        val v = view ?: return
        val lp = params ?: return
        lp.flags = if (on) lp.flags or WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                   else lp.flags and WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE.inv()
        v.alpha = if (on) 0.4f else 1f
        try { wm.updateViewLayout(v, lp) } catch (_: Exception) {}
    }

    fun remove() {
        scope.coroutineContext[kotlinx.coroutines.Job]?.children?.forEach { it.cancel() }
        view?.let { try { wm.removeView(it) } catch (_: Exception) {} }
        view = null
        params = null
    }

    @Suppress("unused")
    fun destroy() { remove(); scope.cancel() }
}
