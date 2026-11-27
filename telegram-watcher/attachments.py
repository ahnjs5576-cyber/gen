"""첨부파일 읽기: 사진, PDF, 한글(HWP/HWPX), 워드/엑셀/파워포인트, 텍스트.

첨부파일을 내려받아도(`download_media`) 텔레그램 서버에 읽음 신호는 가지 않습니다.
음성메시지의 '들음' 표시(readMessageContents)도 호출하지 않습니다.

- 사진/이미지 → Claude가 직접 봄 (image 블록)
- PDF        → Claude가 직접 읽음 (document 블록, 스캔본·표·그림 포함)
- 그 밖의 문서 → 여기서 글자를 뽑아 텍스트로 전달
"""
from __future__ import annotations

import base64
import io
import re
import struct
import zipfile
import zlib
from dataclasses import dataclass
from xml.etree import ElementTree as ET

MAX_DOWNLOAD = 20 * 1024 * 1024      # 20MB 넘는 파일은 내려받지 않음
MAX_IMAGE_BYTES = 7 * 1024 * 1024    # base64 10MB 제한 안쪽
MAX_IMAGE_SIDE = 2576                # 이보다 크면 줄여서 보냄 (Pillow 있을 때)
HARD_IMAGE_SIDE = 3000               # Pillow 없이 이보다 크면 미리보기 이미지로 대체
MAX_TEXT_CHARS = 100_000

IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
TEXT_EXT = {".txt", ".csv", ".tsv", ".md", ".json", ".log", ".xml", ".html", ".htm",
            ".py", ".js", ".ts", ".java", ".c", ".cpp", ".sql", ".yaml", ".yml", ".ini", ".srt"}


@dataclass
class Attachment:
    kind: str            # image | pdf | text | none
    name: str
    media_type: str = ""
    data: bytes = b""
    text: str = ""
    note: str = ""

    def summary(self) -> str:
        size = f", {len(self.data) // 1024}KB" if self.data else ""
        return f"[첨부: {self.name}{size}]" + (f" {self.note}" if self.note else "")


# ── 메시지에서 첨부 종류 파악 + 내려받기 ─────────────────
def _ext(name: str) -> str:
    m = re.search(r"\.[A-Za-z0-9]+$", name or "")
    return m.group(0).lower() if m else ""


async def fetch(client, msg) -> Attachment:
    """메시지의 첨부를 내려받아 Attachment 로 만든다 (읽음 처리 없음)."""
    if not msg.media:
        return Attachment("none", "", note="첨부파일이 없는 메시지예요.")

    if msg.photo:
        data = await client.download_media(msg, file=bytes)
        return _image(Attachment("image", "사진.jpg", "image/jpeg", data))

    if msg.voice or msg.audio:
        return Attachment("none", "음성/오디오", note="음성·오디오는 아직 읽을 수 없어요.")

    if msg.video or msg.gif or msg.video_note:
        thumb = await client.download_media(msg, file=bytes, thumb=-1)
        if thumb:
            return _image(Attachment("image", "동영상 미리보기.jpg", "image/jpeg", thumb,
                                     note="(동영상은 미리보기 장면 한 장만 볼 수 있어요)"))
        return Attachment("none", "동영상", note="동영상은 읽을 수 없어요.")

    if msg.sticker:
        mime = msg.file.mime_type if msg.file else ""
        if mime == "image/webp":
            return _image(Attachment("image", "스티커.webp", "image/webp",
                                     await client.download_media(msg, file=bytes)))
        return Attachment("none", "스티커", note="움직이는 스티커는 볼 수 없어요.")

    if msg.document:
        name = (msg.file.name if msg.file else None) or "파일"
        mime = (msg.file.mime_type if msg.file else "") or ""
        size = (msg.file.size if msg.file else 0) or 0
        if size > MAX_DOWNLOAD:
            return Attachment("none", name, note=f"파일이 너무 커요 ({size // (1024*1024)}MB, 최대 20MB).")
        data = await client.download_media(msg, file=bytes)
        att = parse_file(name, mime, data)
        if att.kind == "image" and att.note.startswith("TOO_BIG"):
            thumb = await client.download_media(msg, file=bytes, thumb=-1)
            if thumb:
                return Attachment("image", name, "image/jpeg", thumb,
                                  note="(원본이 너무 커서 저해상도 미리보기로 봤어요)")
            return Attachment("none", name, note="이미지가 너무 커서 볼 수 없어요.")
        return att

    if msg.geo or msg.venue:
        g = msg.geo
        return Attachment("text", "위치", text=f"위도 {g.lat}, 경도 {g.long}" if g else "위치 정보")
    if msg.poll:
        p = msg.poll.poll
        opts = "\n".join(f"- {a.text.text if hasattr(a.text, 'text') else a.text}" for a in p.answers)
        q = p.question.text if hasattr(p.question, "text") else p.question
        return Attachment("text", "투표", text=f"투표: {q}\n{opts}")
    if msg.contact:
        c = msg.contact
        return Attachment("text", "연락처", text=f"{c.first_name} {c.last_name or ''} {c.phone_number}")
    return Attachment("none", "미디어", note="이 종류의 첨부는 읽을 수 없어요.")


# ── 파일 종류별 처리 ──────────────────────────────────
def parse_file(name: str, mime: str, data: bytes) -> Attachment:
    ext = _ext(name)
    try:
        if mime in IMAGE_TYPES or ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
            mt = mime if mime in IMAGE_TYPES else {
                ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
                ".gif": "image/gif", ".webp": "image/webp"}[ext]
            return _image(Attachment("image", name, mt, data))
        if ext == ".pdf" or mime == "application/pdf":
            return Attachment("pdf", name, "application/pdf", data)
        if ext == ".hwp":
            return _text(name, data, hwp_text(data))
        if ext == ".hwpx":
            return _text(name, data, hwpx_text(data))
        if ext in (".docx", ".docm"):
            return _text(name, data, docx_text(data))
        if ext in (".xlsx", ".xlsm"):
            return _text(name, data, xlsx_text(data))
        if ext in (".pptx", ".pptm"):
            return _text(name, data, pptx_text(data))
        if ext == ".zip":
            with zipfile.ZipFile(io.BytesIO(data)) as z:
                names = "\n".join(z.namelist()[:200])
            return _text(name, data, f"(압축파일 안의 파일 목록)\n{names}")
        if ext in (".doc", ".xls", ".ppt"):
            return Attachment("none", name, note="예전 오피스 형식(.doc/.xls/.ppt)은 못 읽어요. "
                                                 "docx/xlsx/pptx 나 PDF로 받아주세요.")
        if ext in TEXT_EXT or mime.startswith("text/"):
            return _text(name, data, decode_text(data))
    except Exception as e:  # 손상된 파일 등
        return Attachment("none", name, note=f"파일을 여는 중 문제가 생겼어요: {type(e).__name__}: {e}")
    return Attachment("none", name, note=f"이 형식({ext or mime or '알 수 없음'})은 읽을 수 없어요.")


def _text(name: str, data: bytes, text: str) -> Attachment:
    text = text.strip()
    note = ""
    if not text:
        note = "(글자를 찾지 못했어요. 그림으로만 된 문서일 수 있어요)"
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]
        note = f"(너무 길어서 앞부분 {MAX_TEXT_CHARS:,}자만 읽었어요)"
    return Attachment("text", name, data=data, text=text, note=note)


def decode_text(data: bytes) -> str:
    for enc in ("utf-8-sig", "cp949", "utf-16"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("latin-1", errors="replace")


# ── 이미지 ──────────────────────────────────────────
def image_size(data: bytes) -> tuple[int, int] | None:
    """PNG/JPEG/GIF/WebP 헤더에서 가로·세로를 읽는다 (Pillow 없이)."""
    try:
        if data[:8] == b"\x89PNG\r\n\x1a\n":
            return struct.unpack(">II", data[16:24])
        if data[:6] in (b"GIF87a", b"GIF89a"):
            return struct.unpack("<HH", data[6:10])
        if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
            if data[12:16] == b"VP8X":
                w = int.from_bytes(data[24:27], "little") + 1
                h = int.from_bytes(data[27:30], "little") + 1
                return w, h
            return None
        if data[:2] == b"\xff\xd8":
            i = 2
            while i < len(data) - 9:
                if data[i] != 0xFF:
                    i += 1
                    continue
                marker = data[i + 1]
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    h, w = struct.unpack(">HH", data[i + 5:i + 9])
                    return w, h
                seg = struct.unpack(">H", data[i + 2:i + 4])[0]
                i += 2 + seg
    except Exception:
        return None
    return None


def _image(att: Attachment) -> Attachment:
    size = image_size(att.data)
    too_big = len(att.data) > MAX_IMAGE_BYTES or (size and max(size) > MAX_IMAGE_SIDE)
    if not too_big:
        return att
    try:  # Pillow 가 있으면 줄여서 보냄
        from PIL import Image
        im = Image.open(io.BytesIO(att.data))
        im.thumbnail((MAX_IMAGE_SIDE, MAX_IMAGE_SIDE))
        out = io.BytesIO()
        im.convert("RGB").save(out, "JPEG", quality=85)
        att.data, att.media_type = out.getvalue(), "image/jpeg"
        return att
    except ImportError:
        pass
    if len(att.data) > MAX_IMAGE_BYTES or (size and max(size) > HARD_IMAGE_SIDE):
        att.note = "TOO_BIG"
    return att


# ── 한글 HWP (바이너리, OLE) ─────────────────────────
HWPTAG_PARA_TEXT = 67
_INLINE_OR_EXTENDED = {1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23}


def _hwp_para_text(rec: bytes) -> str:
    out = []
    n = len(rec) // 2
    chars = struct.unpack(f"<{n}H", rec[:n * 2])
    i = 0
    while i < n:
        c = chars[i]
        if c in (10, 13):
            out.append("\n")
            i += 1
        elif c == 9:
            out.append("\t")
            i += 8
        elif c in _INLINE_OR_EXTENDED:
            i += 8          # 표·그림·각주 같은 컨트롤: 8글자 분량을 건너뜀
        elif c < 32:
            out.append({24: "-", 30: " ", 31: " "}.get(c, ""))
            i += 1
        else:
            out.append(chr(c))
            i += 1
    return "".join(out)


def _hwp_records(data: bytes):
    i, n = 0, len(data)
    while i + 4 <= n:
        header = int.from_bytes(data[i:i + 4], "little")
        i += 4
        tag, size = header & 0x3FF, (header >> 20) & 0xFFF
        if size == 0xFFF:
            size = int.from_bytes(data[i:i + 4], "little")
            i += 4
        yield tag, data[i:i + size]
        i += size


def hwp_text(data: bytes) -> str:
    try:
        import olefile
    except ImportError:
        return "(HWP를 읽으려면 olefile 패키지가 필요해요. Termux: 'tgw update' 를 실행하세요.)"
    ole = olefile.OleFileIO(io.BytesIO(data))
    try:
        header = ole.openstream("FileHeader").read()
        flags = int.from_bytes(header[36:40], "little")
        compressed, encrypted, distribution = flags & 1, flags & 2, flags & 4
        if encrypted:
            return "(암호가 걸린 한글 문서라 읽을 수 없어요)"

        def preview() -> str:
            if ole.exists("PrvText"):
                return ole.openstream("PrvText").read().decode("utf-16-le", errors="ignore")
            return ""

        if distribution:
            return "(배포용 문서라 본문 대신 미리보기 글만 읽었어요)\n" + preview()

        sections = sorted(
            (e for e in ole.listdir() if len(e) == 2 and e[0] == "BodyText" and e[1].startswith("Section")),
            key=lambda e: int(re.sub(r"\D", "", e[1]) or 0))
        paras = []
        for sec in sections:
            raw = ole.openstream(sec).read()
            if compressed:
                raw = zlib.decompress(raw, -15)
            for tag, rec in _hwp_records(raw):
                if tag == HWPTAG_PARA_TEXT:
                    t = _hwp_para_text(rec).rstrip("\n")
                    if t.strip():
                        paras.append(t)
        return "\n".join(paras) or preview()
    finally:
        ole.close()


# ── XML 기반 문서 (HWPX, DOCX, PPTX, XLSX) ──────────────
def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _xml_paragraphs(xml: bytes, para: str = "p", text: str = "t") -> str:
    root = ET.fromstring(xml)
    out: list[str] = []

    def walk(el):
        tag = _local(el.tag)
        if tag == text:
            out.append(el.text or "")
            for ch in el:  # <hp:tab/>, <hp:lineBreak/> 같은 글자 사이 기호
                out.append({"tab": "\t", "lineBreak": "\n", "br": "\n"}.get(_local(ch.tag), ""))
                out.append("".join(ch.itertext()) + (ch.tail or ""))
            return
        if tag in ("br", "lineBreak", "cr"):
            out.append("\n")
        if tag == "tab" and out:
            out.append("\t")
        for ch in el:
            walk(ch)
        if tag == para:
            out.append("\n")

    walk(root)
    text_out = "".join(out)
    return re.sub(r"\n{3,}", "\n\n", text_out)


def _num(name: str) -> int:
    m = re.search(r"(\d+)\.xml$", name)
    return int(m.group(1)) if m else 0


def hwpx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        secs = sorted((n for n in z.namelist() if re.match(r"Contents/section\d+\.xml$", n)), key=_num)
        return "\n".join(_xml_paragraphs(z.read(n)) for n in secs)


def docx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        parts = ["word/document.xml"] + sorted(
            n for n in z.namelist() if re.match(r"word/(header|footer|footnotes)\d*\.xml$", n))
        return "\n".join(_xml_paragraphs(z.read(n)) for n in parts if n in z.namelist())


def pptx_text(data: bytes) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        slides = sorted((n for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n)), key=_num)
        return "\n".join(f"[슬라이드 {_num(n)}]\n{_xml_paragraphs(z.read(n)).strip()}" for n in slides)


def xlsx_text(data: bytes, max_rows: int = 2000) -> str:
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        names = z.namelist()
        shared: list[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            shared = ["".join(si.itertext()) for si in root if _local(si.tag) == "si"]
        titles: list[str] = []
        if "xl/workbook.xml" in names:
            wb = ET.fromstring(z.read("xl/workbook.xml"))
            titles = [el.get("name", "") for el in wb.iter() if _local(el.tag) == "sheet"]
        sheets = sorted((n for n in names if re.match(r"xl/worksheets/sheet\d+\.xml$", n)), key=_num)
        out = []
        for idx, n in enumerate(sheets):
            title = titles[idx] if idx < len(titles) else f"시트{idx + 1}"
            out.append(f"[시트: {title}]")
            root = ET.fromstring(z.read(n))
            for r_i, row in enumerate(el for el in root.iter() if _local(el.tag) == "row"):
                if r_i >= max_rows:
                    out.append(f"…({max_rows}행 이후 생략)")
                    break
                cells = []
                for c in row:
                    if _local(c.tag) != "c":
                        continue
                    t = c.get("t")
                    v = next((x.text for x in c if _local(x.tag) == "v"), None)
                    if t == "s" and v is not None and v.isdigit() and int(v) < len(shared):
                        cells.append(shared[int(v)])
                    elif t == "inlineStr":
                        cells.append("".join(c.itertext()))
                    else:
                        cells.append(v or "")
                if any(x.strip() for x in cells):
                    out.append("\t".join(cells))
        return "\n".join(out)


def pdf_text(data: bytes) -> str:
    """/file 명령용 PDF 글자 추출 (pypdf 가 있을 때만). Claude는 PDF를 직접 읽으므로 필요 없음."""
    try:
        from pypdf import PdfReader
    except ImportError:
        return "(PDF 글자를 뽑으려면 pypdf 가 필요해요. Termux: 'tgw update')"
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(f"[{i + 1}쪽]\n{(p.extract_text() or '').strip()}" for i, p in enumerate(reader.pages))


# ── Claude 에게 넘길 블록 ─────────────────────────────
def to_claude_content(att: Attachment, header: str) -> list[dict]:
    head = f"{header}\n{att.summary()}"
    if att.kind == "image":
        return [{"type": "text", "text": head},
                {"type": "image", "source": {"type": "base64", "media_type": att.media_type,
                                              "data": base64.standard_b64encode(att.data).decode()}}]
    if att.kind == "pdf":
        return [{"type": "text", "text": head},
                {"type": "document", "title": att.name,
                 "source": {"type": "base64", "media_type": "application/pdf",
                            "data": base64.standard_b64encode(att.data).decode()}}]
    if att.kind == "text":
        return [{"type": "text", "text": f"{head}\n----- 파일 내용 시작 -----\n{att.text}\n----- 파일 내용 끝 -----"}]
    return [{"type": "text", "text": f"{head}\n{att.note}"}]


def to_plain_text(att: Attachment, limit: int = 8000) -> str:
    """/file 명령용: Claude 없이 글자만 보여주기."""
    if att.kind == "text":
        t = att.text
        more = f"\n…(총 {len(t):,}자 중 앞 {limit:,}자. 전체 요약은 자연어로 요청하세요)" if len(t) > limit else ""
        return f"{att.summary()}\n\n{t[:limit]}{more}"
    if att.kind == "pdf":
        t = pdf_text(att.data)
        more = f"\n…(총 {len(t):,}자 중 앞 {limit:,}자)" if len(t) > limit else ""
        return f"{att.summary()}\n\n{t[:limit]}{more}"
    if att.kind == "image":
        return f"{att.summary()}\n사진 내용은 Claude가 있어야 볼 수 있어요. 예) \"이 사진 뭐야\""
    return f"{att.summary()}\n{att.note}"
