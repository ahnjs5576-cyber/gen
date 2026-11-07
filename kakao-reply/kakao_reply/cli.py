"""명령줄 인터페이스.

    kakao-reply inbox   exports/            [--me 이름]
    kakao-reply show    대화.txt            [--me 이름] [--days 7]
    kakao-reply suggest 대화.txt            [--me 이름] [--days 7] [--last 200]
                                            [--ask "정중하게 거절"] [--pseudonymize] [--copy 1] [--dry-run]
    kakao-reply key set | delete

구성: 읽기(parser/transcript) · 답장 초안(analyzer) · 입력(output) 을 분리했다.
대화 내용은 화면에 보여 줄 뿐 디스크에 따로 저장하지 않는다.
"""

from __future__ import annotations

import argparse
import getpass
import json
import logging
import sys
import unicodedata
from pathlib import Path

from . import output, secrets
from .analyzer import Analysis, analyze, build_request
from .parser import Chat, parse_file
from .privacy import Pseudonymizer, log_summary
from .transcript import describe_age, filter_period, guess_me, room_status

log = logging.getLogger("kakao_reply")


def _load(path: str, me_arg: str | None, days: int | None = None) -> tuple[Chat, str | None]:
    chat = parse_file(path)
    if not chat.messages:
        sys.exit(f"{path}: 메시지를 찾지 못했습니다. 카카오톡 '대화 내보내기' 파일(.txt/.csv)인지 확인하세요.")
    chat = filter_period(chat, days)
    log.info("loaded %s", log_summary(chat))  # 이름·내용은 로그에 남기지 않는다
    return chat, me_arg or guess_me(chat)


def _pad(text: str, width: int) -> str:
    """한글처럼 화면에서 두 칸을 차지하는 글자를 고려해 왼쪽 정렬."""
    out, used = "", 0
    for ch in text:
        w = 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1
        if used + w > width:
            break
        out, used = out + ch, used + w
    return out + " " * (width - used)


def _fmt_time(t) -> str:
    return t.strftime("%m-%d %H:%M") if t else "--"


def _stale_warning(status) -> None:
    if status.stale:
        print(f"⚠ {describe_age(status.saved_at)} — 그 뒤에 온 대화는 빠져 있어요. 최신 내용이 필요하면 다시 내보내세요.")


def cmd_inbox(args) -> None:
    files = sorted(p for p in Path(args.dir).iterdir() if p.suffix.lower() in (".txt", ".csv"))
    if not files:
        sys.exit(f"{args.dir} 에 내보내기 파일(.txt/.csv)이 없습니다.")
    rows = []
    for f in files:
        chat = parse_file(f)
        if chat.messages:
            rows.append(room_status(chat, args.me or guess_me(chat)))
    rows.sort(key=lambda r: (r.last_time is None, -(r.last_time.timestamp() if r.last_time else 0)))

    print(f"{_pad('방', 18)} {_pad('마지막', 12)} {_pad('마지막 발신', 12)} {_pad('답할 것', 8)} 비고")
    for r in rows:
        if r.last_is_mine is None:
            who = "?"
        else:
            who = "나" if r.last_is_mine else r.last_sender
        notes = []
        if r.last_is_mine is False:
            notes.append("답장 필요")
        if r.pending_attachments:
            notes.append(f"첨부 {len(r.pending_attachments)}")
        if r.stale:
            notes.append(describe_age(r.saved_at))
        print(f"{_pad(r.title, 18)} {_pad(_fmt_time(r.last_time), 12)} {_pad(who, 12)} "
              f"{_pad(str(len(r.pending)), 8)} {', '.join(notes)}")
    if any(r.last_is_mine is None for r in rows):
        print("\n'?' 는 본인 이름을 몰라서예요. --me 로 지정하세요.")


def cmd_show(args) -> None:
    chat, me = _load(args.file, args.me, args.days)
    st = room_status(chat, me)
    print(f"대화방: {st.title}  ({describe_age(st.saved_at)})")
    print(f"참여자: {', '.join(chat.participants)}")
    print(f"메시지: {st.message_count}개, 마지막 {_fmt_time(st.last_time)} {st.last_sender}")
    _stale_warning(st)
    if not me:
        print("\n(--me 로 본인 이름을 지정하면 답 안 한 메시지를 골라 드려요)")
        return
    if st.last_is_mine:
        print("\n마지막 메시지가 내 메시지예요. 답 기다리는 중.")
        return
    print(f"\n내 마지막 메시지 이후 온 메시지: {len(st.pending)}개")
    for m in st.pending:
        print("  " + m.line().replace("\n", "\n  "))
    if st.pending_attachments:
        print("\n※ 첨부물 원본은 내보내기 파일에 들어 있지 않아 여기서 받을 수 없어요. 카카오톡 앱에서 확인하세요.")


def _print_analysis(result: Analysis) -> None:
    print("■ 요약\n" + result.summary + "\n")
    if result.pending_points:
        print("■ 답해야 할 것")
        for p in result.pending_points:
            print(f"  - {p}")
        print()
    print("■ 답장 초안" + ("" if result.needs_reply else " (답장이 꼭 필요하진 않아 보여요)"))
    for i, s in enumerate(result.suggestions, 1):
        print(f"  {i}. [{s.tone}] {s.text}")


def cmd_suggest(args) -> None:
    chat, me = _load(args.file, args.me, args.days)
    _stale_warning(room_status(chat, me))

    pseudo = Pseudonymizer(chat, me) if args.pseudonymize else None
    send_chat, send_me = (pseudo.apply(chat), Pseudonymizer.ME if me else None) if pseudo else (chat, me)

    if args.dry_run:
        print("# 아래 내용이 Claude API 로 전송됩니다 (실제 전송 안 함)\n")
        print(json.dumps(build_request(send_chat, send_me, args.last, args.ask), ensure_ascii=False, indent=2))
        return

    import anthropic

    try:
        result = analyze(secrets.make_client(), send_chat, send_me, args.last, args.ask)
    except anthropic.AuthenticationError:
        sys.exit("API 키가 없거나 잘못됐습니다. `kakao-reply key set` 으로 등록하세요.")
    except anthropic.RateLimitError:
        sys.exit("요청이 너무 많습니다. 잠시 후 다시 시도하세요.")
    except anthropic.APIConnectionError:
        sys.exit("Claude API 에 연결하지 못했습니다. 네트워크를 확인하세요.")
    except anthropic.APIStatusError as e:
        sys.exit(f"API 오류 ({e.status_code})")  # 오류 본문에 대화 내용이 섞일 수 있어 출력하지 않음
    except RuntimeError as e:
        sys.exit(str(e))

    if pseudo:
        result.summary = pseudo.restore(result.summary)
        result.pending_points = [pseudo.restore(p) for p in result.pending_points]
        for s in result.suggestions:
            s.text = pseudo.restore(s.text)

    _print_analysis(result)

    if args.copy:
        if not 1 <= args.copy <= len(result.suggestions):
            sys.exit(f"--copy 는 1~{len(result.suggestions)} 사이여야 합니다.")
        if output.copy_to_clipboard(result.suggestions[args.copy - 1].text):
            print(f"\n{args.copy}번 초안을 클립보드에 복사했어요. 카카오톡에서 붙여넣고 직접 보내세요.")


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
    p.add_argument("-v", "--verbose", action="store_true", help="진행 로그 출력 (이름·내용은 남기지 않음)")
    sub = p.add_subparsers(dest="cmd", required=True)

    ip = sub.add_parser("inbox", help="폴더 안 여러 대화방을 최근순으로 한눈에 보기")
    ip.add_argument("dir", help="내보내기 파일들이 있는 폴더")
    ip.add_argument("--me", help="본인 이름 (기본: '나'가 있으면 자동)")
    ip.set_defaults(func=cmd_inbox)

    for name, fn, help_ in (("show", cmd_show, "대화 정보와 답 안 한 메시지 보기"),
                            ("suggest", cmd_suggest, "요약 + 답장 초안 생성")):
        sp = sub.add_parser(name, help=help_)
        sp.add_argument("file", help="카카오톡 대화 내보내기 파일 (.txt 또는 .csv)")
        sp.add_argument("--me", help="내보낸 파일에 표시된 본인 이름 (기본: '나'가 있으면 자동)")
        sp.add_argument("--days", type=int, help="최근 N일 대화만 사용")
        sp.set_defaults(func=fn)
        if name == "suggest":
            sp.add_argument("--last", type=int, default=200, help="최근 N개 메시지만 보냄 (기본 200, 0=전체)")
            sp.add_argument("--ask", help='추가 요청, 예: "정중하게 거절하고 싶어"')
            sp.add_argument("--pseudonymize", action="store_true",
                            help="이름을 가명으로 바꾸고 전화번호·이메일 등을 가린 뒤 전송")
            sp.add_argument("--copy", type=int, metavar="N", help="N번 초안을 클립보드에 복사 (전송은 직접)")
            sp.add_argument("--dry-run", action="store_true", help="전송할 내용만 출력하고 API 는 호출하지 않음")

    kp = sub.add_parser("key", help="API 키를 키체인에 저장/삭제")
    kp.add_argument("action", choices=["set", "delete"])
    kp.set_defaults(func=cmd_key)

    args = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(message)s")
    args.func(args)


if __name__ == "__main__":
    main()
