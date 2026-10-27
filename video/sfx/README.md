# Sound effects for "Ask Twice"

**Current state:** the 15 `.wav` files in this folder are *synthesized stand-ins* made by
`scripts/make_sfx.py` (modelled wood/metal/plastic resonances, noise transients, formant voices, FM bird
chirps, a small drum loop, convolution reverb). They are not recordings. To use real recordings, drop
files with the same base name here (`.mp3` wins over `.wav` automatically), or overwrite the `.wav`,
then run `npm run mix`. `npm run sfx` regenerates the stand-ins.

Put these 15 files in this folder with exactly these names. Use **real recordings**
under CC0 or the Pixabay Content License (free for commercial use, no attribution
needed). Freesound works too if you filter by license *Creative Commons 0*.

`.mp3` is assumed, but `.wav`, `.ogg`, `.flac` or `.m4a` with the same base name work as well.

| File | What to search for | Used for | Length needed |
|---|---|---|---|
| `party_music.mp3` | Pixabay Music: "party house", "upbeat dance pop" | party music, muffled as if from the next room | ≥ 7 s (loops otherwise) |
| `crowd_murmur.mp3` | "crowd talking indoor", "party chatter ambience", "restaurant walla" | murmur in the party room | ≥ 7 s (loops otherwise) |
| `cup_clink.mp3` | "glasses clink cheers", "cups toast" | one clink at 0.97 s | one hit |
| `laughter.mp3` | "group of people laughing", "small crowd laugh" | the others laugh after "FINE." | ≥ 2 s |
| `door_close.mp3` | "door close wooden", "door shut" | the hard cut to home: one firm close | one hit |
| `lock_click.mp3` | "door lock click", "deadbolt lock" | lock click after the door | one hit |
| `footsteps_wood.mp3` | "footsteps wooden floor", "walking on wood floor slow" | every footstep (single steps are cut out automatically) | ≥ 6 separate steps with small gaps between them |
| `bed_creak.mp3` | "bed creak", "sitting down on bed", "mattress springs creak" | the figure sits on the bed | one creak |
| `mask_down.mp3` | "put plastic object on table", "place object on wooden table" | the mask is set down / picked up | one hit |
| `clock_tick.mp3` | "clock ticking loud", "wall clock tick" | single ticks are cut out and placed on the clock's second hand | ≥ 2 s of clear ticks |
| `traffic_distant.mp3` | "distant city traffic night ambience" | faint background at home | ≥ 13 s (loops otherwise) |
| `phone_alarm.mp3` | "phone alarm", "smartphone alarm ringtone" | the morning alarm | ≥ 1.5 s (loops otherwise) |
| `cloth_rustle.mp3` | "clothes rustle", "fabric movement foley" | sitting, standing, picking up the mask | ≥ 2 s |
| `door_open.mp3` | "door open", "door handle open" | leaving in the morning | one hit |
| `birds_morning.mp3` | "birds chirping morning", "birdsong outside" | outside; swells when the door opens | ≥ 5 s (loops otherwise) |

Tips

- For one-shot sounds the mixer finds the first transient and lines it up with the frame, so leading silence in the file doesn't matter.
- Footsteps: a recording of slow, separate steps on wood works best (shoes, not barefoot). Every step in the film is cut out of this file and placed on its exact heel-contact frame; heavier steps are pitched down and the forced morning steps up.
- Avoid music or voices baked into the effects (except `party_music` and `crowd_murmur`).

Then run `npm run mix` (or `npm run build` to re-render the picture as well).

## Extra files for "It Ends With You"

`room_tone`, `toy_blocks`, `glass_break`, `door_slam`, `heartbeat`, `whoosh_soft`, `knee_floor`, `cloth_hug` (plus the existing
`clock_tick`, `footsteps_wood`, `door_open`). Search terms are in `FILES_IEWY` in `sound-timeline.js`:
"quiet house room tone", "wooden toy blocks", "glass shatter floor", "interior door slam", "slow heartbeat",
"soft whoosh", "knee on wooden floor", "clothes rustle hug". Same rule as above: `.mp3` with the same base name wins over the `.wav`.

## Extra files for "I Wish I Was Your Phone"

`phone_scroll`, `phone_notification`, `phone_buzz`, `footsteps_barefoot`, `cloth_tug`, `toy_squeak`, `ball_bounce_roll`,
`cardboard_handle`, `phone_on_couch`, `cardboard_drop`, `couch_creak` (plus the existing `room_tone`). Search terms are in
`FILES_PHONE` in `sound-timeline.js`: "phone screen tapping", "phone notification ding", "phone vibrate in hand",
"barefoot steps wooden floor", "fabric sleeve tug", "rubber toy squeak", "small ball bounce roll floor",
"cardboard handling rustle", "phone dropped on couch", "cardboard drop floor", "sofa creak". Taps and barefoot steps are
cut out one by one, so a recording of separate taps / steps with small gaps works best.

## Extra files for "Tired For You"

`soft_snore`, `tape_rewind`, `tired_sigh`, `keys`, `bag_drop`, `night_outside`, `sofa_flop`, `blanket_rustle` (plus the existing
`room_tone`, `clock_tick`, `phone_alarm`, `door_open`, `door_close`, `footsteps_wood`, `footsteps_barefoot`). Search terms are in
`FILES_TIRED` in `sound-timeline.js`. A real `soft_snore` recording should breathe about every 3.6 s (that is the film's breathing).

## Extra files for "The Red Thread"

`city_night`, `streetlamp_hum`, `string_tug`, `rope_pull`, `footsteps_asphalt`, `run_breathing`, `knee_fall`, `sit_down_curb`,
`string_slide`, `soft_heartbeat`. Search terms are in `FILES_RED` in `sound-timeline.js`. `rope_pull` and `footsteps_asphalt`
are cut into single hits (`footsteps_asphalt`: hits 1-5 are hard running steps, 6-10 calm walking steps). `run_breathing` is
laid from the start of the run (3.5 s): running breaths, a gasp at 2.75 s (tripping), a winded groan at 3.1 s (the knees).

## Extra files for "Motivation"

`street_day`, `car_pass_far`, `neon_buzz`, `bench_creak`, `rain`, `winter_wind`, `night_crickets`, `footsteps_street`,
`footsteps_puddle`, `footsteps_snow`, `jog_breathing`, `neon_flicker_off`. Search terms are in `FILES_MOT` in `sound-timeline.js`:
"quiet street ambience birds", "distant car passing", "neon sign buzz", "wooden bench creak", "rain on bus shelter roof",
"cold winter wind snow", "night ambience crickets", "footsteps on concrete street", "footsteps puddle", "footsteps snow",
"heavy breathing after running", "neon light flicker turn off". The three footstep files are cut into single steps, so use
recordings of separate steps with small gaps.

## Real recordings from ElevenLabs (Oct 2026)

These `.mp3` files were generated with ElevenLabs Sound Effects and replace the synthetic `.wav` stand-ins of the same
name (the mixer prefers `.mp3`): `footsteps_wood`, `footsteps_street`, `footsteps_snow`, `door_close`, `keys`,
`glass_break`, `laughter`, `phone_alarm`, `phone_scroll`, `night_crickets`, `winter_wind`, `whoosh_soft`.
To add more: generate in the ElevenLabs flow "Stickman SFX Library" and save as `sfx/<name>.mp3`.
Footstep files must contain single steps with short pauses (the mixer cuts them apart by onset).
