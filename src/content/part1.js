/* 하루 수리통계 — 커리큘럼 1부 (Unit 1~4)
 * 작성 규칙
 *  - 수식: 인라인 $...$, 디스플레이 $$...$$ (MathJax)
 *  - quiz.choices[0] 이 정답 (화면에서는 섞어서 보여줌)
 *  - String.raw 안에서는 "$" 바로 뒤에 "{" 를 쓰지 말 것 (템플릿 치환과 충돌)
 */
(function () {
  const r = String.raw;

  window.STAT_UNITS = [
    { id: 1, title: '확률의 언어', blurb: '사건, 조건부확률, 베이즈' },
    { id: 2, title: '확률변수', blurb: '분포함수, 기댓값, 분산, MGF' },
    { id: 3, title: '주요 분포', blurb: '이항부터 정규까지' },
    { id: 4, title: '여러 확률변수', blurb: '결합분포, 공분산, 변수변환' },
    { id: 5, title: '표본분포와 극한정리', blurb: '큰 수의 법칙, 중심극한정리' },
    { id: 6, title: '추정', blurb: '불편성, MLE, 충분성, 신뢰구간' },
    { id: 7, title: '가설검정', blurb: '오류, p-값, 가능도비, 베이즈' },
  ];

  window.STAT_LESSONS = (window.STAT_LESSONS || []).concat([
    /* ───────────── Unit 1. 확률의 언어 ───────────── */
    {
      id: 1, unit: 1, title: '표본공간과 확률의 공리',
      hook: '확률은 사건에 0과 1 사이의 숫자를 붙이는 규칙이고, 그 규칙은 딱 세 줄이다.',
      body: [
        r`실험에서 나올 수 있는 모든 결과의 집합을 <b>표본공간</b> $S$, 그 부분집합을 <b>사건</b>이라 한다. 주사위 한 번이면 $S=\{1,2,3,4,5,6\}$이고, "짝수가 나온다"는 사건은 $A=\{2,4,6\}$이다.`,
        r`콜모고로프의 공리는 세 가지뿐이다. ① $P(A)\ge 0$ ② $P(S)=1$ ③ 서로소(배반)인 사건들의 합집합 확률은 각 확률의 합이다.`,
        r`나머지 성질은 전부 여기서 나온다. 예를 들어 $A$와 $A^c$는 서로소이고 합치면 $S$이므로 $P(A)+P(A^c)=1$이 바로 따라온다.`,
      ],
      formulas: [
        { label: '여사건', tex: r`P(A^c) = 1 - P(A)` },
        { label: '포함배제', tex: r`P(A\cup B) = P(A) + P(B) - P(A\cap B)` },
      ],
      example: {
        q: r`카드 52장에서 한 장을 뽑을 때, 하트이거나 그림카드(J, Q, K)일 확률은?`,
        a: r`하트 13장, 그림카드 12장, 둘 다인 카드(하트 J, Q, K) 3장. 포함배제로 $\frac{13}{52}+\frac{12}{52}-\frac{3}{52}=\frac{22}{52}=\frac{11}{26}$.`,
      },
      pitfall: r`<b>배반</b>과 <b>독립</b>은 다른 말이다. 확률이 0보다 큰 두 사건이 배반이면 하나가 일어나면 다른 하나는 절대 안 일어나므로 오히려 강하게 <i>종속</i>이다.`,
      quiz: [
        { q: r`$P(A)=0.5,\ P(B)=0.4,\ P(A\cap B)=0.2$일 때 $P(A\cup B)$는?`, choices: ['0.7', '0.9', '0.2', '0.5'], why: r`$0.5+0.4-0.2=0.7$. 겹치는 부분을 한 번 빼야 한다.` },
        { q: r`다음 중 확률의 <b>공리</b>가 아닌 것은?`, choices: [r`$P(A\cap B)=P(A)P(B)$`, r`$P(S)=1$`, r`$P(A)\ge 0$`, '서로소 사건 합집합의 확률 = 확률의 합'], why: r`$P(A\cap B)=P(A)P(B)$는 독립의 <i>정의</i>일 뿐, 모든 사건에 성립하는 공리가 아니다.` },
        { q: r`$P(A)>0,\ P(B)>0$이고 $A, B$가 배반이면 두 사건은?`, choices: ['독립이 아니다', '항상 독립이다', '독립일 수도 아닐 수도 있다', '정보가 부족하다'], why: r`배반이면 $P(A\cap B)=0$인데 $P(A)P(B)>0$이므로 독립 조건이 깨진다.` },
      ],
      cards: [
        { q: '확률의 세 공리는?', a: r`① $P(A)\ge0$ ② $P(S)=1$ ③ 서로소 사건들의 합집합 확률 = 확률들의 합` },
        { q: '포함배제 공식 (사건 두 개)', a: r`$P(A\cup B)=P(A)+P(B)-P(A\cap B)$` },
      ],
      summary: '공리 세 줄에서 여사건, 포함배제 같은 모든 계산 규칙이 나온다.',
    },
    {
      id: 2, unit: 1, title: '조건부확률과 독립',
      hook: '조건부확률은 새 정보를 듣고 표본공간을 줄인 뒤 다시 잰 확률이다.',
      body: [
        r`"$B$가 일어났다"는 걸 알면 이제 세상은 $B$ 안에서만 돌아간다. 그래서 $A$의 확률은 $B$ 안에서 $A$가 차지하는 비율이 된다.`,
        r`식을 뒤집으면 <b>곱셈법칙</b> $P(A\cap B)=P(A\mid B)P(B)$가 된다. 두 사건이 <b>독립</b>이라는 건 $B$를 알아도 $A$의 확률이 안 바뀐다는 뜻, 즉 $P(A\mid B)=P(A)$이다.`,
        r`표본공간을 겹치지 않는 조각 $B_1,\dots,B_k$로 나누면, 각 조각에서의 확률을 가중평균해 전체 확률을 구할 수 있다. 이것이 <b>전확률 공식</b>이다.`,
      ],
      formulas: [
        { label: '조건부확률', tex: r`P(A\mid B)=\frac{P(A\cap B)}{P(B)},\quad P(B)>0` },
        { label: '독립', tex: r`P(A\cap B)=P(A)\,P(B)` },
        { label: '전확률 공식', tex: r`P(A)=\sum_{i} P(A\mid B_i)\,P(B_i)` },
      ],
      example: {
        q: r`주사위 두 개를 던져 합이 8이었다. 첫 번째 주사위가 3일 확률은?`,
        a: r`합이 8인 경우는 $(2,6),(3,5),(4,4),(5,3),(6,2)$ 다섯 가지. 그중 첫 주사위가 3인 건 하나이므로 $1/5$. 조건 없이는 $1/6$이었으니 정보가 확률을 바꿨다.`,
      },
      pitfall: r`$P(A\mid B)$와 $P(B\mid A)$는 보통 다르다. "범인이면 현장에 있었을 확률"과 "현장에 있었으면 범인일 확률"은 완전히 다른 숫자다.`,
      quiz: [
        { q: r`$P(A\cap B)=0.12,\ P(B)=0.4$이면 $P(A\mid B)$는?`, choices: ['0.3', '0.048', '0.52', '0.12'], why: r`$0.12/0.4=0.3$.` },
        { q: r`$A, B$가 독립이고 $P(A)=0.5,\ P(B)=0.2$이면 $P(A\cap B)$는?`, choices: ['0.1', '0.7', '0.6', '0.25'], why: r`독립이면 곱한다: $0.5\times0.2=0.1$.` },
        { q: r`공장 A가 제품의 60%를 만들고 불량률 2%, 공장 B가 40%를 만들고 불량률 5%다. 전체 불량률은?`, choices: ['3.2%', '3.5%', '7%', '2.6%'], why: r`전확률: $0.6\times0.02+0.4\times0.05=0.012+0.020=0.032$.` },
      ],
      cards: [
        { q: '조건부확률의 정의', a: r`$P(A\mid B)=P(A\cap B)/P(B)$` },
        { q: '전확률 공식', a: r`분할 $B_1,\dots,B_k$에 대해 $P(A)=\sum_i P(A\mid B_i)P(B_i)$` },
      ],
      summary: '조건부확률은 표본공간을 줄여 다시 잰 비율이고, 독립은 정보가 확률을 바꾸지 않는 상태다.',
    },
    {
      id: 3, unit: 1, title: '베이즈 정리',
      hook: '베이즈 정리는 결과를 보고 원인을 거꾸로 추론하는 공식이다.',
      body: [
        r`우리가 아는 건 보통 "원인 $\to$ 결과" 방향의 확률 $P(A\mid B_j)$다(병이 있으면 양성이 나올 확률). 궁금한 건 반대 방향 $P(B_j\mid A)$다(양성이면 병이 있을 확률).`,
        r`조건부확률 정의와 전확률 공식을 합치면 방향을 뒤집을 수 있다. 분자는 "원인 $B_j$가 있고 결과 $A$가 나올 확률", 분모는 "결과 $A$가 나올 전체 확률"이다.`,
        r`용어: $P(B_j)$는 <b>사전확률</b>, $P(A\mid B_j)$는 <b>가능도</b>, $P(B_j\mid A)$는 <b>사후확률</b>. 이 세 단어는 마지막 레슨의 베이즈 추론에서 다시 만난다.`,
      ],
      formulas: [
        { label: '베이즈 정리', tex: r`P(B_j\mid A)=\frac{P(A\mid B_j)\,P(B_j)}{\sum_i P(A\mid B_i)\,P(B_i)}` },
      ],
      example: {
        q: r`유병률 1%인 병이 있다. 검사는 환자의 99%를 양성으로, 건강한 사람의 5%를 잘못 양성으로 판정한다. 양성이 나왔을 때 실제로 병이 있을 확률은?`,
        a: r`분자 $0.99\times0.01=0.0099$. 분모 $0.0099+0.05\times0.99=0.0099+0.0495=0.0594$. 따라서 $0.0099/0.0594\approx0.167$, 약 17%. 검사가 정확해 보여도 병 자체가 드물면 양성의 대부분은 위양성이다.`,
      },
      pitfall: r`<b>기저율 무시</b>: 검사 정확도만 보고 사전확률(유병률)을 빼먹으면 사후확률을 크게 과대평가한다.`,
      quiz: [
        { q: r`앞 레슨의 공장 문제(A 60% 불량 2%, B 40% 불량 5%)에서, 불량품 하나를 집었을 때 그것이 B 공장 제품일 확률은?`, choices: ['0.625', '0.4', '0.05', '0.375'], why: r`$\frac{0.4\times0.05}{0.032}=\frac{0.020}{0.032}=0.625$. 불량이라는 정보 때문에 B일 확률이 40%에서 62.5%로 올랐다.` },
        { q: r`다른 조건이 같을 때 사전확률 $P(B)$가 커지면 사후확률 $P(B\mid A)$는?`, choices: ['커진다', '작아진다', '변하지 않는다', '알 수 없다'], why: r`$P(B\mid A)=\frac{P(A|B)P(B)}{P(A|B)P(B)+P(A|B^c)(1-P(B))}$는 $P(B)$에 대해 증가함수다.` },
        { q: '베이즈 정리의 분모가 하는 역할은?', choices: ['사후확률의 합이 1이 되도록 맞추는 정규화', '사전확률을 갱신하는 것', '가능도를 계산하는 것', '독립성을 확인하는 것'], why: r`분모는 $P(A)$, 즉 전확률이다. 모든 $j$에 대한 사후확률을 더하면 1이 되게 만든다.` },
      ],
      cards: [
        { q: '베이즈 정리', a: r`$P(B_j\mid A)=\dfrac{P(A\mid B_j)P(B_j)}{\sum_i P(A\mid B_i)P(B_i)}$` },
        { q: '사전확률 · 가능도 · 사후확률', a: r`사전 $P(B)$, 가능도 $P(A\mid B)$, 사후 $P(B\mid A)$. 사후 ∝ 가능도 × 사전` },
      ],
      summary: '사후확률은 가능도와 사전확률의 곱에 비례한다. 드문 원인은 강한 증거가 있어도 여전히 드물 수 있다.',
    },

    /* ───────────── Unit 2. 확률변수 ───────────── */
    {
      id: 4, unit: 2, title: '확률변수와 분포함수',
      hook: '확률변수는 결과를 숫자로 바꾸는 함수이고, CDF는 그 숫자가 x 이하일 확률이다.',
      body: [
        r`동전 세 번의 결과(HTH 등)를 "앞면 개수"라는 숫자로 바꾸는 것처럼, 확률변수 $X$는 표본공간에서 실수로 가는 함수다. 숫자가 되면 더하고 평균 내는 계산이 가능해진다.`,
        r`<b>이산형</b>은 확률질량함수(PMF) $p(x)=P(X=x)$로, <b>연속형</b>은 확률밀도함수(PDF) $f(x)$로 표현한다. 연속형은 넓이가 확률이다: $P(a\le X\le b)=\int_a^b f(x)\,dx$.`,
        r`둘을 하나로 묶는 게 <b>누적분포함수</b>(CDF) $F(x)=P(X\le x)$다. 비감소, 오른쪽 연속, $-\infty$에서 0, $+\infty$에서 1. 연속형이면 $f(x)=F'(x)$.`,
      ],
      formulas: [
        { label: 'CDF', tex: r`F(x)=P(X\le x)` },
        { label: '연속형', tex: r`P(a\le X\le b)=\int_a^b f(x)\,dx = F(b)-F(a)` },
      ],
      example: {
        q: r`$f(x)=2x$ ($0<x<1$)일 때 $P(X\le 1/2)$와 CDF는?`,
        a: r`$P(X\le 1/2)=\int_0^{1/2}2x\,dx=\left[x^2\right]_0^{1/2}=1/4$. CDF는 $0<x<1$에서 $F(x)=x^2$.`,
      },
      pitfall: r`PDF 값 자체는 확률이 아니다. $f(x)$는 1보다 클 수 있고, 연속형에서는 $P(X=a)=0$이다.`,
      quiz: [
        { q: r`$f(x)=cx^2$ ($0<x<3$)가 PDF가 되려면 $c$는?`, choices: ['1/9', '1/3', '1/27', '3'], why: r`$\int_0^3 cx^2\,dx=9c=1$이므로 $c=1/9$.` },
        { q: r`연속확률변수 $X$에 대해 $P(X=2)$는?`, choices: ['0', r`$f(2)$`, r`$F(2)$`, '알 수 없다'], why: r`한 점의 넓이는 0이다.` },
        { q: 'CDF의 성질이 <b>아닌</b> 것은?', choices: ['항상 연속함수다', '비감소한다', r`$x\to\infty$이면 1로 간다`, '오른쪽 연속이다'], why: '이산형의 CDF는 계단함수라 점프가 있다. 오른쪽 연속까지만 보장된다.' },
      ],
      cards: [
        { q: 'CDF의 네 가지 성질', a: r`비감소 · 오른쪽 연속 · $F(-\infty)=0$ · $F(\infty)=1$` },
        { q: 'PDF와 CDF의 관계', a: r`$F(x)=\int_{-\infty}^x f(t)\,dt$, $f(x)=F'(x)$` },
      ],
      summary: '이산은 PMF, 연속은 PDF, 둘 다 CDF로 통일된다. 연속형에서 확률은 넓이다.',
    },
    {
      id: 5, unit: 2, title: '기댓값',
      hook: '기댓값은 분포의 무게중심이다.',
      body: [
        r`각 값에 그 확률만큼 무게를 실어 평균 낸 것이 기댓값이다. 막대 위에 확률만큼 추를 올려놓으면 균형이 잡히는 지점이 $E[X]$다.`,
        r`$X$의 함수 $g(X)$의 기댓값은 $g(X)$의 분포를 새로 구할 필요 없이 $\sum g(x)p(x)$로 바로 계산한다(LOTUS, 무의식적 통계학자의 법칙).`,
        r`가장 강력한 성질은 <b>선형성</b>이다. $E[aX+b]=aE[X]+b$, 그리고 $E[X+Y]=E[X]+E[Y]$는 $X, Y$가 독립이 아니어도 언제나 성립한다.`,
      ],
      formulas: [
        { label: '정의', tex: r`E[X]=\sum_x x\,p(x)\quad\text{또는}\quad\int x\,f(x)\,dx` },
        { label: 'LOTUS', tex: r`E[g(X)]=\sum_x g(x)\,p(x)` },
        { label: '선형성', tex: r`E[aX+bY+c]=aE[X]+bE[Y]+c` },
      ],
      example: {
        q: r`(1) 공정한 주사위 (2) $f(x)=2x$ ($0<x<1$)의 기댓값은?`,
        a: r`(1) $\frac{1+2+\cdots+6}{6}=3.5$. (2) $\int_0^1 x\cdot2x\,dx=\frac{2}{3}$.`,
      },
      pitfall: r`일반적으로 $E[g(X)]\ne g(E[X])$이다. 특히 $E[X^2]\ne(E[X])^2$이고, 그 차이가 바로 다음 레슨의 분산이다.`,
      quiz: [
        { q: r`$E[X]=3$이면 $E[2X-1]$은?`, choices: ['5', '6', '3', '2'], why: r`$2\cdot3-1=5$.` },
        { q: r`$E[X+Y]=E[X]+E[Y]$가 성립하려면 필요한 조건은?`, choices: ['각 기댓값이 존재하기만 하면 된다', 'X, Y가 독립', 'X, Y가 같은 분포', 'X, Y가 정규분포'], why: '선형성은 독립과 무관하게 성립한다. 독립이 필요한 건 곱의 기댓값 $E[XY]=E[X]E[Y]$ 쪽이다.' },
        { q: r`$P(X=0)=P(X=2)=0.5$일 때 $E[X^2]$은?`, choices: ['2', '1', '4', '0.5'], why: r`$0^2\cdot0.5+2^2\cdot0.5=2$. 반면 $(E[X])^2=1$이다.` },
      ],
      cards: [
        { q: 'LOTUS란?', a: r`$E[g(X)]=\sum g(x)p(x)$ 또는 $\int g(x)f(x)dx$. $g(X)$의 분포를 따로 구할 필요 없음` },
        { q: '기댓값의 선형성에 독립이 필요한가?', a: r`아니다. $E[X+Y]=E[X]+E[Y]$는 항상 성립` },
      ],
      summary: '기댓값은 확률 가중 평균이고, 선형성은 독립 없이도 성립하는 가장 쓸모 있는 성질이다.',
    },
    {
      id: 6, unit: 2, title: '분산과 표준편차',
      hook: '분산은 평균에서 떨어진 거리를 제곱해서 평균 낸 값이다.',
      body: [
        r`평균 $\mu=E[X]$에서 얼마나 퍼져 있는지 재려면 거리 $X-\mu$를 봐야 하는데, 그냥 평균 내면 0이 된다. 그래서 제곱해서 평균 낸다. 단위를 원래대로 돌리려면 제곱근을 씌워 <b>표준편차</b> $\sigma$를 쓴다.`,
        r`계산할 땐 정의보다 <b>"제곱의 평균 − 평균의 제곱"</b> 공식이 훨씬 편하다.`,
        r`상수를 더하면 분포가 옮겨갈 뿐 퍼짐은 그대로고, $a$배하면 퍼짐은 $a^2$배가 된다. 독립인 두 변수의 합의 분산은 분산의 합이다.`,
      ],
      formulas: [
        { label: '계산 공식', tex: r`\operatorname{Var}(X)=E[X^2]-(E[X])^2` },
        { label: '선형변환', tex: r`\operatorname{Var}(aX+b)=a^2\operatorname{Var}(X)` },
        { label: '독립합', tex: r`\operatorname{Var}(X\pm Y)=\operatorname{Var}(X)+\operatorname{Var}(Y)` },
      ],
      example: {
        q: r`공정한 주사위의 분산은?`,
        a: r`$E[X^2]=\frac{1+4+9+16+25+36}{6}=\frac{91}{6}$, $(E[X])^2=\frac{49}{4}$. $\operatorname{Var}(X)=\frac{91}{6}-\frac{49}{4}=\frac{182-147}{12}=\frac{35}{12}\approx2.92$.`,
      },
      pitfall: r`독립일 때 $\operatorname{Var}(X-Y)$도 분산을 <b>더한다</b>. 빼는 게 아니다. 불확실한 것끼리 빼도 불확실성은 쌓인다.`,
      quiz: [
        { q: r`$\operatorname{Var}(X)=4$이면 $\operatorname{Var}(3X+5)$는?`, choices: ['36', '12', '17', '41'], why: r`$3^2\cdot4=36$. 더한 5는 퍼짐에 영향이 없다.` },
        { q: r`독립인 $X, Y$의 분산이 각각 2, 3이면 $\operatorname{Var}(X-Y)$는?`, choices: ['5', '−1', '1', '6'], why: r`$\operatorname{Var}(X)+(-1)^2\operatorname{Var}(Y)=5$.` },
        { q: r`$E[X]=2,\ E[X^2]=7$이면 $\operatorname{Var}(X)$는?`, choices: ['3', '5', '7', '11'], why: r`$7-2^2=3$.` },
      ],
      cards: [
        { q: '분산 계산 공식', a: r`$\operatorname{Var}(X)=E[X^2]-(E[X])^2$` },
        { q: r`$\operatorname{Var}(aX+b)$ = ?`, a: r`$a^2\operatorname{Var}(X)$` },
      ],
      summary: '분산은 제곱의 평균에서 평균의 제곱을 뺀 값이다. 상수배는 제곱으로, 독립합은 그대로 더해진다.',
    },
    {
      id: 7, unit: 2, title: '적률생성함수 (MGF)',
      hook: 'MGF는 분포의 모든 적률을 함수 하나에 담아둔 지문이다.',
      body: [
        r`$M_X(t)=E[e^{tX}]$를 테일러 전개하면 $1+tE[X]+\frac{t^2}{2!}E[X^2]+\cdots$가 된다. 그래서 $t=0$에서 $k$번 미분하면 $k$차 적률 $E[X^k]$가 튀어나온다.`,
        r`더 중요한 건 <b>유일성</b>이다. 두 확률변수의 MGF가 0 근방에서 같으면 분포도 같다. 그래서 "MGF를 계산해 보니 정규분포의 MGF 모양이네 → 정규분포다"라는 논증이 가능하다.`,
        r`독립인 변수의 합은 MGF의 <b>곱</b>이 된다. 합의 분포를 구할 때 적분(합성곱) 대신 곱셈만 하면 된다.`,
      ],
      formulas: [
        { label: '정의와 적률', tex: r`M_X(t)=E[e^{tX}],\qquad M_X^{(k)}(0)=E[X^k]` },
        { label: '독립합 · 선형변환', tex: r`M_{X+Y}(t)=M_X(t)M_Y(t),\qquad M_{aX+b}(t)=e^{bt}M_X(at)` },
        { label: '정규분포', tex: r`X\sim N(\mu,\sigma^2)\ \Rightarrow\ M_X(t)=e^{\mu t+\sigma^2t^2/2}` },
      ],
      example: {
        q: r`베르누이($p$)의 MGF와 평균은? 이항$(n,p)$의 MGF는?`,
        a: r`$M(t)=(1-p)e^{0}+pe^{t}=1-p+pe^t$, $M'(0)=p$. 이항은 독립 베르누이 $n$개의 합이므로 $(1-p+pe^t)^n$.`,
      },
      pitfall: r`모든 분포에 MGF가 있는 건 아니다. 코시분포처럼 꼬리가 두꺼우면 $E[e^{tX}]$가 $t\ne0$에서 무한대가 된다.`,
      quiz: [
        { q: r`$M_X(t)=e^{2t+3t^2}$이면 $\operatorname{Var}(X)$는?`, choices: ['6', '3', '2', '9'], why: r`정규 MGF $e^{\mu t+\sigma^2t^2/2}$와 비교하면 $\sigma^2/2=3$, 즉 $\sigma^2=6$.` },
        { q: r`$Y=aX+b$의 MGF는?`, choices: [r`$e^{bt}M_X(at)$`, r`$aM_X(t)+b$`, r`$M_X(at+b)$`, r`$e^{at}M_X(bt)$`], why: r`$E[e^{t(aX+b)}]=e^{bt}E[e^{(at)X}]$.` },
        { q: '독립인 $X, Y$에 대해 $M_{X+Y}(t)$는?', choices: [r`$M_X(t)M_Y(t)$`, r`$M_X(t)+M_Y(t)$`, r`$M_X(M_Y(t))$`, '독립만으로는 알 수 없다'], why: r`$E[e^{tX}e^{tY}]=E[e^{tX}]E[e^{tY}]$ (독립이라 곱이 분리됨).` },
      ],
      cards: [
        { q: 'MGF로 적률 구하기', a: r`$E[X^k]=M_X^{(k)}(0)$` },
        { q: '정규분포 MGF', a: r`$e^{\mu t+\sigma^2t^2/2}$` },
      ],
      summary: 'MGF를 미분하면 적률, MGF가 같으면 분포가 같고, 독립합은 MGF의 곱이다.',
    },

    /* ───────────── Unit 3. 주요 분포 ───────────── */
    {
      id: 8, unit: 3, title: '베르누이와 이항분포',
      hook: '이항분포는 성공확률 p인 독립 시행을 n번 했을 때의 성공 횟수다.',
      body: [
        r`한 번의 성공/실패를 1/0으로 나타낸 것이 <b>베르누이</b>($p$)다. 평균 $p$, 분산 $p(1-p)$.`,
        r`독립 베르누이를 $n$개 더하면 <b>이항</b>$(n,p)$이 된다. $k$번 성공하는 특정 순서의 확률은 $p^k(1-p)^{n-k}$이고, 그런 순서가 $\binom{n}{k}$가지다.`,
        r`평균과 분산은 베르누이 $n$개의 합이라는 사실만으로 바로 나온다: 평균 $np$, 분산 $np(1-p)$. 아래에서 $n$과 $p$를 움직여 모양을 확인해 보자.`,
      ],
      formulas: [
        { label: 'PMF', tex: r`P(X=k)=\binom{n}{k}p^k(1-p)^{n-k},\quad k=0,1,\dots,n` },
        { label: '평균 · 분산', tex: r`E[X]=np,\qquad \operatorname{Var}(X)=np(1-p)` },
      ],
      widget: 'binom',
      example: {
        q: r`공정한 동전을 10번 던져 앞면이 정확히 3번 나올 확률은?`,
        a: r`$\binom{10}{3}(1/2)^{10}=\frac{120}{1024}\approx0.117$.`,
      },
      pitfall: r`시행이 독립이고 $p$가 매번 같아야 이항이다. 52장에서 카드를 <b>비복원</b>으로 뽑으면 $p$가 매번 바뀌므로 초기하분포다.`,
      quiz: [
        { q: r`$X\sim B(20,\,0.3)$일 때 $\operatorname{Var}(X)$는?`, choices: ['4.2', '6', '0.21', '14'], why: r`$20\times0.3\times0.7=4.2$. (평균은 6)` },
        { q: r`독립인 $X\sim B(5,p),\ Y\sim B(7,p)$에 대해 $X+Y$의 분포는?`, choices: [r`$B(12,p)$`, r`$B(12,2p)$`, r`$B(35,p)$`, '이항분포가 아니다'], why: '베르누이 5개 + 7개 = 같은 $p$의 베르누이 12개. ($p$가 다르면 이항이 아니다.)' },
        { q: r`$X\sim B(3,\,1/2)$일 때 $P(X\ge1)$은?`, choices: ['7/8', '1/2', '3/8', '1/8'], why: r`여사건: $1-P(X=0)=1-(1/2)^3=7/8$.` },
      ],
      cards: [
        { q: '이항분포 PMF', a: r`$\binom{n}{k}p^k(1-p)^{n-k}$` },
        { q: '이항분포 평균 · 분산', a: r`$np$, $np(1-p)$` },
      ],
      summary: '이항은 독립 베르누이의 합이라서, 평균과 분산도 베르누이의 n배다.',
    },
    {
      id: 9, unit: 3, title: '포아송분포',
      hook: '포아송은 일정 구간에서 드물게 일어나는 사건의 개수다.',
      body: [
        r`한 시간에 걸려오는 전화 수, 한 페이지의 오타 수처럼 "기회는 엄청 많은데 각각은 드물게 일어나는" 사건의 개수를 센다. 모수는 평균 발생 횟수 $\lambda$ 하나뿐이다.`,
        r`이항$(n,p)$에서 $n\to\infty$, $p\to0$이면서 $np=\lambda$로 고정하면 포아송$(\lambda)$이 된다. 그래서 $n$이 크고 $p$가 작은 이항은 포아송으로 근사한다.`,
        r`포아송의 지문은 <b>평균 = 분산 = $\lambda$</b>다. 독립 포아송의 합은 다시 포아송이고 모수는 더해진다.`,
      ],
      formulas: [
        { label: 'PMF', tex: r`P(X=k)=\frac{e^{-\lambda}\lambda^k}{k!},\quad k=0,1,2,\dots` },
        { label: '평균 · 분산', tex: r`E[X]=\operatorname{Var}(X)=\lambda` },
        { label: '재생성', tex: r`X\sim\text{Poi}(\lambda_1),\ Y\sim\text{Poi}(\lambda_2)\ \text{독립}\Rightarrow X+Y\sim\text{Poi}(\lambda_1+\lambda_2)` },
      ],
      example: {
        q: r`콜센터에 시간당 평균 2통의 전화가 온다. 한 시간 동안 한 통도 안 올 확률은?`,
        a: r`$P(X=0)=e^{-2}\approx0.135$.`,
      },
      pitfall: r`실제 데이터에서 분산이 평균보다 훨씬 크면(과대산포) 포아송 가정이 틀렸을 가능성이 크다. 평균과 분산 비교가 1차 점검이다.`,
      quiz: [
        { q: r`$X\sim\text{Poi}(3)$일 때 $\operatorname{Var}(X)$는?`, choices: ['3', '9', r`$\sqrt3$`, '1/3'], why: '포아송은 평균과 분산이 같다.' },
        { q: r`독립인 $X\sim\text{Poi}(2),\ Y\sim\text{Poi}(3)$에 대해 $X+Y$는?`, choices: [r`$\text{Poi}(5)$`, r`$\text{Poi}(6)$`, r`$\text{Poi}(2.5)$`, '포아송이 아니다'], why: r`모수가 더해진다. MGF $e^{\lambda(e^t-1)}$를 곱해 보면 바로 확인된다.` },
        { q: r`$B(1000,\,0.002)$를 포아송으로 근사하면 $\lambda$는?`, choices: ['2', '0.002', '1000', '20'], why: r`$\lambda=np=2$.` },
      ],
      cards: [
        { q: '포아송 PMF', a: r`$e^{-\lambda}\lambda^k/k!$` },
        { q: '포아송의 평균과 분산', a: r`둘 다 $\lambda$` },
      ],
      summary: '포아송은 드문 사건의 개수이고, 평균과 분산이 같으며, 독립합의 모수는 더해진다.',
    },
    {
      id: 10, unit: 3, title: '기하분포와 무기억성',
      hook: '기하분포는 첫 성공이 나올 때까지 걸린 시행 횟수다.',
      body: [
        r`성공확률 $p$인 독립 시행을 반복해서 처음 성공이 $k$번째에 나오려면 앞의 $k-1$번은 실패여야 한다. 그래서 $P(X=k)=(1-p)^{k-1}p$.`,
        r`"$k$번 넘게 걸린다"는 건 처음 $k$번이 모두 실패라는 뜻이므로 $P(X>k)=(1-p)^k$. 이 식 하나로 많은 계산이 끝난다.`,
        r`<b>무기억성</b>: 이미 $m$번 실패했다는 사실은 앞으로의 대기에 아무 영향이 없다. 동전은 과거를 기억하지 않는다. 이산분포 중 이 성질을 가진 건 기하분포뿐이다.`,
      ],
      formulas: [
        { label: 'PMF와 꼬리', tex: r`P(X=k)=(1-p)^{k-1}p,\qquad P(X>k)=(1-p)^k` },
        { label: '평균 · 분산', tex: r`E[X]=\frac1p,\qquad \operatorname{Var}(X)=\frac{1-p}{p^2}` },
        { label: '무기억성', tex: r`P(X>m+n\mid X>m)=P(X>n)` },
      ],
      example: {
        q: r`주사위를 6이 나올 때까지 던진다. 평균 몇 번 던지게 될까? 4번 넘게 던져야 할 확률은?`,
        a: r`$E[X]=1/(1/6)=6$번. $P(X>4)=(5/6)^4\approx0.482$.`,
      },
      pitfall: r`교재에 따라 "성공 전까지의 <b>실패</b> 횟수"($Y=X-1$)로 정의하기도 한다. 그때 평균은 $(1-p)/p$다. 어느 정의인지 먼저 확인하자.`,
      quiz: [
        { q: r`$p=0.2$인 기하분포(시행 횟수)의 평균은?`, choices: ['5', '4', '0.2', '20'], why: r`$1/p=5$.` },
        { q: r`$p=1/2$일 때 $P(X>3)$은?`, choices: ['1/8', '1/16', '3/8', '7/8'], why: r`처음 3번 모두 실패: $(1/2)^3$.` },
        { q: '이산분포 중 무기억성을 가진 유일한 분포는?', choices: ['기하분포', '포아송분포', '이항분포', '균등분포'], why: '연속에서는 지수분포가 같은 역할을 한다. 다음 레슨에서 다룬다.' },
      ],
      cards: [
        { q: '기하분포 평균 (시행 횟수 정의)', a: r`$1/p$` },
        { q: '무기억성', a: r`$P(X>m+n\mid X>m)=P(X>n)$` },
      ],
      summary: '기하분포는 첫 성공까지의 대기이고, 꼬리확률은 (1−p)^k, 과거를 기억하지 않는다.',
    },
    {
      id: 11, unit: 3, title: '균등분포와 지수분포',
      hook: '지수분포는 연속 시간에서의 기다림이고, 기하분포처럼 과거를 잊는다.',
      body: [
        r`<b>균등분포</b> $U(a,b)$는 구간 안 어디든 똑같이 그럴듯한 분포다. 밀도는 $1/(b-a)$로 평평하고, 평균은 가운데 $\frac{a+b}{2}$.`,
        r`<b>지수분포</b> Exp($\lambda$)는 단위시간당 평균 $\lambda$번 일어나는 사건(포아송 과정)에서 다음 사건까지 기다리는 시간이다. 평균 대기시간은 $1/\lambda$.`,
        r`$P(X>x)=e^{-\lambda x}$이므로 무기억성 $P(X>s+t\mid X>s)=P(X>t)$가 성립한다. 연속분포 중 무기억성을 가진 건 지수분포뿐이다.`,
      ],
      formulas: [
        { label: '균등', tex: r`f(x)=\frac{1}{b-a},\quad E[X]=\frac{a+b}{2},\quad \operatorname{Var}(X)=\frac{(b-a)^2}{12}` },
        { label: '지수', tex: r`f(x)=\lambda e^{-\lambda x}\ (x>0),\quad E[X]=\frac1\lambda,\quad \operatorname{Var}(X)=\frac1{\lambda^2}` },
        { label: '꼬리확률', tex: r`P(X>x)=e^{-\lambda x}` },
      ],
      example: {
        q: r`버스가 평균 10분 간격으로 (포아송 과정으로) 온다. 20분 넘게 기다릴 확률은?`,
        a: r`$\lambda=1/10$. $P(X>20)=e^{-20/10}=e^{-2}\approx0.135$.`,
      },
      pitfall: r`지수분포를 율(rate) $\lambda$로 쓰는 교재와 평균 $\beta=1/\lambda$로 쓰는 교재가 있다. $f(x)=\frac1\beta e^{-x/\beta}$를 보면 평균이 $\beta$라는 뜻이다.`,
      quiz: [
        { q: r`$X\sim U(0,6)$의 분산은?`, choices: ['3', '6', '12', '36'], why: r`$6^2/12=3$.` },
        { q: r`$X\sim\text{Exp}(\lambda=2)$의 평균은?`, choices: ['0.5', '2', '4', '0.25'], why: r`$1/\lambda=1/2$.` },
        { q: '대기시간이 지수분포이고 이미 5분을 기다렸다. 앞으로 3분 넘게 더 기다릴 확률은?', choices: [r`$P(X>3)$`, r`$P(X>8)$`, r`$P(X>8)-P(X>5)$`, r`$P(X>5)$`], why: '무기억성 때문에 지금부터 새로 시작하는 것과 같다.' },
      ],
      cards: [
        { q: '균등분포 U(a,b)의 분산', a: r`$(b-a)^2/12$` },
        { q: '지수분포 Exp(λ)의 평균 · 분산 · 꼬리', a: r`$1/\lambda$, $1/\lambda^2$, $P(X>x)=e^{-\lambda x}$` },
      ],
      summary: '균등은 평평한 분포, 지수는 포아송 과정의 대기시간이며 무기억성을 가진 유일한 연속분포다.',
    },
    {
      id: 12, unit: 3, title: '감마분포와 베타분포',
      hook: '감마는 지수 대기시간을 여러 개 더한 것, 베타는 0과 1 사이 비율의 분포다.',
      body: [
        r`감마함수 $\Gamma(\alpha)=\int_0^\infty x^{\alpha-1}e^{-x}dx$는 팩토리얼의 연속판이다: $\Gamma(n)=(n-1)!$, $\Gamma(1/2)=\sqrt\pi$.`,
        r`<b>감마분포</b> Gamma($\alpha,\lambda$)는 모양 $\alpha$, 율 $\lambda$를 가진다. 독립 Exp($\lambda$) $n$개의 합은 Gamma($n,\lambda$), 즉 $n$번째 사건까지의 대기시간이다. 카이제곱분포 $\chi^2_k$도 Gamma($k/2,\,1/2$)인 감마의 특수한 경우다.`,
        r`<b>베타분포</b> Beta($a,b$)는 $(0,1)$ 위의 분포라 확률이나 비율을 모형화할 때 쓴다. $a=b=1$이면 균등분포. 마지막 레슨의 베이즈 추론에서 주인공으로 돌아온다.`,
      ],
      formulas: [
        { label: '감마 (율 λ)', tex: r`f(x)=\frac{\lambda^\alpha}{\Gamma(\alpha)}x^{\alpha-1}e^{-\lambda x},\quad E[X]=\frac\alpha\lambda,\quad\operatorname{Var}(X)=\frac{\alpha}{\lambda^2}` },
        { label: '베타', tex: r`f(x)=\frac{\Gamma(a+b)}{\Gamma(a)\Gamma(b)}x^{a-1}(1-x)^{b-1},\quad E[X]=\frac{a}{a+b}` },
      ],
      example: {
        q: r`독립인 Exp($\lambda=2$) 세 개의 합의 분포와 평균은?`,
        a: r`Gamma($3,\,2$). 평균은 $3/2=1.5$ (각 평균 $0.5$를 세 번 더한 것과 같다).`,
      },
      pitfall: r`감마분포도 율 $\lambda$ 대신 척도 $\beta=1/\lambda$로 쓰는 교재가 많다. 그때는 평균 $\alpha\beta$, 분산 $\alpha\beta^2$.`,
      quiz: [
        { q: r`$\Gamma(5)$의 값은?`, choices: ['24', '120', '5', '4'], why: r`$\Gamma(n)=(n-1)!$이므로 $4!=24$.` },
        { q: r`Gamma($\alpha=4$, 율 $\lambda=2$)의 평균은?`, choices: ['2', '8', '0.5', '1'], why: r`$\alpha/\lambda=4/2=2$.` },
        { q: r`Beta($2,3$)의 평균은?`, choices: ['0.4', '0.6', '2/3', '0.5'], why: r`$a/(a+b)=2/5$.` },
      ],
      cards: [
        { q: '감마분포 (모양 α, 율 λ) 평균 · 분산', a: r`$\alpha/\lambda$, $\alpha/\lambda^2$` },
        { q: '카이제곱과 감마의 관계', a: r`$\chi^2_k=\text{Gamma}(k/2,\ \text{율 }1/2)$` },
      ],
      summary: '감마는 지수의 합이자 카이제곱의 부모, 베타는 비율의 분포다.',
    },
    {
      id: 13, unit: 3, title: '정규분포',
      hook: '정규분포는 평균과 분산 두 숫자로 완전히 정해지는 종 모양 분포다.',
      body: [
        r`$N(\mu,\sigma^2)$은 $\mu$를 중심으로 좌우대칭이고, $\sigma$가 폭을 정한다. 어떤 정규분포든 <b>표준화</b> $Z=(X-\mu)/\sigma$를 하면 $N(0,1)$이 되므로 표준정규표 하나로 모든 확률을 구한다.`,
        r`외워 둘 숫자: $\pm1\sigma$ 안에 약 68%, $\pm2\sigma$ 안에 약 95%, $\pm3\sigma$ 안에 약 99.7%. 정확한 95% 지점은 $\pm1.96\sigma$다.`,
        r`독립 정규변수의 <b>선형결합도 정규</b>다. 평균은 선형으로, 분산은 계수의 제곱으로 합쳐진다. 이 성질 덕분에 표본평균의 분포가 깔끔하게 나온다.`,
      ],
      formulas: [
        { label: '밀도', tex: r`f(x)=\frac{1}{\sqrt{2\pi}\,\sigma}\exp\!\left(-\frac{(x-\mu)^2}{2\sigma^2}\right)` },
        { label: '표준화', tex: r`Z=\frac{X-\mu}{\sigma}\sim N(0,1)` },
        { label: '선형결합 (독립)', tex: r`aX+bY\sim N(a\mu_X+b\mu_Y,\ a^2\sigma_X^2+b^2\sigma_Y^2)` },
      ],
      example: {
        q: r`키가 $N(170,\,6^2)$를 따를 때 182cm보다 클 확률은?`,
        a: r`$Z=(182-170)/6=2$. $P(Z>2)\approx0.0228$, 약 2.3%.`,
      },
      pitfall: r`$N(\mu,\sigma^2)$의 두 번째 자리는 <b>분산</b>이다. $N(10,4)$의 표준편차는 2다. 소프트웨어(예: R의 <code>dnorm</code>)는 표준편차를 받는 경우가 많으니 주의.`,
      quiz: [
        { q: r`$X\sim N(10,4)$일 때 $P(X<14)$에 가장 가까운 값은?`, choices: ['0.977', '0.841', '0.5', '0.999'], why: r`$\sigma=2$이므로 $Z=(14-10)/2=2$, $\Phi(2)\approx0.977$.` },
        { q: r`독립인 $X\sim N(1,2),\ Y\sim N(3,5)$에 대해 $X+Y$는?`, choices: [r`$N(4,7)$`, r`$N(4,\sqrt7)$`, r`$N(4,3)$`, r`$N(2,7)$`], why: '평균끼리, 분산끼리 더한다.' },
        { q: '표준정규분포에서 가운데 95%를 감싸는 구간은?', choices: [r`$\pm1.96$`, r`$\pm1.645$`, r`$\pm2.576$`, r`$\pm1$`], why: '1.645는 한쪽 5%, 2.576은 가운데 99%다.' },
      ],
      cards: [
        { q: '68–95–99.7 규칙', a: r`$\pm1\sigma$: 68%, $\pm2\sigma$: 95%, $\pm3\sigma$: 99.7%` },
        { q: '독립 정규의 선형결합', a: r`$aX+bY\sim N(a\mu_X+b\mu_Y,\ a^2\sigma_X^2+b^2\sigma_Y^2)$` },
      ],
      summary: '정규는 표준화로 하나의 표에 모이고, 독립 정규의 선형결합은 다시 정규다.',
    },

    /* ───────────── Unit 4. 여러 확률변수 ───────────── */
    {
      id: 14, unit: 4, title: '결합분포와 주변분포',
      hook: '결합분포는 두 변수를 한 장의 지도로, 주변분포는 그 지도를 한쪽 축으로 접은 것이다.',
      body: [
        r`$(X,Y)$의 <b>결합밀도</b> $f(x,y)$는 평면 위의 확률 지형이다. 영역 $A$의 확률은 $\iint_A f(x,y)\,dx\,dy$.`,
        r`$X$만 보고 싶으면 $y$ 방향으로 전부 적분해 없앤다. 이게 <b>주변분포</b> $f_X(x)=\int f(x,y)\,dy$. 특정 $x$에서 $y$의 분포를 보려면 그 단면을 주변밀도로 나눈 <b>조건부분포</b> $f(y\mid x)=f(x,y)/f_X(x)$를 쓴다.`,
        r`<b>독립</b>은 결합밀도가 모든 점에서 주변밀도의 곱으로 쪼개진다는 뜻이다.`,
      ],
      formulas: [
        { label: '주변 · 조건부', tex: r`f_X(x)=\int f(x,y)\,dy,\qquad f(y\mid x)=\frac{f(x,y)}{f_X(x)}` },
        { label: '독립', tex: r`f(x,y)=f_X(x)\,f_Y(y)\quad\text{모든 }(x,y)` },
      ],
      example: {
        q: r`$f(x,y)=x+y$ ($0<x<1,\ 0<y<1$)일 때 $f_X(x)$는? $X, Y$는 독립인가?`,
        a: r`$f_X(x)=\int_0^1(x+y)\,dy=x+\tfrac12$. 대칭이라 $f_Y(y)=y+\tfrac12$. 곱 $(x+\tfrac12)(y+\tfrac12)\ne x+y$이므로 독립이 아니다.`,
      },
      pitfall: r`받침(밀도가 양수인 영역)이 직사각형이 아니면 독립일 수 없다. 예를 들어 $0<x<y<1$이면 $X$를 알면 $Y$의 범위가 바뀐다.`,
      quiz: [
        { q: r`$f(x,y)=6xy^2$ ($0<x,y<1$)일 때 $f_X(x)$는?`, choices: [r`$2x$`, r`$3y^2$`, r`$6x$`, r`$x$`], why: r`$\int_0^1 6xy^2\,dy=6x\cdot\frac13=2x$.` },
        { q: r`위의 $f(x,y)=6xy^2$에서 $X, Y$는 독립인가?`, choices: ['독립이다', '독립이 아니다', '알 수 없다', '상관계수를 봐야 안다'], why: r`$f_X(x)=2x$, $f_Y(y)=3y^2$이고 곱이 $6xy^2$이며 받침도 직사각형이다.` },
        { q: r`$f(x,y)=2$ ($0<x<y<1$)일 때 $X, Y$는?`, choices: ['독립이 아니다', '독립이다', '같은 분포를 따르는 독립변수다', '알 수 없다'], why: '받침이 삼각형이라 독립일 수 없다.' },
      ],
      cards: [
        { q: '주변밀도 구하는 법', a: r`다른 변수로 적분: $f_X(x)=\int f(x,y)\,dy$` },
        { q: '결합밀도로 독립 판정', a: r`모든 점에서 $f(x,y)=f_X(x)f_Y(y)$ (받침이 직사각형이어야 함)` },
      ],
      summary: '주변은 적분해서 없애고, 조건부는 나누고, 독립은 곱으로 쪼개진다.',
    },
    {
      id: 15, unit: 4, title: '공분산과 상관계수',
      hook: '공분산은 두 변수가 같이 움직이는 정도, 상관계수는 그것을 −1에서 1 사이로 맞춘 것이다.',
      body: [
        r`$X$가 평균보다 클 때 $Y$도 평균보다 크면 $(X-\mu_X)(Y-\mu_Y)$가 양수가 된다. 그 평균이 <b>공분산</b>이다. 계산은 "곱의 평균 − 평균의 곱".`,
        r`공분산은 단위에 따라 크기가 바뀌므로 표준편차로 나눠 <b>상관계수</b> $\rho$를 만든다. 항상 $-1\le\rho\le1$이고, $|\rho|=1$이면 완벽한 직선 관계다.`,
        r`공분산은 합의 분산에 끼어든다: $\operatorname{Var}(X+Y)=\operatorname{Var}X+\operatorname{Var}Y+2\operatorname{Cov}(X,Y)$. 독립이면 공분산이 0이라서 지난번 공식이 나왔던 것이다.`,
      ],
      formulas: [
        { label: '공분산', tex: r`\operatorname{Cov}(X,Y)=E[XY]-E[X]E[Y]` },
        { label: '상관계수', tex: r`\rho=\frac{\operatorname{Cov}(X,Y)}{\sigma_X\sigma_Y}\in[-1,1]` },
        { label: '합의 분산', tex: r`\operatorname{Var}(aX+bY)=a^2\sigma_X^2+b^2\sigma_Y^2+2ab\operatorname{Cov}(X,Y)` },
      ],
      example: {
        q: r`$X\sim U(-1,1)$, $Y=X^2$일 때 $\operatorname{Cov}(X,Y)$는?`,
        a: r`$E[X]=0$, $E[XY]=E[X^3]=0$ (대칭). 따라서 공분산 0. 그런데 $Y$는 $X$로 완전히 결정되므로 독립이 아니다.`,
      },
      pitfall: r`독립 $\Rightarrow$ 공분산 0. 하지만 공분산 0 $\not\Rightarrow$ 독립. 공분산은 <b>직선</b> 관계만 잡아낸다.`,
      quiz: [
        { q: r`$\operatorname{Var}X=4,\ \operatorname{Var}Y=9,\ \operatorname{Cov}(X,Y)=3$이면 $\rho$는?`, choices: ['0.5', '0.25', '1/12', '3'], why: r`$3/(2\cdot3)=0.5$.` },
        { q: r`같은 조건에서 $\operatorname{Var}(X+Y)$는?`, choices: ['19', '13', '16', '22'], why: r`$4+9+2\cdot3=19$.` },
        { q: r`$\operatorname{Cov}(2X,\,3Y+1)$은?`, choices: [r`$6\operatorname{Cov}(X,Y)$`, r`$6\operatorname{Cov}(X,Y)+1$`, r`$5\operatorname{Cov}(X,Y)$`, r`$36\operatorname{Cov}(X,Y)$`], why: '공분산은 각 자리에서 선형이고, 상수 이동은 무시된다.' },
      ],
      cards: [
        { q: '공분산 계산 공식', a: r`$E[XY]-E[X]E[Y]$` },
        { q: '공분산이 0이면 독립인가?', a: r`아니다. 예: $X\sim U(-1,1)$, $Y=X^2$` },
      ],
      summary: '공분산은 함께 움직이는 정도, 상관계수는 그 표준화. 공분산 0이 독립을 뜻하지는 않는다.',
    },
    {
      id: 16, unit: 4, title: '조건부기댓값',
      hook: 'E[Y|X]는 숫자가 아니라 X의 함수, 즉 또 하나의 확률변수다.',
      body: [
        r`$X=x$로 고정했을 때 $Y$의 평균 $E[Y\mid X=x]$는 $x$에 따라 달라지는 함수 $h(x)$다. 여기에 $x$ 대신 $X$를 넣은 $h(X)=E[Y\mid X]$는 확률변수가 된다.`,
        r`<b>반복기댓값의 법칙</b>: 그룹별 평균을 그룹 크기로 가중평균하면 전체 평균이 된다. $E[E[Y\mid X]]=E[Y]$.`,
        r`<b>전분산 공식</b>: 전체 퍼짐 = 그룹 <i>안</i> 퍼짐의 평균 + 그룹 평균<i>끼리의</i> 퍼짐. 분산분석(ANOVA)과 회귀의 $R^2$가 모두 이 분해에서 나온다.`,
      ],
      formulas: [
        { label: '반복기댓값', tex: r`E\big[E[Y\mid X]\big]=E[Y]` },
        { label: '전분산 공식', tex: r`\operatorname{Var}(Y)=E\big[\operatorname{Var}(Y\mid X)\big]+\operatorname{Var}\big(E[Y\mid X]\big)` },
      ],
      example: {
        q: r`가게의 하루 손님 수가 Poi(10)이고, 손님 한 명은 평균 2만 원을 쓴다(손님 수와 독립). 하루 매출 기댓값은?`,
        a: r`손님 수 $N$이 주어지면 매출 평균은 $2N$. 따라서 $E[\text{매출}]=E[2N]=2\times10=20$만 원.`,
      },
      pitfall: r`$E[Y\mid X]$를 그냥 숫자로 취급하면 반복기댓값을 쓸 수 없다. 늘 "무엇의 함수인가"를 의식하자.`,
      quiz: [
        { q: r`$E[Y\mid X]=2X$이고 $E[X]=3$이면 $E[Y]$는?`, choices: ['6', '3', '2', '5'], why: r`$E[2X]=6$.` },
        { q: r`$X\sim\text{Exp}(1)$이고 $Y\mid X\sim\text{Poi}(X)$일 때 $\operatorname{Var}(Y)$는?`, choices: ['2', '1', '0', '3'], why: r`$E[\operatorname{Var}(Y|X)]=E[X]=1$, $\operatorname{Var}(E[Y|X])=\operatorname{Var}(X)=1$. 합은 2.` },
        { q: r`$E[Y\mid X]$의 정체는?`, choices: [r`$X$의 함수인 확률변수`, '하나의 상수', r`$Y$의 함수`, r`$X$와 $Y$의 결합밀도`], why: r`$X$가 확률적이므로 $h(X)$도 확률적이다.` },
      ],
      cards: [
        { q: '반복기댓값의 법칙', a: r`$E[E[Y\mid X]]=E[Y]$` },
        { q: '전분산 공식', a: r`$\operatorname{Var}Y=E[\operatorname{Var}(Y|X)]+\operatorname{Var}(E[Y|X])$` },
      ],
      summary: '조건부기댓값은 X의 함수이고, 평균의 평균은 전체 평균, 분산은 안쪽과 바깥쪽으로 나뉜다.',
    },
    {
      id: 17, unit: 4, title: '변수변환',
      hook: 'Y = g(X)의 분포는 CDF를 거쳐 구하는 게 가장 안전하다.',
      body: [
        r`<b>CDF 방법</b>: $F_Y(y)=P(g(X)\le y)$를 $X$에 대한 사건으로 바꿔 계산한 뒤 미분한다. 어떤 $g$에도 통하는 만능 방법이다.`,
        r`$g$가 단조이면 공식으로 줄일 수 있다. 밀도는 "역함수 자리에 넣고, 역함수 도함수의 절댓값을 곱한다." 그 절댓값이 구간이 늘거나 줄어든 비율(야코비안)이다.`,
        r`<b>확률적분변환</b>: 연속형 $X$에 자기 CDF를 씌우면 $F_X(X)\sim U(0,1)$. 거꾸로 $U(0,1)$에 $F^{-1}$을 씌우면 원하는 분포의 난수를 만들 수 있다.`,
      ],
      formulas: [
        { label: '단조변환', tex: r`f_Y(y)=f_X\big(g^{-1}(y)\big)\left|\frac{d}{dy}g^{-1}(y)\right|` },
        { label: '확률적분변환', tex: r`F_X(X)\sim U(0,1)` },
      ],
      example: {
        q: r`$X\sim U(0,1)$, $Y=-\ln X$의 분포는?`,
        a: r`$y>0$에서 $F_Y(y)=P(-\ln X\le y)=P(X\ge e^{-y})=1-e^{-y}$. 이것은 Exp(1)의 CDF다.`,
      },
      pitfall: r`$g$가 단조가 아니면(예: $Y=X^2$, $X$가 음수도 가짐) 공식을 그대로 쓰면 안 된다. 역상이 여러 개이므로 CDF 방법으로 조각을 다 더해야 한다.`,
      quiz: [
        { q: r`$X\sim U(0,1)$, $Y=X^2$의 밀도 $f_Y(y)$ ($0<y<1$)는?`, choices: [r`$\frac{1}{2\sqrt y}$`, r`$2y$`, r`$\sqrt y$`, '1'], why: r`$F_Y(y)=P(X\le\sqrt y)=\sqrt y$, 미분하면 $\frac{1}{2\sqrt y}$.` },
        { q: r`$Z\sim N(0,1)$일 때 $Z^2$의 분포는?`, choices: [r`$\chi^2_1$`, r`$N(0,1)$`, r`$\text{Exp}(1)$`, r`$t_1$`], why: '표준정규의 제곱이 자유도 1의 카이제곱의 정의다.' },
        { q: r`$X\sim\text{Exp}(\lambda)$이면 $Y=2X$는?`, choices: [r`$\text{Exp}(\lambda/2)$`, r`$\text{Exp}(2\lambda)$`, r`$\text{Gamma}(2,\lambda)$`, '지수분포가 아니다'], why: r`$P(Y>y)=P(X>y/2)=e^{-(\lambda/2)y}$. 평균이 두 배가 되니 율은 절반.` },
      ],
      cards: [
        { q: '단조변환의 밀도 공식', a: r`$f_Y(y)=f_X(g^{-1}(y))\,|(g^{-1})'(y)|$` },
        { q: '확률적분변환', a: r`연속형이면 $F_X(X)\sim U(0,1)$` },
      ],
      summary: 'CDF 방법은 언제나 통하고, 단조변환이면 야코비안 공식으로 빨리 끝난다.',
    },
  ]);
})();
