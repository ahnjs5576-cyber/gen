package kr.phonebutler.agent

import android.content.Context
import android.content.Intent

/** "유튜브", "카톡" 같은 말로 설치된 앱을 찾는다. */
object AppFinder {
    class App(val label: String, val pkg: String)

    private val aliases = mapOf(
        "카톡" to "com.kakao.talk", "카카오톡" to "com.kakao.talk", "kakaotalk" to "com.kakao.talk",
        "유튜브" to "com.google.android.youtube", "유투브" to "com.google.android.youtube", "youtube" to "com.google.android.youtube",
        "유튜브뮤직" to "com.google.android.apps.youtube.music",
        "크롬" to "com.android.chrome", "chrome" to "com.android.chrome",
        "네이버" to "com.nhn.android.search", "카카오맵" to "net.daum.android.map", "네이버지도" to "com.nhn.android.nmap",
        "카카오택시" to "com.kakao.taxi", "카카오t" to "com.kakao.taxi",
        "지메일" to "com.google.android.gm", "gmail" to "com.google.android.gm",
        "인스타" to "com.instagram.android", "인스타그램" to "com.instagram.android",
        "넷플릭스" to "com.netflix.mediaclient", "멜론" to "com.iloen.melon", "쿠팡" to "com.coupang.mobile",
        "플레이스토어" to "com.android.vending", "구글플레이" to "com.android.vending",
    )

    private fun norm(s: String) = s.lowercase().replace(Regex("[\\s·._\\-]"), "").removeSuffix("앱")

    private fun all(ctx: Context): List<App> {
        val pm = ctx.packageManager
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        return pm.queryIntentActivities(intent, 0).map {
            App(it.loadLabel(pm).toString(), it.activityInfo.packageName)
        }.distinctBy { it.pkg }
    }

    fun find(ctx: Context, name: String): App? {
        val q = norm(name)
        if (q.isEmpty()) return null
        val apps = all(ctx)
        aliases[q]?.let { pkg -> apps.firstOrNull { it.pkg == pkg }?.let { return it } }
        apps.firstOrNull { norm(it.label) == q }?.let { return it }
        apps.firstOrNull { norm(it.label).startsWith(q) }?.let { return it }
        apps.firstOrNull { norm(it.label).contains(q) }?.let { return it }
        apps.firstOrNull { q.contains(norm(it.label)) && norm(it.label).length >= 2 }?.let { return it }
        apps.firstOrNull { it.pkg.lowercase().contains(q) }?.let { return it }
        return null
    }

    fun suggest(ctx: Context, name: String): List<String> {
        val q = norm(name)
        return all(ctx).map { it.label }
            .sortedBy { label -> -q.count { ch -> norm(label).contains(ch) } }
            .take(8)
    }
}
