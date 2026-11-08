"""개인정보: 번호 가림, 이름 가명 처리(닉네임·조사·성·흔한 낱말·관계 힌트), 초안 복원."""

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
from kakao_reply.privacy import Pseudonymizer, mask_identifiers, name_forms, role_of
import logging
from kakao_reply.analyzer import Suggestion, build_request, draft_warnings
from kakao_reply.transcript import filter_period

from tests.helpers import DAY, FIX, NOW, FakeClient, IsolatedConfig, _p, _resp, run_cli


class PrivacyTest(unittest.TestCase):
    def test_mask_identifiers(self):
        out = mask_identifiers("내 번호 010-1234-5678, 메일 a.b@ex.com 으로 줘")
        self.assertNotIn("1234", out)
        self.assertIn("[전화번호]", out)
        self.assertIn("[이메일]", out)

    def test_pseudonymize_roundtrip(self):
        chat = parse_file(FIX / "android_export.txt")
        p = Pseudonymizer(chat, "나")
        masked = p.apply(chat)
        senders = {m.sender for m in masked.messages}
        self.assertEqual(senders, {"상대1", "[본인]", "상대2"})
        self.assertNotIn("지은", "\n".join(m.line() for m in masked.messages))
        self.assertEqual(p.restore("상대2님 내일 오전 괜찮아요"), "현우님 내일 오전 괜찮아요")

    def test_log_summary_has_no_content(self):
        s = log_summary(parse_file(FIX / "pc_export.txt"))
        self.assertNotIn("민수", s)
        self.assertNotIn("토요일", s)


class MaskingTest(unittest.TestCase):
    def test_numbers_followed_by_korean_particles(self):
        for raw in ("010-1234-5678로 연락줘", "번호는010-1234-5678", "신한 110-123-456789로 보내",
                    "주민 900101-1234567이야"):
            out = mask_identifiers(raw)
            self.assertNotRegex(out, r"\d{4}", raw)

    def test_dates_are_not_masked(self):
        self.assertEqual(mask_identifiers("회의 2026-11-06 오후"), "회의 2026-11-06 오후")
        self.assertEqual(mask_identifiers("2026.11.6 출발"), "2026.11.6 출발")


class PseudonymizerTest(unittest.TestCase):
    def test_given_name_and_title(self):
        chat = Chat(title="김민수", messages=[Message("김민수", "안녕"), Message("철수", "민수야 내일 봐")])
        p = Pseudonymizer(chat, "철수")
        out = p.apply(chat)
        self.assertEqual(out.title, "상대1")
        self.assertEqual(out.messages[1].text, "상대1아 내일 봐")
        self.assertEqual(out.messages[1].sender, "[본인]")
        self.assertEqual(p.restore("상대1님"), "김민수님")

    def test_my_name_in_text_keeps_meaning(self):
        chat = Chat(messages=[Message("민수", "철수야 뭐해"), Message("철수", "응")])
        out = Pseudonymizer(chat, "철수").apply(chat)
        self.assertEqual(out.messages[0].text, "[본인]아 뭐해")  # '나야' 처럼 뜻이 바뀌지 않음

    def test_participants_outside_period_still_masked(self):
        full = Chat(title="민수", saved_at=datetime(2026, 11, 7, 12), messages=[
            Message("민수", "옛날 얘기", datetime(2026, 11, 1, 9)),
            Message("나", "민수야 답 좀", datetime(2026, 11, 7, 9)),
        ])
        recent = filter_period(full, 1)
        out = Pseudonymizer(full, "나").apply(recent)
        self.assertNotIn("민수", out.title + "".join(m.text for m in out.messages))

    def test_restore_handles_double_digit_aliases(self):
        chat = Chat(messages=[Message(f"사람{i:02d}", "hi") for i in range(1, 12)])
        p = Pseudonymizer(chat, None)
        self.assertEqual(p.restore("상대10 그리고 상대1"), "사람10 그리고 사람01")


class NameBoundaryTest(unittest.TestCase):
    def test_names_inside_words_untouched(self):
        p = _p(["이하나", "지수", "정우리", "Al"], me=None)
        self.assertEqual(p.text("하나도 몰라"), "하나도 몰라")
        self.assertEqual(p.text("지수함수 숙제"), "지수함수 숙제")
        self.assertEqual(p.text("우리 내일 보자"), "우리 내일 보자")
        self.assertEqual(p.text("Also, Always"), "Also, Always")

    def test_names_with_particles_replaced(self):
        p = _p(["김민수", "지수", "Al"], me=None)
        self.assertEqual(p.text("민수야 지수한테도 말해"), "상대1아 상대2한테도 말해")
        self.assertEqual(p.text("김민수 왔어"), "상대1 왔어")
        self.assertEqual(p.text("Al, hi"), "상대3, hi")

    def test_group_title_not_a_person(self):
        p = _p(["엄마", "아빠", "나"], me="나", title="가족")
        self.assertEqual(p.text("가족 모임"), "가족 모임")
        self.assertNotIn("가족", p.backward.values())

    def test_one_to_one_title_is_person(self):
        p = _p(["나"], me="나", title="민수")
        self.assertEqual(p.text("민수야"), "상대1아")

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
        self.assertEqual(p.text("하나야 어디야"), "상대1아 어디야")

    def test_nickname_with_title_or_team(self):
        p = _p(["김민수 대리", "지은/개발팀", "Minsu Kim"])
        self.assertNotIn("민수", p.text("민수 대리 폰 / 민수야 / 김민수님"))
        self.assertNotIn("지은", p.text("지은이 오늘 와?"))
        self.assertNotIn("Minsu", p.text("minsu said hi, MINSU!"))

    def test_full_name_beats_other_persons_given_name(self):
        p = _p(["김민수", "민수"])
        self.assertEqual(p.text("민수야"), "상대2야")


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


class RestoreDisplayTest(unittest.TestCase):
    def test_restore_strips_titles_and_decoration(self):
        p = _p(["민수 (회사)", "Minsu Kim", "김지은 대리", "나"], me="나")
        self.assertEqual(p.restore("상대1은"), "민수는")
        self.assertEqual(p.restore("상대1이랑"), "민수랑")
        self.assertEqual(p.restore("상대2아"), "Minsu야")
        self.assertEqual(p.restore("상대3가"), "김지은이")
        self.assertEqual(p.restore("[본인]이 할게"), "내가 할게")


class MaskingRound4Test(unittest.TestCase):
    def test_dates_with_times_and_lotto_kept(self):
        for raw in ("2026-11-06 10:30에 보자", "회의 2026-11-06 14:00~16:00", "2026 11 06 10 30", "로또 12 25 33 41 45"):
            self.assertEqual(mask_identifiers(raw), raw)

    def test_more_phone_forms(self):
        for raw in ("031)123-4567", "(02) 123 4567", "010–1234–5678", "010ㅡ1234ㅡ5678"):
            self.assertEqual(mask_identifiers(raw), "[전화번호]", raw)


class NumberLeakTest(unittest.TestCase):
    def test_unit_like_words_after_numbers(self):
        for raw in ("110-123-456789 일요일까지", "신한 110-123-456789 회사 계좌로", "3333-01-1234567 장지훈",
                    "3333-01-1234567 원지혜", "3333011234567 원래 쓰던 계좌", "123456-01-123456 명의 확인",
                    "1234567890123456 일시불"):
            self.assertIn("[계좌/카드번호]", mask_identifiers(raw), raw)

    def test_other_separators(self):
        for raw in ("900101ㅡ1234567", "900101–1234567", "110–123–456789", "1234.5678.9012.3456", "110 123-456789"):
            self.assertNotRegex(mask_identifiers(raw), r"\d{4}", raw)

    def test_still_kept(self):
        for raw in ("1000000000원", "10000000000원이야", "192.168.100.100", "로또 12 25 33 41 45"):
            self.assertEqual(mask_identifiers(raw), raw)


class NameRound5Test(unittest.TestCase):
    def test_titles_glued_to_name(self):
        p = _p(["김민수", "철수"], me="철수")
        for raw in ("민수대리님", "민수팀장님", "민수부장님", "김민수프로님", "민수매니저님", "민수주임님", "민수때문에",
                    "민수샘", "민수누님"):
            self.assertNotIn("민수", p.text(raw), raw)

    def test_common_word_names_in_usual_address_forms(self):
        p = _p(["이수정", "박지원", "유리", "이하나"])
        for raw in ("수정 씨", "수정님", "지원님", "지원 님", "유리님", "김유리님"):
            self.assertNotRegex(p.text(raw), r"수정|지원|유리", raw)
        self.assertEqual(p.text("하나님 감사"), "하나님 감사")

    def test_surname_prefix_does_not_eat_words(self):
        p = _p(["정은", "성은", "상은", "은지", "명은"])
        for raw in ("설정은 어떻게 해?", "예정은", "팀 구성은", "여성은", "5만원 이상은 안돼", "더 나은지 모르겠어", "설명은"):
            self.assertEqual(p.text(raw), raw, raw)
        self.assertEqual(p.text("이정은 씨"), "상대1 씨")

    def test_surname_prefix_still_masks_person(self):
        p = _p(["민수", "나"], me="나")
        for raw in ("김민수 대리님이", "김민수가 왔어", "김민수 왔어"):
            self.assertNotIn("민수", p.text(raw), raw)

    def test_title_forms(self):
        for title in ("김민수(대학)", "민수🐶", "민수2", "민수_회사"):
            p = _p(["Minsu", "나"], me="나", title=title)
            self.assertNotIn("민수", p.text(f"{title} 민수야"), title)
        p = _p(["Minsu", "나"], me="나", title="김민수(대학)")
        self.assertEqual(p.restore("상대1아"), "민수야")
        self.assertEqual(p.restore("상대1은"), "김민수는")

    def test_group_title_with_two_words_not_a_person(self):
        for title in ("영어 스터디", "주말 등산"):
            p = _p(["Minsu", "나"], me="나", title=title)
            self.assertEqual(p.text("영어 공부 주말 등산"), "영어 공부 주말 등산")
            self.assertEqual(p.restore("상대1아"), "Minsu야")

    def test_compound_surname_and_upper_latin(self):
        self.assertNotIn("궁민", name_forms("남궁민"))
        self.assertNotIn("우진", name_forms("선우진"))
        p = _p(["JIEUN KIM", "나"], me="나")
        self.assertNotIn("jieun", p.text("jieun아 Jieun입니다").lower())

    def test_restore_josa_extras(self):
        p = _p(["김민수", "나"], me="나")
        self.assertEqual(p.restore("[본인]이에요"), "나예요")
        self.assertEqual(p.restore("상대1이가"), "김민수가")
        self.assertEqual(p.restore("상대1이는"), "김민수는")

    def test_attachment_filename_masked(self):
        chat = Chat(messages=[Message("민수", "파일: 홍길동_이력서.pdf"), Message("나", "ㅇㅋ")])
        out = Pseudonymizer(chat, "나").apply(chat)
        self.assertEqual(out.messages[0].text, "파일: [파일명].pdf")


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


class GluedTitleNicknameTest(unittest.TestCase):
    """닉네임에 직함·호칭이 붙어 있어도 이름을 뽑고, 엉뚱한 조각은 이름으로 보지 않는다."""

    def test_names_extracted_from_glued_nicknames(self):
        for nick, want in (("김민수대리", "민수"), ("이지은과장님", "지은"), ("박서준팀장", "서준"), ("최현우선배", "현우"),
                           ("수빈언니", "수빈"), ("민수아빠", "민수"), ("지은맘", "지은"), ("김민수님", "민수"),
                           ("지민이", "지민"), ("하은이", "하은"), ("민수형", "민수"), ("서연맘", "서연")):
            self.assertIn(want, name_forms(nick), nick)

    def test_no_junk_given_names(self):
        for nick, bad in (("박지은 선배님", "배님"), ("이수빈 고객님", "객님"), ("민수형", "수형"), ("서연맘", "연맘"),
                          ("강아지", "아지"), ("오렌지", "렌지"), ("하은이", "은이")):
            self.assertNotIn(bad, name_forms(nick), nick)

    def test_glued_nicknames_masked_in_text(self):
        p = _p(["김민수대리", "이지은과장님", "최현우선배", "지민이", "수빈언니", "나"], me="나")
        out = p.text("민수씨 오늘 회의, 김민수 대리님, 이지은 과장님, 현우 선배, 지민아, 수빈아")
        for name in ("민수", "지은", "현우", "지민", "수빈"):
            self.assertNotIn(name, out)
        self.assertEqual(p.sender_map["김민수대리"], "상대1(대리)")

    def test_parent_nicknames(self):
        p = _p(["서준 엄마", "사랑하는 엄마", "나"], me="나")
        self.assertEqual(p.sender_map["서준 엄마"], "상대1(○○엄마)")
        self.assertEqual(p.restore("상대1님 감사해요"), "서준 엄마님 감사해요")
        self.assertEqual(p.restore("상대2 사랑해요"), "엄마 사랑해요")
        out = p.text("사랑하는 우리 딸 서준이 엄마")
        self.assertIn("사랑하는 우리 딸", out)
        self.assertNotIn("서준", out)

    def test_title_kept_outside_alias(self):
        p = _p(["박지은 팀장", "나"], me="나")
        self.assertEqual(p.text("박지은 팀장님께 정중하게"), "상대1 팀장님께 정중하게")


class RoomTitleRound7Test(unittest.TestCase):
    def test_person_titles(self):
        from kakao_reply.privacy import title_is_person
        for t in ("김민수 과장님", "우리 지은이", "김민수", "민수🐶", "Minsu Kim", "김민수(대학)", "민수_회사"):
            self.assertTrue(title_is_person(t), t)
        for t in ("독서모임", "삼성전자", "축구동호회", "영어 스터디", "주말 등산", "고양이", "가족", "등산모임"):
            self.assertFalse(title_is_person(t), t)

    def test_one_to_one_title_with_honorific(self):
        p = _p(["Minsu Kim", "나"], me="나", title="김민수 과장님")
        self.assertNotIn("민수", p.text("김민수 과장님 민수 과장한테"))

    def test_member_count_vs_name_number(self):
        from kakao_reply.privacy import effective_member_count
        self.assertIsNone(effective_member_count(Chat(title="김민수", member_count=94)))
        self.assertEqual(effective_member_count(Chat(title="등산모임", member_count=12)), 12)


class MaskingRound7Test(unittest.TestCase):
    def test_accounts_before_words(self):
        for raw in ("신한 110123456789 명의 김민수", "110 123 456789 명의", "카뱅 3333011234567 명의", "110123456789 위에 계좌로"):
            self.assertIn("[계좌/카드번호]", mask_identifiers(raw), raw)

    def test_ids_handles_links_birthdates(self):
        self.assertEqual(mask_identifiers("카톡 아이디 minsu_kim94"), "카톡 아이디 [아이디]")
        self.assertEqual(mask_identifiers("인스타 @minsu_94 팔로우"), "인스타 [아이디] 팔로우")
        self.assertEqual(mask_identifiers("https://open.kakao.com/o/gAbc123 들어와"), "[프로필링크] 들어와")
        self.assertEqual(mask_identifiers("1999년 3월 2일생"), "[생년월일]")
        self.assertEqual(mask_identifiers("메일 abc@naver.com"), "메일 [이메일]")

    def test_more_endings(self):
        p = _p(["김민수", "이지은", "나"], me="나")
        for raw in ("민수뿐", "민수땜에", "민수빼고", "민수짱", "민수것", "민수번호", "민수계좌", "민수주소", "민수남친", "지은남편"):
            self.assertNotRegex(p.text(raw), "민수|지은", raw)

    def test_third_party_honorific_names(self):
        p = _p(["김민수", "철수"], me="철수")
        self.assertEqual(p.text("영희씨도 다음주에 합류합니다"), "[이름]씨도 다음주에 합류합니다")
        for kept in ("선생님께", "사장님이", "고객님", "김과장님", "박대리님", "하느님", "어머님"):
            self.assertEqual(p.text(kept), kept)

    def test_alias_particles_fixed_forward(self):
        p = _p(["김민수", "철수"], me="철수")
        self.assertEqual(p.text("철수가 할게"), "[본인]이 할게")
        self.assertEqual(p.text("김민수랑 같이"), "상대1이랑 같이")

    def test_restore_round7(self):
        p = _p(["김민수", "이지은", "박서준", "나"], me="나")
        self.assertEqual(p.restore("상대2면"), "이지은이면")
        self.assertEqual(p.restore("상대2시죠"), "이지은이시죠")
        self.assertEqual(p.restore("상대3로부터"), "박서준으로부터")
        self.assertEqual(p.restore("상대2로서"), "이지은으로서")
        self.assertEqual(p.restore("[본인]님"), "나")


class NicknameRound8Test(unittest.TestCase):
    """학부모·꾸민 닉네임, 닉네임 속 설명 낱말, 가족 관계 힌트."""

    def test_parent_nicknames_mask_child_and_parent(self):
        p = _p(["준서맘", "서윤맘(김혜진)", "하린할머니", "하준이네", "나"], me="나")
        out = p.text("준서맘 저희 애도 / 서윤맘이 회비 걷어주신대요~ 하린이는 / 하준이가 엄청 기대 / 혜진씨")
        for name in ("준서", "서윤", "하린", "하준", "혜진"):
            self.assertNotIn(name, out)
        self.assertEqual(p.sender_map["하준이네"], "상대4(○○가족)")
        self.assertEqual(p.restore("상대2(○○엄마)님 감사해요"), "서윤맘님 감사해요")

    def test_glued_cute_nicknames(self):
        for nick in ("민수짱", "민수입니다", "지은공주", "지은이당"):
            self.assertTrue({"민수", "지은"} & set(name_forms(nick)), nick)

    def test_descriptive_words_in_nicknames_are_not_names(self):
        cases = {"삼성전자 김지은": "삼성전자", "신한은행 이수진 대리": "신한은행", "인테리어 김민수 실장": "인테리어",
                 "1학년3반 준서맘": "학년", "3학년 2반 담임 김선희": "담임", "오늘도 지은": "오늘도", "민수 (부재중)": "부재중",
                 "김지은 퇴사": "퇴사", "박지성 선수": "선수", "작은아빠": "작은"}
        for nick, word in cases.items():
            self.assertNotIn(word, name_forms(nick), nick)
        p = _p(["삼성전자 김지은", "나"], me="나")
        self.assertEqual(p.text("삼성전자 주가 몇 학년이에요?"), "삼성전자 주가 몇 학년이에요?")
        self.assertEqual(p.restore("상대1님 감사합니다"), "김지은님 감사합니다")

    def test_own_family_roles_are_not_someone_elses(self):
        for nick in ("엄마 김영희", "김영희(엄마)", "우리엄마", "친정엄마", "남편♥박준호", "와이프 김지수", "이모 김영숙"):
            self.assertFalse((role_of(nick) or "").startswith("○○"), nick)
        for nick in ("서준 엄마", "준서맘", "하린할머니"):
            self.assertTrue(role_of(nick).startswith("○○"), nick)
        p = _p(["남편♥박준호", "나"], me="나")
        self.assertEqual(p.text("준호야"), "상대1아")


class ThirdPartyRound8Test(unittest.TestCase):
    def test_common_word_names_with_ssi(self):
        p = _p(["김민수", "철수"], me="철수")
        for raw in ("지혜씨 오늘 출근하셨어요?", "지원씨", "수정씨", "유리씨", "은혜씨", "수영씨", "이하나씨", "영희님", "이영희님"):
            self.assertIn("[이름]", p.text(raw), raw)

    def test_honorific_nouns_kept(self):
        p = _p(["김민수", "철수"], me="철수")
        for raw in ("부모님 감사합니다", "장모님", "교장님", "방장님", "상무님", "전무님", "담당자님", "변호사님", "기자님",
                    "박사님", "집사님", "장로님", "기장님", "약사님", "아가씨", "손글씨", "호박씨", "날씨", "솜씨",
                    "선생님", "고객님", "김과장님", "박대리님", "구청장님", "하나님"):
            self.assertEqual(p.text(raw), raw, raw)

    def test_fullname_with_title(self):
        p = _p(["김민수", "철수"], me="철수")
        self.assertEqual(p.text("김영희 과장님께 보고드렸어요"), "[이름] 과장님께 보고드렸어요")
        self.assertEqual(p.text("오늘도 과장님"), "오늘도 과장님")


class IdentifierRound8Test(unittest.TestCase):
    def test_id_pattern_boundaries(self):
        for raw in ("kidding me", "midnight", "videos", "holidays", "president", "paid 1000", "계정 100개"):
            self.assertEqual(mask_identifiers(raw), raw)
        self.assertEqual(mask_identifiers("카톡 아이디가 minsu94야"), "카톡 아이디가 [아이디]야")

    def test_more_identifier_variants(self):
        for raw, want in (("900101-1******", "[주민번호]"), ("90년 3월 2일생", "[생년월일]"), ("1990.03.02생", "[생년월일]"),
                          ("생년월일 1990-03-02", "생년월일 [생년월일]"), ("instagram.com/minsu", "[프로필링크]"),
                          ("m.facebook.com/minsu.kim", "[프로필링크]"), ("메일 a.b@ex.com", "메일 [이메일]")):
            self.assertEqual(mask_identifiers(raw), want, raw)

    def test_latin_names_restore_with_vowel_ending(self):
        p = _p(["Minsu Kim", "John", "김민수", "나"], me="나")
        self.assertEqual([p.restore(t) for t in ("상대1아", "상대1은", "상대2아", "상대3이한테")],
                         ["Minsu야", "Minsu는", "John아", "김민수한테"])

    def test_alias_vocative_fixed_forward(self):
        p = _p(["김민수", "철수"], me="철수")
        self.assertEqual(p.text("철수야 김민수야"), "[본인]아 상대1아")


if __name__ == "__main__":
    unittest.main()
