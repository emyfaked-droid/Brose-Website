// Sound timeline for did-you-notice (family dinner, the father does not eat).
// Stand-ins come from sfx_films/did_you_notice.py; a real recording with the same name (.mp3) replaces them.
const FILES = {
  'room_tone.mp3':    { search: '"warm room tone" / "quiet kitchen ambience"', use: 'bed under the whole film, -31 dB' },
  'ladle_pot.mp3':    { search: '"ladle pot" / "spoon in pot stew"', use: 'the ladle dips into the pot' },
  'food_plop.mp3':    { search: '"food plop plate" / "serving stew"', use: 'a ladle of stew lands on a plate' },
  'pot_scrape.mp3':   { search: '"scraping pot spoon" / "scrape bottom of pan"', use: 'he scrapes the empty pot for himself' },
  'fork_plate.mp3':   { search: '"fork on plate" / "cutlery ceramic tink"', use: 'cutlery on plates while everyone eats' },
  'family_laugh.mp3': { search: '"family laughing at dinner" / "soft group laugh close"', use: 'the family laughs (soft, close)' },
  'plate_slide.mp3':  { search: '"plate slide on wooden table"', use: 'he slides his plate over, very quiet' },
  'couch_creak.mp3':  { search: '"wooden chair creak"', use: 'his chair when he half stands up / sits down' },
};

function timeline(S, cues) {
  const C = [], add = c => C.push(c), END = S.end;
  add({ file: 'room_tone.mp3', at: 0, dur: END, vol: -31, loop: true, fadeOut: 0.05 });   // no fade-in: frame 0 is the hook
  // the father half stands up and sits down again (chair)
  add({ file: 'couch_creak.mp3', at: S.rise0 + 0.05, vol: -33, dur: 0.6, fadeOut: 0.2, rate: 1.15 });
  add({ file: 'couch_creak.mp3', at: S.sit1 - 0.25, vol: -32, dur: 0.6, fadeOut: 0.2, rate: 1.1 });
  // serving: dip, plop on each plate; the last one for himself is almost nothing
  [0.62, 1.55, 2.4].forEach((t, i) => add({ file: 'ladle_pot.mp3', at: t, vol: -21 - i, rate: 1 + 0.03 * i, align: 'onset' }));
  [[S.servM, -22], [S.servK1, -23], [S.servK2, -23], [S.servD, -34]].forEach(([t, v]) => add({ file: 'food_plop.mp3', at: t - 0.04, vol: v, align: 'onset' }));
  S.scrapeHits.forEach((t, i) => add({ file: 'pot_scrape.mp3', at: t, vol: -20 - i * 1.5, rate: 1 - 0.04 * i, align: 'onset' }));
  add({ file: 'ladle_pot.mp3', at: 4.15, vol: -27, rate: 1.1, align: 'onset', dur: 0.4, fadeOut: 0.15 });
  // cutlery: a tink every time a fork leaves a plate (and a softer one when it comes back)
  S.bites.forEach((t, i) => {
    const j = ((i * 7919) % 13) / 13 - 0.5;
    add({ file: 'fork_plate.mp3', at: t, vol: -27 + j * 3, rate: 1 + j * 0.12, align: 'onset' });
    if (i % 2 === 0) add({ file: 'fork_plate.mp3', at: t + 0.78, vol: -32 + j * 2, rate: 1.08 - j * 0.1, align: 'onset' });
  });
  // the family laughs; the plate slide sits underneath, barely audible
  add({ file: 'family_laugh.mp3', at: S.laugh0 - 0.05, vol: -20, fadeOut: 0.6 });
  add({ file: 'plate_slide.mp3', at: S.push0 + 0.05, vol: -31, dur: S.push1 - S.push0 + 0.2, fadeOut: 0.2 });
  add({ file: 'family_laugh.mp3', at: S.fake0 + 0.15, vol: -23, rate: 0.97, fadeOut: 0.8 });
  add({ file: 'family_laugh.mp3', at: 8.95, vol: -27, rate: 1.04, offset: 0.4, fadeOut: 0.8 });
  return C;
}

module.exports = { FILES, timeline };
