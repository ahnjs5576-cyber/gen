/* 하루 수리통계 — 커리큘럼 2부 (Unit 5~7) */
(function () {
  const r = String.raw;

  window.STAT_LESSONS = (window.STAT_LESSONS || []).concat([
    /* ───────────── Unit 5. 표본분포와 극한정리 ───────────── */
    {
      id: 18, unit: 5, title: '확률표본과 표본평균',
      hook: '표본평균은 모평균을 겨냥하고, 그 흔들림은 표본 크기의 제곱근만큼 줄어든다.',
      body: [
        r`$X_1,\dots,X_n$이 서로 독립이고 같은 분포(iid)를 따르면 <b>확률표본</b>이라 한다. 표본의 함수 중 미지의 모수를 포함하지 않는 것을 <b>통계량</b>이라 한다. $\bar X$, $S^2$, $\max X_i$ 모두 통계량이다.`,
        r`기댓값의 선형성으로 $E[\bar X]=\mu$, 독립합의 분산으로 $\operatorname{Var}(\bar X)=\sigma^2/n$. 표본평균의 표준편차 $\sigma/\sqrt n$을 <b>표준오차</b>라 부른다.`,
        r`<b>표본분산</b>은 $n$이 아니라 $n-1$로 나눈다. $\bar X$가 데이터에 맞춰져 있어서 편차 제곱합이 실제보다 작게 나오는데, $n-1$로 나누면 정확히 보정되어 $E[S^2]=\sigma^2$가 된다.`,
      ],
      formulas: [
        { label: '표본평균', tex: r`E[\bar X]=\mu,\qquad \operatorname{Var}(\bar X)=\frac{\sigma^2}{n}` },
        { label: '표본분산', tex: r`S^2=\frac{1}{n-1}\sum_{i=1}^n(X_i-\bar X)^2,\qquad E[S^2]=\sigma^2` },
      ],
      example: {
        q: r`모표준편차가 10인 모집단에서 $n=25$개를 뽑았다. $\bar X$의 표준오차는?`,
        a: r`$10/\sqrt{25}=2$. 개별 관측값보다 다섯 배 덜 흔들린다.`,
      },
      pitfall: r`표준오차를 절반으로 줄이려면 표본을 두 배가 아니라 <b>네 배</b> 늘려야 한다. $\sqrt n$에 반비례하기 때문이다.`,
      quiz: [
        { q: '표본 크기를 4배로 늘리면 표본평균의 표준오차는?', choices: ['1/2로 준다', '1/4로 준다', '1/16로 준다', '변하지 않는다'], why: r`$\sigma/\sqrt{4n}=\frac12\cdot\sigma/\sqrt n$.` },
        { q: r`표본분산을 $n-1$로 나누는 이유는?`, choices: [r`$E[S^2]=\sigma^2$이 되도록(불편성)`, '계산을 쉽게 하려고', '분산을 항상 작게 하려고', '정규분포일 때만 필요해서'], why: r`$n$으로 나누면 기댓값이 $\frac{n-1}{n}\sigma^2$로 살짝 작아진다.` },
        { q: '다음 중 통계량이 <b>아닌</b> 것은? (μ는 미지의 모평균)', choices: [r`$\bar X-\mu$`, r`$\bar X$`, r`$\max_i X_i$`, r`$\sum X_i^2$`], why: '미지의 모수 μ가 들어가면 데이터만으로 계산할 수 없다.' },
      ],
      cards: [
        { q: '표본평균의 평균과 분산', a: r`$E[\bar X]=\mu$, $\operatorname{Var}(\bar X)=\sigma^2/n$` },
        { q: '표본분산은 왜 n−1로 나누나?', a: r`그래야 $E[S^2]=\sigma^2$ (불편)` },
      ],
      summary: '표본평균은 모평균을 정확히 겨냥하고, 흔들림은 σ/√n으로 줄어든다.',
    },
    {
      id: 19, unit: 5, title: '체비셰프 부등식과 큰 수의 법칙',
      hook: '표본이 커지면 표본평균은 모평균에 달라붙는다. 체비셰프 부등식이 그 이유를 한 줄로 보여준다.',
      body: [
        r`<b>마르코프 부등식</b>: 음이 아닌 $X$에 대해 $P(X\ge a)\le E[X]/a$. 평균이 작으면 큰 값이 나오기 어렵다는 상식을 식으로 쓴 것이다.`,
        r`이걸 $(X-\mu)^2$에 적용하면 <b>체비셰프 부등식</b>이 된다. 분포를 몰라도 평균에서 $k\sigma$ 이상 벗어날 확률은 $1/k^2$ 이하다.`,
        r`$\bar X_n$에 적용하면 $P(|\bar X_n-\mu|\ge\varepsilon)\le\frac{\sigma^2}{n\varepsilon^2}\to0$. 이것이 <b>(약한) 큰 수의 법칙</b>: $\bar X_n$이 $\mu$로 <b>확률수렴</b>한다. 아래에서 동전을 던져 직접 확인해 보자.`,
      ],
      formulas: [
        { label: '마르코프', tex: r`P(X\ge a)\le\frac{E[X]}{a}\quad(X\ge0,\ a>0)` },
        { label: '체비셰프', tex: r`P(|X-\mu|\ge k\sigma)\le\frac{1}{k^2}` },
        { label: '약한 큰 수의 법칙', tex: r`\bar X_n\xrightarrow{\;p\;}\mu` },
      ],
      widget: 'lln',
      example: {
        q: r`평균 50, 표준편차 5인 분포에서 값이 40 이하이거나 60 이상일 확률의 상한은?`,
        a: r`$|X-50|\ge10=2\sigma$이므로 체비셰프로 $1/2^2=0.25$ 이하. (정규분포라면 실제로는 약 0.046이다. 체비셰프는 어떤 분포에도 성립하는 대신 느슨하다.)`,
      },
      pitfall: r`큰 수의 법칙은 "앞면이 많이 나왔으니 이제 뒷면이 나올 차례"라는 뜻이 아니다(도박사의 오류). 과거를 보상하는 게 아니라 새 시행이 쌓이며 과거의 영향이 희석되는 것이다.`,
      quiz: [
        { q: r`체비셰프 부등식에서 $k=3$일 때 $P(|X-\mu|\ge3\sigma)$의 상한은?`, choices: ['1/9', '1/3', '0.003', '1/27'], why: r`$1/k^2=1/9$.` },
        { q: r`$X\ge0$, $E[X]=2$일 때 마르코프 부등식이 주는 $P(X\ge10)$의 상한은?`, choices: ['0.2', '0.02', '0.5', '0.8'], why: r`$2/10$.` },
        { q: '약한 큰 수의 법칙이 말하는 것은?', choices: [r`$\bar X_n$이 $\mu$로 확률수렴한다`, r`$\bar X_n$의 분포가 정규분포로 간다`, r`$X_n$이 $\mu$로 수렴한다`, '편차가 반드시 보상된다'], why: '분포의 모양(정규)은 다음 레슨의 중심극한정리가 말한다.' },
      ],
      cards: [
        { q: '체비셰프 부등식', a: r`$P(|X-\mu|\ge k\sigma)\le 1/k^2$` },
        { q: '약한 큰 수의 법칙', a: r`$\bar X_n\to\mu$ (확률수렴)` },
      ],
      summary: '체비셰프는 분포 없이 꼬리를 막아주고, 그 덕에 표본평균은 모평균으로 확률수렴한다.',
    },
    {
      id: 20, unit: 5, title: '중심극한정리',
      hook: '원래 분포가 무엇이든, 표본평균을 표준화하면 정규분포로 간다.',
      body: [
        r`큰 수의 법칙은 $\bar X_n$이 <i>어디로</i> 가는지 말하고, <b>중심극한정리</b>(CLT)는 그 주변에서 <i>어떤 모양으로</i> 흔들리는지 말한다. 분산이 유한하기만 하면 그 모양은 정규분포다.`,
        r`실용적으로는 "$n$이 충분히 크면 $\bar X\approx N(\mu,\sigma^2/n)$"으로 쓴다. 신뢰구간과 검정의 상당수가 이 근사 위에 서 있다.`,
        r`아래 시뮬레이터에서 주사위, 지수분포처럼 정규와 전혀 다른 모집단을 골라도 $n$을 키우면 표본평균의 히스토그램이 종 모양이 되는 걸 볼 수 있다.`,
      ],
      formulas: [
        { label: 'CLT', tex: r`\frac{\bar X_n-\mu}{\sigma/\sqrt n}\xrightarrow{\;d\;}N(0,1)` },
        { label: '근사', tex: r`\bar X_n\approx N\!\left(\mu,\ \frac{\sigma^2}{n}\right),\qquad \sum X_i\approx N(n\mu,\ n\sigma^2)` },
      ],
      widget: 'clt',
      example: {
        q: r`공정한 주사위를 100번 던졌을 때 눈의 평균이 3.8보다 클 확률은?`,
        a: r`$\mu=3.5$, $\sigma^2=35/12$. 표준오차 $\sqrt{35/12}/10\approx0.171$. $Z=(3.8-3.5)/0.171\approx1.75$, $P(Z>1.75)\approx0.04$.`,
      },
      pitfall: r`CLT는 <b>표본평균</b>의 분포에 관한 정리다. 데이터를 많이 모은다고 데이터 자체의 히스토그램이 정규가 되지는 않는다.`,
      quiz: [
        { q: r`$\operatorname{Var}(X)=16$, $n=64$일 때 $\bar X$의 근사 표준편차는?`, choices: ['0.5', '0.25', '2', '4'], why: r`$\sqrt{16/64}=0.5$.` },
        { q: 'CLT가 적용되지 <b>않는</b> 모집단은?', choices: ['코시분포', '지수분포', '베르누이분포', '균등분포'], why: '코시분포는 평균과 분산이 존재하지 않는다. 코시 표본의 평균은 n과 무관하게 다시 코시다.' },
        { q: r`CLT의 수렴 종류는?`, choices: ['분포수렴', '확률수렴', '거의 확실한 수렴', '평균제곱 수렴'], why: r`CDF가 $\Phi$로 수렴한다는 뜻이다.` },
      ],
      cards: [
        { q: '중심극한정리', a: r`$\dfrac{\bar X_n-\mu}{\sigma/\sqrt n}\xrightarrow{d}N(0,1)$ (분산 유한)` },
        { q: '큰 수의 법칙 vs CLT', a: 'LLN: 어디로 가나(μ). CLT: 그 주변 흔들림의 모양(정규, 폭 σ/√n)' },
      ],
      summary: '분산만 유한하면 표본평균의 흔들림은 정규 모양이고, 그 폭은 σ/√n이다.',
    },
    {
      id: 21, unit: 5, title: '카이제곱, t, F 분포',
      hook: '정규표본에서 분산을 모를 때 필요한 세 분포다.',
      body: [
        r`표준정규 $k$개의 제곱합이 <b>카이제곱</b> $\chi^2_k$이다. 정규표본이면 $(n-1)S^2/\sigma^2\sim\chi^2_{n-1}$이고, 놀랍게도 $\bar X$와 $S^2$은 독립이다.`,
        r`$\bar X$를 표준화할 때 모르는 $\sigma$ 대신 $S$를 넣으면 분모도 흔들리므로 정규보다 꼬리가 두꺼운 <b>t분포</b>가 된다. 자유도가 커지면 $N(0,1)$에 가까워진다.`,
        r`독립인 두 카이제곱을 자유도로 나눠 비를 만들면 <b>F분포</b>다. 두 분산의 비교나 회귀·분산분석에서 쓴다.`,
      ],
      formulas: [
        { label: '정규표본의 분산', tex: r`\frac{(n-1)S^2}{\sigma^2}\sim\chi^2_{n-1}` },
        { label: 't 통계량', tex: r`T=\frac{Z}{\sqrt{V/k}}\sim t_k,\qquad \frac{\bar X-\mu}{S/\sqrt n}\sim t_{n-1}` },
        { label: 'F', tex: r`F=\frac{U/m}{V/n}\sim F_{m,n}\quad(U\sim\chi^2_m,\ V\sim\chi^2_n\ \text{독립})` },
      ],
      example: {
        q: r`정규모집단에서 $n=10$개를 뽑아 $\frac{\bar X-\mu}{S/\sqrt{10}}$을 계산했다. 이 값의 분포는?`,
        a: r`$t_9$. 자유도는 $n-1=9$. 95% 지점은 $\pm1.96$이 아니라 $\pm2.262$로 더 넓다.`,
      },
      pitfall: r`t분포가 정확히 성립하려면 모집단이 정규여야 한다. 정규가 아니면 $n$이 클 때 CLT 덕분에 근사적으로만 맞는다.`,
      quiz: [
        { q: r`$\chi^2_k$의 평균은?`, choices: [r`$k$`, r`$2k$`, r`$k-1$`, r`$\sqrt k$`], why: r`$E[Z^2]=1$을 $k$번 더한다. 분산은 $2k$.` },
        { q: '자유도가 무한히 커지면 t분포는?', choices: [r`$N(0,1)$로 간다`, '카이제곱으로 간다', '코시분포로 간다', '변하지 않는다'], why: r`$S\to\sigma$이므로 분모의 흔들림이 사라진다.` },
        { q: r`$T\sim t_k$이면 $T^2$의 분포는?`, choices: [r`$F_{1,k}$`, r`$\chi^2_k$`, r`$F_{k,1}$`, r`$t_{2k}$`], why: r`$T^2=\frac{Z^2/1}{V/k}$이고 $Z^2\sim\chi^2_1$.` },
      ],
      cards: [
        { q: '정규표본에서 S²의 분포', a: r`$(n-1)S^2/\sigma^2\sim\chi^2_{n-1}$, 그리고 $\bar X$와 독립` },
        { q: 'σ 대신 S를 넣은 표준화', a: r`$\dfrac{\bar X-\mu}{S/\sqrt n}\sim t_{n-1}$` },
      ],
      summary: '정규표본에서 S²은 카이제곱, σ를 S로 바꾸면 t, 분산의 비는 F다.',
    },

    /* ───────────── Unit 6. 추정 ───────────── */
    {
      id: 22, unit: 6, title: '점추정: 불편성과 MSE',
      hook: '좋은 추정량은 과녁 중심을 겨냥하고(편향 작게), 덜 흔들려야 한다(분산 작게).',
      body: [
        r`모수 $\theta$를 데이터로 맞히는 통계량 $\hat\theta$를 <b>추정량</b>이라 한다. $E[\hat\theta]=\theta$이면 <b>불편</b>추정량이고, $E[\hat\theta]-\theta$를 <b>편향</b>이라 한다.`,
        r`정확도를 하나의 숫자로 재는 것이 <b>평균제곱오차</b> MSE $=E[(\hat\theta-\theta)^2]$다. 이것은 정확히 분산과 편향 제곱의 합으로 쪼개진다.`,
        r`그래서 불편성이 전부는 아니다. 약간 편향되더라도 분산이 훨씬 작으면 MSE가 더 작을 수 있다(편향-분산 트레이드오프).`,
      ],
      formulas: [
        { label: '편향', tex: r`\operatorname{Bias}(\hat\theta)=E[\hat\theta]-\theta` },
        { label: 'MSE 분해', tex: r`\operatorname{MSE}(\hat\theta)=\operatorname{Var}(\hat\theta)+\operatorname{Bias}(\hat\theta)^2` },
      ],
      example: {
        q: r`$\hat\sigma^2=\frac1n\sum(X_i-\bar X)^2$의 편향은?`,
        a: r`$\hat\sigma^2=\frac{n-1}{n}S^2$이므로 $E[\hat\sigma^2]=\frac{n-1}{n}\sigma^2$. 편향은 $-\sigma^2/n$으로, $n$이 크면 사라진다. (정규표본에서는 이 편향된 추정량의 MSE가 오히려 $S^2$보다 작다.)`,
      },
      pitfall: r`불편추정량의 함수는 보통 불편이 아니다. $S^2$은 $\sigma^2$에 불편이지만 $S$는 $\sigma$에 불편이 아니다($E[S]<\sigma$).`,
      quiz: [
        { q: r`분산 4, 편향 1인 추정량의 MSE는?`, choices: ['5', '4', '3', '17'], why: r`$4+1^2=5$.` },
        { q: r`$\frac1n\sum(X_i-\bar X)^2$의 기댓값은?`, choices: [r`$\frac{n-1}{n}\sigma^2$`, r`$\sigma^2$`, r`$\frac{n}{n-1}\sigma^2$`, r`$\sigma^2/n$`], why: r`$S^2$의 $\frac{n-1}{n}$배이기 때문이다.` },
        { q: 'MSE 관점에서 옳은 말은?', choices: ['편향된 추정량이 불편추정량보다 나을 수 있다', '불편추정량이 항상 MSE가 가장 작다', 'MSE는 분산과 같다', '편향이 0이면 MSE도 0이다'], why: 'MSE = 분산 + 편향². 분산을 크게 줄이면 약간의 편향은 손해가 아니다.' },
      ],
      cards: [
        { q: 'MSE 분해', a: r`$\operatorname{MSE}=\operatorname{Var}+\operatorname{Bias}^2$` },
        { q: 'S가 σ의 불편추정량인가?', a: r`아니다. $E[S]<\sigma$ (젠센 부등식)` },
      ],
      summary: '추정량의 정확도는 MSE로 재고, MSE는 분산과 편향 제곱의 합이다.',
    },
    {
      id: 23, unit: 6, title: '적률추정법',
      hook: '모집단 적률을 표본 적률과 같다고 놓고 풀면 그게 적률추정량이다.',
      body: [
        r`모수가 $k$개면 처음 $k$개의 적률을 맞춘다: $E[X^j]=\frac1n\sum X_i^j$, $j=1,\dots,k$. 연립방정식을 풀면 끝이다.`,
        r`장점은 단순함과, 큰 수의 법칙 덕분에 대체로 <b>일치성</b>이 있다는 것. 단점은 효율이 떨어질 수 있고, 가끔 말이 안 되는 값을 준다는 것이다.`,
        r`다음 레슨의 최대가능도추정과 같은 답이 나오는 경우(포아송, 정규)도 많지만, 다른 경우(균등분포)에는 차이가 극명하다.`,
      ],
      formulas: [
        { label: '원리', tex: r`E_\theta[X^j]=\frac{1}{n}\sum_{i=1}^n X_i^j,\qquad j=1,\dots,k` },
      ],
      example: {
        q: r`$U(0,\theta)$와 Exp($\lambda$)의 적률추정량은?`,
        a: r`균등: $E[X]=\theta/2=\bar X$에서 $\hat\theta=2\bar X$. 지수: $E[X]=1/\lambda=\bar X$에서 $\hat\lambda=1/\bar X$.`,
      },
      pitfall: r`$U(0,\theta)$에서 데이터가 1, 2, 9이면 $\hat\theta=2\bar X=8$인데, 이미 9가 관측됐으므로 $\theta\ge9$여야 한다. 적률추정량은 데이터와 모순될 수 있다.`,
      quiz: [
        { q: r`포아송($\lambda$)의 적률추정량은?`, choices: [r`$\bar X$`, r`$1/\bar X$`, r`$S^2$`, r`$\bar X^2$`], why: r`$E[X]=\lambda$를 $\bar X$와 같다고 놓는다.` },
        { q: r`$U(0,\theta)$에서 데이터 1, 3, 5를 얻었다. 적률추정값은?`, choices: ['6', '5', '3', '9'], why: r`$\bar X=3$, $\hat\theta=6$.` },
        { q: r`정규 $N(\mu,\sigma^2)$의 적률추정량 $\hat\sigma^2$은?`, choices: [r`$\frac1n\sum(X_i-\bar X)^2$`, r`$S^2$`, r`$\frac1n\sum X_i^2$`, r`$\bar X^2$`], why: r`$E[X^2]=\sigma^2+\mu^2=\frac1n\sum X_i^2$에서 $\hat\sigma^2=\frac1n\sum X_i^2-\bar X^2$.` },
      ],
      cards: [
        { q: '적률추정법의 원리', a: r`$E_\theta[X^j]=\frac1n\sum X_i^j$를 모수 개수만큼 풀기` },
        { q: 'U(0,θ)의 적률추정량', a: r`$2\bar X$ (최대값보다 작게 나올 수 있음)` },
      ],
      summary: '적률추정은 표본 적률과 모집단 적률을 맞추는 가장 단순한 방법이다.',
    },
    {
      id: 24, unit: 6, title: '최대가능도추정 (MLE)',
      hook: 'MLE는 관측된 데이터가 나올 확률을 가장 크게 만드는 모수 값이다.',
      body: [
        r`데이터를 고정하고 모수의 함수로 본 결합밀도가 <b>가능도</b> $L(\theta)=\prod f(x_i;\theta)$다. "이 모수라면 이 데이터가 얼마나 그럴듯한가"를 잰다.`,
        r`곱은 다루기 어려우니 로그를 씌워 합으로 바꾸고($\ell(\theta)=\sum\log f(x_i;\theta)$), 미분해서 0이 되는 점을 찾는다. 이 방정식을 <b>스코어 방정식</b>이라 한다.`,
        r`<b>불변성</b>: $\hat\theta$가 MLE이면 $g(\theta)$의 MLE는 그냥 $g(\hat\theta)$다. 표준편차의 MLE는 분산 MLE의 제곱근이다.`,
      ],
      formulas: [
        { label: '로그가능도', tex: r`\ell(\theta)=\sum_{i=1}^n\log f(x_i;\theta),\qquad \frac{\partial\ell}{\partial\theta}\Big|_{\hat\theta}=0` },
        { label: '자주 나오는 MLE', tex: r`\text{Bern}: \hat p=\bar X,\quad \text{Poi}: \hat\lambda=\bar X,\quad \text{Exp}: \hat\lambda=1/\bar X` },
      ],
      example: {
        q: r`베르누이($p$) 표본의 MLE를 구하라.`,
        a: r`$\ell(p)=\sum x_i\log p+(n-\sum x_i)\log(1-p)$. 미분: $\frac{\sum x_i}{p}-\frac{n-\sum x_i}{1-p}=0$에서 $\hat p=\bar X$. 성공 비율이라는 당연한 답이 나온다.`,
      },
      pitfall: r`받침이 모수에 의존하면(예: $U(0,\theta)$) 미분으로 풀면 안 된다. $L(\theta)=\theta^{-n}$ ($\theta\ge\max x_i$)는 감소함수이므로 MLE는 $\hat\theta=\max X_i$다.`,
      quiz: [
        { q: r`포아송($\lambda$)의 MLE는?`, choices: [r`$\bar X$`, r`$1/\bar X$`, r`$\max X_i$`, r`$S^2$`], why: r`$\ell=-n\lambda+\sum x_i\log\lambda+C$, 미분하면 $-n+\sum x_i/\lambda=0$.` },
        { q: r`$U(0,\theta)$의 MLE는?`, choices: [r`$\max X_i$`, r`$2\bar X$`, r`$\bar X$`, r`$\min X_i$`], why: r`$\theta$가 작을수록 가능도가 크지만, 관측값보다 작을 수는 없다.` },
        { q: r`$\hat p$가 $p$의 MLE일 때 $p^2$의 MLE는?`, choices: [r`$\hat p^2$`, r`$\hat p$`, r`$\sqrt{\hat p}$`, '다시 계산해야 한다'], why: 'MLE의 불변성.' },
      ],
      cards: [
        { q: 'MLE 구하는 순서', a: r`가능도 → 로그 → $\theta$로 미분 = 0 → 최대인지 확인 (받침이 $\theta$에 의존하면 직접 최대화)` },
        { q: 'MLE의 불변성', a: r`$\widehat{g(\theta)}=g(\hat\theta)$` },
      ],
      summary: 'MLE는 가능도를 최대화하는 값이고, 로그 씌우고 미분하는 게 기본 루트다.',
    },
    {
      id: 25, unit: 6, title: '충분통계량',
      hook: '충분통계량은 모수에 관한 정보를 하나도 잃지 않고 데이터를 요약한 것이다.',
      body: [
        r`동전 100번의 결과 전체를 기억할 필요 없이 "앞면 개수" 하나면 $p$에 대해 알 수 있는 건 다 안다. 이처럼 $T(X)$가 주어졌을 때 데이터의 조건부분포가 $\theta$에 의존하지 않으면 $T$는 <b>충분</b>하다.`,
        r`정의로 확인하기는 번거롭고, 실전에서는 <b>인수분해 정리</b>를 쓴다. 결합밀도를 "$T$와 $\theta$가 섞인 부분 × $\theta$가 없는 부분"으로 쪼갤 수 있으면 $T$는 충분통계량이다.`,
        r`<b>라오-블랙웰 정리</b>: 어떤 불편추정량이든 충분통계량으로 조건부기댓값을 취하면 분산이 줄어든다(늘지는 않는다). 좋은 추정량은 충분통계량의 함수다.`,
      ],
      formulas: [
        { label: '인수분해 정리', tex: r`f(x_1,\dots,x_n;\theta)=g\big(T(x);\theta\big)\,h(x)` },
        { label: '라오-블랙웰', tex: r`\tilde\theta=E[\hat\theta\mid T],\qquad \operatorname{Var}(\tilde\theta)\le\operatorname{Var}(\hat\theta)` },
      ],
      example: {
        q: r`베르누이($p$) 표본의 충분통계량을 찾아라.`,
        a: r`$f=\prod p^{x_i}(1-p)^{1-x_i}=p^{\sum x_i}(1-p)^{n-\sum x_i}$. 이것은 $T=\sum X_i$와 $p$만의 함수이고 $h(x)=1$이므로 $\sum X_i$가 충분하다.`,
      },
      pitfall: r`충분통계량은 하나가 아니다. 충분통계량의 일대일 함수(예: $\sum X_i$ 대신 $\bar X$)도 충분하고, 데이터 전체도 (쓸모는 없지만) 충분하다.`,
      quiz: [
        { q: r`포아송($\lambda$) 표본의 충분통계량은?`, choices: [r`$\sum X_i$`, r`$\max X_i$`, r`$\prod X_i!$`, r`$X_1$`], why: r`$f=e^{-n\lambda}\lambda^{\sum x_i}\cdot\frac{1}{\prod x_i!}$로 쪼개진다.` },
        { q: r`$U(0,\theta)$ 표본의 충분통계량은?`, choices: [r`$\max X_i$`, r`$\sum X_i$`, r`$\bar X$`, r`$\min X_i$`], why: r`$f=\theta^{-n}\mathbf 1(\max x_i\le\theta)$이므로 $\theta$와 얽힌 건 최대값뿐이다.` },
        { q: r`$\mu,\sigma^2$ 모두 미지인 정규표본의 충분통계량은?`, choices: [r`$(\sum X_i,\ \sum X_i^2)$`, r`$\sum X_i$`, r`$\sum X_i^2$`, r`$\max X_i$`], why: r`지수 부분 $\sum(x_i-\mu)^2=\sum x_i^2-2\mu\sum x_i+n\mu^2$에 두 합이 등장한다.` },
      ],
      cards: [
        { q: '인수분해 정리', a: r`$f(x;\theta)=g(T(x);\theta)h(x)$ 꼴이면 $T$는 충분` },
        { q: '라오-블랙웰 정리', a: r`$E[\hat\theta\mid T]$는 분산이 더 작거나 같은 (불편이면 여전히 불편인) 추정량` },
      ],
      summary: '충분통계량은 정보 손실 없는 요약이고, 인수분해로 찾으며, 좋은 추정량은 그 함수다.',
    },
    {
      id: 26, unit: 6, title: '피셔 정보량과 크래머-라오 하한',
      hook: '불편추정량의 분산에는 넘을 수 없는 바닥이 있고, 그 바닥은 피셔 정보량이 정한다.',
      body: [
        r`로그가능도가 $\theta$ 근처에서 뾰족할수록 데이터가 $\theta$를 잘 짚어낸다. 그 뾰족함(곡률)이 <b>피셔 정보량</b> $I(\theta)$다. 관측치 하나당 정보량이고, $n$개면 $nI(\theta)$.`,
        r`<b>크래머-라오 하한</b>(CRLB): 어떤 불편추정량도 분산이 $1/(nI(\theta))$보다 작을 수 없다. 정보가 많을수록 바닥이 낮아진다.`,
        r`분산이 이 하한과 정확히 같은 불편추정량을 <b>효율적</b>이라 한다. 그런 추정량이 있으면 그보다 나은 불편추정량은 없다.`,
      ],
      formulas: [
        { label: '피셔 정보량', tex: r`I(\theta)=E\!\left[\left(\frac{\partial}{\partial\theta}\log f(X;\theta)\right)^{2}\right]=-E\!\left[\frac{\partial^2}{\partial\theta^2}\log f(X;\theta)\right]` },
        { label: 'CRLB', tex: r`\operatorname{Var}(\hat\theta)\ge\frac{1}{n\,I(\theta)}\quad(\hat\theta\text{ 불편})` },
      ],
      example: {
        q: r`베르누이($p$)의 피셔 정보량과 CRLB를 구하고 $\bar X$가 효율적인지 확인하라.`,
        a: r`$\log f=x\log p+(1-x)\log(1-p)$, 두 번 미분하면 $-\frac{x}{p^2}-\frac{1-x}{(1-p)^2}$. 기댓값에 마이너스: $I(p)=\frac1p+\frac1{1-p}=\frac{1}{p(1-p)}$. CRLB $=\frac{p(1-p)}{n}=\operatorname{Var}(\bar X)$이므로 효율적이다.`,
      },
      pitfall: r`CRLB는 정칙조건(받침이 $\theta$에 의존하지 않는 등)이 있을 때만 성립한다. $U(0,\theta)$에는 적용할 수 없다.`,
      quiz: [
        { q: r`포아송($\lambda$) 표본에서 불편추정량 분산의 하한(CRLB)은?`, choices: [r`$\lambda/n$`, r`$1/(n\lambda)$`, r`$\lambda^2/n$`, r`$\lambda$`], why: r`$I(\lambda)=1/\lambda$이므로 $1/(n\cdot\frac1\lambda)=\lambda/n$. $\bar X$의 분산과 같다.` },
        { q: r`$\sigma^2$을 아는 $N(\mu,\sigma^2)$에서 $\mu$에 대한 $I(\mu)$는?`, choices: [r`$1/\sigma^2$`, r`$\sigma^2$`, r`$1/\sigma$`, r`$n/\sigma^2$`], why: r`$\partial^2\log f/\partial\mu^2=-1/\sigma^2$. 관측치 하나당 정보량이다.` },
        { q: '표본 크기를 키우면 CRLB는?', choices: ['1/n에 비례해 줄어든다', '변하지 않는다', '커진다', r`$1/\sqrt n$에 비례해 줄어든다`], why: r`$1/(nI)$이다.` },
      ],
      cards: [
        { q: '피셔 정보량 (두 가지 표현)', a: r`$E[(\partial_\theta\log f)^2]=-E[\partial_\theta^2\log f]$` },
        { q: '크래머-라오 하한', a: r`불편 $\hat\theta$에 대해 $\operatorname{Var}(\hat\theta)\ge 1/(nI(\theta))$` },
      ],
      summary: '피셔 정보량은 로그가능도의 곡률이고, 불편추정량의 분산은 1/(nI)보다 작을 수 없다.',
    },
    {
      id: 27, unit: 6, title: '일치성과 MLE의 점근정규성',
      hook: '표본이 커지면 MLE는 참값으로 가고, 그 주변 흔들림은 CRLB를 달성하는 정규분포가 된다.',
      body: [
        r`$\hat\theta_n\xrightarrow{p}\theta$이면 <b>일치추정량</b>이다. 확인하는 쉬운 방법: $\operatorname{MSE}\to0$이면 (체비셰프 부등식에 의해) 일치한다.`,
        r`정칙조건 아래에서 MLE는 일치하고, 더 나아가 <b>점근정규</b>다. 분산이 정확히 $1/(nI(\theta))$, 즉 크래머-라오 하한이다. 큰 표본에서 MLE가 사랑받는 이유다.`,
        r`<b>델타 방법</b>: $\hat\theta$가 점근정규면 매끄러운 함수 $g(\hat\theta)$도 점근정규이고, 분산은 $g'(\theta)^2$배가 된다.`,
      ],
      formulas: [
        { label: 'MLE 점근정규성', tex: r`\sqrt n(\hat\theta-\theta)\xrightarrow{d}N\!\left(0,\ \frac{1}{I(\theta)}\right)` },
        { label: '델타 방법', tex: r`\sqrt n\big(g(\hat\theta)-g(\theta)\big)\xrightarrow{d}N\!\left(0,\ \frac{g'(\theta)^2}{I(\theta)}\right)` },
      ],
      example: {
        q: r`Exp($\lambda$)에서 MLE $\hat\lambda=1/\bar X$의 근사분포는?`,
        a: r`$\log f=\log\lambda-\lambda x$, 두 번 미분하면 $-1/\lambda^2$, 따라서 $I(\lambda)=1/\lambda^2$. 그러므로 $\hat\lambda\approx N(\lambda,\ \lambda^2/n)$.`,
      },
      pitfall: r`불편성과 일치성은 별개다. $\hat\lambda=1/\bar X$는 편향이 있지만 일치하고, $X_1$ 하나만 쓰는 추정량은 불편이지만 일치하지 않는다.`,
      quiz: [
        { q: r`$\operatorname{MSE}(\hat\theta_n)\to0$이면?`, choices: ['일치추정량이다', '불편추정량이다', '효율적이다', '충분통계량이다'], why: r`$P(|\hat\theta_n-\theta|\ge\varepsilon)\le\operatorname{MSE}/\varepsilon^2\to0$.` },
        { q: r`베르누이에서 $\hat p=\bar X$일 때 델타 방법으로 구한 $\hat p^2$의 근사분산은?`, choices: [r`$4p^3(1-p)/n$`, r`$p(1-p)/n$`, r`$p^2(1-p)^2/n$`, r`$2p(1-p)/n$`], why: r`$g'(p)^2\cdot\frac{p(1-p)}{n}=(2p)^2\frac{p(1-p)}{n}$.` },
        { q: r`정칙조건 아래 MLE의 점근분산은?`, choices: [r`$1/(nI(\theta))$`, r`$I(\theta)/n$`, r`$\sigma^2/n$`, r`$1/I(\theta)$`], why: '크래머-라오 하한을 점근적으로 달성한다.' },
      ],
      cards: [
        { q: 'MLE의 점근분포', a: r`$\hat\theta\approx N(\theta,\ 1/(nI(\theta)))$` },
        { q: '델타 방법', a: r`$g(\hat\theta)\approx N(g(\theta),\ g'(\theta)^2\operatorname{Var}(\hat\theta))$` },
      ],
      summary: 'MLE는 일치하고 점근정규이며 CRLB를 달성한다. 함수를 씌우면 델타 방법으로 분산을 옮긴다.',
    },
    {
      id: 28, unit: 6, title: '신뢰구간',
      hook: '95% 신뢰구간은 같은 방법을 반복하면 95%의 경우 참값을 잡는 그물이다.',
      body: [
        r`<b>추축량</b>(pivot)은 모수와 데이터가 섞여 있지만 분포는 모수에 의존하지 않는 양이다. 예: $Z=\frac{\bar X-\mu}{\sigma/\sqrt n}\sim N(0,1)$. 이 분포의 가운데 95%를 잡고 $\mu$에 대해 풀면 구간이 나온다.`,
        r`$\sigma$를 모르면 $S$를 쓰고 $z$ 대신 $t_{n-1}$ 분위수를 쓴다. 비율이면 CLT로 $\hat p\pm z\sqrt{\hat p(1-\hat p)/n}$.`,
        r`구간 폭은 $1/\sqrt n$에 비례한다. 폭을 절반으로 줄이려면 표본이 네 배 필요하다.`,
      ],
      formulas: [
        { label: '평균 (σ 앎)', tex: r`\bar X\pm z_{\alpha/2}\frac{\sigma}{\sqrt n}` },
        { label: '평균 (σ 모름, 정규)', tex: r`\bar X\pm t_{n-1,\alpha/2}\frac{S}{\sqrt n}` },
        { label: '비율 (대표본)', tex: r`\hat p\pm z_{\alpha/2}\sqrt{\frac{\hat p(1-\hat p)}{n}}` },
      ],
      example: {
        q: r`$\sigma=10$인 정규모집단에서 $n=25$, $\bar x=50$을 얻었다. 95% 신뢰구간은?`,
        a: r`$50\pm1.96\times\frac{10}{5}=50\pm3.92$, 즉 $(46.08,\ 53.92)$.`,
      },
      pitfall: r`계산된 구간 $(46.08,\,53.92)$에 대해 "$\mu$가 이 안에 있을 확률이 95%"라고 하면 틀린다. $\mu$는 고정된 상수라 들어 있거나 아니거나다. 95%는 <b>구간을 만드는 절차</b>의 성질이다.`,
      quiz: [
        { q: '다른 조건이 같을 때 신뢰구간 폭을 절반으로 줄이려면 표본 크기를?', choices: ['4배로', '2배로', r`$\sqrt2$배로`, '절반으로'], why: r`폭 $\propto1/\sqrt n$.` },
        { q: r`정규모집단, $\sigma$ 미지, $n=10$일 때 평균의 신뢰구간에 쓰는 분위수는?`, choices: [r`$t_9$`, r`$t_{10}$`, r`$z$`, r`$\chi^2_9$`], why: r`$\frac{\bar X-\mu}{S/\sqrt n}\sim t_{n-1}$.` },
        { q: '95% 신뢰구간의 올바른 해석은?', choices: ['이 방법으로 구간을 반복해서 만들면 약 95%가 참값을 포함한다', '참값이 이 구간 안에 있을 확률이 95%다', '데이터의 95%가 이 구간 안에 있다', '표본평균이 이 구간에 있을 확률이 95%다'], why: '확률적인 것은 구간(데이터)이고, 모수는 고정되어 있다.' },
      ],
      cards: [
        { q: '추축량(pivot)이란?', a: r`모수와 데이터의 함수인데 분포가 모수에 의존하지 않는 양. 예: $\frac{\bar X-\mu}{\sigma/\sqrt n}$` },
        { q: '95% 신뢰구간의 뜻', a: '절차를 반복하면 95%의 구간이 참값을 포함한다' },
      ],
      summary: '추축량의 분포를 잡고 모수에 대해 풀면 신뢰구간이다. 95%는 절차의 성공률이다.',
    },

    /* ───────────── Unit 7. 가설검정 ───────────── */
    {
      id: 29, unit: 7, title: '가설검정: 두 가지 오류와 검정력',
      hook: '가설검정은 무죄추정의 원칙이다. 증거가 충분할 때만 귀무가설을 기각한다.',
      body: [
        r`<b>귀무가설</b> $H_0$는 "효과 없음" 같은 기본 입장, <b>대립가설</b> $H_1$은 보이고 싶은 주장이다. 데이터가 $H_0$ 아래에서 일어나기 어려운 영역(<b>기각역</b>)에 떨어지면 $H_0$를 기각한다.`,
        r`실수는 두 종류다. <b>제1종 오류</b>: $H_0$가 참인데 기각(무고한 사람 유죄). 확률 $\alpha$, 유의수준. <b>제2종 오류</b>: $H_1$이 참인데 기각 못함(범인 무죄). 확률 $\beta$.`,
        r`<b>검정력</b> $1-\beta$는 효과가 실제로 있을 때 그것을 잡아낼 확률이다. 표본 크기가 고정이면 $\alpha$를 줄일수록 $\beta$는 커진다. 둘 다 줄이려면 $n$을 키워야 한다.`,
      ],
      formulas: [
        { label: '두 오류', tex: r`\alpha=P(\text{기각}\mid H_0),\qquad \beta=P(\text{채택}\mid H_1)` },
        { label: '검정력 함수', tex: r`\pi(\theta)=P_\theta(\text{기각}),\qquad \pi(\theta_1)=1-\beta` },
      ],
      example: {
        q: r`$X_i\sim N(\mu,1)$, $n=25$. $H_0:\mu=0$ vs $H_1:\mu>0$을 $\alpha=0.05$로 검정한다. 기각역과 $\mu=0.5$에서의 검정력은?`,
        a: r`기각역: $\bar X>1.645/\sqrt{25}=0.329$. $\mu=0.5$이면 $P(\bar X>0.329)=P\big(Z>(0.329-0.5)\times5\big)=P(Z>-0.855)\approx0.80$.`,
      },
      pitfall: r`$H_0$를 기각하지 못했다고 $H_0$가 참이라는 증거는 아니다. "증거 불충분"일 뿐이다. 검정력이 낮으면 효과가 있어도 놓친다.`,
      quiz: [
        { q: '제1종 오류는?', choices: [r`$H_0$가 참인데 기각하는 것`, r`$H_0$가 거짓인데 채택하는 것`, r`$H_1$이 참인데 기각하는 것`, '표본을 잘못 뽑는 것'], why: '유의수준 α가 제1종 오류의 확률이다.' },
        { q: r`$n$이 고정일 때 $\alpha$를 0.05에서 0.01로 줄이면 $\beta$는?`, choices: ['커진다', '작아진다', '그대로다', '0이 된다'], why: '기각역이 좁아져 실제 효과도 놓치기 쉬워진다.' },
        { q: '검정력을 높이는 방법이 <b>아닌</b> 것은?', choices: [r`$\alpha$를 더 작게 잡기`, '표본 크기 늘리기', '측정 잡음(σ) 줄이기', '효과가 큰 상황에서 검정하기'], why: r`$\alpha$를 줄이면 검정력도 줄어든다.` },
      ],
      cards: [
        { q: '제1종 · 제2종 오류', a: r`1종: $H_0$ 참인데 기각 (확률 $\alpha$). 2종: $H_1$ 참인데 채택 (확률 $\beta$)` },
        { q: '검정력', a: r`$1-\beta$ = 대립가설이 참일 때 기각할 확률` },
      ],
      summary: 'α는 억울한 기각, β는 놓친 효과, 검정력은 효과를 잡아낼 확률이다.',
    },
    {
      id: 30, unit: 7, title: 'p-값',
      hook: 'p-값은 귀무가설이 참이라면 지금만큼 또는 더 극단적인 결과가 나올 확률이다.',
      body: [
        r`검정통계량의 관측값을 $t_{\text{obs}}$라 하자. $H_0$ 아래에서 이것보다 더 극단적인 값이 나올 확률이 <b>p-값</b>이다. 작을수록 $H_0$와 데이터가 잘 안 맞는다.`,
        r`판정 규칙: $p\le\alpha$이면 기각. 이것은 "관측값이 기각역에 들어갔다"와 정확히 같은 말이다. p-값은 모든 $\alpha$에 대한 답을 한 숫자에 담은 것이다.`,
        r`양측검정이면 양쪽 꼬리를 모두 더한다. 대칭 분포라면 한쪽 꼬리 확률의 두 배다.`,
      ],
      formulas: [
        { label: '단측 (오른쪽)', tex: r`p=P_{H_0}(T\ge t_{\text{obs}})` },
        { label: '양측 (대칭)', tex: r`p=2\,P_{H_0}(T\ge|t_{\text{obs}}|)` },
      ],
      example: {
        q: r`양측 $z$검정에서 $z_{\text{obs}}=2.1$이 나왔다. p-값은? $\alpha=0.05$에서 결론은?`,
        a: r`$p=2\times(1-\Phi(2.1))\approx2\times0.0179=0.036$. $0.036<0.05$이므로 $H_0$를 기각한다.`,
      },
      pitfall: r`p-값은 "$H_0$가 참일 확률"이 아니고, 효과의 크기도 아니다. 표본이 아주 크면 쓸모없을 만큼 작은 효과도 아주 작은 p-값을 낸다.`,
      quiz: [
        { q: 'p-값의 올바른 정의는?', choices: [r`$H_0$가 참일 때 관측값 이상으로 극단적인 결과가 나올 확률`, r`$H_0$가 참일 확률`, r`$H_1$이 참일 확률`, '결과가 우연일 확률'], why: 'p-값은 H₀를 가정하고 계산한 데이터에 대한 확률이다.' },
        { q: r`$p=0.03$, $\alpha=0.05$이면?`, choices: [r`$H_0$를 기각한다`, r`$H_0$를 채택한다`, r`$H_0$가 참일 확률이 3%다`, '판단할 수 없다'], why: r`$p\le\alpha$.` },
        { q: '대칭 분포에서 단측 p-값이 0.02라면, 같은 관측값에 대한 양측 p-값은?', choices: ['0.04', '0.01', '0.02', '0.98'], why: '양쪽 꼬리를 더하므로 두 배.' },
      ],
      cards: [
        { q: 'p-값의 정의', a: r`$H_0$ 아래에서 관측값만큼 또는 더 극단적인 결과가 나올 확률` },
        { q: 'p-값이 아닌 것', a: r`$H_0$가 참일 확률도, 효과의 크기도 아니다` },
      ],
      summary: 'p-값은 H₀ 세계에서 이 데이터가 얼마나 놀라운지를 재고, p ≤ α이면 기각한다.',
    },
    {
      id: 31, unit: 7, title: '네이만-피어슨 정리와 가능도비 검정',
      hook: '가장 강력한 검정은 가능도비가 큰 곳을 기각역으로 삼는 검정이다.',
      body: [
        r`<b>네이만-피어슨 정리</b>: 단순가설 $H_0:\theta=\theta_0$ vs $H_1:\theta=\theta_1$에서, 크기 $\alpha$인 검정 중 검정력이 가장 큰 것은 $\frac{L(\theta_1)}{L(\theta_0)}>k$일 때 기각하는 검정이다. "$H_1$ 아래에서 상대적으로 더 그럴듯한 데이터"부터 기각역에 담는 셈이다.`,
        r`정규평균처럼 가능도비가 $\bar X$의 증가함수이면 기각역이 $\bar X>c$가 된다. 이 기각역이 $\theta_1$ 값과 무관하므로 단측 대립가설 전체에 대해 최강력, 즉 <b>균일최강력(UMP)</b> 검정이다.`,
        r`복합가설에는 <b>일반화 가능도비 검정</b>(GLRT)을 쓴다. $\Lambda$가 작을수록 $H_0$에 불리하다. <b>윌크스 정리</b>: $H_0$ 아래 $-2\log\Lambda$는 근사적으로 카이제곱을 따르고, 자유도는 두 가설의 자유 모수 개수 차이다.`,
      ],
      formulas: [
        { label: '네이만-피어슨', tex: r`\text{기각}\iff\frac{L(\theta_1;x)}{L(\theta_0;x)}>k` },
        { label: 'GLRT와 윌크스', tex: r`\Lambda=\frac{\sup_{\theta\in\Theta_0}L(\theta)}{\sup_{\theta\in\Theta}L(\theta)},\qquad -2\log\Lambda\ \overset{\cdot}{\sim}\ \chi^2_{d}` },
      ],
      example: {
        q: r`$X_i\sim N(\mu,1)$에서 $H_0:\mu=0$ vs $H_1:\mu=1$. 최강력 검정의 형태는?`,
        a: r`$\frac{L(1)}{L(0)}=\exp\!\big(\sum x_i-\frac n2\big)$은 $\bar x$의 증가함수. 따라서 $\bar X>c$일 때 기각하고, $c$는 $\alpha$에 맞춰 $1.645/\sqrt n$ 등으로 정한다.`,
      },
      pitfall: r`네이만-피어슨 정리 자체는 <b>단순 대 단순</b> 가설에 대한 것이다. 양측 대립가설에는 일반적으로 UMP 검정이 존재하지 않는다.`,
      quiz: [
        { q: '네이만-피어슨 정리가 직접 적용되는 상황은?', choices: ['단순가설 vs 단순가설', '복합가설 vs 복합가설', '양측 대립가설', '모수가 없는 검정'], why: '복합가설로의 확장은 단조가능도비 등 추가 조건이 필요하다.' },
        { q: r`정규모형에서 $H_0:\mu=0,\ \sigma^2$ 미지 vs $H_1$: 둘 다 자유일 때, 윌크스 정리의 자유도는?`, choices: ['1', '2', '0', r`$n-1$`], why: '전체 2개(μ, σ²) − 귀무 1개(σ²) = 1.' },
        { q: r`가능도비 $\Lambda$의 범위와 해석으로 옳은 것은?`, choices: [r`$0\le\Lambda\le1$, 작을수록 $H_0$ 기각`, r`$0\le\Lambda\le1$, 클수록 $H_0$ 기각`, r`$\Lambda\ge1$, 클수록 기각`, r`$\Lambda$는 음수가 될 수 있다`], why: '분자는 제한된 최대, 분모는 전체 최대라 Λ ≤ 1. 제한하면 손해가 클수록 H₀가 의심스럽다.' },
      ],
      cards: [
        { q: '네이만-피어슨 정리', a: r`단순 vs 단순에서 $L(\theta_1)/L(\theta_0)>k$로 기각하는 검정이 최강력` },
        { q: '윌크스 정리', a: r`$-2\log\Lambda\overset{\cdot}{\sim}\chi^2_d$, $d$ = 자유 모수 개수의 차이` },
      ],
      summary: '최강력 검정은 가능도비로 만들고, 복합가설에서는 −2logΛ가 카이제곱을 따른다.',
    },
    {
      id: 32, unit: 7, title: '베이즈 추론 맛보기',
      hook: '베이즈 추론에서는 모수도 확률변수다. 사후분포는 가능도 곱하기 사전분포다.',
      body: [
        r`지금까지는 $\theta$를 고정된 미지의 상수로 봤다(빈도주의). 베이즈에서는 $\theta$에 대한 믿음을 <b>사전분포</b> $\pi(\theta)$로 표현하고, 데이터를 본 뒤 베이즈 정리로 <b>사후분포</b>로 갱신한다. 3일차의 베이즈 정리가 그대로 분포 버전이 된 것이다.`,
        r`사전분포와 사후분포가 같은 분포족이면 <b>켤레</b>라 한다. 대표적으로 베타 사전분포 + 이항 가능도 → 베타 사후분포. 계산이 "성공은 $a$에, 실패는 $b$에 더하기"로 끝난다.`,
        r`사후평균은 사전평균과 표본비율 사이의 가중평균이다. 데이터가 많아질수록 데이터 쪽으로 쏠려 결국 MLE와 거의 같아진다.`,
      ],
      formulas: [
        { label: '사후분포', tex: r`\pi(\theta\mid x)\ \propto\ L(\theta;x)\,\pi(\theta)` },
        { label: '베타-이항 켤레', tex: r`\text{Beta}(a,b)\ \xrightarrow{\ n\text{회 중 }x\text{회 성공}\ }\ \text{Beta}(a+x,\ b+n-x)` },
        { label: '사후평균', tex: r`E[p\mid x]=\frac{a+x}{a+b+n}` },
      ],
      example: {
        q: r`균등 사전분포 Beta(1,1)로 시작해 10번 중 7번 성공을 관측했다. 사후분포와 사후평균은?`,
        a: r`Beta$(1+7,\ 1+3)=$ Beta$(8,4)$. 사후평균 $8/12\approx0.667$. MLE $0.7$보다 사전평균 $0.5$ 쪽으로 살짝 당겨졌다.`,
      },
      pitfall: r`베이즈 신용구간 "$P(\theta\in C\mid x)=0.95$"는 신뢰구간과 해석이 다르다. 베이즈에서는 모수가 확률변수라서 "모수가 구간 안에 있을 확률 95%"라고 말해도 된다.`,
      quiz: [
        { q: r`사전분포 Beta(2,2)에서 5번 중 3번 성공을 관측했다. 사후분포는?`, choices: ['Beta(5, 4)', 'Beta(3, 2)', 'Beta(5, 5)', 'Beta(4, 5)'], why: r`$a+x=2+3=5$, $b+n-x=2+2=4$.` },
        { q: '데이터가 아주 많아지면 사후평균은?', choices: ['MLE(표본비율)에 가까워진다', '사전평균에 가까워진다', '0.5로 간다', '변하지 않는다'], why: r`$\frac{a+x}{a+b+n}$에서 $n$이 커지면 $a, b$의 영향이 사라진다.` },
        { q: "'켤레 사전분포'의 뜻은?", choices: ['사후분포가 사전분포와 같은 분포족이 되는 사전분포', '정보가 전혀 없는 사전분포', '가능도와 모양이 같은 사전분포', '두 개의 사전분포를 곱한 것'], why: '계산이 모수 갱신만으로 끝나는 편리한 조합이다.' },
      ],
      cards: [
        { q: '사후분포', a: r`$\pi(\theta\mid x)\propto L(\theta;x)\pi(\theta)$` },
        { q: '베타-이항 켤레 갱신', a: r`Beta$(a,b)$ → Beta$(a+x,\ b+n-x)$` },
      ],
      summary: '사후 ∝ 가능도 × 사전. 켤레 분포면 갱신은 덧셈이고, 데이터가 많으면 MLE에 수렴한다.',
    },
  ]);
})();
