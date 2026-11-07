"""개인정보 보호 도구.

* 가명 처리: Claude 로 보내기 전에 상대방 이름을 '상대1', '상대2' 로 바꾸고,
  전화번호·이메일·계좌번호처럼 보이는 문자열을 가린다. 받은 답장 초안에서는
  가명을 원래 이름으로 되돌린다 (가린 번호는 되돌리지 않는다).
* 로그용 요약: 이름과 내용 대신 개수만 남긴다.
"""

from __future__ import annotations

import re
from dataclasses import replace

from .parser import Chat

_PATTERNS = [
    (re.compile(r"\b01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}\b"), "[전화번호]"),
    (re.compile(r"\b0\d{1,2}[-.\s]?\d{3,4}[-.\s]?\d{4}\b"), "[전화번호]"),
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), "[이메일]"),
    (re.compile(r"\b\d{2,6}-\d{2,6}-\d{2,8}\b"), "[계좌번호]"),
    (re.compile(r"\b\d{6}[-\s]?[1-4]\d{6}\b"), "[주민번호]"),
]


def mask_identifiers(text: str) -> str:
    for pattern, label in _PATTERNS:
        text = pattern.sub(label, text)
    return text


class Pseudonymizer:
    ME = "나"

    def __init__(self, chat: Chat, me: str | None):
        self.forward: dict[str, str] = {}
        self.backward: dict[str, str] = {}
        n = 0
        for name in chat.participants:
            if name == me:
                self.forward[name] = self.ME  # 본인 이름도 보내지 않는다 (되돌리지는 않음)
                continue
            n += 1
            self.forward[name] = f"상대{n}"
            self.backward[f"상대{n}"] = name

    def _sub_names(self, text: str, mapping: dict[str, str]) -> str:
        # 긴 이름부터 바꿔야 '김민수'가 '민수'보다 먼저 처리된다. 한 글자 이름은 본문에서 바꾸지 않는다.
        for src in sorted(mapping, key=len, reverse=True):
            if len(src) >= 2:
                text = text.replace(src, mapping[src])
        return text

    def apply(self, chat: Chat) -> Chat:
        msgs = [
            replace(m, sender=self.forward.get(m.sender, m.sender),
                    text=mask_identifiers(self._sub_names(m.text, self.forward)))
            for m in chat.messages
        ]
        title = self._sub_names(chat.title, self.forward) if chat.title else chat.title
        return Chat(title=title, saved_at=chat.saved_at, messages=msgs)

    def restore(self, text: str) -> str:
        return self._sub_names(text, self.backward)


def log_summary(chat: Chat) -> str:
    """로그에 남겨도 되는 정보만: 이름·내용 없이 개수만."""
    return f"messages={len(chat.messages)} participants={len(chat.participants)}"
