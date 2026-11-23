"""AI 문장 해석 — 자유로운 한국어 지시를 Claude 가 구조화 액션으로 변환해 실행.

Claude 는 아래 도구 중 하나를 선택:
  - run_program(program, args)
  - file_op(op, src, dst)
  - memo(text)
  - reply(text)            # 실행 없이 답만

실행은 반드시 기존 핸들러(program/files/memo)의 보안 가드를 통과합니다.
AI 라고 해서 화이트리스트/루트 제한을 우회하지 않습니다.
"""
from __future__ import annotations

import json

from ..config import Config
from ..log import get_logger
from .files import handle_files
from .memo import add_memo
from .program import run_program
from .safety import SafetyError

log = get_logger(__name__)

_TOOLS = [
    {
        "name": "run_program",
        "description": "PC에서 프로그램이나 스크립트를 실행한다. 허용된 프로그램만 실제 실행됨.",
        "input_schema": {
            "type": "object",
            "properties": {
                "program": {"type": "string", "description": "실행 파일명 또는 경로"},
                "args": {"type": "string", "description": "인자 (공백 구분, 없으면 빈 문자열)"},
            },
            "required": ["program"],
        },
    },
    {
        "name": "file_op",
        "description": "파일/폴더 작업. op 는 목록/이동/삭제/생성폴더 중 하나.",
        "input_schema": {
            "type": "object",
            "properties": {
                "op": {"type": "string", "enum": ["목록", "이동", "삭제", "생성폴더"]},
                "src": {"type": "string", "description": "대상 경로 (file_root 기준 상대)"},
                "dst": {"type": "string", "description": "이동 대상 경로 (이동일 때만)"},
            },
            "required": ["op", "src"],
        },
    },
    {
        "name": "memo",
        "description": "실행하지 않고 메모로 기록한다.",
        "input_schema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "reply",
        "description": "어떤 작업도 하지 않고 사용자에게 텍스트로 답한다.",
        "input_schema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
]

_SYSTEM = (
    "너는 PC 작업 비서다. 사용자가 카카오톡으로 보낸 한국어 지시를 받아서, "
    "제공된 도구 중 가장 알맞은 것 하나를 호출한다. "
    "파일 경로는 설정된 작업 폴더(file_root) 기준의 상대 경로로 쓴다. "
    "지시가 모호하거나 위험하면 실행하지 말고 reply 로 사유를 설명한다. "
    "불필요한 설명 없이 바로 도구를 호출한다."
)


def interpret_and_run(cfg: Config, freeform: str) -> str:
    if not cfg.ai_enabled:
        return (
            "AI 해석이 비활성화되어 있습니다. config [claude] api_key 를 설정하거나 "
            "!실행 / !파일 / !메모 명령을 사용하세요."
        )
    try:
        import anthropic
    except ImportError:
        return "anthropic 패키지가 설치되지 않았습니다. pip install anthropic"

    client = anthropic.Anthropic(api_key=cfg.claude_api_key)
    try:
        resp = client.messages.create(
            model=cfg.claude_model,
            max_tokens=1024,
            system=_SYSTEM,
            tools=_TOOLS,
            tool_choice={"type": "any"},
            messages=[{"role": "user", "content": freeform}],
        )
    except Exception as e:  # API 오류
        log.error("Claude API 오류: %s", e)
        return f"AI 해석 중 오류: {e}"

    tool_use = next((b for b in resp.content if b.type == "tool_use"), None)
    if tool_use is None:
        texts = [b.text for b in resp.content if b.type == "text"]
        return "🤖 " + ("\n".join(texts) if texts else "해석 결과가 없습니다.")

    name = tool_use.name
    inp = tool_use.input or {}
    log.info("AI 결정: %s %s", name, json.dumps(inp, ensure_ascii=False))

    try:
        if name == "run_program":
            rest = inp.get("program", "")
            if inp.get("args"):
                rest += " " + inp["args"]
            return "🤖→ " + run_program(cfg, rest)
        if name == "file_op":
            op = inp.get("op", "")
            parts = [op, inp.get("src", "")]
            if inp.get("dst"):
                parts.append(inp["dst"])
            return "🤖→ " + handle_files(cfg, " ".join(p for p in parts if p))
        if name == "memo":
            return "🤖→ " + add_memo(cfg, inp.get("text", ""))
        if name == "reply":
            return "🤖 " + inp.get("text", "")
    except SafetyError as e:
        return f"🚫 (AI 요청이 보안 정책에 막힘) {e}"

    return f"알 수 없는 AI 결정: {name}"
