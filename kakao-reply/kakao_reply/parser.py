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

# 오전/오후 12시간제와 24시간제('19:02') 둘 다 받는다.
_AMPM = r"(?:(?P<ampm>오전|오후)\s*)?(?P<h>\d{1,2}):(?P<mi>\d{2})"
_ANDROID_TS = r"(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*" + _AMPM
# iOS 쪽 그룹 이름은 'i' 접두사를 붙여 Android 쪽과 겹치지 않게 한다.
_IOS_TS = (r"(?P<y>\d{4})\.\s*(?P<mo>\d{1,2})\.\s*(?P<d>\d{1,2})\.\s*" + _AMPM).replace("?P<", "?P<i")
_MOBILE_TS = r"(?:" + _ANDROID_TS + r"|" + _IOS_TS + r")"

# ----- 2026년 11월 6일 금요일 -----
# 요일까지 정확히 맞아야 날짜 구분선으로 본다 ('----- 2026년 11월 6일 회의 -----' 같은 본문 줄과 구별)
_PC_DATE = re.compile(r"^-{3,}\s*(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*[월화수목금토일]요일\s*-{3,}$")
# [민수] [오후 7:02] 내용
# 이름에 ']' 가 들어갈 수 있어(예: 철수[회사]) 바로 뒤에 시간이 오는 첫 지점까지를 이름으로 본다.
_PC_MSG = re.compile(r"^\[(?P<sender>.+?)\]\s*\[" + _AMPM + r"\]\s?(?P<text>.*)$")
# 2026년 11월 6일 금요일   (모바일 날짜 구분선)
_MOBILE_DATE = re.compile(r"^(?P<y>\d{4})년\s*(?P<mo>\d{1,2})월\s*(?P<d>\d{1,2})일\s*\S+요일$")
_MOBILE_MSG = re.compile(r"^" + _MOBILE_TS + r",\s*(?P<sender>.+?)\s:(?:\s(?P<text>.*))?$")
# 타임스탬프는 있지만 ' : ' 가 없는 줄 = 입장/퇴장 같은 시스템 메시지
_MOBILE_SYSTEM = re.compile(r"^" + _MOBILE_TS + r",\s*(?!.*\s:(?:\s|$)).+$")
# 모바일 시스템 메시지에 실제로 쓰이는 문구 (본문의 '2026년 11월 14일 오후 3:00, 강남역' 과 구별)
_MOBILE_SYSTEM_KNOWN = re.compile(r"^" + _MOBILE_TS + r",\s*.*(?:님이 |님을 |님과 |채팅방|메시지를 가렸|메시지가 삭제|관리자|"
                                  r"들어왔습니다|나갔습니다|초대했습니다|내보냈습니다)")

# PC 형식의 시스템 메시지는 타임스탬프 없이 한 줄로 나온다. 일반 문장과 헷갈리지 않게 문장 전체가
# 정해진 꼴일 때만 후보로 보고, 다음 줄이 새 메시지·날짜·파일 끝일 때만 실제로 버린다(parse_text 참고).
_PC_SYSTEM = re.compile(
    r"^(?:.{1,20}?님이 (?:들어왔습니다|나갔습니다)"
    r"|.{1,20}?님이 .{1,300}님을 (?:초대했습니다|초대하였습니다|내보냈습니다)"
    r"|.{1,20}?님을 내보냈습니다"
    r"|메시지가 삭제되었습니다"
    r"|.{1,20}?님이 메시지를 가렸습니다)\.?$"
)

_TITLE = re.compile(r"^(?P<title>.+?)\s*님과 카카오톡 대화$")
_SAVED_AT = re.compile(r"^저장한 날짜\s*:\s*(?P<rest>.*)$")
_SAVED_ISO = re.compile(r"^(?P<y>\d{4})-(?P<mo>\d{2})-(?P<d>\d{2})\s+(?P<H>\d{2}):(?P<M>\d{2})")
_SAVED_MOBILE = re.compile(r"^" + _MOBILE_TS)

# 내보내기 파일에서 첨부물은 본문 대신 이런 자리표시로만 남는다 (원본/링크 없음).
_ATTACHMENTS = [
    # 일반 문장('일정 언제가 좋아?', '이체 확인했어?')을 첨부로 오인하지 않게, 카카오톡이 쓰는 자리표시 꼴 전체가 맞을 때만.
    (re.compile(r"^사진(\s*\d+장)?$"), "사진"),
    (re.compile(r"^동영상(\s*\d+개)?$"), "동영상"),
    (re.compile(r"^(이모티콘|\(이모티콘\)\s*.{0,20})$"), "이모티콘"),
    (re.compile(r"^음성메시지(\s*\d{1,2}:\d{2})?$"), "음성메시지"),
    (re.compile(r"^파일\s*:\s*.+\.[A-Za-z0-9]{1,6}(\s*\(.*\))?$"), "파일"),
    (re.compile(r"^삭제된 메시지입니다\.?$"), "삭제됨"),
    (re.compile(r"^샵검색\s*:\s*.+$"), "샵검색"),
    (re.compile(r"^(지도|위치 공유|위치)$"), "위치"),
    (re.compile(r"^연락처\s*:\s*.+$"), "연락처"),
    (re.compile(r"^(카카오페이\s*)?(송금|정산)\s*[\d,]+원(\s*.{0,10})?$"), "송금"),
    (re.compile(r"^(보이스톡|페이스톡)(\s*(\d{1,2}:\d{2}(:\d{2})?|취소|부재중|해요))?$"), "통화"),
    (re.compile(r"^(투표|일정)\s*:\s*.+$"), "투표/일정"),
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
    saved_at_estimated: bool = False  # 파일에 기록이 없어 파일 수정 시각으로 추정했는지
    undated: int = 0  # 시간을 읽지 못한 메시지 수 (CSV 의 깨진 날짜 등)
    member_count: int | None = None  # Android 단체방 제목 뒤 인원수 ('가족 4' → 4)
    skipped: int = 0  # 읽지 못하고 건너뛴 줄 수 (CSV)
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
    if ampm is None:  # 24시간제
        hour = int(h)
    else:
        hour = int(h) % 12 + (12 if ampm == "오후" else 0)
    return datetime(int(y), int(mo), int(d), hour, int(mi))


def _safe_time(*parts) -> datetime | None:
    try:
        return _to_time(*parts)
    except ValueError:  # '2026. 11. 31.' 같은 없는 날짜 → 머리줄이 아닌 본문으로 본다
        return None


def _mobile_time(m: re.Match) -> datetime:
    g = m.groupdict()
    return _to_time(*((g.get(k) or g.get("i" + k)) for k in ("y", "mo", "d", "ampm", "h", "mi")))


def _parse_saved_at(rest: str) -> datetime | None:
    rest = re.sub(r"\s*(\S+요일|\([월화수목금토일]\))\s*", " ", rest.strip())  # '2026년 11월 6일 금요일 오후 10:12'
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
    body: list[str] = []  # 지금 메시지의 줄들 (마지막에 한 번에 합쳐 긴 메시지도 빠르게)
    # 시스템 메시지/날짜 구분선처럼 보이지만 아직 확정하지 않은 줄. 다음 줄이 새 메시지·날짜·파일 끝이면
    # 진짜 시스템 줄이라 버리고, 본문이 이어지면 원래 본문이었던 것으로 되돌린다.
    held: list[str] = []
    fmt: str | None = None  # 첫 메시지 줄을 보고 'pc' 또는 'mobile' 로 정한다

    def start(msg: Message | None) -> None:
        nonlocal last, body
        if last is not None and held and fmt == "mobile":
            # 보류한 모바일 날짜 줄은 다음 메시지의 날짜와 같을 때만 구분선이다. 다르거나 파일 끝이면 본문에 쓴 날짜다.
            for h in held:
                if (dm := _MOBILE_DATE.match(h.strip())) and (
                        msg is None or msg.time is None or
                        (int(dm["y"]), int(dm["mo"]), int(dm["d"])) != (msg.time.year, msg.time.month, msg.time.day)):
                    body.append(h)
        if last is not None:
            last.text = "\n".join(body).rstrip("\n")
        held.clear()
        last, body = msg, ([msg.text] if msg else [])
        if msg is not None:
            chat.messages.append(msg)

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

        if (m := _PC_MSG.match(line)) and fmt != "mobile":
            t = None
            if current_day is not None:
                t = _safe_time(current_day.year, current_day.month, current_day.day, m["ampm"], m["h"], m["mi"])
            if current_day is None or t is not None:
                fmt = "pc"
                start(Message(sender=m["sender"].strip(), text=m["text"], time=t))
                continue
        if (m := _MOBILE_MSG.match(line)) and fmt != "pc":
            try:
                t = _mobile_time(m)
            except ValueError:
                t = None
            if t is not None:
                fmt = "mobile"
                start(Message(sender=m["sender"].strip(), text=m["text"] or "", time=t))
                continue
        if m := _PC_DATE.match(stripped):
            current_day = date(int(m["y"]), int(m["mo"]), int(m["d"]))
            start(None)
            continue

        if last is not None:
            if held and not stripped:
                held.append(line)  # 보류 중에 나온 빈 줄도 함께 보류
                continue
            # 파일 형식에 맞는 시스템 줄만 보류한다 (PC 파일 본문의 '2026년 11월 14일 오후 3:00, 강남역' 은 그냥 본문)
            if (fmt == "mobile" and (_MOBILE_DATE.match(stripped) or _MOBILE_SYSTEM_KNOWN.match(line))) or \
                    (fmt == "pc" and _PC_SYSTEM.match(stripped)):
                held.append(line)
                continue
            body.extend(held)  # 보류했던 줄 뒤에 본문이 이어지면 그건 본문이었다
            held.clear()
            body.append(line)
            continue

        # 메시지 밖: 날짜 구분선은 날짜만 기억하고, 나머지(시스템 줄, 빈 줄, 알 수 없는 머리말)는 무시
        if m := _MOBILE_DATE.match(stripped):
            current_day = date(int(m["y"]), int(m["mo"]), int(m["d"]))

    start(None)
    chat.messages = _sort_by_time(chat.messages)
    return chat


def parse_csv(content: str) -> Chat:
    chat = Chat()
    csv.field_size_limit(16 * 1024 * 1024)
    try:
        rows = list(csv.DictReader(io.StringIO(content.lstrip("\ufeff"))))
    except csv.Error as e:
        raise ExportReadError(f"CSV 형식이 깨져 읽지 못했습니다 ({e}).") from None
    header = set(rows[0].keys()) if rows else set()
    if rows and not {"User", "Message"} <= header:
        raise ExportReadError("CSV 첫 줄이 카카오톡 형식(Date,User,Message)이 아닙니다. 카카오톡에서 내보낸 CSV 인지 확인하세요.")
    for row in rows:
        sender = (row.get("User") or "").strip()
        if not sender or "\n" in sender or len(sender) > 60:
            chat.skipped += 1  # 따옴표가 깨진 줄 등: 발신자로 볼 수 없는 값
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
        if t is None:
            chat.undated += 1
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
    encodings = ("utf-16",) if data.startswith((b"\xff\xfe", b"\xfe\xff")) else ("utf-8-sig", "cp949")
    for enc in encodings:
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            pass
    if encodings[0] == "utf-8-sig":
        # 끝이 잘린 파일처럼 깨진 바이트가 아주 조금이면 그 글자만 '�' 로 바꾸고 읽는다
        text = data.decode("utf-8-sig", errors="replace")
        if text.count("\ufffd") <= max(3, len(text) // 1000):
            return text
    raise ExportReadError(f"{p}: 글자 인코딩을 알 수 없거나 파일이 깨졌습니다 (UTF-8/CP949/UTF-16 아님).")


def parse_file(path: str | Path) -> Chat:
    """내보내기 파일을 읽기 전용으로 열어 파싱한다."""
    p = Path(path)
    content = read_text(p)
    is_csv = p.suffix.lower() == ".csv" or content.lstrip().startswith("Date,User,Message")
    try:
        chat = parse_csv(content) if is_csv else parse_text(content)
    except ExportReadError as e:
        raise ExportReadError(f"{p.name}: {e}") from None
    name_title, name_saved = _from_filename(p.stem)
    if chat.title is None:
        chat.title = name_title or p.stem
    if chat.title and (mc := re.search(r"\s+(\d{1,4})$", chat.title)):
        chat.member_count = int(mc.group(1))  # 단체방 제목 뒤 인원수 ('가족 4')
        chat.title = chat.title[: mc.start()]
    if chat.saved_at is None and name_saved is not None:
        chat.saved_at = name_saved
    if chat.saved_at is None:
        # 머리말도 파일 이름에도 기록이 없으면 파일 수정 시각으로 추정한다 (복사하면 바뀔 수 있음).
        chat.saved_at = datetime.fromtimestamp(p.stat().st_mtime).replace(microsecond=0)
        chat.saved_at_estimated = True
    return chat


# Mac CSV: KakaoTalk_Chat_민수_2026-11-06-22-10-03.csv
_FILENAME = re.compile(r"^KakaoTalk_Chat_(?P<title>.+?)_(?P<y>\d{4})-(?P<mo>\d{2})-(?P<d>\d{2})-(?P<H>\d{2})-(?P<M>\d{2})-\d{2}"
                       r"(?:\s*\(\d+\))?$")  # 브라우저가 붙이는 ' (1)' 허용


def _from_filename(stem: str) -> tuple[str | None, datetime | None]:
    if m := _FILENAME.match(stem):
        return m["title"], datetime(int(m["y"]), int(m["mo"]), int(m["d"]), int(m["H"]), int(m["M"]))
    return None, None
