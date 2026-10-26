// Sound timeline for 'Stop Watching The Time': room tone, the sand (loud while she watches it, quiet while they
// dance, gone when it has run out), the chairs, slow steps.
const FILES = {
  'room_tone.mp3':        { search: '"quiet room tone"', use: 'bed under the whole film, -32 dB' },
  'sand_trickle.mp3':     { search: '"hourglass sand trickle"', use: 'the hourglass: -19 dB while she watches it, -33 dB while they dance (stand-in generated)' },
  'chair_scrape.mp3':     { search: '"chair scrape wooden floor"', use: 'he gets up, she gets up (stand-in generated)' },
  'footsteps_wood.mp3':   { search: '"footsteps wooden floor" (single steps with gaps)', use: 'heel contacts, cut out one by one' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -32, fadeIn: 0.5, fadeOut: 1.0, loop: true });
  // the sand: one loud stretch, then a quiet one up to the last grain
  add({ file: 'sand_trickle.mp3', at: 0, dur: S.stand0 + 1.0, vol: -19, fadeIn: 0.6, fadeOut: 2.2, loop: true });
  add({ file: 'sand_trickle.mp3', at: S.stand0 + 0.2, dur: S.sand1 - S.stand0 - 0.1, vol: -33, fadeIn: 1.2, fadeOut: 0.4, loop: true, offset: 2.5 });
  add({ file: 'chair_scrape.mp3', at: S.stand0 + 0.1, vol: -17, fadeOut: 0.15 });
  add({ file: 'chair_scrape.mp3', at: S.pull0 + 0.15, vol: -19, rate: 1.08, fadeOut: 0.15 });
  let n = 0;
  for (const c of cues.steps) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    let vol = c.type === 'shuffle' ? -29 : -24;
    if (c.t > S.dance0) vol -= 2;                              // soft little dance steps
    if (c.type === 'settle') vol -= 4;
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1 + jitter * 0.04, align: 'onset', fadeOut: 0.06, note: `${c.fig} ${c.side} ${c.type}` });
  }
  return C;
}

module.exports = { FILES, timeline };
