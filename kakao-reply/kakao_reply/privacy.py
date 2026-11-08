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
_SEP = r"\s*[-.–—ㅡ]\s*|\s"
_DATE = re.compile(r"^(?:(?:19|20)?\d{2})[-.\s](?:0?[1-9]|1[0-2])[-.\s](?:0?[1-9]|[12]\d|3[01])$")
_NOT_AMOUNT = r"(?!\s*(?:원|만원|천원|달러|개|명|번째|회|위|건|장|권|시|분|초|년|월|일|kg|g|km|m|%))"

_PATTERNS = [
    (re.compile(_D0 + _YYMMDD + r"\s*-?\s*[1-8]\d{6}" + _D1), "[주민번호]"),  # 외국인등록번호(5~8)도 포함
    (re.compile(r"\+82(?:" + _SEP + r")?1[016789](?:" + _SEP + r")?\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"01[016789](?:" + _SEP + r")?\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"0\d{1,2}(?:" + _SEP + r")\d{3,4}(?:" + _SEP + r")\d{4}" + _D1), "[전화번호]"),
    (re.compile(r"\(?" + _D0 + r"0\d{1,2}\)\s*\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),  # (02) 123 4567, 031)123-4567
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}"), "[이메일]"),
]
# 하이픈으로 끊긴 숫자 묶음(계좌·사업자번호), 공백으로 끊긴 3자리 이상 묶음(계좌·카드번호).
# 숫자가 10개 이상일 때만 가리고, 날짜로 시작하면('2026-11-06 10:30') 그대로 둔다.
_GROUPED = re.compile(_D0 + r"(?:\d{2,6}(?:-\d{2,8}){1,4}|\d{3,6}(?: \d{3,8}){1,4})" + _D1 + _NOT_AMOUNT)
_DATE_PREFIX = re.compile(r"^(?:19|20)\d{2}[-. ](?:0?[1-9]|1[0-2])[-. ](?:0?[1-9]|[12]\d|3[01])(?!\d)")
_PLAIN = re.compile(_D0 + r"\d{10,16}" + _D1 + _NOT_AMOUNT)


def _mask_grouped(m: re.Match) -> str:
    raw = m.group(0)
    if _DATE.match(raw) or _DATE_PREFIX.match(raw) or sum(c.isdigit() for c in raw) < 10:
        return raw
    return "[계좌/카드번호]"


def mask_identifiers(text: str) -> str:
    for pattern, label in _PATTERNS:
        text = pattern.sub(label, text)
    text = _GROUPED.sub(_mask_grouped, text)
    return _PLAIN.sub("[계좌/카드번호]", text)


# ------------------------------------------------------------------ 이름 후보 만들기

# 이름 바로 뒤에 올 수 있는 말의 '첫머리'. 이 중 하나로 시작하면 그 뒤에 어떤 글자가 붙어도
# (민수였는데, 민수한텐, 민수잖아 …) 이름으로 본다. '지수함수' 의 '함' 처럼 여기 없는 글자로 이어지면 이름이 아니다.
_STARTERS = [
    # 조사
    "이", "가", "은", "는", "을", "를", "의", "도", "만", "와", "과", "랑", "하고", "한테", "에게", "에", "께",
    "한텐", "에겐", "께선", "로선", "까지", "부터", "보다", "보고", "더러", "처럼", "같이", "만큼", "밖에", "조차", "마저", "로", "으로", "나", "든",
    "요", "라", "란", "래", "냐", "니", "네", "면", "고", "지", "거", "꺼", "잖", "였", "인", "다", "야말로",
    # 호칭·부르는 꼴
    "야", "아", "님", "씨", "군", "양", "형", "누나", "언니", "오빠", "쌤", "선배", "선생",
]
# 흔한 낱말과 같은 이름은 부르는 꼴에서만 이름으로 본다 ('하나야' 는 바꾸고 '하나도 몰라' 는 그대로).
_ADDRESS_COMMON = ["야", "아", "씨", "이가", "이는", "이도", "이랑", "이한테", "이야", "형", "누나", "언니", "오빠", "쌤", "선배"]

# 사람 이름으로도 쓰이지만 흔한 낱말인 것들
_COMMON_WORDS = {
    "하나", "우리", "나라", "하늘", "보람", "가을", "여름", "겨울", "바다", "사랑", "기쁨", "슬기", "이슬",
    "노을", "미소", "소망", "마음", "구름", "다운", "한결", "나리", "진주", "은하", "새봄", "가람",
    "아름", "초롱", "샛별", "누리", "한별", "단비", "보라", "푸름", "그루", "다솜", "지혜", "수호",
    "지원", "수정", "유리", "정의", "성공", "승리", "은혜", "행복", "영광", "희망", "소원", "평화", "자유",
    "미래", "대한", "민국", "현실", "성실", "신비", "진실", "보배", "고운", "다정", "한빛", "가온", "나래",
    "마루", "서로", "이든", "하람", "빛나", "새롬", "정민원", "상수", "정수", "인정", "현장", "가희", "경주",
}
# 닉네임에 붙는 직함·소속·호칭 (이름 후보에서 뺀다)
_TITLES = {
    "대리", "과장", "차장", "부장", "팀장", "실장", "사원", "주임", "선임", "책임", "수석", "이사", "대표", "사장",
    "본부장", "센터장", "원장", "매니저", "프로", "인턴", "선생님", "선생", "교수님", "교수", "쌤", "선배", "후배",
    "형", "누나", "언니", "오빠", "님", "회사", "본사", "디자인", "기획", "개발", "마케팅", "영업", "인사", "총무",
    "회계", "재무", "법무", "운영", "고객", "엄마", "아빠", "동생", "친구", "학생", "반장", "회장", "총무님",
}
_SURNAMES_2 = ("남궁", "황보", "제갈", "선우", "독고", "사공", "서문", "동방", "어금")
_SURNAMES_1 = "김이박최정강조윤장임한오서신권황안송류전홍고문양손배백허유남심노하곽성차주우구민나진지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예봉경"
_SURNAME_PREFIX = "(?:" + "|".join(_SURNAMES_2) + "|[" + _SURNAMES_1 + "])?"
_WORD = r"[가-힣A-Za-z0-9]"


def _alt(words) -> str:
    return "|".join(map(re.escape, sorted(set(words), key=len, reverse=True)))


def _is_team(token: str) -> bool:
    return bool(re.fullmatch(r"[가-힣]+(팀|부|실|본부|센터|파트|그룹|사업부)", token)) and len(token) >= 3


def name_forms(nickname: str) -> list[str]:
    """닉네임에서 본문에 나올 만한 이름 꼴을 뽑는다.

    '김민수 대리' → ['김민수 대리', '김민수', '민수'], '🐶민수94' → ['🐶민수94', '민수'], 'Minsu Kim' → [..., 'Minsu', 'Kim'].
    직함·팀 이름·숫자·짧은 영문 약어(PM)는 뺀다.
    """
    nick = nickname.strip()
    forms = [nick]
    # 한글/영문 덩어리만 뽑는다: 이모티콘·기호·숫자는 구분자로 본다.
    for token in re.findall(r"[가-힣]+|[A-Za-z]+", nick):
        if token in _TITLES or _is_team(token):
            continue
        if re.fullmatch(r"[A-Za-z]+", token) and (len(token) < 3 or token.isupper()):
            continue  # PM, CEO, B 같은 약어
        if len(token) < 2:
            continue
        forms.append(token)
        if re.fullmatch(r"[가-힣]{3}", token):
            forms.append(token[1:])  # 성을 뺀 이름: 김민수 → 민수
        elif re.fullmatch(r"[가-힣]{4}", token) and token[:2] in _SURNAMES_2:
            forms.append(token[2:])  # 복성: 황보지은 → 지은
    seen: dict[str, None] = {}
    for f in forms:
        if len(f) >= 2:  # 한 글자는 본문에서 바꾸면 문장이 망가진다
            seen.setdefault(f, None)
    return list(seen)


def display_name(nickname: str) -> str:
    """초안에 되돌려 넣을 이름: 장식·직함을 뺀 핵심 이름 ('김민수 대리' → '김민수', 'Minsu Kim' → 'Minsu')."""
    forms = name_forms(nickname)
    korean = [f for f in forms if re.fullmatch(r"[가-힣]{2,4}", f)]
    if korean:
        return korean[0]
    latin = [f for f in forms if re.fullmatch(r"[A-Za-z]+", f)]
    return latin[0] if latin else nickname.strip()


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

_GROUP_TITLE_WORDS = {"가족", "친구", "동기", "회사", "팀", "모임", "스터디", "동아리", "공지", "단톡", "단톡방", "우리", "반"}
_ME_JOSA = {"이": "내가", "가": "내가", "은": "나는", "는": "나는", "을": "나를", "를": "나를", "과": "나와", "와": "나와",
            "이랑": "나랑", "랑": "나랑", "으로": "나로", "로": "나로", "이야": "나야", "야": "나야", "아": "나야"}


class Pseudonymizer:
    ME = "[본인]"

    def __init__(self, chat: Chat, me: str | None, also_me: list[str] | tuple[str, ...] = ()):
        """``chat`` 은 기간 필터를 적용하기 **전** 전체 대화를 넘겨야 모든 참여자가 잡힌다.

        ``me`` 는 파일에 찍힌 본인 발신자 이름, ``also_me`` 는 그 밖에 본인을 가리키는 이름
        (예: 파일에는 '나' 로 찍히지만 사람들이 부르는 이름 '철수').
        """
        self.me = me
        self.sender_map: dict[str, str] = {}
        self.backward: dict[str, str] = {}  # 상대N → 원래 닉네임
        self._display: dict[str, str] = {}  # 상대N → 되돌릴 때 쓸 이름 (김민수 대리 → 김민수)
        self._given: dict[str, str] = {}    # 상대N → 부를 때 쓰는 이름 (김민수 → 민수)
        forms_full: dict[str, str] = {}     # 본문 꼴 → 별칭 (닉네임 그대로)
        forms_derived: dict[str, str] = {}  # 본문 꼴 → 별칭 (닉네임에서 뽑은 것)

        def register(nickname: str, alias: str) -> None:
            forms = name_forms(nickname)
            if forms:
                forms_full.setdefault(forms[0], alias)
            for f in forms[1:]:
                forms_derived.setdefault(f, alias)
            if alias != self.ME:
                self._display.setdefault(alias, display_name(nickname))
                given = [f for f in forms[1:] if re.fullmatch(r"[가-힣]{2}", f)]
                if given:
                    self._given.setdefault(alias, given[-1])

        n = 0
        for name in chat.participants:
            if name == me:
                alias = self.ME
            else:
                n += 1
                alias = f"상대{n}"
                self.backward[alias] = name
            self.sender_map[name] = alias
            register(name, alias)
        for extra in also_me:
            if extra and extra.strip():
                register(extra, self.ME)

        # 방 제목: 1:1 방 제목은 보통 내가 저장한 상대 이름이다 (발신자 닉네임과 다를 수 있음: '김민수' vs '민수').
        # 상대가 한 명이면 제목을 그 사람의 다른 이름으로, 한 명도 없으면 새 사람으로 본다. 단체방 제목은 사람이 아니다.
        others = [a for name, a in self.sender_map.items() if a != self.ME]
        title = re.sub(r"\s+\d+$", "", chat.title or "").strip()  # 'Android 단체방 제목 4' 의 인원수
        known = set(forms_full) | set(forms_derived)
        if title and title not in known and title not in _GROUP_TITLE_WORDS \
                and re.fullmatch(r"[가-힣A-Za-z ]{2,12}", title) and len(set(others)) <= 1:
            if others:
                register(title, others[0])
            else:
                n += 1
                alias = f"상대{n}"
                self.backward[alias] = title
                register(title, alias)

        # 되돌릴 이름이 두 사람에게서 겹치면('사람01', '사람02' → '사람') 닉네임 그대로 쓴다.
        counts: dict[str, int] = {}
        for d in self._display.values():
            counts[d] = counts.get(d, 0) + 1
        for alias, d in list(self._display.items()):
            if counts[d] > 1 and alias in self.backward:
                self._display[alias] = self.backward[alias]
                self._given.pop(alias, None)

        # 다른 사람의 '닉네임 그대로' 가 뽑은 꼴보다 우선 (김민수 의 '민수' vs 참여자 '민수').
        self._forms = dict(forms_derived)
        self._forms.update(forms_full)
        self._lower = {k.lower(): v for k, v in self._forms.items()}
        normal = [f for f in self._forms if f not in _COMMON_WORDS]
        common = [f for f in self._forms if f in _COMMON_WORDS]
        tail = rf"(?=(?:(?:{_alt(_STARTERS)})[가-힣]*)?(?!{_WORD}))"
        self._regexes = []
        if normal:
            names = _alt(normal)
            # 앞에 성이 붙은 꼴('민수' 만 알 때의 '김민수')도 통째로 바꾼다. 정확한 이름이 먼저 맞도록 순서를 둔다.
            self._regexes.append(re.compile(
                rf"(?<!{_WORD})(?:(?P<n1>{names})|{_SURNAME_PREFIX[:-1]}(?P<n2>{names}))" + tail, re.IGNORECASE))
        if common:
            self._regexes.append(re.compile(
                rf"(?<!{_WORD})(?P<n1>{_alt(common)})(?=(?:{_alt(_ADDRESS_COMMON)})(?!{_WORD}))"))
        aliases = list(self.backward) + [self.ME]
        # 한 글자 조사(과, 이 …)는 뒤에 한글이 바로 이어지면 조사가 아니다 ('상대1과장님' 의 '과').
        single = [j for j in _JOSA_LOOKUP if len(j) == 1]
        multi = [j for j in _JOSA_LOOKUP if len(j) > 1]
        josa = rf"(?:{_alt(multi)}|(?:{_alt(single)})(?=요|[^가-힣]|$))"
        self._restore_re = re.compile(rf"({_alt(aliases)})(?!\d)({josa})?")

    def _sub(self, m: re.Match) -> str:
        key = (m.groupdict().get("n1") or m.groupdict().get("n2") or "").lower()
        return self._lower.get(key, m.group(0))

    def text(self, text: str) -> str:
        # 번호를 먼저 가린다. 이름을 먼저 바꾸면 '민수9001011234567' 처럼 별칭 숫자가 번호에 붙어 버린다.
        text = mask_identifiers(text)
        for rx in self._regexes:
            text = rx.sub(self._sub, text)
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
                # 초안 속 [본인] 은 사용자 자신: '나' 로 되돌린다 ([본인]이 → 내가)
                return _ME_JOSA.get(josa, "나" + josa)
            if josa in ("아", "야") and alias in self._given:
                name = self._given[alias]  # 부를 때는 성을 뺀 이름: 김민수 → 민수야
            else:
                name = self._display.get(alias, self.backward[alias])
            return attach_josa(name, josa) if josa else name
        return self._restore_re.sub(sub, text)


def log_summary(chat: Chat) -> str:
    """로그에 남겨도 되는 정보만: 이름·내용 없이 개수만."""
    return f"messages={len(chat.messages)} participants={len(chat.participants)}"
