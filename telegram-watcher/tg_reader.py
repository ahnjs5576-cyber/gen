"""읽음 표시를 남기지 않는 텔레그램 조회 함수 모음.

핵심 원칙
---------
텔레그램에서 상대방에게 '읽음'이 표시되는 건 클라이언트가
`messages.readHistory` / `channels.readHistory` / `messages.readMessageContents`
를 서버에 보낼 때뿐입니다. Telethon은 이 요청을 자동으로 보내지 않으므로,
이 파일에서는 그 요청을 부르는 함수(`send_read_acknowledge`, `mark_read`,
`Message.mark_read`)를 **절대 사용하지 않습니다.**

메시지 조회(`iter_messages`), 대화방 목록(`iter_dialogs`), 실시간 수신 이벤트는
모두 서버에 읽음 신호를 보내지 않습니다.

주의: 메시지를 *보내면* 텔레그램 서버가 그 대화방을 읽음 처리할 수 있습니다.
그래서 전송은 `send_text()` 한 곳에만 두고, 사용자가 확인했을 때만 호출합니다.
"""
from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone

from telethon import TelegramClient, utils
from telethon.tl.custom.dialog import Dialog
from telethon.tl.functions.account import UpdateStatusRequest

MAX_TEXT = 1500  # 메시지 하나당 표시할 최대 글자 수


def chat_kind(d: Dialog) -> str:
    if d.is_user:
        return "개인"
    if d.is_group:
        return "그룹"
    return "채널"


def describe_media(msg) -> str:
    if msg.photo:
        return "[사진]"
    if msg.voice:
        return "[음성메시지]"
    if msg.video:
        return "[동영상]"
    if msg.sticker:
        return "[스티커]"
    if msg.gif:
        return "[GIF]"
    if msg.document:
        name = getattr(msg.file, "name", None) if msg.file else None
        return f"[파일: {name}]" if name else "[파일]"
    if msg.geo:
        return "[위치]"
    if msg.poll:
        return "[투표]"
    if msg.contact:
        return "[연락처]"
    return "[미디어]" if msg.media else ""


def message_text(msg) -> str:
    text = (msg.message or "").strip()
    media = describe_media(msg)
    if media and text:
        text = f"{media} {text}"
    elif media:
        text = media
    if len(text) > MAX_TEXT:
        text = text[:MAX_TEXT] + "…(생략)"
    return text


def fmt_time(dt: datetime) -> str:
    return dt.astimezone().strftime("%m/%d %H:%M")


class TelegramReader:
    def __init__(self, client: TelegramClient, keep_offline: bool = True):
        self.client = client
        self.keep_offline = keep_offline
        self._dialogs: list[Dialog] = []
        self._dialogs_at = 0.0

    # ── 상태 ────────────────────────────────────────
    async def go_offline(self) -> None:
        """마지막 접속 시간/온라인 표시를 최소화하기 위해 오프라인으로 설정."""
        if self.keep_offline:
            try:
                await self.client(UpdateStatusRequest(offline=True))
            except Exception:
                pass

    # ── 대화방 ──────────────────────────────────────
    async def dialogs(self, refresh: bool = False) -> list[Dialog]:
        if refresh or not self._dialogs or time.time() - self._dialogs_at > 60:
            self._dialogs = [d async for d in self.client.iter_dialogs()]
            self._dialogs_at = time.time()
        return self._dialogs

    async def resolve(self, query: str) -> Dialog:
        """대화방 이름(일부), @username, 또는 숫자 ID로 대화방을 찾는다."""
        q = query.strip()
        if not q:
            raise ValueError("대화방 이름을 알려주세요.")
        dialogs = await self.dialogs(refresh=True)

        if q.lstrip("-").isdigit():
            for d in dialogs:
                if d.id == int(q):
                    return d
        if q.startswith("@"):
            uname = q[1:].lower()
            for d in dialogs:
                if (getattr(d.entity, "username", None) or "").lower() == uname:
                    return d

        ql = q.lower()
        exact = [d for d in dialogs if (d.name or "").lower() == ql]
        if exact:
            return exact[0]
        partial = [d for d in dialogs if ql in (d.name or "").lower()]
        if len(partial) == 1:
            return partial[0]
        if not partial:
            raise ValueError(f"'{q}' 대화방을 찾지 못했어요.")
        names = ", ".join(f"{d.name}(id {d.id})" for d in partial[:10])
        raise ValueError(f"'{q}'에 해당하는 대화방이 여러 개예요: {names}")

    async def list_chats(self, query: str | None = None, unread_only: bool = False,
                         limit: int = 30) -> list[dict]:
        out = []
        for d in await self.dialogs(refresh=True):
            if query and query.lower() not in (d.name or "").lower():
                continue
            if unread_only and d.unread_count == 0:
                continue
            out.append({
                "id": d.id,
                "name": d.name,
                "type": chat_kind(d),
                "unread": d.unread_count,
                "last": fmt_time(d.date) if d.date else "",
            })
            if len(out) >= limit:
                break
        return out

    # ── 메시지 조회 (읽음 처리 없음) ─────────────────
    def _row(self, msg) -> dict:
        sender = utils.get_display_name(msg.sender) if msg.sender else ""
        if msg.out:
            sender = "나"
        return {
            "id": msg.id,
            "time": fmt_time(msg.date),
            "from": sender or "(알 수 없음)",
            "text": message_text(msg),
        }

    async def unread(self, dialog: Dialog, limit: int = 100) -> list[dict]:
        """안 읽은 메시지만 가져온다. 읽음 처리는 하지 않는다."""
        if dialog.unread_count == 0:
            return []
        read_max = dialog.dialog.read_inbox_max_id
        n = min(limit, dialog.unread_count)
        msgs = [m async for m in self.client.iter_messages(
            dialog.entity, limit=n, min_id=read_max)]
        return [self._row(m) for m in reversed(msgs)]

    async def recent(self, dialog: Dialog, limit: int = 30,
                     hours: float | None = None) -> list[dict]:
        msgs = []
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)) if hours else None
        async for m in self.client.iter_messages(dialog.entity, limit=limit):
            if cutoff and m.date < cutoff:
                break
            msgs.append(m)
        return [self._row(m) for m in reversed(msgs)]

    async def search(self, keyword: str, dialog: Dialog | None = None,
                     limit: int = 30) -> list[dict]:
        out = []
        entity = dialog.entity if dialog else None  # None = 전체 대화방 검색
        async for m in self.client.iter_messages(entity, limit=limit, search=keyword):
            row = self._row(m)
            if dialog is None:
                chat = await m.get_chat()
                row["chat"] = utils.get_display_name(chat) if chat else ""
            out.append(row)
        return out

    # ── 전송 (유일한 쓰기 동작) ───────────────────────
    async def send_text(self, dialog: Dialog, text: str) -> None:
        await self.client.send_message(dialog.entity, text, parse_mode=None)
        await self.go_offline()


def render_rows(rows: list[dict], with_chat: bool = False) -> str:
    if not rows:
        return "(메시지 없음)"
    lines = []
    for r in rows:
        prefix = f"[{r['chat']}] " if with_chat and r.get("chat") else ""
        lines.append(f"{prefix}{r['time']} {r['from']}: {r['text']}")
    return "\n".join(lines)
