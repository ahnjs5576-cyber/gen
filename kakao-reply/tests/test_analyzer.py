import json
import unittest
from pathlib import Path
from types import SimpleNamespace

from kakao_reply.analyzer import RefusalError, analyze, build_request
from kakao_reply.parser import parse_file

FIX = Path(__file__).parent / "fixtures"


class FakeClient:
    def __init__(self, response):
        self.calls = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))
        self._response = response

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self._response


def _resp(payload, stop_reason="end_turn"):
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=[SimpleNamespace(type="thinking", thinking=""),
                 SimpleNamespace(type="text", text=json.dumps(payload, ensure_ascii=False))],
    )


class AnalyzerTest(unittest.TestCase):
    def setUp(self):
        self.chat = parse_file(FIX / "pc_export.txt")

    def test_request_only_sends_last_n(self):
        req = build_request(self.chat, "나", last=2)
        content = req["messages"][0]["content"]
        self.assertIn("사진", content)
        self.assertNotIn("이번 주말에 시간 돼?", content)

    def test_analyze_parses_structured_output(self):
        payload = {
            "summary": "토요일 점심 약속을 잡는 중",
            "needs_reply": True,
            "pending_points": [{"from": "민수", "point": "12시 강남역 괜찮은지"}],
            "suggestions": [{"intent": "수락", "text": "좋아 12시에 봐!", "placeholders": []}],
        }
        client = FakeClient(_resp(payload))
        result = analyze(client, self.chat, "나")
        self.assertTrue(result.needs_reply)
        self.assertEqual(result.suggestions[0].text, "좋아 12시에 봐!")
        call = client.calls[0]
        self.assertEqual(call["fallbacks"], "default")
        self.assertEqual(call["output_config"]["format"]["type"], "json_schema")

    def test_refusal(self):
        client = FakeClient(_resp({}, stop_reason="refusal"))
        with self.assertRaises(RefusalError):
            analyze(client, self.chat, "나")


if __name__ == "__main__":
    unittest.main()
