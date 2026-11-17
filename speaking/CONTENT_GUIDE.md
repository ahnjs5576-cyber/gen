# 콘텐츠 작성 가이드 — 하루 스피킹

콘텐츠는 `content/*.js` 파일들이 전역 객체 `window.SPK`에 배열을 등록하는 형태입니다.
빌드 없이 `<script>`로 불러오므로 **ES 모듈 문법(import/export)을 쓰지 않습니다.**

```js
(window.SPK = window.SPK || {}).sounds = [ ... ];
```

사용자는 **한국어 화자**이고, 영어로 또렷하고(clear) 조리 있게(articulate) 말하는 연습을 합니다.
설명(`ko`, `tip`, `how` 등)은 한국어 간결한 평서체(~다, ~함), 연습 문장은 영어입니다.
문자열 안 서식은 `**굵게**` 하나만 허용. HTML 태그 금지.

브라우저 음성 인식(Web Speech API)이 사용자의 말을 받아 적어 채점합니다. 그래서:

- 영어 연습 문장·단어는 **실제로 흔히 쓰는 철자**로. 고유명사·희귀어·약어·숫자 표기(“3”, “$”)는 피함(인식기가 “three”/“3”을 섞어 냄).
- 하이픈 단어, 축약형(I'm, don't)은 써도 되지만 채점 시 정규화됨.

---

## 1. `content/sounds.js` — 발음 드릴 (한국어 화자가 헷갈리는 소리)

```js
(window.SPK = window.SPK || {}).sounds = [
  {
    id: 'r-l',                       // 영문 소문자-하이픈, 고유
    title: 'R vs L',                 // 짧은 이름
    ipa: '/r/ · /l/',
    ko: '한국어 ㄹ 하나로 두 소리를 대신하면 생기는 혼동.',      // 왜 어려운지 1문장
    tip: '**L**은 혀끝을 윗니 뒤 잇몸에 꾹 붙였다 뗀다. **R**은 혀끝이 어디에도 닿지 않게 살짝 뒤로 말고 입술을 둥글게 내민다.', // 입 모양 설명 1~3문장
    pairs: [                         // 최소 대립쌍 8개. [A소리 단어, B소리 단어]
      ['right|write', 'light'],      // '|' 뒤는 같은 발음의 다른 철자(인식기가 이렇게 적어도 정답 처리)
      ['road|rode', 'load'],
      ...
    ],
    sentences: [                     // 그 소리가 몰린 연습 문장 3개, 6~14단어, 문법적으로 자연스러운 문장
      'The red lorry rolled slowly along the long road.',
      ...
    ]
  }
]
```

규칙
- 세트 **14개 이상**. 반드시 포함: R/L, F/P, V/B, θ(think)/s, ð(this)/d, Z/ʤ(zoo/Jew 대신 zip/jip 같은 안전한 쌍), 장모음 i:/단모음 ɪ(sheep/ship), æ/ɛ(bad/bed), ʌ/ɑ(cut/cot), ʊ/u:(full/fool, pull/pool, could/cooed — 끝 자음까지 같은 진짜 최소 대립쌍만. foot/food, book/boot처럼 자음도 다르면 쓰지 않음), 단어 끝 자음(끝소리 살리기: cap/cab, bag/back 등 유성/무성 끝소리), 자음군(한국어 화자가 자음 사이에 ‘으’ 모음을 끼워 넣는 실수. pairs는 ‘자음군 단어 / 모음이 끼어든 실제 단어’: ‘sport’/‘support’, ‘blow’/‘below’, ‘plight’/‘polite’ 처럼 **둘 다 실존 단어**인 쌍만), W(우·오 앞에서 w를 빠뜨리는 실수: pairs는 ‘woke’/‘oak’, ‘woe’/‘owe’, ‘war’/‘or’처럼 w 유무만 다른 실존 단어이고 **w 뒤 모음이 o·oʊ·ɔ·uː·ʊ·ɜr**인 것만. wear/air, wait/ate처럼 와·웨·위 계열은 한국어에도 있어 오류가 아니므로 제외. 문장에는 woman·would·wool·wolf를 몰아 넣기), s/sh(한국어 ‘시’→‘쉬’ 오류이므로 pairs는 **s 뒤에 i·ɪ가 오는 쌍만**: see/she, sip/ship, seat/sheet. sock/shock, so/show처럼 다른 모음 앞은 오류가 아니므로 제외. 문장에는 sit·seat·city·sixty·simple·sister 같은 s+i 단어를 sh 단어와 섞기).
- pairs 두 단어는 **목표 소리 하나만 다른 진짜 최소 대립쌍**이어야 함. 채점은 인식기가 짝 중 어느 단어를 적었는지로 판정하므로, 다른 자음·모음까지 다르면 목표 소리를 틀려도 나머지 소리로 구별돼 정답 처리됨(예: ʊ/u: 세트의 foot/food는 무용).
- pairs 두 단어는 **둘 다 실존하는 흔한 영단어**이고, 서로 동음이의어가 아니어야 함. 같은 발음의 다른 철자가 있으면 `|`로 모두 적기(예: `'sea|see'`, `'right|write|rite'`).
- 고유명사, 욕설, 민감 단어 금지.

## 2. `content/warmups.js` — 입 풀기 (마이크 없이 타이머로)

```js
(window.SPK = window.SPK || {}).warmups = [
  {
    id: 'lip-trill',
    title: '입술 털기',
    seconds: 40,                     // 20~60
    how: [                           // 따라 하기 단계 2~4개
      '입술을 가볍게 다물고 숨을 내쉬며 “브르르” 진동시킨다.',
      '진동을 유지한 채 음을 낮게→높게 미끄러뜨린다.'
    ],
    why: '입술 긴장을 풀어 p, b, m 소리가 또렷해진다.',
    say: 'Brrr — ma, me, mi, mo, mu'  // 선택: 소리 내어 반복할 음절/구
  }
]
```
규칙: **14개 이상**. 입술·혀·턱·호흡·성대(허밍)·과장된 모음(a-e-i-o-u)·혀 끝 자음 반복(t-d-n-l) 등을 고르게.

## 3. `content/passages.js` — 섀도잉 / 소리 내어 읽기

```js
(window.SPK = window.SPK || {}).passages = [
  {
    id: 'p-001',
    level: 1,                        // 1 쉬움(문장 짧음) · 2 보통 · 3 도전
    title: 'Morning Routine',
    text: 'I wake up at seven and drink a glass of water. ...',   // level1 35~50단어, level2 50~70, level3 70~90
    ko: '아침 일과를 설명하는 짧은 글.',  // 한 줄 소개
    focus: 'r-l'                     // 선택: 관련 sounds id
  }
]
```
규칙: **36개 이상** (level 1·2·3 각 12개 이상). 주제: 일상, 업무 대화, 짧은 발표, 의견 말하기, 설명, 이야기. 실제 말할 법한 구어체. 숫자는 단어로(seven). 고유명사 금지.

## 4. `content/topics.js` — Daily 60 (60초 즉흥 말하기)

```js
(window.SPK = window.SPK || {}).topics = [
  {
    id: 't-001',
    cat: 'daily',                    // daily | opinion | work | explain | story
    q: 'Describe a place where you feel most relaxed.',
    ko: '가장 편안함을 느끼는 장소를 묘사해 보세요.',
    fw: 'ppf',                       // 추천 말하기 틀: prep | star | ppf | psb | wsn | cc | steps | desc
    hints: ['quiet', 'familiar', 'recharge']   // 쓸 만한 단어 2~4개
  }
]
```
틀(fw) 의미
- `prep` Point–Reason–Example–Point (의견)
- `star` Situation–Task–Action–Result (경험·업무 사례)
- `ppf` Past–Present–Future (시간에 따른 변화)
- `psb` Problem–Solution–Benefit (제안·설득)
- `wsn` What–So what–Now what (설명·회고)
- `cc` Compare–Contrast–Conclude (비교)
- `steps` First–Then–Finally (방법·절차·순서: how to ~, walk me through ~)
- `desc` Overview–Details–Feeling (장소·사물·사람 묘사. 시간에 따른 변화가 핵심이면 `ppf`)

규칙: **120개 이상**, 카테고리별 20개 이상. 직장인·대학생 모두 답할 수 있는 질문. 사적·민감 주제(정치, 종교, 건강 상태, 연애 상세) 금지. 질문은 1문장, 15단어 안팎.

## 5. `content/upgrades.js` — 표현 업그레이드

밋밋한 문장을 더 정확하고 생생하게 바꾸는 연습.

```js
(window.SPK = window.SPK || {}).upgrades = [
  {
    id: 'u-001',
    plain: 'The movie was very good.',
    ko: '“very + 형용사” 대신 뜻이 꽉 찬 형용사 하나.',   // 무엇을 바꾸는지 1문장
    better: [                                          // 더 나은 문장 2~3개
      'The movie was gripping from start to finish.',
      'It was one of the most moving films I have seen this year.'
    ],
    keys: ['gripping', 'moving', 'compelling', 'captivating'],   // 이 중 하나라도 말하면 성공으로 보는 핵심어 3~6개 (소문자, 단어 또는 2단어 구)
    avoid: ['very', 'good'],                                     // plain의 밋밋한 말 1~4개. 이게 들리면 핵심어를 써도 실패. better 문장에는 없어야 함
    gloss: 'gripping 손에 땀을 쥐게 하는 · moving 감동적인 · compelling 빠져드는 · captivating 마음을 사로잡는'
  }
]
```
규칙: **72개 이상**. 유형을 고르게: very+형용사, 막연한 명사(thing, stuff), 약한 동사(get, make, do, go), 군더더기(I think maybe, kind of), 수동적·장황한 문장 줄이기, 모호한 시간·수량(a lot, soon), 연결어(and then → which meant / as a result), 의견 표현(I think → I'm convinced / My take is), 동의·반대, 회의에서 쓰는 표현.

## 6. `content/rhythm.js` — 리듬·강세 (강세, 약모음, 연음, 축약, 문장 강세, 혀 꼬기)

```js
(window.SPK = window.SPK || {}).rhythm = [
  {
    id: 'stress-noun-verb',
    type: 'stress',                  // stress | schwa | linking | reduction | focus | twister
    title: '명사·동사 강세',
    ko: '같은 철자라도 명사는 앞, 동사는 뒤에 힘을 준다.',
    tip: '강세 음절은 **길고, 크고, 높게**. 나머지는 짧고 약하게.',
    lines: [                         // 4~6개
      { text: 'Please record the record.', show: 'Please reCORD the REcord.', ko: '그 음반을 녹음해 주세요.' }
    ]
  }
]
```
- `text`: 인식기가 받아 적을 평범한 철자(채점 기준). `show`: 화면 표시용 — 강세 음절은 대문자, 연음은 `‿`, 축약(reduction)은 실제 소리(`I wanna go`).
- 축약 외에는 `show`의 글자가 `text`와 같아야 함(대소문자·‿ 무시). focus 유형은 같은 문장을 강세 위치만 바꿔 반복. twister는 6~12단어.
- 유형별 3개 이상, 전체 18개 이상.

---

검증: `node scripts/validate.mjs`
