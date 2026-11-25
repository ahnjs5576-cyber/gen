#!/usr/bin/env python3
"""kakao-relay 실행 진입점.

사용법:
  py run.py                # 서비스 실행 (폴링 루프)
  py run.py --extract-keys # 카톡 메모리에서 키 추출 → keys.json 자동 생성/갱신
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
    ap.add_argument("--extract-keys", action="store_true", help="메모리에서 키 추출→keys.json")
    ap.add_argument("--inspect", action="store_true", help="방 DB 스키마 출력 후 종료")
    ap.add_argument("--once", action="store_true", help="한 번만 폴링 후 종료")
    args = ap.parse_args()

    try:
        cfg = load_config(args.config)
    except FileNotFoundError as e:
        log.error("%s", e)
        return 2

    # 키 추출은 keys.json 이 아직 없어도 동작해야 하므로 Engine 생성 전에 처리
    if args.extract_keys:
        from kakao_relay.config import resolve_path
        from kakao_relay.keyscan import extract_keys, is_windows

        if not is_windows():
            log.error("키 추출은 윈도우에서만 동작합니다. 카카오톡이 설치된 PC에서 실행하세요.")
            return 2
        keys_path = resolve_path(cfg, cfg.keys_file)
        report = extract_keys(cfg, keys_path, cfg.process_name)
        print("\n=== 키 추출 결과 ===")
        print(f"수집한 키 후보: {report['candidates']}개")
        print(f"확정된 방: {len(report['matched'])}개 → {list(report['matched'].keys())}")
        if report["unmatched"]:
            print(f"못 찾은 방: {report['unmatched']}")
            print("  → 그 방을 카톡에서 한 번 연 뒤 다시 --extract-keys 를 실행하세요.")
        print(f"저장: {keys_path}")
        return 0

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
