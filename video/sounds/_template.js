// Sound timeline for one film. `npm run new -- <name>` copies this to sounds/<name>.js.
// scripts/mix.js loads it automatically for FILM=<name> (no need to touch sound-timeline.js).
//
// FILES: every file the film uses (in sfx/). `search` = what to look for on Pixabay / Freesound
//        (CC0 or royalty-free). A real recording named like the key (.mp3 wins over .wav) replaces
//        the generated stand-in automatically.
// timeline(S, cues): S = the film's STORY object (T), cues.steps = heel contacts from the walk planner
//        ({ t, frame, fig, side, type: 'step'|'settle'|'shuffle', mood }).
//
// Cue fields: file, at (s), vol (dB), dur, offset, fadeIn, fadeOut, loop, rate, filter (ffmpeg),
//             align: 'onset' (the transient lands exactly on `at`), slice: n (use the n-th single hit
//             cut out of a footsteps_* / clock_* file).
const FILES = {
  'room_tone.mp3':      { search: '"quiet room tone"', use: 'bed under the whole film, -32 dB' },
  'footsteps_wood.mp3': { search: '"footsteps wooden floor" (single steps with gaps)', use: 'heel contacts, cut out one by one' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -32, fadeIn: 0.5, fadeOut: 1.0, loop: true });
  let n = 0;
  for (const c of cues.steps) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;           // small variation so no two steps sound the same
    let vol = c.type === 'shuffle' ? -26 : c.mood === 'heavy' ? -17 : -19;
    if (c.type === 'settle') vol -= 4;
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1 + jitter * 0.04,
          align: 'onset', fadeOut: 0.06, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }
  return C;
}

module.exports = { FILES, timeline };
