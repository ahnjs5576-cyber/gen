// 블록 높이를 실측해 A4 한 쪽(본문 가용 높이)을 넘기 직전에 쪽 나눔 위치를 계산
const { chromium } = require('playwright');
(async () => {
  const [src] = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await pg.emulateMedia({ media: 'print' }); await pg.goto('file://' + src); await pg.waitForTimeout(1500); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
  const breaks = await pg.evaluate(() => {
    const mm = 96 / 25.4, avail = (297 - 25 - 30) * mm - 28;
    const keep = new Set(['box', 'chapter', 'subchapter', 'tablecaption', 'roman', 'section']);
    const out = [];
    for (const page of document.querySelectorAll('section.page')) {
      const top0 = page.getBoundingClientRect().top + 25 * mm + window.scrollY*0;
      const blks = [...page.querySelectorAll(':scope > .blk')];
      let start = top0;
      for (let k = 0; k < blks.length; k++) {
        const r = blks[k].getBoundingClientRect();
        if (r.bottom - start > avail) {
          let j = k;
          while (j > 0 && keep.has(blks[j - 1].dataset.t)) j--;
          if (blks[j].getBoundingClientRect().top - start < 50) j = k; // 무한 루프 방지
          out.push(+blks[j].dataset.i);
          start = blks[j].getBoundingClientRect().top;
        }
      }
    }
    return out;
  });
  console.log(JSON.stringify(breaks));
  await b.close();
})();
