"""텔레그램 결과 통보."""
from __future__ import annotations

from .log import get_logger

log = get_logger(__name__)


class Telegram:
    def __init__(self, bot_token: str, chat_id: str):
        self.bot_token = bot_token
        self.chat_id = chat_id
        self.enabled = bool(bot_token and chat_id)
        self._base = f"https://api.telegram.org/bot{bot_token}"

    def send(self, text: str) -> bool:
        if not self.enabled:
            log.info("[텔레그램 비활성] %s", text)
            return False
        import requests  # 지연 임포트

        # 텔레그램 메시지 길이 제한(4096) 대응
        chunks = [text[i : i + 3900] for i in range(0, len(text), 3900)] or [""]
        ok = True
        for ch in chunks:
            try:
                resp = requests.post(
                    f"{self._base}/sendMessage",
                    json={"chat_id": self.chat_id, "text": ch, "disable_web_page_preview": True},
                    timeout=15,
                )
                if resp.status_code != 200:
                    log.error("텔레그램 전송 실패 %s: %s", resp.status_code, resp.text[:200])
                    ok = False
            except requests.RequestException as e:
                log.error("텔레그램 전송 예외: %s", e)
                ok = False
        return ok
