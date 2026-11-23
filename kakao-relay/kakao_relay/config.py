"""config.toml 로딩 및 검증."""
from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

if sys.version_info >= (3, 11):
    import tomllib
else:  # pragma: no cover
    raise RuntimeError("Python 3.11 이상이 필요합니다 (tomllib).")


@dataclass
class CipherConfig:
    page_size: int = 4096
    kdf_iter: int = 256000
    hmac_algorithm: str = "HMAC_SHA512"
    kdf_algorithm: str = "PBKDF2_HMAC_SHA512"
    table: str = "chatLogs"
    col_logid: str = "id"
    col_chatid: str = "chatId"
    col_userid: str = "userId"
    col_message: str = "message"
    col_type: str = "type"
    col_created: str = "createdAt"


@dataclass
class Config:
    # kakao
    user_dir: str = ""
    keys_file: str = "keys.json"
    sqlcipher_exe: str = ""
    cipher: CipherConfig = field(default_factory=CipherConfig)
    # filter
    command_prefix: str = "!"
    allowed_chat_ids: list[str] = field(default_factory=list)
    allowed_user_ids: list[str] = field(default_factory=list)
    # telegram
    telegram_bot_token: str = ""
    telegram_chat_id: str = ""
    # claude
    claude_api_key: str = ""
    claude_model: str = "claude-opus-4-8"
    # handlers
    allowed_programs: list[str] = field(default_factory=list)
    exec_timeout: int = 120
    file_root: str = ""
    memo_file: str = "memo.md"
    # health
    idle_warn_minutes: int = 180
    poll_interval_sec: int = 5
    # 내부
    base_dir: Path = field(default_factory=Path.cwd)

    @property
    def ai_enabled(self) -> bool:
        return bool(self.claude_api_key)


def _as_str_list(value: Any) -> list[str]:
    if not value:
        return []
    return [str(v) for v in value]


def load_config(path: str | os.PathLike) -> Config:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(
            f"설정 파일을 찾을 수 없습니다: {p}\n"
            f"config.example.toml 을 config.toml 로 복사해 채우세요."
        )
    with p.open("rb") as f:
        raw = tomllib.load(f)

    kakao = raw.get("kakao", {})
    cipher_raw = kakao.get("cipher", {})
    flt = raw.get("filter", {})
    tele = raw.get("telegram", {})
    claude = raw.get("claude", {})
    handlers = raw.get("handlers", {})
    health = raw.get("health", {})

    cfg = Config(
        user_dir=str(kakao.get("user_dir", "")),
        keys_file=str(kakao.get("keys_file", "keys.json")),
        sqlcipher_exe=str(kakao.get("sqlcipher_exe", "")),
        cipher=CipherConfig(
            page_size=int(cipher_raw.get("page_size", 4096)),
            kdf_iter=int(cipher_raw.get("kdf_iter", 256000)),
            hmac_algorithm=str(cipher_raw.get("hmac_algorithm", "HMAC_SHA512")),
            kdf_algorithm=str(cipher_raw.get("kdf_algorithm", "PBKDF2_HMAC_SHA512")),
            table=str(cipher_raw.get("table", "chatLogs")),
            col_logid=str(cipher_raw.get("col_logid", "id")),
            col_chatid=str(cipher_raw.get("col_chatid", "chatId")),
            col_userid=str(cipher_raw.get("col_userid", "userId")),
            col_message=str(cipher_raw.get("col_message", "message")),
            col_type=str(cipher_raw.get("col_type", "type")),
            col_created=str(cipher_raw.get("col_created", "createdAt")),
        ),
        command_prefix=str(flt.get("command_prefix", "!")),
        allowed_chat_ids=_as_str_list(flt.get("allowed_chat_ids")),
        allowed_user_ids=_as_str_list(flt.get("allowed_user_ids")),
        telegram_bot_token=str(tele.get("bot_token", "")),
        telegram_chat_id=str(tele.get("chat_id", "")),
        claude_api_key=str(claude.get("api_key", "")),
        claude_model=str(claude.get("model", "claude-opus-4-8")),
        allowed_programs=_as_str_list(handlers.get("allowed_programs")),
        exec_timeout=int(handlers.get("exec_timeout", 120)),
        file_root=str(handlers.get("file_root", "")),
        memo_file=str(handlers.get("memo_file", "memo.md")),
        idle_warn_minutes=int(health.get("idle_warn_minutes", 180)),
        poll_interval_sec=int(health.get("poll_interval_sec", 5)),
        base_dir=p.resolve().parent,
    )
    return cfg


def resolve_path(cfg: Config, value: str) -> Path:
    """config 기준 상대경로를 base_dir 기준 절대경로로."""
    pp = Path(value)
    return pp if pp.is_absolute() else (cfg.base_dir / pp)
