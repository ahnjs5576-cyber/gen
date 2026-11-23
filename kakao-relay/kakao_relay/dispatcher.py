"""Command 를 알맞은 핸들러로 라우팅."""
from __future__ import annotations

from .config import Config
from .handlers.ai import interpret_and_run
from .handlers.files import handle_files
from .handlers.memo import add_memo
from .handlers.program import run_program
from .handlers.safety import SafetyError
from .log import get_logger
from .parser import Command

log = get_logger(__name__)


def dispatch(cfg: Config, cmd: Command) -> str:
    """Command 를 처리하고 사용자에게 보낼 결과 문자열을 반환."""
    try:
        if cmd.verb == "run":
            return run_program(cfg, cmd.rest)
        if cmd.verb == "files":
            return handle_files(cfg, cmd.rest)
        if cmd.verb == "memo":
            return add_memo(cfg, cmd.rest)
        # verb 없음 → freeform → AI 해석
        return interpret_and_run(cfg, cmd.rest)
    except SafetyError as e:
        return f"🚫 보안 정책에 막힘: {e}"
    except Exception as e:  # 핸들러 예외가 서비스를 죽이지 않게
        log.exception("핸들러 오류")
        return f"⚠️ 처리 중 오류: {e}"
