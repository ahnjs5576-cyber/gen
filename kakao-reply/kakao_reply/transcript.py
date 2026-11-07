"""조회 결과를 사람이 읽기 쉬운 상태 정보로 바꾼다.

내보내기 파일에는 '읽음' 표시가 들어 있지 않으므로, '안 읽은 위치'는
**내가 마지막으로 보낸 메시지 이후**로 계산한다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from .parser import Chat, Message

STALE_AFTER = timedelta(hours=1)


def guess_me(chat: Chat) -> str | None:
    """내보내기 파일에서 본인 이름이 '나'로 표시되는 경우를 추정."""
    return "나" if "나" in chat.participants else None


def pending_messages(chat: Chat, me: str | None) -> list[Message]:
    """내가 마지막으로 말한 뒤에 다른 사람이 보낸 메시지들."""
    if not me:
        return []
    out: list[Message] = []
    for m in reversed(chat.messages):
        if m.sender == me:
            break
        out.append(m)
    return list(reversed(out))


def filter_period(chat: Chat, days: int | None, now: datetime | None = None) -> Chat:
    """필요한 기간만 남긴다 (개인정보 최소 조회)."""
    if not days:
        return chat
    base = now or chat.saved_at or datetime.now()
    cutoff = base - timedelta(days=days)
    kept = [m for m in chat.messages if m.time is None or m.time >= cutoff]
    return Chat(title=chat.title, saved_at=chat.saved_at, messages=kept)


@dataclass
class RoomStatus:
    title: str
    message_count: int
    last_time: datetime | None
    last_sender: str | None
    last_is_mine: bool | None  # me 를 모르면 None
    pending: list[Message]
    saved_at: datetime | None
    stale: bool  # 내보낸 지 오래돼 최신 대화가 빠졌을 수 있음

    @property
    def pending_attachments(self) -> list[Message]:
        return [m for m in self.pending if m.attachment]


def room_status(chat: Chat, me: str | None, now: datetime | None = None) -> RoomStatus:
    now = now or datetime.now()
    last = chat.messages[-1] if chat.messages else None
    return RoomStatus(
        title=chat.title or "(제목 없음)",
        message_count=len(chat.messages),
        last_time=chat.last_time,
        last_sender=last.sender if last else None,
        last_is_mine=(last.sender == me) if (last and me) else None,
        pending=pending_messages(chat, me),
        saved_at=chat.saved_at,
        stale=bool(chat.saved_at and now - chat.saved_at > STALE_AFTER),
    )


def describe_age(saved_at: datetime | None, now: datetime | None = None) -> str:
    if not saved_at:
        return "내보낸 시각 알 수 없음"
    delta = (now or datetime.now()) - saved_at
    if delta < timedelta(minutes=1):
        return "방금 내보냄"
    if delta < timedelta(hours=1):
        return f"{int(delta.total_seconds() // 60)}분 전 내보냄"
    if delta < timedelta(days=1):
        return f"{int(delta.total_seconds() // 3600)}시간 전 내보냄"
    return f"{delta.days}일 전 내보냄"
