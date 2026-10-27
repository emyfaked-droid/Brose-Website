// Sound timeline for same-seen (two beds, the same "Seen", two different nights).
// Stand-in: phone_typing (sfx_films/same_seen.py). Everything else comes from sfx/.
const FILES = {
  'room_tone.mp3':          { search: '"quiet bedroom room tone night"', use: 'bed under the whole film' },
  'phone_notification.mp3': { search: '"phone notification"', use: 'the message at 0.0 and the reply at 11.0 (both phones)' },
  'phone_scroll.mp3':       { search: '"phone scrolling"', use: 'left: scrolls up 200 messages' },
  'phone_typing.mp3':       { search: '"typing on phone screen"', use: 'left: type ... delete ... type' },
  'soft_snore.mp3':         { search: '"soft snore" / "calm sleep breathing"', use: 'right: asleep, very quiet' },
  'clock_tick.mp3':         { search: '"clock ticking"', use: 'the long night' },
  'blanket_rustle.mp3':     { search: '"blanket rustle" / "bedding foley"', use: 'lying down, tossing, sitting up' },
  'birds_morning.mp3':      { search: '"birds morning"', use: 'sunrise' },
  'tired_sigh.mp3':         { search: '"relieved sigh"', use: 'left: the relieved exhale' },
  'cloth_rustle.mp3':       { search: '"clothes rustle"', use: 'shrug, stretch, thumbs up' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end, LOOP = S.loop;
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -31, loop: true });                 // no fade-in: frame 0 is the hook
  // the message (both phones, a hair apart) and the reply
  add({ file: 'phone_notification.mp3', at: 0, vol: -17 });
  add({ file: 'phone_notification.mp3', at: 0.035, vol: -21, rate: 1.01 });
  add({ file: 'phone_notification.mp3', at: S.reply, vol: -16 });
  add({ file: 'phone_notification.mp3', at: S.reply + 0.035, vol: -20, rate: 1.01 });
  // CHILL: shrug, phone on the night stand, lies down, sleeps (soft snore), wakes and stretches
  add({ file: 'cloth_rustle.mp3', at: S.shrug0, dur: 0.5, vol: -29, fadeOut: 0.2 });
  add({ file: 'blanket_rustle.mp3', at: S.lie0, dur: 0.9, vol: -26, fadeOut: 0.3 });
  add({ file: 'soft_snore.mp3', at: S.lie1 + 0.4, dur: S.wake0 - S.lie1 - 0.5, vol: -31, loop: true, fadeIn: 0.8, fadeOut: 0.6 });
  add({ file: 'blanket_rustle.mp3', at: S.wake0, offset: 0.8, dur: 0.8, vol: -27, fadeOut: 0.3 });
  add({ file: 'cloth_rustle.mp3', at: S.wake1, offset: 1.0, dur: 0.7, vol: -27, fadeOut: 0.3 });
  add({ file: 'cloth_rustle.mp3', at: S.thumb0, offset: 2.0, dur: 0.4, vol: -28, fadeOut: 0.15 });
  // OVERTHINKER: scroll, toss, type ... delete ... type, sits up, phone on the face, relieved sigh
  add({ file: 'phone_scroll.mp3', at: S.thoughts[2] - 0.1, dur: 1.2, vol: -25, fadeOut: 0.3 });
  add({ file: 'blanket_rustle.mp3', at: S.toss0, dur: 1.4, vol: -23, fadeOut: 0.4 });
  add({ file: 'blanket_rustle.mp3', at: S.toss1, offset: 1.0, dur: 0.7, vol: -24, fadeOut: 0.3 });
  add({ file: 'phone_typing.mp3', at: S.thoughts[4] - 0.05, vol: -24 });
  add({ file: 'blanket_rustle.mp3', at: S.face0, offset: 0.4, dur: 0.8, vol: -26, fadeOut: 0.3 });
  add({ file: 'blanket_rustle.mp3', at: S.oSit0, offset: 1.2, dur: 0.7, vol: -27, fadeOut: 0.3 });
  add({ file: 'tired_sigh.mp3', at: S.relief0, vol: -22 });
  // the long night: a clock ticking, fading as the morning comes; birds at sunrise
  for (let t = 1.5, n = 0; t < 9.4; t += 1.0, n++) add({ file: 'clock_tick.mp3', slice: n, at: t, vol: -29 - Math.max(0, t - 7) * 2, align: 'onset' });
  add({ file: 'birds_morning.mp3', at: 8.6, dur: LOOP - 8.6, vol: -27, fadeIn: 1.5, fadeOut: 0.05 });
  return C;
}

module.exports = { FILES, timeline };
