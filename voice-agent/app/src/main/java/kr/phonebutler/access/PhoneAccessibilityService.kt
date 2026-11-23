package kr.phonebutler.access

import android.accessibilityservice.AccessibilityButtonController
import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.view.Display
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import androidx.annotation.RequiresApi
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import kotlin.coroutines.resume

/**
 * 화면을 읽고, 누르고, 입력하는 손과 눈.
 * 시스템이 이 서비스를 켜 두는 동안 instance로 접근할 수 있다.
 */
class PhoneAccessibilityService : AccessibilityService() {

    companion object {
        @Volatile var instance: PhoneAccessibilityService? = null
            private set
    }

    private var bubble: Bubble? = null
    @Volatile var lastSnapshot: ScreenSnapshot? = null
        private set

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        bubble = Bubble(this).also { it.syncVisibility() }
        if (Build.VERSION.SDK_INT >= 26) {
            accessibilityButtonController.registerAccessibilityButtonCallback(
                object : AccessibilityButtonController.AccessibilityButtonCallback() {
                    override fun onClicked(controller: AccessibilityButtonController) {
                        kr.phonebutler.agent.AgentRuntime.startListening(this@PhoneAccessibilityService)
                    }
                })
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {}
    override fun onInterrupt() {}

    override fun onDestroy() {
        bubble?.remove()
        bubble = null
        instance = null
        super.onDestroy()
    }

    fun refreshBubble() = bubble?.syncVisibility()

    // ───────── 읽기 ─────────

    fun readScreen(): ScreenSnapshot = ScreenReader.read(this).also { lastSnapshot = it }

    fun element(id: Int): Element? = lastSnapshot?.elements?.get(id)

    // ───────── 누르기 ─────────

    suspend fun tapElement(e: Element, long: Boolean = false): Boolean {
        val n = e.node
        n.refresh()
        val action = if (long) AccessibilityNodeInfo.ACTION_LONG_CLICK else AccessibilityNodeInfo.ACTION_CLICK
        val able = if (long) n.isLongClickable else n.isClickable
        if (able && n.performAction(action)) return true
        // 스스로 눌리지 않는 글자/아이콘은 실제 손가락처럼 그 위치를 터치
        return tapAt(e.bounds.centerX().toFloat(), e.bounds.centerY().toFloat(), long)
    }

    suspend fun tapAt(x: Float, y: Float, long: Boolean = false): Boolean {
        val p = Path().apply { moveTo(x, y) }
        return gesture(p, if (long) 800 else 60)
    }

    suspend fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, ms: Long = 350): Boolean {
        val p = Path().apply { moveTo(x1, y1); lineTo(x2, y2) }
        return gesture(p, ms)
    }

    private suspend fun gesture(path: Path, duration: Long): Boolean {
        withContext(Dispatchers.Main) { bubble?.setTouchThrough(true) }
        try {
            return suspendCancellableCoroutine { cont ->
                val g = GestureDescription.Builder()
                    .addStroke(GestureDescription.StrokeDescription(path, 0, duration))
                    .build()
                val ok = dispatchGesture(g, object : GestureResultCallback() {
                    override fun onCompleted(d: GestureDescription?) { if (cont.isActive) cont.resume(true) }
                    override fun onCancelled(d: GestureDescription?) { if (cont.isActive) cont.resume(false) }
                }, null)
                if (!ok && cont.isActive) cont.resume(false)
            }
        } finally {
            withContext(Dispatchers.Main) { bubble?.setTouchThrough(false) }
        }
    }

    // ───────── 입력 ─────────

    /** 입력창에 글자를 넣는다. target이 없으면 지금 커서가 있는 입력창, 그것도 없으면 화면의 첫 입력창. */
    suspend fun typeText(target: Element?, text: String, append: Boolean): String {
        var node: AccessibilityNodeInfo? = target?.node
        if (node == null) node = findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        if (node == null) {
            node = lastSnapshot?.elements?.values?.firstOrNull { it.node.isEditable }?.node
        }
        if (node == null) return "입력할 칸을 찾지 못했어요. 먼저 입력창을 tap 하세요."
        node.refresh()
        if (!node.isEditable) {
            // 검색 아이콘처럼 눌러야 입력창이 생기는 경우
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            delay(500)
            node = findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return "그 요소는 입력창이 아니에요."
        }
        if (!node.isFocused) {
            node.performAction(AccessibilityNodeInfo.ACTION_FOCUS)
            node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            delay(200)
        }
        val existing = if (Build.VERSION.SDK_INT >= 26 && node.isShowingHintText) "" else node.text?.toString() ?: ""
        val value = if (append) existing + text else text
        val args = Bundle().apply {
            putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, value)
        }
        val ok = node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
        return if (ok) "입력함: \"$value\"" else "입력에 실패했어요."
    }

    /** 키보드의 엔터/검색 키 */
    fun pressEnter(): Boolean {
        val node = findFocus(AccessibilityNodeInfo.FOCUS_INPUT) ?: return false
        if (Build.VERSION.SDK_INT >= 30) {
            return node.performAction(AccessibilityNodeInfo.AccessibilityAction.ACTION_IME_ENTER.id)
        }
        return false
    }

    // ───────── 스크롤 ─────────

    suspend fun scroll(target: Element?, direction: String): Boolean {
        val dm = resources.displayMetrics
        val w = dm.widthPixels.toFloat()
        val h = dm.heightPixels.toFloat()
        val node = target?.node ?: lastSnapshot?.elements?.values
            ?.filter { it.node.isScrollable }
            ?.maxByOrNull { it.bounds.width().toLong() * it.bounds.height() }?.node

        if (node != null && Build.VERSION.SDK_INT >= 23) {
            val act = when (direction) {
                "down" -> AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_DOWN
                "up" -> AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_UP
                "left" -> AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_LEFT
                else -> AccessibilityNodeInfo.AccessibilityAction.ACTION_SCROLL_RIGHT
            }
            if (node.performAction(act.id)) return true
            val fallback = if (direction == "down" || direction == "right")
                AccessibilityNodeInfo.ACTION_SCROLL_FORWARD else AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD
            if (node.performAction(fallback)) return true
        }
        // 손가락으로 쓸어 넘기기 (내용을 아래로 보려면 손가락은 위로)
        return when (direction) {
            "down" -> swipe(w / 2, h * 0.72f, w / 2, h * 0.28f)
            "up" -> swipe(w / 2, h * 0.28f, w / 2, h * 0.72f)
            "left" -> swipe(w * 0.2f, h / 2, w * 0.8f, h / 2)
            else -> swipe(w * 0.8f, h / 2, w * 0.2f, h / 2)
        }
    }

    // ───────── 스크린샷 ─────────

    /** 요소 번호를 그려 넣은 스크린샷(JPEG base64). Android 11 미만이면 null. */
    suspend fun screenshotWithMarks(snapshot: ScreenSnapshot): String? {
        if (Build.VERSION.SDK_INT < 30) return null
        val bmp = withContext(Dispatchers.Main) { capture() } ?: return null
        return withContext(Dispatchers.Default) {
            val canvas = Canvas(bmp)
            val box = Paint().apply { style = Paint.Style.STROKE; strokeWidth = 4f; color = Color.argb(220, 255, 23, 68) }
            val tagBg = Paint().apply { color = Color.argb(220, 255, 23, 68) }
            val tagText = Paint().apply { color = Color.WHITE; textSize = 30f; isFakeBoldText = true; isAntiAlias = true }
            for (e in snapshot.elements.values) {
                val r = e.bounds
                if (!(e.node.isClickable || e.node.isEditable || e.node.isLongClickable || e.node.isCheckable)) continue
                canvas.drawRect(r, box)
                val label = e.id.toString()
                val tw = tagText.measureText(label)
                val tr = Rect(r.left, r.top, (r.left + tw + 12).toInt(), r.top + 36)
                canvas.drawRect(tr, tagBg)
                canvas.drawText(label, r.left + 6f, r.top + 29f, tagText)
            }
            val longSide = maxOf(bmp.width, bmp.height)
            val scale = if (longSide > 1400) 1400f / longSide else 1f
            val out = if (scale < 1f) Bitmap.createScaledBitmap(bmp, (bmp.width * scale).toInt(), (bmp.height * scale).toInt(), true) else bmp
            val bos = ByteArrayOutputStream()
            out.compress(Bitmap.CompressFormat.JPEG, 70, bos)
            Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)
        }
    }

    @SuppressLint("NewApi")
    @RequiresApi(30)
    private suspend fun capture(): Bitmap? = suspendCancellableCoroutine { cont ->
        takeScreenshot(Display.DEFAULT_DISPLAY, mainExecutor, object : TakeScreenshotCallback {
            override fun onSuccess(result: ScreenshotResult) {
                val hb = result.hardwareBuffer
                val bmp = Bitmap.wrapHardwareBuffer(hb, result.colorSpace)?.copy(Bitmap.Config.ARGB_8888, true)
                hb.close()
                if (cont.isActive) cont.resume(bmp)
            }
            override fun onFailure(errorCode: Int) { if (cont.isActive) cont.resume(null) }
        })
    }
}
