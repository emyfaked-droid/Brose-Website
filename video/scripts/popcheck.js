// Lists the biggest frame-to-frame accelerations per figure, to catch pops.
const { openPage } = require('./lib');
(async () => {
  const { browser, page } = await openPage();
  const res = await page.evaluate(() => window.popCheck());
  for (const r of res) console.log(r.fig.padEnd(4), r.top.map(s => `${s.t}s ${s.joint} ${s.acc}`).join(' | '));
  await browser.close();
})();
