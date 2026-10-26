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

// =====================================================================
// I WISH I WAS YOUR PHONE (i-wish-i-was-your-phone.html). Times come from the page (cues.story): the thumb taps,
// the ball's bounces, the cardboard slap and every barefoot step are the animation's own frames.
// =====================================================================
const FILES_PHONE = {
  'room_tone.mp3':          { search: '"quiet living room night ambience"', use: 'bed under the whole film (-32 dB, -40 dB while he looks up)' },
  'phone_scroll.mp3':       { search: '"phone screen tapping"', use: 'single taps are cut out and put on the thumb flicks (-28 dB)' },
  'phone_notification.mp3': { search: '"phone notification ding"', use: 'three notifications (1.5, 4.3, 9.6 s)' },
  'phone_buzz.mp3':         { search: '"phone vibrate in hand"', use: 'the phone buzzes at 9.6 s (extra, quiet)' },
  'footsteps_barefoot.mp3': { search: '"barefoot steps wooden floor"', use: 'every child step on its heel-contact frame' },
  'cloth_tug.mp3':          { search: '"fabric sleeve tug"', use: 'two tugs on the sleeve (0.28 s apart)' },
  'toy_squeak.mp3':         { search: '"rubber toy squeak"', use: 'the toy ball is squeezed (3.6 s)' },
  'ball_bounce_roll.mp3':   { search: '"small ball bounce roll floor"', use: 'the ball drops, bounces and rolls (first bounce about 6.4 s)' },
  'cardboard_handle.mp3':   { search: '"cardboard handling rustle"', use: 'the child carries and lifts the cardboard phone (7.8-9.2 s)' },
  'phone_on_couch.mp3':     { search: '"phone dropped on couch"', use: 'the phone lands face down on the sofa' },
  'cardboard_drop.mp3':     { search: '"cardboard drop floor"', use: 'the cardboard phone slaps onto the floor' },
  'couch_creak.mp3':        { search: '"sofa creak"', use: 'he leans forward to lift the child (13.8 s)' },
};

function timelinePhone(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  // a quiet room; when the father looks up everything drops to near silence for 1.5 s (only the room tone, at -40 dB)
  const h0 = S.look0, h1 = S.look0 + 1.5;
  add({ file: 'room_tone.mp3', at: 0, dur: h0 + 0.05, vol: -32, fadeIn: 0.6, fadeOut: 0.3, loop: true });
  add({ file: 'room_tone.mp3', at: h0 - 0.25, offset: h0 - 0.25, dur: h1 - h0 + 0.5, vol: -40, fadeIn: 0.3, fadeOut: 0.5, loop: true });
  add({ file: 'room_tone.mp3', at: h1 - 0.25, offset: h1 - 0.25, dur: END - h1 + 0.25, vol: -32, fadeIn: 0.6, fadeOut: 1.0, loop: true });
  // the phone: thumb taps, notifications, one buzz
  S.taps.forEach((t, i) => { if (t < h0) add({ file: 'phone_scroll.mp3', slice: i, at: t, vol: -28, align: 'onset', fadeOut: 0.04, note: 'thumb tap' }); });
  for (const t of S.notes) add({ file: 'phone_notification.mp3', at: t, vol: -17, align: 'onset', dur: Math.min(1.3, h0 - t), fadeOut: 0.25 });
  add({ file: 'phone_buzz.mp3', at: S.buzz + 0.02, vol: -21, align: 'onset', fadeOut: 0.08 });
  // the child: tug, squeak, the ball, the cardboard
  add({ file: 'cloth_tug.mp3', at: S.pull1, vol: -15, align: 'onset', fadeOut: 0.2 });
  add({ file: 'toy_squeak.mp3', at: S.squeak, vol: -14, align: 'onset', fadeOut: 0.15 });
  add({ file: 'ball_bounce_roll.mp3', at: S.ballHits[0], vol: -13, align: 'onset', fadeOut: 0.6 });
  add({ file: 'cardboard_handle.mp3', at: 7.8, dur: 1.4, vol: -23, fadeIn: 0.15, fadeOut: 0.3 });
  // after the silence: phone face down on the sofa, the cardboard drops, the sofa creaks
  add({ file: 'phone_on_couch.mp3', at: S.phoneOnSofa, vol: -15, align: 'onset', fadeOut: 0.2 });
  add({ file: 'cardboard_drop.mp3', at: S.cardSlap, vol: -10, align: 'onset', fadeOut: 0.4 });
  add({ file: 'couch_creak.mp3', at: S.creak, vol: -16, fadeIn: 0.02, fadeOut: 0.3 });
  // barefoot steps on the heel-contact frames; steps off screen are softer and duller
  const VOL = { kid: -19, kidsad: -23, kidwalk: -20 };
  let n = 0;
  for (const c of cues.steps) {
    let vol = c.type === 'shuffle' ? -27 : (VOL[c.mood] ?? -21), filter = null;
    if (c.type === 'settle') vol -= 4;
    const off = (c.fig === 'KID1' && c.t > S.gone - 0.2) || (c.fig === 'KID2' && c.t < 8.0);
    if (off) { vol -= c.fig === 'KID1' ? 6 + 4 * (c.t - S.gone) : 5; filter = 'lowpass=f=1800'; }
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    add({ file: 'footsteps_barefoot.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: 1 + jitter * 0.05, align: 'onset', fadeOut: 0.06, filter, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }
  return C;
}

// =====================================================================
// TIRED FOR YOU (tired-for-you.html). Times come from the page (cues.story): the snore sits on his in-breaths,
// bags, doors, keys and the flop on the frames where they happen, footsteps on the heel contacts.
// =====================================================================
const FILES_TIRED = {
  'room_tone.mp3':          { search: '"quiet apartment room tone"', use: 'bed under the whole film (-32 dB)' },
  'soft_snore.mp3':         { search: '"man snoring softly"', use: 'Saturday, on every in-breath (-26 dB)' },
  'clock_tick.mp3':         { search: '"wall clock ticking"', use: 'single ticks once a second (-30 dB)' },
  'tape_rewind.mp3':        { search: '"vhs tape rewind"', use: 'rewind at 3.6 s, played backwards for the fast-forward at 12.0 s' },
  'phone_alarm.mp3':        { search: '"phone alarm morning"', use: '5:30 alarm' },
  'tired_sigh.mp3':         { search: '"tired sigh exhale"', use: 'as he sits up' },
  'keys.mp3':               { search: '"keys jingle"', use: 'when he takes a bag' },
  'door_close.mp3':         { search: '"apartment door close"', use: 'the door shuts behind him' },
  'door_open.mp3':          { search: '"apartment door open"', use: 'he comes home' },
  'bag_drop.mp3':           { search: '"heavy bag drop floor"', use: 'the bag lands' },
  'night_outside.mp3':      { search: '"distant city night traffic"', use: 'quiet under the night scene' },
  'sofa_flop.mp3':          { search: '"falling onto sofa"', use: 'he lets himself fall onto the sofa' },
  'blanket_rustle.mp3':     { search: '"blanket rustle"', use: 'the child drags and lays the blanket' },
  'footsteps_wood.mp3':     { search: '"footsteps wooden floor"', use: 'the father (hard, heavy)' },
  'footsteps_barefoot.mp3': { search: '"barefoot steps wooden floor"', use: 'the child (light)' },
};

function timelineTired(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  const tape = t => (t >= S.rew0 && t < S.rew1) || (t >= S.fwd0 && t < S.fwd1);
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -32, fadeIn: 0.6, fadeOut: 0.9, loop: true });
  // the clock, once a second, quiet during the tape effects
  for (let i = 0; 0.5 + i < END - 0.4; i++) { const t = 0.5 + i; if (!tape(t)) add({ file: 'clock_tick.mp3', slice: i % 8, at: t, vol: -30, align: 'onset', fadeOut: 0.05 }); }
  // the snore follows his breathing (one breath = 3.6 s, the file has the same period)
  const P = 3.6, off = t => (((t - S.inhale0) % P) + P) % P;
  add({ file: 'soft_snore.mp3', at: 0, offset: off(0), dur: S.rew0, vol: -26, fadeIn: 0.4, fadeOut: 0.15, loop: true });
  add({ file: 'soft_snore.mp3', at: S.p3, offset: off(S.p3), dur: END - S.p3, vol: -26, fadeIn: 0.25, fadeOut: 0.8, loop: true });
  // tape: rewind into the week, the same sound backwards out of it
  add({ file: 'tape_rewind.mp3', at: S.rew0 - 0.03, dur: 0.75, vol: -21, fadeOut: 0.05 });
  add({ file: 'tape_rewind.mp3', at: S.fwd0 - 0.03, dur: 0.75, vol: -22, fadeOut: 0.05, filter: 'areverse' });
  // morning
  add({ file: 'phone_alarm.mp3', at: S.alarm, dur: S.sit0 + 0.45 - S.alarm, vol: -31, fadeIn: 0.01, fadeOut: 0.08, loop: true });
  add({ file: 'tired_sigh.mp3', at: 4.6, vol: -20, fadeOut: 0.3 });
  add({ file: 'keys.mp3', at: S.keysM, vol: -26, align: 'onset', fadeOut: 0.1 });
  add({ file: 'door_close.mp3', at: S.shutM, vol: -21, align: 'onset', fadeOut: 0.3 });
  // evening
  add({ file: 'door_open.mp3', at: S.e0, vol: -22, align: 'onset', fadeOut: 0.3 });
  add({ file: 'bag_drop.mp3', at: S.bagE, vol: -20, align: 'onset', fadeOut: 0.3 });
  add({ file: 'keys.mp3', at: S.keysE, vol: -26, align: 'onset', fadeOut: 0.1 });
  add({ file: 'door_close.mp3', at: S.shutE, vol: -21, align: 'onset', fadeOut: 0.3 });
  // night
  add({ file: 'door_open.mp3', at: S.n0, vol: -24, align: 'onset', fadeOut: 0.3, rate: 0.9 });
  add({ file: 'night_outside.mp3', at: S.n0, dur: S.fwd0 - S.n0, vol: -30, fadeIn: 0.4, fadeOut: 0.3, loop: true });
  add({ file: 'bag_drop.mp3', at: S.bagN, vol: -21, align: 'onset', fadeOut: 0.3, rate: 0.95 });
  add({ file: 'sofa_flop.mp3', at: S.flop, vol: -19, align: 'onset', fadeOut: 0.4 });
  // Saturday: the blanket
  add({ file: 'blanket_rustle.mp3', at: S.back, dur: S.lay1 - S.back, vol: -24, fadeIn: 0.1, fadeOut: 0.3 });
  // footsteps on the heel contacts: the father hard and heavy, the child light; behind the door: dull and quieter
  const VOL = { heavy: -21, forced: -23, kid: -27, kidrun: -26, kiddrag: -28, kidwalk: -27, shuffle: -29 };
  let n = 0;
  for (const c of cues.steps) {
    let vol = VOL[c.mood] ?? (c.kid ? -28 : -22), filter = null;
    if (c.type === 'settle') vol -= 4;
    if (c.type === 'shuffle') vol = c.kid ? -31 : -27;
    if (c.hall) { vol -= 7; filter = 'lowpass=f=900'; }
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    add({ file: c.kid ? 'footsteps_barefoot.mp3' : 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + jitter * 2, rate: (c.kid ? 1.1 : (c.mood === 'heavy' ? 0.92 : 1.0)) * (1 + jitter * 0.04),
          align: 'onset', fadeOut: 0.06, filter, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }
  return C;
}

const FILES_RED = {
  'city_night.mp3':        { search: '"city night ambience distant traffic"', use: 'bed under the whole film (-30 dB)' },
  'streetlamp_hum.mp3':    { search: '"street lamp buzz"', use: 'while A stands under the lamps (-36 dB)' },
  'string_tug.mp3':        { search: '"string pull snap"', use: 'the two hard tugs' },
  'rope_pull.mp3':         { search: '"rope pulling hand over hand"', use: 'one grab on every pulling stroke' },
  'footsteps_asphalt.mp3': { search: '"footsteps asphalt"', use: 'A running hard, B walking calmly' },
  'run_breathing.mp3':     { search: '"heavy breathing running"', use: 'the run, the stumble, winded on the knees' },
  'knee_fall.mp3':         { search: '"person falls to knees"', use: 'A drops to its knees' },
  'sit_down_curb.mp3':     { search: '"sitting down on concrete"', use: 'A sits down on the curb' },
  'string_slide.mp3':      { search: '"string sliding on ground"', use: 'the thread slides away over the street (quiet)' },
  'soft_heartbeat.mp3':    { search: '"single soft heartbeat"', use: 'the hands meet (single, quiet)' },
};

function timelineRed(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  // at the stillness every ambience drops by 10 dB for 1.5 s (smooth ramps, done inside each bed)
  const duck = at => { const a = (S.still0 - at).toFixed(3), b = (S.still0 + 1.5 - at).toFixed(3);
    return `volume='1-0.684*clip((t-${a})/0.25,0,1)*(1-clip((t-${b})/0.35,0,1))':eval=frame`; };
  add({ file: 'city_night.mp3', at: 0, dur: END, vol: -30, fadeIn: 0.5, fadeOut: 0.8, loop: true, filter: duck(0) });
  add({ file: 'streetlamp_hum.mp3', at: 0, dur: S.run, vol: -36, fadeIn: 0.5, fadeOut: 0.5, loop: true });
  add({ file: 'streetlamp_hum.mp3', at: S.free0, offset: 1.3, dur: END - S.free0, vol: -36, fadeIn: 0.6, fadeOut: 0.8, loop: true, filter: duck(S.free0) });
  // the thread
  add({ file: 'string_tug.mp3', at: S.tug1, vol: -23, align: 'onset', fadeOut: 0.2 });
  add({ file: 'string_tug.mp3', at: S.tug2, vol: -24, align: 'onset', fadeOut: 0.2, rate: 1.06 });
  S.strokes.forEach((t, i) => add({ file: 'rope_pull.mp3', slice: i, at: t, vol: -27 + Math.min(3, i * 0.5), align: 'onset', fadeOut: 0.05 }));
  add({ file: 'string_slide.mp3', at: S.move0, dur: S.move1 - S.move0, vol: -33, fadeIn: 0.2, fadeOut: 0.3 });
  // A: the run, the fall, the curb
  add({ file: 'run_breathing.mp3', at: S.run, dur: S.free0 - S.run, vol: -25, fadeIn: 0.15, fadeOut: 0.3 });
  add({ file: 'knee_fall.mp3', at: S.knee - 0.06, vol: -22, align: 'onset', fadeOut: 0.3 });
  add({ file: 'sit_down_curb.mp3', at: S.sitHit, vol: -25, align: 'onset', fadeOut: 0.3 });
  // the hands meet
  add({ file: 'soft_heartbeat.mp3', at: S.meet0, vol: -27, align: 'onset', fadeOut: 0.4 });
  // steps on the heel contacts: A running hard on the asphalt (slices 0-4), B calm (slices 5-9)
  let n = 0;
  for (const c of cues.steps) {
    const run = c.mood === 'run', jitter = ((n * 7919) % 13) / 13 - 0.5;
    let vol = run ? -22 : c.who === 'B' ? -28 : -31;
    if (c.type === 'settle') vol -= 3;
    add({ file: 'footsteps_asphalt.mp3', slice: run ? n % 5 : 5 + (n % 5), at: c.t, vol: vol + jitter * 2, rate: 1 + jitter * 0.04,
          align: 'onset', fadeOut: 0.06, note: `${c.who} ${c.side} ${c.type} frame ${c.frame}` });
    n++;
  }
  return C;
}

// =====================================================================
// MOTIVATION (motivation.html). Four days at one bus stop, each with its own weather bed; the beds cross-fade at the
// same cuts as the picture (cues.story.secs). Footsteps follow the day: dry street, puddle splashes in the rain,
// crunching snow. The neon buzz is cut on the sign's own flicker frames, so the hum stutters with the light.
// =====================================================================
const FILES_MOT = {
  'street_day.mp3':       { search: '"quiet street ambience birds"', use: 'DAY 1 bed, -30 dB (0-4.5 s)' },
  'car_pass_far.mp3':     { search: '"distant car passing"', use: 'a car far away at 1.2 s while they look down the road, -28 dB' },
  'neon_buzz.mp3':        { search: '"neon sign buzz"', use: 'the sign hums under everything, -34 dB, stutters with the flicker (needs a steady loop)' },
  'bench_creak.mp3':      { search: '"wooden bench creak"', use: 'B sits down (3.5 s)' },
  'rain.mp3':             { search: '"rain on bus shelter roof"', use: 'DAY 30 bed, cross-fades in and out (4.5-6.6 s)' },
  'winter_wind.mp3':      { search: '"cold winter wind snow"', use: 'DAY 180 bed, cross-fades (6.6-8.8 s)' },
  'night_crickets.mp3':   { search: '"night ambience crickets"', use: 'DAY 365 bed, -32 dB (8.8-19 s)' },
  'footsteps_street.mp3': { search: '"footsteps on concrete street" (single steps with gaps)', use: 'dry steps on DAY 1 and DAY 365, cut out one by one' },
  'footsteps_puddle.mp3': { search: '"footsteps puddle"', use: 'A jogging through the rain (DAY 30), cut out one by one' },
  'footsteps_snow.mp3':   { search: '"footsteps snow"', use: 'A running through the snow (DAY 180), cut out one by one' },
  'jog_breathing.mp3':    { search: '"heavy breathing after running"', use: 'A out of breath, 10.6-13.0 s' },
  'neon_flicker_off.mp3': { search: '"neon light flicker turn off"', use: 'the sign flickers and dies at 14.4 s' },
};

function timelineMot(S, cues) {
  const C = [], add = c => C.push(c), END = S.end, X = 0.2;                 // half of the picture's dissolve
  const sec = n => S.secs.find(s => s.name === n);
  const day = sec('day'), rain = sec('rain'), snow = sec('snow'), night = sec('night');
  // weather beds, cross-faded on the cuts
  add({ file: 'street_day.mp3', at: 0, dur: day.t1 + X, vol: -30, fadeIn: 0.5, fadeOut: 2 * X, loop: true });
  add({ file: 'car_pass_far.mp3', at: S.look0, dur: Math.min(3.2, day.t1 - S.look0), vol: -28, fadeIn: 0.25, fadeOut: 0.8 });
  add({ file: 'rain.mp3', at: rain.t0 - X, dur: rain.t1 - rain.t0 + 2 * X, vol: -25, fadeIn: 2 * X, fadeOut: 2 * X, loop: true });
  add({ file: 'winter_wind.mp3', at: snow.t0 - X, dur: snow.t1 - snow.t0 + 2 * X, vol: -24, fadeIn: 2 * X, fadeOut: 2 * X, loop: true });
  add({ file: 'night_crickets.mp3', at: night.t0 - X, dur: END - night.t0 + X, vol: -32, fadeIn: 2 * X, fadeOut: END - S.fadeOut, loop: true });
  // the neon hum: steady until the flicker, then only while a flicker frame is lit
  add({ file: 'neon_buzz.mp3', at: 0, dur: S.flick0, vol: -34, fadeIn: 0.5, fadeOut: 0.006, loop: true });
  for (const [a, b, v] of S.flick) if (v > 0) add({ file: 'neon_buzz.mp3', at: a, offset: a, dur: b - a, vol: -34 + 20 * Math.log10(v), fadeIn: 0.004, fadeOut: 0.006, loop: true, note: 'flicker on' });
  add({ file: 'neon_flicker_off.mp3', at: S.flick0, vol: -19, align: 'onset', fadeOut: 0.3 });
  // B sits down; A out of breath after the jog
  add({ file: 'bench_creak.mp3', at: S.sitHit - 0.05, vol: -15, align: 'onset', fadeOut: 0.3 });
  add({ file: 'jog_breathing.mp3', at: 10.6, dur: 2.4, vol: -20, fadeIn: 0.35, fadeOut: 0.7 });
  // footsteps on the heel-contact frames: dry, splashing or crunching by day; quieter and duller behind the shelter
  const FILE = { day: 'footsteps_street.mp3', night: 'footsteps_street.mp3', rain: 'footsteps_puddle.mp3', snow: 'footsteps_snow.mp3' };
  const VOL = { walk: -16, heavy: -15, jog: -14, run: -12, shuffle: -24 };
  let n = 0;
  for (const c of cues.steps) {
    let vol = c.type === 'shuffle' ? VOL.shuffle : (VOL[c.mood] ?? -16), filter = null;
    if (c.type === 'settle') vol -= 4;
    if (c.where === 'back') { vol -= 7; filter = 'lowpass=f=2600'; }
    if (!c.onScreen) { vol -= 6; filter = 'lowpass=f=2000'; }
    if (c.t > S.fadeOut) vol -= 30 * (c.t - S.fadeOut) / (END - S.fadeOut);     // fades with the picture
    const jitter = ((n * 7919) % 13) / 13 - 0.5;
    add({ file: FILE[c.sec], slice: n++, at: c.t, vol: vol + jitter * 2, rate: (c.mood === 'heavy' ? 0.94 : 1) * (1 + jitter * 0.04), align: 'onset', fadeOut: 0.06, filter, note: `${c.fig} ${c.side} ${c.type} ${c.mood} frame ${c.frame}` });
  }
  return C;
}


module.exports = { FILES, timeline, TARGET_LUFS: -14, CEILING_DBTP: -1.5,
  films: {
    'it-ends-with-you': { FILES: FILES_IEWY, timeline: timelineIewy },
    'i-wish-i-was-your-phone': { FILES: FILES_PHONE, timeline: timelinePhone },
    'tired-for-you': { FILES: FILES_TIRED, timeline: timelineTired },
    'red-thread': { FILES: FILES_RED, timeline: timelineRed },
    'motivation': { FILES: FILES_MOT, timeline: timelineMot },
  } };
