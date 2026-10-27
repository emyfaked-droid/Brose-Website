// Sound timeline for noise-cancel-explained. The voice-over is the main track; everything else sits far below it.
// The street noise cuts out completely at "cancel out" (real silence, only room tone), and is back at full level at 0.0.
const FILES = {
  'voice_noisecancel.mp3': { search: '(ElevenLabs voice-over, 24.53 s)', use: 'the narration, starts at 0.0, main track' },
  'traffic_distant.mp3':   { search: '"city traffic ambience"', use: 'street noise until "cancel out"' },
  'crowd_murmur.mp3':      { search: '"crowd murmur street"', use: 'street noise until "cancel out"' },
  'car_pass_far.mp3':      { search: '"car passing by"', use: 'a car right at the start (the hook)' },
  'room_tone.mp3':         { search: '"quiet room tone"', use: 'what is left after the noise is gone' },
  'whoosh_soft.mp3':       { search: '"soft whoosh"', use: 'zoom into the wave / back out to the street' },
  'deep_release.mp3':      { search: '"deep soft impact" / "sub drop calm"', use: 'the waves cancel out' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end, CUT = S.cancel;
  add({ file: 'voice_noisecancel.mp3', at: 0, vol: 0 });                                    // main track
  // street noise: loud from frame 0 (no fade-in), gone at once when the waves cancel
  add({ file: 'traffic_distant.mp3', at: 0, dur: CUT, vol: -23, loop: true, fadeOut: 0.06 });
  add({ file: 'crowd_murmur.mp3', at: 0, dur: CUT, vol: -27, loop: true, fadeOut: 0.06 });
  add({ file: 'car_pass_far.mp3', at: 0, dur: 2.4, vol: -24, fadeOut: 0.5 });
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -40, loop: true });
  // camera moves
  add({ file: 'whoosh_soft.mp3', at: S.s2, vol: -28 });
  add({ file: 'whoosh_soft.mp3', at: S.s7, vol: -30, rate: 0.9 });
  // the cancel: a soft, deep release
  add({ file: 'deep_release.mp3', at: CUT - 0.02, vol: -22, align: 'onset' });
  return C;
}

module.exports = { FILES, timeline };
