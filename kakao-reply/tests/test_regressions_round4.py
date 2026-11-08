"""네 번째 독립 검증·평가에서 나온 문제들의 회귀 테스트."""

import json
import time
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

from kakao_reply import cli
from kakao_reply.analyzer import build_request
from kakao_reply.parser import Chat, Message, parse_file, parse_text
from kakao_reply.privacy import Pseudonymizer, mask_identifiers, name_forms
from tests.test_analyzer import FakeClient, _resp
from tests.test_hardening import IsolatedConfig, run_cli

DAY = "--------------- 2026년 11월 6일 금요일 ---------------\n"


def _p(names, me=None, title=None, also_me=()):
    return Pseudonymizer(Chat(title=title, messages=[Message(n, ".") for n in names]), me, also_me=also_me)


class AttachmentFalsePositiveTest(unittest.TestCase):
    def test_ordinary_sentences_are_text(self):
        for body in ("일정 언제가 좋아?", "공지사항 확인 부탁해요", "정산은 내가 할게", "이체 확인했어?",
                     "카카오페이로 보낼게", "음성메시지 왜 안 들려", "영상통화 가능?", "파일 보내줘", "사진 보내줘"):
            self.assertIsNone(Message("a", body).attachment, body)

    def test_real_placeholders(self):
        for body in ("사진", "사진 3장", "동영상", "파일: 견적서.pdf", "음성메시지", "샵검색: 강남 맛집",
                     "송금 10,000원", "보이스톡 해요", "삭제된 메시지입니다."):
            self.assertIsNotNone(Message("a", body).attachment, body)


class DecoratedNicknameTest(unittest.TestCase):
    def test_given_name_extracted(self):
        for nick, want in (("🐶민수", "민수"), ("민수♥", "민수"), ("★지은★", "지은"), ("지은~", "지은"),
                           ("민수.", "민수"), ("김민수B", "민수"), ("황보지은", "지은"), ("선우재덕", "재덕"),
                           ("민수💕", "민수"), ("민수94", "민수"), ("민수-마케팅", "민수"), ("민수@마케팅", "민수"),
                           ("민수.kim", "민수")):
            self.assertIn(want, name_forms(nick), nick)

    def test_numbers_titles_teams_not_names(self):
        for nick, bad in (("민수(25)", "25"), ("서연 (디자인)", "디자인"), ("김민수/기획팀", "기획팀"),
                          ("현우 프로", "프로"), ("김현우 PM", "PM"), ("민수_94", "94")):
            self.assertNotIn(bad, name_forms(nick), nick)

    def test_numbers_in_text_untouched(self):
        p = _p(["민수(25)", "서연 (디자인)"])
        self.assertEqual(p.text("25도 넘었어, 가격 25만, 디자인 시안"), "25도 넘었어, 가격 25만, 디자인 시안")


class EndingCoverageTest(unittest.TestCase):
    def test_more_endings_masked(self):
        p = _p(["김민수", "철수"], me="철수")
        for raw in ("민수에 대해", "민수였어", "민수였는데", "민수한텐", "민수에겐", "민수꺼야", "민수지?", "민수래",
                    "민수만큼", "민수밖에", "민수조차", "민수같이", "민수잖아", "민수라서", "민수라면", "민수면",
                    "민수야말로", "민수네서", "민수더러", "민수보고", "민수거든"):
            self.assertNotIn("민수", p.text(raw), raw)

    def test_surname_prefix_masked_when_only_given_known(self):
        p = _p(["민수", "철수"], me="철수")
        self.assertEqual(p.text("김민수 대리님이 찾으셨어"), "상대1 대리님이 찾으셨어")

    def test_common_word_names(self):
        p = _p(["지원", "이수정"])
        self.assertEqual(p.text("정부 지원도 받았어"), "정부 지원도 받았어")
        self.assertEqual(p.text("파일 수정을 부탁해"), "파일 수정을 부탁해")
        self.assertEqual(p.text("지원아 고마워"), "상대1아 고마워")


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


class RestoreDisplayTest(unittest.TestCase):
    def test_restore_strips_titles_and_decoration(self):
        p = _p(["민수 (회사)", "Minsu Kim", "김지은 대리", "나"], me="나")
        self.assertEqual(p.restore("상대1은"), "민수는")
        self.assertEqual(p.restore("상대1이랑"), "민수랑")
        self.assertEqual(p.restore("상대2아"), "Minsu아")
        self.assertEqual(p.restore("상대3가"), "김지은이")
        self.assertEqual(p.restore("[본인]이 할게"), "내가 할게")


class MaskingRound4Test(unittest.TestCase):
    def test_dates_with_times_and_lotto_kept(self):
        for raw in ("2026-11-06 10:30에 보자", "회의 2026-11-06 14:00~16:00", "2026 11 06 10 30", "로또 12 25 33 41 45"):
            self.assertEqual(mask_identifiers(raw), raw)

    def test_more_phone_forms(self):
        for raw in ("031)123-4567", "(02) 123 4567", "010–1234–5678", "010ㅡ1234ㅡ5678"):
            self.assertEqual(mask_identifiers(raw), "[전화번호]", raw)


class ParserRound4Test(IsolatedConfig):
    def test_date_time_shaped_body_line_kept(self):
        for src in (DAY + "[민수] [오후 7:02] 모임 공지\n2026년 11월 7일 오후 3:00, 강남역 2번 출구\n늦지 마세요\n",
                    "2026년 11월 6일 오후 7:02, 민수 : 모임 공지\n2026년 11월 7일 오후 3:00, 강남역 2번 출구\n늦지 마세요\n"):
            chat = parse_text(src)
            self.assertEqual(chat.messages[0].text, "모임 공지\n2026년 11월 7일 오후 3:00, 강남역 2번 출구\n늦지 마세요")

    def test_24_hour_formats(self):
        chat = parse_text("2026. 11. 6. 19:02, 민수 : 안녕\n2026년 11월 6일 19:05, 지은 : ㅎㅇ\n" )
        self.assertEqual([m.time for m in chat.messages], [datetime(2026, 11, 6, 19, 2), datetime(2026, 11, 6, 19, 5)])
        chat = parse_text(DAY + "[민수] [19:02] 안녕\n")
        self.assertEqual(chat.messages[0].time, datetime(2026, 11, 6, 19, 2))

    def test_duplicate_download_filename(self):
        p = Path(self.tmp.name) / "KakaoTalk_Chat_김민수_2026-11-06-22-10-03 (1).csv"
        p.write_text("Date,User,Message\n2026-11-06 19:02:11,민수,안녕\n", encoding="utf-8")
        chat = parse_file(p)
        self.assertEqual(chat.title, "김민수")
        self.assertFalse(chat.saved_at_estimated)

    def test_malformed_csv_skipped_in_inbox(self):
        d = Path(self.tmp.name) / "ex"
        d.mkdir()
        (d / "bad.csv").write_text('Date,User,Message\n2026-11-06 10:00:00,a,"' + "x" * 200000 + "\n", encoding="utf-8")
        (d / "ok.txt").write_text(DAY + "[민수] [오후 1:00] a\n", encoding="utf-8")
        with mock.patch("csv.field_size_limit", lambda *a: 131072):
            code, out, err = run_cli(["inbox", str(d)])
        self.assertEqual(code, 0, err)

    def test_long_multiline_message_is_fast(self):
        src = DAY + "[민수] [오후 7:02] 시작\n" + "줄\n" * 200000
        t = time.time()
        chat = parse_text(src)
        self.assertLess(time.time() - t, 3)
        self.assertEqual(chat.messages[0].text.count("\n"), 200000)


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


if __name__ == "__main__":
    unittest.main()


class Round4FollowupTest(unittest.TestCase):
    def test_single_char_josa_needs_boundary(self):
        p = _p(["김민수", "나"], me="나")
        self.assertEqual(p.restore("상대1과장님"), "김민수과장님")
        self.assertEqual(p.restore("상대1과 같이"), "김민수와 같이")
        self.assertEqual(p.restore("상대1은요?"), "김민수는요?")

    def test_kick_line_and_empty_mobile_message(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 안녕\n민수님을 내보냈습니다.\n[나] [오후 7:05] ㅇㅋ\n")
        self.assertEqual(chat.messages[0].text, "안녕")
        chat = parse_text("2026년 11월 6일 오후 7:02, 민수 :\n2026년 11월 6일 오후 7:03, 민수 : 둘째\n")
        self.assertEqual([m.text for m in chat.messages], ["", "둘째"])
