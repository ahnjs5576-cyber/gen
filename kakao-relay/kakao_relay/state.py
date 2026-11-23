"""처리 상태(방별 logId 워터마크) 저장/복원."""
from __future__ import annotations

import json
import threading
from pathlib import Path


class State:
    """state.json 에 방별 마지막 처리 logId 를 기록."""

    def __init__(self, path: Path):
        self.path = path
        self._lock = threading.Lock()
        self._watermarks: dict[str, int] = {}
        self._load()

    def _load(self) -> None:
        if self.path.exists():
            try:
                data = json.loads(self.path.read_text(encoding="utf-8"))
                self._watermarks = {
                    str(k): int(v) for k, v in data.get("watermarks", {}).items()
                }
            except (ValueError, OSError):
                self._watermarks = {}

    def _save(self) -> None:
        tmp = self.path.with_suffix(".json.tmp")
        tmp.write_text(
            json.dumps({"watermarks": self._watermarks}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        tmp.replace(self.path)

    def get(self, chat_id: str) -> int | None:
        with self._lock:
            return self._watermarks.get(str(chat_id))

    def set(self, chat_id: str, log_id: int) -> None:
        with self._lock:
            cur = self._watermarks.get(str(chat_id))
            if cur is None or log_id > cur:
                self._watermarks[str(chat_id)] = int(log_id)
                self._save()

    def has(self, chat_id: str) -> bool:
        with self._lock:
            return str(chat_id) in self._watermarks
