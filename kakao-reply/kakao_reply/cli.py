"""명령줄 인터페이스.

    kakao-reply me      철수                       본인 이름 저장 (한 번만)
    kakao-reply inbox   exports/                   여러 방을 최근순으로
    kakao-reply show    대화.txt   [--days 7]      한 방의 상태
    kakao-reply suggest 대화.txt   [--days 7] [--last 200] [--ask "정중하게 거절"]
                                   [--no-pseudonymize] [--copy 1] [--dry-run]
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

from . import config, output, secrets
from .analyzer import Analysis, analyze, build_request
from .parser import Chat, ExportReadError, parse_file
from .privacy import Pseudonymizer, log_summary
from .transcript import describe_age, filter_period, guess_me, guess_me_across, room_status

log = logging.getLogger("kakao_reply")


def _fail(msg: str) -> None:
    sys.exit(msg)


def _parse(path) -> Chat:
    try:
        chat = parse_file(path)
    except ExportReadError as e:
        _fail(str(e))
    if not chat.messages:
        _fail(f"{path}: 메시지를 찾지 못했습니다. 카카오톡 '대화 내보내기' 파일(.txt/.csv)인지 확인하세요.")
    return chat


def _resolve_me(chat: Chat, me_arg: str | None) -> str | None:
    me = me_arg or config.load_me() or guess_me(chat)
    if me and me not in chat.participants:
        print(f"※ '{me}' 님이 이 방에서 보낸 메시지가 없어요. 이름이 다르면 --me 로 지정하세요. "
              f"(참여자: {', '.join(chat.participants)})", file=sys.stderr)
    return me


def _require_me(chat: Chat, me: str | None) -> str:
    if not me:
        _fail("본인 이름을 알 수 없어요. 아래 중 본인 이름으로 한 번 저장해 주세요:\n"
              f"  kakao-reply me <이름>     (참여자: {', '.join(chat.participants)})")
    return me


def _filtered(chat: Chat, days: int | None) -> Chat:
    out = filter_period(chat, days)
    if not out.messages:
        _fail(f"최근 {days}일 안에 메시지가 없어요. --days 를 늘리거나 빼고 다시 실행하세요.")
    log.info("loaded %s", log_summary(out))  # 이름·내용은 로그에 남기지 않는다
    return out


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


# ---------------------------------------------------------------- commands

def cmd_me(args) -> None:
    if args.name:
        path = config.save_me(args.name.strip())
        print(f"본인 이름을 '{args.name.strip()}'(으)로 저장했어요. ({path})")
    else:
        print(f"저장된 본인 이름: {config.load_me() or '(없음)'}")


def cmd_inbox(args) -> None:
    d = Path(args.dir)
    if not d.is_dir():
        _fail(f"{d}: 폴더가 아닙니다. 내보내기 파일들이 있는 폴더를 지정하세요.")
    chats: list[Chat] = []
    for f in sorted(p for p in d.iterdir() if p.suffix.lower() in (".txt", ".csv")):
        try:
            chat = parse_file(f)
        except ExportReadError as e:
            print(f"건너뜀: {e}", file=sys.stderr)
            continue
        if chat.messages:
            chats.append(chat)
        else:
            print(f"건너뜀: {f.name} (메시지 없음)", file=sys.stderr)
    if not chats:
        _fail(f"{d} 에 읽을 수 있는 내보내기 파일(.txt/.csv)이 없습니다.")

    common = args.me or config.load_me() or guess_me_across(chats)
    rows = [room_status(c, common or guess_me(c)) for c in chats]
    rows.sort(key=lambda r: (r.last_time is None, -(r.last_time.timestamp() if r.last_time else 0)))

    print(f"{_pad('방', 18)} {_pad('마지막', 12)} {_pad('마지막 발신', 12)} {_pad('답할 것', 8)} 비고")
    for r in rows:
        who = "?" if r.last_is_mine is None else ("나" if r.last_is_mine else r.last_sender)
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
        print("\n'?' 는 본인 이름을 몰라서예요. `kakao-reply me <이름>` 으로 한 번 저장하세요.")


def cmd_show(args) -> None:
    full = _parse(args.file)
    me = _resolve_me(full, args.me)
    chat = _filtered(full, args.days)
    st = room_status(chat, me)
    print(f"대화방: {st.title}  ({describe_age(st.saved_at)})")
    print(f"참여자: {', '.join(full.participants)}")
    print(f"메시지: {st.message_count}개, 마지막 {_fmt_time(st.last_time)} {st.last_sender}")
    _stale_warning(st)
    if not me:
        print("\n(본인 이름을 알려 주면 답 안 한 메시지를 골라 드려요: kakao-reply me <이름>)")
        return
    if st.last_is_mine:
        print("\n마지막 메시지가 내 메시지예요. 답 기다리는 중.")
        return
    print(f"\n내 마지막 메시지 이후 온 메시지: {len(st.pending)}개")
    for m in st.pending:
        print("  " + m.line().replace("\n", "\n    "))
    if st.pending_attachments:
        print("\n※ 첨부물 원본은 내보내기 파일에 들어 있지 않아 여기서 받을 수 없어요. 카카오톡 앱에서 확인하세요.")


def _print_analysis(result: Analysis) -> None:
    print("■ 요약\n" + result.summary + "\n")
    if result.pending_points:
        print("■ 답해야 할 것")
        for p in result.pending_points:
            print(f"  - {p.sender}: {p.point}")
        print()
    print("■ 답장 초안" + ("" if result.needs_reply else " (답장이 꼭 필요하진 않아 보여요)"))
    for i, s in enumerate(result.suggestions, 1):
        print(f"  {i}. [{s.intent}] {s.text}")
        if s.placeholders:
            print(f"     ↳ 채워 넣을 것: {', '.join(s.placeholders)}")


def _pick_copy(args, result: Analysis) -> int | None:
    n = len(result.suggestions)
    if args.copy is not None:
        if not 1 <= args.copy <= n:
            print(f"--copy 는 1~{n} 사이여야 해서 복사하지 않았어요.", file=sys.stderr)
            return None
        return args.copy
    if not (sys.stdin.isatty() and sys.stdout.isatty()):
        return None
    try:
        answer = input(f"\n복사할 번호 (1-{n}, Enter=건너뛰기): ").strip()
    except EOFError:
        return None
    return int(answer) if answer.isdigit() and 1 <= int(answer) <= n else None


def cmd_suggest(args) -> None:
    full = _parse(args.file)
    me = _require_me(full, _resolve_me(full, args.me))
    chat = _filtered(full, args.days)
    _stale_warning(room_status(chat, me))

    # 가명표는 기간 필터 전 전체 대화로 만들어야 기간 밖 참여자 이름도 가려진다.
    pseudo = None if args.no_pseudonymize else Pseudonymizer(full, me)
    if pseudo:
        send_chat, send_me = pseudo.apply(chat), Pseudonymizer.ME
        ask = pseudo.text(args.ask) if args.ask else None
    else:
        send_chat, send_me, ask = chat, me, args.ask

    if args.dry_run:
        print("# 아래 내용이 Claude API 로 전송됩니다 (실제 전송 안 함)\n")
        print(json.dumps(build_request(send_chat, send_me, args.last, ask), ensure_ascii=False, indent=2))
        return

    import anthropic

    try:
        result = analyze(secrets.make_client(), send_chat, send_me, args.last, ask)
    except anthropic.AuthenticationError:
        _fail("API 키가 잘못됐습니다. `kakao-reply key set` 으로 다시 등록하세요.")
    except anthropic.RateLimitError:
        _fail("요청이 너무 많습니다. 잠시 후 다시 시도하세요.")
    except anthropic.APIConnectionError:
        _fail("Claude API 에 연결하지 못했습니다. 네트워크를 확인하세요.")
    except anthropic.APIStatusError as e:
        _fail(f"API 오류 ({e.status_code})")  # 오류 본문에 대화 내용이 섞일 수 있어 출력하지 않음
    except TypeError as e:
        if "authentication" in str(e).lower() or "api_key" in str(e).lower():
            _fail("API 키가 없습니다. `kakao-reply key set` 으로 등록하세요.")
        raise
    except RuntimeError as e:
        _fail(str(e))

    if pseudo:
        result.summary = pseudo.restore(result.summary)
        for p in result.pending_points:
            p.sender, p.point = pseudo.restore(p.sender), pseudo.restore(p.point)
        for s in result.suggestions:
            s.intent, s.text = pseudo.restore(s.intent), pseudo.restore(s.text)

    _print_analysis(result)

    choice = _pick_copy(args, result)
    if choice and output.copy_to_clipboard(result.suggestions[choice - 1].text):
        print(f"\n{choice}번 초안을 클립보드에 복사했어요. 카카오톡에서 붙여넣고 직접 보내세요.")


def cmd_key(args) -> None:
    if args.action == "set":
        value = getpass.getpass("Anthropic API 키 (입력은 화면에 표시되지 않음): ").strip()
        if not value:
            _fail("입력이 비어 있습니다.")
        try:
            secrets.set_api_key(value)
        except RuntimeError as e:
            _fail(str(e))
        print("키체인에 저장했습니다.")
    else:
        print("삭제했습니다." if secrets.delete_api_key() else "저장된 키가 없습니다.")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(prog="kakao-reply", description="카톡 대화 내보내기 파일로 답장 초안 만들기")
    p.add_argument("-v", "--verbose", action="store_true", help="진행 로그 출력 (이름·내용은 남기지 않음)")
    sub = p.add_subparsers(dest="cmd", required=True)

    mp = sub.add_parser("me", help="본인 이름 저장/확인 (내보낸 파일에 표시된 이름)")
    mp.add_argument("name", nargs="?")
    mp.set_defaults(func=cmd_me)

    ip = sub.add_parser("inbox", help="폴더 안 여러 대화방을 최근순으로 한눈에 보기")
    ip.add_argument("dir", help="내보내기 파일들이 있는 폴더")
    ip.add_argument("--me", help="본인 이름 (기본: 저장된 이름 → 모든 방에 공통인 발신자 → '나')")
    ip.set_defaults(func=cmd_inbox)

    for name, fn, help_ in (("show", cmd_show, "대화 정보와 답 안 한 메시지 보기"),
                            ("suggest", cmd_suggest, "요약 + 답장 초안 생성")):
        sp = sub.add_parser(name, help=help_)
        sp.add_argument("file", help="카카오톡 대화 내보내기 파일 (.txt 또는 .csv)")
        sp.add_argument("--me", help="본인 이름 (기본: `kakao-reply me` 로 저장한 이름)")
        sp.add_argument("--days", type=int, help="최근 N일 대화만 사용")
        sp.set_defaults(func=fn)
        if name == "suggest":
            sp.add_argument("--last", type=int, default=200, help="최근 N개 메시지만 보냄 (기본 200, 0=전체)")
            sp.add_argument("--ask", help='추가 요청, 예: "정중하게 거절하고 싶어"')
            sp.add_argument("--no-pseudonymize", action="store_true",
                            help="이름 가명 처리·번호 가림을 끄고 원문 그대로 전송 (기본은 켜짐)")
            sp.add_argument("--copy", type=int, metavar="N", help="N번 초안을 바로 클립보드에 복사 (기본: 출력 후 물어봄)")
            sp.add_argument("--dry-run", action="store_true", help="전송할 내용만 출력하고 API 는 호출하지 않음")

    kp = sub.add_parser("key", help="API 키를 키체인에 저장/삭제")
    kp.add_argument("action", choices=["set", "delete"])
    kp.set_defaults(func=cmd_key)

    args = p.parse_args(argv)
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(message)s")
    args.func(args)


if __name__ == "__main__":
    main()
