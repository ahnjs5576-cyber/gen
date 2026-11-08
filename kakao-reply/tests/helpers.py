"""테스트 공용 도구: 가짜 Claude 클라이언트, CLI 실행기, 설정 격리, 가명 처리기 생성."""

import contextlib
import io
import logging
import os
import tempfile
import unittest
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace
from unittest import mock

from kakao_reply import cli
from kakao_reply.parser import Chat, Message
from kakao_reply.privacy import Pseudonymizer

FIX = Path(__file__).parent / "fixtures"
DAY = "--------------- 2026년 11월 6일 금요일 ---------------\n"
NOW = datetime(2026, 11, 6, 22, 30)


class FakeClient:
    """client.beta.messages.create 만 흉내 내고, 받은 요청을 calls 에 모은다."""

    def __init__(self, response):
        self.calls = []
        self.beta = SimpleNamespace(messages=SimpleNamespace(create=self._create))
        self._response = response

    def _create(self, **kwargs):
        self.calls.append(kwargs)
        return self._response


def _resp(payload, stop_reason="end_turn"):
    import json
    return SimpleNamespace(
        stop_reason=stop_reason,
        content=[SimpleNamespace(type="thinking", thinking=""),
                 SimpleNamespace(type="text", text=json.dumps(payload, ensure_ascii=False))],
    )


def run_cli(argv):
    """CLI 를 실행하고 (종료 코드 또는 오류 메시지, stdout, stderr) 를 돌려준다."""
    out, err = io.StringIO(), io.StringIO()
    code = 0
    with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
        try:
            cli.main(argv)
        except SystemExit as e:
            code = e.code
    return code, out.getvalue(), err.getvalue()


class IsolatedConfig(unittest.TestCase):
    """사용자 설정 폴더를 임시 폴더로 바꾸고, 로그 수준이 다른 테스트로 새지 않게 한다."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        patcher = mock.patch.dict(os.environ, {"XDG_CONFIG_HOME": self.tmp.name})
        patcher.start()
        self.addCleanup(patcher.stop)
        logger = logging.getLogger("kakao_reply")
        self.addCleanup(logger.setLevel, logger.level)

    def write(self, name, text, encoding="utf-8"):
        p = Path(self.tmp.name) / name
        p.write_bytes(text.encode(encoding))
        return p


def _p(names, me=None, title=None, also_me=(), member_count=None):
    """참여자 이름 목록으로 가명 처리기를 만든다."""
    chat = Chat(title=title, member_count=member_count, messages=[Message(n, ".") for n in names])
    return Pseudonymizer(chat, me, also_me=also_me)
