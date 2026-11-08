"""개인정보 보호 도구.

* 가명 처리(기본값): Claude 로 보내기 전에 참여자 이름을 '상대1', '상대2' 로, 본인 이름을
  '[본인]' 으로 바꾸고, 전화번호·이메일·계좌/카드번호·주민/외국인등록번호처럼 보이는 문자열을 가린다.
  받은 결과에서는 '상대N' 을 원래 이름으로 되돌리면서 뒤에 붙은 조사(이/가, 은/는, 아/야 …)를
  실제 이름의 받침에 맞게 고친다. 가린 번호는 되돌리지 않는다.
* 로그용 요약: 이름과 내용 대신 개수만 남긴다.

이름 찾기 규칙: 이름 **앞**은 단어 경계여야 하고, 이름 **뒤**는 조사(가, 는, 한테, 까지 …)나 단어
경계만 올 수 있다. 그래서 '민수가/민수 말대로' 는 바뀌고 '지수함수' 는 그대로다. 단, 이름이 흔한
낱말과 같으면('하나', '우리') '하나도 몰라' 같은 문장을 망가뜨리지 않도록 부르는 꼴(야, 님, 씨 …)에서만 바꾼다.

한계: 대화에 참여하지 않은 제3자의 이름(예: "지은이도 온대")은 알아낼 방법이 없어 가리지 못한다.
"""

from __future__ import annotations

import re
from dataclasses import replace

from .parser import Chat

# ------------------------------------------------------------------ 식별정보 가림

# 한글은 \w 로 취급돼 '010-1234-5678로' 에서 \b 가 동작하지 않으므로 숫자 경계를 직접 쓴다.
_D0 = r"(?<!\d)"
_D1 = r"(?!\d)"
_YYMMDD = r"\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])"
_SEP = r"\s*[-.]\s*|\s"
_DATE = re.compile(r"^(?:(?:19|20)?\d{2})[-.\s](?:0?[1-9]|1[0-2])[-.\s](?:0?[1-9]|[12]\d|3[01])$")
_NOT_AMOUNT = r"(?!\s*(?:원|만원|천원|달러|개|명|번째|회|위|건|장|권|시|분|초|년|월|일|kg|g|km|m|%))"

_PATTERNS = [
    (re.compile(_D0 + _YYMMDD + r"\s*-?\s*[1-8]\d{6}" + _D1), "[주민번호]"),  # 외국인등록번호(5~8)도 포함
    (re.compile(r"\+82(?:" + _SEP + r")?1[016789](?:" + _SEP + r")?\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"01[016789](?:" + _SEP + r")?\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"0\d{1,2}(?:" + _SEP + r")\d{3,4}(?:" + _SEP + r")\d{4}" + _D1), "[전화번호]"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}"), "[이메일]"),
]
# 하이픈/공백으로 끊긴 숫자 묶음(계좌·카드번호). 숫자가 10개 이상일 때만 가린다.
_GROUPED = re.compile(_D0 + r"\d{2,6}(?:[ -]\d{2,8}){1,4}" + _D1 + _NOT_AMOUNT)
_PLAIN = re.compile(_D0 + r"\d{10,16}" + _D1 + _NOT_AMOUNT)


def _mask_grouped(m: re.Match) -> str:
    raw = m.group(0)
    if _DATE.match(raw) or sum(c.isdigit() for c in raw) < 10:
        return raw
    return "[계좌/카드번호]"


def mask_identifiers(text: str) -> str:
    for pattern, label in _PATTERNS:
        text = pattern.sub(label, text)
    text = _GROUPED.sub(_mask_grouped, text)
    return _PLAIN.sub("[계좌/카드번호]", text)


# ------------------------------------------------------------------ 이름 후보 만들기

_PARTICLES = [
    # 조사
    "이", "가", "은", "는", "을", "를", "의", "도", "만", "와", "과", "랑", "이랑", "하고", "한테", "한테서",
    "에게", "에게서", "께", "께서", "까지", "부터", "보다", "처럼", "로", "으로", "나", "이나", "든", "이든",
    "네", "요", "이요", "라고", "이라고", "란", "이란",
    # 호칭·부르는 꼴
    "야", "아", "님", "씨", "군", "양", "형", "누나", "언니", "오빠", "쌤", "선배",
    # 서술격
    "이야", "이에요", "예요", "이었", "였", "인데", "이고", "이지", "이네", "이니", "이라",
]
_ADDRESS = ["야", "아", "님", "씨", "이가", "이는", "이도", "이랑", "이한테", "이야", "한테", "에게", "형", "누나", "언니", "오빠", "쌤", "선배"]

# 흔한 낱말 이름은 '하나님', '우리한테' 같은 말과 겹치지 않게 님·한테·에게 도 뺀다.
_ADDRESS_COMMON = [x for x in _ADDRESS if x not in ("님", "한테", "에게")]

# 사람 이름으로도 쓰이지만 흔한 낱말인 것들: 부르는 꼴에서만 이름으로 본다.
_COMMON_WORDS = {
    "하나", "우리", "나라", "하늘", "보람", "가을", "여름", "겨울", "봄", "바다", "사랑", "기쁨", "슬기", "이슬",
    "노을", "미소", "소망", "마음", "구름", "별", "솔", "다운", "한결", "나리", "진주", "은하", "새봄", "가람",
    "아름", "초롱", "샛별", "누리", "한별", "단비", "보라", "푸름", "그루", "다솜", "예쁜", "지혜", "수호",
}
# 닉네임에 붙는 직함·소속 (이름 후보에서 뺀다)
_TITLES = {
    "대리", "과장", "차장", "부장", "팀장", "실장", "사원", "주임", "선임", "책임", "수석", "이사", "대표", "사장",
    "선생님", "선생", "교수님", "교수", "쌤", "선배", "후배", "형", "누나", "언니", "오빠", "님", "회사", "본사",
    "개발팀", "디자인팀", "영업팀", "인사팀", "팀", "엄마", "아빠",
}
_WORD = r"[가-힣A-Za-z0-9]"


def _alt(words) -> str:
    return "|".join(map(re.escape, sorted(set(words), key=len, reverse=True)))


def name_forms(nickname: str) -> list[str]:
    """닉네임에서 본문에 나올 만한 이름 꼴을 뽑는다. '김민수 대리' → ['김민수 대리', '김민수', '민수']."""
    nick = nickname.strip()
    forms = [nick]
    for token in re.split(r"[\s/()\[\]|_·,]+", nick):
        if len(token) < 2 or token in _TITLES:
            continue
        forms.append(token)
        if re.fullmatch(r"[가-힣]{3}", token):
            forms.append(token[1:])  # 성을 뺀 이름
    seen: dict[str, None] = {}
    for f in forms:
        if len(f) >= 2:  # 한 글자는 본문에서 바꾸면 문장이 망가진다
            seen.setdefault(f, None)
    return list(seen)


# ------------------------------------------------------------------ 받침에 맞는 조사 고르기

def _has_batchim(ch: str) -> bool | None:
    if "가" <= ch <= "힣":
        return (ord(ch) - 0xAC00) % 28 != 0
    return None  # 한글이 아니면 판단하지 않음


def _is_rieul(ch: str) -> bool:
    return "가" <= ch <= "힣" and (ord(ch) - 0xAC00) % 28 == 8


# (받침 있을 때, 받침 없을 때)
_JOSA_PAIRS = [("이랑", "랑"), ("이에요", "예요"), ("이었", "였"), ("이야", "야"), ("이라고", "라고"), ("이나", "나"),
               ("이든", "든"), ("이고", "고"), ("이지", "지"), ("이네", "네"), ("이니", "니"), ("이라", "라"),
               ("이", "가"), ("은", "는"), ("을", "를"), ("아", "야"), ("과", "와"), ("으로", "로")]
_JOSA_LOOKUP = {}
for _with, _without in _JOSA_PAIRS:
    _JOSA_LOOKUP.setdefault(_with, (_with, _without))
    _JOSA_LOOKUP.setdefault(_without, (_with, _without))
_JOSA_RE = _alt(_JOSA_LOOKUP)


def attach_josa(name: str, josa: str) -> str:
    """이름 뒤 조사를 받침에 맞게 고친다: ('민수', '이') → '민수가', ('지은', '야') → '지은아'."""
    pair = _JOSA_LOOKUP.get(josa)
    batchim = _has_batchim(name[-1]) if name else None
    if not pair or batchim is None:
        return name + josa
    if pair == ("으로", "로"):
        return name + ("으로" if batchim and not _is_rieul(name[-1]) else "로")
    if pair == ("이야", "야") and josa == "야":
        # 상대N 뒤 '야' 는 대개 부르는 말(아/야)이다
        pair = ("아", "야")
    return name + (pair[0] if batchim else pair[1])


# ------------------------------------------------------------------ 가명 처리

class Pseudonymizer:
    ME = "[본인]"

    def __init__(self, chat: Chat, me: str | None):
        """``chat`` 은 기간 필터를 적용하기 **전** 전체 대화를 넘겨야 모든 참여자가 잡힌다."""
        self.me = me
        self.sender_map: dict[str, str] = {}
        self.backward: dict[str, str] = {}  # 상대N → 원래 닉네임
        self._given: dict[str, str] = {}    # 상대N → 부를 때 쓰는 이름 (김민수 → 민수)
        forms_full: dict[str, str] = {}     # 본문 꼴 → 별칭 (닉네임 그대로)
        forms_derived: dict[str, str] = {}  # 본문 꼴 → 별칭 (닉네임에서 뽑은 것)

        n = 0
        for name in chat.participants:
            if name == me:
                alias = self.ME
            else:
                n += 1
                alias = f"상대{n}"
                self.backward[alias] = name
            self.sender_map[name] = alias
            forms = name_forms(name)
            if forms:
                forms_full.setdefault(forms[0], alias)
            for f in forms[1:]:
                forms_derived.setdefault(f, alias)
            given = [f for f in forms if re.fullmatch(r"[가-힣]{2}", f)]
            if alias != self.ME and given:
                self._given[alias] = given[-1]

        # 방 제목: 단체방 제목('가족', '팀 프로젝트')은 사람이 아니다. 1:1 방에서 상대가 한 번도 말하지 않은
        # 경우에만 제목을 새 사람으로 본다. 제목이 이미 아는 사람의 이름 꼴이면 그 사람 별칭을 쓴다.
        others = [p for p in chat.participants if p != me]
        title = re.sub(r"\s+\d+$", "", chat.title or "").strip()  # 'Android 단체방 제목 4' 의 인원수
        if title and not others and title not in forms_full and title not in forms_derived \
                and re.fullmatch(r"[가-힣A-Za-z ]{2,12}", title):
            n += 1
            alias = f"상대{n}"
            self.backward[alias] = title
            for f in name_forms(title):
                if f not in _TITLES:
                    forms_derived.setdefault(f, alias)

        # 다른 사람의 '닉네임 그대로' 와 겹치는 뽑은 꼴은 버린다 (김민수 의 '민수' vs 참여자 '민수').
        self._forms = dict(forms_derived)
        self._forms.update(forms_full)
        normal = [f for f in self._forms if f not in _COMMON_WORDS]
        common = [f for f in self._forms if f in _COMMON_WORDS]
        self._regexes = []
        if normal:
            self._regexes.append(re.compile(
                rf"(?<!{_WORD})(?:{_alt(normal)})(?=(?:{_alt(_PARTICLES)}){{0,3}}(?!{_WORD}))", re.IGNORECASE))
        if common:
            self._regexes.append(re.compile(
                rf"(?<!{_WORD})(?:{_alt(common)})(?=(?:{_alt(_ADDRESS_COMMON)}){{1,2}}(?!{_WORD}))"))
        self._lower = {k.lower(): v for k, v in self._forms.items()}
        aliases = list(self.backward) + [self.ME]
        self._restore_re = re.compile(rf"({_alt(aliases)})(?!\d)({_JOSA_RE})?")

    def text(self, text: str) -> str:
        # 번호를 먼저 가린다. 이름을 먼저 바꾸면 '민수9001011234567' 처럼 별칭 숫자가 번호에 붙어 버린다.
        text = mask_identifiers(text)
        for rx in self._regexes:
            text = rx.sub(lambda m: self._lower.get(m.group(0).lower(), m.group(0)), text)
        return text

    def apply(self, chat: Chat) -> Chat:
        msgs = [replace(m, sender=self.sender_map.get(m.sender, m.sender), text=self.text(m.text))
                for m in chat.messages]
        return Chat(title=self.text(chat.title) if chat.title else chat.title, saved_at=chat.saved_at,
                    saved_at_estimated=chat.saved_at_estimated, messages=msgs)

    def restore(self, text: str) -> str:
        def sub(m: re.Match) -> str:
            alias, josa = m.group(1), m.group(2) or ""
            if alias == self.ME:
                name = self.me or "나"
            elif josa in ("아", "야") and alias in self._given:
                name = self._given[alias]  # 부를 때는 성을 뺀 이름: 김민수 → 민수야
            else:
                name = self.backward[alias]
            return attach_josa(name, josa) if josa else name
        return self._restore_re.sub(sub, text)


def log_summary(chat: Chat) -> str:
    """로그에 남겨도 되는 정보만: 이름·내용 없이 개수만."""
    return f"messages={len(chat.messages)} participants={len(chat.participants)}"
