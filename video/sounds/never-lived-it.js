// Sound timeline for 'We Never Lived It'. Part 1 (sofa): room tone, thumb taps, the creak of sitting up,
// the shutter, notification pings that come faster and faster. Part 2 (split screen): a quiet clock and silence.
const FILES = {
  'room_tone.mp3':          { search: '"quiet room tone"', use: 'bed: -30 dB on the sofa, -40 dB in the split' },
  'phone_scroll.mp3':       { search: '"phone screen tapping"', use: 'single taps cut out and put on both thumbs (-31 dB)' },
  'couch_creak.mp3':        { search: '"sofa creak"', use: 'both sit up for the selfie, and slump back' },
  'cloth_rustle.mp3':       { search: '"clothes rustle movement"', use: 'his arm round her shoulder, and away again' },
  'camera_shutter.mp3':     { search: '"phone camera shutter"', use: 'the selfie (stand-in generated in sfx_films/never_lived_it.py)' },
  'phone_notification.mp3': { search: '"phone notification ding"', use: 'one ping per like burst, faster and faster' },
  'clock_tick.mp3':         { search: '"wall clock ticking"', use: 'single ticks once a second in the split screen (-31 dB)' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'room_tone.mp3', at: 0, dur: S.cut, vol: -30, fadeIn: 0.5, fadeOut: 0.45, loop: true });
  add({ file: 'room_tone.mp3', at: S.cut, dur: END - S.cut, vol: -40, fadeIn: 0.4, fadeOut: 1.5, loop: true, offset: 3 });
  S.taps.forEach((t, i) => add({ file: 'phone_scroll.mp3', slice: i, at: t, vol: -31, align: 'onset', fadeOut: 0.04, note: 'thumb tap' }));
  add({ file: 'couch_creak.mp3', at: S.sit0, vol: -21, fadeIn: 0.01, fadeOut: 0.25, dur: 0.6 });
  add({ file: 'cloth_rustle.mp3', at: S.sit0 + 0.02, vol: -27, fadeOut: 0.2, dur: 0.45 });
  add({ file: 'camera_shutter.mp3', at: S.flash - 0.02, vol: -15, align: 'onset' });
  add({ file: 'couch_creak.mp3', at: S.down0 + 0.05, vol: -24, fadeIn: 0.02, fadeOut: 0.3, offset: 0.1, dur: 0.6 });
  add({ file: 'cloth_rustle.mp3', at: S.down0, vol: -29, fadeOut: 0.2, dur: 0.4 });
  S.pings.forEach((t, i, a) => {
    const k = i / Math.max(1, a.length - 1), next = a[i + 1] ?? S.cut0;
    add({ file: 'phone_notification.mp3', at: t, vol: -24 + 6 * k, rate: 1 + 0.12 * k, align: 'onset',
          dur: Math.min(0.9, S.cut - t), fadeOut: Math.min(0.25, Math.max(0.05, next - t)), note: 'like ping' });
  });
  for (let i = 0, t = S.cut1 + 0.2; t < END - 0.6; i++, t += 1) add({ file: 'clock_tick.mp3', slice: i % 8, at: t, vol: -31, align: 'onset', fadeOut: 0.05 });
  return C;
}

module.exports = { FILES, timeline };
