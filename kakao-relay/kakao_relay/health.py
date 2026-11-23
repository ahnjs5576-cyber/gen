"""상태 감시: 조용한 고장(장시간 무신호)·복호화 실패를 텔레그램으로 경고."""
from __future__ import annotations

import time

from .log import get_logger
from .notify import Telegram

log = get_logger(__name__)


class Health:
    def __init__(self, telegram: Telegram, idle_warn_minutes: int):
        self.telegram = telegram
        self.idle_warn_sec = max(1, idle_warn_minutes) * 60
        self._last_message_ts = time.time()
        self._idle_warned = False
        self._decrypt_fail_warned: set[str] = set()

    def mark_message(self) -> None:
        self._last_message_ts = time.time()
        if self._idle_warned:
            self._idle_warned = False
            self.telegram.send("✅ 메시지 수신 재개됨.")

    def mark_decrypt_fail(self, chat_id: str, reason: str) -> None:
        if chat_id in self._decrypt_fail_warned:
            return
        self._decrypt_fail_warned.add(chat_id)
        self.telegram.send(
            f"⚠️ 방 {chat_id} 복호화 실패. 키가 바뀌었거나 카톡 업데이트로 "
            f"방식이 변경됐을 수 있습니다.\n사유: {reason}"
        )

    def mark_decrypt_ok(self, chat_id: str) -> None:
        if chat_id in self._decrypt_fail_warned:
            self._decrypt_fail_warned.discard(chat_id)
            self.telegram.send(f"✅ 방 {chat_id} 복호화 정상화됨.")

    def tick(self) -> None:
        """주기적으로 호출. 무신호가 길어지면 1회 경고."""
        idle = time.time() - self._last_message_ts
        if idle >= self.idle_warn_sec and not self._idle_warned:
            self._idle_warned = True
            mins = int(idle // 60)
            self.telegram.send(
                f"🔇 최근 {mins}분간 어떤 방에서도 새 메시지가 없습니다. "
                f"카톡/서비스 상태를 확인하세요. (조용한 고장일 수 있음)"
            )
