# 2027년 고교교육 기여대학 지원사업 개편 방향(안)

| 파일 | 내용 |
| --- | --- |
| `report.html` | 최종 보고서(정책 보고서 양식, 브라우저에서 A4로 인쇄 가능) |
| `report.pdf` | 인쇄 확인용 A4 PDF(본문 13쪽 + 붙임 3쪽) |
| `analysis/01_fairness.md` | 관점 ① 대입 공정성 독립 분석 |
| `analysis/02_expertise.md` | 관점 ② 전문성(입학사정관·전형 운영 조직) 독립 분석 |
| `analysis/03_hs_linkage.md` | 관점 ③ 고교 연계성 독립 분석 |
| `analysis/04_accountability.md` | 관점 ④ 사회적 책무성 독립 분석 |
| `build/` | 보고서 명세(`spec.json`), 생성기, 쪽 나눔 측정, 수치 교차검증 스크립트 |

## 작성 방식
1. 기본계획 3종('20, '22-24, '25-26), 대입 공정성 강화 방안('19.11.), 2028 대입개편 확정안('23.12.), 2028학년도 시행계획 주요사항, 선정 결과, 2026 대학알리미 공시 4종을 자료로 사용
2. 4개 관점을 서로 독립된 분석으로 수행(`analysis/`)
3. 취합 단계에서 핵심 수치를 `build/verify_figures.py`로 원자료에서 다시 산출해 대조하고, 관점 간 상충 사항을 정리해 보고서로 통합

## 다시 만들기
원자료 텍스트 변환본 폴더를 인자로 수치 검증: `python3 -I build/verify_figures.py <자료 txt 폴더>`
보고서 생성: `build/build.sh` (Playwright 필요, 결과는 `build/report.html`, `build/report.pdf`)
