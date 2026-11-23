"""메시지 필터링 및 '!' 명령 파싱."""
from __future__ import annotations

from dataclasses import dataclass

from .config import Config
from .kakaodb import Message


@dataclass
class Command:
    message: Message
    verb: str          # 실행 / 파일 / 메모 / "" (freeform → AI)
    rest: str          # verb 뒤의 나머지 텍스트
    raw: str           # prefix 뗀 전체 명령 텍스트


# verb 별칭 → 표준 verb
_VERB_ALIASES = {
    "실행": "run",
    "run": "run",
    "파일": "files",
    "file": "files",
    "files": "files",
    "메모": "memo",
    "memo": "memo",
}


def is_allowed(cfg: Config, msg: Message) -> bool:
    """허용된 방/발신자인지."""
    if cfg.allowed_chat_ids and str(msg.chat_id) not in cfg.allowed_chat_ids:
        return False
    if cfg.allowed_user_ids and str(msg.user_id) not in cfg.allowed_user_ids:
        return False
    return True


def parse(cfg: Config, msg: Message) -> Command | None:
    """'!' 로 시작하고 허용된 메시지면 Command, 아니면 None."""
    text = (msg.text or "").strip()
    prefix = cfg.command_prefix
    if not text.startswith(prefix):
        return None
    if not is_allowed(cfg, msg):
        return None

    body = text[len(prefix) :].strip()
    if not body:
        return None

    parts = body.split(maxsplit=1)
    head = parts[0].lower()
    rest = parts[1].strip() if len(parts) > 1 else ""

    verb = _VERB_ALIASES.get(head, "")
    if verb:
        return Command(message=msg, verb=verb, rest=rest, raw=body)
    # 알려진 verb 가 아니면 전체를 freeform 으로 (AI 해석 대상)
    return Command(message=msg, verb="", rest=body, raw=body)
