"""설정 파일: 본인 이름 하나만 저장한다 (대화 내용·키는 저장하지 않음)."""

from __future__ import annotations

import json
import os
from pathlib import Path


def config_path() -> Path:
    base = os.environ.get("XDG_CONFIG_HOME") or Path.home() / ".config"
    return Path(base) / "kakao-reply" / "config.json"


def load_me() -> str | None:
    try:
        return json.loads(config_path().read_text(encoding="utf-8")).get("me") or None
    except (OSError, ValueError):
        return None


def save_me(name: str) -> Path:
    p = config_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps({"me": name}, ensure_ascii=False), encoding="utf-8")
    try:
        p.chmod(0o600)
    except OSError:
        pass
    return p
