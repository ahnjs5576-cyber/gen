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
# 하이픈처럼 쓰이는 문자들: -, 유니코드 하이픈(‐‑), 대시(–—), 빼기(−), 전각(－﹣), 한글 'ㅡ'
_DASH = r"[-‐‑–—−﹣－ㅡ]"
_SEP = r"\s*[-.‐‑–—−﹣－ㅡ]\s*|\s"
_DATE = re.compile(r"^(?:(?:19|20)?\d{2})[-.\s](?:0?[1-9]|1[0-2])[-.\s](?:0?[1-9]|[12]\d|3[01])$")
_DATE_PREFIX = re.compile(r"^(?:19|20)\d{2}\s*(?:" + _DASH + r"|[. ])\s*(?:0?[1-9]|1[0-2])\s*(?:" + _DASH +
                          r"|[. ])\s*(?:0?[1-9]|[12]\d|3[01])(?!\d)")
# 숫자 바로 뒤의 단위 '낱말 전체' (원지혜·일요일 같은 낱말 첫 글자를 단위로 오인하지 않게 뒤에 한글이 더 오면 단위가 아님)
_UNIT = re.compile(r"(?:원|만원|천원|억|달러|개|명|번째|회|위|건|장|권|시|분|초|년|월|일|주|kg|g|km|m|%)"
                   r"(?:[이가은는을를에도만의]|까지|짜리|이야|입니다|이에요|예요|이나|씩)?(?![가-힣A-Za-z])")

_PATTERNS = [
    (re.compile(r"(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9-]{1,63}(?:\.[A-Za-z0-9-]{1,63}){0,8}\.[A-Za-z]{2,24}"),
     "[이메일]"),
    # 주민·외국인등록번호 (뒷자리 첫 숫자 1~8)
    (re.compile(_D0 + _YYMMDD + r"\s*(?:" + _DASH + r"|\.)?\s*[1-8]\d{6}" + _D1), "[주민번호]"),
    (re.compile(r"\+82(?:" + _SEP + r")?1[016789](?:" + _SEP + r")?\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"01[016789](?:" + _SEP + r")?\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),
    (re.compile(_D0 + r"0\d{1,2}(?:" + _SEP + r")\d{3,4}(?:" + _SEP + r")\d{4}" + _D1), "[전화번호]"),
    (re.compile(r"\(?" + _D0 + r"0\d{1,2}\)\s*\d{3,4}(?:" + _SEP + r")?\d{4}" + _D1), "[전화번호]"),  # (02) 123 4567, 031)123-4567
    # 카톡 아이디·SNS 계정·프로필 링크 (사람을 바로 찾을 수 있는 것)
    (re.compile(r"(?<![A-Za-z0-9.@-])(?:https?://)?(?:www\.|m\.)?(?:open\.kakao\.com|instagram\.com|facebook\.com|x\.com|twitter\.com|"
                r"blog\.naver\.com|tiktok\.com|youtube\.com/@)/?[^\s가-힣]*"), "[프로필링크]"),
    # '아이디/ID/계정' 뒤의 영문으로 시작하는 값 ('kidding', 'midnight' 속 id 는 제외: 앞뒤가 영문이 아니어야 함)
    (re.compile(r"((?:카톡|카카오톡|인스타|인스타그램|트위터|페북|디스코드|라인|텔레)?\s*(?:아이디|(?<![A-Za-z])(?:ID|id|Id)(?![A-Za-z])|계정)"
                r"\s*(?:은|는|가|이|:|=)?\s*)@?[A-Za-z][A-Za-z0-9._-]{2,29}"), r"\1[아이디]"),
    (re.compile(r"(?<![A-Za-z0-9._%+-])@[A-Za-z0-9._]{3,30}(?![A-Za-z0-9._@])"), "[아이디]"),
    # 생년월일: '1999년 3월 2일생', '90년 3월 2일생', '1990.03.02생', '생년월일 1990-03-02', '생일: 1990.3.2'
    (re.compile(r"(?:19|20)?\d{2}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일\s*생"), "[생년월일]"),
    (re.compile(r"(?<!\d)(?:19|20)?\d{2}[.\-/]\s?\d{1,2}[.\-/]\s?\d{1,2}\.?\s*생(?![가-힣])"), "[생년월일]"),
    (re.compile(r"((?:생년월일|생일|출생일)\s*(?:은|는|:)?\s*)(?:(?:19|20)?\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}\s*일?)"),
     r"\1[생년월일]"),
    # 뒷자리를 별표로 가린 주민번호 ('900101-1******')
    (re.compile(_D0 + _YYMMDD + r"\s*(?:" + _DASH + r")?\s*[1-8][\d*]{0,6}\*+"), "[주민번호]"),
]
# 계좌·카드·사업자번호처럼 끊어 쓴 숫자 묶음. 하이픈류(-–—ㅡ)·공백으로 끊긴 것, 점으로 끊긴 4자리 묶음(카드).
_GROUPED = re.compile(_D0 + r"\d{2,8}(?:(?:\s*" + _DASH + r"\s*|\s)\d{1,8}){1,5}" + _D1)
_DOTTED = re.compile(_D0 + r"\d{4}(?:\.\d{4}){2,3}" + _D1)
_PLAIN = re.compile(_D0 + r"\d{10,16}" + _D1)


def _followed_by_unit(m: re.Match) -> bool:
    return bool(_UNIT.match(m.string, m.end()))


def _mask_grouped(m: re.Match) -> str:
    raw = m.group(0)
    groups = re.findall(r"\d+", raw)
    if sum(len(g) for g in groups) < 10 or _DATE.match(raw) or _DATE_PREFIX.match(raw):
        return raw
    if not re.search(_DASH, raw):
        # 공백으로만 끊긴 묶음은 숫자 나열('12 25 33 41 45', '100 200 300 400', '2020 2021 2022 2023')과 구별한다.
        lengths = {len(g) for g in groups}
        if len(lengths) == 1 and lengths.pop() <= 3:
            return raw  # 같은 길이의 짧은 숫자들 나열
        if all(len(g) == 4 and 1900 <= int(g) <= 2099 for g in groups):
            return raw  # 연도 나열
        if sum(len(g) < 3 for g in groups) > 1 or len(groups[-1]) < 2 and len(groups) > 2:
            return raw  # 짧은 묶음이 여럿이면 계좌가 아님
        same_len = len({len(g) for g in groups}) == 1
        if _followed_by_unit(m) or (same_len and m.string[m.end():m.end() + 1] == " " and _UNIT.match(m.string, m.end() + 1)):
            return raw  # 금액·수량 ('3000 000 000원', '1200 1500 1800 2100 명') — 하이픈 금액은 없으므로 여기서만
    return "[계좌/카드번호]"


def mask_identifiers(text: str) -> str:
    for pattern, label in _PATTERNS:
        text = pattern.sub(label, text)
    text = _GROUPED.sub(_mask_grouped, text)
    text = _DOTTED.sub("[계좌/카드번호]", text)
    return _PLAIN.sub(lambda m: m.group(0) if _followed_by_unit(m) else "[계좌/카드번호]", text)


# ------------------------------------------------------------------ 이름 후보 만들기

# 이름 바로 뒤에 올 수 있는 말의 '첫머리'. 이 중 하나로 시작하면 그 뒤에 어떤 글자가 붙어도
# (민수였는데, 민수한텐, 민수잖아 …) 이름으로 본다. '지수함수' 의 '함' 처럼 여기 없는 글자로 이어지면 이름이 아니다.
_STARTERS = [
    # 조사
    "이", "가", "은", "는", "을", "를", "의", "도", "만", "와", "과", "랑", "하고", "한테", "에게", "에", "께",
    "한텐", "에겐", "께선", "로선", "까지", "부터", "보다", "보고", "더러", "처럼", "같이", "만큼", "밖에", "조차", "마저", "로", "으로", "나", "든",
    "요", "라", "란", "래", "냐", "니", "네", "면", "고", "지", "거", "꺼", "잖", "였", "인", "다", "야말로",
    "입", "예", "임", "죠", "여", "두", "하구", "쪽", "측", "들", "말", "생일", "폰", "집", "자리", "몫", "차례", "덕",
    "탓", "편", "껀", "건", "꺼", "세", "시", "며", "얌", "당", "ㅋ", "ㅎ",
    "뿐", "땜", "빼", "짱", "찡", "쓰", "것", "번호", "계좌", "주소", "남친", "여친", "남편", "아내", "와이프", "엄마", "아빠",
    "동생", "회사", "사진", "생각", "얘기", "말씀", "님한", "께서", "때", "씌",
    # 호칭·부르는 꼴
    "야", "아", "님", "씨", "군", "양", "형", "누나", "언니", "오빠", "쌤", "선배", "선생",
]
# 흔한 낱말과 같은 이름은 부르는 꼴에서만 이름으로 본다 ('하나야' 는 바꾸고 '하나도 몰라' 는 그대로).
_ADDRESS_COMMON = ["야", "아", "씨", "님", " 씨", " 님", "이가", "이는", "이도", "이랑", "이한테", "형", "누나", "언니",
                   "오빠", "쌤", "선배"]
_COMMON_EXCEPT = {"하나님"}  # 이름+부르는 꼴이지만 실제로는 낱말인 것
_JOB_TITLES = ["대리", "과장", "차장", "부장", "팀장", "실장", "주임", "선임", "책임", "수석", "이사", "대표", "사장",
               "매니저", "프로", "선생님", "교수님", "원장", "본부장", "센터장"]
_ADDRESS_COMMON += [sep + t for t in _JOB_TITLES for sep in ("", " ")]

# 사람 이름으로도 쓰이지만 흔한 낱말인 것들
_COMMON_WORDS = {
    "하나", "우리", "나라", "하늘", "보람", "가을", "여름", "겨울", "바다", "사랑", "기쁨", "슬기", "이슬",
    "노을", "미소", "소망", "마음", "구름", "다운", "한결", "나리", "진주", "은하", "새봄", "가람",
    "아름", "초롱", "샛별", "누리", "한별", "단비", "보라", "푸름", "그루", "다솜", "지혜", "수호",
    "지원", "수정", "유리", "정의", "성공", "승리", "은혜", "행복", "영광", "희망", "소원", "평화", "자유",
    "미래", "대한", "민국", "현실", "성실", "신비", "진실", "보배", "고운", "다정", "한빛", "가온", "나래",
    "마루", "서로", "이든", "하람", "빛나", "새롬", "정민원", "상수", "정수", "인정", "현장", "가희", "경주",
    "미정", "지나", "정원", "연수", "이유", "대리", "사원", "학생", "장인", "구성", "안정", "예정", "설정",
    "수영", "연주", "인수", "재원", "진영", "준수", "나은", "지우",
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
# 이름 바로 뒤에 붙여 쓰는 직함·호칭 ('민수대리님', '민수팀장님', '민수때문에')
_STARTERS += sorted({t for t in _TITLES if re.fullmatch(r"[가-힣]+", t)} |
                    {"때문", "샘", "누님", "형님", "오라버니", "님께", "네"})
# 성을 붙인 꼴('김민수')은 흔한 낱말('설정은', '이상은')과 겹치기 쉬워, 뒤에 직함·호칭이나 사람에게 쓰는 조사가
# 올 때만 바꾼다. 이름 끝 글자가 조사처럼 보이지 않으면('민수') 그냥 끝나는 꼴('김민수 왔어')도 바꾼다.
_PERSON_TAIL = sorted({t for t in _TITLES if re.fullmatch(r"[가-힣]+", t)} |
                      {"님", "씨", "야", "아", "한테", "에게", "께", "랑", "이랑", "하고", "가", "이", "와", "과", "도", "이가",
                       "형", "누나", "언니", "오빠", "쌤", "선배", "때문", "였", "이었", "이야"})
# '성 한 글자 + 이름' 이 흔한 낱말 + 조사로 읽히는 경우 ('설정은' = 설정+은, '주민수' 의 '주민').
# (성 + 이름 앞부분) 이 이 목록에 있으면 성을 붙인 꼴로 보지 않는다.
_SURNAME_NOUNS = set("""
설정 예정 조정 선정 안정 구성 여성 남성 이상 설명 결정 인정 일정 가정 과정 규정 측정 수정 지정 확정 긍정 부정 추정 감정
열정 표정 사정 진정 한정 고정 검정 이성 감성 개성 완성 작성 형성 정상 비상 현상 대상 상상 감상 보상 손상 영상 인상 일상
세상 증명 분명 유명 생명 운명 발명 해명 표명 성명 문명 지명 서명 주민 시민 국민 고민 조명 공정 공지 공유 기정 기상
기존 기지 도시 도전 문제 문의 문자 반대 반지 방법 방문 방금 배송 변경 변수 성공 성과 성장 소식 소개 신청 신규 신고
심사 안내 안전 안부 양해 여유 연락 연결 연기 오늘 오전 오후 오해 우선 원래 원인 위치 유지 유효 인사 인원 임시 장소
전화 전달 전체 정보 정리 정말 제출 제안 제공 제목 조건 조사 조금 주말 주소 주문 주의 주제 지금 지난 지역 진행 진짜
차이 최근 최종 추가 추천 편집 표시 현재 현장 현지 홍보 나은 나이 남은 노력 마감 명단 모두 모임 고지 공식 구조 기술
기억 기본 기분 기준 기대 기능 도움 반응 방향 성능 성적 신경 양식 연습 연말 연휴 오류 용도 위해 이전 이번 이후 이유
전부 제일 조심 주간 지원 지출 채용 하루 한번 함께 허락 황당 결국 고장 공부 구매 국내 권한 금액 남편 내일 노래
""".split())


def _alt(words) -> str:
    return "|".join(map(re.escape, sorted(set(words), key=len, reverse=True)))


def _is_team(token: str) -> bool:
    return bool(re.fullmatch(r"[가-힣]+(팀|부|실|본부|센터|파트|그룹|사업부)", token)) and len(token) >= 3


# 닉네임 낱말 끝에 붙여 쓰는 직함·호칭 ('김민수대리', '이지은과장님', '수빈언니', '민수아빠', '지은맘', '지민이')
_GLUED_SUFFIXES = sorted(set(_TITLES) | {"님", "맘", "아빠", "엄마", "언니", "오빠", "누나", "형", "쌤", "샘", "고객", "고객님",
                                         "네", "할머니", "할아버지", "이모", "삼촌", "고모", "짱", "공주", "왕자", "입니다",
                                         "이당", "이에요", "예요", "이야", "담임", "담임선생님", "딸", "아들"},
                         key=len, reverse=True)
# 닉네임에 붙는 상태·설명 낱말 (이름이 아님): '민수 (부재중)', '김지은 퇴사', '1학년3반 준서맘'
_DESCRIPTORS = {"부재중", "회의중", "출장", "출장중", "외근", "재택", "휴가", "휴가중", "퇴사", "입사", "학년", "담임", "선수",
                "공사중", "운동중", "수업중", "근무중", "본사", "지점", "매장", "사무실", "현장", "알바", "직원", "사장",
                "대표", "원장", "작가", "강사", "코치", "감독", "기자", "의사", "약사", "간호사", "변호사", "세무사"}
# 이름 앞에 붙는 꾸밈·관계 낱말 ('우리엄마', '친정엄마', '작은아빠')
_FAMILY_MODIFIERS = {"우리", "울", "내", "친정", "시댁", "시", "외", "큰", "작은", "막내", "둘째", "첫째", "새", "친", "사랑"}
# 성으로 시작하는 세 글자라도 이름이 아닌 흔한 낱말 (성을 떼면 엉뚱한 '이름' 이 생김: 강아지 → 아지)
_NOT_NAMES = {"강아지", "오렌지", "고양이", "고구마", "오징어", "이모티콘", "선배님", "고객님", "사장님", "부장님", "과장님",
              "팀장님", "대리님", "선생님", "교수님", "원장님", "기사님", "회장님", "총무님", "반장님", "이사님", "실장님"}


def _core_token(token: str) -> tuple[str, str | None]:
    """'이지은과장님' → ('이지은', '과장'), '지민이' → ('지민', None). 남는 게 두 글자 미만이면 그대로."""
    suffix = None
    changed = True
    while changed:
        changed = False
        for suf in _GLUED_SUFFIXES:
            if token.endswith(suf) and len(token) - len(suf) >= 2:
                token = token[: -len(suf)]
                base = suf[:-1] if suf.endswith("님") and len(suf) > 1 else suf
                if suffix in (None, "님"):  # '과장님' 은 '님' 보다 '과장' 을 남긴다
                    suffix = base
                changed = True
                break
    # 부를 때 붙이는 '이' ('지민이', '하은이'): 세 글자이고 가운데 글자가 받침으로 끝날 때
    if len(token) == 3 and token.endswith("이") and _has_batchim(token[1]):
        token = token[:2]
    elif len(token) == 3 and token.endswith("아") and _has_batchim(token[1]) and token[0] not in _SURNAMES_1:
        token = token[:2]  # '찬영아' (부르는 꼴을 닉네임으로)
    return token, suffix


_ADJECTIVES = {"예쁜", "착한", "멋진", "귀여운", "사랑스러운", "배고픈", "졸린", "행복한", "즐거운", "작은", "큰", "새로운",
               "따뜻한", "멋있는", "잘생긴", "이쁜", "고마운", "든든한", "소중한", "다정한", "엉뚱한"}


def _is_modifier(token: str) -> bool:
    """'사랑하는', '귀여운', '배고픈', '우리의' 처럼 이름 앞에 붙는 꾸밈말."""
    if token in _ADJECTIVES:
        return True
    if len(token) >= 3 and token.endswith(("하는", "스러운", "러운", "여운", "는", "의", "한", "픈", "운", "린", "진")) \
            and not _full_name_like(token):
        return True
    return False


def _full_name_like(core: str) -> bool:
    """성으로 시작하는 세 글자(김지은) 또는 복성 네 글자(황보지은). '오늘도', '부재중' 처럼 낱말로 읽히면 제외."""
    if core in _NOT_NAMES or core in _DESCRIPTORS:
        return False
    if re.fullmatch(r"[가-힣]{3}", core):
        return core[0] in _SURNAMES_1 and core[:2] not in _SURNAME_NOUNS and core[:2] not in _SURNAMES_2 \
            and core[1:] not in _TITLES
    return bool(re.fullmatch(r"[가-힣]{4}", core)) and core[:2] in _SURNAMES_2


def _name_tokens(nickname: str) -> list[tuple[str, str, str, str | None]]:
    """닉네임 낱말을 (원래 낱말, 핵심 이름, 종류, 붙은 호칭) 으로. 종류: glued(호칭이 붙음)·full(성+이름)·short·latin.

    호칭이 붙은 낱말이나 성까지 있는 이름이 하나라도 있으면, 나머지 두 글자 낱말은 이름이 아니라 설명으로 본다
    ('삼성전자 김지은', '김지은 퇴사', '박지성 선수', '1학년3반 준서맘').
    """
    out = []
    for raw in re.findall(r"[가-힣]+|[A-Za-z]+", nickname.strip()):
        if re.fullmatch(r"[A-Za-z]+", raw):
            if len(raw) >= 3 and not (raw.isupper() and len(raw) <= 3):  # PM, CEO 같은 약어 제외
                out.append((raw, raw, "latin", None))
            continue
        if raw in _NOT_NAMES or raw in _DESCRIPTORS or _is_modifier(raw) or raw in _FAMILY_MODIFIERS:
            continue
        core, suffix = _core_token(raw)
        # '우리엄마', '친정엄마', '작은아빠' 처럼 꾸밈말+관계: 이름 없음
        if suffix and core in _FAMILY_MODIFIERS:
            continue
        if core in _TITLES or core in _ROLE_ONLY or _is_team(core) or core in _DESCRIPTORS or core in _NOT_NAMES \
                or len(core) < 2 or core in _GROUP_TITLE_WORDS:
            continue
        if re.fullmatch(r"[가-힣]{4,}", core) and not _full_name_like(core):
            continue  # '삼성전자', '인테리어', '신한은행' 처럼 네 글자 이상 낱말
        kind = "glued" if suffix else ("full" if _full_name_like(core) else "short")
        if kind == "short" and len(core) >= 3 and core[-1] in "도은는이가을를의만랑":
            continue  # '오늘도', '그래도' 처럼 조사로 끝나는 낱말
        out.append((raw, core, kind, suffix))
    if any(k in ("glued", "full") for _, _, k, _ in out):
        out = [t for t in out if t[2] != "short"]
    return out


def name_forms(nickname: str) -> list[str]:
    """닉네임에서 본문에 나올 만한 이름 꼴을 뽑는다 (첫 항목은 닉네임 그대로).

    '김민수 대리' → ['김민수 대리', '김민수', '민수'], '🐶민수94' → ['🐶민수94', '민수'], '준서맘' → ['준서맘', '준서'],
    '삼성전자 김지은' → ['삼성전자 김지은', '김지은', '지은']. 직함·설명·숫자·영문 약어·꾸밈말은 뺀다.
    """
    nick = nickname.strip()
    forms = [nick]
    for raw, core, kind, suffix in _name_tokens(nick):
        if kind == "glued" and len(raw) >= 2:
            forms.append(raw)  # '준서맘', '김민수대리' 처럼 붙여 쓴 꼴 그대로도 본문에 나온다
        forms.append(core)
        if re.fullmatch(r"[가-힣]{3}", core) and _full_name_like(core):
            forms.append(core[1:])  # 성을 뺀 이름: 김민수 → 민수
        elif re.fullmatch(r"[가-힣]{4}", core) and core[:2] in _SURNAMES_2:
            forms.append(core[2:])  # 복성: 황보지은 → 지은
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
    if ch.isascii() and ch.isalpha():
        return ch.lower() not in "aeiouy"  # 영문 이름은 끝 글자 소리로: Minsu → 민수(받침 없음), John → 존(받침)
    return None


def _is_rieul(ch: str) -> bool:
    return "가" <= ch <= "힣" and (ord(ch) - 0xAC00) % 28 == 8


# (받침 있을 때, 받침 없을 때)
_JOSA_PAIRS = [("이한테", "한테"), ("이에게", "에게"), ("으로부터", "로부터"), ("으로서", "로서"), ("으로써", "로써"), ("이시죠", "시죠"), ("이면", "면"),
               ("이세요", "세요"), ("이시", "시"), ("이라는", "라는"), ("이요", "요"), ("이랑", "랑"), ("이에요", "예요"), ("이었", "였"), ("이야", "야"), ("이라고", "라고"), ("이나", "나"),
               ("이든", "든"), ("이고", "고"), ("이지", "지"), ("이네", "네"), ("이니", "니"), ("이라", "라"),
               ("이", "가"), ("은", "는"), ("을", "를"), ("아", "야"), ("과", "와"), ("으로", "로"),
               # 모델이 '상대1이가' 처럼 겹쳐 쓴 꼴 (앞의 짝이 우선이라 '가', '는' 은 위 짝으로 남는다)
               ("이가", "가"), ("이는", "는")]
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
    if pair[0].startswith("으로"):
        return name + (pair[0] if batchim and not _is_rieul(name[-1]) else pair[1])
    if pair == ("이야", "야") and josa == "야":
        # 상대N 뒤 '야' 는 대개 부르는 말(아/야)이다
        pair = ("아", "야")
    return name + (pair[0] if batchim else pair[1])


# ------------------------------------------------------------------ 가명 처리

# 닉네임에 들어 있으면 별칭 옆에 붙여 보내는 관계·직함 (사람을 특정하지 않고 말투 판단에 도움)
_ROLE_WORDS = ["엄마", "아빠", "어머니", "아버지", "할머니", "할아버지", "외할머니", "외할아버지", "친할머니", "친할아버지",
               "이모", "삼촌", "고모", "외삼촌", "큰엄마", "작은엄마", "큰아빠", "작은아빠", "남편", "아내", "와이프", "여보",
               "신랑", "딸", "아들", "형", "누나", "언니", "오빠", "동생", "선배", "후배", "쌤", "선생님", "교수님", "담임",
               "남친", "여친"] + _JOB_TITLES


_ROLE_ONLY = set(_ROLE_WORDS)
_FAMILY = {"엄마", "아빠", "어머니", "아버지", "할머니", "할아버지", "외할머니", "외할아버지", "친할머니", "친할아버지", "이모",
           "삼촌", "고모", "외삼촌", "남편", "아내", "와이프", "맘", "가족", "담임", "선생님"}


def role_of(nickname: str) -> str | None:
    """닉네임 속 관계·직함.

    가족 호칭이 아이 이름 같은 짧은 이름 **뒤에** 붙으면('서준 엄마', '준서맘', '하준이네') 누군가의 가족이라 '○○엄마'.
    '엄마 김영희', '김영희(엄마)', '우리엄마', '와이프 김지수' 처럼 그 사람 자신의 관계면 그냥 '엄마'.
    """
    raws = [t for t in re.findall(r"[가-힣]+", nickname)]
    role, of_other = None, False
    prev_short = False  # 바로 앞 낱말이 아이 이름 같은 짧은 이름인지
    for raw in raws:
        base = raw[:-1] if raw.endswith("님") and raw[:-1] in _ROLE_ONLY else raw
        if base in _ROLE_ONLY or base in ("맘", "네"):
            r = {"맘": "엄마", "네": "가족"}.get(base, base)
            if role is None:
                role = r
                of_other = prev_short and r in _FAMILY | {"가족"}
            prev_short = False
            continue
        core, suffix = _core_token(raw)
        if suffix in ("선생", "담임", "담임선생"):
            suffix = "선생님"
        if suffix in _ROLE_ONLY or suffix in ("맘", "네"):
            r = {"맘": "엄마", "네": "가족"}.get(suffix, suffix)
            if role is None:
                role = r
                of_other = (r in _FAMILY | {"가족"}) and core not in _FAMILY_MODIFIERS and not _full_name_like(core)
        elif suffix in _TITLES and role is None:
            role = suffix
        prev_short = len(core) in (2, 3) and not _full_name_like(core) and core not in _FAMILY_MODIFIERS \
            and core not in _TITLES and core not in _DESCRIPTORS
    if role and of_other:
        return f"○○{role}"
    return role


_GROUP_TITLE_WORDS = {"가족", "친구", "동기", "팀", "모임", "스터디", "동아리", "공지", "단톡", "단톡방", "반",
                      "동창", "동창회", "학부모", "동네", "이웃", "친척", "사촌", "본가", "처가", "시댁", "회사사람들", "부서"}


def looks_like_person_name(token: str) -> bool:
    """방 제목 한 낱말이 사람 이름처럼 생겼는지: 영문 이름, 한글 두 글자, 성으로 시작하는 세 글자, 복성 네 글자."""
    if re.fullmatch(r"[A-Za-z]{2,20}", token):
        return True
    if not re.fullmatch(r"[가-힣]{2,4}", token) or token in _NOT_NAMES:
        return False
    if len(token) == 2:
        return True
    if len(token) == 3:
        return token[0] in _SURNAMES_1 or token[:2] in _SURNAMES_2
    return token[:2] in _SURNAMES_2
_ME_JOSA = {"이": "내가", "가": "내가", "은": "나는", "는": "나는", "을": "나를", "를": "나를", "과": "나와", "와": "나와",
            "이랑": "나랑", "랑": "나랑", "으로": "나로", "로": "나로", "이야": "나야", "야": "나야", "아": "나야",
            "이에요": "나예요", "예요": "나예요", "이가": "내가", "이는": "나는", "이었": "나였", "였": "나였", "님": "나"}


_GROUPISH = re.compile(r"(모임|스터디|동호회|동아리|모임방|단톡|방|회|반|팀|클럽|크루|멤버|식구|들)$")


def _title_core_tokens(title: str) -> list[str]:
    """제목에서 사람 이름 후보 낱말만. 단체를 뜻하는 낱말('스터디', '독서모임')이 하나라도 있으면 빈 목록."""
    core = re.sub(r"\(.*?\)|\[.*?\]", " ", title)  # '김민수(대학)' 의 괄호 안 설명은 뺀다
    out = []
    for t in re.findall(r"[가-힣]+|[A-Za-z]+", core):
        if t in _GROUP_TITLE_WORDS or (re.fullmatch(r"[가-힣]{2,}", t) and _GROUPISH.search(t) and t not in _NOT_NAMES
                                       and not looks_like_person_name(t)):
            return []
        if re.fullmatch(r"[가-힣]+", t) and t not in _NOT_NAMES:
            t, _ = _core_token(t)  # '과장님', '지은이' 처럼 붙은 호칭은 떼고 ('고양이' 같은 낱말은 그대로)
        if t in _TITLES or t in _ROLE_ONLY or _is_team(t) or t in _COMMON_WORDS:
            continue
        if t.endswith("님") and t[:-1] in _TITLES:
            continue
        out.append(t)
    return out


def title_is_person(title: str | None) -> bool:
    tokens = _title_core_tokens(title or "")
    if len(tokens) == 2 and all(re.fullmatch(r"[A-Za-z]{2,20}", t) for t in tokens):
        return True  # 'Minsu Kim'
    return len(tokens) == 1 and looks_like_person_name(tokens[0])


def effective_member_count(chat: Chat) -> int | None:
    """제목 뒤 숫자가 인원수인지: 제목이 사람 이름처럼 생겼으면('김민수 94') 인원수가 아니라 이름의 일부로 본다."""
    if chat.member_count and not title_is_person(chat.title):
        return chat.member_count
    return None


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
            if nickname.strip() in _ROLE_WORDS:
                # '엄마' 처럼 관계만 적힌 닉네임은 사람을 특정하지 않으니 본문의 '엄마' 는 그대로 둔다
                if alias != self.ME:
                    self._display.setdefault(alias, nickname.strip())
                return
            forms = name_forms(nickname)
            # 닉네임 전체('박지은 팀장')를 한 덩어리로 바꾸면 '박지은 팀장님께' 의 직함까지 사라진다: 직함이 있으면 이름만
            role = role_of(nickname)
            if forms and not (role and len(forms) > 1):
                forms_full.setdefault(forms[0], alias)
            of_other = bool(role and role.startswith("○○"))
            # '서준 엄마', '준서맘' 의 '서준'·'준서' 는 엄마가 아니라 아이: 다른 사람이므로 [이름] 으로만 가린다.
            # 호칭까지 붙은 꼴('준서맘')과 성까지 있는 이름('서윤맘(김혜진)' 의 김혜진)은 그 사람 자신이다.
            child = set()
            if of_other:
                for raw, core, kind, suffix in _name_tokens(nickname):
                    if kind == "short" or (kind == "glued" and suffix in _FAMILY | {"맘", "네"}):
                        child.add(core)
            for f in forms[1:]:
                forms_derived.setdefault(f, "[이름]" if f in child else alias)
            if of_other and forms:
                forms_full.setdefault(forms[0], alias)
            if alias != self.ME:
                role = role_of(nickname)
                # '서준 엄마' 는 '서준' 이 아니라 그 엄마다: 되돌릴 때 닉네임 그대로 ('서준 엄마님')
                if role and role.startswith("○○"):
                    # 되돌릴 때는 '서윤맘' 처럼 호칭이 붙은 꼴 (괄호 속 실명·장식은 빼고)
                    glued = [raw for raw, _, kind, _ in _name_tokens(nickname) if kind == "glued"]
                    d = glued[0] if glued else re.sub(r"\s*\(.*?\)", "", nickname).strip()
                elif role and len(name_forms(nickname)) <= 1:
                    d = role  # '사랑하는 엄마' → '엄마'
                else:
                    d = display_name(nickname)
                cur = self._display.get(alias)
                # 영문 닉네임보다 한글 이름(1:1 방 제목 등)이 있으면 그걸로 되돌린다
                if cur is None or (re.fullmatch(r"[A-Za-z]+", cur) and re.fullmatch(r"[가-힣]{2,4}", d)):
                    self._display[alias] = d
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
            role = role_of(name) if alias != self.ME else None
            self.sender_map[name] = f"{alias}({role})" if role else alias
            register(name, alias)
        if me:
            register(me, self.ME)  # 이 방에서 아직 말하지 않았어도 본인 이름은 가린다
        for extra in also_me:
            if extra and extra.strip():
                register(extra, self.ME)

        # 방 제목: 1:1 방 제목은 보통 내가 저장한 상대 이름이다 (발신자 닉네임과 다를 수 있음: '김민수' vs '민수').
        # 상대가 한 명이면 제목을 그 사람의 다른 이름으로, 한 명도 없으면 새 사람으로 본다. 단체방 제목은 사람이 아니다.
        others = [re.sub(r"\(.*\)$", "", a) for a in self.sender_map.values() if a != self.ME]
        title = re.sub(r"\s+\d+$", "", chat.title or "").strip()  # 'Android 단체방 제목 4' 의 인원수
        known = set(forms_full) | set(forms_derived)
        core_tokens = _title_core_tokens(title)
        person_like = title_is_person(title)  # '영어 스터디', '독서모임' 제외
        is_group = (chat.member_count or 0) >= 3 and not person_like  # Android 단체방 제목 뒤 인원수
        if title and title not in known and core_tokens and core_tokens[0] not in _GROUP_TITLE_WORDS \
                and person_like and len(set(others)) <= 1 and not is_group:
            alias = others[0] if others else None
            if alias is None:
                n += 1
                alias = f"상대{n}"
                self.backward[alias] = title
            forms_full.setdefault(title, alias)
            register(core_tokens[0], alias)  # 괄호 속 설명('대학')은 이름으로 보지 않는다

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
        latin = [f for f in self._forms if re.fullmatch(r"[A-Za-z]+", f)]
        normal = [f for f in self._forms if f not in _COMMON_WORDS and f not in latin]
        common = [f for f in self._forms if f in _COMMON_WORDS]
        tail = rf"(?=(?:(?:{_alt(_STARTERS)})[가-힣]*)?(?!{_WORD}))"
        self._regexes = []
        surname = _SURNAME_PREFIX[:-1]  # 끝의 '?' 를 떼어 '성이 반드시 있음'
        if normal:
            names = _alt(normal)
            self._regexes.append(re.compile(rf"(?<!{_WORD})(?P<n1>{names})" + tail, re.IGNORECASE))
            # 앞에 성이 붙은 꼴: '민수' 만 알 때 본문의 '김민수 대리님', '김민수가'
            person_tail = rf"(?:\s?(?:{_alt(_PERSON_TAIL)}))[가-힣]*(?!{_WORD})"
            self._regexes.append(re.compile(rf"(?<!{_WORD}){surname}(?P<n2>{names})(?={person_tail})"))
            bare = [f for f in normal if re.fullmatch(r"[가-힣]{2}", f)]
            if bare:
                self._regexes.append(re.compile(rf"(?<!{_WORD}){surname}(?P<n2>{_alt(bare)})(?!{_WORD})"))
        if latin:
            # 영문 이름은 뒤에 한글이 바로 붙어도('Jieun입니다') 경계로 본다.
            self._regexes.append(re.compile(rf"(?<![A-Za-z0-9])(?P<n1>{_alt(latin)})(?![A-Za-z0-9])", re.IGNORECASE))
        if common:
            self._regexes.append(re.compile(
                rf"(?<!{_WORD}){_SURNAME_PREFIX}(?P<n1>{_alt(common)})(?=(?:{_alt(_ADDRESS_COMMON)})"
                rf"(?:님)?(?:한테|에게|께서|께|[이가은는을를도의])?(?!{_WORD}))"))
        aliases = list(self.backward) + [self.ME]
        # 한 글자 조사(과, 이 …)는 뒤에 한글이 바로 이어지면 조사가 아니다 ('상대1과장님' 의 '과').
        single = [j for j in _JOSA_LOOKUP if len(j) == 1]
        multi = [j for j in _JOSA_LOOKUP if len(j) > 1]
        # 뒤에 한글이 이어져도 되는 한 글자 꼴(였어, 라는, 랑은 …)은 경계 검사를 하지 않는다.
        loose = [j for j in single if j in ("였", "라", "랑", "나", "든", "고", "지", "네", "니", "면", "시")]
        strict = [j for j in single if j not in loose]
        josa = rf"(?:{_alt(multi)}|(?:{_alt(loose)})|(?:{_alt(strict)})(?=요|[^가-힣]|$))"
        self._restore_re = re.compile(rf"({_alt(aliases)})(?!\d)(?:\([가-힣○]{{1,8}}\))?({josa})?")

    def _sub(self, m: re.Match) -> str:
        n2 = m.groupdict().get("n2")
        key = (m.groupdict().get("n1") or n2 or "").lower()
        if any(m.string.startswith(w, m.start()) for w in _COMMON_EXCEPT):
            return m.group(0)
        if n2 and m.group(0)[: -len(n2)] + n2[:-1] in _SURNAME_NOUNS:
            return m.group(0)  # '설정은', '주민수가' 처럼 낱말로 읽히는 꼴
        return self._lower.get(key, m.group(0))

    def text(self, text: str) -> str:
        # 번호를 먼저 가린다. 이름을 먼저 바꾸면 '민수9001011234567' 처럼 별칭 숫자가 번호에 붙어 버린다.
        text = mask_identifiers(text)
        for rx in self._regexes:
            text = rx.sub(self._sub, text)
        text = _THIRD_PARTY.sub(_mask_third_party, text)
        text = _FULLNAME_TITLE.sub(_mask_fullname_title, text)
        return _fix_alias_josa(text)

    def _message_text(self, m) -> str:
        # 첨부 파일 이름에는 제3자 이름이 들어가기 쉬워('홍길동_이력서.pdf') 확장자만 남긴다
        if m.attachment == "연락처":
            return "연락처: [이름]"  # 연락처 카드는 제3자 이름
        if m.attachment == "파일":
            ext = re.search(r"\.([A-Za-z0-9]{1,6})(?:\s*\(.*\))?\s*$", m.text)
            return f"파일: [파일명]{'.' + ext.group(1) if ext else ''}"
        return self.text(m.text)

    def apply(self, chat: Chat) -> Chat:
        msgs = [replace(m, sender=self.sender_map.get(m.sender, m.sender), text=self._message_text(m))
                for m in chat.messages]
        return Chat(title=self.text(chat.title) if chat.title else chat.title, saved_at=chat.saved_at,
                    saved_at_estimated=chat.saved_at_estimated, member_count=chat.member_count, messages=msgs)

    def restore(self, text: str) -> str:
        text = text.replace(f"{self.ME}님", "나")
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


# 대화에 참여하지 않은 사람을 '○○씨/○○님' 으로 부를 때 (영희씨도 합류해요) → [이름]
# '님' 앞에 오는 호칭·직업·관계 낱말 (교장님, 기자님, 부모님 …) — 이것들은 사람 이름이 아니다.
_HONORIFIC_WORDS = set(_TITLES) | set(_ROLE_WORDS) | set(_DESCRIPTORS) | set("""
고객 어머 아버 할머 할아버 아드 따 부처 하느 하나 주 손 환자 기사 회원 작가 주인 목사 신부 수녀 스 선생 사모 형 누 오라버
도련 사장 의사 간호사 강사 코치 감독 선수 멘토 튜터 여러 모두 다들 그분 이분 저분 그 이 저 부모 장모 장인 시모 시부 사돈
매형 처형 처남 형수 제수 숙모 외숙 당숙 교장 교감 방장 상무 전무 기자 박사 석사 집사 권사 장로 기장 약사 판사 검사 변호사
세무사 회계사 노무사 법무사 담당자 담당 관리자 운영자 의장 국장 처장 차관 장관 시장 군수 구청장 총장 학장 소장 지점장 점장
고문 계장 조장 파트장 사무장 이사장 부회장 회장 원장 센터장 본부장 실장 반장 총무 위원 의원 교수 강사 교사 학부모 담임
도사 영감 대감 마님 나리 도령 사부 스승 조상 성 형 누님 언니 오빠 동생 막내 아가 아기 애기 공주 왕자 대표 기관사 승무원
조종사 운전기사 택배기사 배달기사 경비 관리소장 사감 조교 연구원 직원 사원 대리 과장 차장 부장 팀장 선배 후배 동기 동료
시누 올케 서방 손자 손녀 사위 며느 이웃 성우 배우 가수 총리 간사 조카 사촌 동서 형부 제부 매제 처제 시아버 시어머 친구 고객
가이드 기사 셰프 선장 함장 대장 병장 상병 일병 이병 중사 상사 원사 소위 중위 대위 소령 중령 대령 장군 경찰 형사 검찰 판사
사회자 진행자 출연자 참가자 신청자 지원자 문의자 작성자 게시자 방문자 이용자 회원님 구독자 시청자 청취자 독자 학우 교우 신도
성도 교인 신자 목자 원생 학원생 수강생 학생 학부모 대학원생 박사님 위원장 이장 통장 반상회 동장 면장 읍장 부녀회장 노인회장
""".split())
# '씨' 로 끝나는 낱말 (이름 + 씨 가 아님)
_SSI_WORDS = {"아가", "호박", "손글", "말", "솜", "맵", "마음", "날", "글", "불", "꽃", "볍", "홀", "씨앗", "말솜", "옷맵", "아저",
              "아줌", "아주머", "아재"}
_THIRD_PARTY = re.compile(r"(?<![가-힣A-Za-z0-9\[])([가-힣]{2,3})(?=\s?(씨|님)(?:한테|에게|께서|께|이랑|하고|[이가은는을를도의랑])?"
                          r"(?![가-힣A-Za-z0-9]))")
# 성+이름 뒤에 띄어 쓴 직함 ('김영희 과장님께') — 참여자가 아니어도 실명이므로 가린다
_FULLNAME_TITLE = re.compile(r"(?<![가-힣A-Za-z0-9\[])([가-힣]{3})(?=\s(?:" + "|".join(sorted(_JOB_TITLES, key=len, reverse=True))
                             + r")(?:님)?(?![가-힣]{2}))")


def _mask_third_party(m: re.Match) -> str:
    word, hon = m.group(1), m.group(2)
    if word.startswith("상대"):
        return word
    if hon == "씨":
        # 씨: 이름에 주로 붙는다. '아가씨', '솜씨' 같은 낱말과 '김씨' 같은 성만 쓴 꼴은 그대로
        if word in _SSI_WORDS or word in _HONORIFIC_WORDS:
            return word
        return "[이름]"
    # 님: 대부분 호칭 앞에 붙는다. 호칭 목록에 없고 이름처럼 생긴 것만 가린다.
    if word in _HONORIFIC_WORDS or word in _COMMON_EXCEPT_WORDS or word in _SURNAME_NOUNS:
        return word
    if any(word.endswith(t) for t in _HONORIFIC_WORDS if len(t) >= 2):
        return word  # '박대리님', '김과장님', '구청장님'
    if len(word) == 3 and word[-1] in "사관생장가원자인":
        return word  # '변호사님', '소방관님', '대학생님' 같은 직업
    if len(word) == 3 and not _full_name_like(word):
        return word
    return "[이름]"


_COMMON_EXCEPT_WORDS = {"하나", "하느", "부처", "예수", "알라", "주"}


def _mask_fullname_title(m: re.Match) -> str:
    word = m.group(1)
    return "[이름]" if _full_name_like(word) else word


# 별칭 뒤 조사를 별칭 받침에 맞춘다: '철수가' → '[본인]이', '김민수랑' → '상대1이랑' (상대1 = 상대'일')
_DIGIT_READING = {"0": "영", "1": "일", "2": "이", "3": "삼", "4": "사", "5": "오", "6": "육", "7": "칠", "8": "팔", "9": "구"}
_ALIAS_JOSA = re.compile(r"(상대\d+|\[본인\])(?:\([가-힣○]{1,8}\))?(이랑|랑|으로|로|이|가|은|는|을|를|과|와|아|야)(?![가-힣])")


def _fix_alias_josa(text: str) -> str:
    def sub(m: re.Match) -> str:
        alias, josa = m.group(1), m.group(2)
        reading = "인" if alias == "[본인]" else _DIGIT_READING[alias[-1]]
        fixed = attach_josa(reading, josa)[len(reading):]
        return m.group(0)[: -len(josa)] + fixed
    return _ALIAS_JOSA.sub(sub, text)


def log_summary(chat: Chat) -> str:
    """로그에 남겨도 되는 정보만: 이름·내용 없이 개수만."""
    return f"messages={len(chat.messages)} participants={len(chat.participants)}"
