"""여섯 번째 독립 검증·평가에서 나온 문제들의 회귀 테스트."""

import json
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

from kakao_reply import cli
from kakao_reply.parser import Chat, Message, parse_file, parse_text
from kakao_reply.privacy import Pseudonymizer, mask_identifiers, name_forms
from tests.test_analyzer import FakeClient, _resp
from tests.test_hardening import IsolatedConfig, run_cli

DAY = "--------------- 2026년 11월 6일 금요일 ---------------\n"
FIX = Path(__file__).parent / "fixtures"


def _p(names, me=None, title=None, also_me=(), member_count=None):
    chat = Chat(title=title, member_count=member_count, messages=[Message(n, ".") for n in names])
    return Pseudonymizer(chat, me, also_me=also_me)


class SelfIntroductionTest(unittest.TestCase):
    def test_names_before_copula_and_nouns(self):
        p = _p(["김영호 부장", "박서준", "이지은 대리", "나"], me="나", also_me=["한동훈"])
        for raw in ("안녕하세요 김영호입니다", "박서준입니다", "지은입니다", "영호쪽에서", "동훈입니다", "서준이 폰",
                    "지은네 집", "영호측", "서준이랑 지은이 둘이", "영호예요"):
            out = p.text(raw)
            for name in ("영호", "서준", "지은", "동훈"):
                self.assertNotIn(name, out, raw)


class SurnameNameTest(unittest.TestCase):
    def test_surname_plus_particle_ending_names(self):
        p = _p(["지은", "서아", "민서", "은지", "유나", "민수", "나"], me="나")
        for raw in ("이지은 오늘 휴가래", "담당: 이지은", "김서아 왔어", "박민서 출장", "참석자: 김민수, 이지은, 박민서",
                    "최은지 님", "정유나가"):
            out = p.text(raw)
            for name in ("지은", "서아", "민서", "은지", "유나", "민수"):
                self.assertNotIn(name, out, raw)

    def test_noun_readings_kept(self):
        p = _p(["정은", "성은", "상은", "명은", "은지", "민수"])
        for raw in ("설정은 어떻게 해?", "예정은", "팀 구성은", "여성은", "5만원 이상은 안돼", "더 나은지 모르겠어",
                    "설명은", "주민수가 늘었다"):
            self.assertEqual(p.text(raw), raw, raw)

    def test_given_name_only_after_real_surname(self):
        self.assertNotIn("이유", name_forms("아이유"))
        self.assertNotIn("대리", name_forms("김대리"))
        self.assertNotIn("사원", name_forms("회사원"))
        p = _p(["아이유", "김대리", "나"], me="나")
        self.assertEqual(p.text("이유가 뭐야? 박대리님 확인 부탁"), "이유가 뭐야? 박대리님 확인 부탁")


class SavedIdentityTest(IsolatedConfig):
    def test_saved_name_masked_in_room_where_user_never_spoke(self):
        p = Path(self.tmp.name) / "new.txt"
        p.write_text(DAY + "[민수] [오후 7:02] 한동훈 과장님 TF 합류하셨어요\n[지은] [오후 7:03] 동훈님 인사 부탁해요\n",
                     encoding="utf-8")
        run_cli(["me", "한동훈"])
        code, out, err = run_cli(["suggest", str(p), "--dry-run", "--json"])
        self.assertEqual(code, 0, err)
        self.assertNotIn("동훈", out)
        json.loads(out)  # 경고가 stdout 에 섞이지 않아 그대로 JSON


class NumberRound6Test(unittest.TestCase):
    def test_spaced_accounts_with_two_digit_group(self):
        for raw in ("카뱅 3333 01 1234567", "123456 01 123456", "302 1234 5678 91"):
            self.assertIn("[계좌/카드번호]", mask_identifiers(raw), raw)

    def test_unicode_dashes(self):
        self.assertEqual(mask_identifiers("010‐9876‐5432"), "[전화번호]")
        self.assertEqual(mask_identifiers("110−123−456789"), "[계좌/카드번호]")

    def test_number_lists_kept(self):
        for raw in ("2020 2021 2022 2023", "100 200 300 400", "로또 12 25 33 41 45"):
            self.assertEqual(mask_identifiers(raw), raw)

    def test_long_token_is_fast(self):
        import time
        t = time.time()
        mask_identifiers("A" * 100000)
        self.assertLess(time.time() - t, 0.5)


class RoleAndGroupTest(IsolatedConfig):
    def test_role_hint_and_role_only_nickname(self):
        chat = Chat(title="가족", messages=[Message("엄마", "엄마가 김치 보냈다"), Message("박정호 팀장", "확인"),
                                          Message("나", "네")])
        p = Pseudonymizer(chat, "나")
        out = p.apply(chat)
        self.assertEqual(out.messages[0].sender, "상대1(엄마)")
        self.assertEqual(out.messages[0].text, "엄마가 김치 보냈다")
        self.assertEqual(out.messages[1].sender, "상대2(팀장)")
        self.assertEqual(p.restore("상대2(팀장)님 확인했습니다"), "박정호님 확인했습니다")

    def test_android_member_count_makes_group(self):
        p = Path(self.tmp.name) / "a.txt"
        p.write_text("등산모임 12 님과 카카오톡 대화\n저장한 날짜 : 2026년 11월 6일 오후 10:12\n\n"
                     "2026년 11월 6일 오후 7:02, 김민수 : 이번주 등산모임 다들 참석 가능하신가요?\n", encoding="utf-8")
        chat = parse_file(p)
        self.assertEqual(chat.member_count, 12)
        code, out, err = run_cli(["suggest", str(p), "--dry-run", "--json", "--me", "나"])
        content = json.loads(out)["messages"][0]["content"]
        self.assertIn("단체방 / 참여자 12명", content)
        self.assertIn("등산모임", content)

    def test_contact_card_and_title_common_name(self):
        chat = Chat(messages=[Message("민수", "연락처: 홍길동"), Message("이수정", "."), Message("나", ".")])
        p = Pseudonymizer(chat, "나")
        self.assertEqual(p.apply(chat).messages[0].text, "연락처: [이름]")
        self.assertNotIn("수정", p.text("수정 과장님 자료 주세요"))


class RestoreRound6Test(unittest.TestCase):
    def test_more_endings(self):
        p = _p(["김민수", "이지은", "나"], me="나")
        self.assertEqual(p.restore("상대2였어"), "이지은이었어")
        self.assertEqual(p.restore("상대2라는"), "이지은이라는")
        self.assertEqual(p.restore("상대1이요"), "김민수요")
        self.assertEqual(p.restore("상대1이세요"), "김민수세요")


class ParserRound6Test(IsolatedConfig):
    def test_date_line_typed_at_end_of_mobile_message(self):
        chat = parse_text("2026년 11월 6일 오후 7:02, 민수 : 정기모임 날짜 확정!\n2026년 11월 21일 토요일\n"
                          "2026년 11월 6일 오후 7:05, 나 : ㅇㅋ\n")
        self.assertEqual(chat.messages[0].text, "정기모임 날짜 확정!\n2026년 11월 21일 토요일")
        chat = parse_text("2026년 11월 6일 오후 7:02, 민수 : 안녕\n\n2026년 11월 7일 토요일\n2026년 11월 7일 오전 9:00, 나 : 굿모닝\n")
        self.assertEqual(chat.messages[0].text, "안녕")

    def test_csv_header_error_names_file_and_broken_rows(self):
        p = Path(self.tmp.name) / "weird.csv"
        p.write_text("When,Who,What\n1,2,3\n", encoding="utf-8")
        code, _, _ = run_cli(["show", str(p)])
        self.assertIn("weird.csv", str(code))

    def test_one_bad_byte_still_readable(self):
        p = Path(self.tmp.name) / "cut.txt"
        p.write_bytes((DAY + "[민수] [오후 7:02] 안녕하세요\n").encode("utf-8") + b"\xe3\x81")
        self.assertEqual(parse_file(p).messages[0].text.split("\n")[0], "안녕하세요")


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


if __name__ == "__main__":
    unittest.main()
