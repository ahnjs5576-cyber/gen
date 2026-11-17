package com.malophone.agent.core

/**
 * 말로 한 명령을 해석한 결과. 규칙 파서(RuleParser)와 Claude(ClaudeAgent) 둘 다 이 형태로 만든다.
 * 순수 Kotlin이어야 한다(안드로이드 클래스 금지) - 파서 단위 테스트가 JVM에서 돈다.
 */
sealed interface Action {
    /** 앱 열기. appName은 사용자가 말한 이름 그대로(예: "카톡", "유튜브", "네이버 지도"). */
    data class OpenApp(val appName: String) : Action

    /** 유튜브에서 검색해 첫 영상을 바로 재생. */
    data class YouTubePlay(val query: String) : Action

    /** 유튜브 검색 결과 화면만 연다(재생하지 않음). */
    data class YouTubeSearch(val query: String) : Action

    /** 카카오톡 채팅방 들어가기. room은 채팅방 이름 또는 친구 이름. */
    data class KakaoOpenChat(val room: String) : Action

    /** 카카오톡 채팅방에 메시지를 입력하고 전송. message는 사용자가 말한 그대로. */
    data class KakaoSendMessage(val room: String, val message: String) : Action

    /** 전화 걸기. target은 연락처 이름 또는 전화번호. */
    data class Call(val target: String) : Action

    /** 알람 맞추기. hour는 0..23, minute는 0..59. */
    data class SetAlarm(val hour: Int, val minute: Int, val label: String? = null) : Action

    /** 타이머. */
    data class SetTimer(val seconds: Int) : Action

    /** 웹 검색(기본 브라우저/구글). */
    data class WebSearch(val query: String) : Action

    data object GoBack : Action
    data object GoHome : Action

    /** 정해진 기능으로 안 되는 일: 화면을 보면서 AI가 직접 누르고 입력한다. API 키가 필요하다. */
    data class ScreenTask(val goal: String) : Action
}

/** 실행 기록과 화면 표시에 쓰는 한국어 설명. */
fun Action.describe(): String = when (this) {
    is Action.OpenApp -> "'$appName' 앱 열기"
    is Action.YouTubePlay -> "유튜브에서 '$query' 재생"
    is Action.YouTubeSearch -> "유튜브에서 '$query' 검색"
    is Action.KakaoOpenChat -> "카카오톡 '$room' 채팅방 열기"
    is Action.KakaoSendMessage -> "카카오톡 '$room'에게 \"$message\" 보내기"
    is Action.Call -> "'$target'에게 전화"
    is Action.SetAlarm -> "%d시 %02d분 알람".format(hour, minute) + (label?.let { " ($it)" } ?: "")
    is Action.SetTimer -> "${formatDuration(seconds)} 타이머"
    is Action.WebSearch -> "'$query' 웹 검색"
    Action.GoBack -> "뒤로 가기"
    Action.GoHome -> "홈 화면으로"
    is Action.ScreenTask -> "화면 조작: $goal"
}

/** 화면을 직접 조작하는 동작인지. 규칙 실행이 실패했을 때 AI로 다시 시도할 대상이다. */
fun Action.isScreenAutomation(): Boolean = when (this) {
    is Action.KakaoOpenChat, is Action.KakaoSendMessage, is Action.OpenApp, is Action.YouTubePlay -> true
    else -> false
}

fun formatDuration(totalSeconds: Int): String {
    val h = totalSeconds / 3600
    val m = (totalSeconds % 3600) / 60
    val s = totalSeconds % 60
    return buildList {
        if (h > 0) add("${h}시간")
        if (m > 0) add("${m}분")
        if (s > 0 || (h == 0 && m == 0)) add("${s}초")
    }.joinToString(" ")
}

/** 규칙 파서 결과. confident=false면 AI 키가 있을 때 AI 해석을 우선한다. */
data class ParseResult(val actions: List<Action>, val confident: Boolean)
