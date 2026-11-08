"""API 키 보관: 운영체제의 안전한 비밀 저장소(macOS 키체인 등)를 사용한다.

키를 찾는 순서:
1. `KAKAO_REPLY_API_KEY` 환경변수 — 클라우드 개발 환경처럼 키체인이 없는 곳용. 이 키를 쓸 때는
   다른 프로그램이 설정해 둔 ANTHROPIC_BASE_URL 에 끌려가지 않도록 api.anthropic.com 으로 직접 보낸다
   (바꾸려면 `KAKAO_REPLY_BASE_URL`).
2. 운영체제 키체인 (`kakao-reply key set` 으로 저장한 것)
3. SDK 기본 방식 (ANTHROPIC_API_KEY 환경변수 또는 `ant auth login` 프로필)
키를 평문 파일에 저장하지 않는다.
"""

from __future__ import annotations

import os

ENV_KEY = "KAKAO_REPLY_API_KEY"
ENV_BASE_URL = "KAKAO_REPLY_BASE_URL"
DEFAULT_BASE_URL = "https://api.anthropic.com"

SERVICE = "kakao-reply"
ACCOUNT = "anthropic-api-key"


def _keyring():
    try:
        import keyring  # type: ignore
    except ImportError:
        return None
    return keyring


def get_api_key() -> str | None:
    kr = _keyring()
    if kr is None:
        return None
    try:
        return kr.get_password(SERVICE, ACCOUNT)
    except Exception:
        return None


def set_api_key(value: str) -> None:
    kr = _keyring()
    if kr is None:
        raise RuntimeError("키체인 저장에는 keyring 패키지가 필요합니다: pip install keyring")
    try:
        kr.set_password(SERVICE, ACCOUNT, value)
    except Exception as e:  # keyring 백엔드 오류는 영어라 한국어로 감싼다
        raise RuntimeError(f"키체인에 저장하지 못했습니다 ({type(e).__name__}). "
                           "ANTHROPIC_API_KEY 환경변수를 대신 쓸 수 있습니다.") from None


def delete_api_key() -> bool:
    kr = _keyring()
    if kr is None:
        return False
    try:
        kr.delete_password(SERVICE, ACCOUNT)
        return True
    except Exception:
        return False


def make_client():
    import anthropic

    if env_key := os.environ.get(ENV_KEY, "").strip():
        return anthropic.Anthropic(api_key=env_key, base_url=os.environ.get(ENV_BASE_URL) or DEFAULT_BASE_URL)
    key = get_api_key()
    return anthropic.Anthropic(api_key=key) if key else anthropic.Anthropic()
