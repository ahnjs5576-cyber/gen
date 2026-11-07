import contextlib
import io
import json
import unittest
from pathlib import Path
from unittest import mock

from kakao_reply import cli
from tests.test_analyzer import FakeClient, _resp
from tests.test_hardening import IsolatedConfig

FIX = Path(__file__).parent / "fixtures"


class SuggestPseudonymizeTest(IsolatedConfig):
    def test_names_hidden_in_request_and_restored_in_output(self):
        payload = {
            "summary": "상대2가 3장을 내일 오전까지 해도 되는지 묻는 중",
            "needs_reply": True,
            "pending_points": [{"from": "상대2", "point": "상대2의 마감 연장 요청"}],
            "suggestions": [{"intent": "수락", "text": "상대2님 네 내일 오전까지 괜찮아요", "placeholders": []}],
        }
        fake = FakeClient(_resp(payload))
        out = io.StringIO()
        with mock.patch.object(cli.secrets, "make_client", return_value=fake), \
                mock.patch.object(cli.output, "copy_to_clipboard", return_value=True) as copy, \
                contextlib.redirect_stdout(out):
            cli.main(["suggest", str(FIX / "android_export.txt"), "--copy", "1"])

        sent = json.dumps(fake.calls[0]["messages"], ensure_ascii=False)
        self.assertNotIn("현우", sent)
        self.assertNotIn("지은", sent)
        self.assertIn("현우님 네 내일 오전까지 괜찮아요", out.getvalue())
        copy.assert_called_once_with("현우님 네 내일 오전까지 괜찮아요")


if __name__ == "__main__":
    unittest.main()
