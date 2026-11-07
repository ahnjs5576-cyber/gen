"""명령줄 인터페이스.

    kakao-reply show  대화.txt [--me 이름]
    kakao-reply suggest 대화.txt [--me 이름] [--last 200] [--ask "정중하게 거절"] [--dry-run]
    kakao-reply key set | delete
"""

from __future__ import annotations

import argparse
import getpass
import json
import sys

from . import secrets
from .analyzer import analyze, build_request, guess_me, pending_messages
from .parser import parse_file


def _load(args):
    chat = parse_file(args.file)
    if not chat.messages:
        sys.exit("메시지를 찾지 못했습니다. 카카오톡 '대화 내보내기' 파일(.txt/.csv)이 맞는지 확인하세요.")
    me = args.me or guess_me(chat)
    return chat, me


def cmd_show(args) -> None:
    chat, me = _load(args)
    print(f"대화방: {chat.title}")
    print(f"참여자: {', '.join(chat.participants)}")
    print(f"메시지: {len(chat.messages)}개")
    if not me:
        print("\n(--me 로 본인 이름을 지정하면 '안 읽은/답 안 한' 메시지를 골라 드려요)")
        return
    pending = pending_messages(chat, me)
    print(f"\n{me} 님이 아직 답하지 않은 메시지: {len(pending)}개")
    for m in pending:
        print("  " + m.line().replace("\n", "\n  "))


def cmd_suggest(args) -> None:
    chat, me = _load(args)
    if args.dry_run:
        print("# 아래 내용이 Claude API 로 전송됩니다 (실제 전송 안 함)\n")
        print(json.dumps(build_request(chat, me, args.last, args.ask), ensure_ascii=False, indent=2))
        return

    import anthropic

    try:
        result = analyze(secrets.make_client(), chat, me, args.last, args.ask)
    except anthropic.AuthenticationError:
        sys.exit("API 키가 없거나 잘못됐습니다. `kakao-reply key set` 으로 등록하세요.")
    except anthropic.RateLimitError:
        sys.exit("요청이 너무 많습니다. 잠시 후 다시 시도하세요.")
    except anthropic.APIConnectionError:
        sys.exit("Claude API 에 연결하지 못했습니다. 네트워크를 확인하세요.")
    except anthropic.APIStatusError as e:
        sys.exit(f"API 오류 ({e.status_code}): {e.message}")
    except RuntimeError as e:
        sys.exit(str(e))

    print("■ 요약\n" + result.summary + "\n")
    if result.pending_points:
        print("■ 답해야 할 것")
        for p in result.pending_points:
            print(f"  - {p}")
        print()
    print("■ 답장 초안" + ("" if result.needs_reply else " (답장이 꼭 필요하진 않아 보여요)"))
    for i, s in enumerate(result.suggestions, 1):
        print(f"  {i}. [{s.tone}] {s.text}")


def cmd_key(args) -> None:
    if args.action == "set":
        value = getpass.getpass("Anthropic API 키 (입력은 화면에 표시되지 않음): ").strip()
        if not value:
            sys.exit("입력이 비어 있습니다.")
        secrets.set_api_key(value)
        print("키체인에 저장했습니다.")
    else:
        print("삭제했습니다." if secrets.delete_api_key() else "저장된 키가 없습니다.")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="kakao-reply", description="카톡 대화 내보내기 파일로 답장 초안 만들기")
    sub = p.add_subparsers(dest="cmd", required=True)

    for name, fn, help_ in (("show", cmd_show, "대화 정보와 답 안 한 메시지 보기"),
                            ("suggest", cmd_suggest, "요약 + 답장 초안 생성")):
        sp = sub.add_parser(name, help=help_)
        sp.add_argument("file", help="카카오톡 대화 내보내기 파일 (.txt 또는 .csv)")
        sp.add_argument("--me", help="내보낸 파일에 표시된 본인 이름 (기본: '나'가 있으면 자동)")
        sp.set_defaults(func=fn)
        if name == "suggest":
            sp.add_argument("--last", type=int, default=200, help="최근 N개 메시지만 보냄 (기본 200, 0=전체)")
            sp.add_argument("--ask", help='추가 요청, 예: "정중하게 거절하고 싶어"')
            sp.add_argument("--dry-run", action="store_true", help="전송할 내용만 출력하고 API 는 호출하지 않음")

    kp = sub.add_parser("key", help="API 키를 키체인에 저장/삭제")
    kp.add_argument("action", choices=["set", "delete"])
    kp.set_defaults(func=cmd_key)

    args = p.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
