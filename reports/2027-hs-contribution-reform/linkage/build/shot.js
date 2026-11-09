const { chromium } = require('playwright');
(async () => {
  const [src, pdf] = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 900, height: 1200 } });
  await pg.goto('file://' + src); await pg.waitForTimeout(1500); await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(500);
  await pg.pdf({ path: pdf, format: 'A4', printBackground: true });
  const m = await b.newPage({ viewport: { width: 400, height: 860 }, colorScheme: 'dark' });
  await m.goto('file://' + src); await m.waitForTimeout(1500);
  await m.screenshot({ path: pdf.replace('.pdf', '_mobile_dark.png') });
  console.log('scrollWidth', await m.evaluate(() => document.documentElement.scrollWidth));
  await b.close();
})();
