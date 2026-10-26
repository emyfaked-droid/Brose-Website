// Sound timeline for 'The Last Words': the kitchen (room tone, steps, keys, the door), the car (rain, engine,
// the squeal), the bang in the dark, sirens and a radio on the street, and back in the kitchen only a clock and a
// siren far away through the window that slowly fades.
const FILES = {
  'room_tone.mp3':       { search: '"quiet room tone"', use: 'the kitchen' },
  'footsteps_wood.mp3':  { search: '"footsteps wooden floor"', use: 'their steps in the kitchen' },
  'cloth_rustle.mp3':    { search: '"clothes rustle"', use: 'sharp gestures in the fight' },
  'keys.mp3':            { search: '"car keys pick up"', use: 'he grabs the keys' },
  'door_slam.mp3':       { search: '"door slam"', use: 'the front door' },
  'rain.mp3':            { search: '"rain on car roof" / "rain street night"', use: 'the car (muffled) and the street' },
  'car_engine.mp3':      { search: '"car interior driving engine"', use: 'the drive (stand-in generated)' },
  'tire_squeal.mp3':     { search: '"tire screech"', use: 'the headlights (stand-in generated)' },
  'car_crash.mp3':       { search: '"car crash"', use: 'only on black (stand-in generated)' },
  'siren_far.mp3':       { search: '"ambulance siren distant"', use: 'the street, and through the kitchen window (stand-in generated)' },
  'radio_static.mp3':    { search: '"police radio chatter"', use: 'the street (stand-in generated)' },
  'footsteps_puddle.mp3': { search: '"running footsteps puddles"', use: 'the helpers' },
  'clock_tick.mp3':      { search: '"wall clock ticking"', use: 'the kitchen at the end' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  // kitchen, the fight
  add({ file: 'room_tone.mp3', at: 0, dur: S.car, vol: -30, fadeIn: 0.5, fadeOut: 0.05, loop: true });
  for (const t of [0.95, 2.35, S.get0 - 0.12]) add({ file: 'cloth_rustle.mp3', at: t, vol: -25, dur: 0.35, fadeOut: 0.15 });
  add({ file: 'keys.mp3', at: S.grab - 0.05, vol: -17, dur: 0.8, fadeOut: 0.2 });
  add({ file: 'door_slam.mp3', at: S.slam, vol: -7, align: 'onset', fadeOut: 0.1, dur: S.car - S.slam });
  let n = 0, m = 0;
  for (const c of cues.steps) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    if (c.street) { add({ file: 'footsteps_puddle.mp3', slice: m++, at: c.t, vol: -24 + jitter * 2, align: 'onset', fadeOut: 0.06 }); continue; }
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: (c.type === 'shuffle' ? -27 : c.mood === 'storm' ? -18 : -24) + jitter * 2, rate: 1 + jitter * 0.04, align: 'onset', fadeOut: 0.06 });
  }
  // the car
  add({ file: 'rain.mp3', at: S.car, dur: S.black - S.car, vol: -20, loop: true, filter: 'lowpass=f=1600', fadeOut: 0.01 });
  add({ file: 'car_engine.mp3', at: S.car, dur: S.black - S.car, vol: -18, loop: true, fadeOut: 0.01 });
  add({ file: 'tire_squeal.mp3', at: S.lights + 0.15, dur: S.black - S.lights - 0.15, vol: -8, fadeIn: 0.05, fadeOut: 0.01 });
  // black: the bang
  add({ file: 'car_crash.mp3', at: S.crash, vol: -5, align: 'onset', fadeOut: 0.4, dur: S.after - S.crash + 1.2 });
  // the street afterwards
  add({ file: 'rain.mp3', at: S.after, dur: S.home - S.after, vol: -24, loop: true, offset: 3, fadeIn: 0.8, fadeOut: 0.05 });
  add({ file: 'siren_far.mp3', at: S.after + 0.1, dur: S.home - S.after - 0.1, vol: -19, fadeIn: 0.8, fadeOut: 0.05 });
  for (const t of [S.after + 0.7, S.after + 2.3]) add({ file: 'radio_static.mp3', at: t, vol: -21 });
  // the kitchen at the end: a clock, and a siren far away through the window, fading out
  add({ file: 'room_tone.mp3', at: S.home, dur: END - S.home, vol: -32, fadeOut: 1.0, loop: true });
  for (let i = 0, t = S.home + 0.4; t < END - 0.6; i++, t += 1) add({ file: 'clock_tick.mp3', slice: i % 8, at: t, vol: -24, align: 'onset', fadeOut: 0.05 });
  add({ file: 'siren_far.mp3', at: S.home, dur: 5.5, vol: -27, offset: 2.5, filter: 'lowpass=f=1200', fadeOut: 4.0 });
  return C;
}

module.exports = { FILES, timeline };
