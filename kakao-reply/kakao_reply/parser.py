"""카카오톡 '대화 내보내기' 파일 파서.

지원 형식 (카카오톡 버전에 따라 조금씩 다를 수 있어 관대하게 파싱한다):

* PC/Mac 텍스트:   ``[민수] [오후 7:02] 내용``  + ``----- 2026년 11월 6일 금요일 -----``
* Android 텍스트:  ``2026년 11월 6일 오후 7:02, 민수 : 내용``
* iOS 텍스트:      ``2026. 11. 6. 오후 7:02, 민수 : 내용``
* CSV (Mac/PC):    ``Date,User,Message`` 헤더

파일은 읽기만 하며 절대 수정하지 않는다.
"""

from __future__ import annotations

import csv
import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path

_AMPM = r"(?P<ampm>오전|오후)\s*(?P<h>\d{1,2}):(?P<mi>\d{2})"

# ----- 2026년 11월 6일 금요일 -----
_PC_DATE = re.compile(r"^-+\s*(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일.*-+$")
# [민수] [오후 7:02] 내용
_PC_MSG = re.compile(r"^\[(?P<sender>[^\]]+)\]\s*\[" + _AMPM + r"\]\s?(?P<text>.*)$")
# 2026년 11월 6일 금요일   (모바일 날짜 구분선)
_MOBILE_DATE = re.compile(r"^(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*\S+요일$")
# 모바일 메시지/시스템 줄의 타임스탬프 접두부
_ANDROID_TS = r"(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*" + _AMPM
_IOS_TS = r"(?P<y>\d{4})\.\s*(?P<mo>\d{1,2})\.\s*(?P<d>\d{1,2})\.\s*" + _AMPM
_MOBILE_MSG = re.compile(
    r"^(?:" + _ANDROID_TS + r"|" + _IOS_TS.replace("?P<", "?P<i") + r"),\s*(?P<sender>.+?)\s:\s(?P<text>.*)$"
)
# 타임스탬프는 있지만 ' : ' 가 없는 줄 = 입장/퇴장 같은 시스템 메시지
_MOBILE_SYSTEM = re.compile(r"^(?:" + _ANDROID_TS + r"|" + _IOS_TS.replace("?P<", "?P<i") + r"),\s*(?!.*\s:\s).+$")

_TITLE = re.compile(r"^(?P<title>.+?)\s*님과 카카오톡 대화$")
_SAVED_AT = re.compile(r"^저장한 날짜\s*:")


@dataclass
class Message:
    sender: str
    text: str
    time: datetime | None = None

    def line(self) -> str:
        stamp = self.time.strftime("%Y-%m-%d %H:%M") if self.time else "----"
        return f"[{stamp}] {self.sender}: {self.text}"


@dataclass
class Chat:
    title: str | None = None
    messages: list[Message] = field(default_factory=list)

    @property
    def participants(self) -> list[str]:
        seen: dict[str, None] = {}
        for m in self.messages:
            seen.setdefault(m.sender, None)
        return list(seen)


def _to_time(y: str, mo: str, d: str, ampm: str, h: str, mi: str) -> datetime:
    hour = int(h) % 12
    if ampm == "오후":
        hour += 12
    return datetime(int(y), int(mo), int(d), hour, int(mi))


def _group(m: re.Match, name: str) -> str | None:
    return m.group(name) or m.groupdict().get("i" + name)


def parse_text(content: str) -> Chat:
    chat = Chat()
    current_day: date | None = None
    last: Message | None = None

    for raw in content.splitlines():
        line = raw.rstrip("\r\n").lstrip("\ufeff")

        if chat.title is None and not chat.messages and (t := _TITLE.match(line.strip())):
            chat.title = t.group("title")
            continue
        if not chat.messages and _SAVED_AT.match(line.strip()):
            continue

        if m := _PC_DATE.match(line.strip()):
            current_day = date(int(m["y"]), int(m["mo"]), int(m["d"]))
            last = None
            continue
        if m := _MOBILE_DATE.match(line.strip()):
            current_day = date(int(m["y"]), int(m["mo"]), int(m["d"]))
            last = None
            continue

        if m := _PC_MSG.match(line):
            t = None
            if current_day is not None:
                t = _to_time(str(current_day.year), str(current_day.month), str(current_day.day),
                             m["ampm"], m["h"], m["mi"])
            last = Message(sender=m["sender"].strip(), text=m["text"], time=t)
            chat.messages.append(last)
            continue

        if m := _MOBILE_MSG.match(line):
            t = _to_time(*(_group(m, k) for k in ("y", "mo", "d", "ampm", "h", "mi")))
            last = Message(sender=m["sender"].strip(), text=m["text"], time=t)
            chat.messages.append(last)
            continue

        if _MOBILE_SYSTEM.match(line):
            last = None
            continue

        # 여러 줄짜리 메시지의 이어지는 줄
        if last is not None:
            last.text += "\n" + line
        # 그 외(빈 줄, 알 수 없는 머리말)는 무시

    for msg in chat.messages:
        msg.text = msg.text.rstrip("\n")
    return chat


def parse_csv(content: str) -> Chat:
    chat = Chat()
    reader = csv.DictReader(io.StringIO(content.lstrip("\ufeff")))
    for row in reader:
        sender = (row.get("User") or "").strip()
        text = row.get("Message") or ""
        if not sender:
            continue
        t = None
        if stamp := (row.get("Date") or "").strip():
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
                try:
                    t = datetime.strptime(stamp, fmt)
                    break
                except ValueError:
                    pass
        chat.messages.append(Message(sender=sender, text=text, time=t))
    return chat


def parse_file(path: str | Path) -> Chat:
    """내보내기 파일을 읽기 전용으로 열어 파싱한다."""
    p = Path(path)
    with p.open("r", encoding="utf-8-sig", newline="") as f:
        content = f.read()
    if p.suffix.lower() == ".csv" or content.lstrip().startswith("Date,User,Message"):
        chat = parse_csv(content)
        if chat.title is None:
            chat.title = p.stem
        return chat
    chat = parse_text(content)
    if chat.title is None:
        chat.title = p.stem
    return chat
