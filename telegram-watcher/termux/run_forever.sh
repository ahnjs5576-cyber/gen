#!/data/data/com.termux/files/usr/bin/bash
# 서비스가 죽으면 15초 뒤 다시 켜는 감시 루프 (tgw start 가 실행)
APP="$(cd "$(dirname "$0")/.." && pwd)"
PY="$APP/.venv/bin/python"
mkdir -p "$APP/data"
while true; do
  "$PY" "$APP/main.py" </dev/null >>"$APP/data/crash.log" 2>&1
  code=$?
  if [ "$code" -eq 3 ]; then
    echo "$(date '+%F %T') 설정 오류로 중지 (data/service.log 확인 → 고친 뒤 tgw start)" >>"$APP/data/crash.log"
    termux-wake-unlock 2>/dev/null
    exit 3
  fi
  echo "$(date '+%F %T') 종료됨(코드 $code), 15초 후 재시작" >>"$APP/data/crash.log"
  sleep 15
done
