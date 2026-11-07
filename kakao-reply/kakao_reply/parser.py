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
_ANDROID_TS = r"(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*" + _AMPM
# iOS 쪽 그룹 이름은 'i' 접두사를 붙여 Android 쪽과 겹치지 않게 한다.
_IOS_TS = (r"(?P<y>\d{4})\.\s*(?P<mo>\d{1,2})\.\s*(?P<d>\d{1,2})\.\s*" + _AMPM).replace("?P<", "?P<i")
_MOBILE_TS = r"(?:" + _ANDROID_TS + r"|" + _IOS_TS + r")"

# ----- 2026년 11월 6일 금요일 -----
_PC_DATE = re.compile(r"^-+\s*(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일.*-+$")
# [민수] [오후 7:02] 내용
# 이름에 ']' 가 들어갈 수 있어(예: 철수[회사]) 바로 뒤에 시간이 오는 첫 지점까지를 이름으로 본다.
_PC_MSG = re.compile(r"^\[(?P<sender>.+?)\]\s*\[" + _AMPM + r"\]\s?(?P<text>.*)$")
# 2026년 11월 6일 금요일   (모바일 날짜 구분선)
_MOBILE_DATE = re.compile(r"^(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*\S+요일$")
_MOBILE_MSG = re.compile(r"^" + _MOBILE_TS + r",\s*(?P<sender>.+?)\s:\s(?P<text>.*)$")
# 타임스탬프는 있지만 ' : ' 가 없는 줄 = 입장/퇴장 같은 시스템 메시지
_MOBILE_SYSTEM = re.compile(r"^" + _MOBILE_TS + r",\s*(?!.*\s:\s).+$")

# PC 형식의 시스템 메시지는 타임스탬프 없이 한 줄로 나온다.
_PC_SYSTEM = re.compile(
    r"^(.+님(이|을|과).*(들어왔습니다|나갔습니다|초대했습니다|내보냈습니다|초대하였습니다)\.?"
    r"|메시지가 삭제되었습니다\.?|.+님이 메시지를 가렸습니다\.?|채팅방 관리자가 .+)$"
)

_TITLE = re.compile(r"^(?P<title>.+?)\s*님과 카카오톡 대화$")
_SAVED_AT = re.compile(r"^저장한 날짜\s*:\s*(?P<rest>.*)$")
_SAVED_ISO = re.compile(r"^(?P<y>\d{4})-(?P<mo>\d{2})-(?P<d>\d{2})\s+(?P<H>\d{2}):(?P<M>\d{2})")
_SAVED_MOBILE = re.compile(r"^" + _MOBILE_TS)

# 내보내기 파일에서 첨부물은 본문 대신 이런 자리표시로만 남는다 (원본/링크 없음).
_ATTACHMENTS = [
    (re.compile(r"^사진(\s*\d+장)?$"), "사진"),
    (re.compile(r"^동영상$"), "동영상"),
    (re.compile(r"^(이모티콘|\(이모티콘\).*)$"), "이모티콘"),
    (re.compile(r"^음성메시지"), "음성메시지"),
    (re.compile(r"^파일\s*:\s*.+"), "파일"),
    (re.compile(r"^삭제된 메시지입니다\.?$"), "삭제됨"),
]


@dataclass
class Message:
    sender: str
    text: str
    time: datetime | None = None

    @property
    def attachment(self) -> str | None:
        """첨부물 자리표시라면 그 종류('사진', '파일' 등), 아니면 None."""
        body = self.text.strip()
        for pattern, kind in _ATTACHMENTS:
            if pattern.match(body):
                return kind
        return None

    def line(self) -> str:
        stamp = self.time.strftime("%Y-%m-%d %H:%M") if self.time else "----"
        body = f"<{self.text.strip()}>" if self.attachment else self.text
        return f"[{stamp}] {self.sender}: {body}"


@dataclass
class Chat:
    title: str | None = None
    saved_at: datetime | None = None
    messages: list[Message] = field(default_factory=list)

    @property
    def participants(self) -> list[str]:
        seen: dict[str, None] = {}
        for m in self.messages:
            seen.setdefault(m.sender, None)
        return list(seen)

    @property
    def last_time(self) -> datetime | None:
        times = [m.time for m in self.messages if m.time]
        return max(times) if times else None


def _to_time(y, mo, d, ampm, h, mi) -> datetime:
    hour = int(h) % 12
    if ampm == "오후":
        hour += 12
    return datetime(int(y), int(mo), int(d), hour, int(mi))


def _mobile_time(m: re.Match) -> datetime:
    g = m.groupdict()
    return _to_time(*((g.get(k) or g.get("i" + k)) for k in ("y", "mo", "d", "ampm", "h", "mi")))


def _parse_saved_at(rest: str) -> datetime | None:
    rest = re.sub(r"\s*\S+요일\s*", " ", rest.strip())  # '2026년 11월 6일 금요일 오후 10:12'
    rest = re.sub(r"\s+", " ", rest).strip()
    if m := _SAVED_ISO.match(rest):
        return datetime(int(m["y"]), int(m["mo"]), int(m["d"]), int(m["H"]), int(m["M"]))
    if m := _SAVED_MOBILE.match(rest):
        return _mobile_time(m)
    return None


def _sort_by_time(messages: list[Message]) -> list[Message]:
    """시간순 정렬. 시간 정보가 없는 메시지가 섞여 있으면 원래 순서를 유지한다."""
    if all(m.time for m in messages):
        return sorted(messages, key=lambda m: m.time)  # 안정 정렬: 같은 분 안의 순서 유지
    return messages


def parse_text(content: str) -> Chat:
    chat = Chat()
    current_day: date | None = None
    last: Message | None = None

    for raw in content.splitlines():
        line = raw.rstrip("\r\n").lstrip("\ufeff")
        stripped = line.strip()

        if not chat.messages:
            if chat.title is None and (t := _TITLE.match(stripped)):
                chat.title = t.group("title")
                continue
            if s := _SAVED_AT.match(stripped):
                chat.saved_at = _parse_saved_at(s["rest"])
                continue

        if m := (_PC_DATE.match(stripped) or _MOBILE_DATE.match(stripped)):
            current_day = date(int(m["y"]), int(m["mo"]), int(m["d"]))
            last = None
            continue

        if m := _PC_MSG.match(line):
            t = None
            if current_day is not None:
                t = _to_time(current_day.year, current_day.month, current_day.day, m["ampm"], m["h"], m["mi"])
            last = Message(sender=m["sender"].strip(), text=m["text"], time=t)
            chat.messages.append(last)
            continue

        if m := _MOBILE_MSG.match(line):
            last = Message(sender=m["sender"].strip(), text=m["text"], time=_mobile_time(m))
            chat.messages.append(last)
            continue

        if _MOBILE_SYSTEM.match(line) or _PC_SYSTEM.match(stripped):
            last = None
            continue

        # 여러 줄짜리 메시지의 이어지는 줄. 그 외(빈 줄, 알 수 없는 머리말)는 무시.
        if last is not None:
            last.text += "\n" + line

    for msg in chat.messages:
        msg.text = msg.text.rstrip("\n")
    chat.messages = _sort_by_time(chat.messages)
    return chat


def parse_csv(content: str) -> Chat:
    chat = Chat()
    for row in csv.DictReader(io.StringIO(content.lstrip("\ufeff"))):
        sender = (row.get("User") or "").strip()
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
        text = (row.get("Message") or "").replace("\r\n", "\n").replace("\r", "\n")
        chat.messages.append(Message(sender=sender, text=text, time=t))
    chat.messages = _sort_by_time(chat.messages)
    return chat


class ExportReadError(Exception):
    """내보내기 파일을 열거나 해석할 수 없음 (사용자에게 그대로 보여 줄 메시지)."""


def read_text(p: Path) -> str:
    """UTF-8 이 기본이고, 예전 Windows 내보내기(CP949)·UTF-16 도 받아 준다."""
    try:
        data = p.read_bytes()
    except FileNotFoundError:
        raise ExportReadError(f"{p}: 파일이 없습니다.") from None
    except IsADirectoryError:
        raise ExportReadError(f"{p}: 파일이 아니라 폴더입니다.") from None
    except PermissionError:
        raise ExportReadError(f"{p}: 읽을 권한이 없습니다.") from None
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return data.decode("utf-16")
    for enc in ("utf-8-sig", "cp949"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            pass
    raise ExportReadError(f"{p}: 글자 인코딩을 알 수 없습니다 (UTF-8/CP949/UTF-16 아님).")


def parse_file(path: str | Path) -> Chat:
    """내보내기 파일을 읽기 전용으로 열어 파싱한다."""
    p = Path(path)
    content = read_text(p)
    is_csv = p.suffix.lower() == ".csv" or content.lstrip().startswith("Date,User,Message")
    chat = parse_csv(content) if is_csv else parse_text(content)
    if chat.title is None:
        chat.title = p.stem
    if chat.saved_at is None:
        # CSV 등 머리말이 없는 형식은 파일 수정 시각을 내보낸 시각으로 본다.
        chat.saved_at = datetime.fromtimestamp(p.stat().st_mtime).replace(microsecond=0)
    return chat
