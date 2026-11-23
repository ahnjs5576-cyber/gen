"""텔레그램 몰래보기(읽음 표시 없이) 감시 + 지시 처리 서비스.

실행:  python main.py
첫 실행 때 콘솔에서 전화번호 / 로그인 코드 / (2단계 인증 시) 비밀번호를 입력합니다.
"""
from __future__ import annotations

import asyncio
import logging
import re
import sys

from telethon import TelegramClient, events, utils

from config import BASE_DIR, load_config
from storage import Storage
from tg_reader import TelegramReader, chat_kind, message_text, render_rows

(BASE_DIR / "data").mkdir(exist_ok=True)
_handlers: list[logging.Handler] = [
    logging.FileHandler(BASE_DIR / "data" / "service.log", encoding="utf-8")]
if sys.stderr and sys.stderr.isatty():  # 창 없는/백그라운드 실행이면 파일 로그만
    _handlers.append(logging.StreamHandler())
logging.basicConfig(
    format="%(asctime)s %(levelname)s %(message)s",
    level=logging.INFO,
    handlers=_handlers,
)
log = logging.getLogger("tg-watcher")
logging.getLogger("telethon").setLevel(logging.WARNING)

HELP = """\
📋 명령어 (대화방 이름은 일부만 써도 돼요)
/chats [검색어] — 대화방 목록 + 안 읽은 수
/unread — 안 읽은 메시지가 있는 방 목록
/unread 대화방 — 그 방의 안 읽은 메시지 (읽음 처리 X)
/recent 대화방 [개수] — 최근 메시지
/search 검색어 — 전체 대화방 검색
/watch 대화방 · /unwatch 대화방 · /watchlist — 실시간 알림 방
/kw 단어 · /unkw 단어 · /kwlist — 알림 키워드
/yes · /no — 준비된 메시지 전송/취소
/reset — Claude 대화 맥락 초기화

그 밖의 문장은 Claude가 알아서 처리해요.
예) "회사 단톡방 오늘 안 읽은 거 요약해줘"
    "엄마한테 온 메시지 있어?"
"""

TG_LIMIT = 4000


def split_text(text: str, size: int = TG_LIMIT) -> list[str]:
    chunks, buf = [], ""
    for line in text.splitlines(keepends=True):
        while len(line) > size:
            chunks.append(line[:size])
            line = line[size:]
        if len(buf) + len(line) > size:
            chunks.append(buf)
            buf = ""
        buf += line
    if buf.strip():
        chunks.append(buf)
    return chunks or ["(빈 응답)"]


def parse_chat_and_count(arg: str, default: int) -> tuple[str, int]:
    m = re.match(r"^(.*?)\s+(\d{1,3})$", arg.strip())
    if m:
        return m.group(1), int(m.group(2))
    return arg.strip(), default


class Service:
    def __init__(self):
        self.cfg = load_config()
        self.storage = Storage(self.cfg.data_dir / "messages.db")
        self.user = TelegramClient(
            str(self.cfg.session_dir / "user"), self.cfg.api_id, self.cfg.api_hash,
            device_model="TG Watcher", app_version="1.0",
        )
        self.bot: TelegramClient | None = None
        self.reader = TelegramReader(self.user, self.cfg.keep_offline)
        self.agent = None  # agent.Agent (Claude 키가 있을 때만)
        self.me_id = 0
        self.bot_id = 0
        self.sent_by_service: set[int] = set()  # 저장한 메시지 모드에서 내가 보낸 응답 ID

    # ── 알림/응답 보내기 ──────────────────────────────
    async def notify(self, text: str) -> None:
        for chunk in split_text(text):
            try:
                if self.bot:
                    await self.bot.send_message(self.me_id, chunk, parse_mode=None)
                else:
                    msg = await self.user.send_message("me", "🤖 " + chunk, parse_mode=None)
                    self.sent_by_service.add(msg.id)
            except Exception as e:
                log.warning("알림 전송 실패 (봇에게 /start 를 먼저 보냈나요?): %s", e)
                return
        if not self.bot:
            await self.reader.go_offline()

    # ── 실시간 감시 ─────────────────────────────────
    async def on_incoming(self, event: events.NewMessage.Event) -> None:
        """새 메시지 수신. 읽음 처리는 절대 하지 않는다."""
        if event.chat_id == self.bot_id:
            return  # 내 지시용 봇과의 대화는 감시 대상에서 제외
        msg = event.message
        is_channel = event.is_channel and not event.is_group
        watched = self.storage.watched()
        in_watch = event.chat_id in watched

        should_log = in_watch or (self.cfg.log_all_chats and (self.cfg.log_channels or not is_channel))
        if not should_log and not self.storage.keywords():
            return

        chat = await event.get_chat()
        sender = await event.get_sender()
        chat_name = utils.get_display_name(chat) if chat else str(event.chat_id)
        sender_name = utils.get_display_name(sender) if sender else ""
        text = message_text(msg)

        if should_log:
            self.storage.log_message(event.chat_id, msg.id, chat_name, sender_name,
                                     text, int(msg.date.timestamp()))

        hits = [k for k in self.storage.keywords() if k.lower() in text.lower()]
        if in_watch or hits:
            tag = f"🔑{','.join(hits)} " if hits else "👀 "
            who = f"{sender_name}: " if sender_name and sender_name != chat_name else ""
            await self.notify(f"{tag}[{chat_name}] {who}{text}")

    # ── 명령 처리 ───────────────────────────────────
    async def handle_command(self, text: str) -> str:
        text = text.strip()
        cmd, _, arg = text.partition(" ")
        cmd = cmd.lower().split("@")[0]
        arg = arg.strip()
        r = self.reader

        if cmd in ("/start", "/help", "/도움말"):
            return HELP

        if cmd == "/chats":
            chats = await r.list_chats(arg or None, limit=40)
            return "\n".join(
                f"• {c['name']} ({c['type']}) {'🔴' + str(c['unread']) if c['unread'] else ''}"
                for c in chats) or "(대화방 없음)"

        if cmd == "/unread":
            if not arg:
                chats = await r.list_chats(unread_only=True, limit=50)
                if not chats:
                    return "안 읽은 메시지가 없어요."
                return "안 읽은 메시지가 있는 방:\n" + "\n".join(
                    f"• {c['name']} 🔴{c['unread']}" for c in chats)
            d = await r.resolve(arg)
            rows = await r.unread(d)
            return f"[{d.name}] 안 읽은 {d.unread_count}개 (읽음 처리 안 됨)\n" + render_rows(rows)

        if cmd == "/recent":
            chat, n = parse_chat_and_count(arg, 20)
            d = await r.resolve(chat)
            return f"[{d.name}] 최근 {n}개\n" + render_rows(await r.recent(d, n))

        if cmd == "/search":
            if not arg:
                return "사용법: /search 검색어"
            return render_rows(await r.search(arg), with_chat=True)

        if cmd == "/watch":
            d = await r.resolve(arg)
            self.storage.add_watch(d.id, d.name)
            return f"👀 '{d.name}' ({chat_kind(d)}) 새 메시지를 실시간으로 알려드릴게요."
        if cmd == "/unwatch":
            d = await r.resolve(arg)
            return f"'{d.name}' 감시 해제" if self.storage.remove_watch(d.id) else "감시 중이 아니었어요."
        if cmd == "/watchlist":
            w = self.storage.watched()
            return "감시 중:\n" + "\n".join(f"• {n}" for n in w.values()) if w else "감시 중인 방이 없어요."

        if cmd == "/kw":
            if not arg:
                return "사용법: /kw 단어"
            self.storage.add_keyword(arg)
            return f"🔑 '{arg}' 키워드 알림 추가"
        if cmd == "/unkw":
            return f"'{arg}' 삭제" if self.storage.remove_keyword(arg) else "없던 키워드예요."
        if cmd == "/kwlist":
            return "키워드: " + (", ".join(self.storage.keywords()) or "(없음)")

        if cmd in ("/yes", "/no"):
            if not self.agent:
                return "대기 중인 전송이 없어요."
            return await self.agent.confirm_send(cmd == "/yes")

        if cmd == "/reset":
            if self.agent:
                self.agent.reset()
            return "대화 맥락을 초기화했어요."

        return "모르는 명령어예요. /help 를 보내보세요."

    async def handle(self, text: str) -> str:
        try:
            if text.startswith("/"):
                return await self.handle_command(text)
            if not self.agent:
                return ("자연어 지시를 쓰려면 .env 에 ANTHROPIC_API_KEY 를 넣어주세요.\n"
                        "지금은 /명령어만 쓸 수 있어요. /help")
            return await self.agent.ask(text)
        except ValueError as e:
            return f"⚠️ {e}"
        except Exception as e:
            log.exception("처리 중 오류")
            return f"⚠️ 오류가 났어요: {type(e).__name__}: {e}"

    async def reply(self, text: str) -> None:
        await self.notify(await self.handle(text))

    # ── 시작 ────────────────────────────────────────
    async def run(self) -> None:
        await self.user.start(phone=self.cfg.phone)
        me = await self.user.get_me()
        self.me_id = me.id
        await self.reader.go_offline()
        log.info("로그인: %s (id %s)", utils.get_display_name(me), me.id)

        if self.cfg.anthropic_key:
            try:
                from agent import Agent  # anthropic 패키지가 없으면 명령어만 사용
                self.agent = Agent(self.reader, self.storage, self.cfg.claude_model,
                                   self.cfg.anthropic_key)
                log.info("Claude 자연어 처리 사용 (%s)", self.cfg.claude_model)
            except ImportError as e:
                log.warning("anthropic 패키지가 없어 자연어 지시는 꺼둡니다: %s", e)

        self.user.add_event_handler(self.on_incoming, events.NewMessage(incoming=True))

        if self.cfg.bot_token:
            self.bot = TelegramClient(str(self.cfg.session_dir / "bot"),
                                      self.cfg.api_id, self.cfg.api_hash)
            await self.bot.start(bot_token=self.cfg.bot_token)
            bot_me = await self.bot.get_me()
            self.bot_id = bot_me.id

            async def on_bot(event: events.NewMessage.Event):
                # 내 계정이 보낸 메시지에만 반응 (다른 사람이 봇에 말 걸어도 무시)
                if event.sender_id != me.id:
                    return
                if event.is_private and event.raw_text:
                    await self.reply(event.raw_text)

            self.bot.add_event_handler(on_bot, events.NewMessage(incoming=True))
            log.info("지시 채널: 봇 @%s — 텔레그램에서 이 봇에게 /start 를 보내세요.",
                     bot_me.username)
        else:
            async def on_saved(event: events.NewMessage.Event):
                if event.id in self.sent_by_service:
                    return
                t = (event.raw_text or "").strip()
                if t.startswith("!"):
                    await self.reply(t[1:].strip())
                elif t.startswith("/"):
                    await self.reply(t)

            self.user.add_event_handler(
                on_saved, events.NewMessage(chats=[me.id], outgoing=True))
            log.info("지시 채널: '저장한 메시지'. /명령어 또는 '!할일' 형식으로 보내세요.")

        await self.notify("✅ 텔레그램 감시를 시작했어요. /help")
        log.info("실행 중… (종료: Ctrl+C)")
        tasks = [self.user.run_until_disconnected()]
        if self.bot:
            tasks.append(self.bot.run_until_disconnected())
        await asyncio.gather(*tasks)


def main() -> None:
    try:
        asyncio.run(Service().run())
    except KeyboardInterrupt:
        log.info("종료합니다.")


if __name__ == "__main__":
    main()
