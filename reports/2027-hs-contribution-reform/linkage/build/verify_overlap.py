import re, sys, subprocess
S=sys.argv[1]
exec(open(S+'/verify/v.py',encoding='utf-8').read().split('P = {')[0].replace("T = sys.argv[1]","T = S+'/txt'"))
sel = {full(a):'수도권' for a in CAP} | {full(a):'지역' for a in REG}
t = subprocess.run(['pdftotext','-f','24','-l','24','-layout',S+'/src2/doc2.pdf','-'],capture_output=True,text=True).stdout
t = t[t.index('□ 참여 대학'):t.index('※ ‘26년')]
t = re.sub(r'수도권|대구‧경북‧|강원권|충청권|호남권|부산‧울산‧|경남권|권 역|대 학 명|□ 참여 대학\(‘25년 기준\)','',t)
t = re.sub(r'\s*\n\s*','',t)  # 줄바꿈으로 끊긴 이름 복원
inn = set(re.findall(r'[^,\s][^,]*?대학교(?:\([^)]*\))?', t))
inn = {re.sub(r'\s+','',x) for x in inn}
print('혁신사업 대학 수', len(inn))
# 2) 국립대 육성
flag = {'강원대학교','경북대학교','경상국립대학교','부산대학교','전남대학교','전북대학교','제주대학교','충남대학교','충북대학교'}
nat_short = ['국립경국대','국립공주대','국립군산대','국립금오공과대','국립목포대','국립한밭대','국립부경대','서울과학기술대','국립순천대','국립한국교통대','국립창원대','한경국립대','국립목포해양대','한국방송통신대','한국체육대','국립한국해양대','경인교대','공주교대','광주교대','대구교대','부산교대','서울교대','전주교대','진주교대','청주교대','춘천교대','한국교원대']
SPEC.update({'공주교대':'공주교육대학교','전주교대':'전주교육대학교','청주교대':'청주교육대학교','춘천교대':'춘천교육대학교'})
nat = {full(a) for a in nat_short}
import collections
c = collections.Counter(); none=[]
for u,g in sel.items():
    k = '혁신' if u.replace('_분교','') in inn else ('거점' if u in flag or u=='강원대학교_제3캠퍼스' else ('국중대·교대' if u in nat else '없음'))
    c[(g,k)]+=1
    if k=='없음': none.append(u)
print(sorted(c.items())); print('미매칭', none)
print('혁신∩고기', sum(1 for u in sel if u.replace('_분교','') in inn))
