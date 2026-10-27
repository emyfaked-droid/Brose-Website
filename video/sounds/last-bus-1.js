// Sound for last-bus-1: the narrator is the main track; only quiet atmosphere underneath, no music.
// A real recording named like the key (.mp3 wins over the generated .wav) replaces a stand-in automatically.
const FILES = {
  'voice_lastbus1.mp3':  { search: '(ElevenLabs narration, final)', use: 'main track, starts at 0.0' },
  'bus_engine.wav':      { search: '"bus interior ambience night" / "inside bus engine idle"', use: 'bed under the whole film, -30 dB' },
  'brake_squeal.wav':    { search: '"bus air brake squeal"', use: 'the bus stops at 6.19' },
  'neon_buzz.wav':       { search: '"fluorescent light hum"', use: 'faint tube hum, louder at the flicker' },
  'neon_flicker_off.wav':{ search: '"fluorescent light flicker"', use: 'the flicker at the cut to the empty seats (22.71)' },
  'scared_breath.wav':   { search: '"nervous breathing" / "scared breathing close"', use: 'A frozen, from 30.85' },
  'bass_pulse.wav':      { search: '"deep sub bass pulse horror"', use: 'the question at the end, from 34.39' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'voice_lastbus1.mp3', at: 0, vol: 0, note: 'narrator' });
  // engine bed: steady, a little quieter while the bus waits at the stop, fades low in the frozen end
  add({ file: 'bus_engine.wav', at: 0, dur: S.brake + 1.2, vol: -30, loop: true, fadeOut: 1.0 });
  add({ file: 'bus_engine.wav', at: S.brake + 0.4, dur: S.go1 - S.brake, vol: -35, loop: true, offset: 2.0, fadeIn: 0.8, fadeOut: 1.0 });
  add({ file: 'bus_engine.wav', at: S.go0, dur: S.freeze - S.go0 + 1.0, vol: -30, loop: true, offset: 4.0, fadeIn: 1.5, fadeOut: 1.0 });
  add({ file: 'bus_engine.wav', at: S.freeze, dur: END - S.freeze, vol: -38, loop: true, offset: 1.0, fadeIn: 0.8, fadeOut: 0.3 });
  add({ file: 'brake_squeal.wav', at: S.brake, vol: -22, fadeOut: 0.3 });
  add({ file: 'neon_buzz.wav', at: 0, dur: END, vol: -38, loop: true, fadeOut: 0.3 });
  add({ file: 'neon_buzz.wav', at: S.empty, dur: 1.2, vol: -26, offset: 1.0, fadeIn: 0.02, fadeOut: 0.5 });
  add({ file: 'neon_flicker_off.wav', at: S.empty, dur: 0.6, vol: -20, fadeOut: 0.15 });
  add({ file: 'scared_breath.wav', at: S.touch0, dur: END - S.touch0, vol: -26, loop: true, fadeIn: 0.6, fadeOut: 0.3 });
  add({ file: 'bass_pulse.wav', at: S.freeze, dur: END - S.freeze, vol: -20, loop: true, fadeIn: 0.05, fadeOut: 0.2 });
  return C;
}

module.exports = { FILES, timeline };
