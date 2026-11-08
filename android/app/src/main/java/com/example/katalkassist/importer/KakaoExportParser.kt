package com.example.katalkassist.importer

import java.util.Calendar

/**
 * Parses a KakaoTalk "대화 내보내기" (.txt) export — the OFFICIAL, user-initiated
 * export. No root, no DB, no decryption. The user owns this file.
 *
 * Android export format (the common one):
 *
 *   저장한 대화 : 홍길동님과 카카오톡 대화
 *   저장한 날짜 : 2025-11-08 15:30:00
 *
 *   2025년 11월 8일 오후 3:21, 홍길동 : 안녕하세요
 *   2025년 11월 8일 오후 3:22, 나 : 네 안녕하세요
 *   (줄바꿈이 있는 메시지는 다음 줄에 이어짐)
 *
 * Also tolerates "--------------- 2025년 11월 8일 금요일 ---------------" date dividers
 * (ignored — each message line already carries its own full timestamp).
 */
object KakaoExportParser {

    data class ParsedMessage(
        val sender: String,
        val text: String,
        val epochMillis: Long
    )

    data class Result(
        val roomName: String,
        val messages: List<ParsedMessage>
    )

    // 2025년 11월 8일 오후 3:21, 홍길동 : 메시지
    private val LINE = Regex(
        """^(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)\s*(\d{1,2}):(\d{2}),\s*(.+?)\s*:\s*(.*)$"""
    )

    // 저장한 대화 : 홍길동님과 카카오톡 대화
    private val TITLE = Regex("""^저장한 대화\s*:\s*(.+?)(?:님과 카카오톡 대화)?\s*$""")

    fun parse(lines: Sequence<String>, fallbackRoomName: String = "가져온 대화"): Result {
        var roomName = fallbackRoomName
        val messages = ArrayList<ParsedMessage>()

        for (raw in lines) {
            val line = raw.trimEnd('\r', '\n')

            val title = TITLE.matchEntire(line.trim())
            if (title != null) {
                roomName = title.groupValues[1].trim().ifBlank { roomName }
                continue
            }

            val m = LINE.matchEntire(line)
            if (m == null) {
                // Continuation of the previous message (multi-line), or a header/
                // divider we ignore. Only append if it clearly isn't a header.
                if (messages.isNotEmpty() && line.isNotBlank() && !isHeaderOrDivider(line)) {
                    val last = messages.removeAt(messages.size - 1)
                    messages.add(last.copy(text = last.text + "\n" + line))
                }
                continue
            }

            val (y, mon, d, ampm, h, min, sender, text) = m.destructured
            val epoch = toEpoch(
                year = y.toInt(), month = mon.toInt(), day = d.toInt(),
                ampm = ampm, hour12 = h.toInt(), minute = min.toInt()
            )
            messages.add(ParsedMessage(sender.trim(), text, epoch))
        }
        return Result(roomName, messages)
    }

    private fun isHeaderOrDivider(line: String): Boolean {
        val t = line.trim()
        return t.startsWith("저장한 ") || t.startsWith("---") ||
            Regex("""^-+\s*\d{4}년.*-+$""").matches(t)
    }

    private fun toEpoch(
        year: Int, month: Int, day: Int, ampm: String, hour12: Int, minute: Int
    ): Long {
        var hour = hour12 % 12
        if (ampm == "오후") hour += 12
        val cal = Calendar.getInstance()
        cal.clear()
        cal.set(year, month - 1, day, hour, minute, 0)
        return cal.timeInMillis
    }
}
