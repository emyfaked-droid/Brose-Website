// Sound timeline for 'Pick A Color' (wipeout 1), in film time (the replay is already folded in by getCues).
const FILES = {
  'water_lap.mp3':          { search: '"water lapping ambience"', use: 'bed under the whole film (-34 dB)' },
  'start_beep.mp3':         { search: '"race start beep"', use: 'the three red lights' },
  'start_go.mp3':           { search: '"race start beep high"', use: 'green: go' },
  'footsteps_street.mp3':   { search: '"footsteps running on wood"', use: 'every heel contact, cut out one by one' },
  'rubber_boing.mp3':       { search: '"rubber ball bounce"', use: 'landing on a ball (soft), bouncing off one (loud), slowed down in the replay' },
  'water_splash.mp3':       { search: '"big water splash"', use: 'every fall into the water' },
  'whoosh_soft.mp3':        { search: '"swoosh"', use: 'the sweeper arm going past, the start of the replay' },
  'punch_bag_hit.mp3':      { search: '"punching bag hit"', use: 'a bag or the sweeper arm hits someone' },
  'slide_squeak.mp3':       { search: '"sliding squeak"', use: 'the belly-flop slide down the ball, the slip on the ramp' },
  'buzzer.mp3':             { search: '"game show buzzer"', use: 'the winner hits the buzzer' },
  'crowd_cheer.mp3':        { search: '"crowd cheer short"', use: 'after the buzzer' },
  'confetti_pop.mp3':       { search: '"confetti cannon pop"', use: 'the confetti' },
  'ui_pop.mp3':             { search: '"ui pop"', use: 'a dot turns into a grey cross' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'water_lap.mp3', at: 0, dur: END, vol: -34, fadeIn: 0.6, fadeOut: 1.0, loop: true });
  for (const t of S.beeps) add({ file: 'start_beep.mp3', at: t, vol: -18, align: 'onset' });
  add({ file: 'start_go.mp3', at: S.go, vol: -15, align: 'onset' });
  let n = 0;
  for (const c of cues.steps) {
    if (c.type === 'land' && c.onBall) continue;                     // the ball says boing instead
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    let vol = c.type === 'land' ? -21 : c.type === 'takeoff' ? -27 : c.type === 'shuffle' ? -30 : -26;
    if (c.type === 'settle') vol -= 3;
    add({ file: 'footsteps_street.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1.05 + jitter * 0.06, align: 'onset', fadeOut: 0.05, note: `${c.fig} ${c.type}` });
  }
  for (const b of S.boings) add({ file: 'rubber_boing.mp3', at: b.t, vol: b.vol, rate: b.vol > -20 ? 1 : 1.15, align: 'onset', fadeOut: 0.15 });
  for (const h of S.hits) add({ file: 'punch_bag_hit.mp3', at: h.t, vol: h.vol, align: 'onset', rate: h.bag ? 0.9 : 1.1 });
  for (const q of S.squeaks) add({ file: 'slide_squeak.mp3', at: q.t, vol: q.vol ?? -17, dur: q.dur, fadeOut: 0.2, rate: q.vol ? 1.1 : 0.85 });
  for (const w of S.swoosh) add({ file: 'whoosh_soft.mp3', at: w.t, vol: -19, rate: 1.1, fadeOut: 0.2 });
  for (const sp of S.splashes) add({ file: 'water_splash.mp3', at: sp.t - 0.02, vol: -11, align: 'onset', fadeOut: 0.4, note: `${sp.name} splash` });
  for (const t of S.pops) add({ file: 'ui_pop.mp3', at: t, vol: -19, align: 'onset' });
  // the replay: a slow whoosh in, the collision slowed down
  add({ file: 'whoosh_soft.mp3', at: S.replay0 - 0.05, vol: -17, rate: 0.6, fadeOut: 0.4 });
  add({ file: 'rubber_boing.mp3', at: S.replayHit, vol: -14, rate: 0.45, align: 'onset', fadeOut: 0.3 });
  add({ file: 'whoosh_soft.mp3', at: S.replay1 - 0.1, vol: -20, rate: 0.8, fadeOut: 0.3 });
  add({ file: 'buzzer.mp3', at: S.buzz, vol: -10, align: 'onset' });
  add({ file: 'confetti_pop.mp3', at: S.buzz + 0.1, vol: -15, align: 'onset' });
  add({ file: 'crowd_cheer.mp3', at: S.buzz + 0.15, vol: -13, fadeOut: 0.8, dur: END - S.buzz - 0.15 });
  return C;
}

module.exports = { FILES, timeline };
