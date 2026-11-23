"""!실행 — 화이트리스트에 등록된 프로그램/스크립트 실행."""
from __future__ import annotations

import shlex
import subprocess

from ..config import Config
from .safety import check_program_allowed


def run_program(cfg: Config, rest: str) -> str:
    """rest 예: 'notepad.exe' 또는 'C:\\tools\\build.bat --fast'."""
    if not rest.strip():
        return "실행할 프로그램이 지정되지 않았습니다. 예) !실행 notepad.exe"

    try:
        tokens = shlex.split(rest, posix=False)
    except ValueError:
        tokens = rest.split()
    program = tokens[0]
    args = tokens[1:]

    resolved = check_program_allowed(cfg, program)  # SafetyError 가능

    try:
        proc = subprocess.run(
            [resolved, *args],
            capture_output=True,
            text=True,
            timeout=cfg.exec_timeout,
        )
    except subprocess.TimeoutExpired:
        return f"⏱️ 실행 타임아웃({cfg.exec_timeout}s): {program}"
    except FileNotFoundError:
        return f"프로그램을 찾을 수 없습니다: {resolved}"

    out = (proc.stdout or "").strip()
    err = (proc.stderr or "").strip()
    head = f"✅ 실행 완료 (exit={proc.returncode}): {program}"
    body = ""
    if out:
        body += f"\n[출력]\n{out[:1500]}"
    if err:
        body += f"\n[오류]\n{err[:800]}"
    return head + body
