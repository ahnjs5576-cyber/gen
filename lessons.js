/*
 * 파이썬 한 입 — 30일 커리큘럼
 *
 * 레슨 하나의 구조
 *   day, week, title, token(진도표에 보이는 핵심 키워드), minutes, summary
 *   keys    : 오늘의 핵심 3줄. `코드`, **형광펜** 표기를 쓸 수 있어요.
 *   body    : { t: "p", s } 설명 문단 / { t: "code", code, stdin? } 실행 가능한 예제
 *   quiz    : { q, code?, options[], answer(0부터), explain }
 *   task    : { prompt, starter, expect, stdin?, need?[], hint, solution }
 *             expect 는 정답 출력. 줄 끝 공백은 무시하고 비교해요.
 *             need 는 코드에 꼭 들어가야 하는 키워드예요.
 */
window.WEEKS = [
  { n: 1, name: "기초 문법", from: 1, to: 7 },
  { n: 2, name: "흐름과 리스트", from: 8, to: 14 },
  { n: 3, name: "자료구조와 함수", from: 15, to: 21 },
  { n: 4, name: "도구와 객체", from: 22, to: 30 },
];

window.LESSONS = [
  {
    day: 1, title: "첫 코드, print()", token: "print()", minutes: 5,
    summary: "화면에 글자를 보여주는 첫 번째 명령",
    keys: [
      "`print()`는 괄호 안의 값을 **화면에 출력**해요.",
      "글자(문자열)는 따옴표로 감싸요: `\"안녕\"` 또는 `'안녕'`",
      "쉼표로 여러 값을 넘기면 **한 칸씩 띄워서** 출력돼요.",
    ],
    body: [
      { t: "p", s: "파이썬 코드는 위에서 아래로 한 줄씩 실행돼요. 가장 먼저 배울 명령은 `print()`예요. 아래 코드를 그대로 실행해 보고, 글자를 바꿔서 다시 실행해 보세요." },
      { t: "code", code: `print("안녕하세요!")
print("파이썬", "시작", 2026)
print(3 + 4)` },
      { t: "p", s: "숫자는 따옴표 없이 쓰고, `3 + 4`처럼 계산한 결과도 바로 출력할 수 있어요. `#` 뒤에 쓴 글은 주석이라 실행되지 않아요." },
    ],
    quiz: {
      q: "'안녕'을 올바르게 출력하는 코드는?",
      options: ["print(안녕)", "print(\"안녕\")", "Print(\"안녕\")", "print[\"안녕\"]"],
      answer: 1,
      explain: "글자는 따옴표로 감싸야 해요. 파이썬은 대소문자를 구분해서 `Print`가 아니라 `print`예요.",
    },
    task: {
      prompt: "두 줄을 출력하세요. 첫 줄은 `Hello, Python`, 둘째 줄은 `1 + 1`의 계산 결과예요.",
      starter: "# 여기에 코드를 작성하세요\n",
      expect: "Hello, Python\n2",
      hint: "`print(\"Hello, Python\")` 다음 줄에 `print(1 + 1)`을 써 보세요.",
      solution: `print("Hello, Python")
print(1 + 1)`,
    },
  },
  {
    day: 2, title: "변수: 값에 이름 붙이기", token: "x = 1", minutes: 5,
    summary: "값을 저장하고 다시 꺼내 쓰는 방법",
    keys: [
      "변수는 값에 붙이는 **이름표**예요: `age = 20`",
      "`=`는 '같다'가 아니라 **오른쪽 값을 왼쪽 이름에 넣기**예요.",
      "이름은 영문·숫자·`_`로 짓고, 숫자로 시작할 수 없어요.",
    ],
    body: [
      { t: "p", s: "값을 변수에 넣어 두면 몇 번이고 다시 꺼내 쓸 수 있어요." },
      { t: "code", code: `name = "민지"
age = 20
print(name, age)

age = age + 1   # 지금 값에 1을 더해 다시 저장
print(name, age)` },
      { t: "p", s: "`age = age + 1`은 수학식으로 보면 이상하지만, 파이썬에서는 '지금 `age`에 1을 더한 값을 다시 `age`에 넣어라'라는 뜻이에요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `x = 5
x = x * 2
print(x)`,
      options: ["5", "10", "25", "x"],
      answer: 1,
      explain: "처음 `x`는 5, 다음 줄에서 `5 * 2 = 10`을 다시 `x`에 넣었어요.",
    },
    task: {
      prompt: "변수 `price`에 3000, `count`에 4를 넣고, `total = price * count`를 만든 뒤 `total`을 출력하세요.",
      starter: "price = \ncount = \n",
      expect: "12000",
      need: ["price", "count", "total"],
      hint: "`total = price * count` 다음 줄에 `print(total)`",
      solution: `price = 3000
count = 4
total = price * count
print(total)`,
    },
  },
  {
    day: 3, title: "숫자 계산", token: "// %", minutes: 5,
    summary: "사칙연산, 몫, 나머지, 거듭제곱",
    keys: [
      "`/`는 나눗셈, `//`는 **몫**, `%`는 **나머지**예요.",
      "`**`는 거듭제곱: `2 ** 3`은 8",
      "계산 순서는 수학과 같아요. 헷갈리면 **괄호**를 쓰세요.",
    ],
    body: [
      { t: "code", code: `print(7 / 2)    # 3.5
print(7 // 2)   # 3  몫
print(7 % 2)    # 1  나머지
print(2 ** 10)  # 1024
print((1 + 2) * 3)` },
      { t: "p", s: "`/`의 결과는 항상 소수점이 있는 실수예요. 나머지 `%`는 짝수·홀수 판별에 자주 써요. `n % 2`가 0이면 짝수예요." },
    ],
    quiz: {
      q: "`17 % 5`의 결과는?",
      options: ["3", "2", "3.4", "12"],
      answer: 1,
      explain: "17을 5로 나누면 몫이 3, 나머지가 2예요.",
    },
    task: {
      prompt: "`minutes = 100`은 몇 시간 몇 분일까요? 시간과 분을 한 줄에 출력하세요. 결과: `1 40`",
      starter: "minutes = 100\n",
      expect: "1 40",
      need: ["//", "%"],
      hint: "시간은 `minutes // 60`, 남은 분은 `minutes % 60`",
      solution: `minutes = 100
print(minutes // 60, minutes % 60)`,
    },
  },
  {
    day: 4, title: "문자열 다루기", token: "\"str\"", minutes: 6,
    summary: "글자를 잇고, 반복하고, 잘라내기",
    keys: [
      "`+`로 이어 붙이고, `*`로 반복해요.",
      "`len()`으로 길이, `[번호]`로 한 글자를 꺼내요. 번호는 **0부터!**",
      "`[시작:끝]`은 끝 번호 **직전까지** 잘라요.",
    ],
    body: [
      { t: "code", code: `word = "Python"
print(word + "!" * 3)
print(len(word))
print(word[0], word[-1])   # 첫 글자, 마지막 글자
print(word[0:3])           # 앞에서 3글자` },
      { t: "p", s: "음수 번호는 뒤에서부터 세요. `[-1]`은 마지막 글자예요. `[0:3]`은 0, 1, 2번 글자까지예요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `s = "hello"
print(s[1])`,
      options: ["h", "e", "l", "1"],
      answer: 1,
      explain: "번호는 0부터 시작해요. `s[0]`이 h, `s[1]`이 e예요.",
    },
    task: {
      prompt: "`text = \"programming\"`의 첫 글자와 길이를 한 줄에 출력하세요. 결과: `p 11`",
      starter: "text = \"programming\"\n",
      expect: "p 11",
      hint: "`print(text[0], len(text))`",
      solution: `text = "programming"
print(text[0], len(text))`,
    },
  },
  {
    day: 5, title: "f-string으로 깔끔하게", token: "f\"{x}\"", minutes: 5,
    summary: "문자열 안에 변수를 바로 넣는 법",
    keys: [
      "문자열 앞에 `f`를 붙이면 `{}` 안에 **변수를 바로** 넣어요.",
      "`{}` 안에서 계산도 돼요: `f\"{a + b}\"`",
      "`{x:.2f}`는 **소수점 둘째 자리**까지 보여줘요.",
    ],
    body: [
      { t: "code", code: `name = "지호"
score = 92.456
print(f"{name}님의 점수는 {score}점")
print(f"반올림: {score:.1f}점")
print(f"내년 나이: {20 + 1}살")` },
      { t: "p", s: "문자열과 숫자는 `+`로 바로 붙일 수 없어요(`\"나이\" + 20`은 오류). 그래서 f-string이 가장 편한 방법이에요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `a = 3
print(f"{a}+{a}={a+a}")`,
      options: ["3+3=6", "{a}+{a}={a+a}", "a+a=6", "6"],
      answer: 0,
      explain: "`{}` 안의 내용이 계산된 값으로 바뀌어요.",
    },
    task: {
      prompt: "`item = \"커피\"`, `price = 4500`일 때 f-string으로 `커피의 가격은 4500원입니다`를 출력하세요.",
      starter: "item = \"커피\"\nprice = 4500\n",
      expect: "커피의 가격은 4500원입니다",
      need: ["f\""],
      hint: "`print(f\"{item}의 가격은 {price}원입니다\")`",
      solution: `item = "커피"
price = 4500
print(f"{item}의 가격은 {price}원입니다")`,
    },
  },
  {
    day: 6, title: "입력받기와 형변환", token: "int()", minutes: 6,
    summary: "input()으로 받고, 숫자로 바꾸기",
    keys: [
      "`input()`은 입력을 받아요. 결과는 **항상 문자열!**",
      "숫자로 계산하려면 `int()`나 `float()`로 바꿔요.",
      "반대로 숫자를 문자열로 바꿀 땐 `str()`",
    ],
    body: [
      { t: "p", s: "이 앱에서는 코드 아래 '입력값' 칸에 적은 줄이 `input()`에 차례로 들어가요. 입력값을 바꿔서 실행해 보세요." },
      { t: "code", stdin: "7", code: `n = input("숫자를 입력하세요: ")
print(n * 2)        # 문자열 반복 → 77
print(int(n) * 2)   # 숫자 계산 → 14` },
      { t: "p", s: "`\"7\" * 2`는 글자를 두 번 이어 붙인 `77`이에요. 계산하려면 꼭 `int()`로 바꿔 주세요." },
    ],
    quiz: {
      q: "입력받은 값에 3을 더하는 올바른 코드는?",
      options: ["input() + 3", "int(input()) + 3", "input() + \"3\"", "str(input()) + 3"],
      answer: 1,
      explain: "`input()`은 문자열을 돌려주니 `int()`로 감싸야 숫자 계산이 돼요.",
    },
    task: {
      prompt: "태어난 해를 입력받아 2026년 기준 나이(`2026 - 태어난 해`)를 출력하세요. 입력값에는 1990이 준비돼 있어요.",
      starter: "year = input(\"태어난 해: \")\n",
      stdin: "1990",
      expect: "36",
      need: ["int("],
      hint: "`print(2026 - int(year))`",
      solution: `year = input("태어난 해: ")
print(2026 - int(year))`,
    },
  },
  {
    day: 7, title: "참과 거짓", token: "True", minutes: 5,
    summary: "비교 연산과 and · or · not",
    keys: [
      "비교 결과는 `True`(참) 또는 `False`(거짓)예요.",
      "같다는 `==`, 다르다는 `!=`. **`=` 하나는 대입!**",
      "`and`(둘 다), `or`(하나라도), `not`(반대)로 조건을 묶어요.",
    ],
    body: [
      { t: "code", code: `age = 17
print(age >= 18)
print(age == 17, age != 17)
print(age > 10 and age < 20)
print(not True)` },
      { t: "p", s: "`10 < age < 20`처럼 비교를 이어 쓸 수도 있어요. 다음 레슨의 `if`에서 이 참·거짓을 써요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `print(3 > 2 or 1 > 5)`,
      options: ["True", "False", "3", "오류"],
      answer: 0,
      explain: "`or`는 하나만 참이어도 참이에요. `3 > 2`가 참이에요.",
    },
    task: {
      prompt: "`score = 85`일 때, `score`가 80 이상이고 90 미만인지 출력하세요. 결과: `True`",
      starter: "score = 85\n",
      expect: "True",
      hint: "`print(score >= 80 and score < 90)`",
      solution: `score = 85
print(score >= 80 and score < 90)`,
    },
  },
  {
    day: 8, title: "조건문 if", token: "if:", minutes: 6,
    summary: "조건에 따라 다른 코드를 실행하기",
    keys: [
      "`if 조건:` 다음 줄은 **들여쓰기(스페이스 4칸)**해요.",
      "`elif`로 다른 조건을, `else`로 나머지 모든 경우를 처리해요.",
      "위에서부터 검사해서 **처음 참인 곳 하나만** 실행돼요.",
    ],
    body: [
      { t: "code", code: `temp = 28
if temp >= 30:
    print("너무 더워요")
elif temp >= 20:
    print("따뜻해요")
else:
    print("쌀쌀해요")` },
      { t: "p", s: "콜론(`:`)과 들여쓰기가 '여기부터 여기까지가 if의 영역'이라는 표시예요. `temp`를 35, 10으로 바꿔 실행해 보세요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `n = 7
if n % 2 == 0:
    print("짝수")
else:
    print("홀수")`,
      options: ["짝수", "홀수", "짝수 홀수", "아무것도 안 나옴"],
      answer: 1,
      explain: "`7 % 2`는 1이라 조건이 거짓, 그래서 `else`가 실행돼요.",
    },
    task: {
      prompt: "`score = 76`일 때 90 이상은 `A`, 80 이상은 `B`, 70 이상은 `C`, 나머지는 `F`를 출력하세요.",
      starter: "score = 76\n",
      expect: "C",
      need: ["if", "elif", "else"],
      hint: "큰 점수부터 차례로 검사하세요: `if score >= 90:` → `elif score >= 80:` → `elif score >= 70:` → `else:`",
      solution: `score = 76
if score >= 90:
    print("A")
elif score >= 80:
    print("B")
elif score >= 70:
    print("C")
else:
    print("F")`,
    },
  },
  {
    day: 9, title: "리스트", token: "[ ]", minutes: 6,
    summary: "여러 값을 순서대로 담는 상자",
    keys: [
      "리스트는 여러 값을 **순서대로** 담아요: `[1, 2, 3]`",
      "번호(인덱스)는 0부터. `fruits[0]`이 첫 번째예요.",
      "`append()`로 끝에 추가, `len()`으로 개수를 세요.",
    ],
    body: [
      { t: "code", code: `fruits = ["사과", "바나나"]
fruits.append("포도")
print(fruits)
print(fruits[0], len(fruits))

fruits[1] = "딸기"   # 값 바꾸기
print(fruits)` },
      { t: "p", s: "리스트에는 숫자, 문자열 등 무엇이든 담을 수 있어요. 문자열과 달리 안의 값을 바꿀 수 있어요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `nums = [10, 20, 30]
print(nums[-1])`,
      options: ["10", "20", "30", "-1"],
      answer: 2,
      explain: "`[-1]`은 뒤에서 첫 번째, 즉 마지막 값이에요.",
    },
    task: {
      prompt: "빈 리스트 `todo = []`에 `\"공부\"`, `\"운동\"`을 `append`로 넣고, 리스트와 개수를 차례로 출력하세요.",
      starter: "todo = []\n",
      expect: "['공부', '운동']\n2",
      need: ["append"],
      hint: "`todo.append(\"공부\")`를 두 번 쓰고 `print(todo)`, `print(len(todo))`",
      solution: `todo = []
todo.append("공부")
todo.append("운동")
print(todo)
print(len(todo))`,
    },
  },
  {
    day: 10, title: "리스트 다루기", token: "sort()", minutes: 6,
    summary: "자르기, 찾기, 정렬, 삭제",
    keys: [
      "슬라이싱 `lst[1:3]`으로 **일부만** 잘라요.",
      "`in`으로 들어있는지 확인: `9 in nums`",
      "`sort()`는 정렬, `remove()`는 값 삭제, `pop()`은 꺼내기",
    ],
    body: [
      { t: "code", code: `nums = [5, 2, 9, 1]
nums.sort()
print(nums)
print(nums[:2])          # 앞에서 2개
print(9 in nums, 7 in nums)

nums.remove(9)
last = nums.pop()        # 마지막 값을 꺼내요
print(nums, last)` },
      { t: "p", s: "`sort(reverse=True)`를 쓰면 큰 수부터 정렬돼요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `a = [3, 1, 2]
a.sort()
print(a[0])`,
      options: ["3", "1", "2", "[1, 2, 3]"],
      answer: 1,
      explain: "정렬하면 `[1, 2, 3]`, 그 첫 값은 1이에요.",
    },
    task: {
      prompt: "`scores = [70, 95, 82, 64]`를 큰 순서로 정렬해 출력하세요.",
      starter: "scores = [70, 95, 82, 64]\n",
      expect: "[95, 82, 70, 64]",
      hint: "`scores.sort(reverse=True)` 후 `print(scores)`",
      solution: `scores = [70, 95, 82, 64]
scores.sort(reverse=True)
print(scores)`,
    },
  },
  {
    day: 11, title: "반복문 for", token: "for in", minutes: 6,
    summary: "리스트와 range를 하나씩 돌기",
    keys: [
      "`for 변수 in 리스트:`는 값을 **하나씩 꺼내** 반복해요.",
      "`range(5)`는 0~4, `range(1, 6)`은 1~5. **끝 숫자는 포함 안 돼요!**",
      "반복할 코드는 들여쓰기 안에 써요.",
    ],
    body: [
      { t: "code", code: `for fruit in ["사과", "배", "감"]:
    print(fruit, "맛있어")

for i in range(1, 4):
    print(i, "번째")` },
      { t: "p", s: "문자열도 `for ch in \"hello\":`처럼 한 글자씩 돌 수 있어요." },
    ],
    quiz: {
      q: "출력되는 마지막 숫자는?",
      code: `for i in range(3):
    print(i)`,
      options: ["3", "2", "1", "0"],
      answer: 1,
      explain: "`range(3)`은 0, 1, 2예요. 끝 숫자 3은 포함되지 않아요.",
    },
    task: {
      prompt: "`for`와 `range`로 구구단 3단을 출력하세요. 형식: `3 x 1 = 3` … `3 x 9 = 27`",
      starter: "",
      expect: "3 x 1 = 3\n3 x 2 = 6\n3 x 3 = 9\n3 x 4 = 12\n3 x 5 = 15\n3 x 6 = 18\n3 x 7 = 21\n3 x 8 = 24\n3 x 9 = 27",
      need: ["for"],
      hint: "`for i in range(1, 10):` 안에서 `print(f\"3 x {i} = {3 * i}\")`",
      solution: `for i in range(1, 10):
    print(f"3 x {i} = {3 * i}")`,
    },
  },
  {
    day: 12, title: "반복문 while", token: "while", minutes: 6,
    summary: "조건이 참인 동안 계속하기",
    keys: [
      "`while 조건:`은 조건이 **참인 동안** 계속 반복해요.",
      "조건이 언젠가 거짓이 되게 값을 바꿔야 해요. **안 그러면 무한 반복!**",
      "`break`는 반복을 즉시 멈추고, `continue`는 이번 회차만 건너뛰어요.",
    ],
    body: [
      { t: "code", code: `count = 3
while count > 0:
    print(count)
    count -= 1     # count = count - 1 과 같아요
print("발사!")` },
      { t: "p", s: "`x += 1`, `x -= 1`은 자주 쓰는 줄임 표현이에요. 아래는 `while True:`로 계속 돌다가 `break`로 빠져나오는 패턴이에요." },
      { t: "code", code: `n = 0
while True:
    n += 1
    if n % 2 == 0:
        continue   # 짝수는 건너뛰기
    if n > 7:
        break      # 7을 넘으면 끝
    print(n)` },
      { t: "p", s: "주의: 끝나지 않는 반복을 실행하면 브라우저가 멈출 수 있어요. 그럴 땐 페이지를 새로 고치세요." },
    ],
    quiz: {
      q: "`break`가 하는 일은?",
      options: ["다음 회차로 건너뛴다", "반복문을 즉시 끝낸다", "프로그램 전체를 끝낸다", "조건을 다시 검사한다"],
      answer: 1,
      explain: "`break`는 가장 가까운 반복문 하나를 끝내요. 건너뛰기는 `continue`예요.",
    },
    task: {
      prompt: "1부터 차례로 더해 나가다가, 합이 처음으로 50을 넘는 순간의 숫자 `n`을 출력하세요.",
      starter: "total = 0\nn = 0\n",
      expect: "10",
      need: ["while"],
      hint: "`while total <= 50:` 안에서 `n += 1`, `total += n`. 반복이 끝나면 `print(n)`",
      solution: `total = 0
n = 0
while total <= 50:
    n += 1
    total += n
print(n)`,
    },
  },
  {
    day: 13, title: "합계·최댓값 패턴", token: "total +=", minutes: 6,
    summary: "반복하며 값을 쌓아가는 기본기",
    keys: [
      "합계는 `total = 0`으로 시작해 반복하며 **더해 나가요**.",
      "최댓값은 첫 값을 기준으로 두고 **더 큰 값이 나오면 바꿔요**.",
      "개수 세기도 같은 원리: `count += 1`",
    ],
    body: [
      { t: "code", code: `scores = [80, 92, 67, 75]
total = 0
best = scores[0]
for s in scores:
    total += s
    if s > best:
        best = s
print("합계:", total)
print("평균:", total / len(scores))
print("최고:", best)` },
      { t: "p", s: "이 패턴은 거의 모든 프로그램에 나와요. 사실 `sum()`, `max()` 같은 내장 함수로도 할 수 있는데, 원리를 알아 두면 조건이 붙은 계산도 쉽게 만들 수 있어요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `c = 0
for n in [1, 2, 3, 4, 5]:
    if n % 2 == 1:
        c += 1
print(c)`,
      options: ["2", "3", "5", "9"],
      answer: 1,
      explain: "홀수 1, 3, 5를 만날 때마다 1씩 세서 3이에요.",
    },
    task: {
      prompt: "`words` 중에서 길이가 4 이상인 단어의 개수를 세어 출력하세요.",
      starter: "words = [\"cat\", \"elephant\", \"dog\", \"giraffe\"]\n",
      expect: "2",
      need: ["for"],
      hint: "`count = 0`, `for w in words:` 안에서 `if len(w) >= 4: count += 1`",
      solution: `words = ["cat", "elephant", "dog", "giraffe"]
count = 0
for w in words:
    if len(w) >= 4:
        count += 1
print(count)`,
    },
  },
  {
    day: 14, title: "문자열 메서드", token: "split()", minutes: 6,
    summary: "자르고, 합치고, 바꾸기",
    keys: [
      "`split()`은 문자열을 잘라 **리스트로**, `join()`은 리스트를 **문자열로** 합쳐요.",
      "`strip()`은 앞뒤 공백 제거, `replace(a, b)`는 a를 b로 바꿔요.",
      "`upper()`/`lower()`로 대소문자 변경. **원본은 그대로예요!**",
    ],
    body: [
      { t: "code", code: `line = "  사과,바나나,포도  "
items = line.strip().split(",")
print(items)
print(" / ".join(items))
print("I like cats".replace("cats", "dogs").upper())` },
      { t: "p", s: "메서드는 새 문자열을 돌려줄 뿐 원래 변수는 바뀌지 않아요. 바뀐 값을 쓰려면 `s = s.upper()`처럼 다시 저장해요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `print("-".join(["a", "b", "c"]))`,
      options: ["abc", "a-b-c", "-a-b-c-", "['a', 'b', 'c']"],
      answer: 1,
      explain: "`join`은 앞의 문자열 `\"-\"`를 사이사이에 넣어 합쳐요.",
    },
    task: {
      prompt: "`sentence`의 단어 개수를 출력하고, 다음 줄에 `python`을 `Python`으로 바꾼 문장을 출력하세요.",
      starter: "sentence = \"python is fun and python is easy\"\n",
      expect: "7\nPython is fun and Python is easy",
      hint: "단어 개수는 `len(sentence.split())`, 바꾸기는 `sentence.replace(\"python\", \"Python\")`",
      solution: `sentence = "python is fun and python is easy"
print(len(sentence.split()))
print(sentence.replace("python", "Python"))`,
    },
  },
  {
    day: 15, title: "딕셔너리", token: "{k: v}", minutes: 6,
    summary: "이름으로 값을 찾는 사전",
    keys: [
      "딕셔너리는 **키: 값** 쌍을 저장해요: `{\"이름\": \"민지\"}`",
      "`d[키]`로 꺼내고, `d[키] = 값`으로 추가·수정해요.",
      "`for k, v in d.items():`로 전부 돌아볼 수 있어요.",
    ],
    body: [
      { t: "code", code: `phone = {"민지": "010-1234", "지호": "010-5678"}
print(phone["민지"])

phone["서연"] = "010-9999"     # 추가
for name, num in phone.items():
    print(name, num)

print(phone.get("철수", "없음"))  # 없으면 기본값` },
      { t: "p", s: "리스트는 번호로, 딕셔너리는 이름(키)으로 찾아요. 없는 키를 `d[키]`로 꺼내면 `KeyError`가 나니 확실하지 않을 땐 `get()`을 쓰세요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `d = {"a": 1, "b": 2}
d["a"] = 10
print(d["a"] + d["b"])`,
      options: ["3", "12", "11", "오류"],
      answer: 1,
      explain: "`d[\"a\"]`가 10으로 바뀌어 10 + 2 = 12예요.",
    },
    task: {
      prompt: "`stock`에 `\"감\": 2`를 추가하고, 사과 개수를 1 늘린 뒤 모든 과일의 총 개수를 출력하세요.",
      starter: "stock = {\"사과\": 3, \"배\": 5}\n",
      expect: "11",
      hint: "`stock[\"감\"] = 2`, `stock[\"사과\"] += 1`, 합계는 `sum(stock.values())`",
      solution: `stock = {"사과": 3, "배": 5}
stock["감"] = 2
stock["사과"] += 1
print(sum(stock.values()))`,
    },
  },
  {
    day: 16, title: "튜플과 집합", token: "set()", minutes: 5,
    summary: "바꿀 수 없는 묶음, 중복 없는 모음",
    keys: [
      "튜플 `(1, 2)`는 **바꿀 수 없는** 리스트예요. 좌표처럼 고정된 묶음에 써요.",
      "`a, b = b, a`처럼 여러 변수에 한 번에 나눠 담아요(언패킹).",
      "집합 `set`은 **중복을 없애고** 순서가 없어요.",
    ],
    body: [
      { t: "code", code: `point = (3, 5)
x, y = point
print(x + y)

a, b = 1, 2
a, b = b, a        # 값 바꾸기
print(a, b)

tags = ["py", "js", "py", "go", "js"]
print(len(set(tags)))
print(sorted(set(tags)))` },
      { t: "p", s: "집합은 순서가 없어서 출력 순서가 매번 다를 수 있어요. 정해진 순서가 필요하면 `sorted()`로 정렬하세요." },
    ],
    quiz: {
      q: "`len(set([1, 1, 2, 2, 3]))`의 결과는?",
      options: ["5", "3", "2", "6"],
      answer: 1,
      explain: "중복을 없애면 `{1, 2, 3}`, 개수는 3이에요.",
    },
    task: {
      prompt: "`votes`에서 서로 다른 후보 수를 출력하고, 다음 줄에 후보 목록을 정렬해 출력하세요.",
      starter: "votes = [\"A\", \"B\", \"A\", \"C\", \"B\", \"A\"]\n",
      expect: "3\n['A', 'B', 'C']",
      need: ["set"],
      hint: "`print(len(set(votes)))`, `print(sorted(set(votes)))`",
      solution: `votes = ["A", "B", "A", "C", "B", "A"]
print(len(set(votes)))
print(sorted(set(votes)))`,
    },
  },
  {
    day: 17, title: "함수 만들기", token: "def", minutes: 7,
    summary: "자주 쓰는 코드를 나만의 명령으로",
    keys: [
      "`def 이름(매개변수):`로 **나만의 명령**을 만들어요.",
      "`return`은 결과값을 **돌려주고** 함수를 끝내요.",
      "같은 코드를 여러 번 쓴다면 함수로 묶을 때예요.",
    ],
    body: [
      { t: "code", code: `def greet(name):
    return f"{name}님, 반가워요!"

print(greet("민지"))
print(greet("지호"))

def square(n):
    return n * n

print(square(4) + square(3))` },
      { t: "p", s: "`print`는 화면에 보여주기만 하고, `return`은 값을 돌려줘서 다른 계산에 다시 쓸 수 있어요. `square(4) + square(3)`이 되는 이유예요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `def add(a, b):
    return a + b

print(add(2, add(3, 4)))`,
      options: ["9", "7", "234", "오류"],
      answer: 0,
      explain: "안쪽 `add(3, 4)`가 먼저 7이 되고, `add(2, 7)`은 9예요.",
    },
    task: {
      prompt: "숫자 `n`이 짝수면 `\"짝수\"`, 홀수면 `\"홀수\"`를 `return`하는 함수 `even_odd(n)`을 완성하세요. 아래 출력 코드는 그대로 두세요.",
      starter: `def even_odd(n):
    # 여기를 채우세요
    pass

print(even_odd(4))
print(even_odd(7))`,
      expect: "짝수\n홀수",
      need: ["def", "return"],
      hint: "`if n % 2 == 0:` 이면 `return \"짝수\"`, 아니면 `return \"홀수\"`",
      solution: `def even_odd(n):
    if n % 2 == 0:
        return "짝수"
    return "홀수"

print(even_odd(4))
print(even_odd(7))`,
    },
  },
  {
    day: 18, title: "매개변수 더 알기", token: "n=2", minutes: 6,
    summary: "기본값, 이름 붙여 넘기기, 여러 값 돌려주기",
    keys: [
      "매개변수에 **기본값**을 줄 수 있어요: `def f(x, n=2):`",
      "이름을 붙여 넘기면 순서를 몰라도 돼요: `f(n=4, x=3)`",
      "`return a, b`로 **여러 값을 한 번에** 돌려줘요.",
    ],
    body: [
      { t: "code", code: `def power(base, exp=2):
    return base ** exp

print(power(3))          # exp는 기본값 2
print(power(2, 5))
print(power(exp=3, base=2))

def min_max(nums):
    return min(nums), max(nums)

lo, hi = min_max([4, 8, 1])
print(lo, hi)` },
      { t: "p", s: "여러 값을 돌려주면 사실 튜플 하나가 돌아와요. 그래서 16일차에 배운 언패킹으로 받을 수 있어요." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `def f(a, b=10):
    return a + b

print(f(1))`,
      options: ["1", "11", "10", "오류"],
      answer: 1,
      explain: "`b`를 넘기지 않아서 기본값 10이 쓰여요.",
    },
    task: {
      prompt: "가격과 할인율(%)을 받아 할인된 가격을 돌려주는 `sale(price, rate=10)`을 완성하세요. 계산식은 `price * (100 - rate) // 100`이에요.",
      starter: `def sale(price, rate=10):
    # 여기를 채우세요
    pass

print(sale(10000))
print(sale(10000, 30))`,
      expect: "9000\n7000",
      need: ["return"],
      hint: "`return price * (100 - rate) // 100`",
      solution: `def sale(price, rate=10):
    return price * (100 - rate) // 100

print(sale(10000))
print(sale(10000, 30))`,
    },
  },
  {
    day: 19, title: "반복 안의 반복", token: "for×for", minutes: 6,
    summary: "행과 열로 도는 중첩 반복",
    keys: [
      "반복문 안에 반복문을 넣으면 **행 × 열** 모양으로 돌아요.",
      "바깥 반복 한 번에 안쪽 반복이 **처음부터 끝까지** 돌아요.",
      "`print(..., end=\"\")`는 줄바꿈 없이 이어서 출력해요.",
    ],
    body: [
      { t: "code", code: `for i in range(1, 4):
    for j in range(1, 4):
        print(i * j, end=" ")
    print()   # 한 줄이 끝나면 줄바꿈` },
      { t: "p", s: "리스트 안에 리스트를 넣으면 표처럼 쓸 수 있어요. `grid[행][열]` 순서로 꺼내요." },
      { t: "code", code: `grid = [[1, 2, 3],
        [4, 5, 6]]
print(grid[1][0])
for row in grid:
    print(sum(row))` },
    ],
    quiz: {
      q: "`*`는 모두 몇 번 출력될까요?",
      code: `for i in range(2):
    for j in range(3):
        print("*")`,
      options: ["2", "3", "5", "6"],
      answer: 3,
      explain: "바깥 2번 × 안쪽 3번 = 6번이에요.",
    },
    task: {
      prompt: "별(`*`)로 계단을 출력하세요. 1번째 줄에 1개, 5번째 줄에 5개예요.",
      starter: "",
      expect: "*\n**\n***\n****\n*****",
      need: ["for"],
      hint: "중첩 반복으로 `print(\"*\", end=\"\")`를 써도 되고, `print(\"*\" * i)` 한 줄로도 돼요.",
      solution: `for i in range(1, 6):
    for j in range(i):
        print("*", end="")
    print()`,
    },
  },
  {
    day: 20, title: "리스트 컴프리헨션", token: "[x for]", minutes: 6,
    summary: "새 리스트를 한 줄로 만들기",
    keys: [
      "`[식 for x in 리스트]`로 새 리스트를 **한 줄에** 만들어요.",
      "뒤에 `if`를 붙이면 **조건에 맞는 것만** 골라요.",
      "너무 길어져서 읽기 어렵다면 일반 `for`문이 더 나아요.",
    ],
    body: [
      { t: "code", code: `nums = [1, 2, 3, 4, 5, 6]
squares = [n ** 2 for n in nums]
evens = [n for n in nums if n % 2 == 0]
print(squares)
print(evens)

names = ["kim", "lee"]
print([s.upper() for s in names])` },
      { t: "p", s: "위 `squares`를 `for`문으로 쓰면 빈 리스트를 만들고 `append`를 반복하는 4줄이 돼요. 같은 일을 한 줄로 줄인 거예요." },
    ],
    quiz: {
      q: "`[x * 2 for x in range(3)]`의 결과는?",
      options: ["[2, 4, 6]", "[0, 2, 4]", "[0, 1, 2]", "6"],
      answer: 1,
      explain: "`range(3)`은 0, 1, 2이고, 각각 2를 곱해 `[0, 2, 4]`예요.",
    },
    task: {
      prompt: "`prices`에서 3000원 이상인 가격만 골라 10% 할인한 값(`p * 9 // 10`)의 리스트를 출력하세요.",
      starter: "prices = [1200, 5800, 3000, 9900, 450]\n",
      expect: "[5220, 2700, 8910]",
      need: ["for", "if"],
      hint: "`[p * 9 // 10 for p in prices if p >= 3000]`",
      solution: `prices = [1200, 5800, 3000, 9900, 450]
print([p * 9 // 10 for p in prices if p >= 3000])`,
    },
  },
  {
    day: 21, title: "오류 처리", token: "try", minutes: 6,
    summary: "오류가 나도 멈추지 않게",
    keys: [
      "`try:`로 감싸고 `except:`에서 오류를 처리하면 **프로그램이 멈추지 않아요**.",
      "`except ValueError:`처럼 **오류 종류를 정확히** 쓰는 게 좋아요.",
      "오류 메시지의 **마지막 줄**이 원인을 알려줘요.",
    ],
    body: [
      { t: "code", code: `for text in ["10", "abc", "0"]:
    try:
        n = int(text)
        print(100 / n)
    except ValueError:
        print(text, "→ 숫자가 아니에요")
    except ZeroDivisionError:
        print("0으로는 나눌 수 없어요")` },
      { t: "p", s: "자주 보는 오류: `NameError`(없는 이름), `TypeError`(자료형이 안 맞음), `ValueError`(값이 이상함), `IndexError`(번호 초과), `KeyError`(없는 키)." },
    ],
    quiz: {
      q: "`int(\"3.5\")`를 실행하면?",
      options: ["3", "3.5", "4", "ValueError 발생"],
      answer: 3,
      explain: "`int()`는 정수 모양의 글자만 바꿀 수 있어요. 소수는 `float(\"3.5\")`를 써요.",
    },
    task: {
      prompt: "`data`에서 숫자로 바꿀 수 있는 것만 더한 합계를 출력하세요.",
      starter: "data = [\"5\", \"x\", \"12\", \"\", \"3\"]\n",
      expect: "20",
      need: ["try", "except"],
      hint: "`total = 0`, 반복 안에서 `try: total += int(d)` / `except ValueError: pass`",
      solution: `data = ["5", "x", "12", "", "3"]
total = 0
for d in data:
    try:
        total += int(d)
    except ValueError:
        pass
print(total)`,
    },
  },
  {
    day: 22, title: "모듈 가져오기", token: "import", minutes: 5,
    summary: "math, random 같은 도구 상자 쓰기",
    keys: [
      "`import 모듈`로 이미 만들어진 기능을 **빌려 써요**.",
      "`math`: `sqrt`, `ceil`, `floor`, `pi` / `random`: `randint`, `choice`",
      "`from math import sqrt`처럼 **필요한 것만** 가져올 수도 있어요.",
    ],
    body: [
      { t: "code", code: `import math
import random

print(math.sqrt(49), math.pi)
print(math.ceil(2.1), math.floor(2.9))

dice = random.randint(1, 6)
print("주사위:", dice)          # 실행할 때마다 달라요
print(random.choice(["가위", "바위", "보"]))` },
      { t: "p", s: "파이썬에는 날짜(`datetime`), 파일 경로(`pathlib`), 웹 요청 등 수많은 모듈이 있어요. 필요한 기능은 대부분 이미 누군가 만들어 두었어요." },
    ],
    quiz: {
      q: "`from math import sqrt` 다음에 올바른 사용법은?",
      options: ["math.sqrt(9)", "sqrt(9)", "import sqrt(9)", "math(sqrt(9))"],
      answer: 1,
      explain: "`from ... import`로 가져오면 모듈 이름 없이 바로 써요.",
    },
    task: {
      prompt: "반지름 `r = 3`인 원의 넓이(`math.pi * r ** 2`)를 소수 둘째 자리까지 f-string으로 출력하세요. 결과: `28.27`",
      starter: "r = 3\n",
      expect: "28.27",
      need: ["import"],
      hint: "맨 위에 `import math`, 출력은 `print(f\"{math.pi * r ** 2:.2f}\")`",
      solution: `import math
r = 3
print(f"{math.pi * r ** 2:.2f}")`,
    },
  },
  {
    day: 23, title: "유용한 내장 함수", token: "zip()", minutes: 6,
    summary: "sum, max, enumerate, zip",
    keys: [
      "`sum`, `max`, `min`, `len`, `sorted`는 import 없이 **바로** 써요.",
      "`enumerate()`는 **번호와 값**을 함께, `zip()`은 두 리스트를 **짝지어** 줘요.",
      "`sorted()`는 새 리스트를 돌려주고, `sort()`는 원본을 바꿔요.",
    ],
    body: [
      { t: "code", code: `scores = [88, 72, 95]
print(sum(scores), max(scores), min(scores))

for i, s in enumerate(scores, start=1):
    print(f"{i}번: {s}점")

names = ["민지", "지호", "서연"]
for name, s in zip(names, scores):
    print(name, s)` },
      { t: "p", s: "13일차에 직접 만든 합계·최댓값 반복문을 `sum()`, `max()` 한 줄로 대신할 수 있어요." },
    ],
    quiz: {
      q: "`list(zip([1, 2], [\"a\", \"b\"]))`의 결과는?",
      options: ["[1, 2, 'a', 'b']", "[(1, 'a'), (2, 'b')]", "[(1, 2), ('a', 'b')]", "{1: 'a', 2: 'b'}"],
      answer: 1,
      explain: "`zip`은 같은 위치끼리 짝을 지은 튜플을 만들어요.",
    },
    task: {
      prompt: "`items`에 `enumerate`로 1부터 번호를 붙여 `1. 연필` 형식으로 출력하세요.",
      starter: "items = [\"연필\", \"공책\", \"지우개\"]\n",
      expect: "1. 연필\n2. 공책\n3. 지우개",
      need: ["enumerate"],
      hint: "`for i, item in enumerate(items, start=1):` 안에서 `print(f\"{i}. {item}\")`",
      solution: `items = ["연필", "공책", "지우개"]
for i, item in enumerate(items, start=1):
    print(f"{i}. {item}")`,
    },
  },
  {
    day: 24, title: "기준을 정해 정렬하기", token: "key=", minutes: 6,
    summary: "sorted의 key와 lambda",
    keys: [
      "`sorted(리스트, key=함수)`는 함수가 돌려준 값을 **기준으로** 정렬해요.",
      "`lambda x: x[1]`은 이름 없는 **한 줄 함수**예요.",
      "`reverse=True`를 붙이면 큰 것부터예요.",
    ],
    body: [
      { t: "code", code: `words = ["banana", "kiwi", "apple"]
print(sorted(words))           # 가나다(abc) 순
print(sorted(words, key=len))  # 길이 순

students = [("민지", 85), ("지호", 92), ("서연", 78)]
ranked = sorted(students, key=lambda s: s[1], reverse=True)
for name, score in ranked:
    print(name, score)` },
      { t: "p", s: "`lambda s: s[1]`은 `def f(s): return s[1]`을 한 줄로 쓴 거예요. '각 학생에서 점수(1번)를 꺼내 그걸로 비교해'라는 뜻이에요." },
    ],
    quiz: {
      q: "`sorted([\"bb\", \"a\", \"ccc\"], key=len)`의 결과는?",
      options: ["['a', 'bb', 'ccc']", "['ccc', 'bb', 'a']", "[1, 2, 3]", "['bb', 'a', 'ccc']"],
      answer: 0,
      explain: "길이 1, 2, 3 순서로 정렬돼요.",
    },
    task: {
      prompt: "`people`을 나이가 어린 순으로 정렬해 이름만 한 줄씩 출력하세요.",
      starter: "people = [(\"철수\", 31), (\"영희\", 25), (\"민수\", 28)]\n",
      expect: "영희\n민수\n철수",
      need: ["key"],
      hint: "`sorted(people, key=lambda p: p[1])`로 정렬한 뒤 반복하며 `p[0]` 출력",
      solution: `people = [("철수", 31), ("영희", 25), ("민수", 28)]
for name, age in sorted(people, key=lambda p: p[1]):
    print(name)`,
    },
  },
  {
    day: 25, title: "클래스 기초", token: "class", minutes: 7,
    summary: "나만의 자료형 설계도 만들기",
    keys: [
      "클래스는 **설계도**, 객체는 그 설계도로 만든 **실물**이에요.",
      "`__init__`은 객체가 만들어질 때 실행되고 `self.속성`에 값을 저장해요.",
      "`self`는 **나 자신(이 객체)**을 가리켜요.",
    ],
    body: [
      { t: "code", code: `class Dog:
    def __init__(self, name, age):
        self.name = name
        self.age = age

a = Dog("초코", 3)
b = Dog("보리", 5)
print(a.name, a.age)
print(b.name, b.age)

b.age += 1
print(b.age)` },
      { t: "p", s: "같은 설계도(`Dog`)로 만들었지만 `a`와 `b`는 각자 자기 이름과 나이를 따로 가지고 있어요." },
    ],
    quiz: {
      q: "`__init__` 안의 `self`가 가리키는 것은?",
      options: ["클래스 이름", "지금 만들어지는 그 객체", "부모 클래스", "모든 객체 목록"],
      answer: 1,
      explain: "`Dog(\"초코\", 3)`을 만들 때 `self`는 바로 그 새 강아지 객체예요.",
    },
    task: {
      prompt: "`title`과 `pages`를 저장하는 `Book` 클래스를 완성하세요.",
      starter: `class Book:
    def __init__(self, title, pages):
        # 여기를 채우세요
        pass

b = Book("어린 왕자", 120)
print(b.title, b.pages)`,
      expect: "어린 왕자 120",
      need: ["self.title", "self.pages"],
      hint: "`self.title = title`, `self.pages = pages`",
      solution: `class Book:
    def __init__(self, title, pages):
        self.title = title
        self.pages = pages

b = Book("어린 왕자", 120)
print(b.title, b.pages)`,
    },
  },
  {
    day: 26, title: "메서드", token: "self.", minutes: 7,
    summary: "객체가 할 수 있는 행동 만들기",
    keys: [
      "클래스 안의 함수를 **메서드**라고 해요. 첫 매개변수는 항상 `self`",
      "메서드는 객체의 속성을 **읽고 바꿀** 수 있어요.",
      "`__str__`을 만들면 `print(객체)`가 **보기 좋게** 나와요.",
    ],
    body: [
      { t: "code", code: `class Account:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0

    def deposit(self, amount):
        self.balance += amount

    def __str__(self):
        return f"{self.owner}: {self.balance}원"

acc = Account("민지")
acc.deposit(5000)
acc.deposit(3000)
print(acc)` },
      { t: "p", s: "`acc.deposit(5000)`을 부르면 파이썬이 `acc`를 `self` 자리에 자동으로 넣어 줘요. 그래서 호출할 때는 `amount`만 넘겨요." },
    ],
    quiz: {
      q: "`print(객체)`의 출력 모양을 정하는 메서드는?",
      options: ["__init__", "__str__", "__print__", "show"],
      answer: 1,
      explain: "`__str__`이 돌려준 문자열이 출력돼요.",
    },
    task: {
      prompt: "`count`를 1 올리는 `up()` 메서드를 완성하세요. 세 번 부르면 3이 출력돼야 해요.",
      starter: `class Counter:
    def __init__(self):
        self.count = 0

    def up(self):
        # 여기를 채우세요
        pass

c = Counter()
c.up()
c.up()
c.up()
print(c.count)`,
      expect: "3",
      need: ["self.count"],
      hint: "`self.count += 1`",
      solution: `class Counter:
    def __init__(self):
        self.count = 0

    def up(self):
        self.count += 1

c = Counter()
c.up()
c.up()
c.up()
print(c.count)`,
    },
  },
  {
    day: 27, title: "상속", token: "(Parent)", minutes: 7,
    summary: "기존 클래스를 물려받아 확장하기",
    keys: [
      "`class 자식(부모):`로 부모 클래스의 기능을 **물려받아요**.",
      "자식에서 같은 이름의 메서드를 다시 만들면 **덮어써요**(오버라이딩).",
      "`super().__init__()`으로 부모의 초기화를 그대로 쓸 수 있어요.",
    ],
    body: [
      { t: "code", code: `class Animal:
    def __init__(self, name):
        self.name = name

    def speak(self):
        return "..."

class Cat(Animal):
    def speak(self):
        return "야옹"

class Duck(Animal):
    def speak(self):
        return "꽥꽥"

for a in [Cat("나비"), Duck("꽥이")]:
    print(a.name, a.speak())` },
      { t: "p", s: "`Cat`에는 `__init__`이 없지만 부모 `Animal`의 것을 물려받아 `name`을 저장해요. 공통 기능은 부모에, 다른 점만 자식에 쓰면 돼요." },
    ],
    quiz: {
      q: "`class Cat(Animal):`에서 `Animal`은?",
      options: ["자식 클래스", "부모 클래스", "객체", "메서드"],
      answer: 1,
      explain: "괄호 안이 물려주는 쪽, 부모 클래스예요.",
    },
    task: {
      prompt: "`Shape`를 상속한 `Square` 클래스를 만들어 `area()`가 한 변(`size`)의 제곱을 돌려주게 하세요.",
      starter: `class Shape:
    def __init__(self, size):
        self.size = size

    def area(self):
        return 0

# 여기에 Square 클래스를 만드세요

print(Square(4).area())`,
      expect: "16",
      need: ["class Square(Shape)"],
      hint: "`class Square(Shape):` 안에 `def area(self): return self.size ** 2`",
      solution: `class Shape:
    def __init__(self, size):
        self.size = size

    def area(self):
        return 0

class Square(Shape):
    def area(self):
        return self.size ** 2

print(Square(4).area())`,
    },
  },
  {
    day: 28, title: "중첩 자료구조", token: "[{…}]", minutes: 6,
    summary: "리스트 안의 딕셔너리로 표 다루기",
    keys: [
      "리스트 안에 딕셔너리를 넣으면 **표(테이블)** 같은 데이터를 다뤄요.",
      "한 단계씩 꺼내요: `members[0][\"name\"]`",
      "실제 서비스의 데이터(JSON)는 대부분 **이런 모양**이에요.",
    ],
    body: [
      { t: "code", code: `members = [
    {"name": "민지", "age": 24, "city": "서울"},
    {"name": "지호", "age": 31, "city": "부산"},
    {"name": "서연", "age": 27, "city": "서울"},
]
print(members[1]["name"])

seoul = [m["name"] for m in members if m["city"] == "서울"]
print(seoul)

avg = sum(m["age"] for m in members) / len(members)
print(f"평균 나이: {avg:.1f}")` },
      { t: "p", s: "한 줄씩 보면 지금까지 배운 것들이에요. 리스트 반복, 딕셔너리 꺼내기, 컴프리헨션, f-string." },
    ],
    quiz: {
      q: "출력 결과는?",
      code: `data = {"a": [1, 2, 3]}
print(data["a"][2])`,
      options: ["1", "2", "3", "오류"],
      answer: 2,
      explain: "`data[\"a\"]`는 `[1, 2, 3]`, 그 2번은 3이에요.",
    },
    task: {
      prompt: "`orders`의 총 매출(각 주문의 `price × qty`의 합)을 출력하세요.",
      starter: `orders = [
    {"item": "김밥", "price": 3000, "qty": 2},
    {"item": "라면", "price": 4000, "qty": 1},
    {"item": "떡볶이", "price": 5000, "qty": 3},
]
`,
      expect: "25000",
      hint: "`total = 0`, `for o in orders: total += o[\"price\"] * o[\"qty\"]`",
      solution: `orders = [
    {"item": "김밥", "price": 3000, "qty": 2},
    {"item": "라면", "price": 4000, "qty": 1},
    {"item": "떡볶이", "price": 5000, "qty": 3},
]
total = 0
for o in orders:
    total += o["price"] * o["qty"]
print(total)`,
    },
  },
  {
    day: 29, title: "미니 프로젝트: 단어 세기", token: "count", minutes: 8,
    summary: "배운 것을 모아 작은 분석기 만들기",
    keys: [
      "`split`, 딕셔너리, 반복, 정렬을 **한 번에** 써요.",
      "`d.get(k, 0) + 1`은 **없으면 0에서 시작해 1 더하기** 패턴이에요.",
      "큰 문제는 작게 쪼개요: 자르기 → 세기 → 정렬 → 출력",
    ],
    body: [
      { t: "code", code: `text = "the cat and the dog and the bird"

counts = {}
for word in text.split():
    counts[word] = counts.get(word, 0) + 1
print(counts)

top = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)
for word, n in top[:2]:
    print(word, n)` },
      { t: "p", s: "이 코드는 리뷰 분석, 로그 집계, 설문 통계처럼 실무에서 정말 자주 쓰는 모양이에요. `text`에 다른 문장을 넣어 실행해 보세요." },
    ],
    quiz: {
      q: "`counts.get(\"fox\", 0)`의 결과는? (`counts`에 `\"fox\"`가 없을 때)",
      options: ["None", "0", "KeyError", "\"fox\""],
      answer: 1,
      explain: "`get`은 키가 없으면 두 번째 값(기본값)을 돌려줘요.",
    },
    task: {
      prompt: "`text`에서 공백을 뺀 글자 중 가장 많이 나온 글자와 그 횟수를 출력하세요. 결과: `a 4`",
      starter: "text = \"banana bread\"\n",
      expect: "a 4",
      hint: "글자마다 `counts[ch] = counts.get(ch, 0) + 1`(공백은 건너뛰기). 가장 큰 것은 `max(counts, key=counts.get)`",
      solution: `text = "banana bread"
counts = {}
for ch in text:
    if ch == " ":
        continue
    counts[ch] = counts.get(ch, 0) + 1
best = max(counts, key=counts.get)
print(best, counts[best])`,
    },
  },
  {
    day: 30, title: "졸업 프로젝트: 성적표", token: "final", minutes: 8,
    summary: "클래스로 작은 프로그램 완성하기",
    keys: [
      "클래스 + 딕셔너리 + 함수로 **작은 프로그램**을 완성해요.",
      "기능별로 메서드를 나누면 **고치기 쉬워요**.",
      "다음 단계: 파일 읽기, 외부 라이브러리(pip), 자동화 스크립트!",
    ],
    body: [
      { t: "code", code: `class GradeBook:
    def __init__(self):
        self.scores = {}

    def add(self, name, score):
        self.scores[name] = score

    def average(self):
        return sum(self.scores.values()) / len(self.scores)

    def grade(self, score):
        if score >= 90:
            return "A"
        elif score >= 80:
            return "B"
        return "C"

    def report(self):
        for name, s in sorted(self.scores.items()):
            print(f"{name}: {s}점 ({self.grade(s)})")
        print(f"평균: {self.average():.1f}")

book = GradeBook()
book.add("지호", 92)
book.add("민지", 85)
book.add("서연", 74)
book.report()` },
      { t: "p", s: "30일 동안 배운 거의 모든 문법이 이 안에 있어요. 다음으로는 내 컴퓨터에 파이썬을 설치해 파일을 읽고 쓰거나, 반복되는 업무를 자동화하는 작은 스크립트를 만들어 보세요." },
    ],
    quiz: {
      q: "`book.report()`에서 이름이 출력되는 순서를 정하는 코드는?",
      options: ["self.scores = {}", "sorted(self.scores.items())", "self.grade(s)", "book.add(...)"],
      answer: 1,
      explain: "`sorted()`가 이름(키) 순으로 정렬해서 민지 → 서연 → 지호 순서가 돼요.",
    },
    task: {
      prompt: "1등의 이름을 돌려주는 `top()` 메서드를 완성하세요.",
      starter: `class GradeBook:
    def __init__(self):
        self.scores = {}

    def add(self, name, score):
        self.scores[name] = score

    def top(self):
        # 점수가 가장 높은 사람의 이름을 return 하세요
        pass

book = GradeBook()
book.add("지호", 92)
book.add("민지", 97)
book.add("서연", 74)
print(book.top())`,
      expect: "민지",
      need: ["return"],
      hint: "`return max(self.scores, key=self.scores.get)`",
      solution: `class GradeBook:
    def __init__(self):
        self.scores = {}

    def add(self, name, score):
        self.scores[name] = score

    def top(self):
        return max(self.scores, key=self.scores.get)

book = GradeBook()
book.add("지호", 92)
book.add("민지", 97)
book.add("서연", 74)
print(book.top())`,
    },
  },
];
