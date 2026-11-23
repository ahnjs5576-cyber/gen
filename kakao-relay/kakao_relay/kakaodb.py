"""카카오톡 PC chatLogs_*.edb 복호화 및 신규 메시지 추출.

- 암호화: SQLCipher4 (방마다 다른 키).
- 읽음표시: DB 파일을 직접 읽기만 하므로, 채팅방을 열지 않는다 → 읽음 처리되지 않음.
  (키를 처음 확보할 때 방을 한 번 여는 것은 keyprovider/README 쪽의 별도 단계)
- 사용 중인 DB에 안전하게 접근하려고 edb(+-wal,-shm)를 임시로 복사해서 읽습니다.

백엔드:
  1) sqlcipher3 (파이썬 모듈)  ← 기본
  2) sqlcipher.exe CLI 로 평문 export 후 stdlib sqlite3 로 읽기  ← 폴백
"""
from __future__ import annotations

import os
import shutil
import sqlite3
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

from .config import CipherConfig
from .log import get_logger

log = get_logger(__name__)


@dataclass
class Message:
    chat_id: str
    log_id: int
    user_id: str
    type: int | None
    text: str
    created: int | None


class DecryptError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# 경로 탐색
# ---------------------------------------------------------------------------

def discover_user_dir(configured: str = "") -> Path:
    """카카오톡 사용자 데이터 폴더(chat_data 상위)를 찾는다."""
    if configured:
        p = Path(configured)
        if not p.exists():
            raise FileNotFoundError(f"지정한 user_dir 가 없습니다: {p}")
        return p

    local = os.environ.get("LOCALAPPDATA")
    if not local:
        raise FileNotFoundError(
            "LOCALAPPDATA 환경변수가 없습니다. config 에서 user_dir 를 직접 지정하세요."
        )
    users_root = Path(local) / "Kakao" / "KakaoTalk" / "users"
    if not users_root.exists():
        raise FileNotFoundError(
            f"카카오톡 사용자 폴더를 찾지 못했습니다: {users_root}\n"
            f"config 에서 user_dir 를 직접 지정하세요."
        )
    candidates = [d for d in users_root.iterdir() if (d / "chat_data").exists()]
    if not candidates:
        raise FileNotFoundError(
            f"{users_root} 아래에서 chat_data 폴더를 찾지 못했습니다."
        )
    if len(candidates) > 1:
        log.warning(
            "사용자 폴더가 여러 개입니다. 첫 번째를 사용합니다: %s "
            "(원하면 config user_dir 로 지정)",
            candidates[0],
        )
    return candidates[0]


def edb_path(user_dir: Path, chat_id: str) -> Path:
    return user_dir / "chat_data" / f"chatLogs_{chat_id}.edb"


# ---------------------------------------------------------------------------
# 읽기용 임시 복사
# ---------------------------------------------------------------------------

def _copy_for_read(edb: Path) -> tuple[Path, Path]:
    """edb(+ -wal, -shm)를 임시 폴더에 복사. (복사본 경로, 임시폴더) 반환."""
    if not edb.exists():
        raise FileNotFoundError(f"edb 파일이 없습니다: {edb}")
    tmpdir = Path(tempfile.mkdtemp(prefix="kakrelay_"))
    dst = tmpdir / edb.name
    shutil.copy2(edb, dst)
    for suffix in ("-wal", "-shm"):
        side = edb.with_name(edb.name + suffix)
        if side.exists():
            shutil.copy2(side, tmpdir / side.name)
    return dst, tmpdir


# ---------------------------------------------------------------------------
# 백엔드 1: sqlcipher3 모듈
# ---------------------------------------------------------------------------

def _try_import_sqlcipher():
    try:
        import sqlcipher3  # type: ignore

        return sqlcipher3
    except Exception:
        try:
            from pysqlcipher3 import dbapi2 as sqlcipher3  # type: ignore

            return sqlcipher3
        except Exception:
            return None


def _apply_pragmas(cur, key_hex: str, cipher: CipherConfig) -> None:
    cur.execute(f"PRAGMA key = \"x'{key_hex}'\"")
    cur.execute(f"PRAGMA cipher_page_size = {cipher.page_size}")
    cur.execute(f"PRAGMA kdf_iter = {cipher.kdf_iter}")
    cur.execute(f"PRAGMA cipher_hmac_algorithm = {cipher.hmac_algorithm}")
    cur.execute(f"PRAGMA cipher_kdf_algorithm = {cipher.kdf_algorithm}")


def _open_sqlcipher(copy_path: Path, key_hex: str, cipher: CipherConfig):
    mod = _try_import_sqlcipher()
    if mod is None:
        raise DecryptError("sqlcipher3 모듈 없음")
    conn = mod.connect(str(copy_path))
    cur = conn.cursor()
    _apply_pragmas(cur, key_hex, cipher)
    # 키 검증: 실패하면 예외
    cur.execute("SELECT count(*) FROM sqlite_master")
    cur.fetchone()
    return conn


# ---------------------------------------------------------------------------
# 백엔드 2: sqlcipher.exe CLI 로 평문 export
# ---------------------------------------------------------------------------

def _export_with_cli(
    copy_path: Path, key_hex: str, cipher: CipherConfig, exe: str, tmpdir: Path
) -> Path:
    plain = tmpdir / "plain.sqlite"
    script = "\n".join(
        [
            f"PRAGMA key = \"x'{key_hex}'\";",
            f"PRAGMA cipher_page_size = {cipher.page_size};",
            f"PRAGMA kdf_iter = {cipher.kdf_iter};",
            f"PRAGMA cipher_hmac_algorithm = {cipher.hmac_algorithm};",
            f"PRAGMA cipher_kdf_algorithm = {cipher.kdf_algorithm};",
            f"ATTACH DATABASE '{plain.as_posix()}' AS plaintext KEY '';",
            "SELECT sqlcipher_export('plaintext');",
            "DETACH DATABASE plaintext;",
            ".quit",
        ]
    )
    proc = subprocess.run(
        [exe, str(copy_path)],
        input=script,
        text=True,
        capture_output=True,
        timeout=120,
    )
    if proc.returncode != 0 or not plain.exists():
        raise DecryptError(
            f"sqlcipher.exe export 실패: {proc.stderr.strip() or proc.stdout.strip()}"
        )
    return plain


# ---------------------------------------------------------------------------
# 공개 API
# ---------------------------------------------------------------------------

class RoomReader:
    """한 방(edb 하나)에 대한 복호화 읽기 세션."""

    def __init__(self, copy_path: Path, tmpdir: Path, conn, cipher: CipherConfig):
        self._copy = copy_path
        self._tmpdir = tmpdir
        self._conn = conn
        self._cipher = cipher
        self._conn.row_factory = sqlite3.Row

    def inspect(self) -> dict[str, list[str]]:
        cur = self._conn.cursor()
        cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cur.fetchall()]
        out: dict[str, list[str]] = {}
        for t in tables:
            try:
                cur.execute(f"PRAGMA table_info('{t}')")
                out[t] = [r[1] for r in cur.fetchall()]
            except Exception:
                out[t] = []
        return out

    def max_log_id(self) -> int:
        c = self._cipher
        cur = self._conn.cursor()
        cur.execute(f"SELECT MAX({c.col_logid}) FROM {c.table}")
        row = cur.fetchone()
        return int(row[0]) if row and row[0] is not None else 0

    def read_after(self, chat_id: str, since_log_id: int) -> list[Message]:
        c = self._cipher
        cur = self._conn.cursor()
        cur.execute(
            f"SELECT {c.col_logid}, {c.col_userid}, {c.col_type}, "
            f"{c.col_message}, {c.col_created} "
            f"FROM {c.table} WHERE {c.col_logid} > ? "
            f"ORDER BY {c.col_logid} ASC",
            (since_log_id,),
        )
        msgs: list[Message] = []
        for r in cur.fetchall():
            msgs.append(
                Message(
                    chat_id=str(chat_id),
                    log_id=int(r[0]),
                    user_id=str(r[1]) if r[1] is not None else "",
                    type=int(r[2]) if r[2] is not None else None,
                    text=r[3] if isinstance(r[3], str) else ("" if r[3] is None else str(r[3])),
                    created=int(r[4]) if r[4] is not None else None,
                )
            )
        return msgs

    def close(self) -> None:
        try:
            self._conn.close()
        except Exception:
            pass
        shutil.rmtree(self._tmpdir, ignore_errors=True)

    def __enter__(self) -> "RoomReader":
        return self

    def __exit__(self, *exc) -> None:
        self.close()


def open_room(
    user_dir: Path,
    chat_id: str,
    key_hex: str,
    cipher: CipherConfig,
    sqlcipher_exe: str = "",
) -> RoomReader:
    """방 edb 를 복호화해 읽기 세션을 연다. 실패 시 DecryptError."""
    edb = edb_path(user_dir, chat_id)
    copy_path, tmpdir = _copy_for_read(edb)
    try:
        # 백엔드 1
        try:
            conn = _open_sqlcipher(copy_path, key_hex, cipher)
            return RoomReader(copy_path, tmpdir, conn, cipher)
        except DecryptError:
            pass
        except Exception as e:
            # 키 불일치/모듈 이슈 — CLI 폴백 시도 전 기록
            log.debug("sqlcipher3 백엔드 실패: %s", e)

        # 백엔드 2 (CLI)
        if sqlcipher_exe:
            plain = _export_with_cli(copy_path, key_hex, cipher, sqlcipher_exe, tmpdir)
            conn = sqlite3.connect(str(plain))
            return RoomReader(copy_path, tmpdir, conn, cipher)

        raise DecryptError(
            "복호화 실패: sqlcipher3 모듈이 없거나 키/파라미터가 맞지 않습니다. "
            "config 의 [kakao.cipher] 값과 keys.json 키를 확인하거나 sqlcipher_exe 를 지정하세요."
        )
    except Exception:
        shutil.rmtree(tmpdir, ignore_errors=True)
        raise
