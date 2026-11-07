"""개인정보 보호 도구.

* 가명 처리(기본값): Claude 로 보내기 전에 참여자 이름을 '상대1', '상대2' 로, 본인 이름을
  '[본인]' 으로 바꾸고, 전화번호·이메일·계좌번호·주민번호처럼 보이는 문자열을 가린다.
  받은 결과에서는 '상대N' 을 원래 이름으로 되돌린다 (가린 번호는 되돌리지 않는다).
* 로그용 요약: 이름과 내용 대신 개수만 남긴다.

한국어는 띄어쓰기로 단어를 나눌 수 없어서, 이름 뒤에 조사(야, 가, 한테 …)가 붙거나 아무것도
붙지 않은 경우에만 이름으로 본다. '지수함수', '우리 내일' 처럼 단어 일부가 바뀌지 않게 하기 위해서다.

한계: 대화에 참여하지 않은 제3자의 이름(예: "지은이도 온대")은 알아낼 방법이 없어 가리지 못한다.
"""

from __future__ import annotations

import re
from dataclasses import replace

from .parser import Chat

# ------------------------------------------------------------------ 식별정보 가림

# 한글은 \w 로 취급돼 '010-1234-5678로' 에서 \b 가 동작하지 않으므로 숫자 경계를 직접 쓴다.
_D0 = r"(?<!\d)"
_D1 = r"(?!\d)"
_YYMMDD = r"\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])"
_DATE = re.compile(r"^(?:(?:19|20)?\d{2})[-.](?:0?[1-9]|1[0-2])[-.](?:0?[1-9]|[12]\d|3[01])$")

_PATTERNS = [
    (re.compile(_D0 + _YYMMDD + r"[-\s]?[1-4]\d{6}" + _D1), "[주민번호]"),
    (re.compile(r"\+82[-.\s]?1[016789][-.\s]?\d{3,4}[-.\s]?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}" + _D1), "[전화번호]"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}"), "[이메일]"),
]
_ACCOUNT_HYPHEN = re.compile(_D0 + r"\d{2,6}(?:-\d{2,8}){2,3}" + _D1)
_ACCOUNT_PLAIN = re.compile(_D0 + r"\d{10,14}" + _D1)


def _mask_account(m: re.Match) -> str:
    raw = m.group(0)
    if _DATE.match(raw) or sum(c.isdigit() for c in raw) < 10:  # 날짜, '10-20-30' 같은 짧은 숫자는 그대로
        return raw
    return "[계좌번호]"


def mask_identifiers(text: str) -> str:
    for pattern, label in _PATTERNS:
        text = pattern.sub(label, text)
    text = _ACCOUNT_HYPHEN.sub(_mask_account, text)
    return _ACCOUNT_PLAIN.sub("[계좌번호]", text)


# ------------------------------------------------------------------ 이름 가명 처리

# 이름 뒤에 붙을 수 있는 말 (긴 것부터). 0~2개까지 이어 붙을 수 있다 (예: 민수한테도).
_PARTICLES = sorted([
    "이랑", "이한테", "이에게", "이가", "이는", "이도", "이를", "이야", "이만", "이네", "이지", "이의",
    "한테", "에게", "께서", "께", "하고", "랑", "님", "씨", "군", "양", "야", "아", "이",
    "가", "는", "은", "를", "을", "도", "만", "의", "와", "과", "요",
], key=len, reverse=True)
# 성을 뺀 이름(김민수 → 민수)은 흔한 단어와 겹치기 쉬워('하나도', '우리') 부르는 꼴에서만 바꾼다.
_ADDRESS_PARTICLES = sorted(["야", "아", "님", "씨", "이가", "이는", "이도", "이랑", "이한테", "이야", "한테", "에게"],
                            key=len, reverse=True)
_WORD = r"[가-힣A-Za-z0-9]"


def _name_regex(name: str, suffixes: list[str], require_suffix: bool) -> re.Pattern:
    suf = "(?:" + "|".join(map(re.escape, suffixes)) + ")"
    tail = suf + "{1,2}" if require_suffix else suf + "{0,2}"
    return re.compile(rf"(?<!{_WORD}){re.escape(name)}(?={tail}(?!{_WORD}))")


class Pseudonymizer:
    ME = "[본인]"

    def __init__(self, chat: Chat, me: str | None):
        """``chat`` 은 기간 필터를 적용하기 **전** 전체 대화를 넘겨야 모든 참여자가 잡힌다."""
        self.sender_map: dict[str, str] = {}
        self.backward: dict[str, str] = {}
        rules: list[tuple[str, re.Pattern, str]] = []

        names = list(chat.participants)
        others = [n for n in names if n != me]
        # 1:1 방 제목은 보통 상대 이름이다. 단체방 제목('가족', '팀 프로젝트')은 사람 이름이 아니므로 제외.
        if chat.title and chat.title not in names and len(others) <= 1 and re.fullmatch(r"[가-힣A-Za-z]{2,10}", chat.title):
            names.append(chat.title)

        n = 0
        for name in names:
            if name == me:
                alias = self.ME
            else:
                n += 1
                alias = f"상대{n}"
                self.backward[alias] = name
            self.sender_map[name] = alias
            clean = name.strip()
            if len(clean) >= 2:  # 한 글자 이름은 본문에서 바꾸면 문장이 망가진다
                rules.append((clean, _name_regex(clean, _PARTICLES, require_suffix=False), alias))
            if re.fullmatch(r"[가-힣]{3}", clean):
                given = clean[1:]
                rules.append((given, _name_regex(given, _ADDRESS_PARTICLES, require_suffix=True), alias))
        # 긴 이름부터 바꿔야 '김민수'가 '민수'보다 먼저 처리된다.
        self._rules = sorted(rules, key=lambda r: len(r[0]), reverse=True)
        self._restore_re = (re.compile("|".join(sorted(map(re.escape, self.backward), key=len, reverse=True)) + r"(?!\d)")
                            if self.backward else None)

    def text(self, text: str) -> str:
        # 번호를 먼저 가린다. 이름을 먼저 바꾸면 '민수9001011234567' 처럼 별칭 숫자가 번호에 붙어 버린다.
        text = mask_identifiers(text)
        for _, rx, alias in self._rules:
            text = rx.sub(alias, text)
        return text

    def apply(self, chat: Chat) -> Chat:
        msgs = [replace(m, sender=self.sender_map.get(m.sender, m.sender), text=self.text(m.text))
                for m in chat.messages]
        title = self.text(chat.title) if chat.title else chat.title
        return Chat(title=title, saved_at=chat.saved_at, messages=msgs)

    def restore(self, text: str) -> str:
        if not self._restore_re:
            return text
        return self._restore_re.sub(lambda m: self.backward[m.group(0)], text)


def log_summary(chat: Chat) -> str:
    """로그에 남겨도 되는 정보만: 이름·내용 없이 개수만."""
    return f"messages={len(chat.messages)} participants={len(chat.participants)}"
