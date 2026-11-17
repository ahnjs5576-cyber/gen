package com.malophone.agent.parse

/**
 * 한국어 문자열 유틸. 순수 Kotlin(안드로이드 의존 없음) - JVM 단위 테스트 대상.
 * 음성 인식(STT)은 띄어쓰기·받침이 자주 틀리므로 이름 비교는 자모 단위 유사도로 한다.
 */
object KoreanText {

    private const val HANGUL_BASE = 0xAC00
    private const val HANGUL_END = 0xD7A3

    private val CHOSEONG = charArrayOf(
        'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
        'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
    )
    private val JUNGSEONG = charArrayOf(
        'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
        'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
    )
    private val JONGSEONG = arrayOf(
        "", "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ", "ㄷ", "ㄹ", "ㄺ",
        "ㄻ", "ㄼ", "ㄽ", "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ", "ㅅ",
        "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
    )

    fun isHangulSyllable(c: Char): Boolean = c.code in HANGUL_BASE..HANGUL_END

    /** 소문자로 바꾸고 한글·영문·숫자만 남긴다(공백·문장부호·이모지 제거). */
    fun normalize(s: String): String = buildString(s.length) {
        for (c in s.lowercase()) {
            if (isHangulSyllable(c) || c in 'a'..'z' || c in '0'..'9' || c in 'ㄱ'..'ㅣ') append(c)
        }
    }

    /** 한글 음절을 자모로 푼다. "강" → "ㄱㅏㅇ". 한글이 아닌 글자는 그대로 둔다. */
    fun decomposeJamo(s: String): String = buildString(s.length * 3) {
        for (c in s) {
            if (isHangulSyllable(c)) {
                val code = c.code - HANGUL_BASE
                append(CHOSEONG[code / (21 * 28)])
                append(JUNGSEONG[(code % (21 * 28)) / 28])
                append(JONGSEONG[code % 28])
            } else {
                append(c)
            }
        }
    }

    /** 초성만 뽑는다. "카카오톡" → "ㅋㅋㅇㅌ". */
    fun choseong(s: String): String = buildString {
        for (c in s) {
            if (isHangulSyllable(c)) append(CHOSEONG[(c.code - HANGUL_BASE) / (21 * 28)]) else append(c)
        }
    }

    fun levenshtein(a: String, b: String): Int {
        if (a == b) return 0
        if (a.isEmpty()) return b.length
        if (b.isEmpty()) return a.length
        var prev = IntArray(b.length + 1) { it }
        var cur = IntArray(b.length + 1)
        for (i in 1..a.length) {
            cur[0] = i
            for (j in 1..b.length) {
                val cost = if (a[i - 1] == b[j - 1]) 0 else 1
                cur[j] = minOf(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost)
            }
            val t = prev; prev = cur; cur = t
        }
        return prev[b.length]
    }

    /** 0.0~1.0. 정규화 후 자모 단위 편집 거리로 비교한다. */
    fun similarity(a: String, b: String): Double {
        val x = decomposeJamo(normalize(a))
        val y = decomposeJamo(normalize(b))
        if (x.isEmpty() || y.isEmpty()) return 0.0
        val d = levenshtein(x, y)
        return 1.0 - d.toDouble() / maxOf(x.length, y.length)
    }

    /**
     * 사용자가 말한 이름(query)이 후보 이름(candidate)과 얼마나 맞는지. 0.0~1.0.
     * 정확히 같음 1.0 > 후보가 query로 시작 0.95 > 후보가 query를 포함 0.9 >
     * query가 후보를 포함(후보 2글자 이상) 0.85 > 그 밖에는 자모 유사도 × 0.85.
     */
    fun matchScore(query: String, candidate: String): Double {
        val q = normalize(query)
        val c = normalize(candidate)
        if (q.isEmpty() || c.isEmpty()) return 0.0
        if (q == c) return 1.0
        if (c.startsWith(q)) return 0.95
        if (c.contains(q)) return 0.9
        if (c.length >= 2 && q.contains(c)) return 0.85
        return similarity(q, c) * 0.85
    }

    private val NATIVE_UNITS = mapOf(
        "한" to 1, "하나" to 1, "두" to 2, "둘" to 2, "세" to 3, "셋" to 3, "석" to 3, "네" to 4, "넷" to 4,
        "다섯" to 5, "여섯" to 6, "일곱" to 7, "여덟" to 8, "아홉" to 9,
    )
    private val NATIVE_TENS = mapOf("열" to 10, "스물" to 20, "스무" to 20, "서른" to 30, "마흔" to 40, "쉰" to 50)
    private val SINO_DIGITS = mapOf(
        '영' to 0, '공' to 0, '일' to 1, '이' to 2, '삼' to 3, '사' to 4, '오' to 5,
        '육' to 6, '칠' to 7, '팔' to 8, '구' to 9,
    )

    /**
     * 숫자 표현을 정수로. "7", "15", "한", "두", "열두", "스물다섯", "삼십", "이십오", "십" 등.
     * 알 수 없으면 null.
     */
    fun parseKoreanNumber(raw: String): Int? {
        val s = raw.trim().replace(" ", "")
        if (s.isEmpty()) return null
        s.toIntOrNull()?.let { return it }

        // 고유어: (열|스물|서른|마흔|쉰)? + (한|두|...)?
        run {
            var rest = s
            var total = 0
            var matched = false
            for ((word, value) in NATIVE_TENS) {
                if (rest.startsWith(word)) {
                    total += value; rest = rest.removePrefix(word); matched = true; break
                }
            }
            if (rest.isNotEmpty()) {
                val unit = NATIVE_UNITS.entries.sortedByDescending { it.key.length }
                    .firstOrNull { rest == it.key }
                if (unit != null) {
                    total += unit.value; rest = ""; matched = true
                }
            }
            if (matched && rest.isEmpty()) return total
        }

        // 한자어: 삼십오, 이십, 십이, 백 등 (0~999)
        run {
            var total = 0
            var current = 0
            for (c in s) {
                when {
                    c in SINO_DIGITS -> current = SINO_DIGITS.getValue(c)
                    c == '십' -> { total += (if (current == 0) 1 else current) * 10; current = 0 }
                    c == '백' -> { total += (if (current == 0) 1 else current) * 100; current = 0 }
                    else -> return null
                }
            }
            return total + current
        }
    }

    private val TRAILING_PARTICLES = listOf(
        "에게서", "한테서", "에게", "한테", "께서", "께", "에서", "으로", "로", "이랑", "랑", "하고",
        "은", "는", "이", "가", "을", "를", "의", "도", "에", "요",
    )

    /**
     * 끝에 붙은 조사를 한 번 떼어낸다. "엄마한테" → "엄마", "유튜브에서" → "유튜브".
     * 남는 부분이 1글자 이하가 되면 떼지 않는다(예: "가"로 끝나는 2글자 이름 보호).
     */
    fun stripTrailingParticle(word: String): String {
        val w = word.trim()
        for (p in TRAILING_PARTICLES) {
            if (w.endsWith(p) && w.length - p.length >= 2) return w.removeSuffix(p).trim()
        }
        return w
    }
}
