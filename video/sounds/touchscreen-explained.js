// Sound timeline for touchscreen-explained. The voice-over is the main track; everything else sits far below it.
const FILES = {
  'voice_touchscreen.mp3': { search: '(ElevenLabs voice-over, 30.35 s)', use: 'the narration, starts at 0.0, main track' },
  'room_tone.mp3':         { search: '"quiet room tone"', use: 'very low bed so the pauses are not dead silent' },
  'phone_scroll.mp3':      { search: '"tap on phone screen" / "phone scrolling"', use: 'taps on the glass' },
  'whoosh_soft.mp3':       { search: '"soft whoosh"', use: 'camera moves into / out of the phone' },
  'neon_buzz.mp3':         { search: '"electric hum" / "low electrical buzz"', use: 'the charged grid, very quiet' },
  'lock_click.mp3':        { search: '"UI confirm click"', use: 'crosshair lock and TOUCH ✓' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'voice_touchscreen.mp3', at: 0, vol: 0 });                                    // main track
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -40, loop: true });
  // annoyed mitten taps (a short slice of the scroll sound each)
  S.taps.forEach((t, i) => add({ file: 'phone_scroll.mp3', at: t - 0.02, offset: 0.25 * i, dur: 0.12, vol: -27, fadeOut: 0.05 }));
  // camera moves into / out of the phone
  [[S.s2, -27], [S.s4, -30], [10.4, -30], [27.6, -30]].forEach(([t, v]) => add({ file: 'whoosh_soft.mp3', at: t, vol: v }));
  // the charged grid hums very quietly whenever we look at it
  add({ file: 'neon_buzz.mp3', at: S.s3, dur: S.s4 + 0.6 - S.s3, vol: -38, loop: true, fadeIn: 0.6, fadeOut: 0.5 });
  add({ file: 'neon_buzz.mp3', at: 11.2, dur: 27.7 - 11.2, vol: -39, loop: true, fadeIn: 0.6, fadeOut: 0.5 });
  // the bare finger touches the glass, the mitten touches the glass (no reaction)
  add({ file: 'phone_scroll.mp3', at: S.touch - 0.02, offset: 0.4, dur: 0.15, vol: -28, fadeOut: 0.05 });
  add({ file: 'phone_scroll.mp3', at: S.gTouch - 0.02, offset: 0.7, dur: 0.15, vol: -29, fadeOut: 0.05 });
  // crosshair locks, the app opens
  add({ file: 'lock_click.mp3', at: S.lock, vol: -28, rate: 1.3, align: 'onset' });
  add({ file: 'lock_click.mp3', at: S.s7, vol: -24, rate: 1.1, align: 'onset' });
  return C;
}

module.exports = { FILES, timeline };
