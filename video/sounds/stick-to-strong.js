// Sound timeline of the daily series stick-to-strong (one file for all days).
// The film writes its sound hits into STORY.sfx ({ kind, at, dur, soft }); each scene has its own bed and floor.
// Real recordings with the same name (.mp3) replace the generated stand-ins automatically.
const FILES = {
  'room_tone.mp3':          { search: '"quiet room tone"', use: 'bed: mirror / kitchen / bed / scale, -33 dB' },
  'gym_atmo.mp3':           { search: '"gym ambience" (hall, ventilation, distant weights)', use: 'bed: gym, -30 dB' },
  'footsteps_wood.mp3':     { search: '"footsteps wooden floor" (single steps with gaps)', use: 'steps on wood (mirror, bed)' },
  'footsteps_barefoot.wav': { search: '"barefoot footsteps tile"', use: 'steps on tiles / rubber (kitchen, scale, gym)' },
  'cloth_rustle.wav':       { search: '"cloth rustle short"', use: 'arm moves (flex)' },
  'hands_floor.mp3':        { search: '"hands slap floor" / "palms on wooden floor"', use: 'hands set down for the push-up' },
  'strain_exhale.mp3':      { search: '"straining exhale effort" (male, through teeth)', use: 'pushing / lifting' },
  'body_thud.mp3':          { search: '"body fall on floor thud"', use: 'falls flat' },
  'tip_pling.mp3':          { search: '"pling notification soft" / "ui bell short"', use: 'the tip card appears' },
  'barbell_clank.mp3':      { search: '"barbell rack clank" / "weight plates clang"', use: 'gym: bar racked / dropped' },
  'effort_grunt.mp3':       { search: '"male grunt effort short"', use: 'gym: a heavy rep' },
  'scale_beep.mp3':         { search: '"digital scale beep"', use: 'scale: the weight is shown' },
};

const BED = { gym: ['gym_atmo.mp3', -30], default: ['room_tone.mp3', -33] };
const STEP = { gym: 'footsteps_barefoot.wav', kitchen: 'footsteps_barefoot.wav', scale: 'footsteps_barefoot.wav', default: 'footsteps_wood.mp3' };

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  const [bed, bedVol] = BED[S.scene] || BED.default;
  const stepFile = STEP[S.scene] || STEP.default;
  add({ file: bed, at: 0, dur: END, vol: bedVol, loop: true, fadeOut: 0.05 });   // no fade-in: frame 0 is the hook
  // walking / turning steps from the planner, plus the steps the actions place by hand
  let n = 0;
  const steps = [...cues.steps.map(c => ({ at: c.t, soft: c.type !== 'step' })), ...S.sfx.filter(h => h.kind === 'step')];
  for (const s of steps.sort((a, b) => a.at - b.at)) {
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    add({ file: stepFile, slice: n++, at: s.at, vol: (s.soft ? -25 : -20) + jitter * 2, rate: 1 + jitter * 0.04, align: 'onset', fadeOut: 0.06 });
  }
  for (const h of S.sfx) {
    if (h.kind === 'cloth') add({ file: 'cloth_rustle.wav', at: h.at, vol: -27, dur: 0.6, fadeOut: 0.2 });
    if (h.kind === 'hands') add({ file: 'hands_floor.mp3', at: h.at, vol: -21, align: 'onset' });
    if (h.kind === 'strain') add({ file: 'strain_exhale.mp3', at: h.at, vol: -20, dur: h.dur || 2.5, fadeIn: 0.1, fadeOut: 0.12 });
    if (h.kind === 'thud') add({ file: 'body_thud.mp3', at: h.at, vol: -14, align: 'onset' });
    if (h.kind === 'pling') add({ file: 'tip_pling.mp3', at: h.at, vol: -20, align: 'onset' });
    if (h.kind === 'clank') add({ file: 'barbell_clank.mp3', at: h.at, vol: -16, align: 'onset' });
    if (h.kind === 'grunt') add({ file: 'effort_grunt.mp3', at: h.at, vol: -19, align: 'onset' });
    if (h.kind === 'beep') add({ file: 'scale_beep.mp3', at: h.at, vol: -22, align: 'onset' });
  }
  return C;
}

module.exports = { FILES, timeline };
