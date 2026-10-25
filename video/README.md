# Stick-figure shorts (Ask Twice, It Ends With You, I Wish I Was Your Phone, Motivation)

Three films share one engine (`engine.js`): `index.html` = **Ask Twice**, `it-ends-with-you.html` = **It Ends With You**,
`i-wish-i-was-your-phone.html` = **I Wish I Was Your Phone**, `motivation.html` = **Motivation**.
Use `FILM=<page name>` (or the `npm run iewy:*` / `npm run phone:*` / `npm run mot:*` scripts) to point the render, check and mix scripts at another film.


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

## I Wish I Was Your Phone (`i-wish-i-was-your-phone.html`)

18 s. A father on a sofa (side view) in a dark living room, lit from below by his phone. His child (scale 0.6) tugs his
sleeve twice (he lifts a finger: "wait"), holds up a toy ball (he turns his shoulders away), gives up and walks out heavily;
the ball drops and rolls to the sofa. The child comes back with a cardboard phone, holds it up so its head shows through the
cut-out screen. The phone buzzes, the father slowly looks up, everything freezes for 0.8 s, he puts the phone face down on the
sofa, the lamp turns from cold white to warm yellow, the child drops the cardboard and he lifts it onto his lap.
**I WISH I WAS / YOUR PHONE.**

- Light: a quarter-resolution light map (ambient + lamp + phone, multiplied over the finished frame), so the head and
  hands are bright only where the phone light reaches; additive glows on top.
- New in the engine (no change to the other two films, checked pixel for pixel): tracks `ox`/`od` (move the pelvis in world
  axes, used to lift the child), `extra.props` in `drawFigure` (things held in the hands are depth-sorted with the limbs),
  and a `y` for captions (two-line caption).
- The child's two visits are two figures (`KID1`, `KID2`) so its exit and re-entry off screen stay independent.
- Sound: `FILES_PHONE` / `timelinePhone` in `sound-timeline.js`. Thumb taps, ball bounces, the cardboard slap and barefoot
  steps come from the animation's own times; at 10.4 s everything drops to the room tone at -40 dB for 1.5 s.
- `npm run phone:check | phone:stills | phone:render | phone:mix | phone:build`; output `out/i-wish-i-was-your-phone.mp4`.

## Motivation (`motivation.html`)

19 s. A bus stop at the edge of town (side view): shelter, bench, a pole with a neon sign box reading **MOTIVATION** (the only
colour, warm yellow) and a timetable **NEXT BUS: SOON**. Four days, cross-dissolved (0.4 s), each with its own weather and light:
**DAY 1** (soft grey day) A and B wait, look down the road, A shrugs and walks off, B sits down; **DAY 30** (rain, puddles that
mirror the sign) A jogs past behind the shelter while B sits hunched; **DAY 180** (snow that piles up on the bench and on B's head
and back, breath clouds) A runs past, B looks at his watch once; **DAY 365** (night, one street lamp) B gets up stiffly and taps
the timetable, A jogs in and stops next to him, out of breath. **IT NEVER CAME.** The sign flickers three times and dies, A nods
"come on", B hesitates, takes one heavy step and walks with him. **START WITHOUT IT.**

- New in the engine (the other three films render pixel-identical, 75 frames checked): `tr.hyaw` (head yaw, for looking
  around), `tr.pant` (fast breathing after a run), `fig.walkMix(t, to, m1, n1, m2)` (first n1 steps in one gait, then another,
  speed and posture blend), and a reworked run cycle for `jog` / `run`: the heel kicks up behind after the toe-off, the knee
  drives forward, the shin reaches out onto the heel; the first two and the last two steps of a run are shorter (getting going,
  braking), and the step phase follows the real footfalls. Foot locking still holds (`npm run mot:check`).
- Sound: `FILES_MOT` / `timelineMot` in `sound-timeline.js`. The weather beds cross-fade on the cuts, footsteps follow the day
  (dry, puddle, snow), the neon buzz is cut on the sign's flicker frames. 12 new generated sounds in `scripts/make_sfx.py`.
- `npm run mot:check | mot:stills | mot:render | mot:mix | mot:build`; output `out/motivation.mp4` (-14.1 LUFS, -1.7 dBTP).
