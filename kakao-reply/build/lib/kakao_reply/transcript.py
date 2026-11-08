"""조회 결과를 사람이 읽기 쉬운 상태 정보로 바꾼다.

내보내기 파일에는 '읽음' 표시가 들어 있지 않으므로, '안 읽은 위치'는
**내가 마지막으로 보낸 메시지 이후**로 계산한다.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

from .parser import MEDIA_KINDS, Chat, Message

STALE_AFTER = timedelta(hours=1)


def guess_me(chat: Chat) -> str | None:
    """내보내기 파일에서 본인 이름이 '나'로 표시되는 경우를 추정."""
    return "나" if "나" in chat.participants else None


def guess_me_across(chats: list[Chat]) -> str | None:
    """여러 방에 모두 등장하는 발신자가 딱 한 명이면 그 사람이 본인일 가능성이 높다."""
    if len(chats) < 2:
        return None
    common = set(chats[0].participants)
    for c in chats[1:]:
        common &= set(c.participants)
    return common.pop() if len(common) == 1 else None


def pending_messages(chat: Chat, me: str | None) -> list[Message]:
    """내가 마지막으로 '말한' 뒤에 다른 사람이 보낸 메시지들.

    내가 사진·이모티콘만 보낸 건 답한 것으로 보지 않는다 (그 앞의 질문도 아직 답할 대상).
    """
    if not me:
        return []
    out: list[Message] = []
    for m in reversed(chat.messages):
        if m.sender == me and not m.attachment:
            break
        if m.sender != me:
            out.append(m)
    return list(reversed(out))


def filter_period(chat: Chat, days: int | None, now: datetime | None = None, from_last: bool = False) -> Chat:
    """필요한 기간만 남긴다 (개인정보 최소 조회). ``from_last`` 면 '마지막 메시지 기준 N일' (조용한 방에서도 최근 대화가 남게)."""
    if not days:
        return chat
    base = (chat.last_time if from_last else None) or now or chat.saved_at or datetime.now()
    cutoff = base - timedelta(days=days)
    kept = [m for m in chat.messages if m.time is not None and m.time >= cutoff]  # 시간 모르는 메시지는 기간 밖으로 본다
    return Chat(title=chat.title, saved_at=chat.saved_at, saved_at_estimated=chat.saved_at_estimated,
                member_count=chat.member_count, undated=chat.undated, messages=kept)


@dataclass
class RoomStatus:
    title: str
    message_count: int
    last_time: datetime | None
    last_sender: str | None
    last_is_mine: bool | None  # me 를 모르면 None
    pending: list[Message]
    saved_at: datetime | None
    saved_at_estimated: bool
    stale: bool  # 내보낸 지 오래돼 최신 대화가 빠졌을 수 있음

    me_seen: bool = True  # 이 방에서 내 메시지를 찾았는지 (못 찾으면 '답할 것' 개수는 의미가 없음)

    @property
    def pending_attachments(self) -> list[Message]:
        """원본이 따로 있는 첨부물(사진·동영상·파일·음성)만. 삭제·송금·통화 표시는 첨부가 아니다."""
        return [m for m in self.pending if m.attachment in MEDIA_KINDS]


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
        saved_at_estimated=chat.saved_at_estimated,
        stale=bool(chat.saved_at and now - chat.saved_at > STALE_AFTER),
        me_seen=bool(me and me in chat.participants),
    )


def describe_age(saved_at: datetime | None, now: datetime | None = None, estimated: bool = False) -> str:
    if not saved_at:
        return "내보낸 시각 알 수 없음"
    delta = (now or datetime.now()) - saved_at
    if delta < -timedelta(minutes=5):
        return "내보낸 시각이 지금보다 늦게 찍혀 있음 (컴퓨터 시계 확인 필요)"
    if delta < timedelta(minutes=1):
        text = "방금 내보냄"
    elif delta < timedelta(hours=1):
        text = f"{int(delta.total_seconds() // 60)}분 전 내보냄"
    elif delta < timedelta(days=1):
        text = f"{int(delta.total_seconds() // 3600)}시간 전 내보냄"
    else:
        text = f"{delta.days}일 전 내보냄"
    return text + (" (파일 시각 기준 추정)" if estimated else "")
