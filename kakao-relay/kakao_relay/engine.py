"""메인 엔진: 방들을 주기적으로 폴링 → 신규 메시지 → 파싱 → 처리 → 통보."""
from __future__ import annotations

import time
from pathlib import Path

from .config import Config, resolve_path
from .dispatcher import dispatch
from .health import Health
from .kakaodb import DecryptError, Message, discover_user_dir, edb_path, open_room
from .keyprovider import KeyProvider
from .log import get_logger
from .notify import Telegram
from .parser import parse
from .state import State

log = get_logger(__name__)


class Engine:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.user_dir = discover_user_dir(cfg.user_dir)
        log.info("카카오톡 사용자 폴더: %s", self.user_dir)
        self.keys = KeyProvider(resolve_path(cfg, cfg.keys_file))
        self.state = State(resolve_path(cfg, "state.json"))
        self.telegram = Telegram(cfg.telegram_bot_token, cfg.telegram_chat_id)
        self.health = Health(self.telegram, cfg.idle_warn_minutes)

    # 감시 대상 방 목록
    def target_chat_ids(self) -> list[str]:
        ids = self.cfg.allowed_chat_ids or self.keys.chat_ids()
        # 키가 있는 방만
        return [c for c in ids if c in self.keys]

    def _open(self, chat_id: str):
        return open_room(
            self.user_dir,
            chat_id,
            self.keys.get(chat_id),
            self.cfg.cipher,
            self.cfg.sqlcipher_exe,
        )

    def initialize_watermarks(self) -> None:
        """처음 보는 방은 현재 최신 logId 를 워터마크로 잡아 과거 폭주를 막는다."""
        for chat_id in self.target_chat_ids():
            if self.state.has(chat_id):
                continue
            edb = edb_path(self.user_dir, chat_id)
            if not edb.exists():
                log.warning("방 %s 의 edb 가 아직 없습니다: %s", chat_id, edb)
                continue
            try:
                with self._open(chat_id) as reader:
                    top = reader.max_log_id()
                self.state.set(chat_id, top)
                log.info("방 %s 워터마크 초기화: logId=%s", chat_id, top)
                self.health.mark_decrypt_ok(chat_id)
            except (DecryptError, Exception) as e:
                log.error("방 %s 초기화 실패: %s", chat_id, e)
                self.health.mark_decrypt_fail(chat_id, str(e))

    def poll_room(self, chat_id: str) -> list[Message]:
        edb = edb_path(self.user_dir, chat_id)
        if not edb.exists():
            return []
        since = self.state.get(chat_id) or 0
        try:
            with self._open(chat_id) as reader:
                msgs = reader.read_after(chat_id, since)
            self.health.mark_decrypt_ok(chat_id)
            return msgs
        except Exception as e:
            log.error("방 %s 읽기 실패: %s", chat_id, e)
            self.health.mark_decrypt_fail(chat_id, str(e))
            return []

    def process_message(self, msg: Message) -> None:
        cmd = parse(self.cfg, msg)
        # 워터마크는 명령 여부와 무관하게 전진시킨다(중복 처리 방지)
        self.state.set(msg.chat_id, msg.log_id)
        if cmd is None:
            return
        log.info("지시 수신 방=%s 발신=%s: %s", msg.chat_id, msg.user_id, cmd.raw)
        result = dispatch(self.cfg, cmd)
        header = f"[방 {msg.chat_id}] {cmd.raw}\n—\n"
        self.telegram.send(header + result)

    def run_once(self) -> int:
        processed = 0
        for chat_id in self.target_chat_ids():
            msgs = self.poll_room(chat_id)
            for msg in msgs:
                self.health.mark_message()
                self.process_message(msg)
                processed += 1
        return processed

    def run_forever(self) -> None:
        self.initialize_watermarks()
        self.telegram.send("🟢 kakao-relay 시작됨. 지시 대기 중.")
        log.info("폴링 시작 (간격 %ss)", self.cfg.poll_interval_sec)
        try:
            while True:
                try:
                    self.run_once()
                except Exception:
                    log.exception("폴링 루프 오류")
                self.health.tick()
                time.sleep(self.cfg.poll_interval_sec)
        except KeyboardInterrupt:
            log.info("종료 요청됨.")
            self.telegram.send("🔴 kakao-relay 종료됨.")

    # --inspect 용
    def inspect(self) -> None:
        for chat_id in self.target_chat_ids():
            edb = edb_path(self.user_dir, chat_id)
            print(f"\n=== 방 {chat_id} ({edb.name}) ===")
            if not edb.exists():
                print("  edb 없음")
                continue
            try:
                with self._open(chat_id) as reader:
                    schema = reader.inspect()
                    for table, cols in schema.items():
                        print(f"  [table] {table}")
                        print(f"          {', '.join(cols)}")
            except Exception as e:
                print(f"  복호화/조회 실패: {e}")
