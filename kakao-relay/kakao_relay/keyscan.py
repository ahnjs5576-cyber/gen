"""KakaoTalk.exe 메모리에서 SQLCipher 키 후보를 스캔하고, 각 방 edb 에 맞춰
keys.json 을 자동 생성한다. (윈도우 전용)

원리
----
카카오톡 PC 는 대화 DB(chatLogs_*.edb)를 열 때 SQLCipher raw key 를 메모리에
올린다. 이때 keyspec 문자열이 보통 다음 형태로 존재한다:

    x'<64 hex 키><32 hex salt>'      (총 96 hex)

이 문자열을 OpenProcess + ReadProcessMemory 로 읽어 후보로 모은 뒤, 각 방의
edb 에 하나씩 시험 복호화해서 맞는 키를 그 방의 키로 확정한다.

중요한 제약
----------
- **그 채팅방을 한 번 열어야** 그 방의 키가 메모리에 올라온다(현재 공개 분석 기준).
  → 지시받을 방(특정인 톡방, 단톡방)을 각각 한 번씩 연 뒤 추출을 돌려야 한다.
  (이 한 번이 그 방을 읽음 처리하는 유일한 순간)
- 같은 사용자 권한으로 실행해야 하며, 안되면 **관리자 권한**으로 실행한다.
- 카카오톡 버전이 keyspec 형식을 바꾸면 스캔 패턴을 조정해야 한다.
- 본인 PC·본인 계정에 한해 사용한다.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from .config import Config
from .kakaodb import discover_user_dir, find_key_for_edb, list_room_chat_ids
from .log import get_logger

log = get_logger(__name__)

DEFAULT_PROCESS = "KakaoTalk.exe"

# 메모리에서 찾을 keyspec: x'....' 안에 96 hex (키+salt) 또는 64 hex (키만)
_KEYSPEC_RE = re.compile(rb"x'([0-9a-fA-F]{96})'|x'([0-9a-fA-F]{64})'")
# keyspec 래퍼 없이 떠다니는 96/64 hex 도 보조 후보로 (앞뒤가 hex 가 아닌 것)
_BARE_HEX_RE = re.compile(rb"(?<![0-9a-fA-F])([0-9a-fA-F]{96}|[0-9a-fA-F]{64})(?![0-9a-fA-F])")


def is_windows() -> bool:
    return sys.platform.startswith("win")


# ---------------------------------------------------------------------------
# Windows 메모리 읽기 (ctypes)
# ---------------------------------------------------------------------------

def _find_pids(process_name: str) -> list[int]:
    import ctypes
    from ctypes import wintypes

    TH32CS_SNAPPROCESS = 0x00000002

    class PROCESSENTRY32(ctypes.Structure):
        _fields_ = [
            ("dwSize", wintypes.DWORD),
            ("cntUsage", wintypes.DWORD),
            ("th32ProcessID", wintypes.DWORD),
            ("th32DefaultHeapID", ctypes.POINTER(ctypes.c_ulong)),
            ("th32ModuleID", wintypes.DWORD),
            ("cntThreads", wintypes.DWORD),
            ("th32ParentProcessID", wintypes.DWORD),
            ("pcPriClassBase", ctypes.c_long),
            ("dwFlags", wintypes.DWORD),
            ("szExeFile", ctypes.c_char * 260),
        ]

    kernel32 = ctypes.windll.kernel32
    snap = kernel32.CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0)
    if snap == -1:
        return []
    pids: list[int] = []
    try:
        entry = PROCESSENTRY32()
        entry.dwSize = ctypes.sizeof(PROCESSENTRY32)
        if not kernel32.Process32First(snap, ctypes.byref(entry)):
            return []
        target = process_name.lower().encode()
        while True:
            if entry.szExeFile.lower() == target:
                pids.append(int(entry.th32ProcessID))
            if not kernel32.Process32Next(snap, ctypes.byref(entry)):
                break
    finally:
        kernel32.CloseHandle(snap)
    return pids


def _scan_pid(pid: int, max_region: int = 64 * 1024 * 1024) -> set[str]:
    """한 프로세스의 읽기 가능한 커밋 영역을 훑어 keyspec/hex 후보를 모은다."""
    import ctypes
    from ctypes import wintypes

    PROCESS_QUERY_INFORMATION = 0x0400
    PROCESS_VM_READ = 0x0010
    MEM_COMMIT = 0x1000
    PAGE_GUARD = 0x100
    PAGE_NOACCESS = 0x01
    # 읽기 가능한 보호 속성
    READABLE = {0x02, 0x04, 0x20, 0x40, 0x08, 0x80}  # RO/RW/EXEC_READ 등

    class MEMORY_BASIC_INFORMATION(ctypes.Structure):
        _fields_ = [
            ("BaseAddress", ctypes.c_void_p),
            ("AllocationBase", ctypes.c_void_p),
            ("AllocationProtect", wintypes.DWORD),
            ("RegionSize", ctypes.c_size_t),
            ("State", wintypes.DWORD),
            ("Protect", wintypes.DWORD),
            ("Type", wintypes.DWORD),
        ]

    kernel32 = ctypes.windll.kernel32
    kernel32.OpenProcess.restype = wintypes.HANDLE
    kernel32.OpenProcess.argtypes = [wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]

    h = kernel32.OpenProcess(
        PROCESS_QUERY_INFORMATION | PROCESS_VM_READ, False, pid
    )
    if not h:
        log.warning("OpenProcess 실패 (pid=%s). 관리자 권한으로 실행해 보세요.", pid)
        return set()

    found: set[str] = set()
    try:
        VirtualQueryEx = kernel32.VirtualQueryEx
        VirtualQueryEx.restype = ctypes.c_size_t
        VirtualQueryEx.argtypes = [
            wintypes.HANDLE,
            ctypes.c_void_p,
            ctypes.POINTER(MEMORY_BASIC_INFORMATION),
            ctypes.c_size_t,
        ]
        ReadProcessMemory = kernel32.ReadProcessMemory
        ReadProcessMemory.argtypes = [
            wintypes.HANDLE,
            ctypes.c_void_p,
            ctypes.c_void_p,
            ctypes.c_size_t,
            ctypes.POINTER(ctypes.c_size_t),
        ]

        mbi = MEMORY_BASIC_INFORMATION()
        addr = 0
        # 사용자 공간 상한 (64-bit)
        max_addr = 0x7FFFFFFF0000
        while addr < max_addr:
            res = VirtualQueryEx(h, ctypes.c_void_p(addr), ctypes.byref(mbi), ctypes.sizeof(mbi))
            if res == 0:
                break
            region_size = int(mbi.RegionSize)
            base = int(mbi.BaseAddress or 0)
            protect = int(mbi.Protect)
            state = int(mbi.State)
            readable = (
                state == MEM_COMMIT
                and not (protect & PAGE_GUARD)
                and protect != PAGE_NOACCESS
                and (protect & 0xFF) in READABLE
            )
            if readable and 0 < region_size <= max_region:
                buf = (ctypes.c_char * region_size)()
                nread = ctypes.c_size_t(0)
                ok = ReadProcessMemory(
                    h, ctypes.c_void_p(base), buf, region_size, ctypes.byref(nread)
                )
                if ok and nread.value:
                    data = bytes(buf[: nread.value])
                    _extract_from_bytes(data, found)
            next_addr = base + region_size
            if next_addr <= addr:
                break
            addr = next_addr
    finally:
        kernel32.CloseHandle(h)
    return found


def _extract_from_bytes(data: bytes, found: set[str]) -> None:
    for m in _KEYSPEC_RE.finditer(data):
        hexs = m.group(1) or m.group(2)
        found.add(hexs.decode("ascii").lower())
    # keyspec 래퍼가 없을 수도 있어 보조 수집 (과다 수집 방지 위해 키스펙 우선)
    for m in _BARE_HEX_RE.finditer(data):
        found.add(m.group(1).decode("ascii").lower())


def scan_candidates(process_name: str = DEFAULT_PROCESS) -> list[str]:
    """실행 중인 카카오톡 프로세스들에서 키 후보(hex)를 모은다. 96hex 우선 정렬."""
    if not is_windows():
        log.error("메모리 스캔은 윈도우에서만 동작합니다 (현재: %s).", sys.platform)
        return []
    pids = _find_pids(process_name)
    if not pids:
        log.error("%s 프로세스를 찾지 못했습니다. 카카오톡이 실행 중인지 확인하세요.", process_name)
        return []
    log.info("%s pid=%s 스캔 중...", process_name, pids)
    cands: set[str] = set()
    for pid in pids:
        cands |= _scan_pid(pid)
    # 96hex(키+salt)를 먼저 시도하도록 정렬
    ordered = sorted(cands, key=lambda h: (len(h) != 96, h))
    log.info("키 후보 %d개 수집 (96hex %d개).", len(ordered), sum(1 for h in ordered if len(h) == 96))
    return ordered


# ---------------------------------------------------------------------------
# 오케스트레이션: 후보 → 방별 검증 → keys.json
# ---------------------------------------------------------------------------

def extract_keys(cfg: Config, keys_path: Path, process_name: str = DEFAULT_PROCESS) -> dict:
    """메모리 스캔 + 방별 시험 복호화로 keys.json 을 갱신.

    반환: {"matched": {chatId: key}, "unmatched": [chatId...], "candidates": n}
    기존 keys.json 의 키는 보존(이번에 안 열린 방 유지).
    """
    import json

    user_dir = discover_user_dir(cfg.user_dir)
    log.info("사용자 폴더: %s", user_dir)

    # 대상 방: 설정에 지정된 방 우선, 없으면 chat_data 의 모든 방
    target_ids = cfg.allowed_chat_ids or list_room_chat_ids(user_dir)
    if not target_ids:
        log.error("대상 방을 찾지 못했습니다 (chat_data 비어있음?).")
        return {"matched": {}, "unmatched": [], "candidates": 0}

    candidates = scan_candidates(process_name)
    if not candidates:
        return {"matched": {}, "unmatched": list(target_ids), "candidates": 0}

    # 기존 키 로드(병합용)
    existing: dict[str, str] = {}
    if keys_path.exists():
        try:
            existing = {str(k): str(v) for k, v in json.loads(keys_path.read_text("utf-8")).items()}
        except Exception:
            existing = {}

    matched: dict[str, str] = {}
    unmatched: list[str] = []
    for cid in target_ids:
        key = find_key_for_edb(user_dir, cid, candidates, cfg.cipher, cfg.sqlcipher_exe)
        if key:
            matched[cid] = key
            log.info("✅ 방 %s 키 확정", cid)
        else:
            unmatched.append(cid)
            log.warning("❌ 방 %s 키 못 찾음 (방을 한 번 열고 다시 시도)", cid)

    merged = {**existing, **matched}
    keys_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    log.info("keys.json 저장: 총 %d개 방 (이번 신규/갱신 %d개)", len(merged), len(matched))

    return {"matched": matched, "unmatched": unmatched, "candidates": len(candidates)}
