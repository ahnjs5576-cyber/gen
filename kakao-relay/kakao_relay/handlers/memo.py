"""!메모 — 지시를 실행하지 않고 메모 파일에 기록."""
from __future__ import annotations

from datetime import datetime

from ..config import Config, resolve_path


def add_memo(cfg: Config, rest: str) -> str:
    text = rest.strip()
    if not text:
        return "메모 내용을 입력하세요. 예) !메모 우유 사기"
    path = resolve_path(cfg, cfg.memo_file)
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d %H:%M")
    with path.open("a", encoding="utf-8") as f:
        f.write(f"- [{stamp}] {text}\n")
    return f"📝 메모 저장: {text}"
