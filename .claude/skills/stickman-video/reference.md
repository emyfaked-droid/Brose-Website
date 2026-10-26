# Engine cheat sheet (video/engine.js)

Everything below is a global after `<script src="engine.js">`. Units: px. World axes: `x` left→right (0..720 at
`cam.x = 360`), `d` depth (bigger = further back; the back wall in the template is `WALL = 150`), `z` height.

## Figures

```js
const A = new Fig('A', { x: 90, d: 40, yaw: 0, seed: 1.3, s: 1 });
// yaw: 0 = faces right, 180 = left, -90 = toward the camera, 90 = away. s: scale (child 0.6). seed: idle noise.
const tEnd = A.walk(t0, [x, d], MOOD.walk, 'R', opts);  // plans the steps, returns the time the walk ends
A.walkMix(t0, [x, d], MOOD.heavy, 1, MOOD.walk);       // first n1 steps in one gait, then another
A.turn(t0, t1, yawTo, { steps, lift, first: 'L'|'R', mood }); // shuffle-step turn
A.pose(t)          // -> J (joints, see below); call once per frame in draw()
A.worldRoot(t)     // [x, d] on the floor under the pelvis
A.toSkel([x,d,z])  // world -> skeleton units (use for goal targets)
A.cues             // step/settle/shuffle cues (the sound uses them)
```

### Posture tracks: `A.tr.<name>.to(t0, t1, value, ease = E.io)` (chainable; `.v0 = x` sets the start value)

| track | meaning |
|---|---|
| `yaw` | facing (deg) |
| `pf`, `pl`, `pz` | pelvis offset forward / sideways / up (px); `pz: -90` = squat |
| `lean` | upper body forward lean (deg, default 3) |
| `slump` | slumped spine (deg, 0..20) |
| `head`, `headRoll`, `hyaw` | head down (deg), tilt, turn left/right |
| `shDrop` | shoulders down (px) |
| `roll`, `roll2`, `rollSh`, `twist` | sideways roll of the body / upper spine / shoulder line, twist (lying on the side: roll -150, roll2 60) |
| `breath`, `pant` | slow breathing amount (1), fast out-of-breath breathing (px) |
| `laugh`, `dance`, `bounce` | shoulder shake, sway, small bounce |
| `idle`, `settle` | idle noise, settle overshoot after walks (leave on) |
| `ox`, `od` | pelvis offset in world axes (e.g. a child being lifted) |
| `dropL`, `dropR` | pull one shoulder down (heavy bag) |
| `aSwL/R`, `aOutL/R`, `aElL/R` | resting arm swing / spread / elbow bend |

### Hand and foot goals (IK)

```js
const w = A.goal('L', (t, J) => A.toSkel([x, d, z]), pole); // hand L follows the target; returns a weight track
w.to(1.0, 1.3, 1).to(2.0, 2.4, 0);                           // blend in, then out
A.footGoal('R', t => ({ ank: [x, d, z], pitch, yaw, lift, kdir, kyaw }))  // foot target in skeleton units (kneeling,
                                                              // sitting); kdir/kyaw = knee direction; returns a weight track
```

Joints in `J`: `J.P` pelvis, `J.C` chest, `J.N` neck, `J.Hc` head centre, `J.F/J.R` forward/right of the pelvis,
`J.Ft/J.Rt` of the torso, `J.sh/el/hand/hip/knee/ank/heel/toe` objects keyed `L`/`R`, `J.feet`.
Depth for sorting: `J.P[1]`.

### Gaits `MOOD`

| mood | step L | steps/s | feel |
|---|---|---|---|
| `walk` | 118 | 1.95 | normal, relaxed |
| `forced` | 112 | 2.1 | upright, "pulling yourself together" |
| `heavy` | 70 | 1.45 | sad, slow, slumped |
| `bouncy` | 34 | 2.1 | a few small light steps |
| `back` | 34 | 2.2 | stepping backwards |
| `jog` / `run` | 120 / 165 | 2.6 / 2.85 | flight phase, heel kick, knee drive |

Variant: `{ ...MOOD.walk, name: 'calm', L: 100, cad: 1.7 }`. `ta`/`td` = accelerate/brake time (bigger = softer).
Children: the stride shrinks with `s` automatically.

## Easing and maths

`E.io`, `E.io2`, `E.out`, `E.out2`, `E.in2`, `E.sine`, `E.over` (overshoot), `E.back` (anticipation) · `clamp lerp inv sstep s5` ·
`Track` (`new Track(v).to(t0,t1,v,ease)`, `.at(t)`) · vectors `add sub mul madd dot len norm lerp3` · `PI TAU D2R`.

## Drawing

```js
cam.x = 360; cam.zoom = 1.12; cam.hy = 640; cam.h = 270;  // camera (animate these for pans / push-ins)
P([x, d, z])                    // world -> [screenX, screenY, scale]
drawFigure(ctx, fig, J)         // the figure in house style
contactShadow(ctx, J, 0.55, fig.s)
reflection(c => { /* draw floor objects with c */ }, floorY, 0.28)   // glossy floor
softLayer(blur, 'screen', c => { /* light cones, glows (quarter res) */ })
vignette(0.75); grain(t, 0.06)  // grain is already in render()
captionAt(t, 'TEXT.', t0, t1, size = 42, spacing = 11, y0, colour)
rgb([r,g,b], a), mixc(colA, colB, k)   // colours; INK = outline black
poly(c, pts3d), box(c, b, col), strokeLimb(...), dotJoint(...)       // simple props
```

Draw order in `draw(t)`: background + floor → light pools → `reflection` → `contactShadow` → floor items and figures
sorted by depth (far first) → lamps / glows (`'lighter'`) → `vignette` → captions / labels.

## Film contract (kept by the template)

The page must expose `window.render`, `window.STORY` (= `T`, with `T.end` and `T.stills`), `window.DURATION`,
`window.FPS`, `window.getCues` (returns `{ story, steps, ticks, fps, duration }`), `window.footCheck`, `window.popCheck`.
Anything the sound needs (e.g. the frame a door slams) goes into `T`, then `sounds/<name>.js` reads it as `S.<key>`.

## Walk test

`<film>.html?test=walk&mood=run&track=1` shows a gait cycle; `?t=6` starts the live preview at 6 s.
