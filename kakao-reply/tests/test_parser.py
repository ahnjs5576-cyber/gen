import unittest
from datetime import datetime
from pathlib import Path

from kakao_reply.analyzer import pending_messages
from kakao_reply.parser import parse_file

FIX = Path(__file__).parent / "fixtures"


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


if __name__ == "__main__":
    unittest.main()
