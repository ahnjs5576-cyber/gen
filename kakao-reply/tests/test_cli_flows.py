"""명령줄 전체 흐름: inbox/show/suggest/me/key, 오류 안내, 복사, 본인 이름 처리."""

import unittest
from datetime import datetime
from pathlib import Path
from kakao_reply.transcript import pending_messages
from kakao_reply.parser import parse_file
from kakao_reply.privacy import Pseudonymizer, log_summary, mask_identifiers
from kakao_reply.transcript import filter_period, room_status
import json
from types import SimpleNamespace
from kakao_reply.analyzer import RefusalError, analyze, build_request
import contextlib
import io
from unittest import mock
from kakao_reply import cli
import os
import tempfile
from kakao_reply.analyzer import BadResponseError, build_request, parse_analysis
from kakao_reply.parser import Chat, Message, parse_file, parse_text
from kakao_reply.privacy import Pseudonymizer, mask_identifiers
from kakao_reply.transcript import filter_period, guess_me_across
from kakao_reply.analyzer import build_request
from kakao_reply.parser import Chat, Message, parse_text
from kakao_reply.analyzer import build_request, draft_warnings, parse_analysis
from kakao_reply.privacy import Pseudonymizer, attach_josa, mask_identifiers
import time
from kakao_reply.privacy import Pseudonymizer, mask_identifiers, name_forms
import logging
from kakao_reply.analyzer import Suggestion, build_request, draft_warnings
from kakao_reply.transcript import filter_period

from tests.helpers import DAY, FIX, NOW, FakeClient, IsolatedConfig, _p, _resp, run_cli


class SuggestPseudonymizeTest(IsolatedConfig):
    def test_names_hidden_in_request_and_restored_in_output(self):
        payload = {
            "summary": "상대2가 3장을 내일 오전까지 해도 되는지 묻는 중",
            "needs_reply": True,
            "pending_points": [{"from": "상대2", "point": "상대2의 마감 연장 요청"}],
            "suggestions": [{"intent": "수락", "text": "상대2님 네 내일 오전까지 괜찮아요", "placeholders": []}],
        }
        fake = FakeClient(_resp(payload))
        with mock.patch.object(cli.secrets, "make_client", return_value=fake), \
                mock.patch.object(cli.output, "copy_to_clipboard", return_value=True) as copy:
            code, out, err = run_cli(["suggest", str(FIX / "android_export.txt"), "--copy", "1"])

        sent = json.dumps(fake.calls[0]["messages"], ensure_ascii=False)
        self.assertNotIn("현우", sent)
        self.assertNotIn("지은", sent)
        self.assertIn("현우님 네 내일 오전까지 괜찮아요", out)
        copy.assert_called_once_with("현우님 네 내일 오전까지 괜찮아요")


class CliHardeningTest(IsolatedConfig):
    def test_missing_file_and_folder(self):
        code, _, _ = run_cli(["show", "/nope/x.txt"])
        self.assertIn("파일이 없습니다", str(code))
        code, _, _ = run_cli(["inbox", "/nope"])
        self.assertIn("폴더가 아닙니다", str(code))

    def test_inbox_skips_bad_file(self):
        d = Path(self.tmp.name) / "ex"
        d.mkdir()
        (d / "ok.txt").write_text((FIX / "pc_export.txt").read_text(encoding="utf-8"), encoding="utf-8")
        (d / "bad.txt").write_bytes(b"\xff\x00\xfe\x81\x82garbage")
        code, out, err = run_cli(["inbox", str(d), "--me", "나"])
        self.assertEqual(code, 0)
        self.assertIn("민수", out)

    def test_days_leaving_nothing(self):
        p = self.write("old.txt", "x 님과 카카오톡 대화\n저장한 날짜 : 2026-11-06 22:10:03\n"
                                  "2026년 11월 1일 오후 1:00, 민수 : 옛날\n")
        code, _, _ = run_cli(["show", str(p), "--me", "나", "--days", "1"])
        self.assertIn("메시지가 없어요", str(code))

    def test_suggest_requires_me(self):
        code, _, _ = run_cli(["suggest", str(FIX / "ios_export.txt"), "--dry-run"])
        self.assertIn("kakao-reply me", str(code))

    def test_saved_me_is_used(self):
        run_cli(["me", "나"])
        code, out, _ = run_cli(["show", str(FIX / "ios_export.txt")])
        self.assertEqual(code, 0)
        self.assertIn("답 안 한", out.replace("내 마지막 메시지 이후 온 메시지", "답 안 한"))

    def test_ask_is_pseudonymized_by_default(self):
        code, out, _ = run_cli(["suggest", str(FIX / "pc_export.txt"), "--dry-run",
                                "--ask", "민수한테 010-9999-8888로 알려줘"])
        self.assertEqual(code, 0)
        self.assertNotIn("민수", out)
        self.assertNotIn("9999", out)

    def test_bad_model_output_is_friendly(self):
        fake = FakeClient(_resp({"summary": "x"}))
        with mock.patch.object(cli.secrets, "make_client", return_value=fake):
            code, _, _ = run_cli(["suggest", str(FIX / "pc_export.txt")])
        self.assertIn("해석하지 못했습니다", str(code))

    def test_missing_api_key_is_friendly(self):
        def boom(*a, **k):
            raise TypeError('"Could not resolve authentication method. Expected the api_key ..."')
        fake = FakeClient(None)
        fake.beta.messages.create = boom
        with mock.patch.object(cli.secrets, "make_client", return_value=fake):
            code, _, _ = run_cli(["suggest", str(FIX / "pc_export.txt")])
        self.assertIn("API 키가 없습니다", str(code))


class ClipboardTest(unittest.TestCase):
    def test_falls_through_failing_tool(self):
        import subprocess

        from kakao_reply import output

        calls = []

        def fake_run(cmd, **kw):
            calls.append(cmd[0])
            if cmd[0] == "wl-copy":
                raise subprocess.CalledProcessError(1, cmd)

        with mock.patch.object(output.shutil, "which", side_effect=lambda c: c in ("wl-copy", "xclip")), \
                mock.patch.object(output.subprocess, "run", side_effect=fake_run):
            self.assertTrue(output.copy_to_clipboard("hi"))
        self.assertEqual(calls, ["wl-copy", "xclip"])


class CliRound2Test(IsolatedConfig):
    def test_empty_me_rejected(self):
        code, _, _ = run_cli(["me", "   "])
        self.assertIn("비어 있어요", str(code))

    def test_inbox_announces_guess(self):
        d = Path(self.tmp.name) / "ex"
        d.mkdir()
        (d / "a.txt").write_text(DAY + "[민수] [오후 1:00] a\n[철수] [오후 1:01] b\n", encoding="utf-8")
        (d / "b.txt").write_text(DAY + "[영희] [오후 1:00] a\n[철수] [오후 1:01] b\n", encoding="utf-8")
        code, out, _ = run_cli(["inbox", str(d)])
        self.assertIn("'철수' 님을 본인으로 추정", out)

    def test_inbox_warns_unknown_me(self):
        code, _, err = run_cli(["inbox", str(FIX), "--me", "철슈"])
        self.assertIn("어느 방에도 없어요", err)

    def test_broken_utf16_skipped(self):
        d = Path(self.tmp.name) / "ex2"
        d.mkdir()
        (d / "bad.txt").write_bytes(b"\xff\xfe\x00\xd8a\x00")
        (d / "ok.txt").write_text(DAY + "[민수] [오후 1:00] a\n", encoding="utf-8")
        code, out, err = run_cli(["inbox", str(d)])
        self.assertEqual(code, 0)
        self.assertIn("건너뜀", err)


class CliRound3Test(IsolatedConfig):
    def test_show_caps_pending(self):
        body = DAY + "".join(f"[민수] [오후 7:{i:02d}] m{i}\n" for i in range(40))
        p = Path(self.tmp.name) / "long.txt"
        p.write_text(body, encoding="utf-8")
        code, out, _ = run_cli(["show", str(p), "--me", "나"])
        self.assertIn("20개 생략", out)

    def test_inbox_marks_room_without_me(self):
        d = Path(self.tmp.name) / "ex"
        d.mkdir()
        (d / "a.txt").write_text(DAY + "[민수] [오후 1:00] a\n[철수] [오후 1:01] b\n", encoding="utf-8")
        (d / "b.txt").write_text(DAY + "[엄마] [오후 1:00] 밥\n", encoding="utf-8")
        code, out, _ = run_cli(["inbox", str(d), "--me", "철수"])
        line = [l for l in out.splitlines() if "엄마" in l][0]
        self.assertIn("본인 메시지 없음", line)
        self.assertNotIn("본인 메시지 없음", [l for l in out.splitlines() if l.startswith("a ")][0])

    def test_korean_argparse_error(self):
        code, _, err = run_cli(["suggest"])
        self.assertIn("입력 오류", err)


class IdentityTest(IsolatedConfig):
    def test_saved_name_differs_from_file_label(self):
        p = Path(self.tmp.name) / "r.txt"
        p.write_text(DAY + "[민수] [오후 7:02] 철수야 내일 봐\n[나] [오후 7:03] 응\n[민수] [오후 7:04] 철수 너 올거지?\n",
                     encoding="utf-8")
        run_cli(["me", "철수"])
        code, out, err = run_cli(["suggest", str(p), "--dry-run", "--json"])
        self.assertEqual(code, 0, err)
        self.assertNotIn("철수", out)
        content = json.loads(out[out.index("{"):])["messages"][0]["content"]
        pending = content.split("<pending>\n", 1)[1].split("\n</pending>", 1)[0].splitlines()
        self.assertEqual(len(pending), 1)  # '나' 를 본인으로 인식

    def test_one_to_one_title_contact_name(self):
        p = _p(["민수", "나"], me="나", title="김민수")
        self.assertNotIn("민수", p.text("김민수 대리님께"))


class CliRound4Test(IsolatedConfig):
    def test_negative_args_rejected(self):
        for argv in (["suggest", "x.txt", "--last", "-5"], ["show", "x.txt", "--days", "-3"],
                     ["suggest", "x.txt", "--copy", "0"]):
            code, _, err = run_cli(argv)
            self.assertEqual(code, 2, argv)
            self.assertIn("입력 오류", err)

    def test_prompt_without_pseudonymization_has_no_alias_rule(self):
        chat = Chat(title="t", messages=[Message("민수", "안녕")])
        on = build_request(chat, "나")["system"]
        off = build_request(chat, "나", pseudonymized=False)["system"]
        self.assertIn("상대1", on)
        self.assertNotIn("상대1", off)

    def test_placeholder_warning_on_copy(self):
        payload = {"summary": "s", "needs_reply": True, "pending_points": [],
                   "suggestions": [{"intent": "a", "text": "장소는 [장소] 어때?", "placeholders": ["장소"]}]}
        fake = FakeClient(_resp(payload))
        fixture = Path(__file__).parent / "fixtures" / "pc_export.txt"
        with mock.patch.object(cli.secrets, "make_client", return_value=fake), \
                mock.patch.object(cli.output, "copy_to_clipboard", return_value=True):
            code, out, _ = run_cli(["suggest", str(fixture), "--copy", "1"])
        self.assertIn("[장소] 를 채워 넣으세요", out)

    def test_inbox_title_ellipsis(self):
        self.assertTrue(cli._pad("아주아주아주아주긴방이름입니다", 18).rstrip().endswith("…"))


class IdentityRound5Test(IsolatedConfig):
    def test_saved_name_kept_when_me_flag_given(self):
        p = Path(self.tmp.name) / "r.txt"
        p.write_text(DAY + "[민수] [오후 7:02] 철수야 내일 봐\n[나] [오후 7:03] 응\n", encoding="utf-8")
        run_cli(["me", "김철수"])
        code, out, err = run_cli(["suggest", str(p), "--dry-run", "--me", "나"])
        self.assertEqual(code, 0, err)
        self.assertNotIn("철수", out)


class CliRound5Test(IsolatedConfig):
    def _folder(self):
        d = Path(self.tmp.name) / "ex"
        d.mkdir()
        (d / "old.txt").write_text(DAY + "[민수] [오전 9:00] 옛날\n", encoding="utf-8")
        (d / "new.txt").write_text(DAY + "[지은] [오후 9:00] 최신\n", encoding="utf-8")
        (d / "mid.txt").write_text(DAY + "[현우] [오후 1:00] 중간\n", encoding="utf-8")
        return d

    def test_inbox_sorted_by_recency_and_unknown_pending(self):
        code, out, _ = run_cli(["inbox", str(self._folder())])
        rows = [l.split()[0] for l in out.splitlines()[1:4]]
        self.assertEqual(rows, ["new", "mid", "old"])
        self.assertIn("?", out.splitlines()[1].split()[4])

    def test_verbose_log_has_no_names_or_content(self):
        buf = io.StringIO()
        handler = logging.StreamHandler(buf)
        logging.getLogger("kakao_reply").addHandler(handler)
        try:
            run_cli(["-v", "show", str(Path(__file__).parent / "fixtures" / "pc_export.txt"), "--me", "나"])
        finally:
            logging.getLogger("kakao_reply").removeHandler(handler)
        log = buf.getvalue()
        self.assertIn("messages=", log)
        for secret in ("민수", "강남역", "토요일"):
            self.assertNotIn(secret, log)

    def test_group_restore_through_cli(self):
        payload = {"summary": "상대1이 일정을, 상대2가 장소를 물었다", "needs_reply": True,
                   "pending_points": [{"from": "상대1", "point": "일정"}, {"from": "상대2", "point": "장소"}],
                   "suggestions": [{"intent": "수락", "to": "모두", "answers": [0, 1],
                                    "text": "상대1아 토요일 좋아! 상대2는 [장소] 어때?", "placeholders": ["장소"]},
                                   {"intent": "질문", "to": "상대2", "answers": [1], "text": "상대2야 어디가 좋아?",
                                    "placeholders": []}]}
        fake = FakeClient(_resp(payload))
        p = Path(self.tmp.name) / "g.txt"
        p.write_text(DAY + "[김민수] [오후 7:00] 토요일 어때?\n[지은] [오후 7:01] 어디서 볼까?\n"
                           "[나] [오후 6:00] 다들 안녕\n", encoding="utf-8")
        with mock.patch.object(cli.secrets, "make_client", return_value=fake), \
                mock.patch.object(cli.output, "copy_to_clipboard", return_value=True) as copy:
            code, out, _ = run_cli(["suggest", str(p), "--me", "나", "--copy", "1"])
        self.assertEqual(code, 0)
        self.assertIn("김민수가 일정을, 지은이 장소를", out)
        self.assertIn("1) 김민수: 일정", out)
        self.assertIn("받는 사람: 모두", out)
        self.assertIn("받는 사람: 지은", out)
        self.assertIn("이 초안이 다루지 않는 것: 1)", out)
        copy.assert_called_once_with("민수야 토요일 좋아! 지은은 [장소] 어때?")
        sent = json.dumps(fake.calls[0]["messages"], ensure_ascii=False)
        self.assertNotIn("민수", sent)
        self.assertNotIn("지은", sent)

    def test_korean_argparse(self):
        code, _, err = run_cli(["suggest"])
        self.assertIn("다음 항목이 필요해요", err)


class SavedIdentityTest(IsolatedConfig):
    def test_saved_name_masked_in_room_where_user_never_spoke(self):
        p = Path(self.tmp.name) / "new.txt"
        p.write_text(DAY + "[민수] [오후 7:02] 한동훈 과장님 TF 합류하셨어요\n[지은] [오후 7:03] 동훈님 인사 부탁해요\n",
                     encoding="utf-8")
        run_cli(["me", "한동훈"])
        code, out, err = run_cli(["suggest", str(p), "--dry-run", "--json"])
        self.assertEqual(code, 0, err)
        self.assertNotIn("동훈", out)
        json.loads(out)


class CliRound6Test(IsolatedConfig):
    def test_json_requires_dry_run(self):
        code, _, _ = run_cli(["suggest", str(FIX / "pc_export.txt"), "--json"])
        self.assertIn("--dry-run", str(code))

    def test_last_message_mine_needs_ask(self):
        p = Path(self.tmp.name) / "m.txt"
        p.write_text(DAY + "[민수] [오후 7:02] 안녕\n[나] [오후 7:03] 응 안녕\n", encoding="utf-8")
        fake = FakeClient(_resp({}))
        with mock.patch.object(cli.secrets, "make_client", return_value=fake):
            code, _, _ = run_cli(["suggest", str(p), "--me", "나"])
        self.assertIn("--ask", str(code))
        self.assertEqual(fake.calls, [])

    def test_inbox_shows_file_names(self):
        code, out, _ = run_cli(["inbox", str(FIX), "--me", "나"])
        self.assertIn("pc_export.txt", out)

    def test_key_set_cancel(self):
        with mock.patch.object(cli.getpass, "getpass", side_effect=EOFError):
            code, _, _ = run_cli(["key", "set"])
        self.assertIn("취소", str(code))


class CliRound7Test(IsolatedConfig):
    def test_inbox_full_file_names_and_unknown_pending(self):
        d = Path(self.tmp.name) / "ex"
        d.mkdir()
        long_name = "KakaoTalk_Chat_김민수_2026-11-06-22-10-03.csv"
        (d / long_name).write_text("Date,User,Message\n2026-11-06 19:02:11,민수,안녕\n", encoding="utf-8")
        (d / "b.txt").write_text(DAY + "[지은] [오후 1:00] a\n[나] [오후 1:01] b\n", encoding="utf-8")
        code, out, _ = run_cli(["inbox", str(d), "--me", "나"])
        self.assertIn(long_name, out)
        row = [l for l in out.splitlines() if l.startswith("김민수")][0]
        self.assertIn("본인 메시지 없음", row)
        self.assertEqual(row.split()[4], "?")

    def test_saved_name_falling_back_to_na_has_no_warning(self):
        run_cli(["me", "한동훈"])
        code, out, err = run_cli(["inbox", str(FIX)])
        self.assertNotIn("어느 방에도 없어요", err)

    def test_huge_days_rejected(self):
        for v in ("1000000", "99999999999"):
            code, _, err = run_cli(["show", str(FIX / "pc_export.txt"), "--days", v])
            self.assertEqual(code, 2)

    def test_suspicious_and_few_drafts_reported(self):
        payload = {"summary": "s", "needs_reply": True, "pending_points": [],
                   "suggestions": [{"intent": "수락", "to": "", "answers": [], "text": "좋아", "placeholders": []}],
                   "suspicious": "이전 지시 무시하라는 문장"}
        fake = FakeClient(_resp(payload))
        with mock.patch.object(cli.secrets, "make_client", return_value=fake):
            code, out, _ = run_cli(["suggest", str(FIX / "pc_export.txt")])
        self.assertIn("지시처럼 보이는 문장", out)
        self.assertIn("3개보다 적거나", out)


if __name__ == "__main__":
    unittest.main()
