// prints knee flexion (deg), hip pitch (deg from vertical, + = thigh forward), pelvis height and swing foot height per frame for one walk stride
const { openPage } = require('./lib');
(async () => {
  const mood = process.argv[2] || 'walk';
  const { browser, page } = await openPage(`&test=walk&mood=${mood}&track=1`);
  const rows = await page.evaluate(() => {
    const F = window.__debug.WALKTEST.fig, w = F.moves[0], fps = 30, out = [];
    const t0 = w.t0 + w.Ta + 0.4, n = Math.round(1.1 * w.m.cad * 0 + 2 / w.m.cad * fps);
    for (let f = 0; f <= n; f++) {
      const t = t0 + f / fps, J = F.pose(t), s = 'R';
      const h = J.hip[s], k = J.knee[s], a = J.ank[s];
      const th = [k[0] - h[0], k[2] - h[2]], sh = [a[0] - k[0], a[2] - k[2]];
      const ang = (v) => Math.atan2(v[0], -v[1]) * 180 / Math.PI;
      const flex = ang(sh) * -1 + ang(th) * 1; // thigh fwd minus shin fwd
      out.push([f, +(ang(th)).toFixed(0), +(Math.abs(ang(th) - ang(sh))).toFixed(0), +(J.P[2]).toFixed(1), +(a[2]).toFixed(1), J.feet.R.planted ? 'S' : '.']);
    }
    return out;
  });
  console.log('frame thighFwd kneeFlex pelvisZ ankleZ stance'); rows.forEach(r => console.log(r.join('\t')));
  await browser.close();
})();
