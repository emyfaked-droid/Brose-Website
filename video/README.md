# Stick-figure shorts (Ask Twice, It Ends With You)

Two films share one engine (`engine.js`): `index.html` = **Ask Twice**, `it-ends-with-you.html` = **It Ends With You**.
Use `FILM=it-ends-with-you` (or the `npm run iewy:*` scripts) to point the render, check and mix scripts at the second film.


A 19-second vertical (720×1280, 30 fps) stick-figure short drawn entirely in code,
with a sound-effect mix built from real recordings.

- `index.html`: the whole film. One `<canvas>` and a deterministic `render(t)`.
  Open it in a browser and it loops a live preview (`index.html?t=6` starts at 6 s).
  `index.html?test=walk&mood=heavy|forced|bouncy` shows the walk-cycle test.
- `sound-timeline.js`: every sound cue (time, file, volume, fades, filters).
- `scripts/render.js`: headless Chromium (Playwright) renders frame by frame and pipes PNGs into
  ffmpeg (libx264, yuv420p, crf 17). Also writes `build/cues.json` (story times + heel-contact frames).
- `scripts/mix.js`: cuts, places and mixes the sounds with ffmpeg (`atrim`, `volume`, `afade`, `adelay`, `amix`),
  normalises to −14 LUFS with a −1.5 dBTP ceiling, and muxes AAC 192k onto the video → `out/ask-twice.mp4`.
- `scripts/make_sfx.py`: procedural stand-in foley for `sfx/` (real recordings can replace it, see `sfx/README.md`).
- `scripts/stills.js`, `scripts/check.js`, `scripts/popcheck.js`: key-frame stills, foot-lock check, pop check.

## Run

```sh
npm install && npx playwright install chromium   # once
npm run check      # foot locking + pop check
npm run stills     # key frames -> build/stills
npm run walktest   # walk/run-cycle clips (side view, plus tracking-camera versions) -> build/walktest-*.mp4
npm run sfx        # (re)generate the stand-in sound effects
npm run render     # picture -> build/video.mp4
npm run mix        # sound -> out/ask-twice.mp4 (needs the files listed in sfx/README.md)
```

## Story

| Time | Beat |
|---|---|
| 0.0 – 6.2 | **Party.** Warm pendant light. Five figures sway to the music; two clink cups (0.97 s). One turns (shuffle steps), takes two light steps toward the main figure: **HOW ARE YOU?** The main figure, holding the smiling mask in front of its face, nods: **FINE.** Everyone laughs, shoulders shaking. |
| 6.2 | Hard cut, door slams, party audio gone. |
| 6.2 – 13.6 | **Home.** Cold moonlight. The figure deflates, walks heavily to the bed, sits, slowly takes the mask off and lays it face up on the little table, then slumps with its head in its hands. Clock ticks. |
| 13.6 – 19.2 | **Morning.** Light turns white, alarm. It stands up slowly, looks at the mask, puts it on, snaps into a fake upright posture, turns, and leaves through the door with a forced light step. **ASK TWICE.** Fade to black. |

All beat times live in the `T` object in `index.html`. The home and morning beats are derived from the planned walks, so changing a walk retimes everything after it, including the sound.

## Animation

- **Skeleton:** pelvis, two-segment spine (lean + slump), neck, head, shoulders, elbows, hands, hips,
  knees, ankles and feet, all in 3D (x, depth, height) and projected through a perspective camera.
  Limbs on the far side are drawn first and in grey.
- **IK:** two-bone IK with pole vectors for every arm and leg. Hands follow goals (cup, mask grip, face,
  knees, table) blended with FK poses.
- **Walk planner (`Fig.walk`):** the walk speed is step length × cadence. The speed profile has eased
  (cosine) acceleration and braking. Footfalls are planned from the distance travelled. A planted
  foot stays at a fixed world position: it rolls on the heel after contact and peels off onto the
  toe before lift. The pelvis bobs through contact → down → passing → up, is capped by what the
  planted legs can reach, and shifts toward the stance foot. Hips and shoulders counter-rotate. Arms
  swing opposite the legs with elbow lag. The head is stabilised. Each walk starts and ends with
  half-steps, and the torso overshoots (a damped spring) when the figure stops.
- **Turns** are shuffle steps: no foot ever pivots on the floor.
- **Gaits** (`MOOD` in `index.html`): `bouncy` (party), `heavy` (home: short low steps, slumped, little arm swing),
  `forced` (morning: long, upright, big arm swing), plus a neutral `walk` (relaxed arms, low feet, small bob: the reference for a normal walk), and, as extras not used in the film, an easy `jog` and a `run`. The run has flight phases (a
  half-stance below 0.5 step lengths), the pelvis is lowest in mid-stance and highest in mid-flight, the elbows stay near
  90° and pump, the torso leans forward with speed and rocks back when braking, the heel kicks up behind, the knee drives
  forward. Walks and runs share one planner, so foot locking holds for all of them.
  The test clips (`?test=walk&mood=run&track=1`) show a gait in side view with a tracking camera, like the reference.
- **Look:** thin stick figures (13 px limbs and torso, 54 px head), as in the brief.
- **Idle:** breathing plus slow noise in the weight, lean and head. Nobody is ever perfectly still.
- **Verification:** `npm run check` measures, for every figure and every 1/120 s, the distance between
  where a planted foot should be and where the leg puts it, and how far a planted heel or toe
  moves. Both are 0.000 px. `popcheck` lists the largest joint accelerations to catch pops.

## Sound

Heel-contact times come from the walk planner (`build/cues.json`). The mixer cuts single steps and
clock ticks out of the recordings with onset detection. It places every one-shot so that its
transient lands on its frame (measured: within 3 ms). The clock's second hand and the tick sound
share the same times. The party is low-passed to sound like it comes from the next room, and it
stops dead at the cut. The finished mix is normalised to −14 LUFS integrated with a −1.5 dBTP
ceiling, which leaves room for music on top.

## It Ends With You (`it-ends-with-you.html`)

Scene 1 (1998, 0 to 6.3 s) is repeated as scene 2 (2026) exactly 6.0 s later with the roles reversed; the adult repeats
the father's motion with the same seed, then freezes (`Fig.warp`, only breathing continues) and kneels into a hug while the
light turns from cold white to warm yellow. New engine features used here: `Fig` option `s` (children at 0.6, strides scale,
feet stay locked), `fig.footGoal()` (pin a foot to a target: kneeling), backward steps (`walk(..., {back: true})`),
`fig.warp` (freeze/retime), and `fig.pose(t, true)` (skip arm goals so two figures can read each other's pose).
Sounds: `FILES_IEWY` and `timelineIewy` in `sound-timeline.js`; output `out/it-ends-with-you.mp4`.
