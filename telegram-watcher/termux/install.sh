#!/data/data/com.termux/files/usr/bin/bash
# TG Watcher — Termux 설치 스크립트
# 사용법:  bash install.sh
set -euo pipefail

REPO_URL="https://github.com/ahnjs5576-cyber/gen.git"
BRANCH="claude/telegram-auto-monitoring-nbgpub"
ROOT="$HOME/tg-watcher"
APP="$ROOT/telegram-watcher"

say()  { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$*"; }

if [ -z "${PREFIX:-}" ] || [ ! -d /data/data/com.termux ]; then
  echo "이 스크립트는 안드로이드 Termux 앱 안에서 실행해야 합니다."; exit 1
fi

say "1/6 패키지 저장소 업데이트 (질문이 나오면 Enter)"
pkg update -y
pkg upgrade -y

say "2/6 필수 프로그램 설치 (python, git, procps, nano)"
pkg install -y python git procps nano

PYV=$(python -c 'import sys; print("%d.%d" % sys.version_info[:2])')
echo "Python $PYV"
python - <<'EOF' || { echo "Python 3.10 이상이 필요합니다. 저장소가 오래됐을 수 있어요: termux-change-repo 로 미러를 바꿔보세요."; exit 1; }
import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)
EOF

say "3/6 코드 내려받기 → $ROOT"
if [ -d "$ROOT/.git" ]; then
  git -C "$ROOT" pull --ff-only
else
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$ROOT"
fi

say "4/6 Python 가상환경 + 텔레그램 라이브러리 설치"
cd "$APP"
[ -d .venv ] || python -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install "telethon>=1.36" "python-dotenv>=1.0" "olefile>=0.46" "pypdf>=4.0"

say "5/6 Claude 자연어 기능 (선택)"
echo "자연어 지시(\"회사방 요약해줘\")를 쓰려면 anthropic 라이브러리가 필요합니다."
echo "폰에서 직접 빌드해야 해서 10~30분 걸리고 저장공간 약 1.5GB를 씁니다."
read -r -p "지금 설치할까요? [y/N] " ans
if [[ "${ans,,}" == y* ]]; then
  pkg install -y rust clang binutils make
  export ANDROID_API_LEVEL
  ANDROID_API_LEVEL=$(getprop ro.build.version.sdk)
  if .venv/bin/pip install "anthropic>=2.0"; then
    echo "anthropic 설치 완료"
  else
    warn "anthropic 설치 실패 — /명령어 기능만으로 동작합니다. 나중에 'tgw claude' 로 다시 시도할 수 있어요."
  fi
else
  echo "건너뜀. 나중에 'tgw claude' 로 설치할 수 있어요."
fi

say "6/6 실행 명령(tgw)과 부팅 자동 시작 등록"
chmod +x "$APP/termux/tgw" "$APP/termux/run_forever.sh"
ln -sf "$APP/termux/tgw" "$PREFIX/bin/tgw"
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/tg-watcher" <<EOF
#!/data/data/com.termux/files/usr/bin/sh
# Termux:Boot — 폰이 켜지면 TG Watcher 자동 시작
termux-wake-lock
sleep 30
$PREFIX/bin/tgw start
EOF
chmod +x "$HOME/.termux/boot/tg-watcher"

[ -f "$APP/.env" ] || cp "$APP/.env.example" "$APP/.env"
chmod 600 "$APP/.env"

cat <<'EOF'

✅ 설치 완료! 다음 순서로 진행하세요.

  1) tgw setup   ← API 키·봇 토큰 입력
  2) tgw login   ← 첫 로그인 (텔레그램으로 온 코드 입력, 성공 메시지 보이면 Ctrl+C)
  3) tgw start   ← 백그라운드 실행

  그 외: tgw status | tgw log | tgw stop | tgw update
EOF
