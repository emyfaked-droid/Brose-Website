// Sound timeline for two-types-alarm (split screen: top gets up, bottom snoozes and panics).
// Everything comes from sfx/ (a real .mp3 with the same name replaces a generated .wav).
const FILES = {
  'room_tone.mp3':      { search: '"quiet bedroom room tone"', use: 'bed under the whole film, -33 dB' },
  'phone_alarm.mp3':    { search: '"phone alarm ringtone"', use: 'both alarms at 0.3 s, then the bottom one after every snooze' },
  'mask_down.mp3':      { search: '"hand slap on phone" / "tap object on wooden table"', use: 'the blind snooze slap' },
  'bed_creak.mp3':      { search: '"bed creak"', use: 'sitting up' },
  'cloth_rustle.mp3':   { search: '"clothes rustle"', use: 'sitting up, stretching, the panic jump' },
  'blanket_rustle.mp3': { search: '"blanket rustle" / "bedding foley"', use: 'smoothing the blanket, kicking it off' },
  'footsteps_wood.mp3': { search: '"footsteps wooden floor" (single steps with gaps)', use: 'heel contacts, calm on top, hectic below' },
  'door_open.mp3':      { search: '"door open"', use: 'both doors open' },
  'door_close.mp3':     { search: '"door close soft"', use: 'top door closes quietly' },
  'door_slam.mp3':      { search: '"door slam"', use: 'bottom door slams at the end' },
  'whoosh_soft.mp3':    { search: '"soft whoosh"', use: 'the panic jump' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end, NEXT = S.next;
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -33, loop: true });       // no fade-in: frame 0 is the hook
  // the alarms: both at 0.3 (slightly offset so they do not phase), the top one stops at the tap
  add({ file: 'phone_alarm.mp3', at: S.alarm, dur: S.aTap - S.alarm + 0.05, vol: -18, fadeOut: 0.05 });
  S.rings.forEach((r, i) => add({ file: 'phone_alarm.mp3', at: r + (i === 0 ? 0.012 : 0), offset: i === 0 ? 0.0 : 0.1 * i,
    dur: S.hits[i] - r + 0.03, vol: -18 + Math.min(i, 4) * 0.6, rate: 1 + 0.015 * i, fadeOut: 0.04 }));
  S.hits.forEach((h, i) => add({ file: 'mask_down.mp3', at: h, vol: -17 + Math.min(i, 5) * 0.4, rate: 0.95 + 0.02 * i, align: 'onset' }));
  // top: sits up, stretches, smooths the blanket
  add({ file: 'bed_creak.mp3', at: S.aSit0, dur: 0.9, vol: -27, fadeOut: 0.3 });
  add({ file: 'cloth_rustle.mp3', at: S.aSit0, dur: 0.8, vol: -25, fadeIn: 0.05, fadeOut: 0.3 });
  add({ file: 'cloth_rustle.mp3', at: S.aSit1, offset: 1.2, dur: 0.6, vol: -29, fadeIn: 0.05, fadeOut: 0.25 });
  add({ file: 'blanket_rustle.mp3', at: S.aSm0, dur: S.aSm1 - S.aSm0 + 0.2, vol: -24, fadeIn: 0.08, fadeOut: 0.3 });
  add({ file: 'door_open.mp3', at: S.aDoorOpen, vol: -24, dur: 1.2, fadeOut: 0.3 });
  add({ file: 'door_close.mp3', at: S.aDoorClose - 0.12, vol: -24, align: 'onset' });
  // bottom: the panic
  add({ file: 'bed_creak.mp3', at: S.bSit0, dur: 0.7, vol: -22, rate: 1.15, fadeOut: 0.2 });
  add({ file: 'whoosh_soft.mp3', at: S.bSit0, vol: -24, rate: 1.2 });
  add({ file: 'blanket_rustle.mp3', at: S.bSit0, offset: 0.3, dur: 0.7, vol: -20, fadeOut: 0.25 });
  add({ file: 'cloth_rustle.mp3', at: S.bSit1, offset: 2.0, dur: 0.6, vol: -24, fadeOut: 0.2 });
  add({ file: 'door_open.mp3', at: S.bOpen, vol: -19, rate: 1.25, dur: 0.9, fadeOut: 0.25 });
  add({ file: 'mask_down.mp3', at: S.bGrab, vol: -24, rate: 1.3, align: 'onset' });
  add({ file: 'door_slam.mp3', at: S.bSlam, vol: -14, align: 'onset' });
  // footsteps: top calm, bottom hectic (quieter once they are out in the hallway)
  let n = 0;
  for (const c of cues.steps) {
    if (c.t >= NEXT) continue;
    const j = ((n * 7919) % 13) / 13 - 0.5, fast = c.fig === 'B';
    let vol = c.type === 'shuffle' ? -27 : fast ? -17 : -21;
    if (c.type === 'settle') vol -= 4;
    if (fast && ((c.t > S.r[1] - 0.35 && c.t < S.r[1] + 0.2) || c.t > S.r[3] - 0.3)) vol -= 5;   // out in the hallway
    add({ file: 'footsteps_wood.mp3', slice: n++, at: c.t, vol: vol + j * 2, rate: (fast ? 1.06 : 1) + j * 0.04,
          align: 'onset', fadeOut: 0.06, note: `${c.fig} ${c.side} ${c.type} frame ${c.frame}` });
  }
  return C;
}

module.exports = { FILES, timeline };
