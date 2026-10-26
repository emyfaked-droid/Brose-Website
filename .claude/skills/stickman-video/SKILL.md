---
name: stickman-video
description: Make a new 9:16 stick-figure life-lesson short (picture + sound + MP4) in video/, in the house style of Ask Twice / Motivation. Use whenever the user asks for a new stick-figure video, story or "Video" from a story/prompt.
---

# Stick-figure short: new film

All work happens in `video/`. Six finished films share one engine (`engine.js`). A new film is three small files,
started from templates. **Never rewrite the engine or the look; only add a story.**

## Save tokens (important)

- Do **not** read `engine.js`, `scripts/make_sfx.py`, `sound-timeline.js` or the other films in full. The API you need is in
  `reference.md` (next to this file). If something is missing there, `grep -n` for it and read only those lines.
- Start from the template, not from another film. Only open another film for one specific trick (grep first:
  e.g. `grep -n "cloth\|rope" *.html`).
- Look at **max 4 stills per round**, combined into ONE contact sheet image (see Workflow). Never look at single frames one by one.
- Don't paste long command output; pipe through `tail`.
- **One stills round, then render.** Fix only real problems (foot sliding, figures overlapping, wrong timing). No polishing
  rounds, no test clips unless the user asks. Render and mix exactly once at the end.
- Reuse what exists: sounds in `sfx/` (check `ls sfx/` first), props and tricks from the template. Generate a new
  stand-in sound only if nothing in `sfx/` fits.
- Keep the scene small: few props, no extra decoration, no particle systems unless the story needs them.

## Workflow

```sh
cd video
npm run new -- <name>                     # creates <name>.html, sounds/<name>.js, sfx_films/<name>.py
# 1. write the story in <name>.html (T times, set, figures, draw)
FILM=<name> npm run check                 # foot lock + pops: must say "foot lock OK"
FILM=<name> npm run stills                # renders T.stills -> build/stills-<name>/
ffmpeg -v error -y $(for f in build/stills-<name>/*.png; do echo -i $f; done) \
  -filter_complex "hstack=$(ls build/stills-<name>/*.png | wc -l),scale=1440:-1" build/sheet-<name>.png   # look at this one image
# 2. sound: list files + cues in sounds/<name>.js
python3 scripts/make_film_sfx.py <name>   # only for sounds sfx/ does not have yet (stand-ins)
FILM=<name> npm run render                # picture -> build/<name>.mp4
FILM=<name> npm run mix                   # sound -> out/<name>.mp4 (-14 LUFS, -1.5 dBTP)
```

Then commit `<name>.html`, `sounds/<name>.js`, `sfx_films/<name>.py`, new `sfx/*` and `out/<name>.mp4`, and add the
posting text (below) to the commit message or the reply.

## Style (fixed)

- **Minimal stick figures, always:** thin white lines with a black outline, a plain round head. Nothing else on the
  body: no face, no hair, no clothes, no hands/fingers, no shoes, no muscles or extra shapes, no thicker bodies.
  Far limbs grey. Shoulders and hips flow into the torso without a seam (the engine does this; never draw
  arms or legs with their own outline cap at the body). Children: `s: 0.6`. Props (phone, bag, cane) stay simple line shapes.
- Dark, almost black set, soft directional light (pendant lamp / street lamp), vignette, glossy floor with reflection,
  film grain. Grayscale plus ONE accent colour (default warm yellow `[255,206,108]`), ideally as the payoff.
- Labels on objects are fine and help (e.g. a sign "MOTIVATION", a bag "JOB 1"): monospace caps.
- Caption: `captionAt(t, 'TEXT.', t0, t1, 42, 11)`: bold monospace caps, top centre, fades. Max ~2 short lines per film.
- Length 12–20 s, 720×1280, 30 fps. Fade in at the start, fade to black at the end.

## Animation rules (realism)

- Every walk goes through `fig.walk(...)` (or `walkMix`), never by moving x by hand: the planner locks the feet and
  times the steps. Speed = step length × cadence. Pick a `MOOD` (`walk`, `heavy`, `forced`, `bouncy`, `back`, `jog`,
  `run`) or a variant `{ ...MOOD.heavy, L: 60 }`.
- Turns with `fig.turn(...)` (shuffle steps), never a pivot.
- Emotion through posture tracks (`slump`, `head`, `lean`, `shDrop`, `breath`, `pant`), always eased over ≥0.3 s.
- Nobody stands perfectly still (breathing/idle are on by default; don't switch them off).
- Hands on objects: `fig.goal(side, (t, J) => target)` and fade its weight in/out with `.to(...)`.
- `npm run check` must pass before rendering.

## Sound rules

- Prefer real recordings (CC0 / royalty-free, Pixabay or Freesound). If you can download, save them as
  `sfx/<name>.mp3` (an `.mp3` wins over a generated `.wav` with the same name). If not, generate a stand-in in
  `sfx_films/<name>.py` and put the search term in `FILES[...].search` so the user can swap it later.
- Reuse existing files first: `ls sfx/`.
- Footsteps come from `cues.steps` (exact heel-contact times) with `slice` + `align: 'onset'`, as in the template.
- Leave room for music: the mixer normalises to -14 LUFS; keep beds around -30 dB and hits around -15 to -20 dB.

## Posting text (always deliver with the film)

- Caption: 1–2 short English sentences + a call to action ("Tag someone who…", "Send this to…", "Save this…").
- **Exactly 5 hashtags:** 2 about the topic + `#fyp #viral #blowthisup`. Example: `#dad #family #fyp #viral #blowthisup`
- Music tip: mood + where it comes in.
