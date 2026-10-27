// Sound timeline for ghost-walk. scripts/mix.js loads it for FILM=ghost-walk.
// Stand-ins for floor_creak / tension_drone / body_thud / muffled_groan come from sfx_films/ghost_walk.py;
// a real recording sfx/<name>.mp3 replaces them automatically.
const FILES = {
  'winter_wind.mp3':    { search: '"wind howling interior" / "spooky wind"', use: 'bed under the whole film' },
  'footsteps_wood.mp3': { search: '"footsteps wooden floor" (single steps with gaps)', use: 'heel contacts, cut out one by one' },
  'floor_creak.wav':    { search: '"wooden floor creak single"', use: 'one creak on every step' },
  'tension_drone.wav':  { search: '"horror tension riser drone"', use: 'builds during the walk, cut dead at the trip' },
  'cloth_tug.wav':      { search: '"fabric tug"', use: 'the foot pins the sheet' },
  'whoosh_soft.mp3':    { search: '"cloth whoosh"', use: 'the plank fall' },
  'body_thud.wav':      { search: '"body fall wood floor thud"', use: 'landing flat on the belly' },
  'muffled_groan.wav':  { search: '"muffled groan pain short"', use: 'a short groan under the sheet (no words)' },
  'blanket_rustle.wav': { search: '"blanket rustle"', use: 'the arm wriggles out' },
  'night_crickets.mp3': { search: '"crickets night"', use: 'the awkward silence' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'winter_wind.mp3', at: 0, dur: END, vol: -30, fadeOut: 0.3, loop: true });
  add({ file: 'tension_drone.wav', at: 0, dur: S.trip, vol: -18, fadeOut: 0.015 });       // abrupt stop at the trip
  let n = 0;
  for (const c of cues.steps) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    let vol = c.type === 'shuffle' ? -27 : -21;
    if (c.type === 'settle') vol -= 4;
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1 + jitter * 0.04,
          align: 'onset', fadeOut: 0.06, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
    if (c.type === 'step') add({ file: 'floor_creak.wav', at: c.t + 0.02, vol: -22 + jitter * 3, rate: 1 + jitter * 0.15 });
  }
  add({ file: 'cloth_tug.wav', at: S.trip, vol: -22, align: 'onset' });
  add({ file: 'whoosh_soft.mp3', at: S.tip0 + 0.2, vol: -22, fadeOut: 0.1, dur: 0.6 });
  add({ file: 'body_thud.wav', at: S.land, vol: -13, align: 'onset' });
  add({ file: 'muffled_groan.wav', at: S.land + 0.7, vol: -20 });
  add({ file: 'night_crickets.mp3', at: S.land + 0.4, dur: END - S.land - 0.4, vol: -27, fadeIn: 0.6, loop: true });
  add({ file: 'blanket_rustle.wav', at: S.arm0 - 0.1, vol: -25, dur: 1.2, fadeOut: 0.3 });
  return C;
}

module.exports = { FILES, timeline };
