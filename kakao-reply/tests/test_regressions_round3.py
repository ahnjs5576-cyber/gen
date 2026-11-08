"""세 번째 독립 검증·평가에서 나온 문제들의 회귀 테스트."""

import unittest
from datetime import datetime
from pathlib import Path

from kakao_reply.analyzer import build_request, draft_warnings, parse_analysis
from kakao_reply.parser import Chat, Message, parse_file, parse_text
from kakao_reply.privacy import Pseudonymizer, attach_josa, mask_identifiers
from tests.test_hardening import IsolatedConfig, run_cli

DAY = "--------------- 2026년 11월 6일 금요일 ---------------\n"


def _p(names, me=None, title=None):
    return Pseudonymizer(Chat(title=title, messages=[Message(n, ".") for n in names]), me)


class GivenNameCoverageTest(unittest.TestCase):
    """성을 뺀 이름이 흔한 조사와 함께 나와도 가려져야 한다."""

    def test_common_particles(self):
        p = _p(["김민수", "이영희", "철수"], me="철수")
        for raw in ("민수가 정해줘", "민수 말대로 할게", "민수는 10시 괜찮아?", "민수랑 나는 OK", "민수도", "민수를",
                    "민수의", "민수네 집", "민수한테서", "민수까지", "민수라고", "민수인데", "민수로", "민수님한테도",
                    "민수씨한테는", "민수형"):
            self.assertNotIn("민수", p.text(raw), raw)

    def test_still_no_word_damage(self):
        p = _p(["이하나", "지수", "정우리", "Al"])
        for raw in ("하나도 몰라", "하나님 감사", "지수함수", "우리 내일 보자", "우리한테 와", "Also, Always"):
            self.assertEqual(p.text(raw), raw, raw)

    def test_common_word_name_only_in_address_form(self):
        p = _p(["하나"])
        self.assertEqual(p.text("하나도 몰라"), "하나도 몰라")
        self.assertEqual(p.text("하나야 어디야"), "상대1야 어디야")

    def test_nickname_with_title_or_team(self):
        p = _p(["김민수 대리", "지은/개발팀", "Minsu Kim"])
        self.assertNotIn("민수", p.text("민수 대리 폰 / 민수야 / 김민수님"))
        self.assertNotIn("지은", p.text("지은이 오늘 와?"))
        self.assertNotIn("Minsu", p.text("minsu said hi, MINSU!"))

    def test_full_name_beats_other_persons_given_name(self):
        p = _p(["김민수", "민수"])
        self.assertEqual(p.text("민수야"), "상대2야")  # 정확히 '민수' 인 참여자


class RestoreJosaTest(unittest.TestCase):
    def test_attach_josa(self):
        self.assertEqual(attach_josa("민수", "이"), "민수가")
        self.assertEqual(attach_josa("민수", "은"), "민수는")
        self.assertEqual(attach_josa("민수", "아"), "민수야")
        self.assertEqual(attach_josa("민수", "과"), "민수와")
        self.assertEqual(attach_josa("지은", "가"), "지은이")
        self.assertEqual(attach_josa("지은", "야"), "지은아")
        self.assertEqual(attach_josa("지은", "로"), "지은으로")
        self.assertEqual(attach_josa("하늘", "으로"), "하늘로")

    def test_restore_fixes_particles_and_uses_given_name(self):
        p = _p(["김민수", "지은", "나"], me="나")
        self.assertEqual(p.restore("상대1아 좋아!"), "민수야 좋아!")
        self.assertEqual(p.restore("상대1은 언제가 좋아?"), "김민수는 언제가 좋아?")
        self.assertEqual(p.restore("상대2가 온대"), "지은이 온대")
        self.assertEqual(p.restore("[본인]도 갈게"), "나도 갈게")


class MaskingRound3Test(unittest.TestCase):
    def test_more_numbers(self):
        for raw in ("900101-5234567", "900101 6234567", "1002 123 456789", "1234 5678 9012 3456", "010 - 1234 - 5678"):
            self.assertNotRegex(mask_identifiers(raw), r"\d{4}", raw)

    def test_amounts_not_masked(self):
        self.assertEqual(mask_identifiers("1000000000원"), "1000000000원")


class ParserRound3Test(IsolatedConfig):
    def test_system_line_then_blank_then_next(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 안녕\n영희님이 나갔습니다.\n\n[철수] [오후 7:03] ㅎㅇ\n")
        self.assertEqual([m.text for m in chat.messages], ["안녕", "ㅎㅇ"])

    def test_system_line_nickname_with_space(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 안녕\n홍 길동님이 들어왔습니다.\n")
        self.assertEqual(chat.messages[0].text, "안녕")

    def test_mobile_date_shaped_body_line(self):
        chat = parse_text("2026년 11월 6일 오후 1:00, 민수 : 일정\n2026년 11월 7일 토요일\n이날 어때\n"
                          "2026년 11월 6일 오후 1:05, 나 : 좋아\n")
        self.assertEqual(chat.messages[0].text, "일정\n2026년 11월 7일 토요일\n이날 어때")

    def test_mac_csv_filename(self):
        p = Path(self.tmp.name) / "KakaoTalk_Chat_민수_2026-11-06-22-10-03.csv"
        p.write_text("Date,User,Message\n2026-11-06 19:02:11,민수,안녕\n", encoding="utf-8")
        chat = parse_file(p)
        self.assertEqual(chat.title, "민수")
        self.assertEqual(chat.saved_at, datetime(2026, 11, 6, 22, 10))
        self.assertFalse(chat.saved_at_estimated)

    def test_estimated_saved_at_and_member_count(self):
        p = Path(self.tmp.name) / "가족 4.csv"
        p.write_text("Date,User,Message\n2026-11-06 19:02:11,엄마,밥\n", encoding="utf-8")
        chat = parse_file(p)
        self.assertEqual(chat.title, "가족")
        self.assertTrue(chat.saved_at_estimated)

    def test_more_attachment_kinds(self):
        for body, kind in (("샵검색: 강남 맛집", "샵검색"), ("지도", "위치"), ("연락처: 홍길동", "연락처"),
                           ("송금 10,000원", "송금"), ("보이스톡 해요", "통화")):
            self.assertEqual(Message("a", body).attachment, kind, body)


class RequestRound3Test(unittest.TestCase):
    def test_context_block(self):
        chat = Chat(title="t", saved_at=datetime(2026, 11, 6, 22, 0),
                    messages=[Message("a", "b", datetime(2026, 11, 6, 21, 0))])
        content = build_request(chat, "a", now=datetime(2026, 11, 7, 9, 0))["messages"][0]["content"]
        self.assertIn("<context>", content)
        self.assertIn("마지막 메시지 이후: 12시간", content)

    def test_tone_samples_respect_last(self):
        msgs = [Message("나", f"old-secret-{i}") for i in range(20)] + [Message("민수", f"m{i}") for i in range(3)]
        content = build_request(Chat(title="t", messages=msgs), "나", last=3)["messages"][0]["content"]
        self.assertNotIn("old-secret", content)

    def test_masked_tokens_become_placeholders_and_links_warned(self):
        import json
        r = parse_analysis(json.dumps({"summary": "s", "needs_reply": True, "pending_points": [], "suggestions": [
            {"intent": "a", "text": "[전화번호]로 연락해", "placeholders": []},
            {"intent": "b", "text": "https://evil.example 봐봐", "placeholders": []},
            {"intent": "c", "text": "ㅇㅋ", "placeholders": []},
            {"intent": "d", "text": "넷째", "placeholders": []},
        ]}))
        self.assertEqual(len(r.suggestions), 3)
        self.assertIn("전화번호", r.suggestions[0].placeholders)
        self.assertTrue(draft_warnings(r.suggestions[1]))


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


if __name__ == "__main__":
    unittest.main()
