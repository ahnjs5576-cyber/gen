"""입력(쓰기) 모듈 — 읽기 모듈과 분리.

답장 초안을 **클립보드에 복사**하는 데까지만 한다. 카카오톡 창을 열거나
입력창을 조작하지 않으므로 대화방이 열리면서 읽음 처리되는 일이 없다.
붙여넣고 전송하는 것은 사용자가 직접 한다.

(접근성 API 로 입력창에 직접 넣는 기능은 대화방을 실제로 열어 읽음 처리를
일으킬 수 있어 의도적으로 넣지 않았다. 추가하더라도 이 모듈 안에서, 사용자가
명시적으로 켰을 때만, 전송 키는 누르지 않는 방식으로 만든다.)
"""

from __future__ import annotations

import shutil
import subprocess
import sys

_COMMANDS = [
    ["pbcopy"],                              # macOS
    ["wl-copy"],                             # Linux (Wayland)
    ["xclip", "-selection", "clipboard"],    # Linux (X11)
    ["clip.exe"],                            # Windows / WSL
]


def copy_to_clipboard(text: str) -> bool:
    for cmd in _COMMANDS:
        if shutil.which(cmd[0]):
            encoding = "utf-16le" if cmd[0] == "clip.exe" else "utf-8"
            subprocess.run(cmd, input=text.encode(encoding), check=True)
            return True
    print("클립보드 도구(pbcopy/wl-copy/xclip)를 찾지 못했습니다.", file=sys.stderr)
    return False
