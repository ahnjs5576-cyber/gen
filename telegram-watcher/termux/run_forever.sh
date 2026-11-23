#!/data/data/com.termux/files/usr/bin/bash
# 서비스가 죽으면 15초 뒤 다시 켜는 감시 루프 (tgw start 가 실행)
APP="$(cd "$(dirname "$0")/.." && pwd)"
PY="$APP/.venv/bin/python"
mkdir -p "$APP/data"
while true; do
  "$PY" "$APP/main.py" </dev/null >>"$APP/data/crash.log" 2>&1
  echo "$(date '+%F %T') 종료됨(코드 $?), 15초 후 재시작" >>"$APP/data/crash.log"
  sleep 15
done
