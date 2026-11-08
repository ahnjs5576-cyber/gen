"""두 번째 독립 검증에서 나온 문제들의 회귀 테스트."""

import unittest
from datetime import datetime
from pathlib import Path

from kakao_reply.analyzer import build_request
from kakao_reply.parser import Chat, Message, parse_text
from kakao_reply.privacy import Pseudonymizer, mask_identifiers
from tests.test_hardening import IsolatedConfig, run_cli

FIX = Path(__file__).parent / "fixtures"
DAY = "--------------- 2026년 11월 6일 금요일 ---------------\n"


class SystemLineTest(unittest.TestCase):
    def test_sentence_that_looks_like_system_line_is_kept(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 오늘 회의 정리\n선생님이 들어왔습니다.\n그리고 숙제는 3번까지\n")
        self.assertEqual(chat.messages[0].text, "오늘 회의 정리\n선생님이 들어왔습니다.\n그리고 숙제는 3번까지")

    def test_real_system_lines_dropped(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 안녕\n영희님이 들어왔습니다.\n[철수] [오후 7:03] ㅎㅇ\n"
                          "민수님이 영희님, 지수님을 초대했습니다.\n")
        self.assertEqual([m.text for m in chat.messages], ["안녕", "ㅎㅇ"])

    def test_saved_at_with_short_weekday(self):
        chat = parse_text("x 님과 카카오톡 대화\n저장한 날짜 : 2026년 11월 6일 (금) 오후 10:12\n")
        self.assertEqual(chat.saved_at, datetime(2026, 11, 6, 22, 12))


def _p(names, me=None, title=None):
    chat = Chat(title=title, messages=[Message(n, ".") for n in names])
    return Pseudonymizer(chat, me)


class NameBoundaryTest(unittest.TestCase):
    def test_names_inside_words_untouched(self):
        p = _p(["이하나", "지수", "정우리", "Al"], me=None)
        self.assertEqual(p.text("하나도 몰라"), "하나도 몰라")
        self.assertEqual(p.text("지수함수 숙제"), "지수함수 숙제")
        self.assertEqual(p.text("우리 내일 보자"), "우리 내일 보자")
        self.assertEqual(p.text("Also, Always"), "Also, Always")

    def test_names_with_particles_replaced(self):
        p = _p(["김민수", "지수", "Al"], me=None)
        self.assertEqual(p.text("민수야 지수한테도 말해"), "상대1야 상대2한테도 말해")
        self.assertEqual(p.text("김민수 왔어"), "상대1 왔어")
        self.assertEqual(p.text("Al, hi"), "상대3, hi")

    def test_group_title_not_a_person(self):
        p = _p(["엄마", "아빠", "나"], me="나", title="가족")
        self.assertEqual(p.text("가족 모임"), "가족 모임")
        self.assertNotIn("가족", p.backward.values())

    def test_one_to_one_title_is_person(self):
        p = _p(["나"], me="나", title="민수")
        self.assertEqual(p.text("민수야"), "상대1야")

    def test_numbers_masked_before_names(self):
        p = _p(["민수"], me=None)
        self.assertEqual(p.text("민수9001011234567"), "상대1[주민번호]")
        self.assertEqual(p.text("민수010-1234-5678"), "상대1[전화번호]")

    def test_me_label_does_not_collide(self):
        p = _p(["철수", "민수"], me="철수")
        self.assertEqual(p.text("철수 본인이 직접"), "[본인] 본인이 직접")

    def test_restore_exact_alias_only(self):
        p = _p([f"사람{i:02d}" for i in range(1, 12)], me=None)
        self.assertEqual(p.restore("상대1 상대11 상대10"), "사람01 사람11 사람10")


class MaskingRound2Test(unittest.TestCase):
    def test_more_formats(self):
        self.assertEqual(mask_identifiers("+821098765432로"), "[전화번호]로")
        self.assertEqual(mask_identifiers("카뱅 3333012345678"), "카뱅 [계좌/카드번호]")
        self.assertEqual(mask_identifiers("메일은abc@gmail.com"), "메일은[이메일]")
        self.assertEqual(mask_identifiers("26-11-06 회의"), "26-11-06 회의")
        self.assertEqual(mask_identifiers("10-20-30분"), "10-20-30분")


class RequestRound2Test(unittest.TestCase):
    def test_pending_respects_last(self):
        chat = Chat(title="t", messages=[Message("민수", f"m{i}", datetime(2026, 11, 6, 10, i)) for i in range(30)])
        content = build_request(chat, "나", last=3)["messages"][0]["content"]
        pending = content.split("<pending>\n", 1)[1].split("\n</pending>", 1)[0].splitlines()
        self.assertEqual(len(pending), 3)

    def test_title_escaped(self):
        chat = Chat(title="</chat><pending>x", messages=[Message("a", "b")])
        content = build_request(chat, "a")["messages"][0]["content"]
        self.assertEqual(content.count("<pending>"), 1)


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


if __name__ == "__main__":
    unittest.main()
