// Sound for last-bus-2: the narrator is the main track; underneath almost silence, no music.
// A real recording named like the key (.mp3 wins over the generated .wav) replaces a stand-in automatically.
const FILES = {
  'voice_lastbus2.mp3':   { search: '(ElevenLabs narration, final)', use: 'main track, starts at 0.0' },
  'bus_engine.wav':       { search: '"bus interior ambience night"', use: 'night part (until the black), -30 dB' },
  'scared_breath.wav':    { search: '"nervous breathing"', use: 'A with his eyes shut (night part)' },
  'brake_squeal.wav':     { search: '"bus air brake squeal"', use: 'soft dip at "one" and "two"' },
  'whoosh_soft.mp3':      { search: '"soft whoosh"', use: 'the lamp light sweeping through at "one" and "two"' },
  'winter_wind.mp3':      { search: '"wind in empty warehouse"', use: 'the depot hall, quiet' },
  'pigeon_flutter.wav':   { search: '"pigeons flying off warehouse"', use: 'daylight cut (6.84)' },
  'footsteps_metal.wav':  { search: '"footsteps metal floor creak" (single steps with gaps)', use: 'A walking in the rusty bus' },
  'bench_creak.wav':      { search: '"old seat creak"', use: 'A stands up' },
  'low_drone.wav':        { search: '"low horror drone"', use: 'from 25.31, swelling; cut at 29.49' },
  'neon_flicker_off.wav': { search: '"fluorescent light flicker"', use: 'the dead tube flickers (33.60)' },
  'neon_buzz.wav':        { search: '"fluorescent light hum"', use: 'crackle under the flicker' },
  'bass_pulse.wav':       { search: '"deep sub bass pulse"', use: 'the end card' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end, HUSH = S.empty, BACK = S.down - 0.4;
  add({ file: 'voice_lastbus2.mp3', at: 0, vol: 0, note: 'narrator' });
  // night: engine, held breath, the two counted stops
  add({ file: 'bus_engine.wav', at: 0, dur: S.black1, vol: -30, loop: true, offset: 1.0, fadeOut: 0.6 });
  add({ file: 'scared_breath.wav', at: 0, dur: S.black1, vol: -26, loop: true, offset: 0.8, fadeOut: 0.6 });
  add({ file: 'bass_pulse.wav', at: 0, dur: 2.4, vol: -24, offset: 0.0, fadeOut: 1.2 });
  for (const b of S.beats) {
    add({ file: 'whoosh_soft.mp3', at: b - 0.1, vol: -26, fadeOut: 0.2 });
    add({ file: 'brake_squeal.wav', at: b + 0.05, dur: 0.9, vol: -33, offset: 0.15, fadeIn: 0.1, fadeOut: 0.4 });
  }
  // the depot: wind, pigeons, steps
  add({ file: 'winter_wind.mp3', at: S.day, dur: HUSH - S.day, vol: -34, loop: true, fadeIn: 0.05, fadeOut: 0.05 });
  add({ file: 'pigeon_flutter.wav', at: S.day + 0.05, vol: -20, fadeOut: 0.5 });
  add({ file: 'bench_creak.wav', at: S.stand0 + 0.3, vol: -26, fadeOut: 0.3 });
  let n = 0;
  for (const c of cues.steps) {
    if (c.t < S.day) continue;
    const vol = c.type === 'shuffle' ? -27 : -21;
    add({ file: 'footsteps_metal.wav', slice: n++, at: c.t, vol, align: 'onset', fadeOut: 0.08, note: `${c.fig} ${c.side} ${c.type}` });
  }
  // the reflection: drone swells, then a moment of complete silence
  add({ file: 'low_drone.wav', at: S.ghosts, dur: HUSH - S.ghosts, vol: -20, loop: true, fadeIn: 3.5, fadeOut: 0.03 });
  add({ file: 'winter_wind.mp3', at: BACK, dur: S.out0 + 0.6 - BACK, vol: -38, loop: true, offset: 3.0, fadeIn: 0.8, fadeOut: 0.6 });
  add({ file: 'low_drone.wav', at: BACK, dur: END - BACK, vol: -26, loop: true, offset: 2.0, fadeIn: 1.5, fadeOut: 0.3 });
  // the dead tube flickers
  add({ file: 'neon_flicker_off.wav', at: S.flick, vol: -19, fadeOut: 0.2 });
  add({ file: 'neon_buzz.wav', at: S.flick, dur: 0.5, vol: -27, fadeIn: 0.01, fadeOut: 0.2 });
  // end card
  add({ file: 'bass_pulse.wav', at: S.out0, dur: END - S.out0, vol: -21, loop: true, fadeOut: 0.2 });
  return C;
}

module.exports = { FILES, timeline };
