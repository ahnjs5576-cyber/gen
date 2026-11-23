"""핸들러 공통 보안 가드: 경로 루트 제한, 프로그램 화이트리스트."""
from __future__ import annotations

import os
from pathlib import Path

from ..config import Config


class SafetyError(RuntimeError):
    pass


def require_file_root(cfg: Config) -> Path:
    if not cfg.file_root:
        raise SafetyError(
            "파일 작업이 비활성화되어 있습니다. config [handlers] file_root 를 설정하세요."
        )
    root = Path(cfg.file_root).resolve()
    if not root.exists():
        raise SafetyError(f"file_root 경로가 없습니다: {root}")
    return root


def resolve_within_root(cfg: Config, user_path: str) -> Path:
    """user_path 를 file_root 하위로 제한. 벗어나면 SafetyError."""
    root = require_file_root(cfg)
    candidate = (root / user_path).resolve() if not Path(user_path).is_absolute() else Path(user_path).resolve()
    try:
        candidate.relative_to(root)
    except ValueError:
        raise SafetyError(f"허용된 폴더(file_root) 밖의 경로입니다: {candidate}")
    return candidate


def check_program_allowed(cfg: Config, program: str) -> str:
    """화이트리스트에 있는 프로그램만 허용. 매칭된 정식 경로/이름 반환."""
    if not cfg.allowed_programs:
        raise SafetyError(
            "허용된 프로그램이 없습니다. config [handlers] allowed_programs 에 등록하세요."
        )
    prog_norm = program.strip().lower()
    base = os.path.basename(prog_norm)
    for allowed in cfg.allowed_programs:
        a = allowed.strip().lower()
        if prog_norm == a or base == os.path.basename(a):
            return allowed  # 등록된 원본(정식 경로) 사용
    raise SafetyError(f"허용되지 않은 프로그램입니다: {program}")
