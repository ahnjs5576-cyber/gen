"""개인정보 보호 도구.

* 가명 처리(기본값): Claude 로 보내기 전에 참여자 이름을 '상대1', '상대2' 로, 본인 이름을
  '본인' 으로 바꾸고, 전화번호·이메일·계좌번호·주민번호처럼 보이는 문자열을 가린다.
  받은 결과에서는 '상대N' 을 원래 이름으로 되돌린다 (가린 번호는 되돌리지 않는다).
* 로그용 요약: 이름과 내용 대신 개수만 남긴다.

한계: 대화에 참여하지 않은 제3자의 이름(예: "지은이도 온대")은 알아낼 방법이 없어 가리지 못한다.
"""

from __future__ import annotations

import re
from dataclasses import replace

from .parser import Chat

# 한글은 \w 로 취급돼 '010-1234-5678로' 에서 \b 가 동작하지 않으므로 숫자 경계를 직접 쓴다.
_D0 = r"(?<!\d)"
_D1 = r"(?!\d)"
_DATE = re.compile(r"^(19|20)\d{2}[-.](0?[1-9]|1[0-2])[-.](0?[1-9]|[12]\d|3[01])$")

_PATTERNS = [
    (re.compile(_D0 + r"\d{6}[-\s]?[1-4]\d{6}" + _D1), "[주민번호]"),
    (re.compile(_D0 + r"01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"0\d{1,2}[-.\s]\d{3,4}[-.\s]\d{4}" + _D1), "[전화번호]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[A-Za-z]{2,}(?:\.[A-Za-z]{2,})*"), "[이메일]"),
]
_ACCOUNT = re.compile(_D0 + r"\d{2,6}-\d{2,6}-\d{2,8}(?:-\d{1,4})?" + _D1)


def _mask_account(m: re.Match) -> str:
    # 2026-11-06 같은 날짜는 그대로 둔다.
    return m.group(0) if _DATE.match(m.group(0)) else "[계좌번호]"


def mask_identifiers(text: str) -> str:
    for pattern, label in _PATTERNS:
        text = pattern.sub(label, text)
    return _ACCOUNT.sub(_mask_account, text)


def _name_variants(name: str) -> list[str]:
    """본문에서 찾을 이름 형태. '김민수' 면 '민수' 처럼 성을 뺀 이름도 포함한다."""
    name = name.strip()
    variants = [name]
    if re.fullmatch(r"[가-힣]{3}", name):
        variants.append(name[1:])
    return [v for v in variants if len(v) >= 2]  # 한 글자는 본문에서 바꾸면 문장이 망가진다


class Pseudonymizer:
    ME = "본인"

    def __init__(self, chat: Chat, me: str | None):
        """``chat`` 은 기간 필터를 적용하기 **전** 전체 대화를 넘겨야 모든 참여자가 잡힌다."""
        self.sender_map: dict[str, str] = {}
        self.text_map: dict[str, str] = {}
        self.backward: dict[str, str] = {}
        names = list(chat.participants)
        if chat.title and chat.title not in names and re.fullmatch(r"[가-힣A-Za-z]{2,10}", chat.title):
            names.append(chat.title)  # 1:1 방 제목은 보통 상대 이름
        n = 0
        for name in names:
            alias = self.ME if name == me else None
            if alias is None:
                n += 1
                alias = f"상대{n}"
                self.backward[alias] = name
            self.sender_map[name] = alias
            for v in _name_variants(name):
                self.text_map.setdefault(v, alias)

    def _sub_names(self, text: str, mapping: dict[str, str]) -> str:
        # 긴 이름부터 바꿔야 '김민수'가 '민수'보다 먼저 처리된다.
        for src in sorted(mapping, key=len, reverse=True):
            text = text.replace(src, mapping[src])
        return text

    def text(self, text: str) -> str:
        return mask_identifiers(self._sub_names(text, self.text_map))

    def apply(self, chat: Chat) -> Chat:
        msgs = [replace(m, sender=self.sender_map.get(m.sender, m.sender), text=self.text(m.text))
                for m in chat.messages]
        title = self.text(chat.title) if chat.title else chat.title
        return Chat(title=title, saved_at=chat.saved_at, messages=msgs)

    def restore(self, text: str) -> str:
        # '상대10' 이 '상대1' 로 먼저 바뀌지 않도록 긴 것부터.
        return self._sub_names(text, self.backward)


def log_summary(chat: Chat) -> str:
    """로그에 남겨도 되는 정보만: 이름·내용 없이 개수만."""
    return f"messages={len(chat.messages)} participants={len(chat.participants)}"
