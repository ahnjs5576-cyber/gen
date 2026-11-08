#!/usr/bin/env bash
# kakao-reply 설치 (맥/리눅스). 사용: 터미널에서  bash install.sh
set -euo pipefail
PY="$(command -v python3 || command -v python || true)"
if [ -z "$PY" ]; then
  echo "Python 3.10 이상이 필요해요. 맥은 'brew install python', 또는 python.org 에서 설치하세요." >&2
  exit 1
fi
"$PY" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' || {
  echo "Python 3.10 이상이 필요해요 (지금: $("$PY" --version))." >&2; exit 1; }
"$PY" -m pip install --user --upgrade pipx
"$PY" -m pipx ensurepath
HERE="$(cd "$(dirname "$0")" && pwd)"
"$PY" -m pipx install --force "$HERE"
echo
echo "설치했어요. 터미널을 새로 연 뒤 다음을 한 번씩 실행하세요:"
echo "  kakao-reply key set     # API 키 저장"
echo "  kakao-reply me 내이름   # 내보낸 파일에 찍히는 본인 이름"
