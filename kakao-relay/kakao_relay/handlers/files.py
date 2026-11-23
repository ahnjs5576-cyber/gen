"""!파일 — file_root 하위에서의 안전한 파일/폴더 작업."""
from __future__ import annotations

import shutil
import shlex

from ..config import Config
from .safety import require_file_root, resolve_within_root


def _human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.0f}{unit}"
        n /= 1024
    return f"{n:.1f}TB"


def handle_files(cfg: Config, rest: str) -> str:
    """지원: 목록/list, 이동/move, 삭제/delete, 생성폴더/mkdir.

    예)
      !파일 목록 report
      !파일 이동 a.pdf done/a.pdf
      !파일 삭제 temp.txt
      !파일 생성폴더 archive
    """
    try:
        tokens = shlex.split(rest, posix=False)
    except ValueError:
        tokens = rest.split()
    if not tokens:
        require_file_root(cfg)
        return "작업을 지정하세요. 예) !파일 목록 <폴더>"

    op = tokens[0].lower()
    args = tokens[1:]

    if op in ("목록", "list", "ls"):
        target = resolve_within_root(cfg, args[0] if args else ".")
        if not target.exists():
            return f"경로가 없습니다: {target.name}"
        if target.is_file():
            return f"{target.name} ({_human_size(target.stat().st_size)})"
        entries = sorted(target.iterdir(), key=lambda p: (p.is_file(), p.name.lower()))
        lines = []
        for p in entries[:100]:
            if p.is_dir():
                lines.append(f"📁 {p.name}/")
            else:
                lines.append(f"📄 {p.name} ({_human_size(p.stat().st_size)})")
        more = "" if len(entries) <= 100 else f"\n… 외 {len(entries) - 100}개"
        return f"[{target}] {len(entries)}개\n" + "\n".join(lines) + more

    if op in ("이동", "move", "mv"):
        if len(args) < 2:
            return "사용법: !파일 이동 <원본> <대상>"
        src = resolve_within_root(cfg, args[0])
        dst = resolve_within_root(cfg, args[1])
        if not src.exists():
            return f"원본이 없습니다: {args[0]}"
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
        return f"✅ 이동: {args[0]} → {args[1]}"

    if op in ("삭제", "delete", "rm"):
        if not args:
            return "삭제할 대상을 지정하세요."
        target = resolve_within_root(cfg, args[0])
        if not target.exists():
            return f"대상이 없습니다: {args[0]}"
        if target.is_dir():
            shutil.rmtree(target)
        else:
            target.unlink()
        return f"🗑️ 삭제: {args[0]}"

    if op in ("생성폴더", "mkdir"):
        if not args:
            return "폴더명을 지정하세요."
        target = resolve_within_root(cfg, args[0])
        target.mkdir(parents=True, exist_ok=True)
        return f"✅ 폴더 생성: {args[0]}"

    return f"지원하지 않는 파일 작업입니다: {op} (목록/이동/삭제/생성폴더)"
