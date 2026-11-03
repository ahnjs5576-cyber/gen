/* 자료구조 한 입 — 커리큘럼 데이터
 * 하루에 한 레슨. 각 레슨은 핵심 한 줄 → 비유 → 핵심 포인트 → (데모) → 연산표 → 코드 → 퀴즈 순서로 진행된다.
 * ops.rows 안에서 "O(" 로 시작하는 칸은 복잡도 배지로 표시된다.
 */
window.LESSONS = [
  {
    id: "big-o",
    title: "빅오 표기법",
    en: "Big-O",
    tagline: "데이터가 늘어날 때 해야 할 일이 얼마나 늘어나는지 나타내는 말.",
    analogy: "책장에서 책 찾기. 제목 순으로 꽂혀 있으면 가운데를 펼쳐 보고 범위를 반씩 줄이면 되고(O(log n)), 뒤죽박죽이면 처음부터 하나씩 봐야 해요(O(n)).",
    points: [
      "정확한 시간 대신 '늘어나는 모양'만 봐요. 상수와 작은 항은 버립니다. 3n + 5 → O(n).",
      "빠른 순서: O(1) < O(log n) < O(n) < O(n log n) < O(n²).",
      "보통 최악의 경우를 기준으로 말해요.",
      "메모리 사용량(공간 복잡도)도 같은 방식으로 표현해요."
    ],
    demo: "growth",
    ops: {
      head: ["표기", "이름", "예시"],
      rows: [
        ["O(1)", "상수", "배열에서 인덱스로 읽기"],
        ["O(log n)", "로그", "정렬된 배열에서 이진 탐색"],
        ["O(n)", "선형", "리스트를 처음부터 끝까지 훑기"],
        ["O(n log n)", "선형로그", "병합 정렬 같은 좋은 정렬"],
        ["O(n²)", "제곱", "이중 for문으로 모든 쌍 비교"]
      ]
    },
    code: `def find(items, target):      # O(n): 하나씩 확인
    for x in items:
        if x == target:
            return True
    return False

def has_pair_sum(items, k):   # O(n²): 모든 쌍 확인
    for i in range(len(items)):
        for j in range(i + 1, len(items)):
            if items[i] + items[j] == k:
                return True
    return False`,
    pitfall: "O(1)이 항상 빠르다는 뜻은 아니에요. '데이터가 늘어도 시간이 그대로'라는 뜻이에요.",
    quiz: [
      { q: "5n² + 3n + 100 의 빅오는?", options: ["O(n)", "O(n²)", "O(5n²)", "O(100)"], answer: 1,
        why: "가장 빨리 커지는 항(n²)만 남기고 계수 5는 버려요." },
      { q: "n = 1,000,000일 때 가장 적게 일하는 것은?", options: ["O(n)", "O(log n)", "O(n log n)", "O(√n)"], answer: 1,
        why: "log₂(1,000,000)은 약 20이에요. √n은 1,000이고요." },
      { q: "n번 도는 for문 안에 또 n번 도는 for문이 있다면?", options: ["O(n)", "O(2n)", "O(n²)", "O(log n)"], answer: 2,
        why: "n × n = n²번 실행돼요." }
    ]
  },
  {
    id: "array",
    title: "배열",
    en: "Array",
    tagline: "같은 크기의 칸이 메모리에 빈틈없이 줄지어 있는 구조.",
    analogy: "아파트 호수. 101호 위치만 알면 105호는 '네 칸 옆'이라고 계산해서 바로 찾아가요.",
    points: [
      "i번째 칸 주소 = 시작 주소 + i × 칸 크기. 계산 한 번이면 되니 인덱스 접근은 O(1).",
      "중간에 넣거나 빼면 뒤쪽 원소를 전부 한 칸씩 밀거나 당겨야 해서 O(n).",
      "칸이 붙어 있어 CPU 캐시에 잘 맞아요. 같은 O(n)이어도 실제로 빠른 편이에요.",
      "정렬되어 있다면 이진 탐색으로 O(log n)에 찾을 수 있어요."
    ],
    demo: "array",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["인덱스로 읽기/쓰기", "O(1)", "주소 계산 한 번"],
        ["값 검색 (정렬 안 됨)", "O(n)", "하나씩 비교"],
        ["값 검색 (정렬됨)", "O(log n)", "이진 탐색"],
        ["맨 끝에 추가", "O(1)", "빈 칸이 있을 때"],
        ["중간 삽입/삭제", "O(n)", "뒤 원소를 밀고 당김"]
      ]
    },
    code: `scores = [90, 72, 85, 64, 98]
print(scores[2])        # 85, O(1)

scores.insert(1, 77)    # 뒤 원소 4개가 한 칸씩 밀림, O(n)
print(scores)           # [90, 77, 72, 85, 64, 98]`,
    pitfall: "Python 리스트의 `x in lst` 검사는 O(n)이에요. 자주 찾는다면 set을 쓰세요.",
    quiz: [
      { q: "배열에서 인덱스로 원소를 읽는 시간은?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0,
        why: "시작 주소 + i × 칸 크기를 계산하면 바로 그 칸이에요." },
      { q: "크기 n인 배열의 맨 앞에 원소를 넣으면?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2,
        why: "기존 원소 n개를 모두 한 칸씩 뒤로 밀어야 해요." },
      { q: "시작 주소 1000, 칸 크기 4바이트. arr[5]의 주소는?", options: ["1005", "1020", "1024", "1004"], answer: 1,
        why: "1000 + 5 × 4 = 1020. 인덱스는 0부터 세요." }
    ]
  },
  {
    id: "dynamic-array",
    title: "동적 배열",
    en: "Dynamic Array",
    tagline: "꽉 차면 두 배 큰 배열로 이사 가는 배열.",
    analogy: "이사. 방이 꽉 차면 두 배 넓은 집으로 짐을 한 번에 옮겨요. 이사는 힘들지만 자주 하지 않죠.",
    points: [
      "Python list, Java ArrayList, C++ vector가 모두 동적 배열이에요.",
      "용량(capacity)과 크기(size)는 달라요. 빈 칸을 미리 넉넉히 잡아 둡니다.",
      "꽉 차면 더 큰 배열을 새로 만들고 전부 복사해요. 그 순간만은 O(n).",
      "평균을 내면 append는 O(1). 이것을 분할 상환(amortized) O(1)이라고 해요."
    ],
    demo: "dynarray",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["끝에 추가 (append)", "O(1)", "분할 상환 기준"],
        ["용량 확장", "O(n)", "가끔 한 번, 전체 복사"],
        ["인덱스 접근", "O(1)", "배열과 같음"],
        ["끝에서 삭제 (pop)", "O(1)", ""],
        ["맨 앞 삽입 insert(0, x)", "O(n)", "전부 밀기"]
      ]
    },
    code: `class DynArray:
    def __init__(self):
        self.cap, self.size = 1, 0
        self.data = [None] * self.cap

    def append(self, x):
        if self.size == self.cap:          # 꽉 참 → 두 배로 이사
            self.cap *= 2
            new = [None] * self.cap
            for i in range(self.size):     # O(n) 복사
                new[i] = self.data[i]
            self.data = new
        self.data[self.size] = x
        self.size += 1`,
    pitfall: "크기를 미리 안다면 `[0] * n`처럼 한 번에 만들어 두면 이사 비용이 아예 없어요.",
    quiz: [
      { q: "용량 4, 크기 4인 동적 배열에 append하면?", options: ["그냥 끝에 추가된다", "더 큰 배열로 복사한 뒤 추가된다", "에러가 난다", "맨 앞 원소가 지워진다"], answer: 1,
        why: "빈 칸이 없으니 용량을 늘린 새 배열로 이사한 다음 넣어요." },
      { q: "빈 동적 배열에 append를 n번 하면 전체 비용은?", options: ["O(n)", "O(n²)", "O(n log n)", "O(1)"], answer: 0,
        why: "복사량은 1 + 2 + 4 + … + n < 2n. 다 합쳐도 O(n)이라 한 번당 평균 O(1)이에요." },
      { q: "용량을 한 칸씩이 아니라 두 배씩 늘리는 이유는?", options: ["메모리를 아끼려고", "복사 횟수를 줄여 평균 O(1)을 만들려고", "정렬 상태를 유지하려고", "인덱스 계산을 쉽게 하려고"], answer: 1,
        why: "한 칸씩 늘리면 매번 복사해서 O(n²)이 돼요. 두 배씩 늘리면 이사가 드물어요." }
    ]
  },
  {
    id: "linked-list",
    title: "연결 리스트",
    en: "Linked List",
    tagline: "노드마다 값과 '다음 노드의 위치'를 들고 줄줄이 이어진 구조.",
    analogy: "보물찾기 쪽지. 쪽지마다 다음 쪽지가 숨겨진 곳이 적혀 있어요. 세 번째 쪽지를 보려면 첫 쪽지부터 따라가야 해요.",
    points: [
      "메모리 여기저기 흩어져 있어도 포인터(next)로 이어져 있어요.",
      "위치를 이미 알고 있다면 삽입·삭제는 포인터만 바꾸면 끝, O(1).",
      "대신 i번째 원소를 보려면 처음부터 따라가야 해서 O(n).",
      "이중 연결 리스트는 prev 포인터도 있어서 뒤로도 갈 수 있어요."
    ],
    demo: "linked",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["맨 앞 삽입/삭제", "O(1)", "head만 바꾸기"],
        ["알고 있는 노드 뒤에 삽입", "O(1)", "포인터 두 개 수정"],
        ["i번째 접근", "O(n)", "처음부터 따라가기"],
        ["값 검색", "O(n)", ""],
        ["맨 끝 삽입 (tail 없음)", "O(n)", "tail 포인터를 두면 O(1)"]
      ]
    },
    code: `class Node:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

head = Node(1, Node(2, Node(3)))   # 1 → 2 → 3

head = Node(0, head)               # 맨 앞 삽입 O(1): 0 → 1 → 2 → 3

cur = head                         # 순회 O(n)
while cur:
    print(cur.val)
    cur = cur.next`,
    pitfall: "노드를 끼워 넣을 때는 새 노드의 next부터 연결하세요. 순서가 바뀌면 뒤쪽 전체를 잃어버려요.",
    quiz: [
      { q: "연결 리스트에서 k번째 원소에 접근하는 시간은?", options: ["O(1)", "O(n)", "O(log n)", "O(n²)"], answer: 1,
        why: "head부터 next를 k번 따라가야 해요. 최악은 O(n)." },
      { q: "배열보다 연결 리스트가 유리한 상황은?", options: ["인덱스 접근이 잦을 때", "맨 앞 삽입·삭제가 잦을 때", "이진 탐색을 할 때", "메모리를 최대한 아낄 때"], answer: 1,
        why: "배열은 맨 앞 삽입에 O(n)이지만 연결 리스트는 head만 바꾸면 돼요." },
      { q: "A → B → C 에서 B를 지우려면?", options: ["A.next = C", "B.next = A", "C.next = A", "A.next = None"], answer: 0,
        why: "A가 B를 건너뛰고 C를 가리키면 B는 리스트에서 빠져요." }
    ]
  },
  {
    id: "stack",
    title: "스택",
    en: "Stack",
    tagline: "마지막에 넣은 것을 가장 먼저 꺼내는 구조. LIFO(Last In, First Out).",
    analogy: "쌓아 둔 접시. 맨 위에만 올리고, 맨 위에서만 내려요.",
    points: [
      "push(넣기), pop(꺼내기), peek(맨 위 보기) 모두 O(1).",
      "함수 호출, 실행 취소(Ctrl+Z), 브라우저 뒤로 가기가 모두 스택이에요.",
      "괄호 짝 맞추기, DFS 같은 문제의 단골 도구예요.",
      "Python에서는 list의 append와 pop을 그대로 쓰면 돼요."
    ],
    demo: "stack",
    ops: {
      head: ["연산", "시간", "Python"],
      rows: [
        ["push", "O(1)", "lst.append(x)"],
        ["pop", "O(1)", "lst.pop()"],
        ["peek", "O(1)", "lst[-1]"],
        ["값 검색", "O(n)", "스택의 용도가 아님"]
      ]
    },
    code: `def is_valid(s):                  # 괄호 짝 검사
    pair = {')': '(', ']': '[', '}': '{'}
    stack = []
    for ch in s:
        if ch in '([{':
            stack.append(ch)      # push
        elif not stack or stack.pop() != pair[ch]:
            return False          # 짝이 안 맞음
    return not stack

is_valid("([]{})")   # True
is_valid("(]")       # False`,
    pitfall: "빈 스택에서 pop하면 오류가 나요. 꺼내기 전에 `if stack:`으로 확인하세요.",
    quiz: [
      { q: "1, 2, 3을 차례로 push하고 pop을 한 번 하면 나오는 값은?", options: ["1", "2", "3", "아무것도 안 나온다"], answer: 2,
        why: "마지막에 넣은 3이 맨 위에 있어요." },
      { q: "스택으로 처리하기 어색한 것은?", options: ["함수 호출 관리", "실행 취소(Ctrl+Z)", "프린터 인쇄 대기열", "괄호 짝 검사"], answer: 2,
        why: "인쇄 대기열은 먼저 온 문서부터 처리하는 큐가 맞아요." },
      { q: "빈 스택에서 pop을 하면?", options: ["0이 나온다", "오류(스택 언더플로)", "맨 아래 값이 나온다", "무한 루프에 빠진다"], answer: 1,
        why: "꺼낼 것이 없으니 오류예요. Python list라면 IndexError가 나요." }
    ]
  },
  {
    id: "queue",
    title: "큐",
    en: "Queue",
    tagline: "먼저 들어온 것이 먼저 나가는 구조. FIFO(First In, First Out).",
    analogy: "맛집 대기줄. 먼저 줄 선 사람이 먼저 들어가요.",
    points: [
      "enqueue(뒤에 넣기)와 dequeue(앞에서 빼기)가 모두 O(1)이어야 제대로 된 큐예요.",
      "Python의 list.pop(0)은 전체를 당겨야 해서 O(n). collections.deque를 쓰세요.",
      "작업 대기열, 메시지 큐, BFS(너비 우선 탐색)에 쓰여요.",
      "배열로 만들 때는 끝과 처음을 이어 붙인 원형 큐로 빈 공간을 재활용해요."
    ],
    demo: "queue",
    ops: {
      head: ["연산", "시간", "Python (deque)"],
      rows: [
        ["enqueue", "O(1)", "q.append(x)"],
        ["dequeue", "O(1)", "q.popleft()"],
        ["맨 앞 보기", "O(1)", "q[0]"],
        ["list.pop(0) 으로 dequeue", "O(n)", "쓰지 마세요"]
      ]
    },
    code: `from collections import deque

q = deque()
q.append("A")       # enqueue
q.append("B")
q.append("C")
print(q.popleft())  # "A"  먼저 온 쪽이 먼저, O(1)
print(q)            # deque(['B', 'C'])`,
    pitfall: "`queue.Queue`는 스레드 간 통신용이라 느려요. 알고리즘 문제에는 `deque`가 정답이에요.",
    quiz: [
      { q: "A, B, C 순서로 enqueue한 뒤 dequeue를 두 번 하면 남는 것은?", options: ["A", "B", "C", "없음"], answer: 2,
        why: "A, B가 차례로 나가고 C만 남아요." },
      { q: "Python에서 list.pop(0)으로 dequeue를 하면 시간은?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 2,
        why: "맨 앞을 빼면 나머지를 전부 한 칸씩 당겨야 해요." },
      { q: "큐를 핵심으로 쓰는 알고리즘은?", options: ["DFS", "BFS", "이진 탐색", "퀵 정렬"], answer: 1,
        why: "BFS는 가까운 정점부터 큐에 넣고 순서대로 꺼내요." }
    ]
  },
  {
    id: "deque",
    title: "덱",
    en: "Deque",
    tagline: "앞과 뒤 양쪽에서 넣고 뺄 수 있는 큐. Double-Ended Queue.",
    analogy: "양쪽 문이 모두 열리는 지하철 칸. 어느 쪽으로든 타고 내릴 수 있어요.",
    points: [
      "appendleft, append, popleft, pop 모두 O(1).",
      "한쪽만 쓰면 스택, 넣는 쪽과 빼는 쪽을 다르게 쓰면 큐가 돼요.",
      "최근 N개 기록(maxlen), 슬라이딩 윈도우 문제에 유용해요.",
      "가운데 원소 접근은 O(n)이에요."
    ],
    demo: "deque",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["앞에 넣기 appendleft", "O(1)", ""],
        ["뒤에 넣기 append", "O(1)", ""],
        ["앞에서 빼기 popleft", "O(1)", ""],
        ["뒤에서 빼기 pop", "O(1)", ""],
        ["가운데 인덱스 접근", "O(n)", "배열이 아님"]
      ]
    },
    code: `from collections import deque

recent = deque(maxlen=3)        # 최근 3개만 기억
for page in ["홈", "검색", "상품", "장바구니"]:
    recent.append(page)
print(recent)   # deque(['검색', '상품', '장바구니'])

d = deque([2, 3])
d.appendleft(1)                 # 앞에 넣기
d.append(4)                     # 뒤에 넣기
print(d)        # deque([1, 2, 3, 4])`,
    pitfall: "maxlen이 찬 상태에서 append하면 반대쪽 원소가 조용히 사라져요. 의도한 동작인지 확인하세요.",
    quiz: [
      { q: "덱으로 스택을 흉내 내려면?", options: ["append + pop", "append + popleft", "appendleft + pop", "불가능하다"], answer: 0,
        why: "같은 쪽(뒤)으로 넣고 같은 쪽에서 빼면 LIFO예요." },
      { q: "deque(maxlen=3)에 1, 2, 3, 4를 차례로 append하면?", options: ["[1, 2, 3]", "[2, 3, 4]", "[1, 2, 3, 4]", "오류"], answer: 1,
        why: "4가 들어오면서 가장 오래된 1이 밀려나요." },
      { q: "덱에서 느린 연산은?", options: ["양 끝에 넣기", "양 끝에서 빼기", "가운데 원소 인덱스 접근", "길이 확인"], answer: 2,
        why: "덱은 양 끝에 최적화되어 있어서 가운데 접근은 O(n)이에요." }
    ]
  },
  {
    id: "hash-table",
    title: "해시 테이블",
    en: "Hash Table",
    tagline: "키를 해시 함수로 번호로 바꿔, 그 번호의 칸에 바로 저장하는 구조.",
    analogy: "사물함. 이름을 정해진 규칙으로 번호로 바꿔 넣어 두면, 찾을 때도 같은 규칙으로 그 사물함을 바로 열어요.",
    points: [
      "삽입·검색·삭제가 평균 O(1).",
      "다른 키가 같은 칸에 걸리는 것을 충돌이라고 해요. 같은 칸에 줄줄이 달거나(체이닝) 다른 빈칸을 찾아요(개방 주소법).",
      "충돌이 몰리면 최악 O(n). 칸이 차기 전에 크기를 늘려(리해싱) 막아요.",
      "Python의 dict와 set이 해시 테이블이에요. 크기 순서나 범위 검색에는 약해요."
    ],
    demo: "hash",
    ops: {
      head: ["연산", "평균", "최악"],
      rows: [
        ["삽입", "O(1)", "O(n)"],
        ["검색 (키로)", "O(1)", "O(n)"],
        ["삭제", "O(1)", "O(n)"],
        ["크기 순서로 꺼내기", "O(n log n)", "정렬이 필요"]
      ]
    },
    code: `count = {}
for word in "사과 바나나 사과 포도 사과".split():
    count[word] = count.get(word, 0) + 1    # O(1)
print(count)   # {'사과': 3, '바나나': 1, '포도': 1}

seen = {3, 8, 1}
print(8 in seen)   # True, O(1). list였다면 O(n)`,
    pitfall: "list처럼 바뀌는 값은 dict의 키가 될 수 없어요. 해시값이 달라지면 사물함을 못 찾거든요. 튜플을 쓰세요.",
    quiz: [
      { q: "해시 테이블에서 키로 값을 찾는 평균 시간은?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0,
        why: "해시 함수로 칸 번호를 계산해 바로 가요." },
      { q: "서로 다른 키가 같은 칸으로 가는 현상은?", options: ["오버플로", "충돌", "재귀", "순회"], answer: 1,
        why: "충돌(collision)이에요. 체이닝이나 개방 주소법으로 처리해요." },
      { q: "해시 테이블이 약한 작업은?", options: ["키로 값 찾기", "중복 확인", "50~100 사이 키 모두 찾기", "단어 개수 세기"], answer: 2,
        why: "해시는 순서를 섞어 버려서 범위 검색엔 균형 트리가 맞아요." }
    ]
  },
  {
    id: "tree",
    title: "트리",
    en: "Tree",
    tagline: "하나의 뿌리(root)에서 가지처럼 뻗어 내려가는 계층 구조.",
    analogy: "폴더 구조나 회사 조직도. 맨 위에 하나가 있고 아래로 여러 갈래가 나뉘어요.",
    points: [
      "용어: 루트(맨 위), 부모·자식, 리프(자식이 없는 노드), 깊이(루트에서 거리), 높이(가장 깊은 리프까지).",
      "노드가 n개인 트리의 간선은 항상 n − 1개이고 사이클이 없어요.",
      "이진 트리는 자식이 최대 둘(left, right)이에요.",
      "순회: 전위(나→왼→오), 중위(왼→나→오), 후위(왼→오→나), 레벨 순서(위층부터)."
    ],
    demo: "traverse",
    ops: {
      head: ["작업", "시간", "메모"],
      rows: [
        ["모든 노드 순회", "O(n)", "전위·중위·후위·레벨"],
        ["높이 계산", "O(n)", "재귀로 양쪽 중 큰 값 + 1"],
        ["부모를 알 때 자식 추가", "O(1)", ""]
      ]
    },
    code: `class Node:
    def __init__(self, val, left=None, right=None):
        self.val, self.left, self.right = val, left, right

def inorder(node):            # 왼쪽 → 나 → 오른쪽
    if node is None:
        return
    inorder(node.left)
    print(node.val)
    inorder(node.right)

def height(node):
    if node is None:
        return 0
    return 1 + max(height(node.left), height(node.right))`,
    pitfall: "재귀 함수는 `node is None`인 경우를 가장 먼저 처리하세요. 빠뜨리면 리프에서 오류가 나요.",
    quiz: [
      { q: "자식이 없는 노드를 부르는 말은?", options: ["루트", "리프", "간선", "부모"], answer: 1,
        why: "나뭇잎(leaf)처럼 끝에 매달린 노드예요." },
      { q: "노드가 10개인 트리의 간선 수는?", options: ["9", "10", "11", "20"], answer: 0,
        why: "루트를 뺀 모든 노드는 부모로 가는 간선이 딱 하나씩 있어요. 10 − 1 = 9." },
      { q: "중위 순회의 방문 순서는?", options: ["나 → 왼쪽 → 오른쪽", "왼쪽 → 나 → 오른쪽", "왼쪽 → 오른쪽 → 나", "위층부터 아래층으로"], answer: 1,
        why: "'중위'는 내가 가운데(in-order)에 온다는 뜻이에요." }
    ]
  },
  {
    id: "bst",
    title: "이진 탐색 트리",
    en: "Binary Search Tree",
    tagline: "왼쪽엔 작은 값, 오른쪽엔 큰 값. 이 규칙 하나로 빠르게 찾는 트리.",
    analogy: "업다운 숫자 맞히기. '다운' 하면 왼쪽, '업' 하면 오른쪽으로 가면서 후보가 절반씩 줄어요.",
    points: [
      "모든 노드에서 왼쪽 서브트리 < 노드 < 오른쪽 서브트리.",
      "검색·삽입·삭제 시간은 트리 높이 h에 비례해요. O(h).",
      "균형이 잡혀 있으면 h ≈ log n이지만, 한쪽으로 쏠리면 h = n이 돼요.",
      "중위 순회하면 값이 정렬된 순서로 나와요."
    ],
    demo: "bst",
    ops: {
      head: ["연산", "균형일 때", "쏠렸을 때"],
      rows: [
        ["검색", "O(log n)", "O(n)"],
        ["삽입", "O(log n)", "O(n)"],
        ["삭제", "O(log n)", "O(n)"],
        ["정렬 순서로 출력", "O(n)", "O(n)"]
      ]
    },
    code: `def insert(node, val):
    if node is None:
        return Node(val)
    if val < node.val:
        node.left = insert(node.left, val)
    else:
        node.right = insert(node.right, val)
    return node

def search(node, val):
    while node and node.val != val:
        node = node.left if val < node.val else node.right
    return node        # 없으면 None`,
    pitfall: "이미 정렬된 데이터를 그대로 넣으면 한쪽으로 쏠린 일자 트리가 돼요. 데모에서 직접 확인해 보세요.",
    quiz: [
      { q: "빈 BST에 1, 2, 3, 4, 5를 순서대로 넣으면?", options: ["완벽하게 균형 잡힌다", "오른쪽으로 일자가 된다", "왼쪽으로 일자가 된다", "오류가 난다"], answer: 1,
        why: "매번 더 큰 값이 들어오니 계속 오른쪽 자식으로만 붙어요." },
      { q: "BST의 값을 정렬된 순서로 꺼내는 순회는?", options: ["전위 순회", "중위 순회", "후위 순회", "레벨 순회"], answer: 1,
        why: "왼쪽(작은 값) → 나 → 오른쪽(큰 값) 순서라 정렬돼요." },
      { q: "루트가 50인 BST에서 42를 찾을 때 첫 이동은?", options: ["왼쪽 자식으로", "오른쪽 자식으로", "그 자리에서 멈춤", "가장 깊은 노드로"], answer: 0,
        why: "42 < 50 이므로 작은 값이 있는 왼쪽으로 가요." }
    ]
  },
  {
    id: "balanced-tree",
    title: "균형 트리",
    en: "Balanced Tree",
    tagline: "넣고 뺄 때마다 스스로 높이를 맞춰서 언제나 O(log n)을 지키는 트리.",
    analogy: "시소. 한쪽이 무거워지면 앉는 자리를 바꿔 수평을 맞춰요.",
    points: [
      "BST의 약점인 한쪽 쏠림을 회전(rotation)으로 해결해요. 회전 한 번은 O(1).",
      "AVL 트리: 모든 노드에서 왼쪽·오른쪽 높이 차가 1 이하가 되도록 엄격하게 유지해요.",
      "레드-블랙 트리: 규칙이 조금 느슨해서 삽입·삭제가 가벼워요. Java TreeMap, C++ map이 이걸 써요.",
      "B-트리: 노드 하나에 키를 여러 개 담아요. 디스크 읽기를 줄여서 데이터베이스 인덱스에 쓰여요."
    ],
    demo: "rotate",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["검색", "O(log n)", "최악에도 보장"],
        ["삽입", "O(log n)", "필요하면 회전"],
        ["삭제", "O(log n)", "필요하면 회전"],
        ["회전 한 번", "O(1)", "포인터 몇 개만 바꿈"]
      ]
    },
    code: `def rotate_left(x):
    #   x                y
    #    \\              / \\
    #     y     →      x   z
    #      \\
    #       z
    y = x.right
    x.right = y.left
    y.left = x
    return y          # y가 새 루트`,
    pitfall: "균형 트리를 직접 구현할 일은 드물어요. 원리를 이해하고, 실무에선 언어가 주는 TreeMap·SortedList를 쓰세요.",
    quiz: [
      { q: "균형 트리를 쓰는 가장 큰 이유는?", options: ["메모리를 아끼려고", "최악의 경우에도 O(log n)을 보장하려고", "정렬이 필요 없어서", "구현이 쉬워서"], answer: 1,
        why: "일반 BST는 쏠리면 O(n)이 되지만 균형 트리는 높이를 log n으로 유지해요." },
      { q: "균형을 맞추기 위한 기본 동작은?", options: ["회전", "해싱", "전체 복사", "정렬"], answer: 0,
        why: "부모와 자식의 위치를 바꾸는 회전으로 높이를 줄여요." },
      { q: "데이터베이스 인덱스에 주로 쓰이는 구조는?", options: ["스택", "B-트리", "덱", "트라이"], answer: 1,
        why: "B-트리(B+트리)는 노드가 넓고 낮아서 디스크 접근 횟수가 적어요." }
    ]
  },
  {
    id: "heap",
    title: "힙과 우선순위 큐",
    en: "Heap",
    tagline: "가장 작은(또는 큰) 값이 언제나 맨 위에 있는 완전 이진 트리.",
    analogy: "응급실. 온 순서가 아니라 가장 위급한 환자부터 진료해요.",
    points: [
      "최소 힙: 부모 ≤ 자식. 전체가 정렬된 건 아니고 '맨 위가 최소'만 보장해요.",
      "배열 하나로 표현해요. i번의 자식은 2i+1, 2i+2, 부모는 (i−1)//2.",
      "삽입: 맨 끝에 넣고 부모보다 작으면 위로 올려요. 꺼내기: 맨 끝 값을 루트로 옮기고 아래로 내려요. 둘 다 O(log n).",
      "우선순위 큐, 다익스트라 최단 경로, 상위 K개 구하기에 쓰여요."
    ],
    demo: "heap",
    ops: {
      head: ["연산", "시간", "Python (heapq)"],
      rows: [
        ["최솟값 보기", "O(1)", "h[0]"],
        ["삽입", "O(log n)", "heappush(h, x)"],
        ["최솟값 꺼내기", "O(log n)", "heappop(h)"],
        ["리스트를 힙으로", "O(n)", "heapify(lst)"],
        ["임의 값 검색", "O(n)", "힙의 용도가 아님"]
      ]
    },
    code: `import heapq

tasks = []
heapq.heappush(tasks, (2, "메일 답장"))
heapq.heappush(tasks, (1, "서버 장애 대응"))
heapq.heappush(tasks, (3, "회의록 정리"))

print(heapq.heappop(tasks))   # (1, '서버 장애 대응')  가장 급한 것부터`,
    pitfall: "Python heapq는 최소 힙만 있어요. 최대 힙이 필요하면 값에 −1을 곱해서 넣고, 꺼낼 때 다시 곱하세요.",
    quiz: [
      { q: "최소 힙에서 O(1)에 할 수 있는 것은?", options: ["최솟값 확인", "최댓값 확인", "임의 값 검색", "정렬된 순서로 출력"], answer: 0,
        why: "최솟값은 항상 루트(배열 0번)에 있어요." },
      { q: "배열로 만든 힙에서 인덱스 3의 왼쪽 자식은?", options: ["6", "7", "8", "4"], answer: 1,
        why: "왼쪽 자식 = 2 × 3 + 1 = 7." },
      { q: "힙에 값 하나를 넣는 시간은?", options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"], answer: 1,
        why: "완전 이진 트리의 높이(log n)만큼만 위로 올라가요." }
    ]
  },
  {
    id: "trie",
    title: "트라이",
    en: "Trie",
    tagline: "문자열을 한 글자씩 나눠 가지로 저장하는 트리. 접두사 검색에 강해요.",
    analogy: "국어사전 색인. '가' → '가방'처럼 한 글자씩 따라 내려가면 그 글자로 시작하는 단어가 다 모여 있어요.",
    points: [
      "노드마다 '다음 글자 → 자식 노드' 목록과 '여기서 단어가 끝남' 표시가 있어요.",
      "길이 L인 단어의 삽입·검색은 O(L). 저장된 단어가 몇 개든 상관없어요.",
      "검색어 자동 완성, 추천 검색어, 맞춤법 검사에 쓰여요.",
      "글자마다 노드가 생겨서 메모리를 많이 써요."
    ],
    demo: "trie",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["단어 삽입", "O(L)", "L = 단어 길이"],
        ["단어 검색", "O(L)", "끝 표시까지 확인"],
        ["접두사 존재 확인", "O(L)", ""],
        ["접두사로 단어 모으기", "O(L + k)", "k = 결과 글자 수"]
      ]
    },
    code: `class Trie:
    def __init__(self):
        self.root = {}

    def insert(self, word):
        node = self.root
        for ch in word:
            node = node.setdefault(ch, {})
        node["$"] = True             # 단어 끝 표시

    def starts_with(self, prefix):
        node = self.root
        for ch in prefix:
            if ch not in node:
                return False
            node = node[ch]
        return True`,
    pitfall: "'가방'을 넣었다고 '가'가 단어인 건 아니에요. 단어 끝 표시($)가 있어야 단어예요.",
    quiz: [
      { q: "트라이가 특히 잘하는 일은?", options: ["숫자 정렬", "접두사로 단어 찾기", "최솟값 꺼내기", "최단 경로 찾기"], answer: 1,
        why: "접두사를 따라 내려가면 그 아래가 전부 후보 단어예요." },
      { q: "단어 100만 개가 든 트라이에서 길이 5인 단어를 찾는 시간은?", options: ["O(1)", "O(L), 즉 5단계", "O(100만)", "O(log 100만)"], answer: 1,
        why: "글자 수만큼만 내려가요. 저장된 단어 수와는 무관해요." },
      { q: "트라이의 단점은?", options: ["검색이 느리다", "메모리를 많이 쓴다", "접두사 검색을 못 한다", "단어를 저장할 수 없다"], answer: 1,
        why: "글자 하나마다 노드와 자식 목록이 생겨서 공간을 많이 차지해요." }
    ]
  },
  {
    id: "graph",
    title: "그래프",
    en: "Graph",
    tagline: "점(정점)과 선(간선)으로 '무엇이 무엇과 연결되어 있나'를 표현하는 구조.",
    analogy: "지하철 노선도. 역이 정점이고, 역과 역 사이 구간이 간선이에요.",
    points: [
      "방향이 있는지(일방통행), 가중치(거리·비용)가 있는지로 종류가 나뉘어요.",
      "인접 행렬: V×V 표. 연결 확인은 O(1)이지만 메모리가 O(V²).",
      "인접 리스트: 정점마다 이웃 목록. 메모리 O(V + E). 대부분 이걸 써요.",
      "트리는 사이클이 없는 연결 그래프의 특별한 경우예요."
    ],
    demo: "graph",
    ops: {
      head: ["작업", "인접 행렬", "인접 리스트"],
      rows: [
        ["메모리", "O(V²)", "O(V + E)"],
        ["u–v 연결 확인", "O(1)", "O(deg u)"],
        ["u의 이웃 모두 보기", "O(V)", "O(deg u)"],
        ["간선 추가", "O(1)", "O(1)"]
      ]
    },
    code: `edges = [("A", "B"), ("A", "C"), ("B", "D"),
         ("C", "E"), ("D", "F"), ("E", "F")]

graph = {}                              # 인접 리스트
for u, v in edges:
    graph.setdefault(u, []).append(v)
    graph.setdefault(v, []).append(u)   # 무방향이면 양쪽에

print(graph["D"])   # ['B', 'F']`,
    pitfall: "무방향 그래프는 간선을 양쪽 목록에 모두 넣어야 해요. 한쪽만 넣으면 반대 방향으로 못 가요.",
    quiz: [
      { q: "정점 1만 개, 간선 2만 개인 그래프에 알맞은 표현은?", options: ["인접 행렬", "인접 리스트", "둘 다 같다", "배열 하나"], answer: 1,
        why: "행렬은 1억 칸이 필요하지만 리스트는 약 5만 칸이면 돼요." },
      { q: "인접 행렬이 쓰는 메모리는?", options: ["O(V)", "O(E)", "O(V²)", "O(V + E)"], answer: 2,
        why: "모든 정점 쌍마다 칸이 하나씩 있어요." },
      { q: "지도 앱에서 도로 길이까지 저장하려면?", options: ["가중치 그래프", "트라이", "스택", "가중치 없는 그래프"], answer: 0,
        why: "간선마다 거리(가중치)를 함께 저장해요." }
    ]
  },
  {
    id: "bfs-dfs",
    title: "BFS와 DFS",
    en: "Graph Search",
    tagline: "그래프를 빠짐없이 도는 두 방법. 넓게 퍼지는 BFS, 깊게 파고드는 DFS.",
    analogy: "BFS는 호수에 던진 돌의 물결처럼 가까운 곳부터. DFS는 미로에서 한 길을 끝까지 가 보고 막히면 돌아오는 방식이에요.",
    points: [
      "BFS는 큐, DFS는 스택(또는 재귀)을 써요.",
      "간선 비용이 모두 같다면 최단 거리는 BFS로 구해요.",
      "둘 다 visited 표시로 같은 정점을 두 번 방문하지 않게 해요.",
      "시간 복잡도는 둘 다 O(V + E)."
    ],
    demo: "search",
    ops: {
      head: ["항목", "BFS", "DFS"],
      rows: [
        ["도구", "큐", "스택 / 재귀"],
        ["방문 순서", "가까운 정점부터", "한 방향 끝까지"],
        ["잘 맞는 문제", "최단 거리 (비용 동일)", "경로 존재, 사이클, 백트래킹"],
        ["시간", "O(V + E)", "O(V + E)"]
      ]
    },
    code: `from collections import deque

def bfs(graph, start):
    visited = {start}
    q = deque([start])
    order = []
    while q:
        node = q.popleft()
        order.append(node)
        for nxt in graph[node]:
            if nxt not in visited:
                visited.add(nxt)
                q.append(nxt)
    return order

def dfs(graph, node, visited=None):
    if visited is None:
        visited = set()
    visited.add(node)
    for nxt in graph[node]:
        if nxt not in visited:
            dfs(graph, nxt, visited)
    return visited`,
    pitfall: "BFS에서는 큐에 넣는 순간 visited 표시를 하세요. 꺼낼 때 표시하면 같은 정점이 큐에 여러 번 들어가요.",
    quiz: [
      { q: "BFS에 쓰는 자료구조는?", options: ["스택", "큐", "힙", "트라이"], answer: 1,
        why: "먼저 발견한 가까운 정점을 먼저 처리해야 하니 FIFO인 큐를 써요." },
      { q: "미로에서 출구까지 가는 최소 칸 수를 구하려면?", options: ["DFS", "BFS", "힙 정렬", "트라이"], answer: 1,
        why: "BFS는 거리 1, 2, 3… 순서로 퍼지니 처음 도착한 순간이 최단 거리예요." },
      { q: "visited 확인을 빼먹으면?", options: ["더 빨라진다", "사이클에서 무한히 돌 수 있다", "결과가 똑같다", "메모리만 조금 더 쓴다"], answer: 1,
        why: "A → B → A → B … 처럼 같은 곳을 계속 오갈 수 있어요." }
    ]
  },
  {
    id: "union-find",
    title: "유니온 파인드",
    en: "Union-Find",
    tagline: "'둘이 같은 그룹인가?'와 '두 그룹 합치기'를 거의 O(1)에 해내는 구조.",
    analogy: "동아리 대표. 각자 대표를 따라 올라가서 대표가 같으면 같은 동아리예요. 합칠 땐 한쪽 대표가 다른 대표 밑으로 들어가요.",
    points: [
      "parent 배열 하나로 표현해요. 처음엔 모두 자기 자신이 대표예요.",
      "find(x)는 대표를 찾아 올라가고, union(a, b)는 두 대표를 연결해요.",
      "경로 압축과 크기 기준 합치기를 쓰면 사실상 상수 시간이에요.",
      "네트워크 연결 확인, 사이클 판정, 크루스칼 최소 신장 트리에 쓰여요."
    ],
    demo: "uf",
    ops: {
      head: ["연산", "시간", "메모"],
      rows: [
        ["초기화", "O(n)", "parent[i] = i"],
        ["find", "O(α(n))", "사실상 O(1)"],
        ["union", "O(α(n))", "find 두 번 + 연결"],
        ["최적화 없이", "O(n)", "일자로 길어질 수 있음"]
      ]
    },
    code: `parent = list(range(6))          # 0~5, 각자 자기 대표

def find(x):
    if parent[x] != x:
        parent[x] = find(parent[x])   # 경로 압축
    return parent[x]

def union(a, b):
    ra, rb = find(a), find(b)
    if ra != rb:
        parent[rb] = ra

union(0, 1)
union(1, 2)
print(find(2) == find(0))   # True, 같은 그룹
print(find(3) == find(0))   # False`,
    pitfall: "같은 그룹인지 볼 때 `parent[a] == parent[b]`로 비교하면 틀려요. 반드시 `find(a) == find(b)`로 대표끼리 비교하세요.",
    quiz: [
      { q: "유니온 파인드가 빠르게 답하는 질문은?", options: ["두 정점 사이 최단 거리", "두 원소가 같은 그룹인가", "가장 작은 값", "접두사가 같은 단어"], answer: 1,
        why: "find로 대표를 구해 비교하면 같은 그룹인지 바로 알 수 있어요." },
      { q: "find를 빠르게 만드는 기법은?", options: ["경로 압축", "회전", "리해싱", "원형 큐"], answer: 0,
        why: "지나간 노드들이 대표를 바로 가리키게 바꿔서 다음 find를 짧게 해요." },
      { q: "무방향 그래프에 간선 (u, v)를 넣기 전 find(u) == find(v)라면?", options: ["이 간선이 사이클을 만든다", "그래프가 끊어진다", "오류가 난다", "트리가 완성된다"], answer: 0,
        why: "이미 연결된 두 점을 또 이으면 고리(사이클)가 생겨요." }
    ]
  },
  {
    id: "range-sum",
    title: "구간 합",
    en: "Prefix Sum · Segment Tree",
    tagline: "'i번부터 j번까지의 합'을 매번 더하지 않고 빠르게 구하는 방법.",
    analogy: "가계부 누적 금액. 3월~6월 지출은 '6월까지 누적 − 2월까지 누적'으로 바로 나와요.",
    points: [
      "누적 합: P[i] = a[0] + … + a[i−1]을 미리 만들어 두면 a[i..j]의 합 = P[j+1] − P[i], O(1).",
      "단점: 값 하나가 바뀌면 그 뒤 누적 합을 전부 다시 계산해야 해요. O(n).",
      "세그먼트 트리: 구간을 반씩 나눠 각 구간의 합을 저장한 트리. 구간 합과 값 수정이 모두 O(log n).",
      "합 대신 최솟값·최댓값도 같은 구조로 구할 수 있어요."
    ],
    demo: "prefix",
    ops: {
      head: ["작업", "누적 합", "세그먼트 트리"],
      rows: [
        ["준비", "O(n)", "O(n)"],
        ["구간 합 질문", "O(1)", "O(log n)"],
        ["값 하나 수정", "O(n)", "O(log n)"]
      ]
    },
    code: `a = [3, 1, 4, 1, 5, 9, 2, 6]

P = [0]
for x in a:
    P.append(P[-1] + x)      # P = [0, 3, 4, 8, 9, 14, 23, 25, 31]

def range_sum(i, j):         # a[i] + ... + a[j]
    return P[j + 1] - P[i]

print(range_sum(2, 5))       # 4 + 1 + 5 + 9 = 19`,
    pitfall: "P는 a보다 한 칸 길어요. 맨 앞 0 덕분에 i = 0인 구간도 같은 식으로 구해져요.",
    quiz: [
      { q: "P = [0, 3, 4, 8, 9, 14]일 때 a[1] + a[2] + a[3]은?", options: ["6", "9", "5", "8"], answer: 0,
        why: "P[4] − P[1] = 9 − 3 = 6." },
      { q: "값 수정도 잦고 구간 합 질문도 잦다면?", options: ["누적 합", "세그먼트 트리", "스택", "해시 테이블"], answer: 1,
        why: "누적 합은 수정이 O(n)이라 느려요. 세그먼트 트리는 둘 다 O(log n)." },
      { q: "누적 합 배열이 있을 때 구간 합 한 번의 시간은?", options: ["O(1)", "O(log n)", "O(n)", "O(n²)"], answer: 0,
        why: "뺄셈 한 번이에요." }
    ]
  },
  {
    id: "choose",
    title: "자료구조 고르기",
    en: "Choosing the Right One",
    tagline: "문제에서 '가장 자주 하는 연산'을 찾으면 쓸 자료구조가 보여요.",
    analogy: "공구함. 못에는 망치, 나사에는 드라이버. 하려는 연산에 맞는 도구를 고르면 돼요.",
    points: [
      "번호로 바로 찾기 → 배열. 있는지 확인·개수 세기 → 해시(set, dict).",
      "최근 것부터·되돌리기 → 스택. 먼저 온 순서대로 → 큐.",
      "매번 가장 작은(큰) 것 → 힙. 정렬 상태 유지와 범위 검색 → 균형 트리.",
      "연결 관계 → 그래프. 같은 그룹 판정 → 유니온 파인드. 접두사 → 트라이."
    ],
    demo: null,
    ops: {
      head: ["자주 하는 일", "고를 것", "핵심 연산"],
      rows: [
        ["i번째 값 읽기", "배열", "O(1)"],
        ["이 값이 있나?", "해시 집합", "O(1)"],
        ["방금 한 일 취소", "스택", "O(1)"],
        ["들어온 순서대로 처리", "큐 / 덱", "O(1)"],
        ["가장 급한 것 먼저", "힙", "O(log n)"],
        ["범위 안의 값 모두", "균형 트리", "O(log n)"],
        ["두 점이 이어져 있나?", "유니온 파인드", "O(α(n))"],
        ["이 글자로 시작하는 단어", "트라이", "O(L)"]
      ]
    },
    code: `# 같은 질문, 다른 자료구조
# "방문자 ID 100만 개 중에 이 ID가 있나?"

ids_list = list(range(1_000_000))
ids_set = set(ids_list)

999_999 in ids_list   # 최대 100만 번 비교, O(n)
999_999 in ids_set    # 해시 계산 한 번, O(1)`,
    pitfall: "처음부터 완벽한 선택을 할 필요는 없어요. 느린 곳을 찾으면 그 연산에 맞는 자료구조로 바꾸면 돼요.",
    quiz: [
      { q: "실시간 랭킹에서 매번 점수가 가장 높은 사람만 꺼낸다면?", options: ["스택", "힙", "연결 리스트", "트라이"], answer: 1,
        why: "최대 힙이면 1등 확인 O(1), 꺼내기 O(log n)이에요." },
      { q: "웹 브라우저의 '뒤로 가기'에 맞는 것은?", options: ["큐", "스택", "해시 테이블", "그래프"], answer: 1,
        why: "가장 최근에 본 페이지부터 돌아가니 LIFO예요." },
      { q: "회원가입 때 아이디 중복 확인에 맞는 것은?", options: ["정렬 안 된 리스트", "해시 집합", "스택", "덱"], answer: 1,
        why: "있는지 확인을 평균 O(1)에 해요." }
    ]
  }
];
