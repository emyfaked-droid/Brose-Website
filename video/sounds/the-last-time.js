// Sound timeline for 'The Last Time': steps on wood, a child giggling (2016, 2018), the child's door creaking, the
// sofa, music leaking from headphones as the teenager walks past, the front door falling shut, then only a clock.
const FILES = {
  'room_tone.mp3':      { search: '"quiet room tone"', use: 'bed, quieter every year' },
  'footsteps_wood.mp3': { search: '"footsteps wooden floor"', use: 'every heel contact, cut out one by one' },
  'laughter.mp3':       { search: '"toddler giggle" / "child laughing"', use: 'the child giggling in 2016 and 2018 (played higher)' },
  'door_open.mp3':      { search: '"door creak open"', use: 'the child\'s door' },
  'couch_creak.mp3':    { search: '"sofa creak"', use: 'he lifts the sleeping child off the sofa' },
  'party_music.mp3':    { search: '"music from headphones"', use: 'very quiet, thin, while the teenager walks past' },
  'door_close.mp3':     { search: '"front door close"', use: 'the front door falls shut' },
  'clock_tick.mp3':     { search: '"wall clock ticking"', use: 'only this in 2026' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end, [c1, c2, c3, c4] = S.cuts;
  add({ file: 'room_tone.mp3', at: 0, dur: c4, vol: -31, fadeIn: 0.5, fadeOut: 0.6, loop: true });
  add({ file: 'room_tone.mp3', at: c4, dur: END - c4, vol: -36, fadeIn: 0.4, fadeOut: 1.2, loop: true, offset: 4 });
  let n = 0;
  for (const c of cues.steps) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: (c.type === 'shuffle' ? -28 : c.mood === 'heavy' ? -20 : c.teen ? -22 : -24) + jitter * 2, rate: 1 + jitter * 0.04, align: 'onset', fadeOut: 0.06 });
  }
  // 2016: a giggle when it goes up, again in the swing
  add({ file: 'laughter.mp3', at: 1.25, dur: 1.4, vol: -19, rate: 1.55, fadeIn: 0.05, fadeOut: 0.4 });
  add({ file: 'door_open.mp3', at: 2.75, dur: c1 + 0.2 - 2.75, vol: -21, fadeOut: 0.3 });
  // 2018: both laughing while he spins
  add({ file: 'laughter.mp3', at: c1 + 0.2, dur: c2 - c1 - 0.3, vol: -18, rate: 1.4, offset: 0.6, fadeIn: 0.2, fadeOut: 0.5 });
  // 2021: the sofa, the child's door again
  add({ file: 'couch_creak.mp3', at: S.lift3 - 0.05, vol: -20, fadeOut: 0.3 });
  add({ file: 'door_open.mp3', at: 9.0, dur: c3 + 0.2 - 9.0, vol: -23, rate: 0.95, fadeOut: 0.3 });
  // 2024: tinny music passing by, the front door
  add({ file: 'party_music.mp3', at: c3 - 0.2, dur: S.out4 - c3 + 0.4, vol: -33, filter: 'highpass=f=900,lowpass=f=5000', fadeIn: 0.6, fadeOut: 0.3 });
  add({ file: 'door_close.mp3', at: S.out4 + 0.15, vol: -15, align: 'onset', fadeOut: 0.3 });
  // 2026: only the clock
  for (let i = 0, t = c4 + 0.3; t < END - 0.5; i++, t += 1) add({ file: 'clock_tick.mp3', slice: i % 8, at: t, vol: -25, align: 'onset', fadeOut: 0.05 });
  return C;
}

module.exports = { FILES, timeline };
