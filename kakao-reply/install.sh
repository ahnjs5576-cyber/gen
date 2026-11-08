#!/usr/bin/env bash
# kakao-reply 설치 (맥/리눅스). 사용: 터미널에서  bash install.sh
# 1) pipx 가 있으면 그걸로, 2) 없으면 Homebrew/pip 로 pipx 를 설치해 보고,
# 3) 그것도 안 되면(PEP 668 '외부 관리 Python' 등) 전용 가상환경에 설치한다.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
PY="$(command -v python3 || command -v python || true)"
if [ -z "$PY" ]; then
  echo "Python 3.10 이상이 필요해요. 맥은 'brew install python', 또는 python.org 에서 설치하세요." >&2
  exit 1
fi
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' || {
  echo "Python 3.10 이상이 필요해요 (지금: $("$PY" --version))." >&2; exit 1; }

done_msg() {
  echo
  echo "설치했어요. 터미널을 새로 연 뒤 다음을 한 번씩 실행하세요:"
  echo "  kakao-reply key set     # API 키 저장"
  echo "  kakao-reply me 내이름   # 내보낸 파일에 찍히는 본인 이름"
}

PIPX=""
if command -v pipx >/dev/null 2>&1; then
  PIPX="pipx"
elif command -v brew >/dev/null 2>&1 && brew install pipx >/dev/null 2>&1; then
  PIPX="pipx"
elif "$PY" -m pip install --user --upgrade pipx >/dev/null 2>&1; then
  PIPX="$PY -m pipx"
fi

if [ -n "$PIPX" ]; then
  $PIPX ensurepath >/dev/null 2>&1 || true
  $PIPX install --force "$HERE"
  done_msg
  exit 0
fi

# pipx 를 쓸 수 없으면 전용 가상환경에 설치하고 ~/.local/bin 에 실행 파일을 연결한다.
VENV="$HOME/.local/share/kakao-reply/venv"
echo "pipx 를 쓸 수 없어 전용 가상환경($VENV)에 설치해요."
"$PY" -m venv "$VENV"
"$VENV/bin/pip" install --upgrade pip >/dev/null
"$VENV/bin/pip" install "$HERE"
mkdir -p "$HOME/.local/bin"
ln -sf "$VENV/bin/kakao-reply" "$HOME/.local/bin/kakao-reply"
case ":$PATH:" in
  *":$HOME/.local/bin:"*) ;;
  *) echo "※ ~/.local/bin 이 PATH 에 없어요. 셸 설정 파일에 다음 줄을 추가하세요: export PATH=\"\$HOME/.local/bin:\$PATH\"" ;;
esac
done_msg
