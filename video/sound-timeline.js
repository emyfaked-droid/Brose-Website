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

module.exports = { FILES, timeline, TARGET_LUFS: -14, CEILING_DBTP: -1.5 };
