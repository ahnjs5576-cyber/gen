"""환경 변수(.env) 로딩."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


def _bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None or v.strip() == "":
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")


@dataclass(frozen=True)
class Config:
    api_id: int
    api_hash: str
    phone: str | None
    bot_token: str | None
    anthropic_key: str | None
    claude_model: str
    keep_offline: bool
    log_all_chats: bool
    log_channels: bool
    session_dir: Path
    data_dir: Path


def load_config() -> Config:
    api_id = os.getenv("TG_API_ID", "").strip()
    api_hash = os.getenv("TG_API_HASH", "").strip()
    if not api_id.isdigit() or not api_hash:
        raise SystemExit(
            "TG_API_ID / TG_API_HASH 가 .env 에 없습니다. "
            "https://my.telegram.org 에서 발급받아 .env 에 넣어주세요."
        )
    session_dir = BASE_DIR / "sessions"
    data_dir = BASE_DIR / "data"
    session_dir.mkdir(exist_ok=True)
    data_dir.mkdir(exist_ok=True)
    return Config(
        api_id=int(api_id),
        api_hash=api_hash,
        phone=os.getenv("TG_PHONE", "").strip() or None,
        bot_token=os.getenv("BOT_TOKEN", "").strip() or None,
        anthropic_key=os.getenv("ANTHROPIC_API_KEY", "").strip() or None,
        claude_model=os.getenv("CLAUDE_MODEL", "").strip() or "claude-opus-5-5",
        keep_offline=_bool("KEEP_OFFLINE", True),
        log_all_chats=_bool("LOG_ALL_CHATS", True),
        log_channels=_bool("LOG_CHANNELS", False),
        session_dir=session_dir,
        data_dir=data_dir,
    )
