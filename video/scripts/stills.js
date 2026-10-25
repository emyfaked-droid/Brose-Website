// Render still frames at given times (default: the key story beats) to build/stills.
// usage: node scripts/stills.js [t1 t2 ...]
const fs = require('fs');
const path = require('path');
const { ROOT, openPage, frame } = require('./lib');

(async () => {
  const { browser, page } = await openPage();
  const T = await page.evaluate(() => window.STORY);
  let times = process.argv.slice(2).map(Number);
  if (!times.length) {
    times = [0.5, T.clink, T.aWalk + 0.3, T.ask0 + 0.6, T.nod + 0.15, T.laugh0 + 0.5,
      T.cut1 + 0.05, T.hWalk + 1.2, T.sitHit, T.maskGrab + 0.5, T.slump1 + 0.3,
      T.morn + 0.6, T.stand0 + 0.5, T.pick, T.straight0 + 0.25, T.mWalk + 0.5, T.end - 0.9];
  }
  const dir = path.join(ROOT, 'build', 'stills');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    const f = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
    fs.writeFileSync(f, await frame(page, t));
    console.log(f);
  }
  console.log(JSON.stringify(T, (k, v) => typeof v === 'number' ? +v.toFixed(3) : v));
  await browser.close();
})();
