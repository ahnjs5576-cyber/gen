"""API 키 보관: 운영체제의 안전한 비밀 저장소(macOS 키체인 등)를 사용한다.

`keyring` 패키지가 있으면 키체인에 저장/조회하고, 없으면 SDK 기본 방식
(ANTHROPIC_API_KEY 환경변수 또는 `ant auth login` 프로필)에 맡긴다.
키를 평문 파일에 저장하지 않는다.
"""

from __future__ import annotations

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
    kr.set_password(SERVICE, ACCOUNT, value)


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

    key = get_api_key()
    return anthropic.Anthropic(api_key=key) if key else anthropic.Anthropic()
