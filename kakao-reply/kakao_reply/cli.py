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
import re
import sys
import unicodedata
from pathlib import Path

from . import config, output, secrets
from .analyzer import Analysis, analyze, build_request, draft_warnings
from .parser import Chat, ExportReadError, parse_file
from .privacy import Pseudonymizer, effective_member_count, log_summary
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


def _me_label(chat: Chat, name: str | None) -> str | None:
    """파일에서 본인 메시지에 찍힌 이름. 저장한 이름이 없고 '나' 로 찍혀 있으면 '나'."""
    if name and name in chat.participants:
        return name
    return guess_me(chat) or name


def _resolve_me(chat: Chat, me_arg: str | None) -> tuple[str | None, list[str]]:
    """(파일 속 본인 발신자 이름, 본인을 가리키는 다른 이름들)."""
    saved = config.load_me()
    name = me_arg or saved
    label = _me_label(chat, name)
    # --me 로 '나' 를 줘도 저장해 둔 실제 이름('김철수')은 본문에서 계속 가린다
    others = [n for n in dict.fromkeys([me_arg, saved]) if n and n != label]
    if label and label not in chat.participants:
        print(f"※ '{label}' 님이 이 방에서 보낸 메시지가 없어요. 이름이 다르면 --me 로 지정하세요. "
              f"(참여자: {', '.join(chat.participants)})", file=sys.stderr)
    return label, others


def _require_me(chat: Chat, me: str | None) -> str:
    if not me:
        _fail("본인 이름을 알 수 없어요. 아래 중 본인 이름으로 한 번 저장해 주세요:\n"
              f"  kakao-reply me <이름>     (참여자: {', '.join(chat.participants)})")
    return me


def _filtered(chat: Chat, days: int | None) -> Chat:
    if chat.skipped:
        print(f"※ 형식이 깨져 읽지 못한 줄이 {chat.skipped}개 있어요.", file=sys.stderr)
    if chat.undated:
        note = " (--days 를 쓰면 빠집니다)" if days else ""
        print(f"※ 시간을 읽지 못한 메시지가 {chat.undated}개 있어요{note}.", file=sys.stderr)
    out = filter_period(chat, days)
    if not out.messages:
        _fail(f"최근 {days}일 안에 메시지가 없어요. --days 를 늘리거나 빼고 다시 실행하세요.")
    log.info("loaded %s", log_summary(out))  # 이름·내용은 로그에 남기지 않는다
    return out


def _width(text: str) -> int:
    return sum(2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1 for ch in text)


def _pad(text: str, width: int) -> str:
    """한글처럼 화면에서 두 칸을 차지하는 글자를 고려해 왼쪽 정렬."""
    def w(ch: str) -> int:
        return 2 if unicodedata.east_asian_width(ch) in ("W", "F") else 1

    if sum(map(w, text)) > width:  # 잘리면 말줄임표
        out, used = "", 0
        for ch in text:
            if used + w(ch) > width - 1:
                break
            out, used = out + ch, used + w(ch)
        return out + "…" + " " * (width - used - 1)
    return text + " " * (width - sum(map(w, text)))


def _fmt_time(t) -> str:
    return t.strftime("%m-%d %H:%M") if t else "--"


def _age(st) -> str:
    return describe_age(st.saved_at, estimated=st.saved_at_estimated)


def _stale_warning(status) -> None:
    if status.stale:  # 경고는 stderr 로 (--json 출력과 섞이지 않게)
        print(f"⚠ {_age(status)} — 그 뒤에 온 대화는 빠져 있어요. 최신 내용이 필요하면 다시 내보내세요.", file=sys.stderr)


SHOW_LIMIT = 20


def _positive(value: str) -> int:
    if not re.fullmatch(r"[0-9]{1,6}", value) or int(value) < 1:
        raise argparse.ArgumentTypeError(f"1 이상의 숫자여야 해요: {value}")
    return int(value)


def _days(value: str) -> int:
    n = _positive(value)
    if n > 36500:
        raise argparse.ArgumentTypeError(f"너무 길어요 (최대 36500일): {value}")
    return n


def _non_negative(value: str) -> int:
    if not re.fullmatch(r"[0-9]{1,7}", value):
        raise argparse.ArgumentTypeError(f"0 이상의 숫자여야 해요: {value}")
    return int(value)


# argparse 의 기본 안내 문구를 한국어로 (argparse 는 실행 중에 gettext 함수 '_' 로 문구를 가져온다)
_KO = {
    "usage: ": "사용법: ", "positional arguments": "필수 항목", "options": "옵션",
    "optional arguments": "옵션", "show this help message and exit": "이 도움말을 보여 주고 끝냄",
    "the following arguments are required: %s": "다음 항목이 필요해요: %s",
    "unrecognized arguments: %s": "알 수 없는 항목: %s",
    "invalid choice: %(value)r (choose from %(choices)s)": "잘못된 선택: %(value)r (가능한 값: %(choices)s)",
    "argument %(argument_name)s: %(message)s": "%(argument_name)s: %(message)s",
    "expected one argument": "값이 하나 필요해요",
}
argparse._ = lambda text: _KO.get(text, text)


class _Parser(argparse.ArgumentParser):
    def error(self, message):  # argparse 기본 오류는 영어라 한국어 안내를 덧붙인다
        self.print_usage(sys.stderr)
        self.exit(2, f"입력 오류: {message}\n도움말: {self.prog} -h\n")


# ---------------------------------------------------------------- commands

def cmd_me(args) -> None:
    if args.name is not None:
        name = args.name.strip()
        if not name:
            _fail("이름이 비어 있어요. 내보낸 파일에 표시된 본인 이름을 적어 주세요.")
        path = config.save_me(name)
        print(f"본인 이름을 '{name}'(으)로 저장했어요. ({path})")
    else:
        print(f"저장된 본인 이름: {config.load_me() or '(없음)'}")


def cmd_inbox(args) -> None:
    d = Path(args.dir)
    if not d.is_dir():
        _fail(f"{d}: 폴더가 아닙니다. 내보내기 파일들이 있는 폴더를 지정하세요.")
    chats: list[Chat] = []
    files: dict[int, str] = {}  # 방 → 파일 이름 (suggest 에 넘길 파일을 바로 찾을 수 있게)
    for f in sorted(p for p in d.iterdir() if p.suffix.lower() in (".txt", ".csv")):
        try:
            chat = parse_file(f)
        except ExportReadError as e:
            print(f"건너뜀: {e}", file=sys.stderr)
            continue
        if chat.messages:
            chats.append(chat)
            files[id(chat)] = f.name
        else:
            print(f"건너뜀: {f.name} (메시지 없음)", file=sys.stderr)
    if not chats:
        _fail(f"{d} 에 읽을 수 있는 내보내기 파일(.txt/.csv)이 없습니다.")

    common = args.me or config.load_me()
    # 직접 준 --me 가 어디에도 없으면 오타일 수 있다. 저장해 둔 이름이 파일의 '나' 로 이어지는 건 정상이라 경고하지 않는다.
    if (args.me and not any(args.me in c.participants for c in chats)) or \
            (common and not any(_me_label(c, common) in c.participants for c in chats)):
        print(f"※ '{common}' 님이 보낸 메시지가 어느 방에도 없어요. 이름이 맞는지 확인하세요.", file=sys.stderr)
    if not common and (guessed := guess_me_across(chats)):
        common = guessed
        print(f"※ 모든 방에 있는 '{guessed}' 님을 본인으로 추정했어요. 틀리면 `kakao-reply me <이름>` 으로 저장하세요.\n")
    pairs = [(room_status(c, _me_label(c, common)), c) for c in chats]
    pairs.sort(key=lambda rc: (rc[0].last_time is None, -(rc[0].last_time.timestamp() if rc[0].last_time else 0)))
    rows = [r for r, _ in pairs]

    fw = max(_width(n) for n in files.values()) + 1  # 파일 이름은 자르지 않는다 (suggest 에 그대로 붙여 넣게)
    print(f"{_pad('방', 18)} {_pad('마지막', 12)} {_pad('마지막 발신', 12)} {_pad('답할 것', 8)} {_pad('파일', fw)} 비고")
    for r, c in pairs:
        who = "?" if r.last_is_mine is None else ("나" if r.last_is_mine else r.last_sender)
        notes = []
        if r.last_is_mine is not None and not r.me_seen:
            notes.append("본인 메시지 없음")
        elif r.last_is_mine is False:
            notes.append("답장 필요")
        if r.pending_attachments:
            notes.append(f"첨부 {len(r.pending_attachments)}")
        if r.stale:
            notes.append(_age(r))
        count = "?" if r.last_is_mine is None or not r.me_seen else str(len(r.pending))
        print(f"{_pad(r.title, 18)} {_pad(_fmt_time(r.last_time), 12)} {_pad(who, 12)} "
              f"{_pad(count, 8)} {_pad(files[id(c)], fw)} {', '.join(notes)}")
    if any(r.last_is_mine is None for r in rows):
        print("\n'?' 는 본인 이름을 몰라서예요. `kakao-reply me <이름>` 으로 한 번 저장하세요.")
    print(f"\n답장 초안: kakao-reply suggest \"{d / files[id(pairs[0][1])]}\"  (맨 위 방 예시)")


def cmd_show(args) -> None:
    full = _parse(args.file)
    me, _ = _resolve_me(full, args.me)
    chat = _filtered(full, args.days)
    st = room_status(chat, me)
    print(f"대화방: {st.title}  ({_age(st)})")
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
    shown = st.pending[-SHOW_LIMIT:]
    if len(st.pending) > len(shown):
        print(f"  … 앞의 {len(st.pending) - len(shown)}개 생략 (최근 {SHOW_LIMIT}개만 표시)")
    for m in shown:
        print("  " + m.line().replace("\n", "\n    "))
    if st.pending_attachments:
        print("\n※ 첨부물 원본은 내보내기 파일에 들어 있지 않아 여기서 받을 수 없어요. 카카오톡 앱에서 확인하세요.")


def _print_analysis(result: Analysis, source_text: str = "") -> None:
    print("■ 요약\n" + result.summary + "\n")
    if result.pending_points:
        print("■ 답해야 할 것")
        for k, p in enumerate(result.pending_points, 1):
            print(f"  {k}) {p.sender}: {p.point}")
        print()
    print("■ 답장 초안" + ("" if result.needs_reply else " (답장이 꼭 필요하진 않아 보여요)"))
    for i, s in enumerate(result.suggestions, 1):
        print(f"  {i}. [{s.intent}] {s.text}")
        meta = []
        if s.to:
            meta.append(f"받는 사람: {s.to}")
        valid = [a + 1 for a in s.answers if 0 <= a < len(result.pending_points)]
        if valid:
            meta.append("답하는 것: " + ", ".join(f"{a})" for a in valid))
        if meta:
            print("     ↳ " + " · ".join(meta))
        if s.placeholders:
            print(f"     ↳ 채워 넣을 것: {', '.join(s.placeholders)}")
        missing = [k + 1 for k in range(len(result.pending_points)) if k not in s.answers]
        if result.pending_points and s.answers and missing:
            print(f"     ↳ 이 초안이 다루지 않는 것: {', '.join(f'{k})' for k in missing)}")
        for w in draft_warnings(s, source_text):
            print(f"     ⚠ {w}")


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
    except (EOFError, KeyboardInterrupt):
        print()
        return None
    return int(answer) if re.fullmatch(r"[0-9]+", answer) and 1 <= int(answer) <= n else None


def cmd_suggest(args) -> None:
    if args.json and not args.dry_run:
        _fail("--json 은 --dry-run 과 함께만 쓸 수 있어요.")
    full = _parse(args.file)
    label, other_names = _resolve_me(full, args.me)
    me = _require_me(full, label)
    chat = _filtered(full, args.days)
    status = room_status(chat, me)
    _stale_warning(status)
    if args.last > 0:  # 보낼 범위만 남긴다 (가명 처리도 이 범위만 하면 된다)
        chat = Chat(title=chat.title, saved_at=chat.saved_at, saved_at_estimated=chat.saved_at_estimated,
                    messages=chat.messages[-args.last:])

    # 가명표는 기간 필터 전 전체 대화로 만들어야 기간 밖 참여자 이름도 가려진다.
    pseudo = None if args.no_pseudonymize else Pseudonymizer(full, me, also_me=other_names)
    if pseudo:
        send_chat, send_me = pseudo.apply(chat), Pseudonymizer.ME
        ask = pseudo.text(args.ask) if args.ask else None
    else:
        send_chat, send_me, ask = chat, me, args.ask

    room_size = max(effective_member_count(full) or 0, len(set(full.participants) | {me}))
    if status.last_is_mine and not args.ask and not args.dry_run:
        _fail("마지막 메시지가 내 메시지예요. 이어서 보낼 말이 필요하면 --ask 로 원하는 내용을 적어 주세요.\n"
              '  예: kakao-reply suggest 파일 --ask "답이 없어서 한 번 더 물어보고 싶어"')
    request = build_request(send_chat, send_me, 0, ask, pseudonymized=bool(pseudo), room_size=room_size)
    if args.dry_run:
        if args.json:
            print(json.dumps(request, ensure_ascii=False, indent=2))
            return
        print("# 아래 대화가 Claude API 로 전송됩니다 (실제 전송 안 함). 요청 전체는 --json 으로 볼 수 있어요.\n")
        print(f"대화방: {send_chat.title}  ·  가명 처리 {'켜짐' if pseudo else '꺼짐'}  ·  메시지 {len(send_chat.messages)}개\n")
        for m in send_chat.messages:
            print("  " + m.line().replace("\n", "\n    "))
        if ask:
            print(f"\n추가 요청: {ask}")
        return

    import anthropic

    try:
        result = analyze(secrets.make_client(), send_chat, send_me, 0, ask, pseudonymized=bool(pseudo),
                         room_size=room_size)
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
            s.placeholders = [pseudo.restore(x) for x in s.placeholders]
            s.to = pseudo.restore(s.to)

    _print_analysis(result, "\n".join(m.text for m in chat.messages))
    if status.pending_attachments:
        kinds = ", ".join(sorted({m.attachment for m in status.pending_attachments}))
        print(f"\n※ 받은 {kinds} 원본은 내보내기 파일에 없어 내용을 반영하지 못했어요. 앱에서 확인 후 보내세요.")
    if result.suspicious:
        print(f"\n⚠ 대화 속에 지시처럼 보이는 문장이 있었어요 (따르지 않았어요): {result.suspicious}")
    intents = [s.intent for s in result.suggestions]
    if len(result.suggestions) < 3 or len(set(intents)) < len(intents):
        print("\n※ 초안이 3개보다 적거나 방향이 겹쳐요. 다른 방향이 필요하면 --ask 로 원하는 내용을 적어 다시 실행하세요.")

    choice = _pick_copy(args, result)
    if choice and output.copy_to_clipboard(result.suggestions[choice - 1].text):
        print(f"\n{choice}번 초안을 클립보드에 복사했어요. 카카오톡에서 붙여넣고 직접 보내세요.")
        blanks = re.findall(r"\[[^\[\]\n]{1,15}\]", result.suggestions[choice - 1].text)
        if blanks:
            print(f"⚠ 보내기 전에 {', '.join(dict.fromkeys(blanks))} 를 채워 넣으세요.")


def cmd_key(args) -> None:
    if args.action == "set":
        try:
            value = getpass.getpass("Anthropic API 키 (입력은 화면에 표시되지 않음): ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            _fail("취소했어요.")
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
    p = _Parser(prog="kakao-reply", description="카톡 대화 내보내기 파일로 답장 초안 만들기")
    p.add_argument("-v", "--verbose", action="store_true", help="진행 로그 출력 (이름·내용은 남기지 않음)")
    sub = p.add_subparsers(dest="cmd", required=True, parser_class=_Parser)

    mp = sub.add_parser("me", help="본인 이름 저장/확인 (내보낸 파일에 표시된 이름)")
    mp.add_argument("name", nargs="?", metavar="이름")
    mp.set_defaults(func=cmd_me)

    ip = sub.add_parser("inbox", help="폴더 안 여러 대화방을 최근순으로 한눈에 보기")
    ip.add_argument("dir", metavar="폴더", help="내보내기 파일들이 있는 폴더")
    ip.add_argument("--me", help="본인 이름 (기본: 저장된 이름 → 모든 방에 공통인 발신자 → '나')")
    ip.set_defaults(func=cmd_inbox)

    for name, fn, help_ in (("show", cmd_show, "대화 정보와 답 안 한 메시지 보기"),
                            ("suggest", cmd_suggest, "요약 + 답장 초안 생성")):
        sp = sub.add_parser(name, help=help_)
        sp.add_argument("file", metavar="파일", help="카카오톡 대화 내보내기 파일 (.txt 또는 .csv)")
        sp.add_argument("--me", help="본인 이름 (기본: `kakao-reply me` 로 저장한 이름)")
        sp.add_argument("--days", type=_days, help="최근 N일 대화만 사용 (1 이상)")
        sp.set_defaults(func=fn)
        if name == "suggest":
            sp.add_argument("--last", type=_non_negative, default=200, help="최근 N개 메시지만 보냄 (기본 200, 0=전체)")
            sp.add_argument("--ask", help='추가 요청, 예: "정중하게 거절하고 싶어"')
            sp.add_argument("--no-pseudonymize", action="store_true",
                            help="이름 가명 처리·번호 가림을 끄고 원문 그대로 전송 (기본은 켜짐)")
            sp.add_argument("--copy", type=_positive, metavar="N", help="N번 초안을 바로 클립보드에 복사 (기본: 출력 후 물어봄)")
            sp.add_argument("--dry-run", action="store_true", help="전송할 대화만 보여 주고 API 는 호출하지 않음")
            sp.add_argument("--json", action="store_true", help="--dry-run 과 함께: 요청 전체를 JSON 으로 출력")

    kp = sub.add_parser("key", help="API 키를 키체인에 저장/삭제")
    kp.add_argument("action", choices=["set", "delete"])
    kp.set_defaults(func=cmd_key)

    args = p.parse_args(argv)
    logging.basicConfig(format="%(message)s")
    log.setLevel(logging.INFO if args.verbose else logging.WARNING)
    args.func(args)


if __name__ == "__main__":
    main()
