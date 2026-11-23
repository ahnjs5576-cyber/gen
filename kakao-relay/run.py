#!/usr/bin/env python3
"""kakao-relay 실행 진입점.

사용법:
  py run.py                # 서비스 실행 (폴링 루프)
  py run.py --inspect      # 각 방 DB 복호화 후 테이블/컬럼 출력 (스키마 확인)
  py run.py --once         # 한 번만 폴링하고 종료 (테스트)
  py run.py --config X.toml
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from kakao_relay.config import load_config
from kakao_relay.engine import Engine
from kakao_relay.log import get_logger

log = get_logger("run")


def main() -> int:
    ap = argparse.ArgumentParser(description="카카오톡 PC 지시 처리 릴레이")
    ap.add_argument("--config", default="config.toml", help="설정 파일 경로")
    ap.add_argument("--inspect", action="store_true", help="방 DB 스키마 출력 후 종료")
    ap.add_argument("--once", action="store_true", help="한 번만 폴링 후 종료")
    args = ap.parse_args()

    try:
        cfg = load_config(args.config)
    except FileNotFoundError as e:
        log.error("%s", e)
        return 2

    try:
        engine = Engine(cfg)
    except FileNotFoundError as e:
        log.error("초기화 실패: %s", e)
        return 2

    if args.inspect:
        engine.inspect()
        return 0

    if args.once:
        engine.initialize_watermarks()
        n = engine.run_once()
        log.info("처리한 메시지 수: %s", n)
        return 0

    engine.run_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
