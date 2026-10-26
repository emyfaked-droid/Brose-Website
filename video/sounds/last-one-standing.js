// Sound timeline for 'Pick A Color' (last one standing): wind from the abyss, a deep rumble, stone cracking and
// crumbling ring by ring, a whoosh for every fall, a small UI pop for every grey cross, quick footsteps,
// a big crash when the pillar splits, a short cheer at the end.
const FILES = {
  'winter_wind.mp3':     { search: '"low wind ambience"', use: 'bed: wind up from the abyss (-36 dB)' },
  'rumble_low.mp3':      { search: '"earthquake rumble low"', use: 'the first rumble at 2 s, smaller ones before each ring (stand-in generated)' },
  'stone_crack.mp3':     { search: '"stone cracking"', use: 'the cracks running through each ring and the pillar (stand-in generated)' },
  'rock_crumble.mp3':    { search: '"rocks crumbling falling"', use: 'each ring breaking away (stand-in generated)' },
  'whoosh_soft.mp3':     { search: '"fall whoosh"', use: 'every fall into the abyss' },
  'ui_pop.mp3':          { search: '"ui pop click"', use: 'a dot turns into a grey cross (stand-in generated)' },
  'footsteps_street.mp3': { search: '"footsteps on stone" (single steps)', use: 'hectic steps, cut out one by one' },
  'stone_crash.mp3':     { search: '"rock break crash"', use: 'the pillar splits (stand-in generated)' },
  'cheer_short.mp3':     { search: '"short cheer yay"', use: 'the winner (stand-in generated)' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'winter_wind.mp3', at: 0, dur: END, vol: -36, fadeIn: 0.8, fadeOut: 1.0, loop: true });
  add({ file: 'rumble_low.mp3', at: S.rumble - 0.15, vol: -13, fadeOut: 0.6 });
  S.crack.forEach((t, k) => {
    if (k > 0) add({ file: 'rumble_low.mp3', at: t - 0.1, vol: -21, fadeOut: 0.6, offset: 0.2 });
    add({ file: 'stone_crack.mp3', at: t, vol: -19, align: 'onset', fadeOut: 0.2 });
  });
  for (let k = 0; k < 4; k++) {
    const ts = S.chunks.filter(c => c.k === k).map(c => c.t);
    add({ file: 'rock_crumble.mp3', at: ts[0], vol: -15, align: 'onset', fadeOut: 0.4 });
    add({ file: 'rock_crumble.mp3', at: ts[Math.floor(ts.length / 2)], vol: -20, offset: 0.25, fadeOut: 0.4, rate: 0.92 });
  }
  for (const f of S.falls) {
    add({ file: 'whoosh_soft.mp3', at: f.t + (f.k === 4 ? 0.5 : 0.05), vol: -16, rate: 0.85, fadeOut: 0.3, note: `${f.name} falls` });
    add({ file: 'ui_pop.mp3', at: f.pop, vol: -19, align: 'onset', note: `${f.name} x` });
  }
  let n = 0;
  for (const c of cues.steps) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    let vol = c.mood === 'shuffle' || c.type === 'shuffle' ? -31 : c.mood === 'leap' ? -21 : -27;
    if (c.type === 'settle') vol -= 4;
    add({ file: 'footsteps_street.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1.05 + jitter * 0.06, align: 'onset', fadeOut: 0.05, note: `${c.fig} ${c.type}` });
  }
  add({ file: 'stone_crack.mp3', at: S.pcrack0, vol: -16, align: 'onset', fadeOut: 0.3 });
  add({ file: 'stone_crash.mp3', at: S.tip, vol: -9, align: 'onset', fadeOut: 0.6 });
  add({ file: 'rumble_low.mp3', at: S.tip, vol: -17, offset: 0.3, fadeOut: 0.8 });
  add({ file: 'cheer_short.mp3', at: S.cheer, vol: -14, fadeOut: 0.3 });
  return C;
}

module.exports = { FILES, timeline };
