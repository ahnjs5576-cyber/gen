// 표현 업그레이드 — 밋밋한 문장을 더 정확하고 생생하게
// 유형(각 8개): very+형용사 · 막연한 명사 · 약한 동사 · 군더더기 · 장황/수동 줄이기
//               · 모호한 시간/수량 · 연결어 · 의견 표현 · 동의/반대 · 회의 표현
(window.SPK = window.SPK || {}).upgrades = [
  // ---------- very + 형용사 ----------
  {
    id: "u-001",
    plain: "The movie was very good.",
    ko: "“very + 형용사” 대신 뜻이 꽉 찬 형용사 하나를 쓴다.",
    better: [
      "The movie was gripping from start to finish.",
      "It was one of the most moving films I've seen this year."
    ],
    keys: ["gripping", "moving", "compelling", "captivating"],
    avoid: ["very", "good"],
    gloss: "gripping 손에 땀을 쥐게 하는 · moving 감동적인 · compelling 빠져드는 · captivating 마음을 사로잡는"
  },
  {
    id: "u-002",
    plain: "I was very tired after work.",
    ko: "very tired 대신 피로의 정도가 담긴 형용사를 쓴다.",
    better: [
      "I was completely exhausted after work.",
      "By the end of the day, I was totally drained.",
      "I was worn out after that meeting marathon."
    ],
    keys: ["exhausted", "drained", "worn out", "wiped out"],
    avoid: ["very", "tired"],
    gloss: "exhausted 녹초가 된 · drained 기진맥진한 · worn out 지친 · wiped out 완전히 뻗은"
  },
  {
    id: "u-003",
    plain: "The room was very small.",
    ko: "very small 대신 공간의 느낌까지 전하는 형용사를 고른다.",
    better: [
      "The room was tiny, barely big enough for a desk.",
      "It was a cramped little room with no window.",
      "The studio is compact but surprisingly comfortable."
    ],
    keys: ["tiny", "cramped", "compact", "snug"],
    avoid: ["very", "small"],
    gloss: "tiny 아주 작은 · cramped 비좁은 · compact 아담한 · snug 아늑하게 꼭 맞는"
  },
  {
    id: "u-004",
    plain: "The test was very difficult.",
    ko: "very difficult 대신 어려움의 성격을 드러내는 형용사를 쓴다.",
    better: [
      "The test was challenging, especially the last section.",
      "Honestly, it was one of the toughest exams I've ever taken.",
      "It was a grueling three-hour exam."
    ],
    keys: ["challenging", "toughest", "demanding", "grueling"],
    avoid: ["very", "difficult"],
    gloss: "challenging 도전적인 · toughest 가장 힘든 · demanding 까다로운 · grueling 진이 빠지는"
  },
  {
    id: "u-005",
    plain: "The view was very beautiful.",
    ko: "very beautiful 대신 감탄이 담긴 형용사 하나로 말한다.",
    better: [
      "The view from the top was breathtaking.",
      "We had a stunning view of the whole city."
    ],
    keys: ["breathtaking", "stunning", "gorgeous", "spectacular"],
    avoid: ["very", "beautiful"],
    gloss: "breathtaking 숨 막히게 멋진 · stunning 굉장히 아름다운 · gorgeous 아주 멋진 · spectacular 장관인"
  },
  {
    id: "u-006",
    plain: "I was very happy with the result.",
    ko: "very happy 대신 기쁨의 크기를 정확히 담은 단어를 쓴다.",
    better: [
      "I was thrilled with the result.",
      "Honestly, I was delighted with how it turned out."
    ],
    keys: ["thrilled", "delighted", "pleased", "ecstatic"],
    avoid: ["very", "happy"],
    gloss: "thrilled 몹시 신난 · delighted 아주 기쁜 · pleased 만족스러운 · ecstatic 황홀한"
  },
  {
    id: "u-007",
    plain: "The presentation was very boring.",
    ko: "very boring 대신 지루함의 이유가 보이는 형용사를 쓴다.",
    better: [
      "The presentation was pretty dull.",
      "It was so tedious that people started checking their phones."
    ],
    keys: ["dull", "tedious", "monotonous", "uninspiring"],
    avoid: ["very", "boring"],
    gloss: "dull 따분한 · tedious 지루하고 늘어지는 · monotonous 단조로운 · uninspiring 감흥 없는"
  },
  {
    id: "u-008",
    plain: "The food was very bad.",
    ko: "very bad 대신 무엇이 별로였는지 구체적으로 말한다.",
    better: [
      "The food was awful, to be honest.",
      "The pasta was bland, and the soup was lukewarm."
    ],
    keys: ["awful", "bland", "lukewarm", "terrible"],
    avoid: ["very", "bad"],
    gloss: "awful 형편없는 · bland 싱거운 · lukewarm 미지근한 · terrible 끔찍한"
  },
  // ---------- 막연한 명사 (thing, stuff) ----------
  {
    id: "u-009",
    plain: "I need to buy some stuff for the trip.",
    ko: "stuff 대신 실제 물건 이름이나 범주를 말한다.",
    better: [
      "I need to grab a few travel essentials, like sunscreen and an adapter.",
      "I still need to pick up toiletries for the trip."
    ],
    keys: ["essentials", "sunscreen", "adapter", "toiletries"],
    avoid: ["stuff"],
    gloss: "essentials 필수품 · sunscreen 선크림 · adapter 어댑터 · toiletries 세면도구"
  },
  {
    id: "u-010",
    plain: "The main thing is the price.",
    ko: "thing 대신 issue, concern처럼 성격이 분명한 명사를 쓴다.",
    better: [
      "The main issue is the price.",
      "Our biggest concern is the cost.",
      "The real sticking point is the price."
    ],
    keys: ["issue", "concern", "factor", "sticking point"],
    avoid: ["thing"],
    gloss: "issue 쟁점 · concern 우려 · deciding factor 결정적 요인 · sticking point 걸림돌"
  },
  {
    id: "u-011",
    plain: "There's a thing with the website.",
    ko: "a thing 대신 어떤 문제인지 정확한 명사로 짚는다.",
    better: [
      "There's a bug on the checkout page.",
      "We have a glitch that stops people from signing in.",
      "The site had a short outage this morning."
    ],
    keys: ["bug", "glitch", "error", "outage"],
    avoid: ["thing"],
    gloss: "bug 오류 · glitch 일시적 결함 · error 에러 · outage 접속 장애"
  },
  {
    id: "u-012",
    plain: "We talked about a lot of stuff in the meeting.",
    ko: "a lot of stuff 대신 다룬 주제를 이름으로 나열한다.",
    better: [
      "We covered the budget, the timeline, and the hiring plan.",
      "We went over several key topics, including the launch date."
    ],
    keys: ["covered", "went over", "budget", "timeline", "topics"],
    avoid: ["a lot", "stuff"],
    gloss: "covered 다뤘다 · went over 검토했다 · budget 예산 · timeline 일정 · topics 주제"
  },
  {
    id: "u-013",
    plain: "The good thing about this job is the people.",
    ko: "good thing 대신 best part, upside처럼 평가가 담긴 명사를 쓴다.",
    better: [
      "The best part of this job is the people.",
      "What I value most about this role is the team.",
      "The real upside of this job is my coworkers."
    ],
    keys: ["best part", "value", "upside", "advantage"],
    avoid: ["thing"],
    gloss: "best part 가장 좋은 점 · value 소중히 여기다 · upside 장점 · advantage 이점"
  },
  {
    id: "u-014",
    plain: "I have some stuff to do tonight.",
    ko: "stuff to do 대신 할 일의 종류를 밝힌다.",
    better: [
      "I have a report to finish tonight.",
      "I have a couple of errands to run tonight."
    ],
    keys: ["report", "errands", "assignment", "chores"],
    avoid: ["stuff"],
    gloss: "report 보고서 · errands 볼일 · assignment 과제 · chores 집안일"
  },
  {
    id: "u-015",
    plain: "This app has a lot of cool things.",
    ko: "cool things 대신 features, tools처럼 정확한 명사를 쓴다.",
    better: [
      "This app has some really clever features.",
      "It comes with useful tools like offline maps and voice search."
    ],
    keys: ["features", "tools", "clever", "functions"],
    avoid: ["a lot", "cool", "things"],
    gloss: "features 기능 · tools 도구 · clever 영리한 · functions 기능"
  },
  {
    id: "u-016",
    plain: "The thing we did last year worked well.",
    ko: "the thing 대신 campaign, approach처럼 무엇이었는지 이름을 붙인다.",
    better: [
      "The campaign we ran last year worked well.",
      "Last year's initiative really paid off.",
      "The approach we tried last year was a success."
    ],
    keys: ["campaign", "initiative", "approach", "strategy"],
    avoid: ["thing", "did"],
    gloss: "campaign 캠페인 · initiative 새 계획 · approach 접근법 · strategy 전략"
  },
  // ---------- 약한 동사 (get, make, do, go) ----------
  {
    id: "u-017",
    plain: "I got better at English.",
    ko: "got better 대신 improved, made progress로 변화를 분명히 한다.",
    better: [
      "My English has improved a lot this year.",
      "I've made real progress with my speaking."
    ],
    keys: ["improved", "progress", "developed", "sharpened"],
    avoid: ["got"],
    gloss: "improved 향상됐다 · progress 진전 · developed 발전시켰다 · sharpened 갈고닦았다"
  },
  {
    id: "u-018",
    plain: "Can you make the report shorter?",
    ko: "make ~ shorter 대신 trim, condense 같은 동사 하나로.",
    better: [
      "Could you trim the report a little?",
      "Could you condense the report into two pages?"
    ],
    keys: ["trim", "condense", "shorten", "cut down"],
    avoid: ["make", "shorter"],
    gloss: "trim 다듬어 줄이다 · condense 압축하다 · shorten 줄이다 · cut down 분량을 줄이다"
  },
  {
    id: "u-019",
    plain: "We did a survey.",
    ko: "did 대신 conducted, ran처럼 행동이 보이는 동사를 쓴다.",
    better: [
      "We conducted a survey of our users.",
      "We ran a quick survey last month."
    ],
    keys: ["conducted", "ran", "carried out", "launched"],
    avoid: ["did"],
    gloss: "conducted 실시했다 · ran 진행했다 · carried out 수행했다 · launched 시작했다"
  },
  {
    id: "u-020",
    plain: "Sales went up last quarter.",
    ko: "went up 대신 변화의 속도까지 담은 동사를 쓴다.",
    better: [
      "Sales rose sharply last quarter.",
      "Sales jumped by almost twenty percent last quarter."
    ],
    keys: ["rose", "jumped", "climbed", "surged", "increased"],
    avoid: ["went up"],
    gloss: "rose 올랐다 · jumped 급등했다 · climbed 꾸준히 올랐다 · surged 치솟았다 · increased 증가했다"
  },
  {
    id: "u-021",
    plain: "I got the job.",
    ko: "got 대신 landed, secured로 성취감을 살린다.",
    better: [
      "I landed the job!",
      "I just secured a job offer from my first choice.",
      "They offered me the position last week."
    ],
    keys: ["landed", "secured", "job offer", "position"],
    avoid: ["got"],
    gloss: "landed 따냈다 · secured 확보했다 · job offer 채용 제안 · position 직책"
  },
  {
    id: "u-022",
    plain: "We need to make a plan.",
    ko: "make a plan 대신 map out, put together로 구체적인 동작을 보여 준다.",
    better: [
      "We need to map out a plan before Monday.",
      "Let's put together a clear plan for the launch."
    ],
    keys: ["map out", "put together", "draw up", "outline"],
    avoid: ["make"],
    gloss: "map out 세밀하게 짜다 · put together 짜 맞추다 · draw up 작성하다 · outline 개요를 잡다"
  },
  {
    id: "u-023",
    plain: "I'll do the presentation.",
    ko: "do 대신 deliver, lead로 역할을 분명히 한다.",
    better: [
      "I'll deliver the presentation on Friday.",
      "I'm happy to lead the presentation."
    ],
    keys: ["deliver", "lead", "handle", "present"],
    avoid: ["do"],
    gloss: "deliver 발표하다 · lead 이끌다 · handle 맡다 · present 발표하다"
  },
  {
    id: "u-024",
    plain: "The project went bad.",
    ko: "went bad 대신 어떻게 잘못됐는지 보여 주는 동사를 쓴다.",
    better: [
      "The project fell apart halfway through.",
      "The project stalled when we lost our main client."
    ],
    keys: ["fell apart", "stalled", "failed", "collapsed"],
    avoid: ["bad"],
    gloss: "fell apart 무너졌다 · stalled 멈춰 섰다 · failed 실패했다 · collapsed 붕괴했다"
  },
  // ---------- 군더더기 (I think maybe, kind of) ----------
  {
    id: "u-025",
    plain: "I think maybe we should kind of change the plan.",
    ko: "I think maybe, kind of를 걷어 내고 제안을 바로 말한다.",
    better: [
      "I suggest we change the plan.",
      "I'd recommend adjusting the plan."
    ],
    keys: ["suggest", "recommend", "adjusting", "adjust"],
    avoid: ["i think", "maybe", "kind of"],
    gloss: "suggest 제안하다 · recommend 권하다 · adjust 조정하다"
  },
  {
    id: "u-026",
    plain: "It's sort of like a really important issue.",
    ko: "sort of like + really 대신 정확한 형용사 하나로 무게를 싣는다.",
    better: [
      "It's a critical issue.",
      "This is a pressing issue that we need to deal with this week."
    ],
    keys: ["critical", "pressing", "urgent", "serious"],
    avoid: ["sort of", "like", "really"],
    gloss: "critical 결정적인 · pressing 시급한 · urgent 긴급한 · serious 심각한"
  },
  {
    id: "u-027",
    plain: "I just wanted to maybe ask if you could possibly help me.",
    ko: "just, maybe, possibly를 겹치지 말고 공손한 요청 한 문장으로.",
    better: [
      "Could you help me with this?",
      "Would you mind giving me a hand?"
    ],
    keys: ["could you", "would you", "mind", "hand"],
    avoid: ["just", "maybe", "possibly"],
    gloss: "could you ~해 줄 수 있어요? · would you mind ~해도 괜찮을까요? · give me a hand 도와주다"
  },
  {
    id: "u-028",
    plain: "Basically, like, the results were kind of okay.",
    ko: "basically, like, kind of 없이 평가를 담은 형용사를 쓴다.",
    better: [
      "The results were solid.",
      "The results were decent, though not outstanding."
    ],
    keys: ["solid", "decent", "reasonable", "outstanding"],
    avoid: ["basically", "like", "kind of", "okay"],
    gloss: "solid 탄탄한 · decent 괜찮은 · reasonable 무난한 · outstanding 뛰어난"
  },
  {
    id: "u-029",
    plain: "I'm not sure, but I guess the deadline is maybe Friday.",
    ko: "불확실함은 한 번만, 확인하겠다는 말로 깔끔하게 표현한다.",
    better: [
      "I believe the deadline is Friday, but I'll double check.",
      "The deadline is Friday. Let me confirm that for you.",
      "I'll verify the date, but it should be Friday."
    ],
    keys: ["believe", "double check", "confirm", "verify"],
    avoid: ["not sure", "i guess", "maybe"],
    gloss: "believe 그렇게 알고 있다 · double check 다시 확인하다 · confirm 확인해 주다 · verify 사실 여부를 확인하다"
  },
  {
    id: "u-030",
    plain: "It was, you know, kind of a big deal for us.",
    ko: "you know, kind of 대신 의미가 분명한 명사를 쓴다.",
    better: [
      "It was a major milestone for us.",
      "It was a real turning point for our team.",
      "Winning that contract was a game changer for us."
    ],
    keys: ["milestone", "turning point", "breakthrough", "game changer"],
    avoid: ["you know", "kind of", "big deal"],
    gloss: "milestone 이정표 · turning point 전환점 · breakthrough 돌파구 · game changer 판도를 바꾼 일"
  },
  {
    id: "u-031",
    plain: "I kind of feel like the design is a bit too busy.",
    ko: "I kind of feel like 없이 문제와 해결책을 바로 말한다.",
    better: [
      "The design feels cluttered.",
      "The layout is too crowded, so let's simplify it."
    ],
    keys: ["cluttered", "crowded", "simplify", "cleaner"],
    avoid: ["kind of", "feel like", "busy"],
    gloss: "cluttered 어수선한 · crowded 빽빽한 · simplify 단순하게 하다 · cleaner 더 깔끔한"
  },
  {
    id: "u-032",
    plain: "Sorry, this is probably a stupid question, but how does it work?",
    ko: "질문 앞에 자신을 깎아내리는 말 없이 바로 묻는다.",
    better: [
      "Quick question: how does the approval process work?",
      "Could you walk me through the approval process?",
      "Could you clarify how the approval works?"
    ],
    keys: ["quick question", "walk me", "clarify", "walk through"],
    avoid: ["sorry", "probably", "stupid"],
    gloss: "quick question 간단한 질문 · walk me through 차근차근 설명해 주다 · clarify 명확히 해 주다"
  },
  // ---------- 장황·수동 문장 줄이기 ----------
  {
    id: "u-033",
    plain: "The decision was made by the manager to cancel the event.",
    ko: "수동태를 능동태로 바꿔 누가 무엇을 했는지 앞에 둔다.",
    better: [
      "The manager canceled the event.",
      "Our manager decided to call off the event."
    ],
    keys: ["canceled", "cancelled", "called off", "call off", "decided to"],
    avoid: ["was made", "made by"],
    gloss: "canceled 취소했다 · call off · called off 취소하다 · decided to ~하기로 했다"
  },
  {
    id: "u-034",
    plain: "Due to the fact that it was raining, we stayed inside.",
    ko: "due to the fact that 대신 because, since 한 단어로.",
    better: [
      "Because it was raining, we stayed inside.",
      "Since it was raining, we stayed in.",
      "Given the rain, we stayed inside."
    ],
    keys: ["because", "since", "given"],
    avoid: ["due to", "the fact"],
    gloss: "because ~때문에 · since ~이므로 · given ~을 고려해"
  },
  {
    id: "u-035",
    plain: "At this point in time, we are not able to offer a refund.",
    ko: "at this point in time, not able to를 짧은 표현으로 줄인다.",
    better: [
      "Right now, we can't offer a refund.",
      "We're unable to offer a refund at the moment.",
      "We currently can't offer refunds."
    ],
    keys: ["right now", "unable", "currently", "the moment"],
    avoid: ["this point", "not able"],
    gloss: "right now 지금은 · unable ~할 수 없는 · currently 현재 · at the moment 현재로서는"
  },
  {
    id: "u-036",
    plain: "In my personal opinion, I believe that this plan is good.",
    ko: "in my personal opinion + I believe 중복을 없애고 평가만 남긴다.",
    better: [
      "This plan is solid.",
      "I'm confident this plan will work.",
      "This is a sound, promising plan."
    ],
    keys: ["solid", "sound", "confident", "promising"],
    avoid: ["personal opinion", "i believe", "good"],
    gloss: "solid 탄탄한 · sound 타당한 · confident 확신하는 · promising 유망한"
  },
  {
    id: "u-037",
    plain: "Mistakes were made in the report.",
    ko: "주체를 숨기는 수동태 대신 책임 있는 능동태로.",
    better: [
      "I made a few mistakes in the report, and I'll fix them today.",
      "Our team overlooked a couple of errors in the report."
    ],
    keys: ["i made", "we made", "overlooked", "missed"],
    avoid: ["were made"],
    gloss: "I made · we made 내가(우리가) ~했다 · overlooked 간과했다 · missed 놓쳤다"
  },
  {
    id: "u-038",
    plain: "The meeting will be held for the purpose of discussing the budget.",
    ko: "will be held for the purpose of를 to + 동사로 줄인다.",
    better: [
      "We're meeting to discuss the budget.",
      "Let's meet to go over the budget."
    ],
    keys: ["meeting to", "meet to", "to discuss", "go over"],
    avoid: ["be held", "purpose of"],
    gloss: "meeting to ~하려고 모이다 · meet to ~하려고 만나다 · to discuss 논의하려고 · go over 검토하다"
  },
  {
    id: "u-039",
    plain: "It is important to note that the deadline has been changed.",
    ko: "It is important to note that 같은 머리말을 빼고 소식을 바로 전한다.",
    better: [
      "Heads up: the deadline has moved.",
      "The deadline has been pushed back to next Friday.",
      "They postponed the deadline by a week."
    ],
    keys: ["heads up", "moved", "pushed back", "postponed"],
    avoid: ["important to", "to note", "been changed"],
    gloss: "heads up 미리 알림 · moved 옮겨졌다 · pushed back 뒤로 미뤄졌다 · postponed 연기했다"
  },
  {
    id: "u-040",
    plain: "A review of the data was conducted by our team.",
    ko: "명사화(a review of)와 수동태를 동사 하나로 바꾼다.",
    better: [
      "Our team reviewed the data.",
      "We analyzed the data last week."
    ],
    keys: ["reviewed", "analyzed", "analysed", "went through", "examined"],
    avoid: ["was conducted", "conducted by"],
    gloss: "reviewed 검토했다 · analyzed 분석했다 · went through 살펴봤다 · examined 조사했다"
  },
  // ---------- 모호한 시간·수량 ----------
  {
    id: "u-041",
    plain: "A lot of people came to the event.",
    ko: "a lot of 대신 대략의 숫자나 장면으로 규모를 보여 준다.",
    better: [
      "Nearly two hundred people came to the event.",
      "We had a huge turnout; it was standing room only."
    ],
    keys: ["hundred", "turnout", "standing room", "packed"],
    avoid: ["a lot"],
    gloss: "hundred 백 · turnout 참석자 수 · standing room only 입석까지 꽉 찬 · packed 붐비는"
  },
  {
    id: "u-042",
    plain: "I'll send it soon.",
    ko: "soon 대신 언제까지인지 구체적인 시점을 말한다.",
    better: [
      "I'll send it by close of business today.",
      "You'll have it before lunch tomorrow.",
      "I'll send it this afternoon, right after the call."
    ],
    keys: ["close of", "before lunch", "this afternoon", "tomorrow morning"],
    avoid: ["soon"],
    gloss: "close of business 오늘 업무 종료 전 · before lunch 점심 전에 · this afternoon 오늘 오후 · tomorrow morning 내일 아침"
  },
  {
    id: "u-043",
    plain: "The project took a long time.",
    ko: "a long time 대신 기간을 수치나 구체적 표현으로.",
    better: [
      "The project took almost six months.",
      "It dragged on for most of the year.",
      "It ran two full quarters over schedule."
    ],
    keys: ["months", "weeks", "dragged on", "quarters"],
    avoid: ["long time"],
    gloss: "months 몇 달 · weeks 몇 주 · dragged on 질질 끌었다 · quarters 분기"
  },
  {
    id: "u-044",
    plain: "Prices went up a lot.",
    ko: "a lot 대신 얼마나 올랐는지 비교 기준을 준다.",
    better: [
      "Prices have nearly doubled since last year.",
      "Rent rose by about thirty percent.",
      "Grocery prices have skyrocketed this year."
    ],
    keys: ["doubled", "percent", "tripled", "skyrocketed"],
    avoid: ["went up", "a lot"],
    gloss: "doubled 두 배가 됐다 · percent 퍼센트 · tripled 세 배가 됐다 · skyrocketed 치솟았다"
  },
  {
    id: "u-045",
    plain: "I'll finish it later.",
    ko: "later 대신 마칠 시점을 못 박는다.",
    better: [
      "I'll finish it by Thursday afternoon.",
      "I'll wrap it up right after my next meeting.",
      "I'll have it done tonight before I log off."
    ],
    keys: ["thursday", "afternoon", "tomorrow", "tonight", "wrap it"],
    avoid: ["later"],
    gloss: "Thursday 목요일 · afternoon 오후 · tomorrow 내일 · tonight 오늘 밤 · wrap it up 마무리하다"
  },
  {
    id: "u-046",
    plain: "There were some problems with the order.",
    ko: "some problems 대신 무엇이 몇 개 잘못됐는지 말한다.",
    better: [
      "Two items were missing from the order.",
      "The order arrived late, and one box was damaged.",
      "They sent us the wrong item."
    ],
    keys: ["missing", "damaged", "arrived late", "wrong item"],
    avoid: ["problems"],
    gloss: "missing 빠진 · damaged 파손된 · arrived late 늦게 도착했다 · wrong item 다른 물건"
  },
  {
    id: "u-047",
    plain: "We need a few more days.",
    ko: "a few 대신 정확한 일수와 새 기한을 제시한다.",
    better: [
      "We need three more days, so until Wednesday.",
      "Could we move the deadline to Wednesday?",
      "Could we get a two-day extension?"
    ],
    keys: ["three more", "two more", "wednesday", "extension"],
    avoid: ["a few"],
    gloss: "three more days 사흘 더 · two more 이틀 더 · Wednesday 수요일 · extension 기한 연장"
  },
  {
    id: "u-048",
    plain: "Sometimes I go to the gym.",
    ko: "sometimes 대신 빈도를 구체적으로 말한다.",
    better: [
      "I go to the gym twice a week.",
      "I work out three times a week, usually in the morning.",
      "I hit the gym every weekday before work."
    ],
    keys: ["twice", "three times", "once a", "every weekday"],
    avoid: ["sometimes"],
    gloss: "twice a week 일주일에 두 번 · three times 세 번 · once a ~에 한 번 · every weekday 평일마다"
  },
  // ---------- 연결어 ----------
  {
    id: "u-049",
    plain: "It rained, and then the event was canceled.",
    ko: "and then 대신 원인과 결과가 보이는 연결어를 쓴다.",
    better: [
      "The heavy rain led to the event being canceled.",
      "Heavy rain forced us to cancel the event.",
      "It poured all morning, which meant the event was called off."
    ],
    keys: ["forced", "which meant", "consequently", "led to"],
    avoid: ["and then"],
    gloss: "forced ~하게 만들었다 · which meant 그 결과 ~였다 · consequently 따라서 · led to ~로 이어졌다"
  },
  {
    id: "u-050",
    plain: "The app was slow, and then users left.",
    ko: "and then 대신 consequently, dropping off처럼 인과와 결과가 보이는 말을 쓴다.",
    better: [
      "The app was slow; consequently, many users abandoned it.",
      "Because the app was so slow, users started dropping off.",
      "The slow loading times led to a spike in churn."
    ],
    keys: ["consequently", "abandoned", "dropping off", "churn"],
    avoid: ["and then"],
    gloss: "consequently 따라서 · abandoned 떠나 버렸다 · dropping off 이탈하다 · churn 이탈(률)"
  },
  {
    id: "u-051",
    plain: "I like my job. But it's stressful.",
    ko: "끊긴 두 문장을 although, even though, that said로 묶는다.",
    better: [
      "I enjoy my job, although it can be stressful.",
      "Even though I love my work, it does get stressful at times.",
      "I love my job. That said, it can be stressful."
    ],
    keys: ["although", "even though", "that said", "despite"],
    avoid: ["but"],
    gloss: "although 비록 ~지만 · even though ~인데도 · that said 그렇긴 해도 · despite ~에도 불구하고"
  },
  {
    id: "u-052",
    plain: "And also, the price is too high.",
    ko: "and also 대신 덧붙임을 알리는 연결어를 쓴다.",
    better: [
      "On top of that, the price is too high.",
      "Besides, the price is well above our budget.",
      "In addition, the price is higher than we expected."
    ],
    keys: ["on top", "besides", "in addition", "moreover"],
    avoid: ["and also"],
    gloss: "on top of that 게다가 · besides 그 밖에 · in addition 덧붙여 · moreover 더욱이"
  },
  {
    id: "u-053",
    plain: "First we did this, and then we did that, and then it worked.",
    ko: "and then 반복 대신 순서를 알리는 연결어를 바꿔 가며 쓴다.",
    better: [
      "First, we tested the idea; after that, we refined it, and eventually it worked.",
      "We started with a small test, refined the design, and finally got it working."
    ],
    keys: ["after that", "eventually", "finally", "subsequently"],
    avoid: ["and then", "did this", "did that"],
    gloss: "after that 그다음에 · eventually 결국 · finally 마침내 · subsequently 그 후에"
  },
  {
    id: "u-054",
    plain: "Many students work. Like, my friend works at a cafe.",
    ko: "like 대신 for instance, for example로 예시를 연결한다.",
    better: [
      "Many students work part-time; for instance, my friend works at a cafe.",
      "Take my friend, for example: she works at a cafe three nights a week."
    ],
    keys: ["for instance", "for example", "such as"],
    avoid: ["like"],
    gloss: "for instance 예를 들어 · for example 예컨대 · such as ~와 같은"
  },
  {
    id: "u-055",
    plain: "He studied hard, but he failed.",
    ko: "but 대신 despite, even so로 반전을 또렷하게.",
    better: [
      "Despite studying hard, he failed the exam.",
      "He studied hard. Even so, he didn't pass."
    ],
    keys: ["despite", "even so", "nevertheless", "in spite"],
    avoid: ["but"],
    gloss: "despite ~에도 불구하고 · even so 그렇다 해도 · nevertheless 그럼에도 · in spite of ~에도"
  },
  {
    id: "u-056",
    plain: "So, in conclusion, um, that's all.",
    ko: "흐지부지 끝내지 말고 요약 연결어로 핵심을 한 번 더 말한다.",
    better: [
      "To sum up, we need more time and a clearer budget.",
      "In short, the idea works, but we need more support.",
      "Overall, the pilot was a success."
    ],
    keys: ["to sum", "in short", "overall", "bottom line"],
    avoid: ["thats all", "um"],
    gloss: "to sum up 요약하면 · in short 요컨대 · overall 전반적으로 · bottom line 결론은"
  },
  // ---------- 의견 표현 ----------
  {
    id: "u-057",
    plain: "I think this is a good idea.",
    ko: "I think 대신 확신의 정도가 드러나는 표현을 쓴다.",
    better: [
      "I'm convinced this is the right move.",
      "My take is that this idea is worth trying."
    ],
    keys: ["convinced", "my take", "right move", "worth trying"],
    avoid: ["i think", "good idea"],
    gloss: "convinced 확신하는 · my take 내 견해 · right move 옳은 선택 · worth trying 해 볼 만한"
  },
  {
    id: "u-058",
    plain: "I think the price is too high.",
    ko: "I think 대신 관점을 밝히는 표현으로 시작한다.",
    better: [
      "In my view, the price is too high for what we get.",
      "From where I stand, the price is hard to justify."
    ],
    keys: ["my view", "i stand", "justify", "overpriced"],
    avoid: ["i think"],
    gloss: "in my view 내가 보기에 · from where I stand 내 입장에서는 · justify 정당화하다 · overpriced 너무 비싼"
  },
  {
    id: "u-059",
    plain: "I don't know, maybe it's okay.",
    ko: "애매한 I don't know 대신 양면을 인정하고 기울어진 쪽을 말한다.",
    better: [
      "I have mixed feelings about it.",
      "I can see both sides, but I lean toward yes."
    ],
    keys: ["mixed feelings", "both sides", "lean toward", "lean towards"],
    avoid: ["dont know", "maybe", "okay"],
    gloss: "mixed feelings 복잡한 심정 · both sides 양쪽 입장 · lean toward ~쪽으로 기울다"
  },
  {
    id: "u-060",
    plain: "I think that's not a good idea.",
    ko: "반대 의견을 reservations, concerns로 정중하면서도 분명하게.",
    better: [
      "I have some reservations about that.",
      "I see some real risks with that approach."
    ],
    keys: ["reservations", "risks", "concerns", "doubts"],
    avoid: ["i think", "good idea"],
    gloss: "reservations 의구심 · risks 위험 요소 · concerns 우려 · doubts 의문"
  },
  {
    id: "u-061",
    plain: "I really like this design.",
    ko: "really like 대신 무엇이 마음에 드는지 드러나는 표현을 쓴다.",
    better: [
      "I'm a big fan of this design.",
      "This design really stands out to me.",
      "I love how clean this design is."
    ],
    keys: ["big fan", "stands out", "love how", "appeals"],
    avoid: ["really like"],
    gloss: "big fan 열렬한 팬 · stands out 눈에 띈다 · love how ~한 점이 좋다 · appeals 마음을 끈다"
  },
  {
    id: "u-062",
    plain: "I think we should hire more people.",
    ko: "I think we should 대신 근거와 확신이 담긴 표현으로.",
    better: [
      "I strongly believe we need to expand the team.",
      "If you ask me, hiring two more engineers would pay off."
    ],
    keys: ["strongly", "ask me", "expand", "pay off"],
    avoid: ["i think", "more people"],
    gloss: "strongly believe 강하게 믿다 · if you ask me 내 생각을 말하자면 · expand 확장하다 · pay off 성과를 내다"
  },
  {
    id: "u-063",
    plain: "It's good and bad.",
    ko: "good and bad 대신 장단점을 가리키는 표현을 쓴다.",
    better: [
      "It has its pros and cons.",
      "There are clear benefits, but also some drawbacks.",
      "It's a trade-off."
    ],
    keys: ["pros", "cons", "drawbacks", "benefits", "tradeoff", "trade off"],
    avoid: ["good", "bad"],
    gloss: "pros and cons 장단점 · drawbacks 단점 · benefits 이점 · trade-off 득실 관계"
  },
  {
    id: "u-064",
    plain: "I think it's important.",
    ko: "I think it's important 대신 중요도를 높여 주는 표현을 쓴다.",
    better: [
      "It's absolutely essential.",
      "I would argue that it's our top priority."
    ],
    keys: ["essential", "would argue", "top priority", "crucial"],
    avoid: ["i think", "important"],
    gloss: "essential 필수적인 · I would argue ~라고 주장하고 싶다 · top priority 최우선 과제 · crucial 결정적인"
  },
  // ---------- 동의·반대 ----------
  {
    id: "u-065",
    plain: "Yes, I agree.",
    ko: "단순한 동의를 강도 있는 표현으로 바꾼다.",
    better: [
      "Absolutely, I couldn't agree more.",
      "That's exactly how I see it.",
      "You're spot on."
    ],
    keys: ["absolutely", "agree more", "exactly", "spot on"],
    avoid: ["yes"],
    gloss: "absolutely 전적으로 · couldn't agree more 더할 나위 없이 동의한다 · exactly 바로 그거다 · spot on 정확하다"
  },
  {
    id: "u-066",
    plain: "No, I don't agree.",
    ko: "직설적인 반대 대신 다른 관점을 제시하는 표현으로.",
    better: [
      "I see it a bit differently.",
      "With respect, I think there's another way to look at it.",
      "I'd like to push back on that a little."
    ],
    keys: ["differently", "another way", "respect", "push back"],
    avoid: ["dont agree"],
    gloss: "see it differently 다르게 본다 · another way 다른 방식 · with respect 외람되지만 · push back 반론을 제기하다"
  },
  {
    id: "u-067",
    plain: "You're wrong.",
    ko: "상대를 지적하는 대신 사실 확인을 제안한다.",
    better: [
      "I think there might be a misunderstanding.",
      "I'm not sure the numbers support that.",
      "Could we double check those figures?"
    ],
    keys: ["misunderstanding", "support that", "double check", "figures"],
    avoid: ["wrong"],
    gloss: "misunderstanding 오해 · support that 그것을 뒷받침하다 · double check 재확인하다 · figures 수치"
  },
  {
    id: "u-068",
    plain: "Yes, but...",
    ko: "Yes, but 대신 상대 의견을 인정한 뒤 새 고려 사항을 더한다.",
    better: [
      "That's a fair point, but we also need to consider the cost.",
      "That's a good point, although I see one risk.",
      "That's a valid point; however, the budget is tight."
    ],
    keys: ["fair point", "good point", "valid point", "consider"],
    avoid: ["yes but"],
    gloss: "fair point 일리 있는 말 · good point 좋은 지적 · valid point 타당한 지적 · consider 고려하다"
  },
  {
    id: "u-069",
    plain: "Maybe you're right.",
    ko: "머뭇거리는 maybe 대신 상대 논리를 분명히 인정한다.",
    better: [
      "You have a point there.",
      "That's a good argument. I hadn't thought of that.",
      "Fair enough, that makes sense."
    ],
    keys: ["point there", "good argument", "hadnt thought", "fair enough"],
    avoid: ["maybe"],
    gloss: "you have a point there 일리가 있다 · good argument 좋은 논거 · hadn't thought of 미처 생각 못 했다 · fair enough 그럴 만하다"
  },
  {
    id: "u-070",
    plain: "I agree a little.",
    ko: "a little 대신 부분 동의를 정확히 표현한다.",
    better: [
      "I partly agree with you.",
      "I agree with the first part, but not the second.",
      "To some extent, I agree."
    ],
    keys: ["partly", "partially", "first part", "some extent"],
    avoid: ["a little"],
    gloss: "partly 부분적으로 · partially 일부 · first part 앞부분 · to some extent 어느 정도는"
  },
  {
    id: "u-071",
    plain: "That's impossible.",
    ko: "단정 대신 현실적 제약을 근거로 우려를 표한다.",
    better: [
      "That sounds ambitious given our timeline.",
      "I'm not sure that's realistic with our current budget.",
      "I doubt that's feasible with only two people."
    ],
    keys: ["ambitious", "realistic", "feasible", "stretch"],
    avoid: ["impossible"],
    gloss: "ambitious 야심 찬 · realistic 현실적인 · feasible 실현 가능한 · a stretch 무리한 목표"
  },
  {
    id: "u-072",
    plain: "Me too.",
    ko: "Me too 대신 앞사람 의견에 힘을 보태는 표현을 쓴다.",
    better: [
      "I share that view.",
      "I'd echo what was just said.",
      "I second that."
    ],
    keys: ["share that", "echo", "second that", "same page"],
    avoid: ["me too"],
    gloss: "share that view 같은 생각이다 · echo 같은 말을 되풀이하다 · second that 찬성하다 · same page 같은 생각"
  },
  // ---------- 회의 표현 ----------
  {
    id: "u-073",
    plain: "Let's start.",
    ko: "회의를 여는 자연스러운 표현을 쓴다.",
    better: [
      "Shall we get started?",
      "Let's kick things off with a quick update.",
      "Let's dive in."
    ],
    keys: ["get started", "kick things", "kick off", "dive in"],
    avoid: ["lets start"],
    gloss: "get started 시작하다 · kick things off 포문을 열다 · kick off 시작하다 · dive in 바로 본론에 들어가다"
  },
  {
    id: "u-074",
    plain: "What do you think?",
    ko: "막연한 질문 대신 의견을 구체적으로 청한다.",
    better: [
      "I'd love to hear your thoughts.",
      "Does anyone see it from a different perspective?",
      "Would anyone like to weigh in?"
    ],
    keys: ["your thoughts", "perspective", "weigh in", "input"],
    avoid: ["you think"],
    gloss: "your thoughts 의견 · perspective 관점 · weigh in 의견을 보태다 · input 의견"
  },
  {
    id: "u-075",
    plain: "Let's talk about it later.",
    ko: "논의를 미룰 때 쓰는 회의 표현을 쓴다.",
    better: [
      "Let's take this offline.",
      "Can we park this for now and come back to it?",
      "Let's circle back to this next week."
    ],
    keys: ["offline", "park this", "come back", "circle back"],
    avoid: ["talk about", "later"],
    gloss: "take this offline 따로 이야기하다 · park 잠시 보류하다 · come back to 다시 다루다 · circle back 나중에 다시 논의하다"
  },
  {
    id: "u-076",
    plain: "I didn't hear you.",
    ko: "다시 말해 달라고 정중하게 부탁한다.",
    better: [
      "Sorry, could you repeat that?",
      "You cut out for a second. Could you say that again?",
      "Sorry, I didn't quite catch that."
    ],
    keys: ["repeat", "cut out", "catch that", "breaking up"],
    avoid: ["didnt hear"],
    gloss: "repeat 반복하다 · cut out 소리가 끊기다 · catch that 알아듣다 · breaking up 소리가 끊겨 들리다"
  },
  {
    id: "u-077",
    plain: "So what do we do now?",
    ko: "다음 단계를 정리하는 회의 표현을 쓴다.",
    better: [
      "So, what are the next steps?",
      "Let's agree on action items before we wrap up."
    ],
    keys: ["next steps", "action items", "wrap up", "agree on"],
    avoid: ["do now"],
    gloss: "next steps 다음 단계 · action items 실행 과제 · wrap up 마무리하다 · agree on 합의하다"
  },
  {
    id: "u-078",
    plain: "I want to say something.",
    ko: "대화에 끼어들 때 쓰는 부드러운 표현을 쓴다.",
    better: [
      "Can I jump in here?",
      "Could I chime in for a second?",
      "If I could build on that point quickly."
    ],
    keys: ["jump in", "chime in", "build on", "quick point"],
    avoid: ["say something"],
    gloss: "jump in 끼어들다 · chime in 한마디 거들다 · build on ~에 덧붙여 발전시키다 · quick point 짧은 의견"
  },
  {
    id: "u-079",
    plain: "We have no time.",
    ko: "시간 부족을 알리고 진행을 이끄는 표현을 쓴다.",
    better: [
      "We're running short on time.",
      "In the interest of time, let's move on to the next item.",
      "We're a bit tight on time, so let's keep this brief."
    ],
    keys: ["running short", "short on", "interest of", "tight on"],
    avoid: ["no time"],
    gloss: "running short on time 시간이 빠듯하다 · in the interest of time 시간 관계상 · tight on time 시간이 촉박하다"
  },
  {
    id: "u-080",
    plain: "That's all.",
    ko: "발표나 보고를 마무리하는 표현을 쓴다.",
    better: [
      "That covers everything on my end.",
      "That's it from me. Any questions?"
    ],
    keys: ["covers everything", "my end", "any questions"],
    avoid: ["thats all"],
    gloss: "covers everything 다 다뤘다 · on my end 제 쪽에서는 · any questions 질문 있나요"
  }
];
