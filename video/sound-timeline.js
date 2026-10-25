// SOUND TIMELINE
// Every sound in the film is one cue here. Times come from the story beats in
// index.html (window.STORY) and from the heel-contact frames the walk planner
// computes, so picture and sound cannot drift apart.
//
// Cue fields
//   file      sound file in ./sfx
//   at        start time in seconds (where the sound's first transient lands if align: 'onset')
//   dur       how long to play (seconds); default: to the end of the file
//   vol       gain in dB
//   fadeIn    / fadeOut  in seconds (afade)
//   offset    seconds to skip at the start of the source file
//   loop      loop the source if it is shorter than dur
//   align     'onset': shift the cue so the file's first transient hits `at` exactly
//   slice     use one detected hit from the file (footsteps, clock) instead of the whole file
//   rate      playback-rate factor (pitch), e.g. 0.94 for heavier steps
//   filter    extra ffmpeg audio filters for this cue (e.g. muffling)
//
// The finished SFX mix is normalised to -14 LUFS integrated with a -1.5 dBTP
// ceiling, so background music can be added on top later.

// Required source files. Exact names, what to search for, and how each is used.
const FILES = {
  'party_music.mp3':    { search: 'upbeat house / pop party music (Pixabay Music: "party", "dance house")', use: 'muffled, as if from the next room (at least 7 s)' },
  'crowd_murmur.mp3':   { search: '"crowd talking indoor", "party chatter ambience", "restaurant walla"', use: 'party room tone (at least 7 s)' },
  'cup_clink.mp3':      { search: '"glasses clink cheers", "cups toast"', use: 'one clink' },
  'laughter.mp3':       { search: '"group of people laughing", "small crowd laugh"', use: 'the others laugh after FINE. (2 s or more)' },
  'door_close.mp3':     { search: '"door close wooden", "door shut"', use: 'hard cut to home, one firm close' },
  'lock_click.mp3':     { search: '"door lock click", "deadbolt lock"', use: 'one click' },
  'footsteps_wood.mp3': { search: '"footsteps wooden floor", "walking on wood floor slow" (single steps with gaps between them)', use: 'individual steps are cut out automatically' },
  'bed_creak.mp3':      { search: '"bed creak", "sitting on bed", "mattress springs creak"', use: 'one creak when the figure sits' },
  'mask_down.mp3':      { search: '"put plastic object on table", "place object on wooden table"', use: 'the mask is set down' },
  'clock_tick.mp3':     { search: '"clock ticking loud", "wall clock tick"', use: 'single ticks are cut out and placed on the clock\'s second hand' },
  'traffic_distant.mp3':{ search: '"distant city traffic night ambience"', use: 'faint bed under the home scene (at least 13 s; it loops otherwise)' },
  'phone_alarm.mp3':    { search: '"phone alarm", "smartphone alarm ringtone"', use: 'morning alarm (about 1.5 s used)' },
  'cloth_rustle.mp3':   { search: '"clothes rustle", "fabric movement foley"', use: 'sitting, standing, picking up the mask' },
  'door_open.mp3':      { search: '"door open", "door handle open"', use: 'leaving in the morning' },
  'birds_morning.mp3':  { search: '"birds chirping morning", "birdsong outside"', use: 'outside, swells when the door opens (at least 5 s)' },
};

// muffled "next room" party: low-pass, a little room smear
const NEXT_ROOM = 'lowpass=f=480:p=2,lowpass=f=900,aecho=0.8:0.6:38|67:0.22|0.12,highpass=f=45';

function timeline(S, cues) {
  const C = [];
  const add = c => C.push(c);
  const cut = S.cut1;

  // ---- 1. PARTY (stops dead at the cut)
  add({ file: 'party_music.mp3', at: 0, dur: cut, vol: -9, fadeIn: 0.35, fadeOut: 0.012, filter: NEXT_ROOM, loop: true });
  add({ file: 'crowd_murmur.mp3', at: 0, dur: cut, vol: -15, fadeIn: 0.35, fadeOut: 0.012, filter: 'highpass=f=140', loop: true });
  add({ file: 'cup_clink.mp3', at: S.clink, vol: -8, align: 'onset', fadeOut: 0.05 });
  add({ file: 'laughter.mp3', at: S.laugh0 + 0.03, dur: Math.min(cut - S.laugh0 - 0.03, S.laugh1 - S.laugh0 + 0.6), vol: -8, align: 'onset', fadeOut: 0.45 });

  // ---- 2. HOME
  add({ file: 'door_close.mp3', at: cut, vol: -3, align: 'onset', fadeOut: 0.3 });
  add({ file: 'lock_click.mp3', at: S.lock, vol: -11, align: 'onset', fadeOut: 0.05 });
  add({ file: 'traffic_distant.mp3', at: cut + 0.05, dur: S.end - cut - 0.05, vol: -27, fadeIn: 1.2, fadeOut: 0.6, filter: 'lowpass=f=1400,highpass=f=60', loop: true });
  add({ file: 'cloth_rustle.mp3', at: S.sit0 + 0.15, dur: 0.9, vol: -20, fadeIn: 0.1, fadeOut: 0.3 });
  add({ file: 'bed_creak.mp3', at: S.sitHit - 0.04, vol: -9, align: 'onset', fadeOut: 0.3 });
  add({ file: 'cloth_rustle.mp3', at: S.maskOff0, dur: 0.7, vol: -24, fadeIn: 0.1, fadeOut: 0.3, offset: 0.4 });
  add({ file: 'mask_down.mp3', at: S.maskDown, vol: -9, align: 'onset', fadeOut: 0.1 });
  add({ file: 'cloth_rustle.mp3', at: S.slump0 + 0.1, dur: 0.8, vol: -24, fadeIn: 0.15, fadeOut: 0.4, offset: 0.9 });

  // the clock: one cut-out tick per second, exactly when the second hand jumps
  cues.ticks.forEach((t, i) => {
    if (t < cut + 0.2) return;
    const morning = t > S.morn + 0.5;
    add({ file: 'clock_tick.mp3', slice: i % 2, at: t, vol: morning ? -21 : -13, fadeOut: 0.05, align: 'onset' });
  });

  // ---- 3. MORNING
  add({ file: 'birds_morning.mp3', at: S.morn, dur: S.doorOpen - S.morn + 0.2, vol: -32, fadeIn: 1.0, fadeOut: 0.3, filter: 'lowpass=f=2500', loop: true });
  add({ file: 'phone_alarm.mp3', at: S.alarm0, dur: S.alarm1 - S.alarm0, vol: -11, fadeIn: 0.02, fadeOut: 0.06, loop: true });
  add({ file: 'cloth_rustle.mp3', at: S.rise0, dur: 0.6, vol: -22, fadeIn: 0.1, fadeOut: 0.3 });
  add({ file: 'cloth_rustle.mp3', at: S.stand0 + 0.1, dur: 0.9, vol: -18, fadeIn: 0.1, fadeOut: 0.35, offset: 0.5 });
  add({ file: 'cloth_rustle.mp3', at: S.pick - 0.15, dur: 0.6, vol: -20, fadeIn: 0.08, fadeOut: 0.3, offset: 1.0 });
  add({ file: 'mask_down.mp3', at: S.pick, vol: -17, align: 'onset', fadeOut: 0.08, rate: 1.06 });
  add({ file: 'door_open.mp3', at: S.doorOpen, vol: -8, align: 'onset', fadeOut: 0.3 });
  add({ file: 'birds_morning.mp3', at: S.doorOpen + 0.05, dur: S.end - S.doorOpen - 0.05, vol: -12, fadeIn: 0.5, fadeOut: 0.6, offset: 0.7, loop: true });

  // ---- FOOTSTEPS: one cut-out step per heel contact the animation computed
  const VOL = { heavy: -6, forced: -9, bouncy: -26, shuffle: -17 };
  const RATE = { heavy: 0.93, forced: 1.05, bouncy: 1.08, shuffle: 1.0 };
  let n = 0;
  for (const c of cues.steps) {
    const party = c.t < cut;
    let vol = VOL[c.mood] ?? -14;
    if (c.type === 'settle') vol -= 5;           // the closing half-step is softer
    if (c.type === 'shuffle') vol = party ? -30 : VOL.shuffle;
    const jitter = ((n * 7919) % 13) / 13 - 0.5;  // deterministic variation
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: (RATE[c.mood] || 1) * (1 + jitter * 0.04), align: 'onset', fadeOut: 0.06,
          filter: party ? 'lowpass=f=2500' : null, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }
  return C;
}

// =====================================================================
// IT ENDS WITH YOU (it-ends-with-you.html). Times come from the story beats in the page (cues.story).
// Scene 2 (2026) is scene 1 (1998) + OFF seconds, so the sounds repeat on purpose (the glass breaks twice
// with the very same recording).
// =====================================================================
const FILES_IEWY = {
  'room_tone.mp3':      { search: '"quiet house room tone", "indoor silence ambience"', use: 'bed under the whole film, very quiet (-32 dB)' },
  'clock_tick.mp3':     { search: '"wall clock ticking"', use: 'single ticks every second; cut out for a moment at the freeze' },
  'toy_blocks.mp3':     { search: '"wooden toy blocks"', use: 'the child plays (about 1 s)' },
  'glass_break.mp3':    { search: '"glass shatter floor"', use: 'the glass breaks (1998 and 2026, same sound)' },
  'footsteps_wood.mp3': { search: '"footsteps wooden floor"', use: 'every step on the heel-contact frame (adult heavy, child light)' },
  'door_open.mp3':      { search: '"door open", "door handle open"', use: 'the father opens the door (extra, quiet)' },
  'door_slam.mp3':      { search: '"interior door slam"', use: 'the door slams shut at 5.5 s' },
  'heartbeat.mp3':      { search: '"slow heartbeat"', use: 'under the freeze, loops (needs a few beats)' },
  'whoosh_soft.mp3':    { search: '"soft whoosh"', use: 'the flashback' },
  'knee_floor.mp3':     { search: '"knee on wooden floor"', use: 'the adult kneels' },
  'cloth_hug.mp3':      { search: '"clothes rustle hug"', use: 'the hug' },
};

function timelineIewy(S, cues) {
  const C = [], add = c => C.push(c), OFF = S.OFF, END = S.end;
  // quiet house tone under everything, and the clock
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -32, fadeIn: 0.6, fadeOut: 0.9, loop: true });
  for (let i = 0; 0.5 + i < END - 0.3; i++) {
    const t = 0.5 + i;
    if (t >= S.freeze0 - 0.05 && t < S.lower0) continue;           // sudden silence at the freeze
    add({ file: 'clock_tick.mp3', slice: i % 8, at: t, vol: -30, align: 'onset', fadeOut: 0.05 });
  }
  // the child plays, the glass breaks (twice, the same recording), the door slams
  for (const o of [0, OFF]) {
    add({ file: 'toy_blocks.mp3', at: S.blocks0 + o, dur: S.blocks1 - S.blocks0, vol: -14, fadeOut: 0.1 });
    add({ file: 'glass_break.mp3', at: S.glass + o, vol: -4, align: 'onset', fadeOut: 0.5 });
  }
  add({ file: 'door_open.mp3', at: S.doorOpen - 0.02, vol: -12, align: 'onset', fadeOut: 0.3 });
  add({ file: 'door_slam.mp3', at: S.doorSlam, vol: -1, align: 'onset', fadeOut: 0.5 });
  // freeze and flashback
  add({ file: 'heartbeat.mp3', at: S.freeze0, dur: S.kneel1 - S.freeze0, vol: -11, fadeIn: 0.5, fadeOut: 1.0, loop: true });
  add({ file: 'whoosh_soft.mp3', at: S.ghost0, vol: -22, fadeOut: 0.4 });
  // kneel, hug
  add({ file: 'knee_floor.mp3', at: S.knee, vol: -9, align: 'onset', fadeOut: 0.3 });
  add({ file: 'cloth_hug.mp3', at: S.hug, vol: -15, fadeIn: 0.05, fadeOut: 0.5 });
  // footsteps on the heel-contact frames: the adult is heavy and hard, the child light
  const VOL = { hard: -3, bouncy: -19, back: -22, kid: -24 }, RATE = { hard: 0.9, bouncy: 1.2, back: 1.22, kid: 1.2 };
  let n = 0;
  for (const c of cues.steps) {
    let vol = VOL[c.mood] ?? -12;
    if (c.type === 'settle') vol -= 5;
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: (RATE[c.mood] || 1) * (1 + jitter * 0.04), align: 'onset', fadeOut: 0.06, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }
  return C;
}

module.exports = { FILES, timeline, TARGET_LUFS: -14, CEILING_DBTP: -1.5,
  films: { 'it-ends-with-you': { FILES: FILES_IEWY, timeline: timelineIewy } } };
