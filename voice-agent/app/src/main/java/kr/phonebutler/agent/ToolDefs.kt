package kr.phonebutler.agent

import com.anthropic.core.JsonValue
import com.anthropic.models.messages.Tool

/** Claude에게 알려 주는 휴대폰 조작 도구 목록 (실행은 PhoneTools가 한다). */
object ToolDefs {
    val ALL: List<Tool> = listOf(
        tool("read_screen", "지금 화면의 UI 요소 목록을 읽는다. 각 줄은 [번호] 종류 \"글자\" @x,y {click,edit,scroll…} 형식이다. 번호는 가장 최근에 읽은 화면 기준이다."),
        tool("screenshot", "요소 번호가 빨간 상자로 표시된 화면 사진을 본다. 아이콘만 있는 버튼, 영상 썸네일처럼 글자만으로 구분이 어려울 때 쓴다."),
        tool("tap", "화면의 요소를 누른다. element(번호)를 주거나, 번호가 없는 곳은 x,y 화면 좌표를 준다.",
            props = mapOf("element" to int("read_screen/screenshot의 요소 번호"),
                "x" to int("화면 x 좌표(픽셀)"), "y" to int("화면 y 좌표(픽셀)"))),
        tool("long_press", "요소를 길게 누른다.",
            props = mapOf("element" to int("요소 번호"), "x" to int("x 좌표"), "y" to int("y 좌표"))),
        tool("type_text", "입력창에 글자를 넣는다. element가 없으면 지금 커서가 있는 입력창에 넣는다. 기존 글자는 지워진다(append=true면 뒤에 덧붙임). 메시지 전송은 이 도구로 되지 않으니 입력 후 전송 버튼을 tap 해야 한다.",
            props = mapOf("element" to int("입력창 요소 번호"), "text" to str("넣을 글자"),
                "append" to mapOf("type" to "boolean", "description" to "기존 글자 뒤에 덧붙일지")),
            required = listOf("text")),
        tool("press_key", "시스템 키를 누른다. enter는 키보드의 검색/완료/엔터 키.",
            props = mapOf("key" to mapOf("type" to "string", "enum" to listOf("back", "home", "recents", "notifications", "enter"))),
            required = listOf("key")),
        tool("scroll", "화면을 스크롤한다. down = 아래쪽 내용 보기.",
            props = mapOf("direction" to mapOf("type" to "string", "enum" to listOf("up", "down", "left", "right")),
                "element" to int("스크롤할 목록의 요소 번호(없으면 화면에서 가장 큰 목록)")),
            required = listOf("direction")),
        tool("swipe", "x1,y1에서 x2,y2로 손가락을 쓸어 넘긴다.",
            props = mapOf("x1" to int("시작 x"), "y1" to int("시작 y"), "x2" to int("끝 x"), "y2" to int("끝 y"),
                "duration_ms" to int("걸리는 시간(기본 350)")),
            required = listOf("x1", "y1", "x2", "y2")),
        tool("open_app", "설치된 앱을 이름으로 연다(예: 카카오톡, 유튜브, 카메라, 설정). 정확한 이름이 아니어도 비슷하면 찾는다.",
            props = mapOf("name" to str("앱 이름")), required = listOf("name")),
        tool("youtube_search", "유튜브 앱에서 검색 결과 화면을 바로 연다. 영상 재생은 결과에서 영상을 tap 해야 한다.",
            props = mapOf("query" to str("검색어")), required = listOf("query")),
        tool("open_url", "링크를 연다(http/https, tel:(전화 앱에 번호만 입력), geo:, market: 등).",
            props = mapOf("url" to str("주소")), required = listOf("url")),
        tool("wait", "화면이 로딩될 때까지 기다린 뒤 화면을 다시 읽는다.",
            props = mapOf("seconds" to mapOf("type" to "number", "description" to "기다릴 초(최대 8)")),
            required = listOf("seconds")),
        tool("list_notifications", "최근에 온 메시지 알림(카카오톡, 문자 등)을 본다. 각 항목의 번호로 reply_notification을 쓸 수 있다.",
            props = mapOf("app" to str("앱 이름으로 거르기(예: 카톡). 비우면 전부"))),
        tool("reply_notification", "알림의 답장 기능으로 앱을 열지 않고 바로 답장한다. 앱이 보내기 전에 사용자에게 직접 확인한다.",
            props = mapOf("id" to int("list_notifications의 항목 번호"), "text" to str("보낼 내용")),
            required = listOf("id", "text")),
        tool("ask_user", "사용자에게 소리로 짧게 묻고 음성 대답을 받는다. 확인(보낼까요?)이나 꼭 필요한 되묻기에만 쓴다.",
            props = mapOf("question" to str("물어볼 말(한 문장, 말하듯이)")), required = listOf("question")),
    )

    private fun tool(
        name: String, desc: String,
        props: Map<String, Any> = emptyMap(), required: List<String> = emptyList(),
    ): Tool {
        val p = Tool.InputSchema.Properties.builder()
        props.forEach { (k, v) -> p.putAdditionalProperty(k, JsonValue.from(v)) }
        val schema = Tool.InputSchema.builder().properties(p.build())
        if (required.isNotEmpty()) schema.required(required)
        return Tool.builder().name(name).description(desc).inputSchema(schema.build()).build()
    }

    private fun int(desc: String) = mapOf("type" to "integer", "description" to desc)
    private fun str(desc: String) = mapOf("type" to "string", "description" to desc)
}
