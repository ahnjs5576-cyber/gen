"""방 상태: 마지막 발신자, 답 안 한 메시지, 기간 필터, 본인 추정."""

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


class RoomStatusTest(unittest.TestCase):
    def test_last_message_not_mine(self):
        st = room_status(parse_file(FIX / "pc_export.txt"), "나", now=NOW)
        self.assertFalse(st.last_is_mine)
        self.assertEqual(st.last_sender, "민수")
        self.assertEqual(len(st.pending), 2)
        self.assertEqual([m.attachment for m in st.pending_attachments], ["사진"])
        self.assertFalse(st.stale)

    def test_unknown_me(self):
        st = room_status(parse_file(FIX / "ios_export.txt"), None, now=NOW)
        self.assertIsNone(st.last_is_mine)

    def test_stale_export(self):
        st = room_status(parse_file(FIX / "pc_export.txt"), "나", now=datetime(2026, 11, 8, 9, 0))
        self.assertTrue(st.stale)

    def test_filter_period(self):
        chat = parse_file(FIX / "pc_export.txt")
        kept = filter_period(chat, 1, now=datetime(2026, 11, 7, 20, 0))
        self.assertEqual(len(kept.messages), 2)


class GuessMeTest(unittest.TestCase):
    def test_common_sender(self):
        a = Chat(messages=[Message("철수", "a"), Message("민수", "b")])
        b = Chat(messages=[Message("철수", "a"), Message("지은", "b")])
        c = Chat(messages=[Message("철수", "a"), Message("현우", "b")])
        self.assertEqual(guess_me_across([a, b, c]), "철수")
        self.assertIsNone(guess_me_across([a, b]))  # 방 2개로는 추정하지 않는다
        alone = Chat(messages=[Message("철수", "a")])
        self.assertIsNone(guess_me_across([a, b, alone]))  # 혼자 말한 방이 있으면 추정하지 않는다


class TranscriptRound7Test(unittest.TestCase):
    def test_future_export_time(self):
        from kakao_reply.transcript import describe_age
        self.assertIn("시계 확인", describe_age(datetime(2026, 11, 7, 12), now=datetime(2026, 11, 7, 9)))

    def test_room_without_my_messages(self):
        chat = parse_text(DAY + "[민수] [오후 1:00] a\n[지은] [오후 1:01] b\n")
        st = room_status(chat, "나")
        self.assertFalse(st.me_seen)


class PendingRound8Test(unittest.TestCase):
    def test_attachment_only_reply_does_not_end_pending(self):
        chat = parse_text(DAY + "[팀장] [오후 1:00] 보고서 언제 줄 수 있어요?\n[나] [오후 1:05] 사진\n[팀장] [오후 1:06] ?\n")
        pending = pending_messages(chat, "나")
        self.assertEqual([m.text for m in pending], ["보고서 언제 줄 수 있어요?", "?"])


if __name__ == "__main__":
    unittest.main()
