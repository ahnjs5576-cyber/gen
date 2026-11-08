#!/bin/bash
# spec.json → (블록 실측 쪽 나눔) → report.html / report.pdf
set -e
cd "$(dirname "$0")"
export NODE_PATH=$(npm root -g)
python3 -c "import json;s=json.load(open('spec.json',encoding='utf-8'));s['_wrap']=True;json.dump(s,open('spec_wrap.json','w',encoding='utf-8'),ensure_ascii=False)"
python3 -I gov_report_html.py spec_wrap.json wrap.html >/dev/null
node paginate.js "$PWD/wrap.html" > breaks.json
python3 - <<'PY'
import json
s=json.load(open('spec.json',encoding='utf-8')); br=set(json.load(open('breaks.json')))
nb=[]
for i,b in enumerate(s['blocks']):
    if i in br: nb.append({"type":"pagebreak"})
    nb.append(b)
s['blocks']=nb; json.dump(s,open('spec_final.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
PY
python3 -I gov_report_html.py spec_final.json report.html
node shot.js "$PWD/report.html" "$PWD/report.pdf"
cat breaks.json; pdfinfo report.pdf | grep Pages
