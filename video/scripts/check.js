// Numeric foot-lock check across the whole film (and the walk test figure).
const { openPage } = require('./lib');
(async () => {
  const { browser, page } = await openPage();
  const res = await page.evaluate(() => window.footCheck());
  console.table(res);
  const bad = res.filter(r => r.maxReachError > 0.5 || r.maxPlantedDriftPerTick > 0.05 || r.lowestSwingFoot < -0.01);
  console.log(bad.length ? 'FOOT LOCK PROBLEMS: ' + bad.map(b => b.fig).join(', ') : 'foot lock OK: planted feet never slide, legs always reach');
  await browser.close();
  if (bad.length) process.exitCode = 2;
})();
