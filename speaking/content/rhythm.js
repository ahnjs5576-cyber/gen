/* 리듬·강세: 한국어식 ‘음절마다 똑같이’ 말하기에서 벗어나는 운율 드릴
 * type: stress | schwa | linking | reduction | focus | twister
 * text: 인식기가 받아 적을 평범한 철자 / show: 강세(CAPS)·연음(‿)·축약형을 보여 주는 표기 */
(window.SPK = window.SPK || {}).rhythm = [
  // ---------- 단어 강세 ----------
  {
    id: "stress-noun-verb",
    type: "stress",
    title: "명사·동사 강세",
    ko: "철자가 같아도 명사는 앞, 동사는 뒤 음절에 힘을 줘야 뜻이 바로 전달된다.",
    tip: "강세 음절은 **길고, 크고, 높게**. 나머지 음절은 짧고 약하게 흘린다.",
    lines: [
      { text: "They will record a new record next month.", show: "They will reCORD a new REcord next month.", ko: "그들은 다음 달 새 음반을 녹음한다." },
      { text: "I suspect the suspect is lying.", show: "I susPECT the SUSpect is lying.", ko: "그 용의자가 거짓말을 하는 것 같다." },
      { text: "They won't permit us to park without a permit.", show: "They won't perMIT us to park without a PERmit.", ko: "허가증 없이는 주차를 허락하지 않는다." },
      { text: "Sales showed an increase, and costs will increase too.", show: "Sales showed an INcrease, and costs will inCREASE too.", ko: "매출이 늘었고 비용도 늘 것이다." },
      { text: "Please don't desert me in the desert.", show: "Please don't deSERT me in the DEsert.", ko: "사막에서 나를 버리지 마." }
    ]
  },
  {
    id: "stress-compound",
    type: "stress",
    title: "복합명사 강세",
    ko: "두 단어가 붙어 한 사물이 되면 앞 단어에 힘을 준다. 강세 위치만으로 greenhouse(온실)와 green house(초록색 집)가 갈린다.",
    tip: "**복합명사는 앞**(GREENhouse), **형용사+명사는 뒤**(green HOUSE)에 힘을 준다. 약한 쪽은 반쯤 삼키듯 짧게 낸다.",
    lines: [
      { text: "We grow tomatoes in a greenhouse.", show: "We grow tomatoes in a GREENhouse.", ko: "온실에서 토마토를 키운다." },
      { text: "They live in a green house on the corner.", show: "They live in a green HOUSE on the corner.", ko: "모퉁이에 있는 초록색 집에 산다." },
      { text: "A blackbird sang on the fence.", show: "A BLACKbird sang on the fence.", ko: "검은지빠귀 한 마리가 울타리에서 노래했다." },
      { text: "I saw a black bird on the roof.", show: "I saw a black BIRD on the roof.", ko: "지붕 위에서 검은색 새를 봤다." },
      { text: "I ate a hot dog for lunch.", show: "I ate a HOT dog for lunch.", ko: "점심으로 핫도그를 먹었다." },
      { text: "That hot dog needs some shade.", show: "That hot DOG needs some shade.", ko: "더위에 지친 저 개에게 그늘이 필요하다." }
    ]
  },
  {
    id: "stress-word-family",
    type: "stress",
    title: "단어 가족 강세 이동",
    ko: "photo, photography, photographic처럼 접미사가 붙으면 강세 자리가 옮겨 가서, 한 자리로 고정하면 알아듣기 어렵다.",
    tip: "**CAPS 음절 하나만** 확실히 세우고 나머지 모음은 ‘어’에 가깝게 약하게 줄인다. -ic, -ian, -tion 앞 음절에 강세가 오는 경우가 많다.",
    lines: [
      { text: "I took a photo for my photography class.", show: "I took a PHOto for my phoTOGraphy class.", ko: "사진 수업 과제로 사진을 한 장 찍었다." },
      { text: "My sister is a photographer.", show: "My sister is a phoTOGrapher.", ko: "언니는 사진작가다." },
      { text: "She has a photographic memory.", show: "She has a photoGRAPHic memory.", ko: "그녀는 사진처럼 정확한 기억력을 가졌다." },
      { text: "Economics is about the economy.", show: "EcoNOMics is about the eCONomy.", ko: "경제학은 경제를 다룬다." },
      { text: "The analysis helps us analyze the data.", show: "The aNALysis helps us ANalyze the data.", ko: "그 분석은 데이터를 분석하는 데 도움이 된다." }
    ]
  },
  // ---------- 약화(schwa)·약형 ----------
  {
    id: "schwa-to-for",
    type: "schwa",
    title: "to·for 약하게",
    ko: "to, for 같은 기능어를 또박또박 ‘투’, ‘포’로 내면 문장 리듬이 무너진다. 빠른 말에서는 tə, fər로 줄어든다.",
    tip: "**CAPS 단어(내용어)**에만 힘을 주고, to는 ‘터’, for는 ‘퍼r’처럼 짧게 흘려 앞뒤 단어에 붙인다.",
    lines: [
      { text: "I went to the store for some bread.", show: "I WENT to the STORE for some BREAD.", ko: "빵을 사러 가게에 갔다." },
      { text: "We need to leave for the airport soon.", show: "We NEED to LEAVE for the AIRport SOON.", ko: "곧 공항으로 출발해야 한다." },
      { text: "Thanks for coming to the meeting.", show: "THANKS for COMing to the MEETing.", ko: "회의에 와 줘서 고맙다." },
      { text: "It's easy to forget to eat.", show: "It's EAsy to forGET to EAT.", ko: "밥 먹는 걸 잊기 쉽다." }
    ]
  },
  {
    id: "schwa-and-of",
    type: "schwa",
    title: "and·of 약하게",
    ko: "and는 ən, of는 əv로 줄어 앞 단어에 붙는다. 하나하나 세게 내면 로봇처럼 들린다.",
    tip: "and는 ‘언’, of는 ‘어v’ 정도로 **아주 짧게**. 강세 단어 사이를 잇는 접착제라고 생각한다.",
    lines: [
      { text: "I'd like a cup of coffee and a piece of cake.", show: "I'd LIKE a CUP of COFfee and a PIECE of CAKE.", ko: "커피 한 잔이랑 케이크 한 조각 주세요." },
      { text: "Salt and pepper, please.", show: "SALT and PEPper, PLEASE.", ko: "소금이랑 후추 좀 주세요." },
      { text: "Most of my friends live out of town.", show: "MOST of my FRIENDS live OUT of TOWN.", ko: "친구들 대부분이 다른 지역에 산다." },
      { text: "We talked about the pros and cons of the plan.", show: "We TALKED about the PROS and CONS of the PLAN.", ko: "그 계획의 장단점을 이야기했다." },
      { text: "Black and white photos are full of character.", show: "BLACK and WHITE PHOtos are FULL of CHARacter.", ko: "흑백 사진은 개성이 넘친다." }
    ]
  },
  {
    id: "schwa-can",
    type: "schwa",
    title: "can 약하게, can't 강하게",
    ko: "긍정문의 can은 kən으로 약하게, can't는 강하게 낸다. 둘 다 ‘캔’으로 세게 내면 듣는 사람이 긍정인지 부정인지 헷갈린다.",
    tip: "can은 ‘큰’처럼 짧게 흘리고 뒤 동사를 **CAPS로 세운다**. can't는 모음을 길게, 끝 t는 살짝 멈추듯 끊는다.",
    lines: [
      { text: "I can swim, but I can't dive.", show: "I can SWIM, but I CAN'T DIVE.", ko: "수영은 할 줄 알지만 다이빙은 못 한다." },
      { text: "She can speak three languages.", show: "She can SPEAK THREE LANguages.", ko: "그녀는 세 개 언어를 할 줄 안다." },
      { text: "You can call me any time.", show: "You can CALL me ANy TIME.", ko: "언제든 전화해도 된다." },
      { text: "We can't stay, but we can come back later.", show: "We CAN'T STAY, but we can COME BACK LATer.", ko: "지금은 못 있지만 나중에 다시 올 수 있다." },
      { text: "Can you help me with this?", show: "Can you HELP me with THIS?", ko: "이것 좀 도와줄 수 있어요?" }
    ]
  },
  {
    id: "schwa-in-words",
    type: "schwa",
    title: "단어 속 약한 모음",
    ko: "강세 없는 음절의 모음은 ‘어’(ə)로 줄어든다. banana를 ‘바나나’로 세 음절 똑같이 내면 어색하게 들린다.",
    tip: "**CAPS 음절**만 또렷하게 내고, 나머지 모음은 입에 힘을 뺀 채 아주 짧은 ‘어’로 줄인다.",
    lines: [
      { text: "Today we talked about the problem.", show: "toDAY we TALKED aBOUT the PROBlem.", ko: "오늘 그 문제에 대해 이야기했다." },
      { text: "Chocolate is my favorite dessert.", show: "CHOColate is my FAVorite desSERT.", ko: "초콜릿은 내가 가장 좋아하는 디저트다." },
      { text: "The banana is on the table.", show: "The baNAna is on the TAble.", ko: "바나나는 식탁 위에 있다." },
      { text: "Please support the second option.", show: "PLEASE supPORT the SECond OPtion.", ko: "두 번째 안을 지지해 주세요." }
    ]
  },
  // ---------- 연음 ----------
  {
    id: "link-consonant-vowel",
    type: "linking",
    title: "자음+모음 연결",
    ko: "단어 끝 자음이 다음 단어 첫 모음과 만나면 한 단어처럼 이어진다. 끊어 말하면 ‘픽 잇 업’처럼 뚝뚝 끊긴다.",
    tip: "‿ 표시에서 앞 단어의 **끝 자음을 다음 모음 쪽으로 넘겨** 붙인다. pick‿it‿up은 ‘피-키-럽’처럼 한 덩어리.",
    lines: [
      { text: "Please pick it up and put it on.", show: "Please pick‿it‿up‿and put‿it‿on.", ko: "그거 집어서 입어 봐." },
      { text: "Turn it off after an hour.", show: "Turn‿it‿off‿after‿an‿hour.", ko: "한 시간 뒤에 꺼 줘." },
      { text: "Can I have a look at it?", show: "Can‿I have‿a look‿at‿it?", ko: "한번 봐도 될까요?" },
      { text: "She lives in an old apartment.", show: "She lives‿in‿an‿old‿apartment.", ko: "그녀는 오래된 아파트에 산다." },
      { text: "Come on in and sit down.", show: "Come‿on‿in‿and sit down.", ko: "어서 들어와서 앉아." }
    ]
  },
  {
    id: "link-same-consonant",
    type: "linking",
    title: "같은 자음 이어 붙이기",
    ko: "앞 단어 끝 자음과 다음 단어 첫 자음이 같으면 두 번 내지 않고 한 번만 길게 낸다.",
    tip: "‿ 표시에서 자음을 **한 번만, 조금 길게**. bad‿day는 ‘배드 데이’가 아니라 ‘배-데이’.",
    lines: [
      { text: "We had a bad day yesterday.", show: "We had a bad‿day yesterday.", ko: "어제는 일진이 나빴다." },
      { text: "I need some more milk.", show: "I need some‿more milk.", ko: "우유가 좀 더 필요하다." },
      { text: "It was a big game last night.", show: "It was a big‿game last night.", ko: "어젯밤은 큰 경기였다." },
      { text: "She sent ten messages.", show: "She sent‿ten messages.", ko: "그녀는 메시지를 열 개 보냈다." },
      { text: "Stop pushing the red door.", show: "Stop‿pushing the red‿door.", ko: "빨간 문 좀 그만 밀어." }
    ]
  },
  {
    id: "link-phrasal",
    type: "linking",
    title: "구동사 연결",
    ko: "log in, fill out, figure it out 같은 구동사는 단어 사이를 띄우지 않고 한 덩어리로 말한다.",
    tip: "동사 끝 자음을 뒤 단어 모음에 **넘겨 붙이고**, 마지막 단어(in, out, up)에 강세를 준다.",
    lines: [
      { text: "Log in and fill out the form.", show: "Log‿in‿and fill‿out the form.", ko: "로그인해서 양식을 작성해." },
      { text: "Look it up online.", show: "Look‿it‿up‿online.", ko: "인터넷에서 찾아봐." },
      { text: "Let's figure it out together.", show: "Let's figure‿it‿out together.", ko: "같이 알아내 보자." },
      { text: "Hold on a minute.", show: "Hold‿on‿a minute.", ko: "잠깐만 기다려." },
      { text: "Don't give up on it.", show: "Don't give‿up‿on‿it.", ko: "그거 포기하지 마." }
    ]
  },
  {
    id: "link-vowel-glide",
    type: "linking",
    title: "모음+모음 연결",
    ko: "모음으로 끝난 단어 뒤에 모음이 오면 사이에 가벼운 w나 y 소리가 생겨 부드럽게 이어진다. 끊으면 ‘고 아웃’처럼 두 단어가 따로 논다.",
    tip: "go‿out은 ‘고-우-아웃’, I‿agree는 ‘아-y-어그리’처럼 **입 모양이 저절로 미끄러지게** 둔다. 사이에서 멈추지 않는다.",
    lines: [
      { text: "Let's go out for dinner.", show: "Let's go‿out for dinner.", ko: "저녁 먹으러 나가자." },
      { text: "I agree with you.", show: "I‿agree with you.", ko: "네 말에 동의해." },
      { text: "Please do it again.", show: "Please do‿it‿again.", ko: "다시 한번 해 줘." },
      { text: "She is very easy to talk to.", show: "She‿is very‿easy to talk to.", ko: "그녀는 정말 말이 잘 통한다." },
      { text: "We all enjoyed the show.", show: "We‿all‿enjoyed the show.", ko: "우리 모두 공연을 즐겼다." }
    ]
  },
  // ---------- 축약 ----------
  {
    id: "reduce-wanna-gonna",
    type: "reduction",
    title: "wanna·gonna",
    ko: "want to, going to는 일상 대화에서 거의 항상 wanna, gonna로 줄어든다. 들을 때도 이 소리를 알아야 한다.",
    tip: "글로 쓸 때는 want to, going to. 말할 때는 **‘워너’, ‘거너’**처럼 한 덩어리로. 단, I'm going to the gym처럼 뒤에 장소가 오면 줄이지 않는다.",
    lines: [
      { text: "I want to go home.", show: "I wanna go home.", ko: "집에 가고 싶다." },
      { text: "Do you want to grab lunch?", show: "Do you wanna grab lunch?", ko: "점심 먹으러 갈래?" },
      { text: "I'm going to call you later.", show: "I'm gonna call you later.", ko: "이따 전화할게." },
      { text: "It's going to rain tonight.", show: "It's gonna rain tonight.", ko: "오늘 밤 비가 올 거다." },
      { text: "What are you going to do?", show: "What are you gonna do?", ko: "어떻게 할 거야?" }
    ]
  },
  {
    id: "reduce-gotta-hafta",
    type: "reduction",
    title: "gotta·hafta",
    ko: "got to, have to, has to는 빠른 말에서 gotta, hafta, hasta로 줄어든다. 의무를 말할 때 아주 자주 쓰인다.",
    tip: "got to는 t 두 개를 한 번에 **‘가러’**처럼, have to는 v가 f로 바뀌어 **‘해프터’**처럼 낸다.",
    lines: [
      { text: "I've got to go now.", show: "I've gotta go now.", ko: "이제 가 봐야 해." },
      { text: "We have to finish this today.", show: "We hafta finish this today.", ko: "오늘 이거 끝내야 해." },
      { text: "She has to work late tonight.", show: "She hasta work late tonight.", ko: "그녀는 오늘 늦게까지 일해야 한다." },
      { text: "You've got to try this.", show: "You've gotta try this.", ko: "이거 꼭 먹어 봐." },
      { text: "Do we have to wait?", show: "Do we hafta wait?", ko: "우리 기다려야 해?" }
    ]
  },
  {
    id: "reduce-you-me",
    type: "reduction",
    title: "didja·lemme·gimme",
    ko: "d나 t 뒤에 you가 오면 ‘쥬·츄’로 섞이고, let me, give me는 lemme, gimme로 줄어든다.",
    tip: "did you는 **‘디쥬’**, would you는 **‘우쥬’**, let me는 t를 생략해 **‘레미’**. 두 단어를 한 박자로 말한다.",
    lines: [
      { text: "Did you eat yet?", show: "Didja eat yet?", ko: "밥 먹었어?" },
      { text: "Let me know by tonight.", show: "Lemme know by tonight.", ko: "오늘 밤까지 알려 줘." },
      { text: "Would you like some tea?", show: "Wouldja like some tea?", ko: "차 좀 드릴까요?" },
      { text: "Give me a second.", show: "Gimme a second.", ko: "잠깐만." },
      { text: "What do you think?", show: "Whaddaya think?", ko: "어떻게 생각해?" }
    ]
  },
  // ---------- 문장 강세(초점) ----------
  {
    id: "focus-pen",
    type: "focus",
    title: "초점 강세로 뜻 바꾸기",
    ko: "같은 문장도 어느 단어에 힘을 주느냐에 따라 뜻이 달라진다. 한국어식으로 모든 단어를 같은 세기로 내면 의도가 전달되지 않는다.",
    tip: "**CAPS 단어 하나만** 크고 높고 길게, 나머지는 평소보다 낮게. 각 줄의 한국어 뜻을 떠올리며 말한다.",
    lines: [
      { text: "I didn't say she took your pen.", show: "I DIDN'T say she took your pen.", ko: "그런 말은 한 적 없다." },
      { text: "I didn't say she took your pen.", show: "I didn't SAY she took your pen.", ko: "말로 하진 않았다(암시만 했을 뿐)." },
      { text: "I didn't say she took your pen.", show: "I didn't say SHE took your pen.", ko: "그녀가 가져갔다고는 안 했다(다른 사람일 수도)." },
      { text: "I didn't say she took your pen.", show: "I didn't say she took YOUR pen.", ko: "네 펜이라고는 안 했다(다른 사람 펜)." },
      { text: "I didn't say she took your pen.", show: "I didn't say she took your PEN.", ko: "펜이라고는 안 했다(다른 물건)." }
    ]
  },
  {
    id: "focus-meeting",
    type: "focus",
    title: "질문의 초점",
    ko: "질문에서도 강세 단어가 무엇을 묻는지 정한다. 상대가 정확히 그 부분에 답하게 된다.",
    tip: "괄호 속 대안과 **대비되는 단어**를 CAPS로 세운다. 강세 단어 뒤에서 음을 뚝 떨어뜨린다.",
    lines: [
      { text: "Can we meet tomorrow morning?", show: "Can WE meet tomorrow morning?", ko: "(다른 사람 말고) 우리끼리 만날 수 있을까?" },
      { text: "Can we meet tomorrow morning?", show: "Can we MEET tomorrow morning?", ko: "(통화 말고) 직접 만날 수 있을까?" },
      { text: "Can we meet tomorrow morning?", show: "Can we meet TOMORROW morning?", ko: "(오늘 말고) 내일 만날 수 있을까?" },
      { text: "Can we meet tomorrow morning?", show: "Can we meet tomorrow MORNING?", ko: "(오후 말고) 오전에 만날 수 있을까?" }
    ]
  },
  {
    id: "focus-car",
    type: "focus",
    title: "새 정보에 힘주기",
    ko: "대화에서 새로운 정보나 상대 생각을 바로잡는 단어에 강세가 간다. 강세가 틀리면 엉뚱한 부분을 고치는 말이 된다.",
    tip: "‘무엇이 아니라 이것’이라는 느낌으로 **CAPS 단어를 한 단계 높게** 올렸다가 내린다.",
    lines: [
      { text: "She bought a new red car.", show: "SHE bought a new red car.", ko: "(다른 사람 말고) 그녀가 샀다." },
      { text: "She bought a new red car.", show: "She BOUGHT a new red car.", ko: "(빌린 게 아니라) 샀다." },
      { text: "She bought a new red car.", show: "She bought a NEW red car.", ko: "(중고 말고) 새 차를 샀다." },
      { text: "She bought a new red car.", show: "She bought a new RED car.", ko: "(다른 색 말고) 빨간 차를 샀다." },
      { text: "She bought a new red car.", show: "She bought a new red CAR.", ko: "(자전거 말고) 차를 샀다." }
    ]
  },
  // ---------- 잰말놀이 ----------
  {
    id: "twister-r-l",
    type: "twister",
    title: "잰말놀이: R·L",
    ko: "r과 l이 번갈아 나오는 문장으로 혀가 닿는 L과 닿지 않는 R을 빠르게 오가는 연습.",
    tip: "처음엔 **아주 천천히** 정확하게, 세 번 연속 성공하면 속도를 올린다. L에서는 혀끝이 잇몸에 닿는지 매번 확인한다.",
    lines: [
      { text: "Red leather, yellow leather, red leather, yellow leather.", show: "Red leather, yellow leather, red leather, yellow leather.", ko: "빨간 가죽, 노란 가죽." },
      { text: "Really rural roads are rarely level.", show: "Really rural roads are rarely level.", ko: "정말 시골길은 평평한 경우가 드물다." },
      { text: "A loyal royal lawyer rarely lies.", show: "A loyal royal lawyer rarely lies.", ko: "충직한 왕실 변호사는 거짓말을 거의 안 한다." },
      { text: "Lucky rabbits like to leap along long rivers.", show: "Lucky rabbits like to leap along long rivers.", ko: "운 좋은 토끼들은 긴 강을 따라 뛰어다니길 좋아한다." }
    ]
  },
  {
    id: "twister-f-p-v-b",
    type: "twister",
    title: "잰말놀이: F·P·V·B",
    ko: "f/p, v/b를 한 문장에 섞어 입술(p, b)과 윗니+아랫입술(f, v)을 빠르게 바꾸는 연습.",
    tip: "f와 v에서는 **윗니가 아랫입술에 닿는지** 확인한다. 입술끼리 붙으면 p, b로 바뀐 것이다.",
    lines: [
      { text: "Five fresh peaches fell from a full paper plate.", show: "Five fresh peaches fell from a full paper plate.", ko: "싱싱한 복숭아 다섯 개가 가득 찬 종이 접시에서 떨어졌다." },
      { text: "Fresh fried fish, fresh fried fish, fresh fried fish.", show: "Fresh fried fish, fresh fried fish, fresh fried fish.", ko: "갓 튀긴 생선." },
      { text: "Very busy bees visit vivid violet flowers.", show: "Very busy bees visit vivid violet flowers.", ko: "아주 바쁜 벌들이 선명한 보랏빛 꽃을 찾아간다." },
      { text: "The vet's van went by the big brown barn.", show: "The vet's van went by the big brown barn.", ko: "수의사의 승합차가 커다란 갈색 헛간 옆을 지나갔다." },
      { text: "Pretty puppies prefer fresh food at fun parties.", show: "Pretty puppies prefer fresh food at fun parties.", ko: "예쁜 강아지들은 즐거운 파티에서 신선한 음식을 좋아한다." }
    ]
  },
  {
    id: "twister-th-s-sh",
    type: "twister",
    title: "잰말놀이: TH·S·SH",
    ko: "θ, s, ʃ가 몰린 문장으로 혀끝 위치(이 사이, 이 뒤, 더 뒤)를 빠르게 옮기는 연습.",
    tip: "th에서는 **혀끝이 이 사이로 보여야** 하고, s는 입꼬리를 옆으로, sh는 입술을 앞으로 내민다.",
    lines: [
      { text: "She sells seashells by the seashore.", show: "She sells seashells by the seashore.", ko: "그녀는 바닷가에서 조개껍데기를 판다." },
      { text: "I thought I thought of thinking of thanking you.", show: "I thought I thought of thinking of thanking you.", ko: "너에게 고마워할 생각을 했다고 생각했다." },
      { text: "Six thick thistle sticks stood by the shed.", show: "Six thick thistle sticks stood by the shed.", ko: "굵은 엉겅퀴 줄기 여섯 개가 헛간 옆에 서 있었다." },
      { text: "Thirty three thirsty thinkers thought about the theory.", show: "Thirty three thirsty thinkers thought about the theory.", ko: "목마른 사상가 서른세 명이 그 이론을 곰곰이 생각했다." },
      { text: "Sharp shears should shave the sheep slowly.", show: "Sharp shears should shave the sheep slowly.", ko: "날카로운 가위로 양털을 천천히 깎아야 한다." }
    ]
  }
];
