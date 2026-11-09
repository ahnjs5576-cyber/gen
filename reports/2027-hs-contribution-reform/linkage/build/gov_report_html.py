# 공무원 보고서(개조식) HTML 생성기 — 유형: policy(정책 보고서) | brief(현안 보고) | plan(기본계획)
# 사용: python3 gov_report_html.py spec.json out.html   (표준 라이브러리만 사용)
import json, sys, re, html

CSS = r"""
:root{--navy:#1F3864;--blue:#2F5597;--rule:#4472C4;--lav:#DCE3F3;--gray:#D9D9D9;--grid:#7F7F7F;
--changed:#0070C0;--yellow:#FFF2CC;--yellowLine:#BF9000;--sky:#DEEBF7;--skyLine:#5B9BD5;--pink:#E6A1A8;
--head:'HY헤드라인M','HYHeadLine M','Noto Sans KR','맑은 고딕',sans-serif;
--body:'휴먼명조','HumanMyeongjo','함초롬바탕','Noto Serif KR','바탕',serif;
--gothic:'맑은 고딕','Malgun Gothic','Noto Sans KR',sans-serif}
*{box-sizing:border-box}
html{background:#e9ebee}
body{margin:0;color:#000;font-family:var(--body);font-size:15pt;line-height:1.6;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{width:210mm;min-height:297mm;margin:16px auto;padding:25mm;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.18);position:relative}
.page.paged{padding-bottom:30mm}
.pno{position:absolute;bottom:14mm;left:0;right:0;text-align:center;font-size:11pt}
b,strong{font-weight:700}.chg{color:var(--changed)}
/* 제목 */
.t-policy{font-family:var(--head);font-weight:700;font-size:18pt;text-align:center;border-top:4.5px solid var(--rule);border-bottom:2px solid var(--rule);padding:8px 0;margin:0 0 18pt;line-height:1.4}
.t-brief{font-family:var(--head);font-weight:700;font-size:16pt;text-align:center;border:2px solid #000;padding:10px;margin:0 0 12pt;line-height:1.4}
.meta{text-align:right;font-family:var(--gothic);font-size:12pt;margin:0 0 12pt}
/* 표지·목차 */
.cover{display:flex;flex-direction:column;align-items:center;padding-top:70mm}
.cover .r1{width:100%;border-bottom:6px solid var(--pink);margin-bottom:24pt}
.cover h1{font-family:var(--head);font-size:24pt;text-align:center;margin:0;line-height:1.5}
.cover .r2{width:100%;border-bottom:6px solid var(--navy);margin-top:18pt}
.cover .r3{width:100%;border-top:4.5px solid var(--pink);margin-top:2px;margin-bottom:48pt}
.cover .date{font-size:16pt;margin-bottom:60pt}
.cover .org{font-family:var(--head);font-weight:700;font-size:24pt;letter-spacing:.5em;margin-bottom:8pt;padding-left:.5em}
.cover .dept{font-family:var(--head);font-size:15pt}
.toc-h{display:inline-block;background:#BFBFBF;border:2px solid #595959;font-family:var(--head);font-weight:700;font-size:20pt;padding:6px 40px;margin:20mm 0 30pt;letter-spacing:.4em}
.toc a{display:flex;align-items:baseline;gap:8px;margin:0 30px 24pt;font-size:15pt;color:#000;text-decoration:none}
.toc a .dots{flex:1;border-bottom:2px dotted #000;transform:translateY(-5px)}
/* 장·절 */
.roman{font-family:var(--head);font-weight:700;font-size:18pt;border-top:4.5px solid var(--navy);border-bottom:2px solid var(--navy);padding:6px 0;margin:12pt 0;break-after:avoid}
.section{display:inline-block;min-width:63mm;max-width:100%;font-family:var(--head);font-weight:700;font-size:16pt;border:1px solid #000;box-shadow:4px 4px 0 var(--pink);padding:3px 10px;margin:8pt 0}
.numbox{display:flex;width:67mm;margin:10pt 0 6pt;break-after:avoid}
.numbox .n{width:9mm;background:var(--navy);color:#fff;font-family:var(--head);font-weight:700;display:flex;align-items:center;justify-content:center}
.numbox .t{flex:1;border:1px solid #000;box-shadow:3px 3px 0 #595959;padding:2px 8px;font-family:var(--head);font-weight:700}
.numbox.s16{font-size:16pt}.numbox.s14{font-size:14pt}
.subchapter{font-family:var(--head);font-weight:700;font-size:15pt;border-top:3px solid var(--rule);border-bottom:3px solid var(--rule);padding:4px 0;margin:18pt 0 12pt;break-after:avoid}
/* 본문 위계 */
.it{margin:0;padding-left:var(--pl);text-indent:calc(-1 * var(--hg))}
.box{--pl:20pt;--hg:20pt;font-family:var(--head);font-weight:700;margin:15pt 0 6pt;break-after:avoid}
.o{--pl:37pt;--hg:15pt;margin:3pt 0;line-height:1.8}
.dash{--pl:49pt;--hg:11pt;margin:2pt 0;line-height:1.8}
.note{--pl:50pt;--hg:15pt;font-family:var(--gothic);font-size:12pt;margin:2pt 0;line-height:1.4}
.star{--pl:46pt;--hg:11pt;font-family:var(--gothic);font-size:12pt;margin:2pt 0;line-height:1.4}
.it .lb{font-weight:700}
.concl{font-family:var(--head);font-weight:700;background:var(--lav);padding:4px 6px 4px 26pt;text-indent:-20pt;margin:12pt 0;line-height:1.6}
.concl-plan{background:var(--yellow);border:1.5px solid var(--yellowLine);font-family:var(--head);font-size:14pt;padding:6px 10px 6px 28pt;text-indent:-18pt;margin:6pt 10px 8pt;line-height:1.6}
.summary{background:var(--sky);border:1.5px solid var(--skyLine);font-family:var(--gothic);font-size:14pt;padding:6px 10px 6px 26pt;text-indent:-16pt;margin:4pt 0 10pt;line-height:1.5}
.notebox{background:var(--sky);font-family:var(--gothic);font-size:12pt;padding:4px 10px 4px 25pt;text-indent:-15pt;margin:4pt 17px 6pt;line-height:1.4}
.refbox{border:1.5px dashed #000;padding:8px 12px;margin:4pt 0 10pt;font-family:var(--gothic);font-size:13pt;line-height:1.5}
.refbox .h,.casebox .h{text-align:center;font-weight:700;margin-bottom:4pt}
.refbox .r{padding-left:16pt;text-indent:-16pt;margin-top:2pt}
.refbox .s{font-size:11pt;padding-left:38pt;text-indent:-10pt}
.casebox{border:1.5px solid #000;padding:8px 12px;margin:4pt 0 10pt;font-family:var(--gothic);font-size:13pt;line-height:1.5}
.casebox .c{font-weight:700;margin-top:3pt}
.casebox .l{font-size:12pt;padding-left:30pt;text-indent:-10pt}
.tcap{text-align:center;font-family:var(--head);font-weight:700;font-size:13pt;margin:8pt 0 2pt;break-after:avoid}
.unit,.caption{text-align:right;font-family:var(--gothic);font-size:11pt;margin:0 0 2pt}
.caption{margin-top:6pt}
table.g{width:100%;border-collapse:collapse;table-layout:fixed;font-family:var(--gothic);margin:2pt 0 8pt;line-height:1.3}
table.g th,table.g td{border:1px solid var(--grid);padding:2px 4px;vertical-align:middle;text-align:left}
table.g th{background:var(--gray);font-weight:700;text-align:center}
table.g td.c{text-align:center}table.g td.sh{background:var(--gray);font-weight:700;text-align:center}
table.g tr{break-inside:avoid}
.annex{display:flex;margin:0 0 10pt}
.annex .n{width:19mm;background:var(--blue);color:#fff;font-family:var(--head);font-weight:700;font-size:15pt;display:flex;align-items:center;justify-content:center;white-space:nowrap}
.annex .t{flex:1;border:1.5px solid #000;padding:4px 10px;font-family:var(--head);font-weight:700;font-size:16pt}
.pb{break-after:page}
@page{size:A4;margin:0}
@media print{html{background:none}.page{margin:0;box-shadow:none;break-after:page}.page:last-child{break-after:auto}}
@media screen and (max-width:820px){.page{width:auto;min-height:0;margin:0;padding:16px;box-shadow:none}body{font-size:13pt}.numbox{width:auto}}

/* 테마 토큰: 종이(라이트)·야간(다크) */
:root{--paper:#fff;--ink:#111;--desk:#e9ebee;--line:#000;--muted:#595959;--tocbg:#BFBFBF}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--paper:#1d2027;--ink:#e3e6ec;--desk:#121418;--line:#8f98a8;--muted:#6d7584;--tocbg:#373d48;
--navy:#35589c;--blue:#35589c;--rule:#6d93d6;--lav:#26314c;--gray:#2d323c;--grid:#5b6270;--changed:#6bb6ef;--yellow:#383021;--yellowLine:#a8841f;--sky:#1f2f44;--skyLine:#5b8fc7;--pink:#a86a72;color-scheme:dark}}
:root[data-theme="dark"]{--paper:#1d2027;--ink:#e3e6ec;--desk:#121418;--line:#8f98a8;--muted:#6d7584;--tocbg:#373d48;
--navy:#35589c;--blue:#35589c;--rule:#6d93d6;--lav:#26314c;--gray:#2d323c;--grid:#5b6270;--changed:#6bb6ef;--yellow:#383021;--yellowLine:#a8841f;--sky:#1f2f44;--skyLine:#5b8fc7;--pink:#a86a72;color-scheme:dark}
html{background:var(--desk)}body{color:var(--ink);background:var(--desk)}
.page{background:var(--paper)}
.t-brief,.section,.numbox .t,.refbox,.casebox,.annex .t{border-color:var(--line)}
.numbox .t{box-shadow:3px 3px 0 var(--muted)}
.toc-h{background:var(--tocbg);border-color:var(--muted)}.toc a{color:var(--ink)}.toc a .dots{border-bottom-color:var(--ink)}
.tw{overflow-x:auto;max-width:100%}
@media screen and (max-width:820px){.page{padding-block:20px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
 .page.paged{padding-bottom:40px}.pno{bottom:12px}.t-policy{font-size:16pt}.o{--pl:26pt;--hg:13pt}.dash{--pl:36pt;--hg:10pt}.note,.star{--pl:36pt}.concl{padding-left:22pt}}
@media print{html,body{background:#fff}}
"""

esc = html.escape
def rich(t):  # **굵게**, ++파란색(변경 부분)++, 줄바꿈 \n
    t = esc(str(t))
    t = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", t)
    t = re.sub(r"\+\+([^+]+)\+\+", r'<span class="chg">\1</span>', t)
    return t.replace("\n", "<br>")

SYM = {"box": "□", "dash": "-", "note": "※", "star": "*"}

def item(kind, text, label, osym):
    sym = osym if kind == "o" else SYM[kind]
    lb = f'<span class="lb">({esc(label)})</span> ' if label else ""
    return f'<p class="it {kind}">{sym} {lb}{rich(text)}</p>'

def table(b):
    n = len(b["header"]) if "header" in b else sum(h.get("span", 1) for h in b["header2"][0])
    ratio = b.get("widths") or [1] * n; s = sum(ratio)
    cols = "".join(f'<col style="width:{r / s * 100:.2f}%">' for r in ratio)
    fs = b.get("fontSize", 11)
    out = [f'<div class="tw"><table class="g" style="font-size:{fs}pt"><colgroup>{cols}</colgroup><thead>']
    if "header2" in b:
        out.append("<tr>" + "".join(
            f'<th{" colspan=%d" % h["span"] if h.get("span", 1) > 1 else ""}{" rowspan=%d" % h["rowSpan"] if h.get("rowSpan") else ""}>{rich(h["text"])}</th>'
            for h in b["header2"][0]) + "</tr>")
        out.append("<tr>" + "".join(f"<th>{rich(h)}</th>" for h in b["header2"][1]) + "</tr>")
    else:
        out.append("<tr>" + "".join(f"<th>{rich(h)}</th>" for h in b["header"]) + "</tr>")
    out.append("</thead><tbody>")
    center = set(b.get("center", []))
    for r in b["rows"]:
        cells = []
        for i, c in enumerate(r):
            cls = "sh" if i == 0 and b.get("firstColShade") else ("c" if i in center else "")
            cells.append(f'<td{" class=" + cls if cls else ""}>{rich(c)}</td>')
        out.append("<tr>" + "".join(cells) + "</tr>")
    out.append("</tbody></table></div>")
    return "".join(out)

def block(b, style, osym):
    t = b["type"]
    if t in ("box", "o", "dash", "note", "star"): return item(t, b["text"], b.get("label"), osym)
    if t == "roman": return f'<h2 class="roman" id="ch-{esc(b["num"])}">{esc(b["num"])}. {rich(b["title"])}</h2>'
    if t == "section": return f'<div><h3 class="section">{rich(b["title"])}</h3></div>'
    if t == "chapter":
        return f'<div class="numbox {"s14" if style == "plan" else "s16"}"><div class="n">{esc(str(b["num"]))}</div><div class="t">{rich(b["title"])}</div></div>'
    if t == "subchapter": return f'<h3 class="subchapter">{rich(b["title"])}</h3>'
    if t == "conclusion":
        arrow = b.get("arrow") or ("⇨" if style == "plan" else "⇒")
        return f'<p class="{"concl-plan" if style == "plan" else "concl"}">{arrow} {rich(b["text"])}</p>'
    if t == "summary": return f'<p class="summary"><b>❖</b> {rich(b["text"])}</p>'
    if t == "notebox": return f'<p class="notebox">※ {rich(b["text"])}</p>'
    if t == "refbox":
        rows = [f'<div class="h">&lt; {esc(b["title"])} &gt;</div>']
        for it in b["items"]:
            lb = f'<b>({esc(it["label"])})</b> ' if it.get("label") else ""
            rows.append(f'<div class="r">▶ {lb}{rich(it["text"])}</div>')
            rows += [f'<div class="s">* {rich(s)}</div>' for s in it.get("sub", [])]
        return f'<div class="refbox">{"".join(rows)}</div>'
    if t == "casebox":
        rows = [f'<div class="h">《 {esc(b["title"])} 》</div>']
        for it in b["items"]:
            rows.append(f'<div class="c">▪ {rich(it["head"])}</div>')
            rows += [f'<div class="l">- {rich(l)}</div>' for l in it.get("lines", [])]
        return f'<div class="casebox">{"".join(rows)}</div>'
    if t == "tablecaption":
        u = f'<p class="unit">단위 : {esc(b["unit"])}</p>' if b.get("unit") else ""
        return f'<p class="tcap">《 {rich(b["title"])} 》</p>{u}'
    if t == "table": return table(b)
    if t == "caption": return f'<p class="caption">{rich(b["text"])}</p>'
    raise ValueError("unknown block type: " + t)

def build(spec):
    style = spec.get("style", "policy")
    osym = spec.get("oSymbol") or ("◦" if style == "plan" else "ㅇ")
    pages, cur = [], []
    def flush():
        if cur: pages.append("".join(cur)); cur.clear()
    if style == "policy": cur.append(f'<h1 class="t-policy">{rich(spec["title"])}</h1>')
    if style == "brief": cur.append(f'<h1 class="t-brief">{rich(spec["title"])}</h1>')
    if spec.get("meta") and style != "plan": cur.append(f'<p class="meta">{rich(spec["meta"])}</p>')
    first_roman = True
    for bi, b in enumerate(spec["blocks"]):
        t = b["type"]
        if t == "roman":
            if not first_roman and b.get("newPage", True): flush()
            first_roman = False
        if t in ("annex", "pagebreak"):
            flush()
            if t == "pagebreak": continue
            cur.append(f'<div class="annex"><div class="n">{esc(b.get("label", "붙임"))}</div><div class="t">{rich(b["title"])}</div></div>')
            continue
        h = block(b, style, osym)
        if spec.get("_wrap"): h = f'<div class="blk" data-i="{bi}" data-t="{t}">{h}</div>'
        cur.append(h)
    flush()
    numbered = style == "plan" or spec.get("pageNumbers")
    body = []
    if style == "plan":
        c = ['<section class="page"><div class="cover"><div class="r1"></div>',
             f'<h1>{rich(spec["title"])}</h1><div class="r2"></div><div class="r3"></div>']
        if spec.get("date"): c.append(f'<div class="date">{esc(spec["date"])}</div>')
        if spec.get("org"): c.append(f'<div class="org">{esc(spec["org"])}</div>')
        if spec.get("dept"): c.append(f'<div class="dept">[{esc(spec["dept"])}]</div>')
        body.append("".join(c) + "</div></section>")
        if spec.get("toc", True):
            links = "".join(f'<a href="#ch-{esc(b["num"])}"><span>{esc(b["num"])}. {esc(b["title"])}</span><span class="dots"></span><span>{i:02d}</span></a>'
                            for i, b in _toc_pages(spec, pages))
            body.append(f'<section class="page"><div style="text-align:center"><div class="toc-h">목 차</div></div><nav class="toc">{links}</nav></section>')
    for i, p in enumerate(pages, 1):
        pn = f'<div class="pno">- {i} -</div>' if numbered else ""
        body.append(f'<section class="page{" paged" if numbered else ""}">{p}{pn}</section>')
    title = esc(spec["title"].replace("\n", " "))
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body>
{"".join(body)}
</body></html>"""

def _toc_pages(spec, pages):  # 각 Ⅰ.~Ⅵ. 장이 시작되는 쪽(본문 쪽 번호 기준)
    out = []
    for b in spec["blocks"]:
        if b["type"] != "roman": continue
        anchor = f'id="ch-{esc(b["num"])}"'
        pg = next((i for i, p in enumerate(pages, 1) if anchor in p), 0)
        out.append((pg, b))
    return out

if __name__ == "__main__":
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    open(sys.argv[2], "w", encoding="utf-8").write(build(spec))
    print("written", sys.argv[2])
