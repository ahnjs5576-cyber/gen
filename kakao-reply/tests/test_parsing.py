"""내보내기 파일 읽기: 형식(PC/Android/iOS/CSV), 여러 줄 메시지, 시스템 줄, 날짜 구분선, 첨부물, 인코딩."""

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


class ParserTest(unittest.TestCase):
    def test_pc_export(self):
        chat = parse_file(FIX / "pc_export.txt")
        self.assertEqual(chat.title, "민수")
        self.assertEqual(chat.participants, ["민수", "나"])
        self.assertEqual(len(chat.messages), 5)
        self.assertEqual(chat.messages[0].time, datetime(2026, 11, 6, 19, 2))
        # 여러 줄 메시지는 하나로 합쳐진다
        self.assertEqual(chat.messages[3].text, "그럼 12시에 강남역에서 볼까?\n어디 가고 싶은 데 있으면 말해줘")

    def test_android_export(self):
        chat = parse_file(FIX / "android_export.txt")
        self.assertEqual(chat.title, "팀 프로젝트")
        self.assertEqual([m.sender for m in chat.messages], ["지은", "나", "현우"])
        self.assertEqual(chat.messages[0].time, datetime(2026, 11, 6, 10, 1))
        self.assertIn("내일 오전까지", chat.messages[2].text)

    def test_ios_export(self):
        chat = parse_file(FIX / "ios_export.txt")
        self.assertEqual(len(chat.messages), 2)
        self.assertEqual(chat.messages[1].time, datetime(2026, 11, 6, 18, 21))

    def test_csv_export(self):
        chat = parse_file(FIX / "export.csv")
        self.assertEqual(len(chat.messages), 3)
        self.assertEqual(chat.messages[2].text, "그럼 12시에\n강남역에서 볼까?")

    def test_noon_and_midnight(self):
        from kakao_reply.parser import parse_text

        chat = parse_text(
            "--------------- 2026년 1월 2일 금요일 ---------------\n"
            "[A] [오전 12:05] 자정\n[A] [오후 12:05] 정오\n"
        )
        self.assertEqual([m.time.hour for m in chat.messages], [0, 12])

    def test_pending_messages(self):
        chat = parse_file(FIX / "pc_export.txt")
        pending = pending_messages(chat, "나")
        self.assertEqual([m.text.splitlines()[0] for m in pending],
                         ["그럼 12시에 강남역에서 볼까?", "사진"])


class ParserExtrasTest(unittest.TestCase):
    def test_saved_at_formats(self):
        self.assertEqual(parse_file(FIX / "pc_export.txt").saved_at, datetime(2026, 11, 6, 22, 10))
        self.assertEqual(parse_file(FIX / "android_export.txt").saved_at, datetime(2026, 11, 6, 22, 12))
        self.assertEqual(parse_file(FIX / "ios_export.txt").saved_at, datetime(2026, 11, 6, 22, 15))

    def test_attachments_are_tagged(self):
        from kakao_reply.parser import Message

        self.assertEqual(Message("a", "사진").attachment, "사진")
        self.assertEqual(Message("a", "사진 3장").attachment, "사진")
        self.assertEqual(Message("a", "파일: 견적서.pdf").attachment, "파일")
        self.assertIsNone(Message("a", "사진 보내줘").attachment)
        self.assertIn("<파일: 견적서.pdf>", Message("a", "파일: 견적서.pdf").line())

    def test_csv_sorted_by_time(self):
        from kakao_reply.parser import parse_csv

        chat = parse_csv("Date,User,Message\n2026-11-06 10:00:00,B,둘째\n2026-11-06 09:00:00,A,첫째\n")
        self.assertEqual([m.text for m in chat.messages], ["첫째", "둘째"])


class ParserHardeningTest(IsolatedConfig):
    def test_pc_system_lines_and_bracket_names(self):
        chat = parse_text(
            "--------------- 2026년 11월 6일 금요일 ---------------\n"
            "[민수] [오후 7:02] 안녕\n영희님이 들어왔습니다.\n"
            "[철수[회사]] [오후 7:03] 나 철수\n메시지가 삭제되었습니다.\n"
        )
        self.assertEqual([(m.sender, m.text) for m in chat.messages], [("민수", "안녕"), ("철수[회사]", "나 철수")])

    def test_saved_at_with_weekday(self):
        chat = parse_text("민수 님과 카카오톡 대화\n저장한 날짜 : 2026년 11월 6일 금요일 오후 10:12\n"
                          "2026년 11월 6일 오후 1:00, 민수 : 안녕\n")
        self.assertEqual(chat.saved_at, datetime(2026, 11, 6, 22, 12))

    def test_cp949_file(self):
        p = self.write("old.txt", "2026년 11월 6일 오후 1:00, 민수 : 안녕\n", encoding="cp949")
        self.assertEqual(parse_file(p).messages[0].text, "안녕")

    def test_csv_crlf_inside_field(self):
        p = self.write("c.csv", 'Date,User,Message\r\n2026-11-06 10:00:00,A,"첫줄\r\n둘째줄"\r\n')
        self.assertEqual(parse_file(p).messages[0].text, "첫줄\n둘째줄")


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


class AttachmentFalsePositiveTest(unittest.TestCase):
    def test_ordinary_sentences_are_text(self):
        for body in ("일정 언제가 좋아?", "공지사항 확인 부탁해요", "정산은 내가 할게", "이체 확인했어?",
                     "카카오페이로 보낼게", "음성메시지 왜 안 들려", "영상통화 가능?", "파일 보내줘", "사진 보내줘"):
            self.assertIsNone(Message("a", body).attachment, body)

    def test_real_placeholders(self):
        for body in ("사진", "사진 3장", "동영상", "파일: 견적서.pdf", "음성메시지", "샵검색: 강남 맛집",
                     "송금 10,000원", "보이스톡 해요", "삭제된 메시지입니다."):
            self.assertIsNotNone(Message("a", body).attachment, body)


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


class ParserRound5Test(IsolatedConfig):
    def test_mobile_shapes_are_body_in_pc_files(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 다음 모임 공지\n2026년 11월 14일 오후 3:00, 강남역 2번 출구\n"
                                "2026년 11월 14일 토요일\n[나] [오후 7:05] ㅇㅋ\n")
        self.assertEqual(chat.messages[0].text,
                         "다음 모임 공지\n2026년 11월 14일 오후 3:00, 강남역 2번 출구\n2026년 11월 14일 토요일")

    def test_dashed_body_line_is_not_a_date(self):
        chat = parse_text(DAY + "[민수] [오후 7:02] 안건\n----- 2026년 11월 6일 회의 -----\n1. 예산\n2. 일정\n"
                                "[나] [오후 7:05] ㅇㅋ\n")
        self.assertIn("2. 일정", chat.messages[0].text)
        self.assertEqual(chat.messages[1].time, datetime(2026, 11, 6, 19, 5))

    def test_invalid_date_in_body_does_not_crash(self):
        chat = parse_text("2026. 11. 6. 오후 7:02, 민수 : 장소\n2026. 11. 31. 오후 3:00, 장소 : 강남역\n")
        self.assertIn("강남역", chat.messages[0].text)

    def test_bad_csv_header_and_dates(self):
        p = Path(self.tmp.name) / "x.csv"
        p.write_text("When,Who,What\n1,2,3\n", encoding="utf-8")
        code, _, _ = run_cli(["show", str(p)])
        self.assertIn("Date,User,Message", str(code))
        p.write_text("Date,User,Message\n2026-13-45 99:99:99,민수,옛날\n2026-11-06 10:00:00,민수,새거\n", encoding="utf-8")
        chat = parse_file(p)
        self.assertEqual(chat.undated, 1)
        self.assertEqual([m.text for m in filter_period(chat, 3, now=datetime(2026, 11, 7)).messages], ["새거"])


class MobileBodyLineTest(unittest.TestCase):
    def test_timestamp_shaped_body_line_in_mobile_file(self):
        chat = parse_text("2026년 11월 6일 오후 7:02, 민수 : 다음 모임 공지\n2026년 11월 14일 오후 3:00, 강남역 2번 출구\n"
                          "2026년 11월 6일 오후 7:03, 나 : ㅇㅋ\n")
        self.assertEqual(chat.messages[0].text, "다음 모임 공지\n2026년 11월 14일 오후 3:00, 강남역 2번 출구")

    def test_real_mobile_system_line_dropped(self):
        chat = parse_text("2026년 11월 6일 오후 7:02, 민수 : 안녕\n2026년 11월 6일 오후 7:02, 영희님이 들어왔습니다.\n"
                          "2026년 11월 6일 오후 7:03, 나 : ㅇㅋ\n")
        self.assertEqual(chat.messages[0].text, "안녕")


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


class ParserRound7Test(IsolatedConfig):
    def test_day_with_only_system_lines(self):
        chat = parse_text("2026년 11월 6일 오후 11:50, 민수 : 잘자\n2026년 11월 7일 토요일\n"
                          "2026년 11월 7일 오전 9:00, 지은님이 나갔습니다.\n2026년 11월 8일 일요일\n"
                          "2026년 11월 8일 오전 9:00, 나 : 굿모닝\n")
        self.assertEqual(chat.messages[0].text, "잘자")

    def test_member_count_rules(self):
        p = self.write("x.txt", "송년회 2026 님과 카카오톡 대화\n2026년 11월 6일 오후 1:00, 민수 : 안녕\n")
        self.assertIsNone(parse_file(p).member_count)
        p = self.write("y.txt", "등산모임 12 님과 카카오톡 대화\n2026년 11월 6일 오후 1:00, 민수 : 안녕\n")
        self.assertEqual(parse_file(p).member_count, 12)

    def test_csv_empty_user_rows_are_silent(self):
        p = self.write("e.csv", "Date,User,Message\n2026-11-06 10:00:00,,시스템\n2026-11-06 10:01:00,민수,안녕\n")
        chat = parse_file(p)
        self.assertEqual(chat.skipped, 0)
        self.assertEqual(len(chat.messages), 1)

    def test_media_vs_other_placeholders(self):
        from kakao_reply.transcript import room_status
        chat = parse_text(DAY + "[나] [오후 1:00] 안녕\n[민수] [오후 1:01] 사진\n[민수] [오후 1:02] 삭제된 메시지입니다.\n"
                                "[민수] [오후 1:03] 송금 10,000원\n")
        st = room_status(chat, "나")
        self.assertEqual([m.attachment for m in st.pending_attachments], ["사진"])


class ImpossibleDateTest(IsolatedConfig):
    def test_impossible_dates_do_not_crash(self):
        p = self.write("x.txt", "x 님과 카카오톡 대화\n저장한 날짜 : 2026년 2월 30일 오후 10:12\n"
                                "--------------- 2026년 2월 30일 월요일 ---------------\n[민수] [오후 1:00] 안녕\n")
        chat = parse_file(p)
        self.assertEqual(chat.messages[0].text, "안녕")
        p = self.write("KakaoTalk_Chat_x_2026-02-30-10-00-00.csv", "Date,User,Message\n2026-11-06 10:00:00,민수,a\n")
        self.assertEqual(parse_file(p).title, "x")


if __name__ == "__main__":
    unittest.main()
