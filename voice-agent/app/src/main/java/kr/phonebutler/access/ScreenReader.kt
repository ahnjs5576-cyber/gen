package kr.phonebutler.access

import android.graphics.Rect
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo

/** 화면의 UI 요소 하나. id는 가장 최근 read 기준 번호. */
class Element(
    val id: Int,
    val node: AccessibilityNodeInfo,
    val bounds: Rect,
    val line: String,
)

/** 화면 한 장을 Claude가 읽기 좋은 짧은 텍스트로 바꾼 결과 */
class ScreenSnapshot(
    val packageName: String,
    val text: String,
    val elements: Map<Int, Element>,
    val width: Int,
    val height: Int,
)

/**
 * 접근성 트리를 훑어서 "의미 있는" 요소만 번호를 붙여 나열한다.
 *  [12] Button "보내기" @540,2100 {click}
 */
object ScreenReader {
    private const val MAX_ELEMENTS = 220
    private const val MAX_CHARS = 14_000
    private const val MAX_TEXT = 90
    private const val MAX_VISITED = 2500 // 아주 큰 화면에서 오래 걸리지 않게

    fun read(service: PhoneAccessibilityService): ScreenSnapshot {
        val dm = service.resources.displayMetrics
        val width = dm.widthPixels
        val height = dm.heightPixels
        val roots = collectRoots(service)
        val elements = LinkedHashMap<Int, Element>()
        val sb = StringBuilder()
        var pkg = ""
        var nextId = 1
        var visited = 0

        for ((title, root) in roots) {
            if (pkg.isEmpty()) pkg = root.packageName?.toString() ?: ""
            sb.append("── 창: ").append(title).append('\n')
            val stack = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
            stack.addLast(root to 0)
            while (stack.isNotEmpty() && visited < MAX_VISITED) {
                val (node, depth) = stack.removeLast()
                visited++
                // 자식은 역순으로 넣어야 화면 순서대로 나온다
                for (i in node.childCount - 1 downTo 0) {
                    node.getChild(i)?.let { stack.addLast(it to depth + 1) }
                }
                if (!node.isVisibleToUser) continue
                val r = Rect().also { node.getBoundsInScreen(it) }
                if (r.width() <= 1 || r.height() <= 1) continue
                if (!isInteresting(node)) continue
                if (elements.size >= MAX_ELEMENTS || sb.length > MAX_CHARS) continue

                val id = nextId++
                val line = describe(id, node, r)
                elements[id] = Element(id, node, r, line)
                sb.append(line).append('\n')
            }
        }
        if (elements.size >= MAX_ELEMENTS || sb.length > MAX_CHARS) {
            sb.append("(요소가 많아 일부 생략됨. 필요하면 scroll 하거나 screenshot 사용)\n")
        }
        if (roots.isEmpty()) sb.append("(화면 내용을 읽을 수 없음 — 잠금화면이거나 보안 화면일 수 있음. screenshot을 시도해 보세요)\n")
        val header = "앱: $pkg | 화면 ${width}x$height\n"
        return ScreenSnapshot(pkg, header + sb.toString(), elements, width, height)
    }

    private fun collectRoots(service: PhoneAccessibilityService): List<Pair<String, AccessibilityNodeInfo>> {
        val own = service.packageName
        val out = mutableListOf<Pair<String, AccessibilityNodeInfo>>()
        try {
            val wins = service.windows.sortedByDescending { it.layer }
            for (w in wins) {
                if (w.type == AccessibilityWindowInfo.TYPE_ACCESSIBILITY_OVERLAY) continue
                if (w.type == AccessibilityWindowInfo.TYPE_INPUT_METHOD) continue
                val root = w.root ?: continue
                if (root.packageName?.toString() == own) continue
                // 상태바·내비게이션바는 대부분 쓸모없지만, 알림창을 내렸을 땐 필요하므로 SYSTEM 창은 내용이 많을 때만 포함
                if (w.type == AccessibilityWindowInfo.TYPE_SYSTEM) {
                    val r = Rect().also { w.getBoundsInScreen(it) }
                    if (r.height() < service.resources.displayMetrics.heightPixels / 4) continue
                }
                val title = (w.title?.toString() ?: root.packageName?.toString() ?: "?") +
                    if (w.isActive) " (활성)" else ""
                out += title to root
            }
        } catch (_: Exception) {}
        if (out.isEmpty()) {
            service.rootInActiveWindow?.let { r ->
                if (r.packageName?.toString() != own) out += (r.packageName?.toString() ?: "?") to r
            }
        }
        return out
    }

    private fun isInteresting(n: AccessibilityNodeInfo): Boolean {
        return !n.text.isNullOrBlank() || !n.contentDescription.isNullOrBlank() ||
            n.isClickable || n.isLongClickable || n.isEditable || n.isScrollable || n.isCheckable
    }

    private fun describe(id: Int, n: AccessibilityNodeInfo, r: Rect): String {
        val cls = n.className?.toString()?.substringAfterLast('.') ?: "View"
        val sb = StringBuilder("[").append(id).append("] ").append(cls)
        val text = clean(n.text)
        val desc = clean(n.contentDescription)
        val hint = if (android.os.Build.VERSION.SDK_INT >= 26) clean(n.hintText) else ""
        val showingHint = android.os.Build.VERSION.SDK_INT >= 26 && n.isShowingHintText
        if (text.isNotEmpty()) sb.append(" \"").append(text).append('"').append(if (showingHint) "(안내문구)" else "")
        if (desc.isNotEmpty() && desc != text) sb.append(" 설명=\"").append(desc).append('"')
        if (hint.isNotEmpty() && hint != text) sb.append(" 힌트=\"").append(hint).append('"')
        val viewId = n.viewIdResourceName?.substringAfterLast('/')
        if (!viewId.isNullOrEmpty() && text.isEmpty() && desc.isEmpty()) sb.append(" id=").append(viewId)
        sb.append(" @").append(r.centerX()).append(',').append(r.centerY())
        val flags = mutableListOf<String>()
        if (n.isClickable) flags += "click"
        if (n.isLongClickable) flags += "long"
        if (n.isEditable) flags += "edit"
        if (n.isScrollable) flags += "scroll"
        if (n.isCheckable) flags += if (n.isChecked) "checked" else "unchecked"
        if (n.isSelected) flags += "selected"
        if (n.isFocused) flags += "focused"
        if (!n.isEnabled) flags += "disabled"
        if (flags.isNotEmpty()) sb.append(" {").append(flags.joinToString(",")).append('}')
        return sb.toString()
    }

    private fun clean(cs: CharSequence?): String {
        if (cs.isNullOrBlank()) return ""
        val s = cs.toString().replace('\n', ' ').replace(Regex("\\s+"), " ").trim()
        return if (s.length > MAX_TEXT) s.take(MAX_TEXT) + "…" else s
    }
}
