// Mix the SFX timeline with ffmpeg and mux it onto the rendered video.
//
//  1. reads build/cues.json (story times + heel-contact frames, written by render.js)
//  2. cuts single hits out of footsteps_wood / clock_tick (onset detection)
//  3. builds one ffmpeg filter graph: atrim, volume, afade, adelay per cue, then amix
//  4. measures loudness (EBU R128) and normalises to -14 LUFS, limiter at -1.5 dBTP
//  5. muxes the mix onto the video as AAC 192k
//
// usage: node scripts/mix.js [--sfx sfx] [--video build/video.mp4] [--out out/ask-twice.mp4]
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { FILES, timeline, TARGET_LUFS, CEILING_DBTP } = require('../sound-timeline');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : def; };
const SFX = path.resolve(ROOT, opt('sfx', 'sfx'));
const VIDEO = path.resolve(ROOT, opt('video', 'build/video.mp4'));
const OUT = path.resolve(ROOT, opt('out', 'out/ask-twice.mp4'));
const BUILD = path.join(ROOT, 'build');
const SR = 48000;

function run(cmd, a, o = {}) {
  const r = spawnSync(cmd, a, { maxBuffer: 1 << 30, ...o });
  if (r.status !== 0) { console.error(String(r.stderr || '').slice(-3000)); throw new Error(`${cmd} failed`); }
  return r;
}

// ------------------------------------------------------------ analysis
const decoded = {};
function decode(file) {   // mono float32 at 48 kHz
  if (!decoded[file]) {
    const r = run('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', String(SR), '-f', 'f32le', '-']);
    const b = r.stdout;
    decoded[file] = new Float32Array(b.buffer, b.byteOffset, b.length / 4);
  }
  return decoded[file];
}
const duration = file => decode(file).length / SR;

// Transient onsets: peak envelope on 2.5 ms hops, rising through a threshold
// after the signal has been quiet for at least minGap seconds.
function onsets(file, { minGap = 0.12, rel = 0.12 } = {}) {
  const x = decode(file), hop = 120, n = Math.floor(x.length / hop), env = new Float32Array(n);
  let max = 0;
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * hop; j < (i + 1) * hop; j++) { const v = Math.abs(x[j]); if (v > m) m = v; } env[i] = m; if (m > max) max = m; }
  const sorted = Array.from(env).sort((a, b) => a - b), floor = sorted[Math.floor(n * 0.2)] || 0;
  const thr = Math.max(max * rel, floor * 5, 1e-4);
  const out = []; let quiet = Infinity, armed = true;
  for (let i = 0; i < n; i++) {
    if (env[i] < thr * 0.5) quiet += hop / SR; else if (env[i] < thr) { /* hysteresis band */ } else quiet = 0;
    if (armed && env[i] >= thr) {
      // walk back to where the transient actually starts
      let k = i; while (k > 0 && env[k - 1] > thr * 0.25 && i - k < 8) k--;
      let pk = 0; for (let j = i; j < Math.min(n, i + 40); j++) pk = Math.max(pk, env[j]);
      out.push({ t: k * hop / SR, peak: pk });
      armed = false;
    }
    if (!armed && quiet >= minGap) armed = true;
  }
  return out;
}
const firstOnset = (file, from = 0) => { const o = onsets(file, { rel: 0.08 }).find(o => o.t >= from - 1e-3); return o ? o.t : from; };

// Cut single hits (steps, ticks) out of a recording; level-match them.
const sliceCache = {};
function slices(file, kind) {
  if (sliceCache[file]) return sliceCache[file];
  const cfg = kind === 'clock' ? { minGap: 0.25, rel: 0.2, maxLen: 0.28 } : { minGap: 0.18, rel: 0.15, maxLen: 0.5 };
  let on = onsets(file, cfg);
  const total = duration(file);
  const maxPk = Math.max(...on.map(o => o.peak));
  const list = [];
  on.forEach((o, i) => {
    if (o.peak < maxPk * 0.3) return;
    const start = Math.max(0, o.t - 0.004);
    const next = i + 1 < on.length ? on[i + 1].t - 0.012 : total;
    const dur = Math.min(cfg.maxLen, next - start);
    if (dur < 0.06) return;
    list.push({ start, dur, peak: o.peak });
  });
  if (!list.length) throw new Error(`no usable hits found in ${path.basename(file)}`);
  const med = list.map(s => s.peak).sort((a, b) => a - b)[Math.floor(list.length / 2)];
  const dir = path.join(BUILD, 'sfx_slices'); fs.mkdirSync(dir, { recursive: true });
  const base = path.basename(file, path.extname(file));
  const res = list.map((s, i) => {
    const out = path.join(dir, `${base}_${String(i).padStart(2, '0')}.wav`);
    // atrim on the decoded stream, not input seeking: -ss on MP3 is off by the encoder delay (~30 ms)
    run('ffmpeg', ['-v', 'error', '-y', '-i', file,
      '-af', `aresample=${SR},atrim=start=${s.start.toFixed(5)}:duration=${s.dur.toFixed(5)},asetpts=PTS-STARTPTS,afade=t=out:st=${(s.dur - 0.04).toFixed(4)}:d=0.04`, '-c:a', 'pcm_s24le', out]);
    return { file: out, gainDb: 20 * Math.log10(med / s.peak), lead: 0.004 };   // slices start 4 ms before the hit
  });
  console.log(`  ${path.basename(file)}: ${res.length} hits cut out`);
  return (sliceCache[file] = res);
}

// ------------------------------------------------------------ main
function loudness(file) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  const s = r.stderr;
  const I = parseFloat((s.match(/I:\s+(-?[\d.]+|-inf) LUFS/) || [])[1]);
  const TP = parseFloat((s.match(/Peak:\s+(-?[\d.]+|-inf) dBFS/) || [])[1]);
  const LRA = parseFloat((s.match(/LRA:\s+(-?[\d.]+) LU/) || [])[1]);
  return { I, TP, LRA };
}

(function main() {
  const cuesFile = path.join(BUILD, 'cues.json');
  if (!fs.existsSync(cuesFile)) { console.error('build/cues.json missing: run `node scripts/render.js` first'); process.exit(1); }
  const cues = JSON.parse(fs.readFileSync(cuesFile, 'utf8'));
  const S = cues.story, DUR = cues.duration;

  // any of these formats is fine, e.g. party_music.wav instead of party_music.mp3
  const resolve = name => {
    const base = name.replace(/\.[a-z0-9]+$/i, '');
    for (const ext of ['.mp3', '.wav', '.ogg', '.flac', '.m4a']) if (fs.existsSync(path.join(SFX, base + ext))) return path.join(SFX, base + ext);
    return null;
  };
  const missing = Object.keys(FILES).filter(f => !resolve(f));
  if (missing.length) {
    console.error(`Missing ${missing.length} sound file(s) in ${path.relative(process.cwd(), SFX) || '.'}:`);
    for (const f of missing) console.error(`  ${f.padEnd(22)} search: ${FILES[f].search}`);
    console.error('See sfx/README.md.');
    process.exit(1);
  }

  const list = timeline(S, cues);
  console.log(`${list.length} cues`);
  const inputs = [], chains = [], sheet = [];
  list.forEach((c, i) => {
    let src = resolve(c.file), start = c.offset || 0, gain = c.vol || 0, lead = 0;
    if (c.slice !== undefined) {
      const sl = slices(src, c.file.startsWith('clock') ? 'clock' : 'steps');
      const pick = sl[c.slice % sl.length];   // consecutive cues cycle through different hits
      src = pick.file; start = 0; gain += pick.gainDb; lead = c.align === 'onset' ? pick.lead : 0;
    } else if (c.align === 'onset') {
      lead = firstOnset(src, start) - start;
    }
    const rate = c.rate || 1;
    let delay = c.at - lead / rate;
    if (delay < 0) { start += -delay * rate; delay = 0; }
    const srcLen = duration(src);
    let dur = c.dur !== undefined ? c.dur : (srcLen - start) / rate;
    if (!c.loop) dur = Math.min(dur, (srcLen - start) / rate);
    dur = Math.min(dur, DUR - delay);
    if (dur <= 0.01) return;
    if (c.loop) inputs.push('-stream_loop', '-1');
    inputs.push('-i', src);
    const idx = inputs.filter(a => a === '-i').length - 1;
    const f = [`aresample=${SR}`, `atrim=start=${start.toFixed(5)}:duration=${(dur * rate).toFixed(5)}`, 'asetpts=PTS-STARTPTS', 'aformat=sample_fmts=fltp:channel_layouts=stereo'];
    if (rate !== 1) f.push(`asetrate=${Math.round(SR * rate)}`, `aresample=${SR}`);
    if (c.filter) f.push(c.filter);
    f.push(`volume=${gain.toFixed(2)}dB`);
    if (c.fadeIn) f.push(`afade=t=in:st=0:d=${c.fadeIn}`);
    if (c.fadeOut) f.push(`afade=t=out:st=${Math.max(0, dur - c.fadeOut).toFixed(4)}:d=${c.fadeOut}`);
    const ms = Math.round(delay * 1000);
    if (ms > 0) f.push(`adelay=${ms}:all=1`);
    chains.push(`[${idx}:a]${f.join(',')}[c${idx}]`);
    sheet.push({ time: +c.at.toFixed(3), frame: Math.round(c.at * cues.fps), file: c.file + (c.slice !== undefined ? `#${c.slice}` : ''), vol: +gain.toFixed(1), fadeIn: c.fadeIn || 0, fadeOut: c.fadeOut || 0, dur: +dur.toFixed(3), note: c.note || '' });
  });
  const n = chains.length;
  const graph = chains.join(';\n') + ';\n' + chains.map((_, i) => `[c${i}]`).join('') +
    `amix=inputs=${n}:normalize=0:dropout_transition=0,apad=whole_dur=${DUR},atrim=0:${DUR}[mix]`;
  fs.mkdirSync(BUILD, { recursive: true });
  fs.writeFileSync(path.join(BUILD, 'mix_graph.txt'), graph);
  fs.writeFileSync(path.join(BUILD, 'cue_sheet.json'), JSON.stringify(sheet.sort((a, b) => a.time - b.time), null, 1));

  const raw = path.join(BUILD, 'sfx_raw.wav');
  console.log('mixing...');
  run('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex_script', path.join(BUILD, 'mix_graph.txt'), '-map', '[mix]', '-ar', String(SR), '-c:a', 'pcm_f32le', raw]);

  // loudness: gain to target, then a true-peak-safe limiter; repeat once if the limiter moved the level
  const m0 = loudness(raw);
  console.log(`raw mix: ${m0.I} LUFS, true peak ${m0.TP} dBTP, LRA ${m0.LRA} LU`);
  const mixed = path.join(BUILD, 'sfx_mix.wav');
  let gain = TARGET_LUFS - m0.I, m = null;
  // limiter runs 4x oversampled so it catches inter-sample (true) peaks
  const limit = Math.pow(10, (CEILING_DBTP - 0.6) / 20);
  for (let pass = 0; pass < 3; pass++) {
    run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `aresample=${SR * 4},volume=${gain.toFixed(2)}dB,alimiter=limit=${limit.toFixed(4)}:attack=1.5:release=80:level=false:latency=1,aresample=${SR}`, '-ar', String(SR), '-c:a', 'pcm_s24le', mixed]);
    m = loudness(mixed);
    console.log(`  pass ${pass + 1}: gain ${gain.toFixed(2)} dB -> ${m.I} LUFS, true peak ${m.TP} dBTP`);
    if (Math.abs(m.I - TARGET_LUFS) <= 0.3) break;
    gain += TARGET_LUFS - m.I;
  }
  if (m.TP > CEILING_DBTP + 0.05) console.warn(`warning: true peak ${m.TP} dBTP above ${CEILING_DBTP}`);

  if (!fs.existsSync(VIDEO)) { console.error(`${path.relative(ROOT, VIDEO)} missing: run \`node scripts/render.js\` first`); process.exit(1); }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  run('ffmpeg', ['-v', 'error', '-y', '-i', VIDEO, '-i', mixed, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', String(SR), '-shortest', '-movflags', '+faststart', OUT]);
  const fin = loudness(OUT);
  console.log(`\nwrote ${path.relative(ROOT, OUT)}: ${fin.I} LUFS integrated, true peak ${fin.TP} dBTP (AAC 192k)`);
})();
