# 독립 검증 스크립트 (에이전트 스크립트와 별도 작성)
import csv, re, sys, collections
T = sys.argv[1]
sel_txt = open(T+'/선정 결과.txt', encoding='utf-8').read()
cap_block = sel_txt[sel_txt.index('가톨릭대, 강남대'):sel_txt.index('가톨릭관동대')]
reg_block = sel_txt[sel_txt.index('가톨릭관동대'):sel_txt.index('소계')]
def names(b):
    b = re.sub(r'수도권|\(38개교\)|지역|\(54개교\)', ' ', b)
    return [x.strip() for x in re.split(r'[,\n]', b) if x.strip()]
CAP, REG = names(cap_block), names(reg_block)
assert len(CAP)==38 and len(REG)==54, (len(CAP),len(REG))
SPEC = {'경인교대':'경인교육대학교','서울교대':'서울교육대학교','광주교대':'광주교육대학교','대구교대':'대구교육대학교','부산교대':'부산교육대학교','진주교대':'진주교육대학교',
 '덕성여대':'덕성여자대학교','서울여대':'서울여자대학교','성신여대':'성신여자대학교','숙명여대':'숙명여자대학교','이화여대':'이화여자대학교',
 '한국외대':'한국외국어대학교','부산외대':'부산외국어대학교','건국대(글로컬)':'건국대학교(글로컬)_분교','동국대(WISE)':'동국대학교(WISE)_분교',
 '한양대(ERICA)':'한양대학교(ERICA)_분교','국립강릉원주대':'강원대학교_제3캠퍼스'}
def full(a): return SPEC.get(a, a[:-1]+'대학교' if a.endswith('대') else a)
def base(n):
    if n.startswith('강원대학교_제3') or n.startswith('강원대학교_제4'): return '강원대학교_제3캠퍼스'
    return re.sub(r'_제\d캠퍼스$','',re.sub(r'\(\S+캠퍼스\)_제\d캠퍼스$','',n))
P = {full(a):'C' for a in CAP} | {full(a):'R' for a in REG}
app = [r for r in csv.reader(open(T+'/2025년 사업 신청 대학.tsv'),delimiter='\t') if r and r[0].isdigit()]
APPL = {r[1].strip() for r in app}
f = lambda x: float(x or 0)
rows = [r+['']*30 for r in csv.reader(open(T+'/입학전형 유형별 선발 결과 대학_2026-11-0595841692.tsv'),delimiter='\t') if r and r[0]=='2026']
seen=set(); 
agg = collections.defaultdict(lambda: collections.Counter())
CAPREG={'서울','경기','인천'}
for r in rows:
    b = base(r[5]); seen.add(b)
    if b in P: g = 'P-'+('수도권' if P[b]=='C' else '지역')
    else:
        if '사이버' in b or '과학기술원' in b or b.endswith('신학교'): continue
        g = ('미신청' if b not in APPL else '미선정')+'-'+('수도권' if r[3] in CAPREG else '지역')
    plan, reg = f(r[23]), f(r[24])
    a = agg[g]
    if r[6]=='정원내':
        a['plan']+=plan; a['reg']+=reg
        a['plan_'+r[7]]+=plan; a['reg_'+r[7]]+=reg
    if '기회균형' in r[8] or '고른기회' in r[8] or r[8].startswith(('기초생활','장애인','농어촌')):
        k = 'gk_in' if r[6]=='정원내' else 'gk_out'
        a[k+'_plan']+=plan; a[k+'_reg']+=reg
    a['allreg']+=reg
miss = [k for k in P if k not in seen]
print('미매칭:', miss)
for g in sorted(agg):
    a=agg[g]
    pr=lambda k: 100*a[k]/a['plan'] if a['plan'] else 0
    print(f"{g:10s} 정원내계획{a['plan']:8.0f} 수능{pr('plan_수능위주'):5.1f} 교과{pr('plan_학생부위주(교과)'):5.1f} 종합{pr('plan_학생부위주(종합)'):5.1f} 논술{pr('plan_논술위주'):4.1f} | 정원내등록{a['reg']:7.0f} 등록중교과{100*a['reg_학생부위주(교과)']/max(a['reg'],1):5.1f} 수능등록-계획{a['reg_수능위주']-a['plan_수능위주']:7.0f} | 기균외 등록률{100*a['gk_out_reg']/max(a['gk_out_plan'],1):5.1f} 미등록{a['gk_out_plan']-a['gk_out_reg']+a['gk_in_plan']-a['gk_in_reg']:6.0f} 기균내비중{100*a['gk_in_reg']/max(a['reg'],1):4.1f}")
tot = sum(a['reg'] for a in agg.values()); ns = sum(a['reg'] for g,a in agg.items() if g.startswith('미신청'))
print('미신청 정원내 등록 비중', round(100*ns/tot,1))
P_all = collections.Counter(); 
for g,a in agg.items():
    if g.startswith('P'): P_all.update(a)
print('참여 전체 수능 계획비율', round(100*P_all['plan_수능위주']/P_all['plan'],1), '논술', P_all['plan_논술위주'], round(100*P_all['plan_논술위주']/P_all['plan'],1), '기균 정원외 비중', round(100*P_all['gk_out_reg']/(P_all['gk_out_reg']+P_all['gk_in_reg']),1))
# 서류평가
d = [r+['']*20 for r in csv.reader(open(T+'/학교생활기록부의 기록 등 교과성적 외의 자료를 활_2026-11-059581154.tsv'),delimiter='\t') if r and r[0][:2]=='20']
cnt=collections.Counter(); per=[]
by=collections.defaultdict(lambda: collections.Counter())
for r in d:
    b=base(r[5])
    if b in P:
        by[b]['full']+=f(r[6]); by[b]['cnt_full']+=f(r[11]); by[b]['cnt_comm']+=f(r[12])
for b,c in by.items():
    cnt.update(c)
    if c['full']>0: per.append(c['cnt_full']/c['full'])
per.sort(); import statistics
print('서류: 매칭', len(by), '위촉비중', round(100*cnt['cnt_comm']/(cnt['cnt_comm']+cnt['cnt_full']),1), '전임1인당 중앙값', round(statistics.median(per),1), '1000건초과', sum(x>1000 for x in per))
# 사정관
o = [r+['']*20 for r in csv.reader(open(T+'/전임 입학사정관 현황 대학_2026-11-0595820379.tsv'),delimiter='\t') if r and r[0][:2]=='20']
hp=collections.Counter(); hn=collections.Counter(); ratios={}
for r in o:
    b=base(r[5]) if not r[5].startswith('국립강릉원주') else '강원대학교_제3캠퍼스'
    if b in P: hp['h']+=f(r[6]); hp['reg']+=f(r[7]); ratios.setdefault(b,[0,0]); ratios[b][0]+=f(r[6]); ratios[b][1]+=f(r[7])
    hn['h']+=f(r[6])
print('채용사정관 참여', hp['h'], '정규', hp['reg'], round(100*hp['reg']/hp['h'],1), '전국비중', round(100*hp['h']/hn['h'],1), '매칭', len(ratios), '50%미만', sum(1 for h,rg in ratios.values() if h>0 and rg/h<0.5))
# 경쟁률(정원내 지원자/정원내 모집), 신청소위
fr = [r+['']*25 for r in csv.reader(open(T+'/신입생 충원 현황 대학_2026-11-06161053315.tsv'),delimiter='\t') if r and r[0][:2]=='20']
cc=collections.defaultdict(lambda:[0,0])
for r in fr:
    b=base(r[5]) if not r[5].startswith('국립강릉원주') else '강원대학교_제3캠퍼스'
    if b in P: cc[b][0]+=f(r[8]); cc[b][1]+=f(r[11])
grp={full(r[1].strip().replace('학교','').strip()) if False else r[1].strip(): r[2] for r in app}
reg=[(b,v[1]/v[0]) for b,v in cc.items() if P[b]=='R' and v[0]>0]
cap=[(b,v[1]/v[0]) for b,v in cc.items() if P[b]=='C' and v[0]>0]
print('경쟁률 매칭', len(cc), '지역<6', sum(x<6 for _,x in reg), '/', len(reg), '수도권<6', sum(x<6 for _,x in cap), '/', len(cap))
sub=collections.defaultdict(list)
for b,x in reg+cap:
    g=grp.get(b) or grp.get(b.replace('_분교','')) 
    sub[g].append(round(x,1))
for g,v in sub.items(): print(g, len(v), min(v), max(v))
# 설립별 정규직
est=collections.defaultdict(lambda:[0,0])
for r in o:
    b=base(r[5]) if not r[5].startswith('국립강릉원주') else '강원대학교_제3캠퍼스'
    if b in P: k='사립' if r[2]=='사립' else '국공립'; est[k][0]+=f(r[6]); est[k][1]+=f(r[7])
print({k:(v, round(100*v[1]/v[0],1)) for k,v in est.items()})
