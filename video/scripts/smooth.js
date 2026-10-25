// Smoothness of a gait in the walk test: largest frame-to-frame acceleration (px/frame^2) of the main joints
// in the steady middle of the move. Lower and more even = cleaner, less choppy.
const { openPage } = require('./lib');
(async () => {
  for (const mood of process.argv.slice(2)) {
    const { browser, page } = await openPage(`&test=walk&mood=${mood}&track=1`);
    const r = await page.evaluate(() => {
      const F = window.__debug.WALKTEST.fig, w = F.moves[0], fps = 30;
      const a = Math.ceil((w.t0 + w.Ta + 0.3) * fps), b = Math.floor((w.t1 - w.Td - 0.3) * fps);
      const names = ['pelvis', 'neck', 'head', 'handL', 'handR', 'elbowL', 'elbowR', 'kneeL', 'kneeR', 'ankleL', 'ankleR'];
      const mx = Array(names.length).fill(0); let prev = null, prev2 = null;
      for (let f = a; f <= b; f++) {
        const J = F.pose(f / fps), P = [J.P, J.N, J.Hc, J.hand.L, J.hand.R, J.el.L, J.el.R, J.knee.L, J.knee.R, J.ank.L, J.ank.R];
        // relative to the pelvis' own motion, so only the limb movement counts
        const rel = P.map(p => [p[0] - J.P[0], p[2] - J.P[2]]);
        if (prev && prev2) rel.forEach((p, i) => { const ax = p[0] - 2 * prev[i][0] + prev2[i][0], az = p[1] - 2 * prev[i][1] + prev2[i][1]; mx[i] = Math.max(mx[i], Math.hypot(ax, az)); });
        prev2 = prev; prev = rel;
      }
      return Object.fromEntries(names.map((n, i) => [n, +mx[i].toFixed(1)]));
    });
    console.log(mood.padEnd(7), JSON.stringify(r));
    await browser.close();
  }
})();
