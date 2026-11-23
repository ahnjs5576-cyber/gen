"""방(chatId) -> SQLCipher 키(hex) 매핑 로딩.

키는 이 저장소가 직접 추출하지 않습니다. 외부 도구(예: MoniKa)로 뽑은 결과를
keys.json 에 넣으세요. 형식:

    { "123456789": "a1b2...(64 또는 96 hex)", ... }
"""
from __future__ import annotations

import json
import re
from pathlib import Path

_HEX_RE = re.compile(r"^[0-9a-fA-F]+$")


class KeyProvider:
    def __init__(self, path: Path):
        self.path = path
        self._keys: dict[str, str] = {}
        self.reload()

    def reload(self) -> None:
        if not self.path.exists():
            raise FileNotFoundError(
                f"키 파일이 없습니다: {self.path}\n"
                f"README '1. 키 확보' 를 참고해 keys.json 을 만드세요."
            )
        data = json.loads(self.path.read_text(encoding="utf-8"))
        keys: dict[str, str] = {}
        for chat_id, hexkey in data.items():
            h = str(hexkey).strip().lower()
            if h.startswith("0x"):
                h = h[2:]
            if not _HEX_RE.match(h) or len(h) not in (64, 96):
                raise ValueError(
                    f"키 형식 오류 (chatId={chat_id}): 64 또는 96 hex 여야 합니다. 받은 길이={len(h)}"
                )
            keys[str(chat_id)] = h
        self._keys = keys

    def chat_ids(self) -> list[str]:
        return list(self._keys.keys())

    def get(self, chat_id: str) -> str | None:
        return self._keys.get(str(chat_id))

    def __contains__(self, chat_id: object) -> bool:
        return str(chat_id) in self._keys
