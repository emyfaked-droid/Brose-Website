// Render the animation frame by frame in headless Chromium and pipe the frames
// into ffmpeg (libx264, yuv420p, crf 17). Also writes build/cues.json with the
// story times and every heel-contact frame for the sound mix.
//
// usage: node scripts/render.js [--out build/video.mp4] [--from 0] [--to <end>]
//                               [--test walk --mood heavy]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { ROOT, openPage, frame } = require('./lib');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };

(async () => {
  const test = opt('test', null);
  const track = args.includes('--track');
  const query = test ? `&test=${test}&mood=${opt('mood', 'heavy')}${track ? '&track=1' : ''}` : '';
  const { browser, page } = await openPage(query);
  const fps = await page.evaluate(() => window.FPS);
  const duration = await page.evaluate(() => window.DURATION);
  const from = parseFloat(opt('from', '0'));
  const to = parseFloat(opt('to', String(duration)));
  const out = path.resolve(ROOT, opt('out', test ? `build/walktest-${opt('mood', 'heavy')}${track ? '-tracking' : ''}.mp4` : 'build/video.mp4'));
  fs.mkdirSync(path.dirname(out), { recursive: true });

  if (!test) {
    const cues = await page.evaluate(() => window.getCues());
    fs.writeFileSync(path.join(ROOT, 'build', 'cues.json'), JSON.stringify(cues, null, 2));
  }

  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'png', '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exited ' + c))));

  // several pages render frames in parallel; frames are written to ffmpeg in order
  const workers = parseInt(opt('workers', String(Math.max(1, Math.min(6, require('os').cpus().length)))), 10);
  const pages = [page];
  for (let i = 1; i < workers; i++) pages.push((await openPage(query, browser)).page);
  const ready = new Map();
  let next = f0, wrote = f0, wake = null;
  const t0 = Date.now();
  const worker = async pg => {
    while (next < f1) {
      while (next - wrote > workers * 4) await new Promise(r => setTimeout(r, 5));   // bounded look-ahead
      if (next >= f1) break;
      const f = next++;
      ready.set(f, await frame(pg, f / fps));
      if (wake) wake();
    }
  };
  const writer = (async () => {
    while (wrote < f1) {
      if (!ready.has(wrote)) { await new Promise(r => { wake = r; }); wake = null; continue; }
      const png = ready.get(wrote); ready.delete(wrote);
      if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
      if ((wrote - f0) % 60 === 0) process.stdout.write(`\rframe ${wrote - f0 + 1}/${f1 - f0}`);
      wrote++;
    }
  })();
  await Promise.all([...pages.map(worker), writer]);
  ff.stdin.end();
  await done;
  await browser.close();
  console.log(`\nwrote ${path.relative(ROOT, out)} (${f1 - f0} frames, ${((Date.now() - t0) / 1000).toFixed(1)}s)`);
})().catch(e => { console.error(e); process.exit(1); });
