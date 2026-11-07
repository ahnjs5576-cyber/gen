import unittest
from datetime import datetime
from pathlib import Path

from kakao_reply.parser import parse_file
from kakao_reply.privacy import Pseudonymizer, log_summary, mask_identifiers
from kakao_reply.transcript import filter_period, room_status

FIX = Path(__file__).parent / "fixtures"
NOW = datetime(2026, 11, 6, 22, 30)


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
        self.assertEqual(len(kept.messages), 2)  # 11/6 20:00 이후만


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


if __name__ == "__main__":
    unittest.main()
