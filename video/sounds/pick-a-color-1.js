// Sound timeline for "PICK A COLOR. (1)". scripts/mix.js loads it for FILM=pick-a-color-1.
// All files below are generated stand-ins (sfx_films/pick_a_color_1.py) until a real recording with the same
// base name is dropped into sfx/ (.mp3 wins). `search` = what to look for on Pixabay / Freesound (CC0).
const FILES = {
  'abyss_wind.mp3':          { search: '"dark wind ambience" / "cave drone"', use: 'bed under the whole film, -32 dB' },
  'race_beep.mp3':           { search: '"race start beep" (one low beep)', use: 'the three red lights' },
  'race_beep_go.mp3':        { search: '"race start beep" (the long high one)', use: 'all lights green' },
  'footsteps_metal.mp3':     { search: '"running footsteps metal" (single steps with gaps)', use: 'heel contacts of every runner still in the race' },
  'stone_crack.mp3':         { search: '"stone crack"', use: 'plates breaking away' },
  'falling_whoosh.mp3':      { search: '"falling whoosh"', use: 'every runner that drops into the abyss' },
  'chain_swing.mp3':         { search: '"chain swing" / "chain rattle"', use: 'each pass of the wrecking ball' },
  'punch_impact.mp3':        { search: '"punch impact" (dull)', use: 'ball hits, stamper hits, the bump against the gate' },
  'ice_slide.mp3':           { search: '"ice slide"', use: 'the two slipping on the ice bridge' },
  'heavy_metal_slam.mp3':    { search: '"heavy metal slam"', use: 'every stamper landing' },
  'metal_gate_grinding.mp3': { search: '"metal gate grinding"', use: 'the gate closing' },
  'gate_slam.mp3':           { search: '"gate slam"', use: 'the gate shuts' },
  'ui_pop.mp3':              { search: '"ui pop"', use: 'a dot turns into a grey x' },
  'crowd_cheer.mp3':         { search: '"small crowd cheer"', use: 'the winner' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'abyss_wind.mp3', at: 0, dur: END, vol: -31, fadeIn: 0.8, fadeOut: 1.0, loop: true });
  // start lights
  S.beeps.forEach((t, i) => add({ file: 'race_beep.mp3', at: t, vol: -17, note: `red ${i + 1}` }));
  add({ file: 'race_beep_go.mp3', at: S.go, vol: -15, note: 'green' });

  // footsteps: runners still in the race; quieter the more there are, close hits thinned out
  let n = 0, last = -1;
  for (const c of cues.steps) {
    if (c.t < S.go || c.t - last < 0.03) continue;
    last = c.t;
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    const dens = cues.steps.filter(q => Math.abs(q.t - c.t) < 0.25).length;   // ~steps in half a second
    const vol = -19 - Math.min(8, Math.max(0, dens - 2) * 1.2) + (c.type === 'settle' ? -4 : 0);
    add({ file: 'footsteps_metal.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1 + jitter * 0.06,
          align: 'onset', fadeOut: 0.05, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }

  // 1. falling plates
  S.plateBreaks.forEach((t, i) => { if (i % 2 === 0) add({ file: 'stone_crack.mp3', at: t - 0.3, vol: -24 + (i % 3) * -1.5, rate: 1 + (i % 5) * 0.04 }); });
  S.plateFalls.forEach(t => { add({ file: 'stone_crack.mp3', at: t - 0.32, vol: -16 }); add({ file: 'falling_whoosh.mp3', at: t + 0.05, vol: -18 }); });
  // 2. wrecking ball
  S.ballSwings.filter(t => t > 6 && t < 11.5).forEach(t => add({ file: 'chain_swing.mp3', at: t - 0.6, vol: -24 }));
  S.ballHits.forEach((t, i) => { add({ file: 'punch_impact.mp3', at: t, vol: -15 - i * 2, align: 'onset' }); add({ file: 'falling_whoosh.mp3', at: t + 0.15 + i * 0.1, vol: -21 }); });
  // 3. ice bridge
  S.iceSlips.forEach(t => add({ file: 'ice_slide.mp3', at: t + 0.15, vol: -19 }));
  S.iceFalls.forEach(t => add({ file: 'falling_whoosh.mp3', at: t, vol: -20 }));
  // 4. stampers
  S.slams.filter(t => t > 14.5 && t < 20.5).forEach(t => add({ file: 'heavy_metal_slam.mp3', at: t, vol: -17, align: 'onset' }));
  S.stampHits.forEach(t => { add({ file: 'punch_impact.mp3', at: t + 0.02, vol: -17, align: 'onset' }); add({ file: 'falling_whoosh.mp3', at: t + 0.35, vol: -21 }); });
  // 5. the gate
  add({ file: 'metal_gate_grinding.mp3', at: S.gate0, dur: S.slam0 - S.gate0 + 0.1, vol: -20, fadeIn: 0.4, fadeOut: 0.12, loop: true });
  add({ file: 'gate_slam.mp3', at: S.slam, vol: -13, align: 'onset' });
  add({ file: 'punch_impact.mp3', at: S.bump, vol: -16, align: 'onset', note: 'loser hits the closed gate' });
  // HUD
  S.pops.forEach(t => add({ file: 'ui_pop.mp3', at: t + 0.08, vol: -21 }));
  add({ file: 'ui_pop.mp3', at: S.win, vol: -18, rate: 1.25, note: 'crown' });
  add({ file: 'crowd_cheer.mp3', at: S.win + 0.3, vol: -18, fadeIn: 0.1, fadeOut: 1.2 });
  return C;
}

module.exports = { FILES, timeline };
